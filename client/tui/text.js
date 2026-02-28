// Text utilities — word wrap, formatting helpers
import { stripAnsi } from './ansi.js'

const wordWrap = (text, maxWidth) => {
  if (!text) return []
  const words = text.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (stripAnsi(test).length > maxWidth) {
      if (current) lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

const truncate = (text, maxLen) => {
  const stripped = stripAnsi(text)
  if (stripped.length <= maxLen) return text
  return stripped.slice(0, maxLen - 3) + '...'
}

const centerText = (text, width) => {
  const len = stripAnsi(text).length
  const pad = Math.max(0, Math.floor((width - len) / 2))
  return ' '.repeat(pad) + text
}

const padRight = (text, width) => {
  const len = stripAnsi(text).length
  return text + ' '.repeat(Math.max(0, width - len))
}

export { wordWrap, truncate, centerText, padRight }
