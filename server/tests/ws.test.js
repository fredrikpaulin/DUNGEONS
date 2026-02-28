import { test, expect, describe, beforeAll, afterAll } from 'bun:test'
import { createDb } from '../db.js'
import { createHandler } from '../ws.js'
import { pack, unpack, authCreate, authLogin } from '../../shared/protocol.js'

// Spin up a test server on a random port
let server, port, db

beforeAll(() => {
  db = createDb(':memory:')
  const adventures = [{ id: 'test-adventure', title: 'Test Adventure' }]
  const getAdventures = () => adventures
  const wsHandler = createHandler(db, getAdventures)

  server = Bun.serve({
    port: 0, // random available port
    fetch(req, server) {
      if (new URL(req.url).pathname === '/ws') {
        const ok = server.upgrade(req, {
          data: { userId: null, userName: null, sessionId: null }
        })
        if (ok) return undefined
        return new Response('Upgrade failed', { status: 400 })
      }
      return new Response('ok')
    },
    websocket: wsHandler
  })
  port = server.port
})

afterAll(() => {
  server?.stop()
})

// Helper: connect and collect messages
const connectClient = () => new Promise((resolve, reject) => {
  const messages = []
  const ws = new WebSocket(`ws://localhost:${port}/ws`)

  ws.addEventListener('open', () => {
    resolve({
      ws,
      messages,
      send: (msg) => ws.send(pack(msg)),
      waitFor: (type, timeout = 2000) => new Promise((res, rej) => {
        const existing = messages.find(m => m.type === type)
        if (existing) return res(existing)
        const check = setInterval(() => {
          const found = messages.find(m => m.type === type)
          if (found) { clearInterval(check); res(found) }
        }, 10)
        setTimeout(() => { clearInterval(check); rej(new Error(`Timeout waiting for ${type}`)) }, timeout)
      }),
      close: () => ws.close()
    })
  })

  ws.addEventListener('message', (event) => {
    const msg = unpack(event.data)
    if (msg) messages.push(msg)
  })

  ws.addEventListener('error', reject)
})

describe('WebSocket connection', () => {
  test('receives welcome on connect', async () => {
    const client = await connectClient()
    const msg = await client.waitFor('welcome')
    expect(msg.type).toBe('welcome')
    expect(msg.adventures).toHaveLength(1)
    expect(msg.adventures[0].id).toBe('test-adventure')
    expect(msg.user).toBeNull()
    client.close()
  })

  test('create user via auth message', async () => {
    const client = await connectClient()
    await client.waitFor('welcome')

    client.send(authCreate('TestUser1'))
    const msg = await client.waitFor('auth_ok')
    expect(msg.type).toBe('auth_ok')
    expect(msg.user.name).toBe('TestUser1')
    expect(typeof msg.user.id).toBe('string')
    client.close()
  })

  test('login existing user', async () => {
    const client = await connectClient()
    await client.waitFor('welcome')

    // TestUser1 was created in previous test (shared db)
    client.send(authLogin('TestUser1'))
    const msg = await client.waitFor('auth_ok')
    expect(msg.type).toBe('auth_ok')
    expect(msg.user.name).toBe('TestUser1')
    client.close()
  })

  test('login non-existent user fails', async () => {
    const client = await connectClient()
    await client.waitFor('welcome')

    client.send(authLogin('NobodyHere'))
    const msg = await client.waitFor('auth_fail')
    expect(msg.type).toBe('auth_fail')
    expect(msg.message).toContain('not found')
    client.close()
  })

  test('create duplicate user fails', async () => {
    const client = await connectClient()
    await client.waitFor('welcome')

    client.send(authCreate('TestUser1'))
    const msg = await client.waitFor('auth_fail')
    expect(msg.type).toBe('auth_fail')
    expect(msg.message).toContain('taken')
    client.close()
  })

  test('invalid message returns error', async () => {
    const client = await connectClient()
    await client.waitFor('welcome')

    client.ws.send('not valid json')
    const msg = await client.waitFor('error')
    expect(msg.type).toBe('error')
    client.close()
  })

  test('unknown message type returns error', async () => {
    const client = await connectClient()
    await client.waitFor('welcome')

    client.send({ type: 'bogus_type' })
    const msg = await client.waitFor('error')
    expect(msg.type).toBe('error')
    expect(msg.message).toContain('Unknown')
    client.close()
  })

  test('auth without name fails', async () => {
    const client = await connectClient()
    await client.waitFor('welcome')

    client.send({ type: 'auth', action: 'create' })
    const msg = await client.waitFor('auth_fail')
    expect(msg.type).toBe('auth_fail')
    client.close()
  })

  test('multiple clients can connect simultaneously', async () => {
    const c1 = await connectClient()
    const c2 = await connectClient()

    await c1.waitFor('welcome')
    await c2.waitFor('welcome')

    c1.send(authCreate('Multi1'))
    c2.send(authCreate('Multi2'))

    const r1 = await c1.waitFor('auth_ok')
    const r2 = await c2.waitFor('auth_ok')

    expect(r1.user.name).toBe('Multi1')
    expect(r2.user.name).toBe('Multi2')
    expect(r1.user.id).not.toBe(r2.user.id)

    c1.close()
    c2.close()
  })
})
