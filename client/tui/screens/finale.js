// Finale screen — culprit and hideout selection
import { cursor, screen, theme, style, write } from '../ansi.js'
import { menuSelect } from '../input.js'

const showFinale = async (suspects, hideouts) => {
  write(screen.clear)
  write(cursor.to(2, 1) + `${theme.title}${style.bold}THE FINALE${theme.reset}`)
  write(cursor.to(2, 3) + `${theme.narrative}Time to solve the mystery!${theme.reset}`)

  // Select culprit
  write(cursor.to(2, 5) + `${theme.narrative}Who is the culprit?${theme.reset}`)
  const suspectItems = suspects.map(s => ({ label: s.name || s }))
  const renderSuspects = (items, sel) => {
    for (let i = 0; i < items.length; i++) {
      const marker = i === sel ? `${theme.prompt}▸ ${theme.reset}` : '  '
      write(cursor.to(4, 7 + i) + screen.clearLine + marker + `${theme.choice}${i + 1}. ${items[i].label}${theme.reset}`)
    }
  }
  const suspectIdx = await menuSelect(suspectItems, renderSuspects)
  const culprit = suspects[suspectIdx].id || suspects[suspectIdx]

  // Select hideout
  write(cursor.to(2, 10 + suspects.length) + `${theme.narrative}Where is the hideout?${theme.reset}`)
  const hideoutItems = hideouts.map(h => ({ label: h.name || h }))
  const renderHideouts = (items, sel) => {
    for (let i = 0; i < items.length; i++) {
      const marker = i === sel ? `${theme.prompt}▸ ${theme.reset}` : '  '
      write(cursor.to(4, 12 + suspects.length + i) + screen.clearLine + marker + `${theme.choice}${i + 1}. ${items[i].label}${theme.reset}`)
    }
  }
  const hideoutIdx = await menuSelect(hideoutItems, renderHideouts)
  const hideout = hideouts[hideoutIdx].id || hideouts[hideoutIdx]

  return { culprit, hideout }
}

export { showFinale }
