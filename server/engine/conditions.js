// Conditions — status effects with stat modifiers and cure logic

// Add a condition to a player (no duplicate)
const addCondition = (player, conditionId) => {
  if (player.conditions.includes(conditionId)) return player
  return { ...player, conditions: [...player.conditions, conditionId] }
}

// Remove a condition from a player
const removeCondition = (player, conditionId) => ({
  ...player,
  conditions: player.conditions.filter(c => c !== conditionId)
})

// Check if a player has a condition
const hasCondition = (player, conditionId) =>
  player.conditions.includes(conditionId)

// Get the stat modifier for a condition (from story definition)
const getConditionModifier = (conditionId, stat, story) => {
  const def = (story.conditions || []).find(c => c.id === conditionId)
  if (!def?.statModifier) return 0
  return def.statModifier.stat === stat ? def.statModifier.delta : 0
}

// Total stat modifier from all of a player's conditions
const totalConditionModifier = (player, stat, story) =>
  player.conditions.reduce((sum, cId) => sum + getConditionModifier(cId, stat, story), 0)

// Check if a condition can be cured by a given method (e.g. "rest", "item:torch")
const canCure = (conditionId, method, story) => {
  const def = (story.conditions || []).find(c => c.id === conditionId)
  return (def?.curedBy || []).includes(method)
}

// Apply rest cure — remove the oldest condition curable by "rest" from a player
const applyCureRest = (player, story) => {
  const curable = player.conditions.find(c => canCure(c, 'rest', story))
  if (!curable) return player
  return removeCondition(player, curable)
}

// Apply rest cure to all players in state
const applyCureAllRest = (state, story) => {
  const players = {}
  for (const [id, p] of Object.entries(state.players)) {
    players[id] = applyCureRest(p, story)
  }
  return { ...state, players }
}

export {
  addCondition, removeCondition, hasCondition,
  getConditionModifier, totalConditionModifier,
  canCure, applyCureRest, applyCureAllRest
}
