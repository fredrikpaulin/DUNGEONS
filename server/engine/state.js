// GameState — pure data, no methods
// Key difference from ADVNTR: players is a map keyed by playerId, each has currentRoom
// All functions take state and return new state (immutable updates)

const createTrackState = (trackDefs) => {
  const tracks = {}
  for (const t of trackDefs) {
    tracks[t.id] = { value: t.start, min: t.min, max: t.max, direction: t.direction, triggerAt: t.triggerAt }
  }
  return tracks
}

const createPlayer = (id, name, role, stats, trick = null) => ({
  id,
  name,
  role,
  stats: { ...stats },
  conditions: [],
  items: [],
  trick,
  trickUsed: false,
  isLeader: false,
  leaderFlipped: false,
  currentRoom: null,
  previousRoom: null
})

const createGameState = (story, secretCombo, players = {}) => ({
  phase: 'setup',
  hubVisits: 0,
  dungeonsVisited: [],

  tracks: createTrackState(story.config?.tracks || []),
  tokens: Object.fromEntries((story.config?.tokens || []).map(t => [t.id, t.pool])),

  players,   // { playerId: playerObj }

  cluesFound: [],
  bonusCluesFound: [],
  itemPool: (story.items || []).map(i => i.id),

  secret: {
    culprit: secretCombo.culprit,
    hideout: secretCombo.hideout,
    clueAssignments: { ...secretCombo.clueAssignments },
    roomOverrides: { ...(secretCombo.roomOverrides || {}) }
  },

  npcState: Object.fromEntries((story.npcs || []).map(n => [n.id, { visits: 0, revealed: [] }])),

  complicationHistory: [],

  log: [],
  turnCount: 0
})

// --- Immutable update helpers ---

const updateTrack = (state, trackId, delta) => {
  const track = state.tracks[trackId]
  if (!track) return state
  const clamped = Math.max(track.min, Math.min(track.max, track.value + delta))
  return {
    ...state,
    tracks: { ...state.tracks, [trackId]: { ...track, value: clamped } }
  }
}

const updateToken = (state, tokenId, delta) => {
  const current = state.tokens[tokenId]
  if (current === undefined) return state
  return {
    ...state,
    tokens: { ...state.tokens, [tokenId]: Math.max(0, current + delta) }
  }
}

const addLogEntry = (state, entry) => ({
  ...state,
  log: [...state.log, { turn: state.turnCount, ...entry }]
})

const setPhase = (state, phase) => ({ ...state, phase })

// Per-player room setting
const setPlayerRoom = (state, playerId, roomId, zone = null) => {
  const player = state.players[playerId]
  if (!player) return state
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        previousRoom: player.currentRoom,
        currentRoom: roomId
      }
    },
    turnCount: state.turnCount + 1
  }
}

// Get all players in a given room
const playersInRoom = (state, roomId) =>
  Object.values(state.players).filter(p => p.currentRoom === roomId)

// Update a specific player
const updatePlayer = (state, playerId, updates) => {
  const player = state.players[playerId]
  if (!player) return state
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, ...updates }
    }
  }
}

export {
  createGameState, createPlayer, createTrackState,
  updateTrack, updateToken, addLogEntry,
  setPhase, setPlayerRoom, playersInRoom, updatePlayer
}
