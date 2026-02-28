// Epilog screen — ending narrative display
import { cursor, screen, theme, style, write } from '../ansi.js'
import { showNarrative } from '../narrator.js'
import { waitAnyKey } from '../input.js'

const showEpilog = async (epilogue) => {
  write(screen.clear)

  const isWin = epilogue.type === 'win'
  const color = isWin ? theme.success : theme.error
  const title = isWin ? 'MYSTERY SOLVED!' : 'THE END'

  write(cursor.to(2, 1) + `${color}${style.bold}${title}${theme.reset}`)
  write(cursor.to(2, 3))
  await showNarrative(epilogue.narrative || 'The adventure has ended.', 30)

  write(cursor.to(2, 8) + `${theme.muted}Press any key to exit...${theme.reset}`)
  await waitAnyKey()
}

export { showEpilog }
