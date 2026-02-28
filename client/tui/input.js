// Raw stdin input — key parsing, line reading, menu selection
// Zero dependencies, raw mode handling

import { write } from './ansi.js'

const enableRaw = () => {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
  }
}

const disableRaw = () => {
  if (process.stdin.isTTY && process.stdin.isRaw) {
    process.stdin.setRawMode(false)
    process.stdin.pause()
  }
}

const parseKey = (data) => {
  if (data === '\x03') return { name: 'ctrl-c', raw: data }
  if (data === '\x1b') return { name: 'escape', raw: data }
  if (data === '\r' || data === '\n') return { name: 'enter', raw: data }
  if (data === '\x7f' || data === '\b') return { name: 'backspace', raw: data }
  if (data === ' ') return { name: 'space', raw: data }
  if (data === '\x1b[A') return { name: 'up', raw: data }
  if (data === '\x1b[B') return { name: 'down', raw: data }
  if (data === '\x1b[C') return { name: 'right', raw: data }
  if (data === '\x1b[D') return { name: 'left', raw: data }
  if (data >= '0' && data <= '9') return { name: 'number', value: parseInt(data), raw: data }
  if (data.length === 1 && data >= 'a' && data <= 'z') return { name: 'letter', value: data, raw: data }
  if (data.length === 1 && data >= 'A' && data <= 'Z') return { name: 'letter', value: data.toLowerCase(), raw: data }
  return { name: 'unknown', raw: data }
}

const waitKey = () => new Promise((resolve) => {
  const handler = (data) => {
    process.stdin.removeListener('data', handler)
    const key = parseKey(data)
    if (key.name === 'ctrl-c') {
      disableRaw()
      process.exit(0)
    }
    resolve(key)
  }
  process.stdin.on('data', handler)
})

const waitAnyKey = async (prompt) => {
  if (prompt) write(prompt)
  await waitKey()
}

const readLine = async (prompt = '', maxLen = 30) => {
  write(prompt)
  let buf = ''
  while (true) {
    const key = await waitKey()
    if (key.name === 'enter') {
      write('\n')
      return buf
    }
    if (key.name === 'backspace' && buf.length > 0) {
      buf = buf.slice(0, -1)
      write('\b \b')
    } else if (key.name === 'letter' || key.name === 'number' || key.name === 'space') {
      if (buf.length < maxLen) {
        buf += key.raw
        write(key.raw)
      }
    }
  }
}

const menuSelect = async (items, renderFn) => {
  let idx = items.findIndex(i => !i.disabled)
  if (idx < 0) idx = 0
  renderFn(items, idx)
  while (true) {
    const key = await waitKey()
    if (key.name === 'up') {
      let next = idx - 1
      while (next >= 0 && items[next].disabled) next--
      if (next >= 0) idx = next
      renderFn(items, idx)
    } else if (key.name === 'down') {
      let next = idx + 1
      while (next < items.length && items[next].disabled) next++
      if (next < items.length) idx = next
      renderFn(items, idx)
    } else if (key.name === 'number' && key.value >= 1 && key.value <= items.length) {
      if (!items[key.value - 1].disabled) {
        idx = key.value - 1
        renderFn(items, idx)
        return idx
      }
    } else if (key.name === 'enter') {
      if (!items[idx].disabled) return idx
    }
  }
}

export { enableRaw, disableRaw, parseKey, waitKey, waitAnyKey, readLine, menuSelect }
