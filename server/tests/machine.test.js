import { test, expect, describe } from 'bun:test'
import { transitionPhase, enterRoom, processChoice, enterHub, recordDungeonVisit, allDungeonsVisited, shouldTriggerFinale, resolveFinale } from '../engine/machine.js'
import { createPlayer, createGameState, setPlayerRoom } from '../engine/state.js'

const miniStory = await Bun.file('./server/tests/fixtures/mini-story.json').json()
const combo = miniStory.secrets.combinations[0] // goblin + dungeon_a

const mkPlayers = () => ({
  p1: createPlayer('p1', 'Erik', 'explorer', { str: 3, per: 2, cha: 1, cun: 0 }, 'scout'),
  p2: createPlayer('p2', 'Maja', 'thinker', { str: 1, per: 3, cha: 2, cun: 0 }, 'analyze')
})

const mkState = () => createGameState(miniStory, combo, mkPlayers())

describe('transitionPhase', () => {
  test('changes phase and logs it', () => {
    const s = transitionPhase(mkState(), 'playing')
    expect(s.phase).toBe('playing')
    expect(s.log.find(e => e.type === 'phase')).toBeDefined()
  })
})

describe('enterRoom', () => {
  test('moves player to room', () => {
    const s = enterRoom(mkState(), 'p1', 'hub', miniStory)
    expect(s.players.p1.currentRoom).toBe('hub')
  })

  test('applies onEnter effects', () => {
    // mine_entrance has onEnter: narrative "The air grows cold"
    const s = enterRoom(mkState(), 'p1', 'mine_entrance', miniStory)
    expect(s.log.some(e => e.type === 'narrative' && e.text.includes('air grows cold'))).toBe(true)
  })

  test('auto-assigns clue from pool', () => {
    const s = enterRoom(mkState(), 'p1', 'mine_entrance', miniStory)
    // combo assigns K1 to mine_entrance
    expect(s.cluesFound).toContain('K1')
    expect(s.log.some(e => e.type === 'clue_found')).toBe(true)
  })

  test('skips clue when skipClue option set', () => {
    const s = enterRoom(mkState(), 'p1', 'mine_entrance', miniStory, { skipClue: true })
    expect(s.cluesFound).toHaveLength(0)
  })

  test('auto-draws items when room has item config', () => {
    const s = enterRoom(mkState(), 'p1', 'mine_entrance', miniStory)
    // mine_entrance: draw: 1
    expect(s.players.p1.items.length).toBeGreaterThan(0)
  })

  test('gives guaranteed item', () => {
    const s = enterRoom(mkState(), 'p1', 'mine_deep', miniStory)
    // mine_deep: guaranteed: "torch"
    expect(s.players.p1.items).toContain('torch')
  })

  test('does not affect other player', () => {
    const s = enterRoom(mkState(), 'p1', 'mine_entrance', miniStory)
    expect(s.players.p2.currentRoom).toBeNull()
  })

  test('returns state unchanged for unknown room', () => {
    const state = mkState()
    const s = enterRoom(state, 'p1', 'nonexistent', miniStory)
    expect(s).toBe(state)
  })

  test('two players can enter different rooms independently', () => {
    let state = mkState()
    state = enterRoom(state, 'p1', 'mine_entrance', miniStory, { skipClue: true })
    state = enterRoom(state, 'p2', 'tower_base', miniStory, { skipClue: true })
    expect(state.players.p1.currentRoom).toBe('mine_entrance')
    expect(state.players.p2.currentRoom).toBe('tower_base')
  })
})

