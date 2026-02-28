// NPC system — visit tracking, guilty/innocent variants, scene selection

// Get the scene for an NPC based on visit count and guilt state
const getNpcScene = (npc, visitNumber, state) => {
  const key = `hub_visit_${visitNumber}`
  const isGuilty = state.secret?.culprit === npc.id

  // Check for variant override first
  const variant = isGuilty ? npc.guiltyVariant : npc.innocentVariant
  const override = variant?.sceneOverrides?.[key]
  if (override) return override

  // Fall back to base scene
  return npc.scenes?.[key] || null
}

// Record a visit to an NPC
const visitNpc = (state, npcId) => {
  const npc = state.npcState[npcId]
  if (!npc) return state
  return {
    ...state,
    npcState: {
      ...state.npcState,
      [npcId]: { ...npc, visits: npc.visits + 1 }
    }
  }
}

// Get NPC reaction scene (e.g. when accused)
const getNpcReaction = (npc, reactionKey) =>
  npc.reactions?.[reactionKey] || null

// Get NPC definition from story
const getNpcDef = (story, npcId) =>
  (story.npcs || []).find(n => n.id === npcId) || null

// Mark information as revealed for an NPC
const revealNpcInfo = (state, npcId, info) => {
  const npc = state.npcState[npcId]
  if (!npc || npc.revealed.includes(info)) return state
  return {
    ...state,
    npcState: {
      ...state.npcState,
      [npcId]: { ...npc, revealed: [...npc.revealed, info] }
    }
  }
}

// NPC summary for display
const npcSummary = (state, story) =>
  (story.npcs || []).map(n => ({
    id: n.id,
    name: n.name,
    role: n.role,
    visits: state.npcState[n.id]?.visits || 0,
    revealed: state.npcState[n.id]?.revealed || []
  }))

export { getNpcScene, visitNpc, getNpcReaction, getNpcDef, revealNpcInfo, npcSummary }
