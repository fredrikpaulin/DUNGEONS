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

  const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
  sessionStore.selectRole(session.id, u1.user.id, 'explorer')
  sessionStore.start(session.id, u1.user.id)
  sessionStore.movePlayer(session.id, u1.user.id, 'hub')
  sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')

  return { db, sessionStore, session, u1, adventure }
}

describe('reconnection', () => {
  test('buildRoomView works after session restore', async () => {
    const { db, sessionStore, session, u1, adventure } = await setup()

    // Simulate disconnect — create a new store (server restart)
    const store2 = createSessionStore(db)
    const restored = store2.restore(session.id, adventure)
    expect(restored).not.toBeNull()

    // Build room view for reconnected player
    const view = store2.buildRoomView(session.id, u1.user.id)
    expect(view).not.toBeNull()
    expect(view.room.id).toBe('mine_entrance')
    expect(view.player.name).toBe('Erik')
  })

  test('game state survives restore', async () => {
    const { db, sessionStore, session, u1, adventure } = await setup()
    const cluesBefore = session.gameState.cluesFound.length

    const store2 = createSessionStore(db)
    const restored = store2.restore(session.id, adventure)
    expect(restored.gameState.cluesFound.length).toBe(cluesBefore)
    expect(restored.gameState.players[u1.user.id].currentRoom).toBe('mine_entrance')
  })

  test('can continue playing after restore', async () => {
    const { db, sessionStore, session, u1, adventure } = await setup()

    const store2 = createSessionStore(db)
    store2.restore(session.id, adventure)

    // Player continues to play
    const result = store2.doChoice(session.id, u1.user.id, 'mine_look', 'careful', 'LOOK')
    expect(result.ok).toBe(true)
  })

  test('getByPlayer works after restore', async () => {
    const { db, sessionStore, session, u1, adventure } = await setup()

    const store2 = createSessionStore(db)
    store2.restore(session.id, adventure)

    const found = store2.getByPlayer(u1.user.id)
    expect(found).not.toBeNull()
    expect(found.id).toBe(session.id)
  })
})
