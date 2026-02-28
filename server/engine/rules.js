// Choice resolver — stat checks, item requirements, approach resolution, verb aptness

import { getEffectiveStat } from './players.js'
import { hasItem } from './items.js'

// Check if a player meets a choice's stat requirement
const meetsRequirement = (player, choice, story) => {
  if (!choice.requires) return true
  return getEffectiveStat(player, choice.requires.stat, story) >= choice.requires.min
}

// Check if a player has the required item
const meetsItemRequirement = (player, choice) => {
  if (!choice.requiresItem) return true
  return hasItem(player, choice.requiresItem)
}

// Check revealAfter conditions (e.g. "clue:4" means need 4+ clues found)
const meetsRevealCondition = (state, condition) => {
  if (!condition) return true
  if (condition.startsWith('clue:')) {
    const needed = parseInt(condition.split(':')[1], 10)
    return (state.cluesFound.length + state.bonusCluesFound.length) >= needed
  }
  if (condition.startsWith('npc:')) {
    const npcId = condition.split(':')[1]
    return (state.npcState[npcId]?.visits || 0) > 0
  }
  if (condition.startsWith('visit:')) {
    const needed = parseInt(condition.split(':')[1], 10)
    return state.hubVisits >= needed
  }
  return true
}

// Check all revealAfter conditions for a choice
const isChoiceRevealed = (choice, state) => {
  if (!choice.revealAfter?.length) return true
  return choice.revealAfter.every(cond => meetsRevealCondition(state, cond))
}

// Get available choices for a player in a room
const getAvailableChoices = (room, player, state, story) =>
  (room.choices || []).filter(c =>
    isChoiceRevealed(c, state) &&
    meetsRequirement(player, c, story) &&
    meetsItemRequirement(player, c)
  )

// Get all choices with availability status (for display)
const getChoicesWithStatus = (room, player, state, story) =>
  (room.choices || [])
    .filter(c => isChoiceRevealed(c, state))
    .map(c => ({
      ...c,
      available: meetsRequirement(player, c, story) && meetsItemRequirement(player, c)
    }))

// Resolve approach effects
const resolveApproach = (choice, approach, story) => {
  const approaches = story.config?.approaches || []
  const def = approaches.find(a => a.id === approach)
  const baseEffects = [...(choice.effects || [])]
  const approachEffects = def?.effects || []
  const complication = def?.requiresComplication || false
  return {
    effects: [...baseEffects, ...approachEffects],
    complication,
    target: choice.target,
    narrative: choice.narrative || ''
  }
}

// Check verb aptness — does the verb match the choice's verb tag?
const checkVerbAptness = (choice, verb) =>
  !!(choice.verb && verb && choice.verb.toLowerCase() === verb.toLowerCase())

// Full choice resolution
const resolveChoice = (state, room, choiceId, approach, verb, story, ctx = {}) => {
  const choice = (room.choices || []).find(c => c.id === choiceId)
  if (!choice) return null

  const result = resolveApproach(choice, approach, story)

  // Verb aptness bonus
  if (verb && checkVerbAptness(choice, verb)) {
    result.effects.push({ type: 'verb_reward' })
    result.verbApt = true
  }

  return result
}

export {
  meetsRequirement, meetsItemRequirement,
  meetsRevealCondition, isChoiceRevealed,
  getAvailableChoices, getChoicesWithStatus,
  resolveApproach, checkVerbAptness, resolveChoice
}
