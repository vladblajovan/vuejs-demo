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

async function migratePenpotWorkflow() {
  const root = penpot.root
  const local = penpot.library.local
  if (!root) throw new Error('The active Penpot page has no root')

  const C = {
    vue: '#42B883',
    vueDark: '#0C9564',
    ink: '#0B1833',
    inkSoft: '#25324A',
    muted: '#66738A',
    white: '#FFFFFF',
    surface: '#F5F8F9',
    mintSoft: '#F3FBF7',
    mintBand: '#EFFAF5',
    border: '#DCE4E8',
    borderStrong: '#A8C9BD',
  }

  const findRootChild = (name) => [...root.children].find((shape) => shape.name === name)

  const approvedWebsite =
    findRootChild('Approved / Website / Vue in Motion / Desktop 1728') ??
    findRootChild('Website / Vue in Motion / Desktop 1728')
  const approvedSystem =
    findRootChild('Approved / Design system / Vue in Motion') ??
    findRootChild('Design system / Vue in Motion')
  const approvedComponents =
    findRootChild('Approved / Component library / Vue in Motion') ??
    findRootChild('Component library / Extracted')

  if (!approvedWebsite || !approvedSystem || !approvedComponents) {
    throw new Error(
      'The existing website, design-system, and component-library boards are required before migration',
    )
  }

  const approvedColumnX = approvedWebsite.x >= 1800 ? 3600 : 0
  const workflowOffsetX = approvedColumnX

  approvedWebsite.name = 'Approved / Website / Vue in Motion / Desktop 1728'
  approvedWebsite.x = approvedColumnX
  approvedWebsite.y = 1200

  approvedSystem.name = 'Approved / Design system / Vue in Motion'
  approvedSystem.x = approvedColumnX + 1848
  approvedSystem.y = 1200

  approvedComponents.name = 'Approved / Component library / Vue in Motion'
  approvedComponents.x = approvedColumnX + 1848
  approvedComponents.y = 3240
  approvedComponents.resize(1500, 4700)
  approvedComponents.clipContent = false

  let explorations = findRootChild('Explorations / Vue in Motion')
  let explorationCreated = false

  function append(parent, shape) {
    parent.appendChild(shape)
    return shape
  }

  function board(name, x, y, width, height, fill, parent = root, stroke, radius = 0) {
    const shape = penpot.createBoard()
    shape.name = name
    shape.x = x + workflowOffsetX
    shape.y = y
    shape.resize(width, height)
    shape.clipContent = false
    shape.fills = fill ? [{ fillColor: fill, fillOpacity: 1 }] : []
    shape.strokes = stroke
      ? [
          {
            strokeColor: stroke,
            strokeOpacity: 1,
            strokeWidth: 1,
            strokeStyle: 'solid',
            strokeAlignment: 'inner',
          },
        ]
      : []
    shape.borderRadius = radius
    return append(parent, shape)
  }

  function text(name, characters, x, y, width, height, size, weight, color, parent) {
    const shape = penpot.createText(characters)
    if (!shape) throw new Error(`Could not create text: ${name}`)
    shape.name = name
    shape.x = x + workflowOffsetX
    shape.y = y
    shape.resize(width, height)
    shape.growType = 'fixed'
    const font = penpot.fonts.findByName('Manrope')
    const variant = font?.variants?.find(
      (item) =>
        item.fontWeight === String(weight) && (item.fontStyle ?? 'normal') === 'normal',
    )
    if (font) font.applyToText(shape, variant)
    shape.fontSize = String(size)
    shape.lineHeight = '1.25'
    shape.fills = [{ fillColor: color, fillOpacity: 1 }]
    return append(parent, shape)
  }

  if (!explorations) {
    explorationCreated = true
    explorations = board(
      'Explorations / Vue in Motion',
      0,
      0,
      3248,
      920,
      C.surface,
    )
    text(
      'Workflow / Title',
      'Vue in Motion — Design workflow',
      72,
      64,
      1500,
      58,
      42,
      800,
      C.ink,
      explorations,
    )
    text(
      'Workflow / Intro',
      'Explore freely, approve deliberately, then compare the implementation against a generated code snapshot.',
      72,
      132,
      1900,
      34,
      16,
      400,
      C.muted,
      explorations,
    )

    const stages = [
      [
        '01',
        'Explore',
        'Duplicate an approved frame or component here. Test alternatives, responsive layouts, content stress, and interaction states.',
      ],
      [
        '02',
        'Review',
        'Capture UX decisions, accessibility risks, affected tokens, and acceptance criteria before moving work forward.',
      ],
      [
        '03',
        'Approve',
        'Move the selected result into the Approved area. Export the design contract before implementation begins.',
      ],
    ]

    stages.forEach(([number, title, copy], index) => {
      const x = 72 + index * 1035
      const card = board(
        `Workflow / ${number} ${title}`,
        x,
        230,
        960,
        270,
        C.white,
        explorations,
        C.border,
        12,
      )
      text(`Workflow / ${number} / Number`, number, x + 28, 258, 80, 28, 13, 700, C.vueDark, card)
      text(`Workflow / ${number} / Title`, title, x + 28, 302, 600, 42, 28, 800, C.ink, card)
      text(`Workflow / ${number} / Copy`, copy, x + 28, 362, 880, 92, 15, 400, C.inkSoft, card)
    })

    const responsive = board(
      'Workflow / Responsive review slots',
      72,
      560,
      3030,
      250,
      C.mintBand,
      explorations,
      C.borderStrong,
      12,
    )
    text(
      'Workflow / Responsive / Title',
      'Required review views',
      104,
      594,
      680,
      34,
      24,
      800,
      C.ink,
      responsive,
    )
    ;[
      ['Desktop', '1728 px', 104],
      ['Tablet', '1024 px', 890],
      ['Mobile', '390 px', 1676],
      ['States', 'focus · loading · error · empty', 2462],
    ].forEach(([label, detail, x]) => {
      text(`Workflow / Responsive / ${label}`, label, x, 663, 340, 30, 17, 700, C.ink, responsive)
      text(
        `Workflow / Responsive / ${label} detail`,
        detail,
        x,
        708,
        500,
        28,
        13,
        500,
        C.muted,
        responsive,
      )
    })
  }

  explorations.x = approvedColumnX
  explorations.y = 0

  storage.vueExplorationsBoard = explorations
  storage.vueApprovedWebsiteBoard = approvedWebsite
  storage.vueApprovedDesignSystemBoard = approvedSystem
  storage.vueApprovedComponentLibraryBoard = approvedComponents
  penpot.selection = [explorations]

  return {
    migration: {
      explorationCreated,
      approvedBoardsPreserved: 3,
    },
    boards: [...root.children].map((shape) => ({
      id: shape.id,
      name: shape.name,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
    })),
    library: {
      components: local.components.length,
      colors: local.colors.length,
      typographies: local.typographies.length,
      tokenSets: local.tokens.sets.length,
      tokens: local.tokens.sets.reduce((sum, set) => sum + set.tokens.length, 0),
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
    clientInfo: { name: 'vue-penpot-workflow-migration', version: '1.0.0' },
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

const result = await request(
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'execute_code',
      arguments: {
        code: `(${migratePenpotWorkflow.toString()})()`,
      },
    },
  },
  sessionId,
)

const text = result.payload?.result?.content?.find((item) => item.type === 'text')?.text
console.log(text ?? JSON.stringify(result.payload, null, 2))
