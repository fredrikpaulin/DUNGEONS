import { test, expect, describe } from 'bun:test'
import { autoSelectClue, autoSelectComplication, autoNpcScene, guideSummary } from '../engine/auto-guide.js'
import { createPlayer, createGameState } from '../engine/state.js'

const miniStory = await Bun.file('./server/tests/fixtures/mini-story.json').json()
const goblinCombo = miniStory.secrets.combinations[0]
const ravenCombo = miniStory.secrets.combinations[1]

const mkState = (combo = goblinCombo) => createGameState(miniStory, combo, {
  p1: createPlayer('p1', 'Erik', 'explorer', { str: 3 }),
  p2: createPlayer('p2', 'Maja', 'thinker', { per: 3 })
})

describe('autoSelectClue', () => {
  test('selects assigned clue for room', () => {
    const room = miniStory.rooms.mine_entrance
    const clueId = autoSelectClue(room, mkState(), miniStory)
    expect(clueId).toBe('K1') // goblin combo assigns K1 to mine_entrance
  })

  test('selects different clue with different combo', () => {
    const room = miniStory.rooms.mine_entrance
    const clueId = autoSelectClue(room, mkState(ravenCombo), miniStory)
    expect(clueId).toBe('K5') // raven combo assigns K5 to mine_entrance
  })
})

describe('autoSelectComplication', () => {
  test('selects a complication avoiding history', () => {
    const state = mkState()
    const comp = autoSelectComplication('small', state, miniStory)
    expect(comp).not.toBeNull()
    expect(comp.size).toBe('small')
  })

  test('avoids recently used', () => {
    const state = { ...mkState(), complicationHistory: [{ id: 1, turn: 0 }] }
    const comp = autoSelectComplication('small', state, miniStory)
    expect(comp.id).not.toBe(1)
  })
})

describe('autoNpcScene', () => {
  test('returns guilty variant scene', () => {
    const goblin = miniStory.npcs.find(n => n.id === 'goblin')
    const scene = autoNpcScene(goblin, 1, mkState(goblinCombo))
    expect(scene.narrative).toContain('sweats')
  })

  test('returns innocent variant scene', () => {
    const goblin = miniStory.npcs.find(n => n.id === 'goblin')
    const scene = autoNpcScene(goblin, 1, mkState(ravenCombo))
    expect(scene.narrative).toContain('waves cheerfully')
  })
})

describe('guideSummary', () => {
  test('returns complete summary', () => {
    const state = { ...mkState(), cluesFound: ['K1', 'K2'], dungeonsVisited: ['dungeon_a'] }
    const summary = guideSummary(state, miniStory)
    expect(summary.culprit).toBe('goblin')
    expect(summary.hideout).toBe('dungeon_a')
    expect(summary.cluesFound).toHaveLength(2)
    expect(summary.npcs).toHaveLength(3)
    expect(summary.playerCount).toBe(2)
    expect(summary.dungeonsVisited).toContain('dungeon_a')
  })
})
