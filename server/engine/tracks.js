// Track logic — threshold detection, trigger effects, summaries

// Check if a track has hit its trigger value
const isTriggered = (track) =>
  track.triggerAt !== undefined && track.value === track.triggerAt

// Get trigger effects for a track from story definition
const getTrackTriggerEffects = (story, trackId) => {
  const def = (story.config?.tracks || []).find(t => t.id === trackId)
  return def?.triggerEffects || []
}

// Get a summary of all tracks for display
const trackSummary = (state, story) =>
  (story.config?.tracks || []).map(def => ({
    id: def.id,
    name: def.name,
    value: state.tracks[def.id]?.value ?? def.start,
    min: def.min,
    max: def.max,
    direction: def.direction,
    triggered: isTriggered(state.tracks[def.id] || {})
  }))

export { isTriggered, getTrackTriggerEffects, trackSummary }
