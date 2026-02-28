// Narrator — typewriter effect for narrative text
import { write, theme } from './ansi.js'

const typewrite = async (text, speed = 20) => {
  for (const ch of text) {
    write(ch)
    if (ch !== ' ') await new Promise(r => setTimeout(r, speed))
  }
}

const showNarrative = async (text, speed = 20) => {
  write(theme.narrative)
  await typewrite(text, speed)
  write(theme.reset + '\n')
}

const showNarrativeInstant = (text) => {
  write(theme.narrative + text + theme.reset + '\n')
}

export { typewrite, showNarrative, showNarrativeInstant }
