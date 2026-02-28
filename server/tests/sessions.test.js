import { test, expect, describe } from 'bun:test'
import { createSessionStore } from '../sessions.js'
import { createAdventureStore } from '../adventures.js'
import { createDb } from '../db.js'
import { createUser } from '../users.js'

const fixturesDir = './server/tests/fixtures/adventures'

const setup = async () => {
  const db = createDb()
  const adventureStore = await createAdventureStore(db, fixturesDir)
  const sessionStore = createSessionStore(db)
  const advList = adventureStore.list()
  const adventure = adventureStore.get(advList[0].id)

  // Create test users
  const u1 = createUser(db, 'Erik')
  const u2 = createUser(db, 'Maja')
  const u3 = createUser(db, 'Olle')

  return { db, adventureStore, sessionStore, adventure, u1, u2, u3 }
}

describe('session create', () => {
  test('creates a session', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    expect(session.id).toBeTruthy()
    expect(session.adventureId).toBe(adventure.id)
    expect(session.phase).toBe('lobby')
    expect(session.hostUserId).toBe(u1.user.id)
    expect(session.players.size).toBe(1)
  })

  test('host is added as first player', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    const host = session.players.get(u1.user.id)
    expect(host.userName).toBe('Erik')
    expect(host.role).toBeNull()
    expect(host.ready).toBe(false)
  })

  test('created session appears in list', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    const list = sessionStore.list()
    expect(list.length).toBe(1)
    expect(list[0].phase).toBe('lobby')
    expect(list[0].playerCount).toBe(1)
  })

  test('get returns session by id', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    const fetched = sessionStore.get(session.id)
    expect(fetched).not.toBeNull()
    expect(fetched.id).toBe(session.id)
  })
})

