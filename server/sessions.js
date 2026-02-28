// Sessions — create, join, start, persist, restore game sessions
import { createGameState, createPlayer, setPhase, playersInRoom } from './engine/state.js'
import { buildLookups } from './loader/story-loader.js'
import { allocateStats, defaultStatValues } from './engine/players.js'
import { enterRoom, enterHub, processChoice, recordDungeonVisit, shouldTriggerFinale, resolveFinale, transitionPhase } from './engine/machine.js'
import { getAvailableChoices, getChoicesWithStatus } from './engine/rules.js'
import { getClueDetail, clueSummary } from './engine/clues.js'
import { getNpcDef, getNpcScene, visitNpc } from './engine/npcs.js'
import { selectComplication, recordComplication } from './engine/complications.js'
import { applyEffects } from './engine/effects.js'
import { playerSummary } from './engine/players.js'

const generateId = () => crypto.randomUUID().slice(0, 8)

// In-memory session store
const createSessionStore = (db) => {
  const sessions = new Map()  // sessionId -> session object

  const store = {
    create,
    get: (id) => sessions.get(id) || null,
    list: listSessions,
    join,
    leave,
    selectRole,
    start,
    save,
    restore,
    getByPlayer,
    movePlayer,
    doChoice,
    doFinale,
    buildRoomView,
    playerCount: (id) => {
      const s = sessions.get(id)
      return s ? s.players.size : 0
    }
  }

  function create(adventureId, adventure, hostUserId, hostUserName) {
    const id = generateId()
    const session = {
      id,
      adventureId,
      adventure,  // full adventure object with story + lookups
      hostUserId,
      phase: 'lobby',
      players: new Map(),  // userId -> { userId, userName, role, ready }
      gameState: null,
      createdAt: Date.now()
    }
    // Add host as first player
    session.players.set(hostUserId, {
      userId: hostUserId,
      userName: hostUserName,
      role: null,
      ready: false
    })
    sessions.set(id, session)
    persist(session)
    return session
  }

  function listSessions() {
    const result = []
    for (const s of sessions.values()) {
      if (s.phase === 'lobby' || s.phase === 'playing') {
        result.push({
          id: s.id,
          adventureId: s.adventureId,
          title: s.adventure.story.meta?.title || s.adventureId,
          phase: s.phase,
          playerCount: s.players.size,
          maxPlayers: s.adventure.story.config?.lobby?.maxPlayers || 4,
          players: [...s.players.values()].map(p => ({ name: p.userName, role: p.role }))
        })
      }
    }
    return result
  }

  function join(sessionId, userId, userName) {
    const session = sessions.get(sessionId)
    if (!session) return { ok: false, error: 'Session not found' }
    if (session.phase !== 'lobby') return { ok: false, error: 'Session already started' }

    const maxPlayers = session.adventure.story.config?.lobby?.maxPlayers || 4
    if (session.players.size >= maxPlayers) return { ok: false, error: 'Session is full' }

    if (session.players.has(userId)) return { ok: false, error: 'Already in session' }

    session.players.set(userId, {
      userId,
      userName,
      role: null,
      ready: false
    })
    persist(session)
    return { ok: true }
  }

  function leave(sessionId, userId) {
    const session = sessions.get(sessionId)
    if (!session) return { ok: false, error: 'Session not found' }

    session.players.delete(userId)

    // If no players left, remove session
    if (session.players.size === 0) {
      sessions.delete(sessionId)
      removeFromDb(sessionId)
      return { ok: true, empty: true }
    }

    // If host left, transfer to next player
    if (session.hostUserId === userId) {
      session.hostUserId = session.players.keys().next().value
    }
    persist(session)
    return { ok: true, empty: false }
  }

  function selectRole(sessionId, userId, roleId) {
    const session = sessions.get(sessionId)
    if (!session) return { ok: false, error: 'Session not found' }
    if (session.phase !== 'lobby') return { ok: false, error: 'Session already started' }

    const player = session.players.get(userId)
    if (!player) return { ok: false, error: 'Not in session' }

    // Check role is valid
    const roles = session.adventure.story.roles || []
    const role = roles.find(r => r.id === roleId)
    if (!role) return { ok: false, error: 'Invalid role' }

    // Check role not already taken
    for (const [uid, p] of session.players) {
      if (uid !== userId && p.role === roleId) {
        return { ok: false, error: 'Role already taken' }
      }
    }

    player.role = roleId
    player.ready = true
    persist(session)
    return { ok: true, role }
  }

  function start(sessionId, userId) {
    const session = sessions.get(sessionId)
    if (!session) return { ok: false, error: 'Session not found' }
    if (session.phase !== 'lobby') return { ok: false, error: 'Session already started' }
    if (session.hostUserId !== userId) return { ok: false, error: 'Only host can start' }

    const minPlayers = session.adventure.story.config?.lobby?.minPlayers || 1
    if (session.players.size < minPlayers) {
      return { ok: false, error: `Need at least ${minPlayers} player(s)` }
    }

    // Check all players have roles
    for (const p of session.players.values()) {
      if (!p.role) return { ok: false, error: `${p.userName} has not selected a role` }
    }

    // Pick a random secret combination
    const combos = session.adventure.story.secrets?.combinations || []
    const secretCombo = combos.length > 0
      ? combos[Math.floor(Math.random() * combos.length)]
      : { culprit: null, hideout: null, clueAssignments: {}, roomOverrides: {} }

    // Create game players
    const gamePlayers = {}
    const statCount = (session.adventure.story.config?.stats || []).length
    const roles = session.adventure.story.roles || []

    for (const p of session.players.values()) {
      const roleDef = roles.find(r => r.id === p.role)
      const trick = roleDef?.tricks?.[0] || null
      const stats = allocateStats(defaultStatValues(statCount))
      gamePlayers[p.userId] = createPlayer(p.userId, p.userName, p.role, stats, trick)
    }

    // Create game state
    session.gameState = createGameState(session.adventure.story, secretCombo, gamePlayers)
    session.gameState = setPhase(session.gameState, 'playing')
    session.phase = 'playing'

    persist(session)
    return { ok: true, gameState: session.gameState }
  }

  function movePlayer(sessionId, userId, roomId) {
    const session = sessions.get(sessionId)
    if (!session) return { ok: false, error: 'Session not found' }
    if (session.phase !== 'playing') return { ok: false, error: 'Game not in progress' }
    if (!session.gameState?.players[userId]) return { ok: false, error: 'Not in game' }

    const story = session.adventure.story
    const room = story.rooms[roomId]
    if (!room) return { ok: false, error: 'Unknown room' }

    // Check exit is valid from current room
    const player = session.gameState.players[userId]
    const currentRoom = story.rooms[player.currentRoom]
    if (currentRoom) {
      const validExits = (currentRoom.exits || []).map(e => e.target)
      if (!validExits.includes(roomId)) {
        return { ok: false, error: 'Cannot reach that room from here' }
      }
    }

    const prevRoom = player.currentRoom
    session.gameState = enterRoom(session.gameState, userId, roomId, story)

    // Track dungeon zone visits
    if (room.zone && room.zone.startsWith('dungeon')) {
      session.gameState = recordDungeonVisit(session.gameState, room.zone)
    }

    persist(session)

    // Collect events from the log entries that just happened
    const events = collectRecentEvents(session.gameState, story, userId)

    return {
      ok: true,
      prevRoom,
      newRoom: roomId,
      events,
      roomView: buildRoomView(sessionId, userId)
    }
  }

  function doChoice(sessionId, userId, choiceId, approach, verb) {
    const session = sessions.get(sessionId)
    if (!session) return { ok: false, error: 'Session not found' }
    if (session.phase !== 'playing') return { ok: false, error: 'Game not in progress' }

    const player = session.gameState.players[userId]
    if (!player) return { ok: false, error: 'Not in game' }

    const story = session.adventure.story
    const roomId = player.currentRoom
    const room = story.rooms[roomId]
    if (!room) return { ok: false, error: 'Player not in valid room' }

    const { state: newState, result } = processChoice(
      session.gameState, userId, roomId, choiceId, approach, verb, story
    )

    if (!result) return { ok: false, error: 'Invalid choice' }

    session.gameState = newState

    // Handle complication if triggered
    let complicationData = null
    if (result.complication) {
      const comp = selectComplication(story, result.complication, session.gameState.complicationHistory)
      if (comp) {
        session.gameState = recordComplication(session.gameState, comp.id)
        session.gameState = applyEffects(session.gameState, comp.effects || [], story, { playerId: userId })
        complicationData = { id: comp.id, name: comp.name, narrative: comp.narrative }
      }
    }

    // Check finale trigger
    const finaleReady = shouldTriggerFinale(session.gameState, story)

    persist(session)

    return {
      ok: true,
      result: {
        narrative: result.narrative,
        verbApt: result.verbApt || false,
        target: result.target,
        complication: complicationData,
        finaleReady
      },
      roomView: buildRoomView(sessionId, userId)
    }
  }

  function doFinale(sessionId, userId, culprit, hideout) {
    const session = sessions.get(sessionId)
    if (!session) return { ok: false, error: 'Session not found' }
    if (!session.gameState) return { ok: false, error: 'Game not started' }

    const story = session.adventure.story
    const answers = { culprit, hideout }
    const { state: newState, win, correct, epilogueId } = resolveFinale(session.gameState, answers, story)

    session.gameState = newState
    session.phase = 'ended'
    session.gameState = setPhase(session.gameState, 'ended')

    const epilogue = story.epilogues?.[epilogueId] || { narrative: win ? 'You solved the mystery!' : 'The mystery remains unsolved.' }

    persist(session)

    return { ok: true, win, correct, epilogue }
  }

  function buildRoomView(sessionId, userId) {
    const session = sessions.get(sessionId)
    if (!session || !session.gameState) return null

    const story = session.adventure.story
    const player = session.gameState.players[userId]
    if (!player) return null

    const room = story.rooms[player.currentRoom]
    if (!room) return null

    const others = playersInRoom(session.gameState, player.currentRoom)
      .filter(p => p.id !== userId)
      .map(p => ({ name: p.name, role: p.role }))

    const choices = getChoicesWithStatus(room, player, session.gameState, story)
    const exits = room.exits || []

    // NPC in hub
    let npcsHere = []
    if (room.zone === 'hub') {
      npcsHere = (story.npcs || []).map(n => ({
        id: n.id,
        name: n.name,
        role: n.role
      }))
    }

    return {
      room: {
        id: room.id,
        name: room.name,
        zone: room.zone,
        narrative: room.narrative,
        tags: room.tags || []
      },
      choices,
      exits,
      others,
      npcsHere,
      player: {
        name: player.name,
        role: player.role,
        stats: player.stats,
        conditions: player.conditions,
        items: player.items,
        trick: player.trick,
        trickUsed: player.trickUsed
      },
      tracks: Object.entries(session.gameState.tracks).map(([id, t]) => ({
        id,
        value: t.value,
        min: t.min,
        max: t.max,
        direction: t.direction
      })),
      tokens: { ...session.gameState.tokens },
      clues: clueSummary(session.gameState, story)
    }
  }

  function collectRecentEvents(gameState, story, playerId) {
    const events = []
    const log = gameState.log
    // Get the most recent entries since the last movement
    const recentEntries = log.slice(-10)
    for (const entry of recentEntries) {
      if (entry.type === 'narrative') events.push({ type: 'narrative', text: entry.text })
      if (entry.type === 'clue_found' && entry.playerId === playerId) {
        const detail = getClueDetail(story, entry.clueId)
        if (detail) events.push({ type: 'clue', clue: detail })
      }
    }
    return events
  }

  function getByPlayer(userId) {
    for (const s of sessions.values()) {
      if (s.players.has(userId)) return s
    }
    return null
  }

  function save(sessionId) {
    const session = sessions.get(sessionId)
    if (!session) return false
    persist(session)
    return true
  }

  function persist(session) {
    const now = Date.now()
    db.query(`
      INSERT OR REPLACE INTO sessions (id, adventure_id, state, phase, created_at, updated_at, ended_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      session.adventureId,
      JSON.stringify({
        players: [...session.players.entries()],
        gameState: session.gameState,
        hostUserId: session.hostUserId
      }),
      session.phase,
      session.createdAt,
      now,
      null
    )

    // Persist players
    for (const p of session.players.values()) {
      db.query(`
        INSERT OR REPLACE INTO session_players (session_id, user_id, player_data, joined_at)
        VALUES (?, ?, ?, ?)
      `).run(session.id, p.userId, JSON.stringify(p), now)
    }
  }

  function removeFromDb(sessionId) {
    db.query('DELETE FROM session_players WHERE session_id = ?').run(sessionId)
    db.query('DELETE FROM sessions WHERE id = ?').run(sessionId)
  }

  function restore(sessionId, adventure) {
    const row = db.query('SELECT * FROM sessions WHERE id = ?').get(sessionId)
    if (!row) return null

    const stored = JSON.parse(row.state)
    const session = {
      id: row.id,
      adventureId: row.adventure_id,
      adventure,
      hostUserId: stored.hostUserId,
      phase: row.phase,
      players: new Map(stored.players),
      gameState: stored.gameState,
      createdAt: row.created_at
    }
    sessions.set(session.id, session)
    return session
  }

  return store
}

export { createSessionStore }
