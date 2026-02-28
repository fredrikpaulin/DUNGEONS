// Clue system — pool selection based on secret combo, deduplication

// Select a clue for a room based on the secret combo's clue assignments
const selectClue = (room, state, story) => {
  if (!room.clue?.pool?.length) return null

  // Check if the secret has a specific assignment for this room
  const assigned = state.secret?.clueAssignments?.[room.id]
  if (assigned && room.clue.pool.includes(assigned)) {
    // Only return if not already found
    if (!isClueFound(state, assigned)) return assigned
  }

  // Fallback: pick the first unfound clue from the pool
  for (const clueId of room.clue.pool) {
    if (!isClueFound(state, clueId)) return clueId
  }

  return null // all clues in this pool already found
}

// Check if a clue has been found (core or bonus)
const isClueFound = (state, clueId) =>
  state.cluesFound.includes(clueId) || state.bonusCluesFound.includes(clueId)

// Get clue definition from story
const getClueDetail = (story, clueId) => {
  const core = (story.clues?.core || []).find(c => c.id === clueId)
  if (core) return { ...core, type: 'core' }
  const bonus = (story.clues?.bonus || []).find(c => c.id === clueId)
  if (bonus) return { ...bonus, type: 'bonus' }
  return null
}

// Get summary of all found clues with their details
const clueSummary = (state, story) => {
  const found = state.cluesFound.map(id => getClueDetail(story, id)).filter(Boolean)
  const bonus = state.bonusCluesFound.map(id => getClueDetail(story, id)).filter(Boolean)
  return { core: found, bonus, total: found.length + bonus.length }
}

export { selectClue, isClueFound, getClueDetail, clueSummary }