describe('session join', () => {
  test('second player can join', async () => {
    const { sessionStore, adventure, u1, u2 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    const result = sessionStore.join(session.id, u2.user.id, u2.user.name)
    expect(result.ok).toBe(true)
    expect(session.players.size).toBe(2)
  })

  test('cannot join nonexistent session', async () => {
    const { sessionStore, u2 } = await setup()
    const result = sessionStore.join('nonexistent', u2.user.id, u2.user.name)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('not found')
  })

  test('cannot join full session', async () => {
    const { db, sessionStore, adventure, u1, u2, u3 } = await setup()
    // mini-story allows max 4, create session with 4 users
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.join(session.id, u2.user.id, u2.user.name)
    sessionStore.join(session.id, u3.user.id, u3.user.name)
    const u4 = createUser(db, 'Anna')
    sessionStore.join(session.id, u4.user.id, u4.user.name)
    // 5th player
    const u5 = createUser(db, 'Lisa')
    const result = sessionStore.join(session.id, u5.user.id, u5.user.name)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('full')
  })

  test('cannot join same session twice', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    const result = sessionStore.join(session.id, u1.user.id, u1.user.name)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Already')
  })

  test('player count tracks correctly', async () => {
    const { sessionStore, adventure, u1, u2 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    expect(sessionStore.playerCount(session.id)).toBe(1)
    sessionStore.join(session.id, u2.user.id, u2.user.name)
    expect(sessionStore.playerCount(session.id)).toBe(2)
  })
})

describe('session leave', () => {
  test('player can leave', async () => {
    const { sessionStore, adventure, u1, u2 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.join(session.id, u2.user.id, u2.user.name)
    const result = sessionStore.leave(session.id, u2.user.id)
    expect(result.ok).toBe(true)
    expect(result.empty).toBe(false)
    expect(session.players.size).toBe(1)
  })

  test('last player leaving removes session', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    const result = sessionStore.leave(session.id, u1.user.id)
    expect(result.ok).toBe(true)
    expect(result.empty).toBe(true)
    expect(sessionStore.get(session.id)).toBeNull()
  })

  test('host leaving transfers host', async () => {
    const { sessionStore, adventure, u1, u2 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.join(session.id, u2.user.id, u2.user.name)
    sessionStore.leave(session.id, u1.user.id)
    expect(session.hostUserId).toBe(u2.user.id)
  })

  test('cannot leave nonexistent session', async () => {
    const { sessionStore, u1 } = await setup()
    const result = sessionStore.leave('nonexistent', u1.user.id)
    expect(result.ok).toBe(false)
  })
})

describe('role selection', () => {
  test('player can select role', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    const result = sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    expect(result.ok).toBe(true)
    expect(result.role.name).toBe('Explorer')
    expect(session.players.get(u1.user.id).role).toBe('explorer')
    expect(session.players.get(u1.user.id).ready).toBe(true)
  })

  test('cannot select taken role', async () => {
    const { sessionStore, adventure, u1, u2 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.join(session.id, u2.user.id, u2.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    const result = sessionStore.selectRole(session.id, u2.user.id, 'explorer')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('already taken')
  })

  test('cannot select invalid role', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    const result = sessionStore.selectRole(session.id, u1.user.id, 'nonexistent')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Invalid')
  })

  test('different players can pick different roles', async () => {
    const { sessionStore, adventure, u1, u2 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.join(session.id, u2.user.id, u2.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    const result = sessionStore.selectRole(session.id, u2.user.id, 'thinker')
    expect(result.ok).toBe(true)
    expect(session.players.get(u2.user.id).role).toBe('thinker')
  })
})

describe('session start', () => {
  test('host can start when all have roles', async () => {
    const { sessionStore, adventure, u1, u2 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.join(session.id, u2.user.id, u2.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    sessionStore.selectRole(session.id, u2.user.id, 'thinker')
    const result = sessionStore.start(session.id, u1.user.id)
    expect(result.ok).toBe(true)
    expect(session.phase).toBe('playing')
    expect(session.gameState).not.toBeNull()
  })

  test('game state has correct players', async () => {
    const { sessionStore, adventure, u1, u2 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.join(session.id, u2.user.id, u2.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    sessionStore.selectRole(session.id, u2.user.id, 'thinker')
    sessionStore.start(session.id, u1.user.id)

    const gs = session.gameState
    expect(gs.phase).toBe('playing')
    expect(Object.keys(gs.players)).toHaveLength(2)
    expect(gs.players[u1.user.id].role).toBe('explorer')
    expect(gs.players[u2.user.id].role).toBe('thinker')
  })

  test('game state has secret combo', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    sessionStore.start(session.id, u1.user.id)

    const gs = session.gameState
    expect(gs.secret.culprit).toBeTruthy()
    expect(gs.secret.hideout).toBeTruthy()
  })

  test('non-host cannot start', async () => {
    const { sessionStore, adventure, u1, u2 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.join(session.id, u2.user.id, u2.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    sessionStore.selectRole(session.id, u2.user.id, 'thinker')
    const result = sessionStore.start(session.id, u2.user.id)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('host')
  })

  test('cannot start without roles', async () => {
    const { sessionStore, adventure, u1, u2 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.join(session.id, u2.user.id, u2.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    // u2 has no role
    const result = sessionStore.start(session.id, u1.user.id)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('role')
  })

  test('cannot start already started session', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    sessionStore.start(session.id, u1.user.id)
    const result = sessionStore.start(session.id, u1.user.id)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('already started')
  })

  test('cannot join started session', async () => {
    const { sessionStore, adventure, u1, u2 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    sessionStore.start(session.id, u1.user.id)
    const result = sessionStore.join(session.id, u2.user.id, u2.user.name)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('already started')
  })

  test('single player can start', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    const result = sessionStore.start(session.id, u1.user.id)
    expect(result.ok).toBe(true)
    expect(Object.keys(session.gameState.players)).toHaveLength(1)
  })
})

describe('session list', () => {
  test('lists lobby and playing sessions', async () => {
    const { sessionStore, adventure, u1, u2 } = await setup()
    // Create one in lobby
    sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    // Create one and start it
    const s2 = sessionStore.create(adventure.id, adventure, u2.user.id, u2.user.name)
    sessionStore.selectRole(s2.id, u2.user.id, 'explorer')
    sessionStore.start(s2.id, u2.user.id)

    const list = sessionStore.list()
    expect(list.length).toBe(2)
  })

  test('list includes player names', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    const list = sessionStore.list()
    expect(list[0].players.some(p => p.name === 'Erik')).toBe(true)
  })
})

describe('getByPlayer', () => {
  test('finds session by player', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    const found = sessionStore.getByPlayer(u1.user.id)
    expect(found.id).toBe(session.id)
  })

  test('returns null if player not in any session', async () => {
    const { sessionStore, u2 } = await setup()
    expect(sessionStore.getByPlayer(u2.user.id)).toBeNull()
  })
})

describe('persistence', () => {
  test('session is persisted to db', async () => {
    const { db, sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    const row = db.query('SELECT * FROM sessions WHERE id = ?').get(session.id)
    expect(row).not.toBeNull()
    expect(row.adventure_id).toBe(adventure.id)
    expect(row.phase).toBe('lobby')
  })

  test('session players are persisted', async () => {
    const { db, sessionStore, adventure, u1, u2 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.join(session.id, u2.user.id, u2.user.name)
    const rows = db.query('SELECT * FROM session_players WHERE session_id = ?').all(session.id)
    expect(rows.length).toBe(2)
  })

  test('restore rebuilds session', async () => {
    const { db, sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')

    // Create new store (simulating server restart)
    const store2 = createSessionStore(db)
    const restored = store2.restore(session.id, adventure)
    expect(restored).not.toBeNull()
    expect(restored.id).toBe(session.id)
    expect(restored.phase).toBe('lobby')
    expect(restored.players.size).toBe(1)
  })

  test('removed session is deleted from db', async () => {
    const { db, sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.leave(session.id, u1.user.id)
    const row = db.query('SELECT * FROM sessions WHERE id = ?').get(session.id)
    expect(row).toBeNull()
  })
})
