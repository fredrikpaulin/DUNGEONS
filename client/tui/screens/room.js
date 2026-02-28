// Room screen — main game view showing narrative, choices, exits, presence, stats
import { cursor, screen, theme, style, box, drawBox, clearRegion, trackBar, write } from '../ansi.js'
import { wordWrap } from '../text.js'
import { menuSelect } from '../input.js'
import { layout } from '../layout.js'
import { actionMove, actionChoose } from '../../../shared/protocol.js'

const showRoom = async (conn, view) => {
  const l = layout()
  write(screen.clear)

  // Status bar
  drawStatusBar(view, l)

  // Room name and narrative
  const narY = l.narrative.y
  write(cursor.to(1, narY) + `${theme.title}${style.bold}${view.room.name}${theme.reset}`)

  const lines = wordWrap(view.room.narrative, l.narrative.w - 2)
  for (let i = 0; i < lines.length; i++) {
    write(cursor.to(1, narY + 1 + i) + `${theme.narrative}${lines[i]}${theme.reset}`)
  }
  let lineY = narY + 1 + lines.length

  // Show who else is here
  if (view.others?.length) {
    write(cursor.to(1, lineY + 1) + `${theme.muted}Also here: ${view.others.map(p => p.name).join(', ')}${theme.reset}`)
    lineY += 2
  }

  // Show NPCs
  if (view.npcsHere?.length) {
    write(cursor.to(1, lineY + 1) + `${theme.npc}NPCs: ${view.npcsHere.map(n => n.name).join(', ')}${theme.reset}`)
    lineY += 2
  }

  // Sidebar
  drawSidebar(view, l)

  // Build menu items: choices + exits
  const items = []
  for (const c of view.choices || []) {
    items.push({
      label: c.label,
      type: 'choice',
      id: c.id,
      disabled: !c.available,
      note: c.available ? '' : ' [locked]'
    })
  }
  for (const e of view.exits || []) {
    items.push({
      label: e.label,
      type: 'exit',
      target: e.target,
      disabled: false,
      note: ''
    })
  }

  if (items.length === 0) {
    write(cursor.to(1, l.choices.y) + `${theme.muted}No actions available${theme.reset}`)
    return null
  }

  // Draw menu
  const menuY = l.choices.y
  const renderMenu = (menuItems, sel) => {
    for (let i = 0; i < menuItems.length; i++) {
      const item = menuItems[i]
      const marker = i === sel ? `${theme.prompt}▸ ${theme.reset}` : '  '
      const color = item.disabled ? theme.muted : (item.type === 'exit' ? theme.stat : theme.choice)
      const note = item.disabled ? ` ${theme.muted}[locked]${theme.reset}` : ''
      write(cursor.to(1, menuY + i) + screen.clearLine + marker + `${color}${i + 1}. ${item.label}${theme.reset}${note}`)
    }
  }

  const idx = await menuSelect(items, renderMenu)
  const selected = items[idx]

  if (selected.type === 'exit') {
    return { action: 'move', roomId: selected.target }
  }
  return { action: 'choose', choiceId: selected.id }
}

const drawStatusBar = (view, l) => {
  const player = view.player
  const tracks = view.tracks || []
  let bar = ` ${theme.stat}${style.bold}${player.name}${theme.reset} (${player.role})`

  // Tracks
  for (const t of tracks) {
    const pct = (t.value - t.min) / (t.max - t.min)
    const color = pct < 0.3 ? theme.trackDanger : theme.track
    bar += `  ${color}${t.id}: ${trackBar(t.value, t.min, t.max, 6)}${theme.reset}`
  }

  // Tokens
  for (const [id, val] of Object.entries(view.tokens || {})) {
    bar += `  ${theme.item}${id}: ${val}${theme.reset}`
  }

  write(cursor.to(0, l.status.y) + screen.clearLine + bar)
}

const drawSidebar = (view, l) => {
  const x = l.sidebar.x
  let y = l.sidebar.y

  // Items
  write(cursor.to(x, y) + `${theme.item}${style.bold}Items${theme.reset}`)
  y++
  const items = view.player.items || []
  if (items.length === 0) {
    write(cursor.to(x, y) + `${theme.muted}(none)${theme.reset}`)
    y++
  } else {
    for (const item of items) {
      write(cursor.to(x, y) + `${theme.item}• ${item}${theme.reset}`)
      y++
    }
  }
  y++

  // Conditions
  write(cursor.to(x, y) + `${theme.condition}${style.bold}Conditions${theme.reset}`)
  y++
  const conds = view.player.conditions || []
  if (conds.length === 0) {
    write(cursor.to(x, y) + `${theme.muted}(none)${theme.reset}`)
    y++
  } else {
    for (const c of conds) {
      write(cursor.to(x, y) + `${theme.condition}• ${c}${theme.reset}`)
      y++
    }
  }
  y++

  // Clues
  write(cursor.to(x, y) + `${theme.clue}${style.bold}Clues: ${view.clues?.total || 0}${theme.reset}`)
}

export { showRoom, drawStatusBar, drawSidebar }
