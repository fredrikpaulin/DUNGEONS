import { test, expect, describe } from 'bun:test'
import { applyEffect, applyEffects } from '../engine/effects.js'
import { createPlayer, createGameState } from '../engine/state.js'

const miniStory = await Bun.file('./server/tests/fixtures/mini-story.json').json()
const combo = miniStory.secrets.combinations[0]

const mkState = () => createGameState(miniStory, combo, {
  p1: createPlayer('p1', 'Erik', 'explorer', { str: 3, per: 2 }, 'scout'),
  p2: createPlayer('p2', 'Maja', 'thinker', { str: 1, per: 3 }, 'analyze')
})

describe('track effect', () => {
  test('applies track delta', () => {
    const s = applyEffect(mkState(), { type: 'track', track: 'weather', delta: -1 }, miniStory)
    expect(s.tracks.weather.value).toBe(5)
  })
})

describe('token effect', () => {
  test('applies token delta', () => {
    const s = applyEffect(mkState(), { type: 'token', token: 'mod', delta: -2 }, miniStory)
    expect(s.tokens.mod).toBe(3)
  })
})

describe('condition effect', () => {
  test('adds condition to acting player (self)', () => {
    const s = applyEffect(mkState(), { type: 'condition', condition: 'frozen', action: 'add', target: 'self' }, miniStory, { playerId: 'p1' })
    expect(s.players.p1.conditions).toContain('frozen')
    expect(s.players.p2.conditions).not.toContain('frozen')
  })

  test('removes condition from player', () => {
    let state = mkState()
    state = applyEffect(state, { type: 'condition', condition: 'frozen', action: 'add', target: 'self' }, miniStory, { playerId: 'p1' })
    const s = applyEffect(state, { type: 'condition', condition: 'frozen', action: 'remove', target: 'self' }, miniStory, { playerId: 'p1' })
    expect(s.players.p1.conditions).not.toContain('frozen')
  })

  test('adds condition to all players via applyEffects', () => {
    const s = applyEffects(mkState(), [{ type: 'condition', condition: 'frozen', action: 'add', target: 'all' }], miniStory)
    expect(s.players.p1.conditions).toContain('frozen')
    expect(s.players.p2.conditions).toContain('frozen')
  })
})

describe('item effect', () => {
  test('draws items from pool to acting player', () => {
    const s = applyEffect(mkState(), { type: 'item', action: 'draw', count: 2 }, miniStory, { playerId: 'p1' })
    expect(s.players.p1.items).toHaveLength(2)
    expect(s.itemPool).toHaveLength(4)
  })

  test('adds specific item to acting player', () => {
    const s = applyEffect(mkState(), { type: 'item', action: 'add', id: 'key' }, miniStory, { playerId: 'p1' })
    expect(s.players.p1.items).toContain('key')
  })

  test('loses item from player', () => {
    let state = mkState()
    state = applyEffect(state, { type: 'item', action: 'add', id: 'torch' }, miniStory, { playerId: 'p1' })
    const s = applyEffect(state, { type: 'item', action: 'lose', id: 'torch', target: 'self' }, miniStory, { playerId: 'p1' })
    expect(s.players.p1.items).not.toContain('torch')
  })
})

describe('clue effect', () => {
  test('adds core clue', () => {
    const s = applyEffect(mkState(), { type: 'clue', action: 'core', id: 'K1' }, miniStory)
    expect(s.cluesFound).toContain('K1')
  })

  test('adds bonus clue', () => {
    const s = applyEffect(mkState(), { type: 'clue', action: 'bonus', id: 'B1' }, miniStory)
    expect(s.bonusCluesFound).toContain('B1')
  })

  test('does not duplicate clues', () => {
    let state = mkState()
    state = applyEffect(state, { type: 'clue', action: 'core', id: 'K1' }, miniStory)
    state = applyEffect(state, { type: 'clue', action: 'core', id: 'K1' }, miniStory)
    expect(state.cluesFound).toEqual(['K1'])
  })
})

describe('narrative effect', () => {
  test('adds log entry', () => {
    const s = applyEffect(mkState(), { type: 'narrative', text: 'Something happens.' }, miniStory)
    expect(s.log).toHaveLength(1)
    expect(s.log[0].text).toBe('Something happens.')
  })
})

describe('goto effect', () => {
  test('sets pending goto', () => {
    const s = applyEffect(mkState(), { type: 'goto', target: 'mine_deep' }, miniStory)
    expect(s._pendingGoto).toBe('mine_deep')
  })
})

describe('complication effect', () => {
  test('sets pending complication', () => {
    const s = applyEffect(mkState(), { type: 'complication', size: 'large' }, miniStory)
    expect(s._pendingComplication).toBe('large')
  })
})

describe('npc_reveal effect', () => {
  test('reveals NPC info', () => {
    const s = applyEffect(mkState(), { type: 'npc_reveal', npc: 'goblin', info: 'alibi' }, miniStory)
    expect(s.npcState.goblin.revealed).toContain('alibi')
  })

  test('does not duplicate reveals', () => {
    let state = mkState()
    state = applyEffect(state, { type: 'npc_reveal', npc: 'goblin', info: 'alibi' }, miniStory)
    state = applyEffect(state, { type: 'npc_reveal', npc: 'goblin', info: 'alibi' }, miniStory)
    expect(state.npcState.goblin.revealed).toEqual(['alibi'])
  })
})

describe('rest effect', () => {
  test('removes oldest condition from each player and costs weather', () => {
    let state = mkState()
    state = applyEffect(state, { type: 'condition', condition: 'frozen', action: 'add', target: 'self' }, miniStory, { playerId: 'p1' })
    state = applyEffect(state, { type: 'condition', condition: 'blinded', action: 'add', target: 'self' }, miniStory, { playerId: 'p1' })
    const s = applyEffect(state, { type: 'rest' }, miniStory)
    expect(s.players.p1.conditions).toEqual(['blinded']) // oldest (frozen) removed
    expect(s.tracks.weather.value).toBe(5) // weather -1
  })
})

describe('applyEffects (chaining)', () => {
  test('chains multiple effects', () => {
    const effects = [
      { type: 'track', track: 'noise', delta: 1 },
      { type: 'token', token: 'insight', delta: 1 },
      { type: 'narrative', text: 'Something happened' }
    ]
    const s = applyEffects(mkState(), effects, miniStory)
    expect(s.tracks.noise.value).toBe(1)
    expect(s.tokens.insight).toBe(4)
    expect(s.log).toHaveLength(1)
  })
})
