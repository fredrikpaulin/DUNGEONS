import { test, expect, describe } from 'bun:test'
import {
  CLIENT, SERVER,
  authLogin, authCreate,
  sessionList, sessionCreate, sessionJoin, sessionStart,
  actionChoose, actionApproach, actionVerb, actionUseItem, actionUseTrick, actionFinaleAnswer, actionMove,
  welcome, authOk, authFail, error,
  sessionListMsg, sessionJoined, sessionStarted, sessionPlayerJoined, sessionPlayerLeft,
  roomView, narrative, clueFound, complication,
  playerEntered, playerLeft, trackChanged,
  conditionAdded, conditionRemoved,
  promptApproach, promptVerb, promptFinale,
  gameOver,
  pack, unpack
} from '../../shared/protocol.js'

// --- Type constants ---

describe('message type constants', () => {
  test('CLIENT has auth, session, action', () => {
    expect(CLIENT.AUTH).toBe('auth')
    expect(CLIENT.SESSION).toBe('session')
    expect(CLIENT.ACTION).toBe('action')
  })

  test('SERVER has all expected types', () => {
    expect(SERVER.WELCOME).toBe('welcome')
    expect(SERVER.AUTH_OK).toBe('auth_ok')
    expect(SERVER.AUTH_FAIL).toBe('auth_fail')
    expect(SERVER.ROOM_VIEW).toBe('room_view')
    expect(SERVER.ERROR).toBe('error')
    expect(SERVER.NARRATIVE).toBe('narrative')
    expect(SERVER.GAME_OVER).toBe('game_over')
  })
})

// --- Client message builders ---

describe('client message builders', () => {
  test('authLogin produces valid shape', () => {
    const msg = authLogin('Erik')
    expect(msg.type).toBe('auth')
    expect(msg.action).toBe('login')
    expect(msg.name).toBe('Erik')
  })

  test('authCreate produces valid shape', () => {
    const msg = authCreate('Maja')
    expect(msg.type).toBe('auth')
    expect(msg.action).toBe('create')
    expect(msg.name).toBe('Maja')
  })

  test('sessionList produces valid shape', () => {
    const msg = sessionList()
    expect(msg.type).toBe('session')
    expect(msg.action).toBe('list')
  })

  test('sessionCreate includes adventureId', () => {
    const msg = sessionCreate('liftar-och-las')
    expect(msg.type).toBe('session')
    expect(msg.action).toBe('create')
    expect(msg.adventureId).toBe('liftar-och-las')
  })

  test('sessionJoin includes sessionId', () => {
    const msg = sessionJoin('abc123')
    expect(msg.type).toBe('session')
    expect(msg.action).toBe('join')
    expect(msg.sessionId).toBe('abc123')
  })

  test('actionChoose includes choiceId', () => {
    const msg = actionChoose('c1')
    expect(msg.type).toBe('action')
    expect(msg.action).toBe('choose')
    expect(msg.choiceId).toBe('c1')
  })

  test('actionApproach includes approachId', () => {
    const msg = actionApproach('brave')
    expect(msg.type).toBe('action')
    expect(msg.action).toBe('approach')
    expect(msg.approachId).toBe('brave')
  })

  test('actionVerb includes verbId', () => {
    const msg = actionVerb('TITTA')
    expect(msg.type).toBe('action')
    expect(msg.action).toBe('verb')
    expect(msg.verbId).toBe('TITTA')
  })

  test('actionMove includes roomId', () => {
    const msg = actionMove('gruvan_entre')
    expect(msg.type).toBe('action')
    expect(msg.action).toBe('move')
    expect(msg.roomId).toBe('gruvan_entre')
  })

  test('actionFinaleAnswer includes culprit and hideout', () => {
    const msg = actionFinaleAnswer('glim', 'dungeon_a')
    expect(msg.type).toBe('action')
    expect(msg.action).toBe('finale_answer')
    expect(msg.culprit).toBe('glim')
    expect(msg.hideout).toBe('dungeon_a')
  })

  test('actionUseItem includes itemId', () => {
    const msg = actionUseItem('pannlampa')
    expect(msg.action).toBe('use_item')
    expect(msg.itemId).toBe('pannlampa')
  })

  test('actionUseTrick has no extra data', () => {
    const msg = actionUseTrick()
    expect(msg.action).toBe('use_trick')
  })
})

