import { readFile, writeFile } from 'node:fs/promises'

const [shapeReference, outputPath] = process.argv.slice(2)
if (!shapeReference || !outputPath) {
  throw new Error(
    'Usage: node export-penpot-shape.mjs <shape-id|name:shape-name> <output.png>',
  )
}

const config = await readFile(`${process.env.HOME}/.codex/config.toml`, 'utf8')
const section = config.match(/\[mcp_servers\.penpot\]([\s\S]*?)(?=\n\[|$)/)
const endpoint = section?.[1].match(/url\s*=\s*"([^"]+)"/)?.[1]
if (!endpoint) throw new Error('Penpot MCP URL was not found')

function parse(text) {
  const data = text
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6))
  return data.length ? JSON.parse(data.at(-1)) : null
}

async function call(body, sessionId) {
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
    body: parse(await response.text()),
  }
}

const init = await call({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'vue-penpot-export', version: '1.0.0' },
  },
})
await call({ jsonrpc: '2.0', method: 'notifications/initialized' }, init.sessionId)
let shapeId = shapeReference
if (shapeReference.startsWith('name:')) {
  const shapeName = shapeReference.slice(5)
  const lookup = await call(
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'execute_code',
        arguments: {
          code: `const targetName = ${JSON.stringify(shapeName)};
const visit = (shape) => {
  if (shape.name === targetName) return shape;
  for (const child of shape.children ?? []) {
    const match = visit(child);
    if (match) return match;
  }
  return null;
};
const match = visit(penpot.root);
return match ? { id: match.id, name: match.name } : null;`,
        },
      },
    },
    init.sessionId,
  )
  const text = lookup.body?.result?.content?.find((item) => item.type === 'text')?.text
  const execution = text ? JSON.parse(text) : null
  shapeId = execution?.result?.id
  if (!shapeId) throw new Error(`Penpot shape was not found: ${shapeName}`)
}
const exported = await call(
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'export_shape',
      arguments: { shapeId, format: 'png', mode: 'shape' },
    },
  },
  init.sessionId,
)

const image = exported.body?.result?.content?.find((item) => item.type === 'image')
if (!image?.data) throw new Error(JSON.stringify(exported.body))
await writeFile(outputPath, Buffer.from(image.data, 'base64'))
console.log(`${outputPath} (${image.mimeType})`)
