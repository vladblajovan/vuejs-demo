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

async function applyApprovedDesignRefinements() {
  const root = penpot.root
  if (!root) throw new Error('The active Penpot page has no root')

  const approvedRootNames = new Set([
    'Approved / Website / Vue in Motion / Desktop 1728',
    'Approved / Design system / Vue in Motion',
    'Approved / Component library / Vue in Motion',
  ])
  const targetNames = new Set([
    'Filter / All / Active',
    'Filter / Open',
    'Filter / Done',
    'Projection filter / All',
    'Projection filter / Open',
    'Projection filter / Done',
    'Status / Open',
    'Status / Done',
    'Component specimen / Filter active',
    'Component specimen / Status open',
    'Component specimen / Status done',
    'Filter / Active / Active',
    'Badge / Status / Open / Open',
    'Badge / Status / Done / Done',
  ])

  function walk(shape, output = []) {
    output.push(shape)
    for (const child of shape.children ?? []) walk(child, output)
    return output
  }

  const approvedRoots = [...root.children].filter((shape) => approvedRootNames.has(shape.name))
  if (approvedRoots.length !== approvedRootNames.size) {
    throw new Error('Approved website, design-system, and component-library boards are required')
  }

  const website = approvedRoots.find(
    (shape) => shape.name === 'Approved / Website / Vue in Motion / Desktop 1728',
  )
  const redundantHeroRules = walk(website).filter(
    (shape) => shape.name === 'Hero / Continuation rule',
  )
  for (const rule of redundantHeroRules) rule.remove()

  function shiftTopLevel(shape, amount) {
    shape.y += amount
  }

  function repairResponsiveHeadings(page) {
    const shapes = walk(page)
    const headings = shapes.filter(
      (shape) =>
        shape.type === 'text' &&
        shape.name.endsWith('/ Heading') &&
        typeof shape.characters === 'string',
    )
    for (const heading of headings) {
      const fontSize = Number(heading.fontSize)
      if (!Number.isFinite(fontSize) || fontSize <= 0) continue
      const charactersPerLine = Math.max(8, Math.floor(heading.width / (fontSize * 0.55)))
      const lineCount = Math.max(1, Math.ceil(heading.characters.length / charactersPerLine))
      const headingHeight = Math.max(fontSize * 1.25, lineCount * fontSize * 1.08)
      heading.resize(heading.width, headingHeight)
      const supportingName = heading.name.replace(/\/ Heading$/, '/ Supporting copy')
      const supporting = shapes.find((shape) => shape.name === supportingName)
      if (supporting) supporting.y = heading.y + headingHeight + 12
    }
    return headings.length
  }

  const tablet = [...root.children].find(
    (shape) => shape.name === 'Approved / Responsive / Website / Tablet 1024',
  )
  const mobile = [...root.children].find(
    (shape) => shape.name === 'Approved / Responsive / Website / Mobile 390',
  )
  const responsiveRepairs = {
    tabletShifted: false,
    mobileShifted: false,
    headings: 0,
    labelsCreated: 0,
  }

  if (tablet) {
    if (tablet.height < 5720) {
      for (const shape of tablet.children ?? []) {
        if (
          shape.name === 'Tablet / Primary action' ||
          shape.name === 'Tablet / Secondary action' ||
          shape.name === 'Responsive / Workspace / Task board' ||
          shape.name === 'Tablet / Hero divider' ||
          shape.y >= tablet.y + 884
        ) {
          shiftTopLevel(shape, 20)
        }
      }
      tablet.resize(tablet.width, 5720)
      responsiveRepairs.tabletShifted = true
    }
    responsiveRepairs.headings += repairResponsiveHeadings(tablet)
  }

  if (mobile) {
    if (mobile.height < 6880) {
      for (const shape of mobile.children ?? []) {
        if (
          shape.name === 'Mobile / Primary action' ||
          shape.name === 'Mobile / Secondary action' ||
          shape.name === 'Responsive / Workspace / Task board' ||
          shape.name === 'Mobile / Hero divider' ||
          shape.y >= mobile.y + 1090
        ) {
          shiftTopLevel(shape, 80)
        }
      }
      mobile.resize(mobile.width, 6880)
      responsiveRepairs.mobileShifted = true
    }
    if (mobile.height < 7240) {
      for (const shape of mobile.children ?? []) {
        if (
          shape.y >= mobile.y + 2030 &&
          !shape.name.startsWith('Responsive / Metric /')
        ) {
          shiftTopLevel(shape, 300)
        }
      }
      mobile.resize(mobile.width, 7240)
      responsiveRepairs.mobileShifted = true
    }
    const mobileComposition = [...(mobile.children ?? [])].find(
      (shape) => shape.name === 'Mobile / Composition background',
    )
    if (mobileComposition && mobileComposition.y < mobile.y + 2250) {
      for (const shape of mobile.children ?? []) {
        if (
          shape.name === 'Mobile / Composition background' ||
          shape.name === 'One state. Many views. / Heading' ||
          shape.name === 'One state. Many views. / Supporting copy'
        ) {
          shiftTopLevel(shape, 300)
        }
      }
      responsiveRepairs.mobileShifted = true
    }
    responsiveRepairs.headings += repairResponsiveHeadings(mobile)
  }

  const responsiveStates = [...root.children].find(
    (shape) => shape.name === 'Approved / Responsive component states / Vue in Motion',
  )
  if (responsiveStates) {
    const labelSpecs = [
      ['Full-width primary button', 56, 180],
      ['Task form / Inline', 440, 160],
      ['Task form / Stacked', 1100, 144],
      ['Filter row / Inline', 56, 370],
      ['Filter row / Scrollable', 440, 370],
      ['Projection layout / Three columns', 56, 570],
      ['Projection layout / Two columns', 820, 570],
      ['Projection layout / One column', 56, 880],
      ['Journey / Horizontal', 470, 890],
      ['Journey / Vertical', 470, 1080],
    ]
    const existingLabels = new Set(
      [...(responsiveStates.children ?? [])]
        .filter((shape) => shape.name.startsWith('Responsive states / Catalog label /'))
        .map((shape) => shape.name),
    )
    const font = penpot.fonts.findByName('Manrope')
    const variant = font?.variants?.find(
      (item) => item.fontWeight === '700' && (item.fontStyle ?? 'normal') === 'normal',
    )
    for (const [characters, offsetX, offsetY] of labelSpecs) {
      const name = `Responsive states / Catalog label / ${characters}`
      if (existingLabels.has(name)) continue
      const label = penpot.createText(characters)
      if (!label) throw new Error(`Could not create responsive catalog label: ${characters}`)
      label.name = name
      label.x = responsiveStates.x + offsetX
      label.y = responsiveStates.y + offsetY
      label.resize(420, 24)
      label.growType = 'fixed'
      if (font) font.applyToText(label, variant)
      label.fontSize = '12'
      label.lineHeight = '1.2'
      label.fills = [{ fillColor: '#0B1833', fillOpacity: 1 }]
      responsiveStates.appendChild(label)
      responsiveRepairs.labelsCreated += 1
    }
  }

  const targets = approvedRoots.flatMap((shape) => walk(shape)).filter((shape) => {
    return shape.type === 'board' && targetNames.has(shape.name)
  })

  const updated = []
  for (const control of targets) {
    const labels = [...(control.children ?? [])].filter(
      (shape) => typeof shape.characters === 'string',
    )
    if (labels.length !== 1) {
      throw new Error(`${control.name} must contain exactly one direct text label`)
    }

    const label = labels[0]
    label.characters = label.characters.replace(/\s+/g, ' ').trim()
    label.x = control.x
    label.y = control.y
    label.resize(control.width, control.height)
    label.growType = 'fixed'
    label.align = 'center'
    label.verticalAlign = 'center'
    label.lineHeight = '1'
    const isCentered =
      label.x === control.x &&
      label.y === control.y &&
      label.width === control.width &&
      label.height === control.height &&
      label.align === 'center' &&
      label.verticalAlign === 'center'
    if (!isCentered) {
      throw new Error(`Could not center the inner label for ${control.name}`)
    }
    updated.push({
      control: control.name,
      label: label.name,
      width: control.width,
      height: control.height,
      characters: label.characters,
      innerContentCentered: true,
    })
  }

  const tokenSet = penpot.library.local.tokens.sets.find((set) => set.name === 'core')
  if (!tokenSet) throw new Error('The core token set is required')
  const expectedTokens = [
    ['control.height.badge', '24'],
    ['control.height.filterCompact', '25'],
    ['control.height.filter', '30'],
    ['control.gap.label', '4'],
  ]
  const tokens = expectedTokens.map(([name, value]) => {
    const token = tokenSet.tokens.find((item) => item.name === name)
    if (!token) throw new Error(`Required token is missing: ${name}`)
    return { name, value: token.value ?? value }
  })

  return {
    approvedBoards: approvedRoots.map((shape) => shape.name),
    removedRedundantHeroRules: redundantHeroRules.length,
    responsiveRepairs,
    updated,
    tokens,
  }
}

const initialized = await request({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'vue-penpot-approved-design-refinements', version: '1.0.0' },
  },
})

const sessionId = initialized.sessionId
if (!sessionId) throw new Error('Penpot MCP did not return a session id')

await request({ jsonrpc: '2.0', method: 'notifications/initialized' }, sessionId)
await request(
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'high_level_overview', arguments: {} },
  },
  sessionId,
)

const response = await request(
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'execute_code',
      arguments: {
        code: `return (${applyApprovedDesignRefinements.toString()})()`,
      },
    },
  },
  sessionId,
)

const text = response.payload?.result?.content?.find((item) => item.type === 'text')?.text
if (!text) throw new Error(JSON.stringify(response.payload))
const execution = JSON.parse(text)
if (!execution.result) throw new Error(execution.error || execution.log || text)
console.log(JSON.stringify(execution.result, null, 2))
