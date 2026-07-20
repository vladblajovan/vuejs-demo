import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '..')
const outputPath = resolve(projectRoot, 'design-system/penpot-design-contract.json')
const mapPath = resolve(projectRoot, 'design-system/component-code-map.json')

const config = await readFile(`${process.env.HOME}/.codex/config.toml`, 'utf8')
const section = config.match(/\[mcp_servers\.penpot\]([\s\S]*?)(?=\n\[|$)/)
const endpoint = section?.[1].match(/url\s*=\s*"([^"]+)"/)?.[1]

if (!endpoint) {
  throw new Error('Penpot MCP URL was not found in ~/.codex/config.toml')
}

function parseEventStream(text) {
  const data = text
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6))

  return data.length ? JSON.parse(data.at(-1)) : null
}

async function request(body, sessionId) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Penpot MCP request failed with HTTP ${response.status}`)
  }

  return {
    sessionId: response.headers.get('mcp-session-id'),
    payload: parseEventStream(await response.text()),
  }
}

function parseExecution(response) {
  const text = response.payload?.result?.content?.find((item) => item.type === 'text')?.text
  if (!text) throw new Error(JSON.stringify(response.payload))
  try {
    const execution = JSON.parse(text)
    if (!execution?.result) throw new Error(text)
    return execution.result
  } catch {
    throw new Error(text)
  }
}

const initialized = await request({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'vue-penpot-design-contract', version: '1.0.0' },
  },
})

const sessionId = initialized.sessionId
if (!sessionId) throw new Error('Penpot MCP did not return a session id')

await request(
  {
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  },
  sessionId,
)

async function executeCode(id, code) {
  return parseExecution(
    await request(
      {
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: {
          name: 'execute_code',
          arguments: { code },
        },
      },
      sessionId,
    ),
  )
}

const structure = await executeCode(
  2,
  `return {
  page: { id: penpot.currentPage.id, name: penpot.currentPage.name },
  boards: [...penpot.root.children]
    .filter((shape) =>
      shape.name.startsWith('Explorations /') ||
      shape.name.startsWith('Approved /') ||
      shape.name.startsWith('Code snapshot /')
    )
    .map((shape) => ({
      id: shape.id,
      name: shape.name,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height
    }))
};`,
)

const tokenData = await executeCode(
  3,
  `return penpot.library.local.tokens.sets.map((set) => ({
  name: set.name,
  active: set.active,
  tokens: set.tokens.map((token) => ({
    name: token.name,
    type: token.type,
    value: token.value
  }))
}));`,
)

const styleData = await executeCode(
  4,
  `return {
  colors: penpot.library.local.colors.map((color) => ({
    id: color.id,
    name: color.name,
    path: color.path,
    value: color.color
  })),
  typographies: penpot.library.local.typographies.map((style) => ({
    id: style.id,
    name: style.name,
    path: style.path,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight
  }))
};`,
)

const componentData = await executeCode(
  5,
  `return penpot.library.local.components.map((component) => ({
  id: component.id,
  name: component.name,
  path: component.path,
  fullName: [component.path, component.name].filter(Boolean).join(' / ')
}));`,
)

const mapping = JSON.parse(await readFile(mapPath, 'utf8'))
const penpot = {
  page: structure.page,
  boards: structure.boards.sort((a, b) => a.name.localeCompare(b.name)),
  tokenSets: tokenData
    .map((set) => ({
      ...set,
      tokens: set.tokens.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name)),
  colors: styleData.colors.sort((a, b) =>
    `${a.path}/${a.name}`.localeCompare(`${b.path}/${b.name}`),
  ),
  typographies: styleData.typographies.sort((a, b) =>
    `${a.path}/${a.name}`.localeCompare(`${b.path}/${b.name}`),
  ),
  components: componentData.sort((a, b) => a.fullName.localeCompare(b.fullName)),
}
const mappedComponents = penpot.components.map((component) => ({
  ...component,
  implementation: mapping.components[component.fullName] ?? null,
}))

let gitCommit = null
try {
  gitCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: projectRoot,
    encoding: 'utf8',
  }).trim()
} catch {
  // The contract remains useful before the project has a Git commit.
}

const contract = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    tool: 'Penpot MCP',
    page: penpot.page,
    gitCommit,
  },
  ownership: {
    explorations: 'designer-editable',
    approved: 'design-source-of-truth',
    codeSnapshot: 'generated-from-vue',
  },
  boards: penpot.boards,
  tokenSets: penpot.tokenSets,
  colors: penpot.colors,
  typographies: penpot.typographies,
  components: mappedComponents,
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(contract, null, 2)}\n`)

const tokenCount = contract.tokenSets.reduce((sum, set) => sum + set.tokens.length, 0)
const mappedCount = contract.components.filter((component) => component.implementation).length
console.log(
  JSON.stringify(
    {
      outputPath,
      boards: contract.boards.length,
      tokens: tokenCount,
      components: contract.components.length,
      mappedComponents: mappedCount,
    },
    null,
    2,
  ),
)
