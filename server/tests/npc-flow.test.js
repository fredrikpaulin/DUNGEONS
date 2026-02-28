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

  return { db, sessionStore, session, u1, adventure }
}

describe('NPC flow', () => {
  test('hub room view lists NPCs', async () => {
    const { sessionStore, session, u1 } = await setup()
    const view = sessionStore.buildRoomView(session.id, u1.user.id)
    expect(view.npcsHere.length).toBe(3) // elder, goblin, raven
    expect(view.npcsHere.some(n => n.name === 'Elder Oak')).toBe(true)
    expect(view.npcsHere.some(n => n.name === 'Grix the Goblin')).toBe(true)
  })

  test('non-hub rooms have no NPCs', async () => {
    const { sessionStore, session, u1 } = await setup()
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    const view = sessionStore.buildRoomView(session.id, u1.user.id)
    expect(view.npcsHere.length).toBe(0)
  })

  test('NPC state tracks visits', async () => {
    const { sessionStore, session, u1 } = await setup()
    expect(session.gameState.npcState.elder.visits).toBe(0)
  })
})
