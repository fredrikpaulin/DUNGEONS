// Complications — selection from table, avoiding repeats

// Select a complication of given size, avoiding recently used ones
const selectComplication = (story, size, history = []) => {
  const pool = (story.complications || []).filter(c => c.size === size)
  if (!pool.length) return null

  const recentIds = history.map(h => h.id)
  const fresh = pool.filter(c => !recentIds.includes(c.id))

  // If all have been used, allow repeats
  const candidates = fresh.length ? fresh : pool

  // Pick deterministically for testability: first available
  return candidates[0] || null
}

// Select a random complication (for production use)
const selectComplicationRandom = (story, size, history = []) => {
  const pool = (story.complications || []).filter(c => c.size === size)
  if (!pool.length) return null

  const recentIds = history.map(h => h.id)
  const fresh = pool.filter(c => !recentIds.includes(c.id))
  const candidates = fresh.length ? fresh : pool

  return candidates[Math.floor(Math.random() * candidates.length)]
}

// Record a complication in history
const recordComplication = (state, complicationId) => ({
  ...state,
  complicationHistory: [
    ...state.complicationHistory,
    { id: complicationId, turn: state.turnCount }
  ]
})

export { selectComplication, selectComplicationRandom, recordComplication }
