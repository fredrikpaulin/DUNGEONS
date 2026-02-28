// Server entry point — Bun HTTP + WebSocket server
import { createDb } from './db.js'
import { createHandler } from './ws.js'
import { createAdventureStore } from './adventures.js'
import { createSessionStore } from './sessions.js'

const PORT = parseInt(process.env.PORT || '3000', 10)
const DB_PATH = process.env.DB_PATH || 'dungeons.db'
const ADVENTURES_DIR = process.env.ADVENTURES_DIR || './adventures'

// Initialize database
const db = createDb(DB_PATH)

// Load adventures
const adventureStore = await createAdventureStore(db, ADVENTURES_DIR)
console.log(`Loaded ${adventureStore.count()} adventure(s)`)

// Create session store
const sessionStore = createSessionStore(db)

// Create WebSocket handler
const wsHandler = createHandler(db, () => adventureStore.list(), sessionStore, adventureStore)

// Start server
const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url)

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      const ok = server.upgrade(req, {
        data: { userId: null, userName: null, sessionId: null }
      })
      if (ok) return undefined
      return new Response('WebSocket upgrade failed', { status: 400 })
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response('ok')
    }

    return new Response('DUNGEONS server. Connect via WebSocket at /ws', {
      headers: { 'Content-Type': 'text/plain' }
    })
  },
  websocket: wsHandler
})

console.log(`DUNGEONS server listening on port ${server.port}`)

export { server, db }
