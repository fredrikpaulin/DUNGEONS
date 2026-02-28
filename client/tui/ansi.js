// ANSI escape code helpers — colors, cursor, screen, box drawing
// Zero dependencies, raw escape sequences only

const ESC = '\x1b['

const cursor = {
  hide: `${ESC}?25l`,
  show: `${ESC}?25h`,
  to: (x, y) => `${ESC}${y + 1};${x + 1}H`,
  up: (n = 1) => `${ESC}${n}A`,
  down: (n = 1) => `${ESC}${n}B`,
  right: (n = 1) => `${ESC}${n}C`,
  left: (n = 1) => `${ESC}${n}D`,
  save: `${ESC}s`,
  restore: `${ESC}u`,
}

const screen = {
  clear: `${ESC}2J${ESC}H`,
  clearLine: `${ESC}2K`,
  clearDown: `${ESC}J`,
  clearRight: `${ESC}K`,
  altBuffer: `${ESC}?1049h`,
  mainBuffer: `${ESC}?1049l`,
}

const fg = {
  black: 30, red: 31, green: 32, yellow: 33,
  blue: 34, magenta: 35, cyan: 36, white: 37,
  brightBlack: 90, brightRed: 91, brightGreen: 92, brightYellow: 93,
  brightBlue: 94, brightMagenta: 95, brightCyan: 96, brightWhite: 97,
}
const bg = {
  black: 40, red: 41, green: 42, yellow: 43,
  blue: 44, magenta: 45, cyan: 46, white: 47,
}

const fgRgb = (r, g, b) => `${ESC}38;2;${r};${g};${b}m`
const bgRgb = (r, g, b) => `${ESC}48;2;${r};${g};${b}m`

const style = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  italic: `${ESC}3m`,
  underline: `${ESC}4m`,
}

const color = (fgCode, bgCode) => {
  let s = `${ESC}${fgCode}m`
  if (bgCode !== undefined) s += `${ESC}${bgCode}m`
  return s
}

const theme = {
  title: fgRgb(255, 200, 80),
  narrative: color(fg.white),
  choice: fgRgb(120, 200, 255),
  choiceNum: fgRgb(255, 200, 80),
  stat: fgRgb(180, 220, 255),
  track: fgRgb(100, 200, 140),
  trackDanger: fgRgb(255, 80, 80),
  clue: fgRgb(255, 230, 100),
  condition: fgRgb(160, 130, 255),
  item: fgRgb(140, 220, 200),
  npc: fgRgb(255, 180, 120),
  error: color(fg.brightRed),
  success: color(fg.brightGreen),
  muted: color(fg.brightBlack),
  border: fgRgb(80, 80, 100),
  prompt: fgRgb(255, 200, 80),
  reset: style.reset,
}

const box = {
  tl: '┌', tr: '┐', bl: '└', br: '┘',
  h: '─', v: '│',
  lt: '├', rt: '┤',
  rtl: '╭', rtr: '╮', rbl: '╰', rbr: '╯',
}

const drawBox = (x, y, w, h) => {
  let out = ''
  out += cursor.to(x, y) + box.tl + box.h.repeat(w - 2) + box.tr
  for (let i = 1; i < h - 1; i++) {
    out += cursor.to(x, y + i) + box.v + cursor.to(x + w - 1, y + i) + box.v
  }
  out += cursor.to(x, y + h - 1) + box.bl + box.h.repeat(w - 2) + box.br
  return out
}

const clearRegion = (x, y, w, h) => {
  let out = ''
  const blank = ' '.repeat(w)
  for (let i = 0; i < h; i++) out += cursor.to(x, y + i) + blank
  return out
}

const trackBar = (value, min, max, width = 10) => {
  const range = max - min
  if (range <= 0) return '█'.repeat(width)
  const filled = Math.round(((value - min) / range) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

const stripAnsi = (str) => str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
const visLen = (str) => stripAnsi(str).length

const write = (str) => process.stdout.write(str)

export {
  ESC, cursor, screen, fg, bg, fgRgb, bgRgb,
  style, color, theme,
  box, drawBox, clearRegion,
  trackBar, stripAnsi, visLen, write
}
