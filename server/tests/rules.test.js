import { test, expect, describe } from 'bun:test'
import { meetsRequirement, meetsItemRequirement, meetsRevealCondition, isChoiceRevealed, getAvailableChoices, getChoicesWithStatus, resolveApproach, checkVerbAptness, resolveChoice } from '../engine/rules.js'
import { createPlayer, createGameState } from '../engine/state.js'

const miniStory = await Bun.file('./server/tests/fixtures/mini-story.json').json()
const combo = miniStory.secrets.combinations[0]

const mkPlayer = (overrides = {}) => ({
  ...createPlayer('p1', 'Erik', 'explorer', { str: 3, per: 2, cha: 1, cun: 0 }, 'scout'),
  ...overrides
})

const mkState = (cluesFound = []) => ({
  ...createGameState(miniStory, combo, { p1: mkPlayer() }),
  cluesFound,
  bonusCluesFound: []
})

describe('meetsRequirement', () => {
  test('returns true when no requirement', () => {
    const choice = { requires: null }
    expect(meetsRequirement(mkPlayer(), choice, miniStory)).toBe(true)
  })

  test('returns true when stat meets min', () => {
    const choice = { requires: { stat: 'str', min: 2 } }
    expect(meetsRequirement(mkPlayer(), choice, miniStory)).toBe(true)
  })

  test('returns false when stat below min', () => {
    const choice = { requires: { stat: 'cun', min: 1 } }
    expect(meetsRequirement(mkPlayer(), choice, miniStory)).toBe(false)
  })

  test('considers condition modifiers', () => {
    const choice = { requires: { stat: 'str', min: 3 } }
    const player = mkPlayer({ conditions: ['frozen'] }) // str -1 → effective 2
    expect(meetsRequirement(player, choice, miniStory)).toBe(false)
  })
})

describe('meetsItemRequirement', () => {
  test('returns true when no item required', () => {
    expect(meetsItemRequirement(mkPlayer(), { requiresItem: null })).toBe(true)
  })

  test('returns true when player has item', () => {
    expect(meetsItemRequirement(mkPlayer({ items: ['rope'] }), { requiresItem: 'rope' })).toBe(true)
  })

  test('returns false when player lacks item', () => {
    expect(meetsItemRequirement(mkPlayer(), { requiresItem: 'rope' })).toBe(false)
  })
})

describe('meetsRevealCondition', () => {
  test('clue:N checks total clues found', () => {
    const state = mkState(['K1', 'K2', 'K3', 'K4'])
    expect(meetsRevealCondition(state, 'clue:4')).toBe(true)
    expect(meetsRevealCondition(state, 'clue:5')).toBe(false)
  })

  test('npc:id checks visit count > 0', () => {
    const state = { ...mkState(), npcState: { elder: { visits: 1, revealed: [] } } }
    expect(meetsRevealCondition(state, 'npc:elder')).toBe(true)
    expect(meetsRevealCondition({ ...state, npcState: { elder: { visits: 0, revealed: [] } } }, 'npc:elder')).toBe(false)
  })

  test('visit:N checks hub visits', () => {
    const state = { ...mkState(), hubVisits: 2 }
    expect(meetsRevealCondition(state, 'visit:2')).toBe(true)
    expect(meetsRevealCondition(state, 'visit:3')).toBe(false)
  })

  test('returns true for null/undefined condition', () => {
    expect(meetsRevealCondition(mkState(), null)).toBe(true)
    expect(meetsRevealCondition(mkState(), undefined)).toBe(true)
  })
})

describe('isChoiceRevealed', () => {
  test('returns true when no revealAfter', () => {
    expect(isChoiceRevealed({}, mkState())).toBe(true)
  })

  test('returns true when all conditions met', () => {
    const choice = { revealAfter: ['clue:2'] }
    const state = mkState(['K1', 'K2'])
    expect(isChoiceRevealed(choice, state)).toBe(true)
  })

  test('returns false when condition not met', () => {
    const choice = { revealAfter: ['clue:4'] }
    expect(isChoiceRevealed(choice, mkState(['K1']))).toBe(false)
  })
})

describe('getAvailableChoices', () => {
  test('filters by stat requirement', () => {
    const room = miniStory.rooms.mine_entrance
    const player = mkPlayer() // str: 3, per: 2
    const choices = getAvailableChoices(room, player, mkState(), miniStory)
    expect(choices.length).toBeGreaterThan(0)
  })

  test('filters by item requirement', () => {
    const room = miniStory.rooms.tower_base
    // tower_climb requires rope
    const playerNoRope = mkPlayer()
    const playerWithRope = mkPlayer({ items: ['rope'] })
    const choicesNo = getAvailableChoices(room, playerNoRope, mkState(), miniStory)
    const choicesYes = getAvailableChoices(room, playerWithRope, mkState(), miniStory)
    expect(choicesNo.find(c => c.id === 'tower_climb')).toBeUndefined()
    expect(choicesYes.find(c => c.id === 'tower_climb')).toBeDefined()
  })
})

describe('resolveApproach', () => {
  test('brave costs mod', () => {
    const choice = { effects: [], target: 'mine_deep' }
    const result = resolveApproach(choice, 'brave', miniStory)
    const modEffect = result.effects.find(e => e.type === 'token' && e.token === 'mod')
    expect(modEffect.delta).toBe(-1)
    expect(result.complication).toBe(false)
  })

  test('wild gains mod and requires complication', () => {
    const choice = { effects: [], target: 'mine_deep' }
    const result = resolveApproach(choice, 'wild', miniStory)
    const modEffect = result.effects.find(e => e.type === 'token' && e.token === 'mod')
    expect(modEffect.delta).toBe(1)
    expect(result.complication).toBe(true)
  })

  test('careful has no extra effects', () => {
    const choice = { effects: [{ type: 'track', track: 'noise', delta: 1 }], target: 'mine_deep' }
    const result = resolveApproach(choice, 'careful', miniStory)
    expect(result.effects).toHaveLength(1) // just the base choice effect
    expect(result.complication).toBe(false)
  })
})

describe('checkVerbAptness', () => {
  test('returns true when verb matches', () => {
    expect(checkVerbAptness({ verb: 'LOOK' }, 'LOOK')).toBe(true)
    expect(checkVerbAptness({ verb: 'LOOK' }, 'look')).toBe(true)
  })

  test('returns false when verb does not match', () => {
    expect(checkVerbAptness({ verb: 'LOOK' }, 'TALK')).toBe(false)
  })

  test('returns false when no verb on choice', () => {
    expect(checkVerbAptness({}, 'LOOK')).toBe(false)
  })
})

describe('resolveChoice', () => {
  test('resolves a full choice with approach and verb', () => {
    const room = miniStory.rooms.mine_entrance
    const state = mkState()
    const result = resolveChoice(state, room, 'mine_look', 'brave', 'LOOK', miniStory)
    expect(result).not.toBeNull()
    expect(result.narrative).toContain('scratch marks')
    expect(result.verbApt).toBe(true)
  })

  test('returns null for unknown choice id', () => {
    const room = miniStory.rooms.mine_entrance
    expect(resolveChoice(mkState(), room, 'bogus', 'brave', null, miniStory)).toBeNull()
  })
})
