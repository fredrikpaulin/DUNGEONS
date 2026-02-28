// Verb selection sub-screen
import { cursor, screen, theme, write } from '../ansi.js'
import { menuSelect } from '../input.js'

const showVerbSelect = async (verbs) => {
  write(cursor.to(1, 18) + `${theme.narrative}Choose your action word:${theme.reset}`)

  const items = verbs.map(v => ({ label: v }))
  const renderMenu = (menuItems, sel) => {
    for (let i = 0; i < menuItems.length; i++) {
      const marker = i === sel ? `${theme.prompt}▸ ${theme.reset}` : '  '
      write(cursor.to(3, 19 + i) + screen.clearLine + marker + `${theme.choice}${i + 1}. ${menuItems[i].label}${theme.reset}`)
    }
  }

  const idx = await menuSelect(items, renderMenu)
  return verbs[idx]
}

export { showVerbSelect }
