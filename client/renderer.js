// Renderer — message type → screen render dispatcher
// Maps server message types to UI rendering functions
import { cursor, theme, write } from './tui/ansi.js'

const createRenderer = () => {
  const handlers = new Map()

  const on = (type, fn) => { handlers.set(type, fn) }
  const handle = (msg) => {
    const fn = handlers.get(msg.type)
    if (fn) {
      fn(msg)
      return true
    }
    return false
  }

  // Default handlers for common server messages
  on('narrative', (msg) => {
    write(`\n${theme.narrative}${msg.text}${theme.reset}\n`)
  })

  on('error', (msg) => {
    write(`\n${theme.error}${msg.message}${theme.reset}\n`)
  })

  on('track_changed', (msg) => {
    const arrow = msg.delta > 0 ? '▲' : '▼'
    write(`\n${theme.track}${msg.track} ${arrow} ${msg.value}${theme.reset}\n`)
  })

  on('clue_found', (msg) => {
    write(`\n${theme.success}Clue found: ${msg.clue.text || msg.clue.id}${theme.reset}\n`)
  })

  on('player_entered', (msg) => {
    write(`\n${theme.muted}${msg.player.name} entered.${theme.reset}\n`)
  })

  on('player_left', (msg) => {
    write(`\n${theme.muted}${msg.player.name} left.${theme.reset}\n`)
  })

  on('condition_added', (msg) => {
    write(`\n${theme.error}${msg.player || 'You'} gained condition: ${msg.condition}${theme.reset}\n`)
  })

  on('condition_removed', (msg) => {
    write(`\n${theme.success}${msg.player || 'You'} lost condition: ${msg.condition}${theme.reset}\n`)
  })

  on('session_player_joined', (msg) => {
    write(`\n${theme.stat}${msg.player.name} joined the session${theme.reset}\n`)
  })

  on('session_player_left', (msg) => {
    write(`\n${theme.muted}${msg.player.name} left the session${theme.reset}\n`)
  })

  on('session_role_selected', (msg) => {
    write(`\n${theme.stat}${msg.player.name} chose ${msg.player.roleName || msg.player.role}${theme.reset}\n`)
  })

  on('game_over', (msg) => {
    write(`\n${theme.title}${msg.epilogue.narrative}${theme.reset}\n`)
  })

  return { on, handle }
}

export { createRenderer }
