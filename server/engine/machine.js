// State machine — phase transitions, per-player room entry, choice processing
// Phases: setup → lobby → opening → playing → finale → epilog → ended
// Key difference from ADVNTR: room entry is per-player, not global

import { setPhase, setPlayerRoom, addLogEntry } from './state.js'
import { applyEffects } from './effects.js'
import { selectClue, isClueFound } from './clues.js'
import { resolveChoice } from './rules.js'
import { getTrackTriggerEffects, isTriggered } from './tracks.js'

const PHASES = ['setup', 'lobby', 'opening', 'playing', 'finale', 'epilog', 'ended']

// --- Phase transitions ---

const transitionPhase = (state, phase) => {
  let s = setPhase(state, phase)
  s = addLogEntry(s, { type: 'phase', phase })
  return s
}

// --- Per-player room entry ---

const enterRoom = (state, playerId, roomId, story, opts = {}) => {
  const room = story.rooms[roomId]
  if (!room) return state

  let s = setPlayerRoom(state, playerId, roomId, room.zone)
  s = addLogEntry(s, { type: 'enter_room', playerId, room: roomId, name: room.name })

  // Apply onEnter effects (scoped to the entering player)
  if (room.onEnter?.length) {
    s = applyEffects(s, room.onEnter, story, { playerId })
  }

  // Auto-assign clue if room has a clue and not skipped
  if (!opts.skipClue && room.clue?.pool?.length) {
    const clueId = selectClue(room, s, story)
    if (clueId && !isClueFound(s, clueId)) {
      const clueType = room.clue.type || 'core'
      s = applyEffects(s, [{ type: 'clue', action: clueType, id: clueId }], story, { playerId })
      s = addLogEntry(s, { type: 'clue_found', playerId, clueId, clueType })
    }
  }

  // Auto-draw items if room has item config
  if (room.items) {
    if (room.items.guaranteed) {
      s = applyEffects(s, [{ type: 'item', action: 'add', id: room.items.guaranteed }], story, { playerId })
    }
    if (room.items.draw > 0) {
      s = applyEffects(s, [{ type: 'item', action: 'draw', count: room.items.draw }], story, { playerId })
    }
  }

  return s
}

// --- Choice processing ---

const processChoice = (state, playerId, roomId, choiceId, approach, verb, story, opts = {}) => {
  const room = story.rooms[roomId]
  if (!room) return { state, result: null }

  const result = resolveChoice(state, room, choiceId, approach, verb, story, { playerId })
  if (!result) return { state, result: null }

  let s = applyEffects(state, result.effects, story, { playerId })

  // Check track triggers
  const trackEffects = result.effects.filter(e => e.type === 'track')
  for (const te of trackEffects) {
    const track = s.tracks[te.track]
    if (track && isTriggered(track)) {
      const triggerFx = getTrackTriggerEffects(story, te.track)
      if (triggerFx.length) {
        s = applyEffects(s, triggerFx, story, { playerId })
        s = addLogEntry(s, { type: 'track_trigger', track: te.track })
      }
    }
  }

  // Handle pending goto (room transition for the acting player)
  if (s._pendingGoto) {
    const target = s._pendingGoto
    s = { ...s, _pendingGoto: undefined }
    s = enterRoom(s, playerId, target, story, opts)
  } else if (result.target && result.target !== roomId) {
    s = enterRoom(s, playerId, result.target, story, opts)
  }

  // Handle pending complication
  let complication = null
  if (result.complication || s._pendingComplication) {
    complication = s._pendingComplication || 'small'
    s = { ...s, _pendingComplication: undefined }
    s = addLogEntry(s, { type: 'complication', playerId, size: complication })
  }

  return { state: s, result: { ...result, complication } }
}

// --- Hub / Dungeon helpers ---

// Move a player to the hub
const enterHub = (state, playerId, story, opts = {}) => {
  const startRoom = story.config?.startRoom || 'hub'
  let s = enterRoom(state, playerId, startRoom, story, opts)
  return s
}

// Record dungeon entry for a zone (global, not per-player)
const recordDungeonVisit = (state, zone) => {
  if (state.dungeonsVisited.includes(zone)) return state
  return { ...state, dungeonsVisited: [...state.dungeonsVisited, zone] }
}

// Check if all dungeon zones have been visited
const allDungeonsVisited = (state, story) => {
  const zones = new Set(
    Object.values(story.rooms)
      .map(r => r.zone)
      .filter(z => z && z.startsWith('dungeon'))
  )
  return [...zones].every(z => state.dungeonsVisited.includes(z))
}

// Check if the game should transition to finale
const shouldTriggerFinale = (state, story) => {
  if (allDungeonsVisited(state, story)) return true
  const weatherTrack = state.tracks.weather
  if (weatherTrack && weatherTrack.value <= weatherTrack.min) return true
  return false
}

// --- Finale resolution ---

const resolveFinale = (state, answers, story) => {
  const correct = {
    culprit: answers.culprit === state.secret.culprit,
    hideout: answers.hideout === state.secret.hideout
  }
  const win = correct.culprit && correct.hideout

  const epilogueId = win
    ? (story.secrets?.combinations?.find(c =>
        c.culprit === state.secret.culprit && c.hideout === state.secret.hideout
      )?.epilogue || 'win')
    : 'loss'

  let s = setPhase(state, 'epilog')
  s = addLogEntry(s, { type: 'finale_result', win, correct, answers })

  return { state: s, win, correct, epilogueId }
}

export {
  PHASES, transitionPhase,
  enterRoom, processChoice,
  enterHub, recordDungeonVisit, allDungeonsVisited, shouldTriggerFinale,
  resolveFinale
}
