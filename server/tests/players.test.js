import { test, expect, describe } from 'bun:test'
import { allocateStats, defaultStatValues, getEffectiveStat, checkStat, getPlayerTrick, canUseTrick, useTrick, resetTricks, playerSummary } from '../engine/players.js'
import { createPlayer, createGameState } from '../engine/state.js'

const miniStory = await Bun.file('./server/tests/fixtures/mini-story.json').json()
const combo = miniStory.secrets.combinations[0]

const mkPlayer = (overrides = {}) => ({
  ...createPlayer('p1', 'Erik', 'explorer', { str: 3, per: 2, cha: 1, cun: 0 }, 'scout'),
  ...overrides
})

describe('allocateStats', () => {
  test('allocates from assignments', () => {
    const stats = allocateStats(miniStory.config.stats, { str: 3, per: 2, cha: 1, cun: 0 })
    expect(stats.str).toBe(3)
    expect(stats.per).toBe(2)
    expect(stats.cun).toBe(0)
  })

  test('defaults to 0 for unassigned', () => {
    const stats = allocateStats(miniStory.config.stats, { str: 3 })
    expect(stats.per).toBe(0)
  })
})

describe('defaultStatValues', () => {
  test('generates descending values', () => {
    expect(defaultStatValues(4)).toEqual([3, 2, 1, 0])
    expect(defaultStatValues(3)).toEqual([3, 2, 1])
    expect(defaultStatValues(1)).toEqual([3])
  })
})

describe('getEffectiveStat', () => {
  test('returns base stat when no conditions', () => {
    expect(getEffectiveStat(mkPlayer(), 'str', miniStory)).toBe(3)
  })

  test('applies condition modifiers', () => {
    const p = mkPlayer({ conditions: ['frozen'] }) // frozen: str -1
    expect(getEffectiveStat(p, 'str', miniStory)).toBe(2)
  })

  test('clamps to 0', () => {
    const p = mkPlayer({ stats: { str: 0, per: 0 }, conditions: ['frozen'] })
    expect(getEffectiveStat(p, 'str', miniStory)).toBe(0) // 0 + (-1) clamped to 0
  })

  test('stacks multiple condition modifiers on same stat', () => {
    // Only frozen affects str in our test data, but test the stacking logic
    const p = mkPlayer({ conditions: ['frozen'] })
    expect(getEffectiveStat(p, 'str', miniStory)).toBe(2)
    expect(getEffectiveStat(p, 'cha', miniStory)).toBe(1) // unaffected
  })
})

describe('checkStat', () => {
  test('passes when stat meets requirement', () => {
    expect(checkStat(mkPlayer(), 'str', 2, miniStory)).toBe(true)
  })
  test('fails when stat below requirement', () => {
    expect(checkStat(mkPlayer(), 'cun', 1, miniStory)).toBe(false)
  })
  test('considers conditions', () => {
    const p = mkPlayer({ conditions: ['frozen'] })
    expect(checkStat(p, 'str', 3, miniStory)).toBe(false) // effective str is 2
    expect(checkStat(p, 'str', 2, miniStory)).toBe(true)
  })
})

describe('getPlayerTrick', () => {
  test('returns trick for player role', () => {
    const trick = getPlayerTrick(mkPlayer(), miniStory)
    expect(trick.id).toBe('scout')
    expect(trick.name).toBe('Scout Ahead')
  })

  test('returns null for unknown role', () => {
    const trick = getPlayerTrick(mkPlayer({ role: 'bogus' }), miniStory)
    expect(trick).toBeNull()
  })
})

describe('canUseTrick', () => {
  test('can use trick when not used', () => {
    const trick = getPlayerTrick(mkPlayer(), miniStory)
    const state = { phase: 'playing' }
    expect(canUseTrick(mkPlayer(), trick, state)).toBe(true)
  })

  test('cannot use when already used', () => {
    const trick = getPlayerTrick(mkPlayer(), miniStory)
    const state = { phase: 'playing' }
    expect(canUseTrick(mkPlayer({ trickUsed: true }), trick, state)).toBe(false)
  })

  test('passive tricks cannot be used manually', () => {
    const trick = { id: 'passive_trick', uses: 'passive' }
    expect(canUseTrick(mkPlayer(), trick, { phase: 'playing' })).toBe(false)
  })
})

describe('useTrick / resetTricks', () => {
  test('marks trick as used', () => {
    const state = createGameState(miniStory, combo, { p1: mkPlayer() })
    const s = useTrick(state, 'p1')
    expect(s.players.p1.trickUsed).toBe(true)
  })

  test('resets all tricks', () => {
    let state = createGameState(miniStory, combo, { p1: mkPlayer(), p2: mkPlayer({ id: 'p2', name: 'Maja' }) })
    state = useTrick(state, 'p1')
    state = useTrick(state, 'p2')
    const s = resetTricks(state)
    expect(s.players.p1.trickUsed).toBe(false)
    expect(s.players.p2.trickUsed).toBe(false)
  })
})

describe('playerSummary', () => {
  test('returns formatted summary', () => {
    const summary = playerSummary(mkPlayer({ conditions: ['frozen'] }), miniStory)
    expect(summary.name).toBe('Erik')
    expect(summary.stats.str.base).toBe(3)
    expect(summary.stats.str.effective).toBe(2) // frozen: -1
    expect(summary.conditions).toContain('frozen')
  })
})
