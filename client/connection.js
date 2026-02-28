// WebSocket client — connect, send, receive with event dispatch
import { pack, unpack } from '../shared/protocol.js'

const connect = (url) => new Promise((resolve, reject) => {
  const handlers = new Map()
  let ws

  const on = (type, fn) => {
    if (!handlers.has(type)) handlers.set(type, [])
    handlers.get(type).push(fn)
  }

  const off = (type, fn) => {
    const list = handlers.get(type)
    if (list) handlers.set(type, list.filter(f => f !== fn))
  }

  const emit = (type, data) => {
    const list = handlers.get(type)
    if (list) list.forEach(fn => fn(data))
  }

  const send = (msg) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(pack(msg))
    }
  }

  const close = () => {
    if (ws) ws.close()
  }

  ws = new WebSocket(url)

  ws.addEventListener('open', () => {
    resolve({ send, close, on, off })
  })

  ws.addEventListener('message', (event) => {
    const msg = unpack(event.data)
    if (msg && msg.type) {
      emit(msg.type, msg)
    }
  })

  ws.addEventListener('close', () => {
    emit('_close', {})
  })

  ws.addEventListener('error', (err) => {
    reject(err)
  })
})

export { connect }
