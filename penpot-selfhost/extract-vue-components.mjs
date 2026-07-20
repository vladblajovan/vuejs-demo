import { readFile } from 'node:fs/promises'

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

async function extractVueComponents() {
  const root = penpot.root
  const local = penpot.library.local
  if (!root) throw new Error('The active Penpot page has no root')

  function walk(shape, output = []) {
    output.push(shape)
    for (const child of shape.children ?? []) walk(child, output)
    return output
  }

  function findRootChild(name) {
    return [...root.children].find((shape) => shape.name === name)
  }

  const website = findRootChild('Code snapshot / Website / Vue in Motion / Desktop 1728')
  const system = findRootChild('Code snapshot / Design system / Vue in Motion')
  if (!website || !system) {
    throw new Error('Run sync-vue-design.mjs before extracting components')
  }

  const sources = [...walk(website), ...walk(system)]
  let masters =
    findRootChild('Approved / Component library / Vue in Motion') ??
    findRootChild('Component library / Extracted')
  if (!masters) {
    masters = penpot.createBoard()
    masters.name = 'Approved / Component library / Vue in Motion'
    masters.x = 1848
    masters.y = 3240
    masters.clipContent = false
    masters.fills = [{ fillColor: '#F5F8F9', fillOpacity: 1 }]
    root.appendChild(masters)
  }
  masters.name = 'Approved / Component library / Vue in Motion'
  masters.resize(1500, 2900)

  const specs = [
    ['Brand / Vue mark', 'Brand / Vue mark'],
    ['Button / Primary / Large', 'Button / Primary / Large'],
    ['Component specimen / Secondary button', 'Button / Secondary / Large'],
    ['Input / Add task', 'Form / Text input'],
    ['Filter / All / Active', 'Filter / Active'],
    ['Status / Open', 'Badge / Status / Open'],
    ['Status / Done', 'Badge / Status / Done'],
    ['Component / Task board', 'Workspace / Task board'],
    ['Code panel / Computed in useTasks', 'Code / Panel'],
    ['Insight / Total tasks', 'Insight / Metric'],
    ['Component / Projection graph', 'Composition / Projection graph'],
    ['Projection / Progress', 'Projection / Progress'],
    ['Journey / 01 / TaskBoard.vue', 'Journey / Step'],
    ['Test panel / TaskBoard.spec.ts', 'Testing / Code panel'],
    ['Mental model / useTasks()', 'Architecture / Node'],
    ['Component specimen / Content card', 'Card / Content'],
  ]

  const created = []
  const skipped = []
  const placements = {
    'Brand / Vue mark': [24, 180],
    'Button / Primary / Large': [300, 180],
    'Button / Secondary / Large': [300, 275],
    'Form / Text input': [650, 180],
    'Filter / Active': [650, 275],
    'Badge / Status / Open': [900, 275],
    'Badge / Status / Done': [1100, 275],
    'Workspace / Task board': [24, 510],
    'Code / Panel': [760, 510],
    'Insight / Metric': [760, 850],
    'Projection / Progress': [24, 1130],
    'Journey / Step': [380, 1130],
    'Architecture / Node': [650, 1130],
    'Card / Content': [950, 1130],
    'Testing / Code panel': [24, 1560],
    'Composition / Projection graph': [90, 2080],
  }

  function componentPosition(fullName) {
    const position = placements[fullName]
    if (!position) throw new Error(`Component layout was not found: ${fullName}`)
    return {
      x: masters.x + position[0],
      y: masters.y + position[1],
    }
  }

  for (const child of Array.from(masters.children)) {
    if (child.name.startsWith('Catalog label /')) child.remove()
  }

  function catalogLabel(name, characters, x, y, width, size = 12, weight = '700') {
    const shape = penpot.createText(characters)
    if (!shape) return null
    shape.name = `Catalog label / ${name}`
    shape.x = x
    shape.y = y
    shape.resize(width, 24)
    shape.growType = 'fixed'
    const font = penpot.fonts.findByName('Manrope')
    const variant = font?.variants?.find(
      (item) =>
        item.fontWeight === String(weight) && (item.fontStyle ?? 'normal') === 'normal',
    )
    if (font) font.applyToText(shape, variant)
    shape.fontSize = String(size)
    shape.lineHeight = '1.2'
    shape.fills = [{ fillColor: '#0B1833', fillOpacity: 1 }]
    masters.appendChild(shape)
    return shape
  }

  catalogLabel(
    'Title',
    'Approved component library',
    masters.x + 24,
    masters.y + 28,
    700,
    24,
    '800',
  )
  catalogLabel(
    'Guidance',
    'Edit approved masters here. Code snapshots never overwrite this board.',
    masters.x + 24,
    masters.y + 67,
    900,
    12,
    '500',
  )
  ;[
    ['Section / Foundations', 'Foundations & controls', 24, 112],
    ['Section / Feature surfaces', 'Feature surfaces', 24, 442],
    ['Section / System views', 'System views', 24, 1062],
    ['Section / Testing', 'Testing', 24, 1492],
    ['Section / Composition', 'Composition', 24, 2012],
  ].forEach(([name, characters, x, y]) => {
    catalogLabel(name, characters, masters.x + x, masters.y + y, 700, 16, '800')
  })
  for (const [, fullName] of specs) {
    const position = componentPosition(fullName)
    catalogLabel(fullName, fullName, position.x, position.y - 30, 650)
  }

  function syncPlacement(component, fullName) {
    const main = component.mainInstance()
    if (!main) return
    const position = componentPosition(fullName)
    main.x = position.x
    main.y = position.y
  }

  function syncProjectionGraphGeometry(component, fullName) {
    if (fullName !== 'Composition / Projection graph') return
    const main = component.mainInstance()
    if (!main) return
    const shapes = walk(main)
    const backbone = shapes.find((shape) => shape.name === 'State backbone / useTasks')
    const parentStem = shapes.find((shape) => shape.name === 'State backbone / Parent stem')
    const progressStem = shapes.find((shape) => shape.name === 'State backbone / Progress stem')
    if (!backbone || !parentStem || !progressStem) return
    backbone.x = progressStem.x - backbone.width / 2
    parentStem.x = progressStem.x
  }

  function syncElevation(component, fullName) {
    const shadowSpecs = {
      'Button / Primary / Large': [8, 22, 0.17, '#0C9564'],
      'Workspace / Task board': [24, 65, 0.08, '#0D1F37'],
      'Code / Panel': [12, 36, 0.06, '#0D1F37'],
      'Testing / Code panel': [12, 36, 0.06, '#0D1F37'],
      'Architecture / Node': [12, 36, 0.06, '#0D1F37'],
    }
    const spec = shadowSpecs[fullName]
    if (!spec) return
    const main = component.mainInstance()
    if (!main) return
    const [offsetY, blur, opacity, color] = spec
    main.shadows = [
      {
        style: 'drop-shadow',
        offsetX: 0,
        offsetY,
        blur,
        spread: 0,
        hidden: false,
        color: { color, opacity },
      },
    ]
  }

  for (const [sourceName, fullName] of specs) {
    const parts = fullName.split(' / ')
    const name = parts.pop()
    const path = parts.join(' / ')
    const existing = local.components.find(
      (component) => component.name === name && component.path === path,
    )
    if (existing) {
      syncPlacement(existing, fullName)
      syncProjectionGraphGeometry(existing, fullName)
      syncElevation(existing, fullName)
      skipped.push(fullName)
      continue
    }

    const source = sources.find((shape) => shape.name === sourceName)
    if (!source) throw new Error(`Component source was not found: ${sourceName}`)

    const clone = source.clone()
    const position = componentPosition(fullName)
    clone.x = position.x
    clone.y = position.y
    clone.name = `${fullName} / Main`
    masters.appendChild(clone)

    const component = local.createComponent([clone])
    component.name = name
    component.path = path
    syncPlacement(component, fullName)
    syncProjectionGraphGeometry(component, fullName)
    syncElevation(component, fullName)
    created.push(fullName)
  }

  storage.vueComponentLibraryBoard = masters
  penpot.selection = [masters]

  const tokenSets = local.tokens.sets.map((set) => ({
    name: set.name,
    active: set.active,
    tokens: set.tokens.length,
  }))
  const componentBounds = specs.map(([, fullName]) => {
    const parts = fullName.split(' / ')
    const name = parts.pop()
    const path = parts.join(' / ')
    const component = local.components.find(
      (item) => item.name === name && item.path === path,
    )
    const main = component?.mainInstance()
    return main
      ? {
          name: fullName,
          x: main.x,
          y: main.y,
          width: main.width,
          height: main.height,
        }
      : null
  }).filter(Boolean)
  const overlaps = []
  for (let index = 0; index < componentBounds.length; index += 1) {
    const current = componentBounds[index]
    for (let compareIndex = index + 1; compareIndex < componentBounds.length; compareIndex += 1) {
      const candidate = componentBounds[compareIndex]
      const intersects =
        current.x < candidate.x + candidate.width &&
        current.x + current.width > candidate.x &&
        current.y < candidate.y + candidate.height &&
        current.y + current.height > candidate.y
      if (intersects) overlaps.push([current.name, candidate.name])
    }
  }

  return {
    componentBoard: {
      id: masters.id,
      name: masters.name,
      width: masters.width,
      height: masters.height,
      ownership: 'approved',
    },
    components: {
      total: local.components.length,
      created,
      skipped,
      overlaps,
    },
    tokens: {
      sets: tokenSets,
      total: tokenSets.reduce((sum, set) => sum + set.tokens, 0),
    },
  }
}

const initialized = await request({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'vue-penpot-components', version: '1.0.0' },
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

await request(
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'high_level_overview', arguments: {} },
  },
  sessionId,
)

const result = await request(
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'execute_code',
      arguments: {
        code: `return (${extractVueComponents.toString()})();`,
      },
    },
  },
  sessionId,
)

const content = result.payload?.result?.content?.find((item) => item.type === 'text')?.text
if (!content) throw new Error(JSON.stringify(result.payload))

const execution = JSON.parse(content)
if (execution.error) throw new Error(execution.error)

console.log(JSON.stringify(execution.result, null, 2))
