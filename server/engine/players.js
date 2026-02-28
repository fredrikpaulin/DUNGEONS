// Player system — stat allocation, effective stats, tricks, role abilities

import { totalConditionModifier } from './conditions.js'

// Allocate stats from a map of { statId: value }
const allocateStats = (statDefs, assignments = {}) => {
  const stats = {}
  for (const s of statDefs) {
    stats[s.id] = assignments[s.id] !== undefined ? assignments[s.id] : 0
  }
  return stats
}

// Generate default descending stat values: [3, 2, 1, 0, ...]
const defaultStatValues = (count) => {
  const values = []
  for (let i = 0; i < count; i++) values.push(Math.max(0, 3 - i))
  return values
}

// Get effective stat value (base + condition modifiers, min 0)
const getEffectiveStat = (player, statId, story) => {
  const base = player.stats[statId] || 0
  const modifier = totalConditionModifier(player, statId, story)
  return Math.max(0, base + modifier)
}

// Check if player meets a stat requirement
const checkStat = (player, statId, min, story) =>
  getEffectiveStat(player, statId, story) >= min

// Get the trick definition for a player from the story
const getPlayerTrick = (player, story) => {
  const role = (story.roles || []).find(r => r.id === player.role)
  if (!role) return null
  return (role.tricks || []).find(t => t.id === player.trick) || null
}

// Check if a trick can be used
const canUseTrick = (player, trick, state) => {
  if (!trick || player.trickUsed) return false
  if (trick.uses === 'once_per_dungeon') return state.phase === 'playing'
  if (trick.uses === 'once_per_room') return true
  if (trick.uses === 'once') return !player.trickUsed
  if (trick.uses === 'passive') return false // passive tricks apply automatically
  return true
}

// Mark trick as used for a player
const useTrick = (state, playerId) => {
  const player = state.players[playerId]
  if (!player) return state
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, trickUsed: true }
    }
  }
}

// Reset tricks for all players
const resetTricks = (state) => {
  const players = {}
  for (const [id, p] of Object.entries(state.players)) {
    players[id] = { ...p, trickUsed: false }
  }
  return { ...state, players }
}

// Player summary for display
const playerSummary = (player, story) => ({
  id: player.id,
  name: player.name,
  role: player.role,
  isLeader: player.isLeader,
  currentRoom: player.currentRoom,
  stats: Object.fromEntries(
    Object.keys(player.stats).map(s => [s, {
      base: player.stats[s],
      effective: getEffectiveStat(player, s, story)
    }])
  ),
  conditions: player.conditions,
  items: player.items,
  trick: player.trick,
  trickUsed: player.trickUsed
})

export {
  allocateStats, defaultStatValues,
  getEffectiveStat, checkStat,
  getPlayerTrick, canUseTrick, useTrick, resetTricks,
  playerSummary
}
