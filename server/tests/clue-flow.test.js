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

  // Move to hub
  sessionStore.movePlayer(session.id, u1.user.id, 'hub')

  return { db, sessionStore, session, u1, adventure }
}

describe('clue flow', () => {
  test('clue assigned on entering room with clue config', async () => {
    const { sessionStore, session, u1 } = await setup()
    const cluesBefore = session.gameState.cluesFound.length + session.gameState.bonusCluesFound.length

    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')

    const cluesAfter = session.gameState.cluesFound.length + session.gameState.bonusCluesFound.length
    expect(cluesAfter).toBeGreaterThan(cluesBefore)
  })

  test('clue appears in events', async () => {
    const { sessionStore, session, u1 } = await setup()
    const result = sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    const clueEvents = (result.events || []).filter(e => e.type === 'clue')
    expect(clueEvents.length).toBeGreaterThan(0)
    expect(clueEvents[0].clue.text).toBeTruthy()
  })

  test('room view shows clue count', async () => {
    const { sessionStore, session, u1 } = await setup()
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    const view = sessionStore.buildRoomView(session.id, u1.user.id)
    expect(view.clues.total).toBeGreaterThan(0)
  })

  test('visiting multiple rooms accumulates clues', async () => {
    const { sessionStore, session, u1 } = await setup()
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    const after1 = session.gameState.cluesFound.length + session.gameState.bonusCluesFound.length

    // Go back to hub, then to tower
    sessionStore.movePlayer(session.id, u1.user.id, 'hub')
    sessionStore.movePlayer(session.id, u1.user.id, 'tower_base')
    const after2 = session.gameState.cluesFound.length + session.gameState.bonusCluesFound.length

    expect(after2).toBeGreaterThan(after1)
  })

  test('no duplicate clues on revisit', async () => {
    const { sessionStore, session, u1 } = await setup()
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    const clues1 = [...session.gameState.cluesFound]

    // Return and revisit
    sessionStore.movePlayer(session.id, u1.user.id, 'hub')
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')

    // Should get a different clue or no additional clue from same pool
    const uniqueClues = new Set(session.gameState.cluesFound)
    expect(uniqueClues.size).toBe(session.gameState.cluesFound.length)
  })

  test('hub room gives no clues', async () => {
    const { sessionStore, session, u1 } = await setup()
    const cluesBefore = session.gameState.cluesFound.length
    // Already in hub, move away and back
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    const cluesAfterMine = session.gameState.cluesFound.length
    sessionStore.movePlayer(session.id, u1.user.id, 'hub')
    const cluesAfterHub = session.gameState.cluesFound.length

    // Clues should increase at mine but not at hub
    expect(cluesAfterMine).toBeGreaterThan(cluesBefore)
    expect(cluesAfterHub).toBe(cluesAfterMine)
  })
})
