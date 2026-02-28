import { test, expect, describe } from 'bun:test'
import { createDb } from '../db.js'
import { createUser, loginUser, getUser } from '../users.js'

// Fresh in-memory db for each test group
const freshDb = () => createDb(':memory:')

describe('createUser', () => {
  test('creates a user with valid name', () => {
    const db = freshDb()
    const result = createUser(db, 'Erik')
    expect(result.ok).toBe(true)
    expect(result.user.name).toBe('Erik')
    expect(typeof result.user.id).toBe('string')
    expect(result.user.id.length).toBeGreaterThan(0)
  })

  test('trims whitespace from name', () => {
    const db = freshDb()
    const result = createUser(db, '  Maja  ')
    expect(result.ok).toBe(true)
    expect(result.user.name).toBe('Maja')
  })

  test('rejects empty name', () => {
    const db = freshDb()
    expect(createUser(db, '').ok).toBe(false)
    expect(createUser(db, '   ').ok).toBe(false)
  })

  test('rejects name longer than 30 chars', () => {
    const db = freshDb()
    const result = createUser(db, 'a'.repeat(31))
    expect(result.ok).toBe(false)
    expect(result.error).toContain('1-30')
  })

  test('rejects duplicate name', () => {
    const db = freshDb()
    createUser(db, 'Erik')
    const result = createUser(db, 'Erik')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('taken')
  })

  test('different names create different users', () => {
    const db = freshDb()
    const r1 = createUser(db, 'Erik')
    const r2 = createUser(db, 'Maja')
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    expect(r1.user.id).not.toBe(r2.user.id)
  })
})

describe('loginUser', () => {
  test('logs in existing user', () => {
    const db = freshDb()
    const created = createUser(db, 'Erik')
    const result = loginUser(db, 'Erik')
    expect(result.ok).toBe(true)
    expect(result.user.id).toBe(created.user.id)
    expect(result.user.name).toBe('Erik')
  })

  test('fails for non-existent user', () => {
    const db = freshDb()
    const result = loginUser(db, 'Nobody')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('not found')
  })

  test('trims whitespace', () => {
    const db = freshDb()
    createUser(db, 'Erik')
    const result = loginUser(db, '  Erik  ')
    expect(result.ok).toBe(true)
    expect(result.user.name).toBe('Erik')
  })
})

describe('getUser', () => {
  test('returns user by id', () => {
    const db = freshDb()
    const { user } = createUser(db, 'Erik')
    const found = getUser(db, user.id)
    expect(found).not.toBeNull()
    expect(found.name).toBe('Erik')
  })

  test('returns null for unknown id', () => {
    const db = freshDb()
    const found = getUser(db, 'nonexistent')
    expect(found).toBeNull()
  })
})

describe('database persistence', () => {
  test('users survive across queries', () => {
    const db = freshDb()
    createUser(db, 'Erik')
    createUser(db, 'Maja')
    createUser(db, 'Sven')

    const r1 = loginUser(db, 'Erik')
    const r2 = loginUser(db, 'Maja')
    const r3 = loginUser(db, 'Sven')

    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    expect(r3.ok).toBe(true)
  })
})
