import { test, expect, describe } from 'bun:test'
import { scanAdventures, registerAdventures, listAdventures, createAdventureStore } from '../adventures.js'
import { createDb } from '../db.js'

const fixturesDir = './server/tests/fixtures/adventures'

describe('scanAdventures', () => {
  test('finds adventure JSON files in directory', async () => {
    const adventures = await scanAdventures(fixturesDir)
    expect(adventures.length).toBeGreaterThan(0)
  })

  test('loaded adventure has required fields', async () => {
    const adventures = await scanAdventures(fixturesDir)
    const a = adventures[0]
    expect(a.id).toBeTruthy()
    expect(a.title).toBeTruthy()
    expect(a.filePath).toBeTruthy()
    expect(a.story).toBeTruthy()
    expect(a.lookups).toBeTruthy()
    expect(a.playerCount).toBeTruthy()
  })

  test('uses meta.title as title', async () => {
    const adventures = await scanAdventures(fixturesDir)
    const a = adventures[0]
    expect(a.title).toBe('Test Adventure')
  })

  test('returns empty array for nonexistent directory', async () => {
    const adventures = await scanAdventures('./nonexistent-dir')
    expect(adventures).toHaveLength(0)
  })

  test('player count from meta', async () => {
    const adventures = await scanAdventures(fixturesDir)
    const a = adventures[0]
    expect(a.playerCount.min).toBe(1)
    expect(a.playerCount.max).toBe(4)
  })
})

describe('registerAdventures + listAdventures', () => {
  test('registers and lists adventures in db', async () => {
    const db = createDb()
    const adventures = await scanAdventures(fixturesDir)
    registerAdventures(db, adventures)
    const listed = listAdventures(db)
    expect(listed.length).toBe(adventures.length)
    expect(listed[0].title).toBe('Test Adventure')
  })

  test('re-registering replaces existing', async () => {
    const db = createDb()
    const adventures = await scanAdventures(fixturesDir)
    registerAdventures(db, adventures)
    registerAdventures(db, adventures)
    const listed = listAdventures(db)
    expect(listed.length).toBe(adventures.length)
  })
})

describe('createAdventureStore', () => {
  test('creates store with list, get, count', async () => {
    const db = createDb()
    const store = await createAdventureStore(db, fixturesDir)
    expect(store.count()).toBeGreaterThan(0)

    const list = store.list()
    expect(list[0].id).toBeTruthy()
    expect(list[0].title).toBe('Test Adventure')
    expect(list[0].playerCount).toBeTruthy()
  })

  test('get returns adventure by id', async () => {
    const db = createDb()
    const store = await createAdventureStore(db, fixturesDir)
    const list = store.list()
    const adventure = store.get(list[0].id)
    expect(adventure).not.toBeNull()
    expect(adventure.story).toBeTruthy()
    expect(adventure.lookups).toBeTruthy()
  })

  test('get returns null for unknown id', async () => {
    const db = createDb()
    const store = await createAdventureStore(db, fixturesDir)
    expect(store.get('nonexistent')).toBeNull()
  })

  test('registers to db', async () => {
    const db = createDb()
    await createAdventureStore(db, fixturesDir)
    const listed = listAdventures(db)
    expect(listed.length).toBeGreaterThan(0)
  })
})
