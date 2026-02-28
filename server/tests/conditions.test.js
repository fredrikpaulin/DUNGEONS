import { test, expect, describe } from 'bun:test'
import { addCondition, removeCondition, hasCondition, getConditionModifier, totalConditionModifier, canCure, applyCureRest, applyCureAllRest } from '../engine/conditions.js'
import { createPlayer, createGameState } from '../engine/state.js'

const miniStory = await Bun.file('./server/tests/fixtures/mini-story.json').json()
const combo = miniStory.secrets.combinations[0]

const mkPlayer = (conditions = []) => ({ ...createPlayer('p1', 'Erik', 'explorer', { str: 3, per: 2 }), conditions })

describe('addCondition', () => {
  test('adds a condition', () => {
    const p = addCondition(mkPlayer(), 'frozen')
    expect(p.conditions).toContain('frozen')
  })

  test('does not add duplicate', () => {
    const p = addCondition(mkPlayer(['frozen']), 'frozen')
    expect(p.conditions).toEqual(['frozen'])
  })

  test('adds multiple different conditions', () => {
    let p = addCondition(mkPlayer(), 'frozen')
    p = addCondition(p, 'blinded')
    expect(p.conditions).toEqual(['frozen', 'blinded'])
  })
})

describe('removeCondition', () => {
  test('removes a condition', () => {
    const p = removeCondition(mkPlayer(['frozen', 'blinded']), 'frozen')
    expect(p.conditions).toEqual(['blinded'])
  })

  test('no-op if condition not present', () => {
    const p = removeCondition(mkPlayer(['frozen']), 'blinded')
    expect(p.conditions).toEqual(['frozen'])
  })
})

describe('hasCondition', () => {
  test('returns true when present', () => {
    expect(hasCondition(mkPlayer(['frozen']), 'frozen')).toBe(true)
  })
  test('returns false when absent', () => {
    expect(hasCondition(mkPlayer(), 'frozen')).toBe(false)
  })
})

describe('getConditionModifier', () => {
  test('returns delta for matching stat', () => {
    expect(getConditionModifier('frozen', 'str', miniStory)).toBe(-1)
  })
  test('returns 0 for non-matching stat', () => {
    expect(getConditionModifier('frozen', 'per', miniStory)).toBe(0)
  })
  test('returns 0 for unknown condition', () => {
    expect(getConditionModifier('bogus', 'str', miniStory)).toBe(0)
  })
})

describe('totalConditionModifier', () => {
  test('sums modifiers from multiple conditions', () => {
    const p = mkPlayer(['frozen', 'scared'])
    // frozen: str -1, scared: cha -1
    expect(totalConditionModifier(p, 'str', miniStory)).toBe(-1)
    expect(totalConditionModifier(p, 'cha', miniStory)).toBe(-1)
    expect(totalConditionModifier(p, 'per', miniStory)).toBe(0)
  })
})

describe('canCure', () => {
  test('frozen is cured by rest', () => {
    expect(canCure('frozen', 'rest', miniStory)).toBe(true)
  })
  test('frozen is cured by item:torch', () => {
    expect(canCure('frozen', 'item:torch', miniStory)).toBe(true)
  })
  test('frozen is not cured by item:rope', () => {
    expect(canCure('frozen', 'item:rope', miniStory)).toBe(false)
  })
})

describe('applyCureRest', () => {
  test('removes oldest rest-curable condition', () => {
    const p = applyCureRest(mkPlayer(['frozen', 'blinded']), miniStory)
    expect(p.conditions).toEqual(['blinded'])
  })
  test('no-op when no conditions', () => {
    const p = applyCureRest(mkPlayer(), miniStory)
    expect(p.conditions).toEqual([])
  })
})

describe('applyCureAllRest', () => {
  test('cures one condition per player', () => {
    const players = {
      p1: mkPlayer(['frozen', 'blinded']),
      p2: mkPlayer(['scared'])
    }
    const state = { ...createGameState(miniStory, combo, players), players }
    const s = applyCureAllRest(state, miniStory)
    expect(s.players.p1.conditions).toEqual(['blinded'])
    expect(s.players.p2.conditions).toEqual([])
  })
})
