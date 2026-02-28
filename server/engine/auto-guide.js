// Auto-guide — server-driven Guide decisions
// Selects clues, complications, NPC scenes automatically

import { selectClue, isClueFound, getClueDetail } from './clues.js'
import { selectComplication } from './complications.js'
import { getNpcScene } from './npcs.js'

// Auto-select a clue for a room (uses secret combo assignment)
const autoSelectClue = (room, state, story) => selectClue(room, state, story)

// Auto-select a complication
const autoSelectComplication = (size, state, story) =>
  selectComplication(story, size, state.complicationHistory)

// Get NPC scene for auto-guide (considers guilt state)
const autoNpcScene = (npc, visitNumber, state) =>
  getNpcScene(npc, visitNumber, state)

// Build a summary of secrets for debugging/logging
const guideSummary = (state, story) => {
  const combo = state.secret
  const foundClues = [...state.cluesFound, ...state.bonusCluesFound]
  const allClues = [...(story.clues?.core || []), ...(story.clues?.bonus || [])]

  return {
    culprit: combo.culprit,
    hideout: combo.hideout,
    cluesFound: foundClues.map(id => {
      const c = allClues.find(cl => cl.id === id)
      return { id, text: c?.text, pointsTo: c?.pointsTo }
    }),
    clueAssignments: Object.entries(combo.clueAssignments || {}).map(([room, clueId]) => ({
      room,
      clueId,
      found: foundClues.includes(clueId)
    })),
    npcs: (story.npcs || []).map(n => ({
      id: n.id,
      name: n.name,
      visits: state.npcState[n.id]?.visits || 0,
      isGuilty: combo.culprit === n.id
    })),
    weather: state.tracks.weather?.value,
    noise: state.tracks.noise?.value,
    dungeonsVisited: state.dungeonsVisited,
    playerCount: Object.keys(state.players).length,
    turnCount: state.turnCount
  }
}

export { autoSelectClue, autoSelectComplication, autoNpcScene, guideSummary }
