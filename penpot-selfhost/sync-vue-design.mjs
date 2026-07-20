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

async function buildVueDesign() {
  const C = {
    vue: '#42B883',
    vueDark: '#0C9564',
    ink: '#0B1833',
    inkSoft: '#25324A',
    muted: '#66738A',
    cobalt: '#1769E0',
    white: '#FFFFFF',
    surface: '#F5F8F9',
    mintSoft: '#F3FBF7',
    mintBand: '#EFFAF5',
    border: '#DCE4E8',
    borderStrong: '#A8C9BD',
    blueSoft: '#EFF7FF',
    blueBorder: '#C9DFF8',
  }

  const sans = penpot.fonts.findByName('Manrope')
  const mono = penpot.fonts.findByName('DM Mono')
  const root = penpot.root

  if (!root) throw new Error('The active Penpot page has no root')

  for (const child of [...root.children]) {
    if (child.name !== 'Component library / Extracted') child.remove()
  }

  try {
    penpot.currentPage.name = 'Vue in Motion'
  } catch {
    // Older Penpot versions may not expose a writable page name.
  }

  function add(parent, shape) {
    if (!parent || typeof parent.appendChild !== 'function') {
      throw new Error(
        `Cannot append "${shape?.name ?? 'unknown'}"; invalid parent "${parent?.name ?? String(parent)}"`,
      )
    }
    parent.appendChild(shape)
    return shape
  }

  function board(name, x, y, width, height, fill, parent = root, stroke, radius = 0) {
    const shape = penpot.createBoard()
    shape.name = name
    shape.x = x
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
    return add(parent, shape)
  }

  function rect(name, x, y, width, height, fill, parent, stroke, radius = 0) {
    const shape = penpot.createRectangle()
    shape.name = name
    shape.x = x
    shape.y = y
    shape.resize(width, height)
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
    return add(parent, shape)
  }

  function ellipse(name, x, y, width, height, fill, parent, stroke, strokeWidth = 1) {
    const shape = penpot.createEllipse()
    shape.name = name
    shape.x = x
    shape.y = y
    shape.resize(width, height)
    shape.fills = fill ? [{ fillColor: fill, fillOpacity: 1 }] : []
    shape.strokes = stroke
      ? [
          {
            strokeColor: stroke,
            strokeOpacity: 1,
            strokeWidth,
            strokeStyle: 'solid',
            strokeAlignment: 'inner',
          },
        ]
      : []
    return add(parent, shape)
  }

  function line(name, x, y, width, height, color, parent) {
    return rect(name, x, y, Math.max(width, 1), Math.max(height, 1), color, parent)
  }

  function text(
    name,
    characters,
    x,
    y,
    width,
    height,
    size,
    weight,
    color,
    parent,
    options = {},
  ) {
    const shape = penpot.createText(characters)
    if (!shape) throw new Error(`Could not create text: ${name}`)
    shape.name = name
    shape.x = x
    shape.y = y
    shape.resize(width, height)
    shape.growType = 'fixed'
    const font = options.family === 'mono' ? mono : sans
    const variant = font?.variants?.find(
      (item) =>
        item.fontWeight === String(weight) && (item.fontStyle ?? 'normal') === 'normal',
    )
    if (font) font.applyToText(shape, variant)
    shape.fontSize = String(size)
    shape.lineHeight = String(options.lineHeight ?? 1.25)
    shape.align = options.align ?? 'left'
    shape.verticalAlign = options.verticalAlign ?? 'top'
    shape.fills = [{ fillColor: color, fillOpacity: 1 }]
    if (weight >= 700 && size >= 28) {
      shape.strokes = [
        {
          strokeColor: color,
          strokeOpacity: 1,
          strokeWidth: size >= 64 ? 1.1 : size >= 44 ? 0.85 : 0.5,
          strokeStyle: 'solid',
          strokeAlignment: 'center',
        },
      ]
    }
    if (options.decoration) shape.textDecoration = options.decoration
    return add(parent, shape)
  }

  function pill(name, label, x, y, width, parent, options = {}) {
    const height = options.height ?? 30
    const item = board(
      name,
      x,
      y,
      width,
      height,
      options.fill ?? C.white,
      parent,
      options.stroke ?? C.border,
      options.radius ?? 7,
    )
    text(
      `${name} / Label`,
      label,
      x + 10,
      y + 7,
      width - 20,
      height - 12,
      options.size ?? 11,
      options.weight ?? 700,
      options.color ?? C.inkSoft,
      item,
      { align: 'center', lineHeight: 1 },
    )
    return item
  }

  function svg(name, markup, x, y, width, height, parent) {
    const shape = penpot.createShapeFromSvg(markup)
    if (!shape) return null
    shape.name = name
    shape.x = x
    shape.y = y
    shape.resize(width, height)
    return add(parent, shape)
  }

  function sourceArrowRight(name, x, y, size, parent, color = C.white) {
    return svg(
      name,
      `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M3 10h13m-5-5 5 5-5 5" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      x,
      y,
      size,
      size,
      parent,
    )
  }

  function sourceArrowDown(name, x, y, size, parent, color = C.vueDark) {
    return svg(
      name,
      `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 3v13m-5-5 5 5 5-5" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      x,
      y,
      size,
      size,
      parent,
    )
  }

  function sourceJourneyArrow(name, x, y, width, parent) {
    return svg(
      name,
      `<svg viewBox="0 0 28 18" xmlns="http://www.w3.org/2000/svg"><path d="M1 9h24M19 3l6 6-6 6" fill="none" stroke="${C.vueDark}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      x,
      y,
      width,
      18,
      parent,
    )
  }

  function sourceBrand(name, x, y, width, parent) {
    return svg(
      name,
      `<svg viewBox="0 0 48 42" xmlns="http://www.w3.org/2000/svg"><path d="M2 2h10l12 20L36 2h10L24 40z" fill="${C.vue}"/><path d="M12 2h8l4 7 4-7h8L24 22z" fill="#172033"/></svg>`,
      x,
      y,
      width,
      width * 0.875,
      parent,
    )
  }

  function panel(name, x, y, width, height, parent, options = {}) {
    return board(
      name,
      x,
      y,
      width,
      height,
      options.fill ?? C.white,
      parent,
      options.stroke ?? C.borderStrong,
      options.radius ?? 10,
    )
  }

  function dropShadow(shape, offsetY, blur, opacity, color = '#0D1F37') {
    shape.shadows = [
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
    return shape
  }

  function sectionHeading(parent, title, subtitle, y, options = {}) {
    text(
      `${title} / Heading`,
      title,
      options.x ?? 204,
      y,
      options.width ?? 640,
      options.height ?? 60,
      options.size ?? 52.8,
      800,
      C.ink,
      parent,
      { lineHeight: 1.04, letterSpacing: -2.5 },
    )
    if (subtitle) {
      text(
        `${title} / Supporting copy`,
        subtitle,
        options.x ?? 204,
        y + (options.subtitleOffset ?? 72),
        options.width ?? 640,
        48,
        options.subtitleSize ?? 15,
        400,
        C.muted,
        parent,
        { lineHeight: 1.7 },
      )
    }
  }

  function codePanel(name, x, y, width, height, filename, code, parent, size = 11) {
    const item = panel(name, x, y, width, height, parent)
    line(`${name} / Header divider`, x, y + 51, width, 1, C.borderStrong, item)
    text(`${name} / Filename`, filename, x + 18, y + 18, width - 70, 20, 11, 700, C.vueDark, item)
    text(`${name} / Code icon`, '</>', x + width - 54, y + 18, 36, 20, 11, 500, C.vueDark, item, {
      family: 'mono',
      align: 'right',
    })
    text(`${name} / Code`, code, x + 18, y + 68, width - 36, height - 84, size, 500, C.inkSoft, item, {
      family: 'mono',
      lineHeight: 1.65,
    })
    return item
  }

  const canvas = board('Website / Vue in Motion / Desktop 1728', 0, 0, 1728, 7224, C.white)
  canvas.clipContent = true

  const header = board('01 Header', 0, 0, 1728, 88, C.white, canvas)
  sourceBrand('Brand / Vue mark', 204, 28, 32, header)
  text('Brand / Name', 'Vue in Motion', 248, 31, 190, 28, 17, 800, C.ink, header, {
    lineHeight: 1,
    letterSpacing: -0.5,
  })
  const nav = [
    ['Workspace', 1092],
    ['Reactivity', 1212],
    ['Composition', 1328],
    ['Data flow', 1458],
  ]
  for (const [label, x] of nav) {
    text(`Navigation / ${label}`, label, x, 35, 86, 20, 13, 700, C.ink, header, {
      lineHeight: 1,
      align: 'center',
    })
  }

  const hero = board('02 Hero + Live workspace', 0, 88, 1728, 624, C.white, canvas)
  ;[
    ['Hero / Headline / Line 1', 'Build one feature.', 153],
    ['Hero / Headline / Line 2', 'Watch Vue', 224],
    ['Hero / Headline / Line 3', 'connect', 294],
    ['Hero / Headline / Line 4', 'the rest', 364],
  ].forEach(([name, label, y]) => {
    text(name, label, 204, y, 638, 70, 72, 800, C.ink, hero, {
      lineHeight: 1,
    })
  })
  text('Hero / Accent period', '.', 635, 362, 36, 72, 72, 800, C.vue, hero, {
    lineHeight: 0.98,
  })
  text(
    'Hero / Supporting copy',
    'Add a task once. See state, views, and network behavior evolve together.',
    204,
    463,
    536,
    64,
    18.5,
    400,
    C.muted,
    hero,
    { lineHeight: 1.7 },
  )
  const heroButton = board(
    'Button / Primary / Large',
    204,
    558,
    208,
    54,
    C.vueDark,
    hero,
    C.vueDark,
    10,
  )
  dropShadow(heroButton, 8, 22, 0.17, C.vueDark)
  text('Button / Primary / Label', 'Add your first task', 228, 578, 150, 18, 14.5, 700, C.white, heroButton, {
    lineHeight: 1,
  })
  sourceArrowRight('Button / Primary / Arrow', 378, 576, 18, heroButton)
  text('Hero / Secondary link', 'Follow the data', 437, 579, 122, 18, 13.5, 700, C.vueDark, hero, {
    lineHeight: 1,
  })
  sourceArrowDown('Hero / Secondary arrow', 558, 576, 18, hero)
  line('Hero / Continuation rule', 864, 675, 1, 65, C.borderStrong, hero)

  const task = panel('Component / Task board', 843, 220, 681, 324, hero)
  dropShadow(task, 24, 65, 0.08)
  text('Task board / Title', 'My tasks', 869, 247, 170, 26, 17, 800, C.ink, task, {
    lineHeight: 1,
  })
  const input = board('Input / Add task', 869, 282, 516, 47, C.white, task, C.borderStrong, 7)
  text('Input / Placeholder', 'Add a task', 884, 299, 470, 19, 13.5, 600, C.muted, input, {
    lineHeight: 1,
  })
  const addButton = board('Button / Add task', 1398, 282, 99, 47, C.vueDark, task, C.vueDark, 7)
  text('Button / Add task / Label', 'Add task', 1414, 299, 67, 18, 13, 700, C.white, addButton, {
    align: 'center',
    lineHeight: 1,
  })
  pill('Filter / All / Active', 'All  (2)', 869, 345, 63, task, {
    stroke: C.vue,
    color: C.vueDark,
    height: 30,
  })
  pill('Filter / Open', 'Open  (1)', 940, 345, 75, task, { height: 30 })
  pill('Filter / Done', 'Done  (1)', 1023, 345, 74, task, { height: 30 })
  const taskList = board('Task list', 869, 386, 628, 105, C.white, task, C.border, 7)
  line('Task list / Row divider', 869, 438, 628, 1, C.border, taskList)
  rect('Task / Open / Checkbox', 884, 403, 20, 20, C.white, taskList, '#AAB6C8', 4)
  text('Task / Open / Title', 'Write tests for task repo', 917, 406, 350, 20, 13, 600, C.ink, taskList, {
    lineHeight: 1,
  })
  pill('Status / Open', 'Open', 1436, 401, 46, taskList, {
    fill: C.blueSoft,
    stroke: C.blueBorder,
    color: C.cobalt,
    height: 24,
    radius: 12,
    size: 9,
  })
  rect('Task / Done / Checkbox', 884, 455, 20, 20, C.vueDark, taskList, C.vueDark, 4)
  text('Task / Done / Check', '✓', 887, 457, 14, 14, 11, 700, C.white, taskList, {
    align: 'center',
    lineHeight: 1,
  })
  text('Task / Done / Title', 'Ship add task flow', 917, 458, 350, 20, 13, 600, C.muted, taskList, {
    lineHeight: 1,
    decoration: 'line-through',
  })
  pill('Status / Done', 'Done', 1436, 453, 46, taskList, {
    fill: C.mintSoft,
    stroke: '#BEE8D5',
    color: C.vueDark,
    height: 24,
    radius: 12,
    size: 9,
  })
  text('Task board / Summary', '2 tasks · 1 open · 1 done', 869, 507, 300, 18, 11.5, 400, C.muted, task, {
    lineHeight: 1,
  })

  const reactivity = board('03 Reactivity', 0, 712, 1728, 718, C.white, canvas, C.border)
  sectionHeading(
    reactivity,
    'One action. Many reactions.',
    'Add a task and watch everything update.',
    817,
    { width: 480, height: 110, subtitleOffset: 122 },
  )
  const computedPanel = codePanel(
    'Code panel / Computed in useTasks',
    805,
    817,
    719,
    282,
    'Computed in useTasks',
    `const totalCount = computed(() => tasks.value.length)
const openCount = computed(() =>
  tasks.value.filter(task => !task.completed).length
)
const progress = computed(() =>
  Math.round((doneCount.value / totalCount.value) * 100)
)
const nextTask = computed(() =>
  tasks.value.find(task => !task.completed) ?? null
)`,
    reactivity,
    11,
  )
  dropShadow(computedPanel, 12, 36, 0.06)
  line('Reactive insight rail', 315, 1200, 1098, 1, C.vueDark, reactivity)
  const insights = [
    ['Total tasks', '2', 'Reactive total'],
    ['Open tasks', '1', 'Computed open'],
    ['Progress', '50%', '1 of 2 done'],
    ['Next up', 'Write tests for\ntask repo', 'First incomplete task'],
  ]
  insights.forEach(([label, value, caption], index) => {
    const x = 204 + index * 330
    const item = board(`Insight / ${label}`, x, 1176, 330, 170, null, reactivity)
    ellipse(`Insight / ${label} / Icon background`, x + 141, 1176, 48, 48, C.mintSoft, item, C.borderStrong)
    ellipse(`Insight / ${label} / Dot`, x + 163, 1198, 4, 4, C.vueDark, item)
    text(`Insight / ${label} / Label`, label, x + 45, 1238, 240, 18, 13, 700, C.ink, item, {
      align: 'center',
      lineHeight: 1,
    })
    text(
      `Insight / ${label} / Value`,
      value,
      x + 35,
      1266,
      260,
      index === 3 ? 48 : 52,
      index === 3 ? 16 : 38,
      800,
      C.ink,
      item,
      { align: 'center', lineHeight: index === 3 ? 1.3 : 1 },
    )
    text(`Insight / ${label} / Caption`, caption, x + 45, 1322, 240, 18, 11, 400, C.muted, item, {
      align: 'center',
      lineHeight: 1,
    })
  })

  const composition = board('04 Composition', 0, 1430, 1728, 774, C.mintBand, canvas, C.border)
  sectionHeading(
    composition,
    'One state. Many views.',
    'The same state powers every part of your UI.',
    1510,
    { width: 600 },
  )
  const projectionGraph = board(
    'Component / Projection graph',
    204,
    1649,
    1320,
    462,
    null,
    composition,
  )
  const backbone = panel('State backbone / useTasks', 715.5, 1649, 224, 84, projectionGraph, {
    stroke: C.vueDark,
    radius: 10,
  })
  text('State backbone / Title', 'useTasks()', 735.5, 1668, 184, 20, 14.5, 800, C.ink, backbone, {
    align: 'center',
    lineHeight: 1,
  })
  text(
    'State backbone / Copy',
    'Single source of truth\nReactive state & actions',
    735.5,
    1693,
    184,
    32,
    10.5,
    400,
    C.muted,
    backbone,
    { align: 'center', lineHeight: 1.45 },
  )
  line('State backbone / Parent stem', 827.5, 1733, 1, 25, C.vueDark, projectionGraph)
  line('State backbone / Branch rail', 426.5, 1758, 838.5, 1, C.vueDark, projectionGraph)
  line('State backbone / Task list stem', 426.5, 1758, 1, 25, C.vueDark, projectionGraph)
  line('State backbone / Progress stem', 827.5, 1758, 1, 25, C.vueDark, projectionGraph)
  line('State backbone / Activity stem', 1265, 1758, 1, 25, C.vueDark, projectionGraph)
  const taskProjection = panel('Projection / Task list', 204, 1783, 445, 328, projectionGraph)
  text('Projection / Task list / Title', 'Task list', 223, 1802, 250, 22, 14.5, 800, C.ink, taskProjection, {
    lineHeight: 1,
  })
  pill('Projection filter / All', 'All (2)', 223, 1837, 53, taskProjection, {
    height: 25,
    color: C.vueDark,
    stroke: C.vue,
    size: 9,
  })
  pill('Projection filter / Open', 'Open (1)', 282, 1837, 63, taskProjection, { height: 25, size: 9 })
  pill('Projection filter / Done', 'Done (1)', 351, 1837, 63, taskProjection, { height: 25, size: 9 })
  const miniList = board('Projection / Task rows', 223, 1872, 407, 145, C.white, taskProjection, C.border, 6)
  ;[
    ['Write tests for task repo', 'Open', false],
    ['Ship add task flow', 'Done', true],
  ].forEach(([label, status, done], index) => {
    const y = 1882 + index * 60
    if (index) line('Projection / Task row divider', 223, y - 10, 407, 1, C.border, miniList)
    rect(`Projection / ${label} / Checkbox`, 237, y + 4, 17, 17, done ? C.vueDark : C.white, miniList, done ? C.vueDark : '#AAB6C8', 3)
    if (done) {
      text(`Projection / ${label} / Check`, '✓', 239, y + 6, 13, 12, 9, 700, C.white, miniList, {
        align: 'center',
        lineHeight: 1,
      })
    }
    text(`Projection / ${label} / Title`, label, 266, y + 5, 260, 18, 11, 600, done ? C.muted : C.ink, miniList, {
      lineHeight: 1,
      decoration: done ? 'line-through' : undefined,
    })
    text(`Projection / ${label} / Status`, status, 556, y + 5, 55, 18, 9, 600, done ? C.vueDark : C.cobalt, miniList, {
      align: 'right',
      lineHeight: 1,
    })
  })
  text('Projection / Task list / Summary', '2 tasks · 1 open · 1 done', 223, 2034, 300, 16, 10, 400, C.muted, taskProjection)

  const progressProjection = panel('Projection / Progress', 676, 1783, 303, 328, projectionGraph)
  text('Projection / Progress / Title', 'Progress', 695, 1802, 220, 22, 14.5, 800, C.ink, progressProjection)
  ellipse('Progress ring / Track', 748, 1842, 160, 160, null, progressProjection, '#D9E9FF', 12)
  svg(
    'Progress ring / Value',
    `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="48" fill="none" stroke="${C.vueDark}" stroke-width="12" stroke-dasharray="151 302" transform="rotate(-90 60 60)"/></svg>`,
    748,
    1842,
    160,
    160,
    progressProjection,
  )
  text('Progress ring / Number', '50%', 778, 1890, 100, 36, 27, 800, C.ink, progressProjection, {
    align: 'center',
    lineHeight: 1,
  })
  text('Progress ring / Label', 'Complete', 778, 1926, 100, 18, 10, 400, C.muted, progressProjection, {
    align: 'center',
    lineHeight: 1,
  })
  ;[
    ['Done', '1', C.vueDark],
    ['Open', '1', C.cobalt],
    ['Total', '2', C.muted],
  ].forEach(([label, value, color], index) => {
    const y = 2020 + index * 24
    ellipse(`Progress legend / ${label}`, 700, y + 3, 7, 7, color, progressProjection)
    text(`Progress legend / ${label}`, label, 716, y, 120, 16, 10, 400, C.muted, progressProjection)
    text(`Progress legend / ${label} / Value`, value, 920, y, 34, 16, 10, 700, C.ink, progressProjection, {
      align: 'right',
    })
  })

  const activityProjection = panel('Projection / Recent activity', 1006, 1783, 518, 328, projectionGraph)
  text('Projection / Activity / Title', 'Recent activity', 1025, 1802, 260, 22, 14.5, 800, C.ink, activityProjection)
  line('Projection / Activity / Rail', 1040, 1848, 1, 182, C.borderStrong, activityProjection)
  const activities = [
    ['Tasks loaded', '2 tasks ready', 'Loaded from GET /api/tasks', C.cobalt],
    ['Task completed', 'Ship add task flow', 'Reactive views updated', C.vueDark],
    ['Task added', 'Write tests for task repo', 'Repository created item', C.vue],
  ]
  activities.forEach(([title, label, detail, color], index) => {
    const y = 1842 + index * 68
    ellipse(`Activity / ${title} / Dot`, 1035, y + 5, 11, 11, color, activityProjection, C.white, 2)
    text(`Activity / ${title}`, title, 1062, y, 200, 16, 11, 700, C.vueDark, activityProjection)
    text(`Activity / ${title} / Item`, label, 1062, y + 20, 300, 16, 11, 600, C.ink, activityProjection)
    text(`Activity / ${title} / Detail`, detail, 1062, y + 40, 350, 14, 9.5, 400, C.muted, activityProjection)
  })

  const data = board('05 Data flow', 0, 2204, 1728, 585, C.white, canvas, C.border)
  sectionHeading(
    data,
    'From intent to response.',
    'See the exact journey of your latest task action.',
    2280,
    { width: 640 },
  )
  const journeyItems = [
    ['TaskBoard.vue', 'User expresses intent', 'Load tasks'],
    ['useTasks()', 'Updates request state', "status: 'success'"],
    ['HttpTaskRepository', 'Sends fetch request', 'GET /api/tasks'],
    ['GET /api/tasks', 'MSW · Mock Service Worker', '200 OK · JSON'],
    ['Reactive UI', 'Every projection updates', 'Task list · 2\nOpen count · 1\nProgress · 50%'],
  ]
  journeyItems.forEach(([title, description, code], index) => {
    const x = 204 + index * 264
    const card = panel(`Journey / 0${index + 1} / ${title}`, x, 2406, 220, 200, data, {
      stroke: C.border,
      radius: 10,
    })
    pill(`Journey / 0${index + 1} / Number`, String(index + 1), x + 14, 2420, 22, card, {
      height: 22,
      fill: C.white,
      stroke: C.blueBorder,
      color: C.cobalt,
      size: 9,
      radius: 4,
    })
    text(`Journey / 0${index + 1} / Title`, title, x + 14, 2452, 190, 42, 11.5, 700, C.ink, card, {
      lineHeight: 1.35,
    })
    text(`Journey / 0${index + 1} / Description`, description, x + 14, 2494, 190, 40, 9.5, 400, C.muted, card, {
      lineHeight: 1.45,
    })
    const codeBox = board(`Journey / 0${index + 1} / Result`, x + 14, 2540, 192, 52, C.mintSoft, card, '#CCE7DB', 7)
    text(`Journey / 0${index + 1} / Code`, code, x + 24, 2550, 172, 34, 8.5, 500, C.vueDark, codeBox, {
      family: 'mono',
      lineHeight: 1.45,
    })
    if (index < 4) sourceJourneyArrow(`Journey / 0${index + 1} / Arrow`, x + 229, 2496, 26, data)
  })
  line('Request timeline / Rule', 268, 2687, 1192, 1, C.vueDark, data)
  const timeline = [
    ['Intent', '0ms'],
    ['State update', '12ms'],
    ['Request sent', '28ms'],
    ['Response received', '96ms'],
    ['UI updated', '98ms'],
  ]
  timeline.forEach(([label, timing], index) => {
    const x = 268 + index * 298
    ellipse(`Timeline / ${label} / Dot`, x - 4, 2683, 9, 9, C.vueDark, data)
    text(`Timeline / ${label}`, label, x - 55, 2705, 110, 16, 10, 600, C.inkSoft, data, {
      align: 'center',
      lineHeight: 1,
    })
    text(`Timeline / ${label} / Timing`, timing, x - 55, 2725, 110, 14, 9, 400, C.muted, data, {
      align: 'center',
      lineHeight: 1,
    })
  })

  const confidence = board('06 Confidence through tests', 0, 2789, 1728, 488, C.mintBand, canvas, C.border)
  sectionHeading(
    confidence,
    'Change with confidence.',
    'One test protects the behavior end-to-end.',
    2890,
    { width: 507, height: 110, subtitleOffset: 122 },
  )
  const steps = [
    ['+', 'Add task'],
    ['↻', 'State updates'],
    ['✓', 'UI reflects'],
    ['✓', 'Test passes'],
  ]
  steps.forEach(([symbol, label], index) => {
    const x = 204 + index * 112
    const step = board(`Test loop / 0${index + 1} / ${label}`, x, 3075, 90, 85, null, confidence)
    panel(`Test loop / 0${index + 1} / Icon`, x + 20, 3075, 50, 50, step, {
      fill: C.white,
      stroke: C.borderStrong,
      radius: 9,
    })
    text(`Test loop / 0${index + 1} / Symbol`, symbol, x + 30, 3088, 30, 24, 18, 600, C.vueDark, step, {
      align: 'center',
      lineHeight: 1,
    })
    text(`Test loop / 0${index + 1} / Label`, label, x, 3139, 90, 18, 9.5, 600, C.inkSoft, step, {
      align: 'center',
      lineHeight: 1,
    })
    if (index < 3) line(`Test loop / 0${index + 1} / Connector`, x + 90, 3100, 22, 1, C.vueDark, confidence)
  })
  const testPanel = codePanel(
    'Test panel / TaskBoard.spec.ts',
    839,
    2866,
    685,
    293,
    'TaskBoard.spec.ts',
    `it('adds a task and updates all derived state', async () => {
  await user.type(screen.getByPlaceholderText('Add a task'),
    'Review pull request')
  await user.click(screen.getByRole('button', { name: 'Add task' }))

  expect(screen.getByText('2 tasks')).toBeInTheDocument()
  expect(screen.getByText('50%')).toBeInTheDocument()
  expect(screen.getByText('Review pull request')).toBeInTheDocument()
})`,
    confidence,
    10,
  )
  dropShadow(testPanel, 12, 36, 0.06)
  const implementationButton = board(
    'Button / Explore implementation',
    726,
    3191,
    276,
    54,
    C.vueDark,
    confidence,
    C.vueDark,
    10,
  )
  dropShadow(implementationButton, 8, 22, 0.17, C.vueDark)
  text(
    'Button / Explore implementation / Label',
    'Explore the implementation',
    748,
    3211,
    215,
    18,
    14,
    700,
    C.white,
    implementationButton,
    { lineHeight: 1 },
  )
  sourceArrowRight('Button / Explore implementation / Arrow', 969, 3209, 18, implementationButton)

  const guide = board('07 Implementation guide', 0, 3277, 1728, 3867, C.white, canvas, C.border)
  sectionHeading(
    guide,
    'How to reason about a Vue feature.',
    'Vue keeps the DOM synchronized with reactive state. Components describe the interface,\ncomposables organize behavior, and adapters keep network details at the edge.',
    3455,
    { width: 920, height: 60, subtitleOffset: 77, subtitleSize: 16.8 },
  )
  const guideIndex = board('Implementation guide / Index', 1138, 3422, 386, 169, C.white, guide)
  line('Implementation guide / Index / Top rule', 1138, 3422, 386, 1, C.ink, guideIndex)
  ;[
    ['01', 'Mental model'],
    ['02', 'Vue toolkit'],
    ['03', 'Architecture'],
    ['04', 'Best practices'],
  ].forEach(([number, label], index) => {
    const y = 3436 + index * 39
    text(`Guide index / ${label} / Number`, number, 1138, y, 42, 18, 10.5, 500, C.vueDark, guideIndex, {
      family: 'mono',
      lineHeight: 1,
    })
    text(`Guide index / ${label}`, label, 1190, y, 250, 18, 12.5, 700, C.inkSoft, guideIndex, {
      lineHeight: 1,
    })
    line(`Guide index / ${label} / Rule`, 1138, y + 27, 386, 1, C.border, guideIndex)
  })

  function chapterHeading(number, title, subtitle, y) {
    line(`Chapter ${number} / Top rule`, 204, y, 1320, 1, C.ink, guide)
    text(`Chapter ${number} / Number`, number, 204, y + 30, 56, 20, 11, 500, C.vueDark, guide, {
      family: 'mono',
      lineHeight: 1,
    })
    text(`Chapter ${number} / Title`, title, 276, y + 26, 860, 58, 48, 700, C.ink, guide, {
      lineHeight: 1.08,
      letterSpacing: -2,
    })
    text(`Chapter ${number} / Supporting copy`, subtitle, 276, y + 90, 740, 44, 15.5, 400, C.muted, guide, {
      lineHeight: 1.7,
    })
  }

  chapterHeading(
    '01',
    'Start with one-way data flow.',
    'Events move toward state. Derived state flows back into every view.',
    3735,
  )
  const architectureItems = [
    ['View', 'TaskBoard.vue', '@add="taskState.add"'],
    ['Feature state', 'useTasks()', 'ref · computed · actions'],
    ['Port', 'TaskRepository', 'list · create · toggle'],
    ['Adapter', 'REST + MSW', "fetch('/api/tasks')"],
  ]
  architectureItems.forEach(([eyebrow, title, code], index) => {
    const x = 204 + index * 340
    const item = panel(`Mental model / ${title}`, x, 3910, 280, 152, guide, {
      fill: index === 1 ? C.mintSoft : C.white,
      stroke: index === 1 ? C.vueDark : C.borderStrong,
      radius: 10,
    })
    if (index === 1) dropShadow(item, 12, 36, 0.06)
    text(`Mental model / ${title} / Eyebrow`, eyebrow.toUpperCase(), x + 20, 3938, 240, 16, 10, 500, C.vueDark, item, {
      family: 'mono',
      lineHeight: 1,
      letterSpacing: 1,
    })
    text(`Mental model / ${title} / Title`, title, x + 20, 3970, 240, 24, 16, 700, C.ink, item)
    text(`Mental model / ${title} / Code`, code, x + 20, 4010, 240, 28, 11, 500, C.muted, item, {
      family: 'mono',
      lineHeight: 1.4,
    })
    if (index < 3) sourceJourneyArrow(`Mental model / ${title} / Arrow`, x + 292, 3978, 32, guide)
  })
  const principles = [
    ['Intent moves right', 'User event → action → side effect'],
    ['State moves left', 'Response → reactive state → rendered DOM'],
    ['The payoff', 'Each layer has one reason to change'],
  ]
  principles.forEach(([title, copy], index) => {
    const x = 204 + index * 440
    const item = board(`Mental model / Principle / ${title}`, x, 4096, 440, 80, C.white, guide)
    line(`Mental model / Principle / ${title} / Top`, x, 4096, 440, 1, C.border, item)
    line(`Mental model / Principle / ${title} / Bottom`, x, 4175, 440, 1, C.border, item)
    if (index) line(`Mental model / Principle / ${title} / Side`, x, 4096, 1, 80, C.border, item)
    text(`Mental model / Principle / ${title}`, title, x + 22, 4115, 390, 18, 12.5, 700, C.vueDark, item)
    text(`Mental model / Principle / ${title} / Copy`, copy, x + 22, 4142, 390, 18, 11.5, 400, C.muted, item)
  })

  chapterHeading(
    '02',
    'Vue concepts used here.',
    'Each primitive has a narrow job. Together they remove manual DOM coordination.',
    4322,
  )
  const concepts = [
    ['<script setup>', 'Component authoring', 'Strong TypeScript inference directly in the template.'],
    ['ref()', 'Mutable source state', 'Holds tasks, loading, errors, filters, activity, and request trace.'],
    ['computed()', 'Derived state', 'Calculates counts, progress, filters, and “next up” automatically.'],
    ['useTasks()', 'Composition API', 'Groups feature state and actions by capability.'],
    ['props + emits', 'Component contracts', 'Data travels down; user intent travels up.'],
    ['onMounted()', 'Lifecycle boundary', 'Starts initial load while the composable owns async work.'],
  ]
  concepts.forEach(([code, label, copy], index) => {
    const column = index % 2
    const row = Math.floor(index / 2)
    const x = 204 + column * 700
    const y = 4498 + row * 92
    const item = board(`Vue toolkit / ${code}`, x, y, 620, 82, C.white, guide)
    line(`Vue toolkit / ${code} / Rule`, x, y, 620, 1, C.border, item)
    text(`Vue toolkit / ${code} / Code`, code, x, y + 20, 170, 20, 12.5, 500, C.vueDark, item, {
      family: 'mono',
    })
    text(`Vue toolkit / ${code} / Label`, label.toUpperCase(), x, y + 48, 170, 16, 10, 700, C.muted, item, {
      letterSpacing: 0.8,
    })
    text(`Vue toolkit / ${code} / Copy`, copy, x + 205, y + 18, 400, 48, 12, 400, C.inkSoft, item, {
      lineHeight: 1.55,
    })
  })
  const reasoning = board('Vue toolkit / Code reasoning', 204, 4818, 1320, 459, C.mintBand, guide)
  const reasoningCodePanel = codePanel(
    'Vue toolkit / useTasks.ts',
    268,
    4882,
    685,
    331,
    'useTasks.ts',
    `const tasks = ref<Task[]>([])

const counts = computed(() => ({
  all: tasks.value.length,
  open: tasks.value.filter(task => !task.completed).length,
  done: tasks.value.filter(task => task.completed).length,
}))

async function add(title: string) {
  const created = await repository.create(title)
  tasks.value.unshift(created)
}`,
    reasoning,
    11.5,
  )
  dropShadow(reasoningCodePanel, 12, 36, 0.06)
  text('Vue toolkit / Read it / Title', 'Read it as a sentence', 1049, 4908, 350, 28, 17, 800, C.ink, reasoning)
  const sentenceSteps = [
    '1. State: tasks are the source of truth.',
    '2. Derivation: counts recalculate when tasks change.',
    '3. Action: the repository performs the effect.',
    '4. Render: consuming components update automatically.',
  ]
  sentenceSteps.forEach((label, index) => {
    text(`Vue toolkit / Read it / ${index + 1}`, label, 1049, 4958 + index * 56, 390, 40, 12.5, 400, C.muted, reasoning, {
      lineHeight: 1.6,
    })
  })

  chapterHeading(
    '03',
    'Architecture boundaries.',
    'Keep the feature core stable; make external details replaceable.',
    5421,
  )
  const fileMap = panel('Architecture / Feature map', 204, 5596, 536, 383, guide, {
    fill: C.mintSoft,
    stroke: C.borderStrong,
    radius: 10,
  })
  text('Architecture / Feature map / Title', 'Feature map', 230, 5624, 250, 24, 16, 800, C.ink, fileMap)
  const files = [
    ['domain/task.ts', 'Data shape'],
    ['components/', 'Rendered views'],
    ['composables/useTasks.ts', 'Feature state + use cases'],
    ['data/TaskRepository.ts', 'Dependency contract'],
    ['data/HttpTaskRepository.ts', 'REST adapter'],
    ['mocks/handlers.ts', 'Mock HTTP server'],
    ['testing/FakeTaskRepository.ts', 'Fast unit-test fake'],
  ]
  files.forEach(([path, label], index) => {
    const y = 5668 + index * 42
    line(`Feature map / ${path} / Rule`, 230, y, 484, 1, '#D6EAE0', fileMap)
    text(`Feature map / ${path}`, path, 230, y + 14, 280, 18, 11, 500, C.vueDark, fileMap, {
      family: 'mono',
      lineHeight: 1,
    })
    text(`Feature map / ${path} / Label`, label, 528, y + 14, 186, 18, 10.5, 400, C.muted, fileMap, {
      align: 'right',
      lineHeight: 1,
    })
  })
  const decisions = [
    ['Why a repository?', 'The UI depends on a small interface, not on fetch. REST can be replaced without changing components.'],
    ['Why REST + MSW?', 'The browser makes real HTTP requests while MSW supplies production-like mock responses.'],
    ['Why a fake in unit tests?', 'The same contract is implemented in memory, keeping feature tests fast and deterministic.'],
  ]
  decisions.forEach(([title, copy], index) => {
    const x = 868
    const y = 5596 + index * 128
    const item = board(`Architecture / ${title}`, x, y, 656, 118, C.white, guide)
    line(`Architecture / ${title} / Rule`, x, y, 656, 1, C.border, item)
    text(`Architecture / ${title} / Title`, title, x, y + 22, 612, 24, 16, 800, C.ink, item)
    text(`Architecture / ${title} / Copy`, copy, x, y + 56, 612, 56, 13, 400, C.muted, item, {
      lineHeight: 1.65,
    })
  })
  const table = board('Architecture / Decision table', 204, 6035, 1320, 254, C.white, guide)
  const columns = [204, 404, 664, 1034, 1524]
  ;['Question', 'Choice here', 'Reason', 'Revisit when…'].forEach((label, index) => {
    text(`Decision table / Header / ${label}`, label, columns[index] + 14, 6049, columns[index + 1] - columns[index] - 28, 20, 10, 700, C.muted, table, {
      letterSpacing: 0.8,
    })
  })
  line('Decision table / Header rule', 204, 6080, 1320, 1, C.ink, table)
  const rows = [
    ['Global store?', 'Composable', 'One feature owns the state.', 'Unrelated routes need shared state.'],
    ['GraphQL?', 'REST', 'The resource and operations are small.', 'Clients need deeply related data.'],
    ['Persistence?', 'Reset on reload', 'This is an isolated teaching demo.', 'Tasks become user-owned data.'],
    ['Mock level?', 'MSW at HTTP', 'Exercises the real repository adapter.', 'A live backend becomes available.'],
  ]
  rows.forEach((row, rowIndex) => {
    const y = 6090 + rowIndex * 49
    row.forEach((value, columnIndex) => {
      text(
        `Decision table / ${row[0]} / ${columnIndex}`,
        value,
        columns[columnIndex] + 14,
        y,
        columns[columnIndex + 1] - columns[columnIndex] - 28,
        38,
        11.5,
        columnIndex === 0 || columnIndex === 1 ? 700 : 400,
        columnIndex === 1 ? C.vueDark : columnIndex === 0 ? C.ink : C.muted,
        table,
        { lineHeight: 1.55 },
      )
    })
    line(`Decision table / ${row[0]} / Rule`, 204, y + 44, 1320, 1, C.border, table)
  })

  chapterHeading(
    '04',
    'Rules worth carrying forward.',
    'Practical defaults for features that remain understandable as they grow.',
    6433,
  )
  const practices = [
    ['Keep one source of truth.', 'Derive counts and progress with computed(); never synchronize copies by hand.'],
    ['Organize by feature behavior.', 'Put related state and actions in a composable; keep components presentational.'],
    ['Inject effects at the edge.', 'Network, storage, and time enter through contracts that tests can replace.'],
    ['Prefer explicit component APIs.', 'Use typed props and emits so ownership and event direction remain obvious.'],
    ['Test behavior at useful seams.', 'Test composables with fakes, components through actions, and HTTP through MSW.'],
    ['Add tools when complexity earns them.', 'Pinia, Router, GraphQL, and persistence solve scaling problems—not starter needs.'],
  ]
  practices.forEach(([title, copy], index) => {
    const column = index % 2
    const row = Math.floor(index / 2)
    const x = 204 + column * 700
    const y = 6608 + row * 100
    const item = board(`Best practice / 0${index + 1} / ${title}`, x, y, 620, 90, C.white, guide)
    line(`Best practice / 0${index + 1} / Rule`, x, y, 620, 1, C.border, item)
    text(`Best practice / 0${index + 1} / Number`, `0${index + 1}`, x, y + 22, 44, 18, 10, 500, C.vueDark, item, {
      family: 'mono',
      lineHeight: 1,
    })
    text(`Best practice / 0${index + 1} / Title`, title, x + 58, y + 18, 540, 20, 14, 800, C.ink, item)
    text(`Best practice / 0${index + 1} / Copy`, copy, x + 58, y + 46, 540, 34, 11.5, 400, C.muted, item, {
      lineHeight: 1.55,
    })
  })
  const summary = board('Implementation guide / Summary', 204, 6971, 1320, 77, C.ink, guide)
  text('Implementation guide / Summary / Title', 'The Vue mental model', 236, 6998, 200, 20, 13, 700, C.vue, summary)
  text(
    'Implementation guide / Summary / Copy',
    'Template = UI description · reactive state = truth · computed = derivation · composable = feature behavior · adapter = side effect',
    470,
    6986,
    730,
    48,
    11.5,
    400,
    '#CBD5E5',
    summary,
    { lineHeight: 1.55 },
  )
  text(
    'Implementation guide / Summary / Link',
    'Return to the live demo  ↑',
    1240,
    6998,
    250,
    20,
    12,
    700,
    C.white,
    summary,
    { align: 'right', lineHeight: 1 },
  )

  const footer = board('08 Footer', 0, 7144, 1728, 80, C.white, canvas)
  sourceBrand('Footer / Vue mark', 588, 7170, 26, footer)
  text(
    'Footer / Technology line',
    'Vue in Motion · Built with Vue 3, TypeScript, Vitest, MSW, and Bun',
    630,
    7175,
    520,
    20,
    10.8,
    400,
    C.muted,
    footer,
    { align: 'center', lineHeight: 1 },
  )

  const system = board('Design system / Vue in Motion', 1848, 0, 1400, 1900, C.surface, root)
  text('Design system / Title', 'Vue in Motion — Design system', 1920, 72, 900, 60, 44, 800, C.ink, system, {
    lineHeight: 1,
    letterSpacing: -1.8,
  })
  text(
    'Design system / Intro',
    'Extracted from the live Vue website · 8 px spacing rhythm · Manrope + DM Mono',
    1920,
    142,
    900,
    32,
    15,
    400,
    C.muted,
    system,
  )
  text('Design system / Colors / Heading', 'Color roles', 1920, 230, 600, 36, 28, 800, C.ink, system)
  const swatches = [
    ['Vue 500', C.vue],
    ['Vue 700', C.vueDark],
    ['Ink', C.ink],
    ['Ink soft', C.inkSoft],
    ['Muted', C.muted],
    ['Cobalt', C.cobalt],
    ['Mint band', C.mintBand],
    ['Border', C.border],
  ]
  swatches.forEach(([label, color], index) => {
    const x = 1920 + (index % 4) * 290
    const y = 290 + Math.floor(index / 4) * 150
    const card = panel(`Color / ${label}`, x, y, 250, 118, system, {
      fill: C.white,
      stroke: C.border,
      radius: 10,
    })
    rect(`Color / ${label} / Swatch`, x + 16, y + 16, 58, 58, color, card, color, 8)
    text(`Color / ${label} / Name`, label, x + 90, y + 22, 140, 20, 13, 700, C.ink, card)
    text(`Color / ${label} / Value`, color, x + 90, y + 50, 140, 18, 11, 500, C.muted, card, {
      family: 'mono',
    })
  })
  text('Design system / Type / Heading', 'Typography', 1920, 610, 600, 36, 28, 800, C.ink, system)
  text('Type style / Display', 'Display / 72 / 800', 1920, 675, 1100, 86, 72, 800, C.ink, system, {
    lineHeight: 1,
    letterSpacing: -5.4,
  })
  text('Type style / Heading 1', 'Heading 1 / 50 / 800', 1920, 790, 900, 66, 50, 800, C.ink, system, {
    lineHeight: 1.04,
    letterSpacing: -2.5,
  })
  text('Type style / Heading 2', 'Heading 2 / 28 / 800', 1920, 890, 900, 42, 28, 800, C.ink, system)
  text(
    'Type style / Body',
    'Body / 16 / 400 — Clear supporting copy for product explanation and teaching content.',
    1920,
    970,
    900,
    48,
    16,
    400,
    C.muted,
    system,
    { lineHeight: 1.7 },
  )
  text(
    'Type style / Mono',
    "const progress = computed(() => done / total)",
    1920,
    1045,
    900,
    32,
    14,
    500,
    C.vueDark,
    system,
    { family: 'mono', lineHeight: 1.5 },
  )
  text('Design system / Components / Heading', 'Core components', 1920, 1140, 600, 36, 28, 800, C.ink, system)
  const dsPrimary = board('Component specimen / Primary button', 1920, 1205, 220, 54, C.vueDark, system, C.vueDark, 10)
  text('Component specimen / Primary button / Label', 'Primary action', 1944, 1225, 150, 18, 14, 700, C.white, dsPrimary, {
    lineHeight: 1,
  })
  sourceArrowRight('Component specimen / Primary button / Arrow', 2104, 1223, 18, dsPrimary)
  const dsSecondary = board('Component specimen / Secondary button', 2170, 1205, 220, 54, C.white, system, C.borderStrong, 10)
  text('Component specimen / Secondary button / Label', 'Secondary action', 2194, 1225, 172, 18, 14, 700, C.inkSoft, dsSecondary, {
    align: 'center',
    lineHeight: 1,
  })
  pill('Component specimen / Filter active', 'All  (2)', 2420, 1217, 86, system, {
    stroke: C.vue,
    color: C.vueDark,
    height: 34,
  })
  pill('Component specimen / Status open', 'Open', 2540, 1217, 72, system, {
    fill: C.blueSoft,
    stroke: C.blueBorder,
    color: C.cobalt,
    height: 34,
    radius: 17,
  })
  pill('Component specimen / Status done', 'Done', 2640, 1217, 72, system, {
    fill: C.mintSoft,
    stroke: '#BEE8D5',
    color: C.vueDark,
    height: 34,
    radius: 17,
  })
  const dsCard = panel('Component specimen / Content card', 1920, 1320, 520, 260, system, {
    fill: C.white,
    stroke: C.borderStrong,
    radius: 12,
  })
  text('Component specimen / Content card / Eyebrow', 'REACTIVE STATE', 1950, 1352, 300, 18, 10, 500, C.vueDark, dsCard, {
    family: 'mono',
    letterSpacing: 1,
  })
  text('Component specimen / Content card / Title', 'One source of truth', 1950, 1390, 420, 36, 24, 800, C.ink, dsCard)
  text(
    'Component specimen / Content card / Copy',
    'Derived values update every projection without manual DOM coordination.',
    1950,
    1440,
    420,
    54,
    14,
    400,
    C.muted,
    dsCard,
    { lineHeight: 1.65 },
  )
  const dsCode = codePanel(
    'Component specimen / Code panel',
    2480,
    1320,
    600,
    260,
    'useTasks.ts',
    `const counts = computed(() => ({
  all: tasks.value.length,
  open: tasks.value.filter(task => !task.completed).length,
}))`,
    system,
    12,
  )
  dsCode.name = 'Component specimen / Code panel'
  text('Design system / Spacing / Heading', 'Spacing and radius', 1920, 1660, 600, 36, 28, 800, C.ink, system)
  ;[
    ['8', 8],
    ['16', 16],
    ['24', 24],
    ['32', 32],
    ['48', 48],
    ['64', 64],
  ].forEach(([label, value], index) => {
    const x = 1920 + index * 170
    rect(`Spacing / ${label}`, x, 1730, value, 48, C.vue, system, C.vueDark, 4)
    text(`Spacing / ${label} / Label`, `${label}px`, x, 1790, 110, 18, 11, 500, C.muted, system, {
      family: 'mono',
    })
  })

  storage.vueDesignLibraryWarning = null
  try {
    const local = penpot.library.local
    const colors = [
      ['Brand / Vue 500', C.vue],
      ['Brand / Vue 700', C.vueDark],
      ['Content / Ink', C.ink],
      ['Content / Ink soft', C.inkSoft],
      ['Content / Muted', C.muted],
      ['Interactive / Cobalt', C.cobalt],
      ['Surface / Mint band', C.mintBand],
      ['Surface / Border', C.border],
    ]
    for (const [fullName, color] of colors) {
      const parts = fullName.split(' / ')
      const name = parts.pop()
      const path = parts.join(' / ')
      let asset = local.colors.find((item) => item.name === name && item.path === path)
      if (!asset) {
        asset = local.createColor()
        asset.name = name
        asset.path = path
      }
      asset.color = color
    }

    const typeStyles = [
      ['Display', sans, '800', '72', '0.98', '-5.4'],
      ['Heading / Section', sans, '800', '52.8', '1.04', '-3.168'],
      ['Heading / Card', sans, '800', '17', '1.25', '-0.3'],
      ['Body / Default', sans, '400', '16', '1.7', '0'],
      ['Label / Strong', sans, '700', '13', '1', '0'],
      ['Code / Default', mono, '500', '12', '1.65', '0'],
    ]
    for (const [fullName, font, weight, size, lineHeight] of typeStyles) {
      const parts = fullName.split(' / ')
      const name = parts.pop()
      const path = parts.join(' / ')
      let style = local.typographies.find((item) => item.name === name && item.path === path)
      if (!style) {
        style = local.createTypography()
        style.name = name
        style.path = path
      }
      const variant = font?.variants?.find(
        (item) => item.fontWeight === weight && (item.fontStyle ?? 'normal') === 'normal',
      )
      if (font && variant) {
        style.fontId = font.fontId
        style.fontFamily = font.fontFamily
        style.fontVariantId = variant.fontVariantId
        style.fontWeight = variant.fontWeight
        style.fontStyle = variant.fontStyle
      }
      style.fontSize = size
      style.lineHeight = lineHeight
    }

    const catalog = local.tokens
    let tokenSet = catalog.sets.find((item) => item.name === 'core')
    if (!tokenSet) tokenSet = catalog.addSet({ name: 'core' })
    if (!tokenSet.active) tokenSet.toggleActive()
    const tokenValues = [
      ['color', 'color.base.white', C.white],
      ['color', 'color.brand.vue', C.vue],
      ['color', 'color.brand.vueDark', C.vueDark],
      ['color', 'color.content.ink', C.ink],
      ['color', 'color.content.inkSoft', C.inkSoft],
      ['color', 'color.content.muted', C.muted],
      ['color', 'color.interactive.cobalt', C.cobalt],
      ['color', 'color.surface.default', C.surface],
      ['color', 'color.surface.mintSoft', C.mintSoft],
      ['color', 'color.surface.mintBand', C.mintBand],
      ['color', 'color.border.default', C.border],
      ['color', 'color.border.strong', C.borderStrong],
      ['color', 'color.status.openSurface', C.blueSoft],
      ['color', 'color.status.openBorder', C.blueBorder],
      ['spacing', 'space.0_5', '4'],
      ['spacing', 'space.1', '8'],
      ['spacing', 'space.1_5', '12'],
      ['spacing', 'space.2', '16'],
      ['spacing', 'space.2_5', '20'],
      ['spacing', 'space.3', '24'],
      ['spacing', 'space.4', '32'],
      ['spacing', 'space.5', '40'],
      ['spacing', 'space.6', '48'],
      ['spacing', 'space.8', '64'],
      ['spacing', 'space.10', '80'],
      ['spacing', 'space.12', '96'],
      ['spacing', 'space.13', '104'],
      ['spacing', 'space.16', '128'],
      ['spacing', 'space.18', '144'],
      ['borderRadius', 'radius.xs', '4'],
      ['borderRadius', 'radius.sm', '6.4'],
      ['borderRadius', 'radius.md', '9.6'],
      ['borderRadius', 'radius.lg', '12.8'],
      ['borderRadius', 'radius.pill', '999'],
      ['fontFamilies', 'font.family.sans', 'Manrope'],
      ['fontFamilies', 'font.family.mono', 'DM Mono'],
      ['fontSizes', 'font.size.caption', '9'],
      ['fontSizes', 'font.size.meta', '10'],
      ['fontSizes', 'font.size.code', '11'],
      ['fontSizes', 'font.size.label', '12'],
      ['fontSizes', 'font.size.control', '13'],
      ['fontSizes', 'font.size.bodySmall', '14'],
      ['fontSizes', 'font.size.body', '16'],
      ['fontSizes', 'font.size.lead', '18.56'],
      ['fontSizes', 'font.size.chapter', '48'],
      ['fontSizes', 'font.size.section', '52.8'],
      ['fontSizes', 'font.size.display', '72'],
      ['fontWeights', 'font.weight.regular', '400'],
      ['fontWeights', 'font.weight.medium', '500'],
      ['fontWeights', 'font.weight.semibold', '600'],
      ['fontWeights', 'font.weight.bold', '700'],
      ['fontWeights', 'font.weight.extraBold', '800'],
      ['borderWidth', 'border.width.default', '1'],
      ['borderWidth', 'border.width.emphasis', '1.5'],
    ]
    for (const [type, name, value] of tokenValues) {
      if (!tokenSet.tokens.some((item) => item.name === name)) {
        tokenSet.addToken({ type, name, value })
      }
    }
  } catch (error) {
    storage.vueDesignLibraryWarning = String(error)
  }

  storage.vueWebsiteBoard = canvas
  storage.vueDesignSystemBoard = system
  penpot.selection = [canvas]

  return {
    website: {
      id: canvas.id,
      name: canvas.name,
      width: canvas.width,
      height: canvas.height,
      sections: canvas.children.length,
    },
    designSystem: {
      id: system.id,
      name: system.name,
      width: system.width,
      height: system.height,
    },
    library: {
      colors: penpot.library.local.colors.length,
      typographies: penpot.library.local.typographies.length,
      tokenSets: penpot.library.local.tokens.sets.length,
      warning: storage.vueDesignLibraryWarning ?? null,
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
    clientInfo: { name: 'vue-penpot-sync', version: '1.0.0' },
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
        code: `return (${buildVueDesign.toString()})();`,
      },
    },
  },
  sessionId,
)

const content = result.payload?.result?.content?.find((item) => item.type === 'text')?.text
if (!content) {
  throw new Error(JSON.stringify(result.payload))
}

const execution = JSON.parse(content)
if (execution.error) throw new Error(execution.error)

console.log(JSON.stringify(execution.result, null, 2))
