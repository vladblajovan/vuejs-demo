import { readFile } from 'node:fs/promises'

const config = await readFile(`${process.env.HOME}/.codex/config.toml`, 'utf8')
const section = config.match(/\[mcp_servers\.penpot\]([\s\S]*?)(?=\n\[|$)/)
const endpoint = section?.[1].match(/url\s*=\s*"([^"]+)"/)?.[1]

if (!endpoint) throw new Error('Penpot MCP URL was not found in ~/.codex/config.toml')

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
  if (!response.ok) throw new Error(`Penpot MCP request failed with HTTP ${response.status}`)
  return {
    sessionId: response.headers.get('mcp-session-id'),
    payload: parseEventStream(await response.text()),
  }
}

const initialized = await request({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'vue-penpot-workflow-inspector', version: '1.0.0' },
  },
})

const sessionId = initialized.sessionId
if (!sessionId) throw new Error('Penpot MCP did not return a session id')

await request({ jsonrpc: '2.0', method: 'notifications/initialized' }, sessionId)
const response = await request(
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'execute_code',
      arguments: {
        code: `return {
  page: { id: penpot.currentPage.id, name: penpot.currentPage.name },
  boards: [...penpot.root.children].map((shape) => ({
    id: shape.id,
    name: shape.name,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height
  })),
  library: {
    components: penpot.library.local.components.length,
    colors: penpot.library.local.colors.length,
    typographies: penpot.library.local.typographies.length,
    tokenSets: penpot.library.local.tokens.sets.map((set) => ({
      name: set.name,
      active: set.active,
      tokens: set.tokens.length
    }))
  }
};`,
      },
    },
  },
  sessionId,
)

const text = response.payload?.result?.content?.find((item) => item.type === 'text')?.text
if (!text) throw new Error(JSON.stringify(response.payload))
console.log(text)
