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

  const u1 = createUser(db, 'Erik')
  const u2 = createUser(db, 'Maja')

  return { db, sessionStore, adventureStore, adventure, u1, u2 }
}

describe('save/load', () => {
  test('session persists after creation', async () => {
    const { db, sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    const row = db.query('SELECT * FROM sessions WHERE id = ?').get(session.id)
    expect(row).not.toBeNull()
    expect(row.phase).toBe('lobby')
  })

  test('session persists after start', async () => {
    const { db, sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    sessionStore.start(session.id, u1.user.id)
    const row = db.query('SELECT * FROM sessions WHERE id = ?').get(session.id)
    expect(row.phase).toBe('playing')
  })

  test('game state is preserved in persistence', async () => {
    const { db, sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    sessionStore.start(session.id, u1.user.id)
    sessionStore.movePlayer(session.id, u1.user.id, 'hub')
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')

    const row = db.query('SELECT * FROM sessions WHERE id = ?').get(session.id)
    const stored = JSON.parse(row.state)
    expect(stored.gameState).not.toBeNull()
    expect(stored.gameState.players[u1.user.id].currentRoom).toBe('mine_entrance')
  })

  test('restore rebuilds game state correctly', async () => {
    const { db, sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    sessionStore.start(session.id, u1.user.id)
    sessionStore.movePlayer(session.id, u1.user.id, 'hub')
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')

    // Simulate restart
    const store2 = createSessionStore(db)
    const restored = store2.restore(session.id, adventure)

    expect(restored.phase).toBe('playing')
    expect(restored.gameState.players[u1.user.id].currentRoom).toBe('mine_entrance')
    expect(restored.gameState.secret.culprit).toBeTruthy()
  })

  test('explicit save updates db', async () => {
    const { db, sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    sessionStore.start(session.id, u1.user.id)
    sessionStore.movePlayer(session.id, u1.user.id, 'hub')

    // Mutate game state slightly
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    sessionStore.save(session.id)

    const row = db.query('SELECT * FROM sessions WHERE id = ?').get(session.id)
    const stored = JSON.parse(row.state)
    expect(stored.gameState.players[u1.user.id].currentRoom).toBe('mine_entrance')
  })

  test('session_players table updated', async () => {
    const { db, sessionStore, adventure, u1, u2 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.join(session.id, u2.user.id, u2.user.name)

    const rows = db.query('SELECT * FROM session_players WHERE session_id = ?').all(session.id)
    expect(rows.length).toBe(2)
    const names = rows.map(r => JSON.parse(r.player_data).userName)
    expect(names).toContain('Erik')
    expect(names).toContain('Maja')
  })

  test('deleted session removed from db', async () => {
    const { db, sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.leave(session.id, u1.user.id)

    const row = db.query('SELECT * FROM sessions WHERE id = ?').get(session.id)
    expect(row).toBeNull()
    const playerRows = db.query('SELECT * FROM session_players WHERE session_id = ?').all(session.id)
    expect(playerRows.length).toBe(0)
  })

  test('save returns false for nonexistent session', async () => {
    const { sessionStore } = await setup()
    expect(sessionStore.save('nonexistent')).toBe(false)
  })

  test('restore returns null for nonexistent session', async () => {
    const { sessionStore, adventure } = await setup()
    const store2 = createSessionStore(createDb())
    expect(store2.restore('nonexistent', adventure)).toBeNull()
  })
})
