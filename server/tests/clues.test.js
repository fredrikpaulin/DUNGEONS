import { test, expect, describe } from 'bun:test'
import { selectClue, isClueFound, getClueDetail, clueSummary } from '../engine/clues.js'
import { createPlayer, createGameState } from '../engine/state.js'

const miniStory = await Bun.file('./server/tests/fixtures/mini-story.json').json()
const combo = miniStory.secrets.combinations[0] // goblin + dungeon_a

const mkState = (cluesFound = []) => ({
  ...createGameState(miniStory, combo, {}),
  cluesFound,
  bonusCluesFound: []
})

describe('selectClue', () => {
  test('selects assigned clue for room', () => {
    const room = miniStory.rooms.mine_entrance
    const state = mkState()
    // combo assigns K1 to mine_entrance
    const clueId = selectClue(room, state, miniStory)
    expect(clueId).toBe('K1')
  })

  test('skips already-found assigned clue, picks next from pool', () => {
    const room = miniStory.rooms.mine_entrance
    const state = mkState(['K1'])
    const clueId = selectClue(room, state, miniStory)
    // K1 already found, should pick next from pool [K1, K2, K5]
    expect(clueId).toBe('K2')
  })

  test('returns null when all pool clues found', () => {
    const room = miniStory.rooms.mine_entrance
    const state = mkState(['K1', 'K2', 'K5'])
    const clueId = selectClue(room, state, miniStory)
    expect(clueId).toBeNull()
  })

  test('returns null for room with no clue', () => {
    const room = miniStory.rooms.hub
    const state = mkState()
    expect(selectClue(room, state, miniStory)).toBeNull()
  })
})

describe('isClueFound', () => {
  test('checks core clues', () => {
    const state = mkState(['K1'])
    expect(isClueFound(state, 'K1')).toBe(true)
    expect(isClueFound(state, 'K2')).toBe(false)
  })

  test('checks bonus clues', () => {
    const state = { ...mkState(), bonusCluesFound: ['B1'] }
    expect(isClueFound(state, 'B1')).toBe(true)
  })
})

describe('getClueDetail', () => {
  test('returns core clue with type', () => {
    const clue = getClueDetail(miniStory, 'K1')
    expect(clue.id).toBe('K1')
    expect(clue.type).toBe('core')
    expect(clue.text).toContain('Footprints')
  })

  test('returns bonus clue with type', () => {
    const clue = getClueDetail(miniStory, 'B1')
    expect(clue.type).toBe('bonus')
  })

  test('returns null for unknown clue', () => {
    expect(getClueDetail(miniStory, 'X99')).toBeNull()
  })
})

describe('clueSummary', () => {
  test('returns summary of found clues', () => {
    const state = { ...mkState(['K1', 'K3']), bonusCluesFound: ['B1'] }
    const summary = clueSummary(state, miniStory)
    expect(summary.core).toHaveLength(2)
    expect(summary.bonus).toHaveLength(1)
    expect(summary.total).toBe(3)
  })
})
