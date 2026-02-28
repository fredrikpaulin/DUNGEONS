// Users — simple name-based auth, no passwords
// For kids aged 6-12, we keep it simple: pick a name, that's your identity

const generateId = () => crypto.randomUUID()

const createUser = (db, name) => {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length < 1 || trimmed.length > 30) {
    return { ok: false, error: 'Name must be 1-30 characters' }
  }

  const existing = db.query('SELECT id, name FROM users WHERE name = ?').get(trimmed)
  if (existing) {
    return { ok: false, error: 'Name already taken' }
  }

  const id = generateId()
  const now = Date.now()
  db.query('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)').run(id, trimmed, now)
  return { ok: true, user: { id, name: trimmed } }
}

const loginUser = (db, name) => {
  const trimmed = name.trim()
  const user = db.query('SELECT id, name FROM users WHERE name = ?').get(trimmed)
  if (!user) {
    return { ok: false, error: 'User not found' }
  }
  return { ok: true, user: { id: user.id, name: user.name } }
}

const getUser = (db, id) => {
  return db.query('SELECT id, name FROM users WHERE id = ?').get(id) || null
}

export { createUser, loginUser, getUser }
