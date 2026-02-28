import { test, expect, describe } from 'bun:test'
import { createSessionStore } from '../sessions.js'
import { createAdventureStore } from '../adventures.js'
import { createDb } from '../db.js'
import { createUser } from '../users.js'

const fixturesDir = './server/tests/fixtures/adventures'

describe('full game integration', () => {
  test('complete game: create → lobby → play → explore → finale → end', async () => {
    const db = createDb()
    const adventureStore = await createAdventureStore(db, fixturesDir)
    const sessionStore = createSessionStore(db)
    const advList = adventureStore.list()
    const adventure = adventureStore.get(advList[0].id)

    // 1. Create users
    const u1 = createUser(db, 'Erik')
    const u2 = createUser(db, 'Maja')
    expect(u1.ok).toBe(true)
    expect(u2.ok).toBe(true)

    // 2. Create session
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    expect(session.phase).toBe('lobby')

    // 3. Join and select roles
    sessionStore.join(session.id, u2.user.id, u2.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    sessionStore.selectRole(session.id, u2.user.id, 'thinker')
    expect(session.players.size).toBe(2)

    // 4. Start game
    const startResult = sessionStore.start(session.id, u1.user.id)
    expect(startResult.ok).toBe(true)
    expect(session.phase).toBe('playing')

    // 5. Move to hub
    sessionStore.movePlayer(session.id, u1.user.id, 'hub')
    sessionStore.movePlayer(session.id, u2.user.id, 'hub')

    // 6. Players explore independently
    const move1 = sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    expect(move1.ok).toBe(true)
    expect(move1.roomView.room.zone).toBe('dungeon_a')

    const move2 = sessionStore.movePlayer(session.id, u2.user.id, 'tower_base')
    expect(move2.ok).toBe(true)
    expect(move2.roomView.room.zone).toBe('dungeon_b')

    // 7. Players are in different rooms
    const v1 = sessionStore.buildRoomView(session.id, u1.user.id)
    const v2 = sessionStore.buildRoomView(session.id, u2.user.id)
    expect(v1.room.id).toBe('mine_entrance')
    expect(v2.room.id).toBe('tower_base')
    expect(v1.others.length).toBe(0) // alone
    expect(v2.others.length).toBe(0) // alone

    // 8. Make choices
    const choice1 = sessionStore.doChoice(session.id, u1.user.id, 'mine_look', 'careful', 'LOOK')
    expect(choice1.ok).toBe(true)
    expect(choice1.result.verbApt).toBe(true) // LOOK matches mine_look's verb

    const choice2 = sessionStore.doChoice(session.id, u2.user.id, 'tower_search', 'careful', 'LOOK')
    expect(choice2.ok).toBe(true)

    // 9. Continue exploring
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_deep')
    sessionStore.movePlayer(session.id, u2.user.id, 'tower_top')

    // Both dungeons now visited
    expect(session.gameState.dungeonsVisited).toContain('dungeon_a')
    expect(session.gameState.dungeonsVisited).toContain('dungeon_b')

    // 10. Gather clues
    const clueCount = session.gameState.cluesFound.length + session.gameState.bonusCluesFound.length
    expect(clueCount).toBeGreaterThan(0)

    // 11. Return to hub
    sessionStore.movePlayer(session.id, u1.user.id, 'hub')
    sessionStore.movePlayer(session.id, u2.user.id, 'hub')

    // Both in hub now
    const hubView = sessionStore.buildRoomView(session.id, u1.user.id)
    expect(hubView.others.some(p => p.name === 'Maja')).toBe(true)

    // 12. Finale — correct answer
    const { culprit, hideout } = session.gameState.secret
    const finaleResult = sessionStore.doFinale(session.id, u1.user.id, culprit, hideout)
    expect(finaleResult.ok).toBe(true)
    expect(finaleResult.win).toBe(true)
    expect(session.phase).toBe('ended')
    expect(finaleResult.epilogue.narrative).toBeTruthy()
  })

  test('solo game playthrough', async () => {
    const db = createDb()
    const adventureStore = await createAdventureStore(db, fixturesDir)
    const sessionStore = createSessionStore(db)
    const advList = adventureStore.list()
    const adventure = adventureStore.get(advList[0].id)

    const u1 = createUser(db, 'Solo')
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'sneaker')
    sessionStore.start(session.id, u1.user.id)

    // Move through hub → mine → deep → hub → tower → top → hub → finale
    sessionStore.movePlayer(session.id, u1.user.id, 'hub')
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_entrance')
    sessionStore.movePlayer(session.id, u1.user.id, 'mine_deep')
    sessionStore.movePlayer(session.id, u1.user.id, 'hub')
    sessionStore.movePlayer(session.id, u1.user.id, 'tower_base')
    sessionStore.movePlayer(session.id, u1.user.id, 'tower_top')
    sessionStore.movePlayer(session.id, u1.user.id, 'hub')

    // All dungeons visited
    expect(session.gameState.dungeonsVisited).toContain('dungeon_a')
    expect(session.gameState.dungeonsVisited).toContain('dungeon_b')

    // Clues found
    const totalClues = session.gameState.cluesFound.length + session.gameState.bonusCluesFound.length
    expect(totalClues).toBeGreaterThan(0)

    // Wrong answer
    const wrongResult = sessionStore.doFinale(session.id, u1.user.id, 'wrong', 'wrong')
    expect(wrongResult.win).toBe(false)
    expect(session.phase).toBe('ended')
  })
})
