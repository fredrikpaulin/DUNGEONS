// Layout — screen region calculation for the game view
// Assumes 80x24 minimum terminal

const getTermSize = () => ({
  cols: process.stdout.columns || 80,
  rows: process.stdout.rows || 24
})

// Standard layout regions
const layout = () => {
  const { cols, rows } = getTermSize()

  return {
    // Status bar at top (1 row)
    status: { x: 0, y: 0, w: cols, h: 1 },

    // Main narrative area
    narrative: { x: 0, y: 2, w: cols - 24, h: rows - 6 },

    // Sidebar (stats, items, conditions)
    sidebar: { x: cols - 23, y: 2, w: 22, h: rows - 6 },

    // Choices area at bottom
    choices: { x: 0, y: rows - 4, w: cols, h: 4 },

    // Full dimensions
    cols,
    rows
  }
}

export { layout, getTermSize }