describe('processChoice', () => {
  test('resolves a choice and applies effects', () => {
    let state = mkState()
    state = enterRoom(state, 'p1', 'mine_entrance', miniStory, { skipClue: true })
    const { state: s, result } = processChoice(state, 'p1', 'mine_entrance', 'mine_look', 'brave', 'LOOK', miniStory, { skipClue: true })
    expect(result).not.toBeNull()
    expect(result.narrative).toContain('scratch marks')
    // brave approach costs mod
    expect(s.tokens.mod).toBeLessThan(state.tokens.mod)
    // mine_look has weather -1 effect
    expect(s.tracks.weather.value).toBeLessThan(state.tracks.weather.value)
  })

  test('moves player when choice has different target', () => {
    let state = mkState()
    state = enterRoom(state, 'p1', 'mine_entrance', miniStory, { skipClue: true })
    const { state: s } = processChoice(state, 'p1', 'mine_entrance', 'mine_enter', 'brave', null, miniStory, { skipClue: true })
    expect(s.players.p1.currentRoom).toBe('mine_deep')
  })

  test('triggers complication with wild approach', () => {
    let state = mkState()
    state = enterRoom(state, 'p1', 'mine_entrance', miniStory, { skipClue: true })
    const { result } = processChoice(state, 'p1', 'mine_entrance', 'mine_look', 'wild', null, miniStory, { skipClue: true })
    expect(result.complication).toBeTruthy()
  })

  test('returns null result for unknown choice', () => {
    let state = mkState()
    state = enterRoom(state, 'p1', 'mine_entrance', miniStory, { skipClue: true })
    const { result } = processChoice(state, 'p1', 'mine_entrance', 'bogus', 'brave', null, miniStory)
    expect(result).toBeNull()
  })
})

describe('enterHub', () => {
  test('moves player to start room', () => {
    const s = enterHub(mkState(), 'p1', miniStory, { skipClue: true })
    expect(s.players.p1.currentRoom).toBe('hub')
  })
})

describe('recordDungeonVisit', () => {
  test('records a zone visit', () => {
    const state = mkState()
    const s = recordDungeonVisit(state, 'dungeon_a')
    expect(s.dungeonsVisited).toContain('dungeon_a')
  })

  test('does not duplicate', () => {
    let state = mkState()
    state = recordDungeonVisit(state, 'dungeon_a')
    state = recordDungeonVisit(state, 'dungeon_a')
    expect(state.dungeonsVisited).toEqual(['dungeon_a'])
  })
})

describe('allDungeonsVisited', () => {
  test('returns false when not all visited', () => {
    const state = recordDungeonVisit(mkState(), 'dungeon_a')
    expect(allDungeonsVisited(state, miniStory)).toBe(false)
  })

  test('returns true when all visited', () => {
    let state = mkState()
    state = recordDungeonVisit(state, 'dungeon_a')
    state = recordDungeonVisit(state, 'dungeon_b')
    expect(allDungeonsVisited(state, miniStory)).toBe(true)
  })
})

describe('shouldTriggerFinale', () => {
  test('triggers when all dungeons visited', () => {
    let state = mkState()
    state = recordDungeonVisit(state, 'dungeon_a')
    state = recordDungeonVisit(state, 'dungeon_b')
    expect(shouldTriggerFinale(state, miniStory)).toBe(true)
  })

  test('triggers when weather depleted', () => {
    let state = mkState()
    state = { ...state, tracks: { ...state.tracks, weather: { ...state.tracks.weather, value: 0 } } }
    expect(shouldTriggerFinale(state, miniStory)).toBe(true)
  })

  test('does not trigger normally', () => {
    expect(shouldTriggerFinale(mkState(), miniStory)).toBe(false)
  })
})

describe('resolveFinale', () => {
  test('correct answer produces win', () => {
    const { state, win, correct, epilogueId } = resolveFinale(
      mkState(), { culprit: 'goblin', hideout: 'dungeon_a' }, miniStory
    )
    expect(win).toBe(true)
    expect(correct.culprit).toBe(true)
    expect(correct.hideout).toBe(true)
    expect(epilogueId).toBe('win_goblin_a')
    expect(state.phase).toBe('epilog')
  })

  test('wrong culprit produces loss', () => {
    const { win, epilogueId } = resolveFinale(
      mkState(), { culprit: 'raven', hideout: 'dungeon_a' }, miniStory
    )
    expect(win).toBe(false)
    expect(epilogueId).toBe('loss')
  })

  test('wrong hideout produces loss', () => {
    const { win } = resolveFinale(
      mkState(), { culprit: 'goblin', hideout: 'dungeon_b' }, miniStory
    )
    expect(win).toBe(false)
  })
})
