// Adventures — scan adventures directory, load available stories
import { loadStoryFromFile, buildLookups } from './loader/story-loader.js'

// Scan a directory for adventure JSON files, load and validate each
const scanAdventures = async (dir) => {
  const results = []
  try {
    const glob = new Bun.Glob('**/*.json')
    for await (const path of glob.scan({ cwd: dir, absolute: false })) {
      const fullPath = `${dir}/${path}`
      const loaded = await loadStoryFromFile(fullPath)
      if (loaded.ok) {
        results.push({
          id: loaded.story.meta?.id || path.replace(/\.json$/, '').replace(/\//g, '-'),
          title: loaded.story.meta?.title || path,
          filePath: fullPath,
          story: loaded.story,
          lookups: loaded.lookups,
          playerCount: loaded.story.meta?.playerCount || { min: 1, max: 4 }
        })
      }
    }
  } catch (err) {
    // Directory might not exist yet — that's fine
  }
  return results
}

// Register adventures into the database
const registerAdventures = (db, adventures) => {
  const stmt = db.query(
    'INSERT OR REPLACE INTO adventures (id, title, file_path, loaded_at) VALUES (?, ?, ?, ?)'
  )
  const now = Date.now()
  for (const a of adventures) {
    stmt.run(a.id, a.title, a.filePath, now)
  }
}

// Get adventure list from db
const listAdventures = (db) =>
  db.query('SELECT id, title, file_path FROM adventures').all()

// Create an adventure store — holds loaded stories in memory, syncs to db
const createAdventureStore = async (db, adventuresDir) => {
  const adventures = await scanAdventures(adventuresDir)
  registerAdventures(db, adventures)

  const byId = new Map(adventures.map(a => [a.id, a]))

  return {
    list: () => adventures.map(a => ({ id: a.id, title: a.title, playerCount: a.playerCount })),
    get: (id) => byId.get(id) || null,
    count: () => adventures.length
  }
}

export { scanAdventures, registerAdventures, listAdventures, createAdventureStore }
