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

async function seedResponsiveDesign() {
  const root = penpot.root
  const local = penpot.library.local
  if (!root) throw new Error('The active Penpot page has no root')

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

  function add(parent, shape) {
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
    return add(parent, shape)
  }

  function panel(name, x, y, width, height, parent, options = {}) {
    const shape = board(
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
    if (options.shadow) {
      shape.shadows = [
        {
          style: 'drop-shadow',
          offsetX: 0,
          offsetY: options.shadow.offsetY ?? 12,
          blur: options.shadow.blur ?? 36,
          spread: 0,
          hidden: false,
          color: { color: '#0D1F37', opacity: options.shadow.opacity ?? 0.06 },
        },
      ]
    }
    return shape
  }

  function centeredLabel(name, label, x, y, width, height, parent, options = {}) {
    return text(
      name,
      label,
      x,
      y,
      width,
      height,
      options.size ?? 12,
      options.weight ?? 700,
      options.color ?? C.inkSoft,
      parent,
      { align: 'center', verticalAlign: 'center', lineHeight: 1 },
    )
  }

  function button(name, label, x, y, width, parent, options = {}) {
    const height = options.height ?? 48
    const shape = board(
      name,
      x,
      y,
      width,
      height,
      options.primary ? C.vueDark : C.white,
      parent,
      options.primary ? C.vueDark : C.borderStrong,
      9,
    )
    centeredLabel(`${name} / Label`, label, x, y, width, height, shape, {
      size: options.size ?? 13,
      color: options.primary ? C.white : C.ink,
    })
    return shape
  }

  function pill(name, label, x, y, width, parent, options = {}) {
    const height = options.height ?? 30
    const shape = board(
      name,
      x,
      y,
      width,
      height,
      options.fill ?? C.white,
      parent,
      options.active ? C.vue : C.border,
      options.radius ?? 7,
    )
    centeredLabel(`${name} / Label`, label, x, y, width, height, shape, {
      size: options.size ?? 10,
      color: options.active ? C.vueDark : C.inkSoft,
    })
    return shape
  }

  function sectionHeading(parent, title, subtitle, x, y, width, size) {
    const charactersPerLine = Math.max(8, Math.floor(width / (size * 0.55)))
    const lineCount = Math.max(1, Math.ceil(title.length / charactersPerLine))
    const headingHeight = Math.max(size * 1.25, lineCount * size * 1.08)
    text(`${title} / Heading`, title, x, y, width, headingHeight, size, 800, C.ink, parent, {
      lineHeight: 1.05,
    })
    text(
      `${title} / Supporting copy`,
      subtitle,
      x,
      y + headingHeight + 12,
      width,
      52,
      Math.max(12, size * 0.3),
      400,
      C.muted,
      parent,
      { lineHeight: 1.55 },
    )
  }

  function addBrand(parent, x, y, compact = false) {
    const desktop = [...root.children].find(
      (shape) => shape.name === 'Approved / Website / Vue in Motion / Desktop 1728',
    )
    const visit = (shape) => {
      if (shape.name === 'Brand / Vue mark') return shape
      for (const child of shape.children ?? []) {
        const match = visit(child)
        if (match) return match
      }
      return null
    }
    const source = desktop ? visit(desktop) : null
    if (source) {
      const mark = source.clone()
      mark.name = 'Brand / Vue mark'
      mark.x = x
      mark.y = y
      mark.resize(compact ? 24 : 30, compact ? 21 : 26)
      parent.appendChild(mark)
    }
    text(
      'Brand / Name',
      'Vue in Motion',
      x + (compact ? 34 : 42),
      y + 2,
      compact ? 130 : 170,
      compact ? 22 : 26,
      compact ? 13 : 15,
      800,
      C.ink,
      parent,
      { verticalAlign: 'center', lineHeight: 1 },
    )
  }

  function taskBoard(parent, x, y, width, options = {}) {
    const stacked = options.stacked ?? false
    const height = stacked ? 520 : 340
    const task = panel('Responsive / Workspace / Task board', x, y, width, height, parent, {
      shadow: { offsetY: 18, blur: 50, opacity: 0.08 },
    })
    const innerX = x + 22
    const innerWidth = width - 44
    text('Task board / Title', 'My tasks', innerX, y + 24, innerWidth, 28, 16, 800, C.ink, task, {
      verticalAlign: 'center',
      lineHeight: 1,
    })
    if (stacked) {
      const input = board(
        'Responsive / Task form / Input',
        innerX,
        y + 68,
        innerWidth,
        46,
        C.white,
        task,
        C.borderStrong,
        7,
      )
      text(
        'Responsive / Task form / Placeholder',
        'Add a task',
        innerX + 14,
        y + 68,
        innerWidth - 28,
        46,
        12,
        600,
        C.muted,
        input,
        { verticalAlign: 'center', lineHeight: 1 },
      )
      button('Responsive / Task form / Submit', 'Add task', innerX, y + 126, innerWidth, task, {
        primary: true,
        height: 46,
      })
    } else {
      const buttonWidth = 104
      const input = board(
        'Responsive / Task form / Input',
        innerX,
        y + 68,
        innerWidth - buttonWidth - 12,
        46,
        C.white,
        task,
        C.borderStrong,
        7,
      )
      text(
        'Responsive / Task form / Placeholder',
        'Add a task',
        innerX + 14,
        y + 68,
        innerWidth - buttonWidth - 40,
        46,
        12,
        600,
        C.muted,
        input,
        { verticalAlign: 'center', lineHeight: 1 },
      )
      button(
        'Responsive / Task form / Submit',
        'Add task',
        x + width - buttonWidth - 22,
        y + 68,
        buttonWidth,
        task,
        { primary: true, height: 46 },
      )
    }
    const filterY = y + (stacked ? 190 : 130)
    const filters = board(
      'Responsive / Filter row',
      innerX,
      filterY,
      innerWidth,
      36,
      null,
      task,
    )
    filters.clipContent = stacked
    pill('Responsive / Filter / All', 'All (2)', innerX, filterY, 66, filters, {
      active: true,
    })
    pill('Responsive / Filter / Open', 'Open (1)', innerX + 74, filterY, 78, filters)
    pill('Responsive / Filter / Done', 'Done (1)', innerX + 160, filterY, 78, filters)
    const listY = filterY + 48
    const listHeight = stacked ? 180 : 128
    const list = board(
      'Responsive / Task list',
      innerX,
      listY,
      innerWidth,
      listHeight,
      C.white,
      task,
      C.border,
      7,
    )
    line('Responsive / Task list / Divider', innerX, listY + 62, innerWidth, 1, C.border, list)
    ;[
      ['Write tests for task repo', 'Open', listY + 16, false],
      ['Ship add task flow', 'Done', listY + 78, true],
    ].forEach(([title, status, rowY, done]) => {
      rect(
        `Responsive / Task / ${status} / Checkbox`,
        innerX + 14,
        rowY,
        18,
        18,
        done ? C.vueDark : C.white,
        list,
        done ? C.vueDark : '#AAB6C8',
        4,
      )
      text(
        `Responsive / Task / ${status} / Title`,
        title,
        innerX + 44,
        rowY - 1,
        innerWidth - 134,
        20,
        stacked ? 10 : 11,
        650,
        done ? C.muted : C.ink,
        list,
        { verticalAlign: 'center', lineHeight: 1 },
      )
      pill(
        `Responsive / Status / ${status}`,
        status,
        innerX + innerWidth - 66,
        rowY - 3,
        52,
        list,
        {
          height: 24,
          radius: 999,
          fill: done ? C.mintSoft : C.blueSoft,
          size: 9,
        },
      )
    })
    text(
      'Responsive / Task summary',
      '2 tasks · 1 open · 1 done',
      innerX,
      y + height - 40,
      innerWidth,
      20,
      10,
      500,
      C.muted,
      task,
      { verticalAlign: 'center', lineHeight: 1 },
    )
    return task
  }

  function codePanel(parent, x, y, width, height, compact = false) {
    const item = panel('Responsive / Code panel', x, y, width, height, parent)
    line('Responsive / Code panel / Header divider', x, y + 44, width, 1, C.borderStrong, item)
    text(
      'Responsive / Code panel / Filename',
      'Computed in useTasks',
      x + 16,
      y,
      width - 32,
      44,
      compact ? 9 : 11,
      700,
      C.vueDark,
      item,
      { verticalAlign: 'center', lineHeight: 1 },
    )
    text(
      'Responsive / Code panel / Code',
      `const total = computed(() => tasks.value.length)
const open = computed(() => tasks.value.filter(task => !task.completed))
const progress = computed(() => Math.round(done / total * 100))`,
      x + 16,
      y + 62,
      width - 32,
      height - 78,
      compact ? 8 : 10,
      500,
      C.inkSoft,
      item,
      { family: 'mono', lineHeight: 1.65 },
    )
    return item
  }

  function metricCard(parent, title, value, detail, x, y, width) {
    const item = panel(`Responsive / Metric / ${title}`, x, y, width, 128, parent, {
      fill: C.mintSoft,
      stroke: C.border,
      radius: 9,
    })
    text(`${title} / Label`, title, x + 16, y + 16, width - 32, 22, 11, 700, C.ink, item)
    text(`${title} / Value`, value, x + 16, y + 44, width - 32, 42, 28, 800, C.ink, item)
    text(`${title} / Detail`, detail, x + 16, y + 92, width - 32, 20, 9, 500, C.muted, item)
  }

  function projectionCard(parent, title, x, y, width, height, accent = false) {
    const item = panel(`Responsive / Projection / ${title}`, x, y, width, height, parent, {
      stroke: accent ? C.vue : C.borderStrong,
    })
    text(`${title} / Heading`, title, x + 16, y + 16, width - 32, 24, 13, 800, C.ink, item)
    if (title === 'Progress') {
      text('Progress / Value', '50%', x + 16, y + 64, width - 32, 54, 34, 800, C.ink, item, {
        align: 'center',
        verticalAlign: 'center',
        lineHeight: 1,
      })
      text(
        'Progress / Caption',
        '1 of 2 done',
        x + 16,
        y + 120,
        width - 32,
        20,
        9,
        500,
        C.muted,
        item,
        { align: 'center' },
      )
    } else if (title === 'Recent activity') {
      ;['Tasks loaded', 'Task completed', 'Task added'].forEach((label, index) => {
        rect(
          `Recent activity / Dot ${index + 1}`,
          x + 18,
          y + 62 + index * 48,
          8,
          8,
          index === 0 ? C.cobalt : C.vueDark,
          item,
          C.white,
          999,
        )
        text(
          `Recent activity / ${label}`,
          label,
          x + 38,
          y + 55 + index * 48,
          width - 54,
          22,
          10,
          700,
          C.vueDark,
          item,
        )
      })
    } else {
      pill(`${title} / Filter / All`, 'All (2)', x + 16, y + 52, 58, item, {
        active: true,
        height: 25,
        size: 8,
      })
      pill(`${title} / Filter / Open`, 'Open (1)', x + 80, y + 52, 66, item, {
        height: 25,
        size: 8,
      })
      pill(`${title} / Filter / Done`, 'Done (1)', x + 152, y + 52, 66, item, {
        height: 25,
        size: 8,
      })
      text(
        `${title} / Row one`,
        '□   Write tests for task repo                         Open',
        x + 16,
        y + 96,
        width - 32,
        28,
        9,
        600,
        C.ink,
        item,
      )
      text(
        `${title} / Row two`,
        '✓   Ship add task flow                                  Done',
        x + 16,
        y + 134,
        width - 32,
        28,
        9,
        600,
        C.muted,
        item,
      )
    }
    return item
  }

  function journeyStep(parent, index, title, detail, x, y, width) {
    const item = panel(`Responsive / Journey / ${index}`, x, y, width, 118, parent, {
      stroke: C.border,
    })
    pill(`Responsive / Journey / ${index} / Index`, String(index), x + 14, y + 14, 28, item, {
      height: 24,
      size: 9,
    })
    text(
      `Responsive / Journey / ${index} / Title`,
      title,
      x + 54,
      y + 14,
      width - 68,
      24,
      11,
      800,
      C.ink,
      item,
    )
    text(
      `Responsive / Journey / ${index} / Detail`,
      detail,
      x + 54,
      y + 48,
      width - 68,
      48,
      9,
      500,
      C.muted,
      item,
      { lineHeight: 1.45 },
    )
  }

  function buildTablet(page) {
    const x = page.x
    const y = page.y
    const gutter = 48
    const content = page.width - gutter * 2
    const header = board('Tablet / Header', x, y, page.width, 80, C.white, page)
    addBrand(header, x + gutter, y + 27)
    ;['Workspace', 'Reactivity', 'Composition', 'Data flow'].forEach((label, index) => {
      text(
        `Tablet / Navigation / ${label}`,
        label,
        x + page.width - gutter - 370 + index * 92,
        y + 29,
        82,
        22,
        11,
        700,
        C.ink,
        header,
        { align: 'center', verticalAlign: 'center', lineHeight: 1 },
      )
    })

    sectionHeading(
      page,
      'Build one feature. Watch Vue connect the rest.',
      'At tablet width the hero becomes one column while navigation remains available.',
      x + gutter,
      y + 132,
      content,
      54,
    )
    button('Tablet / Primary action', 'Add your first task', x + gutter, y + 330, 196, page, {
      primary: true,
      height: 52,
    })
    button('Tablet / Secondary action', 'Follow the data', x + gutter + 214, y + 330, 160, page, {
      height: 52,
    })
    taskBoard(page, x + gutter, y + 430, content, { stacked: false })
    line('Tablet / Hero divider', x, y + 830, page.width, 1, C.border, page)

    sectionHeading(
      page,
      'One action. Many reactions.',
      'Feature copy and implementation evidence stack into a single reading column.',
      x + gutter,
      y + 904,
      content,
      38,
    )
    codePanel(page, x + gutter, y + 1035, content, 260)
    const metricGap = 18
    const metricWidth = (content - metricGap) / 2
    metricCard(page, 'Total tasks', '2', 'Reactive total', x + gutter, y + 1330, metricWidth)
    metricCard(
      page,
      'Open tasks',
      '1',
      'Computed open',
      x + gutter + metricWidth + metricGap,
      y + 1330,
      metricWidth,
    )
    metricCard(page, 'Progress', '50%', '1 of 2 done', x + gutter, y + 1476, metricWidth)
    metricCard(
      page,
      'Next up',
      'Write tests',
      'First incomplete task',
      x + gutter + metricWidth + metricGap,
      y + 1476,
      metricWidth,
    )

    const compositionY = y + 1660
    rect(
      'Tablet / Composition background',
      x,
      compositionY,
      page.width,
      1260,
      C.mintBand,
      page,
    )
    sectionHeading(
      page,
      'One state. Many views.',
      'The state node sits above a two-column projection grid. Connectors are intentionally hidden.',
      x + gutter,
      compositionY + 72,
      content,
      38,
    )
    const state = panel(
      'Tablet / State backbone',
      x + page.width / 2 - 120,
      compositionY + 220,
      240,
      92,
      page,
      { stroke: C.vue },
    )
    centeredLabel(
      'Tablet / State backbone / Label',
      'useTasks()',
      state.x,
      state.y,
      state.width,
      48,
      state,
      { size: 15, color: C.ink },
    )
    centeredLabel(
      'Tablet / State backbone / Detail',
      'Single source of truth',
      state.x,
      state.y + 46,
      state.width,
      30,
      state,
      { size: 9, weight: 500, color: C.muted },
    )
    const projectionGap = 20
    const projectionWidth = (content - projectionGap) / 2
    projectionCard(
      page,
      'Task list',
      x + gutter,
      compositionY + 356,
      projectionWidth,
      280,
    )
    projectionCard(
      page,
      'Progress',
      x + gutter + projectionWidth + projectionGap,
      compositionY + 356,
      projectionWidth,
      280,
      true,
    )
    projectionCard(
      page,
      'Recent activity',
      x + gutter,
      compositionY + 660,
      content,
      330,
    )

    const journeyY = y + 3000
    sectionHeading(
      page,
      'From intent to response.',
      'At tablet width the request journey becomes a vertical sequence.',
      x + gutter,
      journeyY,
      content,
      38,
    )
    const journeyData = [
      ['TaskBoard.vue', 'User expresses intent'],
      ['useTasks()', 'Updates request state'],
      ['TaskRepository', 'Sends fetch request'],
      ['GET /api/tasks', 'MSW returns JSON'],
      ['Reactive UI', 'Every projection updates'],
    ]
    journeyData.forEach(([title, detail], index) => {
      const stepY = journeyY + 150 + index * 142
      journeyStep(page, index + 1, title, detail, x + gutter + 100, stepY, content - 200)
      if (index < journeyData.length - 1) {
        line(
          `Tablet / Journey / Connector ${index + 1}`,
          x + page.width / 2,
          stepY + 118,
          1,
          24,
          C.vueDark,
          page,
        )
      }
    })

    const confidenceY = y + 3920
    rect(
      'Tablet / Confidence background',
      x,
      confidenceY,
      page.width,
      700,
      C.mintBand,
      page,
    )
    sectionHeading(
      page,
      'Change with confidence.',
      'The test loop and code proof stack into a single column.',
      x + gutter,
      confidenceY + 72,
      content,
      38,
    )
    ;['Add task', 'State updates', 'UI reflects', 'Test passes'].forEach((label, index) => {
      pill(
        `Tablet / Confidence / ${label}`,
        label,
        x + gutter + index * 172,
        confidenceY + 230,
        150,
        page,
        { height: 44, active: index === 3 },
      )
    })
    codePanel(page, x + gutter, confidenceY + 316, content, 270)

    const guideY = y + 4700
    sectionHeading(
      page,
      'How to reason about a Vue feature.',
      'Implementation guidance remains a single reading column at tablet width.',
      x + gutter,
      guideY,
      content,
      38,
    )
    ;[
      ['01', 'Start with one-way data flow.'],
      ['02', 'Vue concepts used here.'],
      ['03', 'Architecture boundaries.'],
      ['04', 'Rules worth carrying forward.'],
    ].forEach(([index, title], itemIndex) => {
      const itemY = guideY + 170 + itemIndex * 180
      const item = panel(
        `Tablet / Guide / ${index}`,
        x + gutter,
        itemY,
        content,
        142,
        page,
        { stroke: C.border },
      )
      text(
        `Tablet / Guide / ${index} / Index`,
        index,
        item.x + 20,
        item.y + 24,
        54,
        30,
        12,
        700,
        C.vueDark,
        item,
      )
      text(
        `Tablet / Guide / ${index} / Title`,
        title,
        item.x + 86,
        item.y + 20,
        item.width - 110,
        44,
        24,
        800,
        C.ink,
        item,
      )
      text(
        `Tablet / Guide / ${index} / Detail`,
        'The same content hierarchy is preserved without side-by-side dependencies.',
        item.x + 86,
        item.y + 78,
        item.width - 110,
        40,
        11,
        500,
        C.muted,
        item,
      )
    })
  }

  function buildMobile(page) {
    const x = page.x
    const y = page.y
    const gutter = 16
    const content = page.width - gutter * 2
    const header = board('Mobile / Header', x, y, page.width, 74, C.white, page)
    addBrand(header, x + gutter, y + 25, true)
    text(
      'Mobile / Navigation state',
      'Navigation hidden',
      x + page.width - 128,
      y + 26,
      112,
      22,
      9,
      600,
      C.muted,
      header,
      { align: 'right', verticalAlign: 'center', lineHeight: 1 },
    )

    sectionHeading(
      page,
      'Build one feature. Watch Vue connect the rest.',
      'The entire hero becomes one reading column.',
      x + gutter,
      y + 112,
      content,
      42,
    )
    button('Mobile / Primary action', 'Add your first task', x + gutter, y + 380, content, page, {
      primary: true,
      height: 50,
    })
    button('Mobile / Secondary action', 'Follow the data', x + gutter, y + 442, content, page, {
      height: 50,
    })
    taskBoard(page, x + gutter, y + 528, content, { stacked: true })
    line('Mobile / Hero divider', x, y + 1110, page.width, 1, C.border, page)

    const reactivityY = y + 1170
    sectionHeading(
      page,
      'One action. Many reactions.',
      'Code evidence and metrics become a single vertical sequence.',
      x + gutter,
      reactivityY,
      content,
      34,
    )
    codePanel(page, x + gutter, reactivityY + 150, content, 270, true)
    ;[
      ['Total tasks', '2', 'Reactive total'],
      ['Open tasks', '1', 'Computed open'],
      ['Progress', '50%', '1 of 2 done'],
      ['Next up', 'Write tests', 'First incomplete task'],
    ].forEach(([title, value, detail], index) => {
      metricCard(
        page,
        title,
        value,
        detail,
        x + gutter,
        reactivityY + 446 + index * 146,
        content,
      )
    })

    const compositionY = y + 2250
    rect(
      'Mobile / Composition background',
      x,
      compositionY,
      page.width,
      1740,
      C.mintBand,
      page,
    )
    sectionHeading(
      page,
      'One state. Many views.',
      'Every projection becomes a full-width card and structural connectors disappear.',
      x + gutter,
      compositionY + 60,
      content,
      34,
    )
    const state = panel(
      'Mobile / State backbone',
      x + gutter + 44,
      compositionY + 230,
      content - 88,
      86,
      page,
      { stroke: C.vue },
    )
    centeredLabel(
      'Mobile / State backbone / Label',
      'useTasks()',
      state.x,
      state.y,
      state.width,
      48,
      state,
      { size: 14, color: C.ink },
    )
    centeredLabel(
      'Mobile / State backbone / Detail',
      'Single source of truth',
      state.x,
      state.y + 44,
      state.width,
      28,
      state,
      { size: 9, weight: 500, color: C.muted },
    )
    projectionCard(page, 'Task list', x + gutter, compositionY + 354, content, 300)
    projectionCard(page, 'Progress', x + gutter, compositionY + 676, content, 260, true)
    projectionCard(page, 'Recent activity', x + gutter, compositionY + 958, content, 330)

    const journeyY = y + 4050
    sectionHeading(
      page,
      'From intent to response.',
      'The request path is shown vertically to preserve a clear reading order.',
      x + gutter,
      journeyY,
      content,
      34,
    )
    const journeyData = [
      ['TaskBoard.vue', 'User expresses intent'],
      ['useTasks()', 'Updates request state'],
      ['TaskRepository', 'Sends fetch request'],
      ['GET /api/tasks', 'MSW returns JSON'],
      ['Reactive UI', 'Every projection updates'],
    ]
    journeyData.forEach(([title, detail], index) => {
      const stepY = journeyY + 154 + index * 142
      journeyStep(page, index + 1, title, detail, x + gutter, stepY, content)
      if (index < journeyData.length - 1) {
        line(
          `Mobile / Journey / Connector ${index + 1}`,
          x + page.width / 2,
          stepY + 118,
          1,
          24,
          C.vueDark,
          page,
        )
      }
    })

    const confidenceY = y + 5010
    rect(
      'Mobile / Confidence background',
      x,
      confidenceY,
      page.width,
      970,
      C.mintBand,
      page,
    )
    sectionHeading(
      page,
      'Change with confidence.',
      'Confidence steps become one column above the test evidence.',
      x + gutter,
      confidenceY + 58,
      content,
      34,
    )
    ;['Add task', 'State updates', 'UI reflects', 'Test passes'].forEach((label, index) => {
      pill(
        `Mobile / Confidence / ${label}`,
        label,
        x + gutter,
        confidenceY + 220 + index * 58,
        content,
        page,
        { height: 42, active: index === 3 },
      )
    })
    codePanel(page, x + gutter, confidenceY + 478, content, 360, true)

    const guideY = y + 6060
    sectionHeading(
      page,
      'How to reason about a Vue feature.',
      'All guidance chapters use one content column on narrow screens.',
      x + gutter,
      guideY,
      content,
      34,
    )
    ;[
      ['01', 'Start with one-way data flow.'],
      ['02', 'Vue concepts used here.'],
      ['03', 'Architecture boundaries.'],
      ['04', 'Rules worth carrying forward.'],
    ].forEach(([index, title], itemIndex) => {
      const itemY = guideY + 174 + itemIndex * 230
      const item = panel(
        `Mobile / Guide / ${index}`,
        x + gutter,
        itemY,
        content,
        196,
        page,
        { stroke: C.border },
      )
      text(
        `Mobile / Guide / ${index} / Index`,
        index,
        item.x + 18,
        item.y + 20,
        42,
        24,
        10,
        700,
        C.vueDark,
        item,
      )
      text(
        `Mobile / Guide / ${index} / Title`,
        title,
        item.x + 18,
        item.y + 58,
        item.width - 36,
        58,
        22,
        800,
        C.ink,
        item,
        { lineHeight: 1.15 },
      )
      text(
        `Mobile / Guide / ${index} / Detail`,
        'Content, examples, and decisions follow the same linear reading order.',
        item.x + 18,
        item.y + 128,
        item.width - 36,
        50,
        10,
        500,
        C.muted,
        item,
        { lineHeight: 1.5 },
      )
    })
  }

  function buildResponsiveSystem(page) {
    const x = page.x
    const y = page.y
    text(
      'Responsive system / Title',
      'Vue in Motion — Responsive system',
      x + 56,
      y + 52,
      1000,
      60,
      38,
      800,
      C.ink,
      page,
      { verticalAlign: 'center', lineHeight: 1 },
    )
    text(
      'Responsive system / Guidance',
      'Approved viewport states plus the explicit behavioral contract implemented by Vue CSS.',
      x + 56,
      y + 120,
      1100,
      34,
      14,
      500,
      C.muted,
      page,
    )
    text(
      'Responsive system / Breakpoint heading',
      'Breakpoint behavior matrix',
      x + 56,
      y + 210,
      600,
      40,
      24,
      800,
      C.ink,
      page,
    )
    const columns = [56, 220, 430, 760]
    const widths = [150, 190, 310, 760]
    ;['Threshold', 'Representative', 'Layout intent', 'Affected surfaces'].forEach(
      (label, index) => {
        text(
          `Responsive system / Matrix / Header / ${label}`,
          label,
          x + columns[index],
          y + 274,
          widths[index],
          30,
          11,
          800,
          C.ink,
          page,
          { verticalAlign: 'center', lineHeight: 1 },
        )
      },
    )
    const rows = [
      ['≤1100px', 'Tablet 1024', 'Stack major two-column regions', 'Hero · reactivity · projections 2-up · vertical journey'],
      ['≤760px', 'Mobile 720', 'Switch the page to one reading column', 'Navigation hidden · projections 1-up · actions stacked'],
      ['≤560px', 'Task board', 'Protect form and filter usability', 'Task input/button stack · filters scroll horizontally'],
      ['≤460px', 'Mobile 390', 'Use narrow-screen, full-width actions', 'Hero CTA · insights · confidence steps become 1-up'],
    ]
    rows.forEach((row, rowIndex) => {
      const rowY = y + 318 + rowIndex * 76
      line(
        `Responsive system / Matrix / Divider ${rowIndex + 1}`,
        x + 56,
        rowY - 8,
        1488,
        1,
        C.border,
        page,
      )
      row.forEach((value, columnIndex) => {
        text(
          `Responsive system / Matrix / ${rowIndex + 1} / ${columnIndex + 1}`,
          value,
          x + columns[columnIndex],
          rowY + 8,
          widths[columnIndex],
          52,
          columnIndex === 0 ? 12 : 11,
          columnIndex === 0 ? 800 : 500,
          columnIndex === 0 ? C.vueDark : C.inkSoft,
          page,
          { lineHeight: 1.35 },
        )
      })
    })

    text(
      'Responsive system / Token heading',
      'Responsive tokens',
      x + 56,
      y + 680,
      600,
      40,
      24,
      800,
      C.ink,
      page,
    )
    const tokenCards = [
      ['Breakpoint / Tablet', '1100px', 'Major layout stack'],
      ['Breakpoint / Mobile', '760px', 'Single reading column'],
      ['Breakpoint / Task board', '560px', 'Form stack + filter scroll'],
      ['Breakpoint / Narrow', '460px', 'Full-width CTA'],
      ['Gutter / Desktop', '40px', '1728 board'],
      ['Gutter / Tablet', '24px', '1024 board'],
      ['Gutter / Mobile', '16px', '390 board'],
      ['Container / Tablet max', '832px', '52rem cap'],
    ]
    tokenCards.forEach(([label, value, detail], index) => {
      const column = index % 4
      const row = Math.floor(index / 4)
      const cardX = x + 56 + column * 376
      const cardY = y + 744 + row * 152
      const card = panel(`Responsive system / Token / ${label}`, cardX, cardY, 344, 124, page, {
        stroke: C.border,
      })
      text(`${label} / Label`, label, cardX + 16, cardY + 16, 312, 22, 10, 700, C.vueDark, card)
      text(`${label} / Value`, value, cardX + 16, cardY + 44, 312, 34, 22, 800, C.ink, card)
      text(`${label} / Detail`, detail, cardX + 16, cardY + 88, 312, 20, 9, 500, C.muted, card)
    })

    text(
      'Responsive system / Rules heading',
      'Rules of ownership',
      x + 56,
      y + 1100,
      600,
      40,
      24,
      800,
      C.ink,
      page,
    )
    ;[
      ['Penpot', 'Defines the approved visual state at representative widths.'],
      ['CSS', 'Owns fluid sizing, grids, visibility, wrapping, and breakpoint transitions.'],
      ['Vue', 'Owns data and interaction; viewport logic is reserved for behavioral changes.'],
      ['QA', 'Compares rendered desktop, tablet, and mobile against these approved boards.'],
    ].forEach(([owner, rule], index) => {
      const ruleY = y + 1172 + index * 92
      pill(`Responsive system / Ownership / ${owner}`, owner, x + 56, ruleY, 124, page, {
        active: index === 0,
        height: 36,
      })
      text(
        `Responsive system / Ownership / ${owner} / Rule`,
        rule,
        x + 212,
        ruleY,
        1180,
        44,
        13,
        500,
        C.inkSoft,
        page,
        { verticalAlign: 'center', lineHeight: 1.4 },
      )
    })

    text(
      'Responsive system / QA heading',
      'Boundary-width QA',
      x + 56,
      y + 1580,
      600,
      40,
      24,
      800,
      C.ink,
      page,
    )
    text(
      'Responsive system / QA copy',
      'Review 1101/1100 · 761/760 · 561/560 · 461/460, plus the approved 1728 · 1024 · 390 viewports. A breakpoint change is incomplete until both sides preserve reading order and interaction.',
      x + 56,
      y + 1644,
      1380,
      86,
      14,
      500,
      C.muted,
      page,
      { lineHeight: 1.6 },
    )
  }

  function createComponentFromShape(shape, fullName) {
    const parts = fullName.split(' / ')
    const name = parts.pop()
    const path = parts.join(' / ')
    const existing = local.components.find(
      (component) => component.name === name && component.path === path,
    )
    if (existing) return { fullName, created: false }
    const component = local.createComponent([shape])
    component.name = name
    component.path = path
    return { fullName, created: true }
  }

  function buildComponentStates(page) {
    const x = page.x
    const y = page.y
    text(
      'Responsive states / Title',
      'Approved responsive component states',
      x + 56,
      y + 52,
      1000,
      54,
      34,
      800,
      C.ink,
      page,
      { verticalAlign: 'center', lineHeight: 1 },
    )
    text(
      'Responsive states / Guidance',
      'These masters document discrete layout changes. Continuous resizing remains CSS-owned.',
      x + 56,
      y + 116,
      1200,
      32,
      13,
      500,
      C.muted,
      page,
    )

    const sources = []
    const fullWidthButton = button(
      'Button / Primary / Full width / Main',
      'Add your first task',
      x + 56,
      y + 220,
      320,
      page,
      { primary: true, height: 50 },
    )
    sources.push([fullWidthButton, 'Button / Primary / Full width'])

    const inlineForm = panel(
      'Responsive / Task form / Inline / Main',
      x + 440,
      y + 200,
      610,
      90,
      page,
      { stroke: C.border },
    )
    rect('Inline form / Input', inlineForm.x + 14, inlineForm.y + 20, 444, 48, C.white, inlineForm, C.borderStrong, 7)
    button('Inline form / Submit', 'Add task', inlineForm.x + 470, inlineForm.y + 20, 126, inlineForm, {
      primary: true,
      height: 48,
    })
    sources.push([inlineForm, 'Responsive / Task form / Inline'])

    const stackedForm = panel(
      'Responsive / Task form / Stacked / Main',
      x + 1100,
      y + 184,
      360,
      142,
      page,
      { stroke: C.border },
    )
    rect('Stacked form / Input', stackedForm.x + 14, stackedForm.y + 14, 332, 48, C.white, stackedForm, C.borderStrong, 7)
    button('Stacked form / Submit', 'Add task', stackedForm.x + 14, stackedForm.y + 76, 332, stackedForm, {
      primary: true,
      height: 48,
    })
    sources.push([stackedForm, 'Responsive / Task form / Stacked'])

    const inlineFilters = board(
      'Responsive / Filter row / Inline / Main',
      x + 56,
      y + 410,
      330,
      54,
      C.surface,
      page,
      C.border,
      8,
    )
    pill('Inline filters / All', 'All (2)', inlineFilters.x + 12, inlineFilters.y + 12, 66, inlineFilters, {
      active: true,
    })
    pill('Inline filters / Open', 'Open (1)', inlineFilters.x + 86, inlineFilters.y + 12, 78, inlineFilters)
    pill('Inline filters / Done', 'Done (1)', inlineFilters.x + 172, inlineFilters.y + 12, 78, inlineFilters)
    sources.push([inlineFilters, 'Responsive / Filter row / Inline'])

    const scrollFilters = board(
      'Responsive / Filter row / Scrollable / Main',
      x + 440,
      y + 410,
      220,
      54,
      C.surface,
      page,
      C.border,
      8,
    )
    scrollFilters.clipContent = true
    pill('Scrollable filters / All', 'All (2)', scrollFilters.x + 12, scrollFilters.y + 12, 66, scrollFilters, {
      active: true,
    })
    pill('Scrollable filters / Open', 'Open (1)', scrollFilters.x + 86, scrollFilters.y + 12, 78, scrollFilters)
    pill('Scrollable filters / Done', 'Done (1)', scrollFilters.x + 172, scrollFilters.y + 12, 78, scrollFilters)
    sources.push([scrollFilters, 'Responsive / Filter row / Scrollable'])

    function projectionLayout(name, fullName, layoutX, layoutY, width, columns) {
      const height = columns === 1 ? 370 : columns === 2 ? 240 : 160
      const layout = board(`${name} / Main`, layoutX, layoutY, width, height, C.mintBand, page, C.border, 8)
      const gap = 10
      const cardWidth = columns === 1 ? width - 24 : (width - 24 - gap * (columns - 1)) / columns
      ;['Tasks', 'Progress', 'Activity'].forEach((label, index) => {
        const row = columns === 1 ? index : Math.floor(index / columns)
        const column = columns === 1 ? 0 : index % columns
        const cardHeight = columns === 1 ? 100 : columns === 2 ? 92 : 112
        const card = panel(
          `${name} / ${label}`,
          layoutX + 12 + column * (cardWidth + gap),
          layoutY + 12 + row * (cardHeight + gap),
          cardWidth,
          cardHeight,
          layout,
          { stroke: C.border },
        )
        centeredLabel(
          `${name} / ${label} / Label`,
          label,
          card.x,
          card.y,
          card.width,
          card.height,
          card,
          { size: 10, color: C.ink },
        )
      })
      sources.push([layout, fullName])
    }

    projectionLayout(
      'Responsive / Projection layout / Three columns',
      'Responsive / Projection layout / Three columns',
      x + 56,
      y + 610,
      700,
      3,
    )
    projectionLayout(
      'Responsive / Projection layout / Two columns',
      'Responsive / Projection layout / Two columns',
      x + 820,
      y + 610,
      600,
      2,
    )
    projectionLayout(
      'Responsive / Projection layout / One column',
      'Responsive / Projection layout / One column',
      x + 56,
      y + 920,
      360,
      1,
    )

    const journeyHorizontal = board(
      'Responsive / Journey / Horizontal / Main',
      x + 470,
      y + 930,
      950,
      130,
      C.surface,
      page,
      C.border,
      8,
    )
    ;['Intent', 'State', 'Request', 'Response', 'UI'].forEach((label, index) => {
      pill(
        `Horizontal journey / ${label}`,
        label,
        journeyHorizontal.x + 20 + index * 184,
        journeyHorizontal.y + 42,
        140,
        journeyHorizontal,
        { height: 42, active: index === 4 },
      )
      if (index < 4) {
        line(
          `Horizontal journey / Connector ${index + 1}`,
          journeyHorizontal.x + 160 + index * 184,
          journeyHorizontal.y + 63,
          44,
          1,
          C.vueDark,
          journeyHorizontal,
        )
      }
    })
    sources.push([journeyHorizontal, 'Responsive / Journey / Horizontal'])

    const journeyVertical = board(
      'Responsive / Journey / Vertical / Main',
      x + 470,
      y + 1120,
      360,
      430,
      C.surface,
      page,
      C.border,
      8,
    )
    ;['Intent', 'State', 'Request', 'Response', 'UI'].forEach((label, index) => {
      pill(
        `Vertical journey / ${label}`,
        label,
        journeyVertical.x + 40,
        journeyVertical.y + 24 + index * 78,
        280,
        journeyVertical,
        { height: 46, active: index === 4 },
      )
      if (index < 4) {
        line(
          `Vertical journey / Connector ${index + 1}`,
          journeyVertical.x + 180,
          journeyVertical.y + 70 + index * 78,
          1,
          32,
          C.vueDark,
          journeyVertical,
        )
      }
    })
    sources.push([journeyVertical, 'Responsive / Journey / Vertical'])

    return sources.map(([shape, fullName]) => createComponentFromShape(shape, fullName))
  }

  for (const child of Array.from(root.children)) {
    if (child.name.startsWith('Seed / Responsive')) child.remove()
  }

  const boardSpecs = [
    {
      name: 'Approved / Responsive / Website / Tablet 1024',
      tempName: 'Seed / Responsive / Tablet 1024',
      x: 7200,
      y: 0,
      width: 1024,
      height: 5720,
      build: buildTablet,
    },
    {
      name: 'Approved / Responsive / Website / Mobile 390',
      tempName: 'Seed / Responsive / Mobile 390',
      x: 8344,
      y: 0,
      width: 390,
      height: 7160,
      build: buildMobile,
    },
    {
      name: 'Approved / Responsive design system / Vue in Motion',
      tempName: 'Seed / Responsive design system',
      x: 8854,
      y: 0,
      width: 1600,
      height: 1840,
      build: buildResponsiveSystem,
    },
  ]

  const createdBoards = []
  const preservedBoards = []
  for (const spec of boardSpecs) {
    const existing = [...root.children].find((shape) => shape.name === spec.name)
    if (existing) {
      preservedBoards.push(spec.name)
      continue
    }
    const page = board(spec.tempName, spec.x, spec.y, spec.width, spec.height, C.white)
    page.clipContent = true
    spec.build(page)
    page.name = spec.name
    createdBoards.push(spec.name)
  }

  const responsiveStatesName = 'Approved / Responsive component states / Vue in Motion'
  let componentResults = []
  let responsiveStates = [...root.children].find((shape) => shape.name === responsiveStatesName)
  if (!responsiveStates) {
    responsiveStates = board(
      'Seed / Responsive component states',
      8854,
      1980,
      1600,
      1660,
      C.white,
    )
    responsiveStates.clipContent = true
    componentResults = buildComponentStates(responsiveStates)
    responsiveStates.name = responsiveStatesName
    createdBoards.push(responsiveStatesName)
  } else {
    preservedBoards.push(responsiveStatesName)
  }

  const tokenSet =
    local.tokens.sets.find((set) => set.name === 'core') ?? local.tokens.addSet({ name: 'core' })
  if (!tokenSet.active) tokenSet.toggleActive()
  const responsiveTokens = [
    ['layout.breakpoint.tablet', '1100'],
    ['layout.breakpoint.mobile', '760'],
    ['layout.breakpoint.taskBoard', '560'],
    ['layout.breakpoint.narrow', '460'],
    ['layout.gutter.desktop', '40'],
    ['layout.gutter.tablet', '24'],
    ['layout.gutter.mobile', '16'],
    ['layout.container.tabletMax', '832'],
    ['layout.container.mobileMax', '672'],
  ]
  const createdTokens = []
  for (const [name, value] of responsiveTokens) {
    if (!tokenSet.tokens.some((token) => token.name === name)) {
      tokenSet.addToken({ type: 'spacing', name, value })
      createdTokens.push(name)
    }
  }

  const responsiveBoardNames = [
    'Approved / Responsive / Website / Tablet 1024',
    'Approved / Responsive / Website / Mobile 390',
    'Approved / Responsive design system / Vue in Motion',
    'Approved / Responsive component states / Vue in Motion',
  ]
  const responsiveBoards = [...root.children]
    .filter((shape) => responsiveBoardNames.includes(shape.name))
    .map((shape) => ({
      id: shape.id,
      name: shape.name,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
    }))

  penpot.selection = responsiveStates ? [responsiveStates] : []

  return {
    createdBoards,
    preservedBoards,
    responsiveBoards,
    components: {
      total: local.components.length,
      created: componentResults.filter((result) => result.created).map((result) => result.fullName),
      preserved: componentResults
        .filter((result) => !result.created)
        .map((result) => result.fullName),
    },
    tokens: {
      total: tokenSet.tokens.length,
      created: createdTokens,
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
    clientInfo: { name: 'vue-penpot-responsive-seed', version: '1.0.0' },
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
        code: `return (${seedResponsiveDesign.toString()})()`,
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
