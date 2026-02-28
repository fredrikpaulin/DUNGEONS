import { test, expect, describe, beforeAll, afterAll } from 'bun:test'
import { createDb } from '../db.js'
import { createHandler } from '../ws.js'
import { createSessionStore } from '../sessions.js'
import { createAdventureStore } from '../adventures.js'
import {
  pack, unpack, authCreate, sessionCreate, sessionJoin, sessionSelectRole, sessionStart, actionMove
} from '../../shared/protocol.js'

const fixturesDir = './server/tests/fixtures/adventures'

let server, port, db, adventureStore, sessionStore

beforeAll(async () => {
  db = createDb(':memory:')
  adventureStore = await createAdventureStore(db, fixturesDir)
  sessionStore = createSessionStore(db)
  const getAdventures = () => adventureStore.list()
  const wsHandler = createHandler(db, getAdventures, sessionStore, adventureStore)

  server = Bun.serve({
    port: 0,
    fetch(req, server) {
      if (new URL(req.url).pathname === '/ws') {
        const ok = server.upgrade(req, {
          data: { userId: null, userName: null, sessionId: null, pendingChoice: null, pendingApproach: null }
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

afterAll(() => { server?.stop() })

const connectClient = () => new Promise((resolve, reject) => {
  const messages = []
  const ws = new WebSocket(`ws://localhost:${port}/ws`)
  ws.addEventListener('open', () => {
    resolve({
      ws, messages,
      send: (msg) => ws.send(pack(msg)),
      waitFor: (type, timeout = 3000) => new Promise((res, rej) => {
        const existing = messages.find(m => m.type === type)
        if (existing) { messages.splice(messages.indexOf(existing), 1); return res(existing) }
        const check = setInterval(() => {
          const found = messages.find(m => m.type === type)
          if (found) { clearInterval(check); messages.splice(messages.indexOf(found), 1); res(found) }
        }, 10)
        setTimeout(() => { clearInterval(check); rej(new Error(`Timeout waiting for ${type}`)) }, timeout)
      }),
      allOfType: (type) => messages.filter(m => m.type === type),
      close: () => ws.close()
    })
  })
  ws.addEventListener('message', (event) => {
    const msg = unpack(event.data)
    if (msg) messages.push(msg)
  })
  ws.addEventListener('error', reject)
})

describe('broadcast', () => {
  test('player 2 sees player_joined when player joins session', async () => {
    const c1 = await connectClient()
    const c2 = await connectClient()

    await c1.waitFor('welcome')
    await c2.waitFor('welcome')

    // Auth both
    c1.send(authCreate('BroadTest1'))
    c2.send(authCreate('BroadTest2'))
    await c1.waitFor('auth_ok')
    await c2.waitFor('auth_ok')

    // c1 creates session
    const advList = adventureStore.list()
    c1.send(sessionCreate(advList[0].id))
    const joined1 = await c1.waitFor('session_joined')

    // c2 joins
    c2.send(sessionJoin(joined1.session.id))
    await c2.waitFor('session_joined')

    // c1 should receive player_joined
    const pj = await c1.waitFor('session_player_joined')
    expect(pj.player.name).toBe('BroadTest2')

    c1.close()
    c2.close()
  })

  test('session start broadcasts to all', async () => {
    const c1 = await connectClient()
    const c2 = await connectClient()
    await c1.waitFor('welcome')
    await c2.waitFor('welcome')

    c1.send(authCreate('StartTest1'))
    c2.send(authCreate('StartTest2'))
    await c1.waitFor('auth_ok')
    await c2.waitFor('auth_ok')

    const advList = adventureStore.list()
    c1.send(sessionCreate(advList[0].id))
    const joined1 = await c1.waitFor('session_joined')

    c2.send(sessionJoin(joined1.session.id))
    await c2.waitFor('session_joined')

    // Select roles
    c1.send(sessionSelectRole('explorer'))
    c2.send(sessionSelectRole('thinker'))

    // Wait for role selection broadcasts
    await new Promise(r => setTimeout(r, 100))

    // Start
    c1.send(sessionStart())

    // Both should get session_started
    const s1 = await c1.waitFor('session_started')
    const s2 = await c2.waitFor('session_started')
    expect(s1.type).toBe('session_started')
    expect(s2.type).toBe('session_started')

    c1.close()
    c2.close()
  })
})
