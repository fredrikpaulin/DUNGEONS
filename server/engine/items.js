// Items — per-player inventory, shared pool, draw/add/remove

// Add an item to a player's inventory
const addItem = (player, itemId) => ({
  ...player,
  items: [...player.items, itemId]
})

// Remove first occurrence of an item from a player's inventory
const removeItem = (player, itemId) => {
  const idx = player.items.indexOf(itemId)
  if (idx < 0) return player
  return { ...player, items: [...player.items.slice(0, idx), ...player.items.slice(idx + 1)] }
}

// Check if a player has an item
const hasItem = (player, itemId) => player.items.includes(itemId)

// Draw items from the shared pool, give to a player
const drawItems = (state, playerId, count) => {
  const drawn = state.itemPool.slice(0, count)
  const remaining = state.itemPool.slice(count)
  const player = state.players[playerId]
  if (!player) return state
  return {
    ...state,
    itemPool: remaining,
    players: {
      ...state.players,
      [playerId]: { ...player, items: [...player.items, ...drawn] }
    }
  }
}

// Add a specific item to a player (not from pool)
const giveItem = (state, playerId, itemId) => {
  const player = state.players[playerId]
  if (!player) return state
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: addItem(player, itemId)
    }
  }
}

// Remove a specific item from a player, return to pool
const takeItem = (state, playerId, itemId) => {
  const player = state.players[playerId]
  if (!player || !hasItem(player, itemId)) return state
  return {
    ...state,
    itemPool: [...state.itemPool, itemId],
    players: {
      ...state.players,
      [playerId]: removeItem(player, itemId)
    }
  }
}

// Get item definition from story
const getItemDef = (story, itemId) =>
  (story.items || []).find(i => i.id === itemId) || null

export { addItem, removeItem, hasItem, drawItems, giveItem, takeItem, getItemDef }
