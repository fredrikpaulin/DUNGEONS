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

  // Create session, assign roles, start
  const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
  sessionStore.join(session.id, u2.user.id, u2.user.name)
  sessionStore.selectRole(session.id, u1.user.id, 'explorer')
  sessionStore.selectRole(session.id, u2.user.id, 'thinker')
  sessionStore.start(session.id, u1.user.id)

  // Move both players to hub (start room)
  sessionStore.movePlayer(session.id, u1.user.id, 'hub')
  sessionStore.movePlayer(session.id, u2.user.id, 'hub')

  return { db, sessionStore, session, u1, u2, adventure }
}

describe('movePlayer', () => {
  test('player can move to adjacent room', async () => {
    const { sessionStore, session, u1 } = await setup()
    const result = sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    expect(result.ok).toBe(true)
    expect(result.newRoom).toBe('mine_entrance')
    expect(result.prevRoom).toBe('hub')
  })

  test('player cannot move to non-adjacent room', async () => {
    const { sessionStore, session, u1 } = await setup()
    const result = sessionStore.movePlayer(session.id, u1.user.id, 'mine_deep')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Cannot reach')
  })

  test('player cannot move to unknown room', async () => {
    const { sessionStore, session, u1 } = await setup()
    const result = sessionStore.movePlayer(session.id, u1.user.id, 'nonexistent')
    expect(result.ok).toBe(false)
  })

  test('returns room view after move', async () => {
    const { sessionStore, session, u1 } = await setup()
    const result = sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    expect(result.roomView).not.toBeNull()
    expect(result.roomView.room.id).toBe('mine_entrance')
    expect(result.roomView.room.name).toBe('Mine Entrance')
  })

  test('two players can be in different rooms', async () => {
    const { sessionStore, session, u1, u2 } = await setup()
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    sessionStore.movePlayer(session.id, u2.user.id, 'tower_base')

    const v1 = sessionStore.buildRoomView(session.id, u1.user.id)
    const v2 = sessionStore.buildRoomView(session.id, u2.user.id)

    expect(v1.room.id).toBe('mine_entrance')
    expect(v2.room.id).toBe('tower_base')
  })

  test('players in same room see each other', async () => {
    const { sessionStore, session, u1, u2 } = await setup()
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    sessionStore.movePlayer(session.id, u2.user.id, 'mine_entrance')

    const v1 = sessionStore.buildRoomView(session.id, u1.user.id)
    expect(v1.others.some(p => p.name === 'Maja')).toBe(true)
  })

  test('players in different rooms do not see each other', async () => {
    const { sessionStore, session, u1, u2 } = await setup()
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    // u2 stays in hub

    const v1 = sessionStore.buildRoomView(session.id, u1.user.id)
    expect(v1.others.some(p => p.name === 'Maja')).toBe(false)
  })

  test('records dungeon zone visit', async () => {
    const { sessionStore, session, u1 } = await setup()
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    expect(session.gameState.dungeonsVisited).toContain('dungeon_a')
  })

  test('move returns events (narratives)', async () => {
    const { sessionStore, session, u1 } = await setup()
    const result = sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    // mine_entrance has onEnter narrative
    const narratives = (result.events || []).filter(e => e.type === 'narrative')
    expect(narratives.length).toBeGreaterThan(0)
  })
})

describe('buildRoomView', () => {
  test('contains room info', async () => {
    const { sessionStore, session, u1 } = await setup()
    const view = sessionStore.buildRoomView(session.id, u1.user.id)
    expect(view.room.id).toBe('hub')
    expect(view.room.name).toBeTruthy()
    expect(view.room.narrative).toBeTruthy()
  })

  test('contains choices with availability', async () => {
    const { sessionStore, session, u1 } = await setup()
    const view = sessionStore.buildRoomView(session.id, u1.user.id)
    expect(Array.isArray(view.choices)).toBe(true)
  })

  test('contains exits', async () => {
    const { sessionStore, session, u1 } = await setup()
    const view = sessionStore.buildRoomView(session.id, u1.user.id)
    expect(view.exits.length).toBeGreaterThan(0)
  })

  test('contains player stats', async () => {
    const { sessionStore, session, u1 } = await setup()
    const view = sessionStore.buildRoomView(session.id, u1.user.id)
    expect(view.player.name).toBe('Erik')
    expect(view.player.role).toBe('explorer')
    expect(view.player.stats).toBeTruthy()
  })

  test('contains tracks', async () => {
    const { sessionStore, session, u1 } = await setup()
    const view = sessionStore.buildRoomView(session.id, u1.user.id)
    expect(view.tracks.length).toBeGreaterThan(0)
    expect(view.tracks[0].id).toBeTruthy()
    expect(typeof view.tracks[0].value).toBe('number')
  })

  test('contains tokens', async () => {
    const { sessionStore, session, u1 } = await setup()
    const view = sessionStore.buildRoomView(session.id, u1.user.id)
    expect(view.tokens).toBeTruthy()
  })

  test('contains clue summary', async () => {
    const { sessionStore, session, u1 } = await setup()
    const view = sessionStore.buildRoomView(session.id, u1.user.id)
    expect(view.clues).toBeTruthy()
    expect(typeof view.clues.total).toBe('number')
  })

  test('hub shows NPCs', async () => {
    const { sessionStore, session, u1 } = await setup()
    const view = sessionStore.buildRoomView(session.id, u1.user.id)
    expect(view.npcsHere.length).toBeGreaterThan(0)
    expect(view.npcsHere[0].name).toBeTruthy()
  })

  test('returns null for invalid session', async () => {
    const { sessionStore, u1 } = await setup()
    const view = sessionStore.buildRoomView('nonexistent', u1.user.id)
    expect(view).toBeNull()
  })
})