// --- Server message builders ---

describe('server message builders', () => {
  test('welcome includes adventures and null user', () => {
    const msg = welcome([{ id: 'a1', title: 'Test' }])
    expect(msg.type).toBe('welcome')
    expect(msg.adventures).toHaveLength(1)
    expect(msg.user).toBeNull()
  })

  test('authOk includes user', () => {
    const msg = authOk({ id: 'u1', name: 'Erik' })
    expect(msg.type).toBe('auth_ok')
    expect(msg.user.name).toBe('Erik')
  })

  test('authFail includes message', () => {
    const msg = authFail('Name taken')
    expect(msg.type).toBe('auth_fail')
    expect(msg.message).toBe('Name taken')
  })

  test('error includes message', () => {
    const msg = error('Something broke')
    expect(msg.type).toBe('error')
    expect(msg.message).toBe('Something broke')
  })

  test('narrative includes text', () => {
    const msg = narrative('You see a dark cave.')
    expect(msg.type).toBe('narrative')
    expect(msg.text).toBe('You see a dark cave.')
  })

  test('trackChanged includes track, value, delta', () => {
    const msg = trackChanged('weather', 5, -1)
    expect(msg.type).toBe('track_changed')
    expect(msg.track).toBe('weather')
    expect(msg.value).toBe(5)
    expect(msg.delta).toBe(-1)
  })

  test('playerEntered includes player info', () => {
    const msg = playerEntered({ name: 'Erik', role: 'explorer' })
    expect(msg.type).toBe('player_entered')
    expect(msg.player.name).toBe('Erik')
  })

  test('promptApproach includes approaches', () => {
    const msg = promptApproach([{ id: 'brave', name: 'Modig' }])
    expect(msg.type).toBe('prompt_approach')
    expect(msg.approaches).toHaveLength(1)
  })

  test('promptFinale includes suspects and hideouts', () => {
    const msg = promptFinale(['glim', 'majken'], ['dungeon_a', 'dungeon_b'])
    expect(msg.type).toBe('prompt_finale')
    expect(msg.suspects).toContain('glim')
    expect(msg.hideouts).toContain('dungeon_a')
  })

  test('gameOver includes epilogue', () => {
    const msg = gameOver({ narrative: 'You won!', win: true })
    expect(msg.type).toBe('game_over')
    expect(msg.epilogue.win).toBe(true)
  })

  test('clueFound includes clue data', () => {
    const msg = clueFound({ id: 'K1', text: 'A mysterious note' })
    expect(msg.type).toBe('clue_found')
    expect(msg.clue.id).toBe('K1')
  })

  test('sessionPlayerJoined includes player', () => {
    const msg = sessionPlayerJoined({ name: 'Erik', role: 'explorer' })
    expect(msg.type).toBe('session_player_joined')
    expect(msg.player.name).toBe('Erik')
  })
})

// --- Pack / Unpack ---

describe('pack and unpack', () => {
  test('pack produces JSON string', () => {
    const msg = authLogin('Erik')
    const packed = pack(msg)
    expect(typeof packed).toBe('string')
    expect(JSON.parse(packed).name).toBe('Erik')
  })

  test('unpack parses valid JSON', () => {
    const raw = '{"type":"auth","action":"login","name":"Erik"}'
    const msg = unpack(raw)
    expect(msg.type).toBe('auth')
    expect(msg.name).toBe('Erik')
  })

  test('unpack returns null for invalid JSON', () => {
    expect(unpack('not json')).toBeNull()
    expect(unpack('')).toBeNull()
    expect(unpack('{broken')).toBeNull()
  })

  test('round-trip preserves data', () => {
    const original = actionFinaleAnswer('glim', 'dungeon_a')
    const restored = unpack(pack(original))
    expect(restored).toEqual(original)
  })
})
