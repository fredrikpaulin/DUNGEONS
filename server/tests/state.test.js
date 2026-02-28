import { test, expect, describe } from 'bun:test'
import { createGameState, createPlayer, updateTrack, updateToken, addLogEntry, setPhase, setPlayerRoom, playersInRoom, updatePlayer } from '../engine/state.js'

const miniStory = await Bun.file('./server/tests/fixtures/mini-story.json').json()
const combo = miniStory.secrets.combinations[0] // goblin + dungeon_a

const mkPlayers = () => ({
  p1: createPlayer('p1', 'Erik', 'explorer', { str: 3, per: 2, cha: 1, cun: 0 }, 'scout'),
  p2: createPlayer('p2', 'Maja', 'thinker', { str: 1, per: 3, cha: 2, cun: 0 }, 'analyze')
})

describe('createPlayer', () => {
  test('creates a player with all fields', () => {
    const p = createPlayer('p1', 'Erik', 'explorer', { str: 3, per: 2 }, 'scout')
    expect(p.id).toBe('p1')
    expect(p.name).toBe('Erik')
    expect(p.role).toBe('explorer')
    expect(p.stats.str).toBe(3)
    expect(p.conditions).toEqual([])
    expect(p.items).toEqual([])
    expect(p.currentRoom).toBeNull()
    expect(p.previousRoom).toBeNull()
    expect(p.trickUsed).toBe(false)
    expect(p.isLeader).toBe(false)
  })
})

describe('createGameState', () => {
  test('creates state with tracks from story', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    expect(state.tracks.weather.value).toBe(6)
    expect(state.tracks.noise.value).toBe(0)
  })

  test('creates state with tokens from story', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    expect(state.tokens.mod).toBe(5)
    expect(state.tokens.insight).toBe(3)
  })

  test('creates state with secret', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    expect(state.secret.culprit).toBe('goblin')
    expect(state.secret.hideout).toBe('dungeon_a')
  })

  test('creates state with NPC state', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    expect(state.npcState.elder.visits).toBe(0)
    expect(state.npcState.goblin.visits).toBe(0)
    expect(state.npcState.raven.visits).toBe(0)
  })

  test('creates state with players map', () => {
    const players = mkPlayers()
    const state = createGameState(miniStory, combo, players)
    expect(Object.keys(state.players)).toHaveLength(2)
    expect(state.players.p1.name).toBe('Erik')
    expect(state.players.p2.name).toBe('Maja')
  })

  test('starts in setup phase', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    expect(state.phase).toBe('setup')
  })

  test('creates item pool from story items', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    expect(state.itemPool).toContain('torch')
    expect(state.itemPool).toContain('rope')
    expect(state.itemPool).toHaveLength(6)
  })
})

describe('updateTrack', () => {
  test('updates track value', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    const s = updateTrack(state, 'weather', -1)
    expect(s.tracks.weather.value).toBe(5)
  })

  test('clamps to min', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    const s = updateTrack(state, 'weather', -100)
    expect(s.tracks.weather.value).toBe(0)
  })

  test('clamps to max', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    const s = updateTrack(state, 'noise', 100)
    expect(s.tracks.noise.value).toBe(6)
  })

  test('returns same state for unknown track', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    const s = updateTrack(state, 'bogus', 5)
    expect(s).toBe(state)
  })

  test('is immutable', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    const s = updateTrack(state, 'weather', -1)
    expect(state.tracks.weather.value).toBe(6)
    expect(s.tracks.weather.value).toBe(5)
  })
})

describe('updateToken', () => {
  test('updates token value', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    const s = updateToken(state, 'mod', -2)
    expect(s.tokens.mod).toBe(3)
  })

  test('clamps to 0', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    const s = updateToken(state, 'mod', -100)
    expect(s.tokens.mod).toBe(0)
  })

  test('returns same state for unknown token', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    const s = updateToken(state, 'bogus', 5)
    expect(s).toBe(state)
  })
})

describe('setPlayerRoom', () => {
  test('sets player room and previous room', () => {
    let state = createGameState(miniStory, combo, mkPlayers())
    state = setPlayerRoom(state, 'p1', 'hub')
    expect(state.players.p1.currentRoom).toBe('hub')
    expect(state.players.p1.previousRoom).toBeNull()

    state = setPlayerRoom(state, 'p1', 'mine_entrance')
    expect(state.players.p1.currentRoom).toBe('mine_entrance')
    expect(state.players.p1.previousRoom).toBe('hub')
  })

  test('increments turn count', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    const s = setPlayerRoom(state, 'p1', 'hub')
    expect(s.turnCount).toBe(1)
  })

  test('does not affect other players', () => {
    let state = createGameState(miniStory, combo, mkPlayers())
    state = setPlayerRoom(state, 'p1', 'hub')
    state = setPlayerRoom(state, 'p2', 'mine_entrance')
    expect(state.players.p1.currentRoom).toBe('hub')
    expect(state.players.p2.currentRoom).toBe('mine_entrance')
  })

  test('returns same state for unknown player', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    const s = setPlayerRoom(state, 'bogus', 'hub')
    expect(s).toBe(state)
  })
})

describe('playersInRoom', () => {
  test('returns players in a room', () => {
    let state = createGameState(miniStory, combo, mkPlayers())
    state = setPlayerRoom(state, 'p1', 'hub')
    state = setPlayerRoom(state, 'p2', 'hub')
    expect(playersInRoom(state, 'hub')).toHaveLength(2)
  })

  test('returns empty for room with no players', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    expect(playersInRoom(state, 'mine_entrance')).toHaveLength(0)
  })

  test('returns only players in that room', () => {
    let state = createGameState(miniStory, combo, mkPlayers())
    state = setPlayerRoom(state, 'p1', 'hub')
    state = setPlayerRoom(state, 'p2', 'mine_entrance')
    expect(playersInRoom(state, 'hub')).toHaveLength(1)
    expect(playersInRoom(state, 'hub')[0].id).toBe('p1')
  })
})

describe('addLogEntry', () => {
  test('appends to log', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    const s = addLogEntry(state, { type: 'test', msg: 'hello' })
    expect(s.log).toHaveLength(1)
    expect(s.log[0].type).toBe('test')
    expect(s.log[0].turn).toBe(0)
  })

  test('is immutable', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    const s = addLogEntry(state, { type: 'test' })
    expect(state.log).toHaveLength(0)
    expect(s.log).toHaveLength(1)
  })
})

describe('setPhase', () => {
  test('sets phase', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    const s = setPhase(state, 'playing')
    expect(s.phase).toBe('playing')
    expect(state.phase).toBe('setup')
  })
})

describe('updatePlayer', () => {
  test('updates specific player fields', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    const s = updatePlayer(state, 'p1', { isLeader: true })
    expect(s.players.p1.isLeader).toBe(true)
    expect(s.players.p2.isLeader).toBe(false)
  })

  test('returns same state for unknown player', () => {
    const state = createGameState(miniStory, combo, mkPlayers())
    const s = updatePlayer(state, 'bogus', { isLeader: true })
    expect(s).toBe(state)
  })
})
