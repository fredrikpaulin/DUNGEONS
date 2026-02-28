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

describe('doFinale', () => {
  test('correct answer wins', async () => {
    const { sessionStore, session, u1 } = await setup()
    const culprit = session.gameState.secret.culprit
    const hideout = session.gameState.secret.hideout
    const result = sessionStore.doFinale(session.id, u1.user.id, culprit, hideout)
    expect(result.ok).toBe(true)
    expect(result.win).toBe(true)
    expect(result.correct.culprit).toBe(true)
    expect(result.correct.hideout).toBe(true)
    expect(result.epilogue.narrative).toBeTruthy()
  })

  test('incorrect answer loses', async () => {
    const { sessionStore, session, u1 } = await setup()
    const result = sessionStore.doFinale(session.id, u1.user.id, 'wrong', 'wrong')
    expect(result.ok).toBe(true)
    expect(result.win).toBe(false)
    expect(result.correct.culprit).toBe(false)
    expect(result.correct.hideout).toBe(false)
  })

  test('half correct loses', async () => {
    const { sessionStore, session, u1 } = await setup()
    const culprit = session.gameState.secret.culprit
    const result = sessionStore.doFinale(session.id, u1.user.id, culprit, 'wrong')
    expect(result.win).toBe(false)
    expect(result.correct.culprit).toBe(true)
    expect(result.correct.hideout).toBe(false)
  })

  test('session phase becomes ended', async () => {
    const { sessionStore, session, u1 } = await setup()
    sessionStore.doFinale(session.id, u1.user.id, 'wrong', 'wrong')
    expect(session.phase).toBe('ended')
    expect(session.gameState.phase).toBe('ended')
  })

  test('win epilogue matches secret combo', async () => {
    const { sessionStore, session, u1 } = await setup()
    const { culprit, hideout } = session.gameState.secret
    const result = sessionStore.doFinale(session.id, u1.user.id, culprit, hideout)
    expect(result.epilogue.type || 'win').toBeTruthy()
    expect(result.epilogue.narrative.length).toBeGreaterThan(0)
  })
})
