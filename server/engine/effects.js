// Effect applicator — takes state + effect + context, returns new state
// Each effect is a plain object with a "type" field
// Context: { playerId } — the player who triggered the effect

import { updateTrack, updateToken, addLogEntry } from './state.js'
import { addCondition, removeCondition } from './conditions.js'

const applyEffect = (state, effect, story, ctx = {}) => {
  const playerId = ctx.playerId || Object.keys(state.players)[0]

  switch (effect.type) {
    case 'track':
      return updateTrack(state, effect.track, effect.delta)

    case 'token':
      return updateToken(state, effect.token, effect.delta)

    case 'condition': {
      const targetId = resolveTarget(state, effect.target, playerId)
      if (!targetId) return state
      const player = state.players[targetId]
      if (!player) return state
      const updated = effect.action === 'add'
        ? addCondition(player, effect.condition)
        : removeCondition(player, effect.condition)
      return {
        ...state,
        players: { ...state.players, [targetId]: updated }
      }
    }

    case 'item': {
      if (effect.action === 'draw') {
        const count = effect.count || 1
        const drawn = state.itemPool.slice(0, count)
        const remaining = state.itemPool.slice(count)
        const player = state.players[playerId]
        if (!player) return { ...state, itemPool: remaining }
        return {
          ...state,
          itemPool: remaining,
          players: {
            ...state.players,
            [playerId]: { ...player, items: [...player.items, ...drawn] }
          }
        }
      }
      if (effect.action === 'add' && effect.id) {
        const player = state.players[playerId]
        if (!player) return state
        return {
          ...state,
          players: {
            ...state.players,
            [playerId]: { ...player, items: [...player.items, effect.id] }
          }
        }
      }
      if (effect.action === 'lose') {
        const targetId = resolveTarget(state, effect.target, playerId)
        const player = state.players[targetId]
        if (!player) return state
        const itemId = effect.id || player.items[player.items.length - 1]
        const idx = player.items.indexOf(itemId)
        if (idx < 0) return state
        return {
          ...state,
          players: {
            ...state.players,
            [targetId]: {
              ...player,
              items: [...player.items.slice(0, idx), ...player.items.slice(idx + 1)]
            }
          }
        }
      }
      return state
    }

    case 'clue': {
      if (effect.action === 'core') {
        if (!effect.id || state.cluesFound.includes(effect.id)) return state
        return { ...state, cluesFound: [...state.cluesFound, effect.id] }
      }
      if (effect.action === 'bonus') {
        if (!effect.id || state.bonusCluesFound.includes(effect.id)) return state
        return { ...state, bonusCluesFound: [...state.bonusCluesFound, effect.id] }
      }
      return state
    }

    case 'insight':
      return updateToken(state, 'insight', effect.delta || 1)

    case 'narrative':
      return addLogEntry(state, { type: 'narrative', text: effect.text })

    case 'goto':
      return { ...state, _pendingGoto: effect.target }

    case 'complication':
      return { ...state, _pendingComplication: effect.size || 'small' }

    case 'npc_reveal': {
      const npcId = effect.npc
      if (!npcId || !state.npcState[npcId]) return state
      const npc = state.npcState[npcId]
      if (npc.revealed.includes(effect.info)) return state
      return {
        ...state,
        npcState: {
          ...state.npcState,
          [npcId]: { ...npc, revealed: [...npc.revealed, effect.info] }
        }
      }
    }

    case 'verb_reward':
      return state // handled by caller

    case 'leader_flip': {
      const leader = Object.entries(state.players).find(([_, p]) => p.isLeader)
      if (!leader) return state
      return {
        ...state,
        players: {
          ...state.players,
          [leader[0]]: { ...leader[1], leaderFlipped: true }
        }
      }
    }

    case 'rest': {
      // Remove one condition per player (oldest), costs time
      const players = {}
      for (const [id, p] of Object.entries(state.players)) {
        players[id] = p.conditions.length > 0
          ? { ...p, conditions: p.conditions.slice(1) }
          : p
      }
      return updateTrack({ ...state, players }, 'weather', -1)
    }

    default:
      return state
  }
}

// Resolve effect target to a playerId
const resolveTarget = (state, target, actingPlayerId) => {
  if (!target || target === 'self') return actingPlayerId
  if (target === 'leader') {
    const leader = Object.entries(state.players).find(([_, p]) => p.isLeader)
    return leader ? leader[0] : actingPlayerId
  }
  if (target === 'all') return null // caller handles "all" case
  // Direct playerId
  if (state.players[target]) return target
  return actingPlayerId
}

// Apply a list of effects in sequence
const applyEffects = (state, effects, story, ctx = {}) => {
  let s = state
  for (const e of effects) {
    if (e.type === 'condition' && (e.target === 'all')) {
      // Apply to all players
      for (const pid of Object.keys(s.players)) {
        s = applyEffect(s, { ...e, target: pid }, story, ctx)
      }
    } else {
      s = applyEffect(s, e, story, ctx)
    }
  }
  return s
}

export { applyEffect, applyEffects }
