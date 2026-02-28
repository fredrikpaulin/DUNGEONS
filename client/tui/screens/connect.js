// Connect screen — server connection + auth (create or login)
import { cursor, screen, theme, style, box, drawBox, write } from '../ansi.js'
import { readLine, menuSelect } from '../input.js'

const showConnect = async (conn) => {
  write(screen.clear)
  write(cursor.to(2, 1) + `${theme.title}${style.bold}DUNGEONS${theme.reset}`)
  write(cursor.to(2, 3) + `${theme.muted}Connected to server${theme.reset}`)

  // Wait for welcome message
  const welcomeMsg = await new Promise(resolve => {
    conn.on('welcome', resolve)
  })

  const adventures = welcomeMsg.adventures || []
  write(cursor.to(2, 4) + `${theme.stat}${adventures.length} adventure(s) available${theme.reset}`)

  // Auth
  write(cursor.to(2, 6) + `${theme.narrative}What would you like to do?${theme.reset}`)

  const items = [
    { label: 'Create new character' },
    { label: 'Login as existing character' }
  ]

  const renderMenu = (menuItems, sel) => {
    for (let i = 0; i < menuItems.length; i++) {
      const marker = i === sel ? `${theme.prompt}▸ ${theme.reset}` : '  '
      write(cursor.to(4, 8 + i) + screen.clearLine + marker + `${theme.choice}${i + 1}.${theme.reset} ${menuItems[i].label}`)
    }
  }

  const choice = await menuSelect(items, renderMenu)

  write(cursor.to(2, 12) + screen.clearLine)
  const name = await readLine(`${theme.prompt}Enter your name: ${theme.reset}`)

  return { action: choice === 0 ? 'create' : 'login', name }
}

const showAuthResult = (msg) => {
  write(cursor.to(2, 14) + screen.clearLine)
  if (msg.type === 'auth_ok') {
    write(`${theme.success}Welcome, ${msg.user.name}!${theme.reset}`)
  } else {
    write(`${theme.error}${msg.message || 'Authentication failed'}${theme.reset}`)
  }
}

export { showConnect, showAuthResult }
