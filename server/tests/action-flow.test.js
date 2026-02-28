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

  const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
  sessionStore.join(session.id, u2.user.id, u2.user.name)
  sessionStore.selectRole(session.id, u1.user.id, 'explorer')
  sessionStore.selectRole(session.id, u2.user.id, 'thinker')
  sessionStore.start(session.id, u1.user.id)

  // Move to hub
  sessionStore.movePlayer(session.id, u1.user.id, 'hub')
  sessionStore.movePlayer(session.id, u2.user.id, 'hub')

  return { db, sessionStore, session, u1, u2, adventure }
}

describe('doChoice', () => {
  test('resolves a choice with approach and verb', async () => {
    const { sessionStore, session, u1 } = await setup()
    // Move to hub, choose hub_rest
    const result = sessionStore.doChoice(session.id, u1.user.id, 'hub_rest', 'careful', 'USE')
    expect(result.ok).toBe(true)
    expect(result.result.narrative).toBeTruthy()
  })

  test('returns updated room view', async () => {
    const { sessionStore, session, u1 } = await setup()
    const result = sessionStore.doChoice(session.id, u1.user.id, 'hub_rest', 'careful', 'USE')
    expect(result.roomView).not.toBeNull()
  })

  test('applies effects correctly', async () => {
    const { sessionStore, session, u1 } = await setup()
    // Move to mine_entrance
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    const weatherBefore = session.gameState.tracks.weather.value

    // mine_look costs weather -1
    const result = sessionStore.doChoice(session.id, u1.user.id, 'mine_look', 'careful', 'LOOK')
    expect(result.ok).toBe(true)
    expect(session.gameState.tracks.weather.value).toBe(weatherBefore - 1)
  })

  test('verb aptness is detected', async () => {
    const { sessionStore, session, u1 } = await setup()
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    // mine_look uses verb LOOK
    const result = sessionStore.doChoice(session.id, u1.user.id, 'mine_look', 'careful', 'LOOK')
    expect(result.result.verbApt).toBe(true)
  })

  test('wild approach can trigger complication', async () => {
    const { sessionStore, session, u1 } = await setup()
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    const result = sessionStore.doChoice(session.id, u1.user.id, 'mine_look', 'wild', 'LOOK')
    expect(result.ok).toBe(true)
    // Wild approach requiresComplication=true, so complication should fire
    expect(result.result.complication).not.toBeNull()
  })

  test('invalid choice returns error', async () => {
    const { sessionStore, session, u1 } = await setup()
    const result = sessionStore.doChoice(session.id, u1.user.id, 'nonexistent', 'careful', 'LOOK')
    expect(result.ok).toBe(false)
  })

  test('finaleReady flag set when conditions met', async () => {
    const { sessionStore, session, u1 } = await setup()
    // Force dungeon visits
    session.gameState = { ...session.gameState, dungeonsVisited: ['dungeon_a', 'dungeon_b'] }

    const result = sessionStore.doChoice(session.id, u1.user.id, 'hub_rest', 'careful', 'USE')
    expect(result.result.finaleReady).toBe(true)
  })
})

describe('concurrent actions', () => {
  test('two players act in different rooms', async () => {
    const { sessionStore, session, u1, u2 } = await setup()
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    sessionStore.movePlayer(session.id, u2.user.id, 'tower_base')

    // Both make choices
    const r1 = sessionStore.doChoice(session.id, u1.user.id, 'mine_look', 'careful', 'LOOK')
    const r2 = sessionStore.doChoice(session.id, u2.user.id, 'tower_search', 'careful', 'LOOK')

    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
  })

  test('shared state is consistent after concurrent actions', async () => {
    const { sessionStore, session, u1, u2 } = await setup()
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    sessionStore.movePlayer(session.id, u2.user.id, 'mine_entrance')

    // Both choose mine_look which costs weather -1
    const weatherBefore = session.gameState.tracks.weather.value
    sessionStore.doChoice(session.id, u1.user.id, 'mine_look', 'careful', 'LOOK')
    sessionStore.doChoice(session.id, u2.user.id, 'mine_look', 'careful', 'LOOK')

    // Weather should have decreased by 2
    expect(session.gameState.tracks.weather.value).toBe(weatherBefore - 2)
  })
})
