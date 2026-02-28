import { test, expect, describe } from 'bun:test'
import { createSessionStore } from '../sessions.js'
import { createAdventureStore } from '../adventures.js'
import { createDb } from '../db.js'
import { createUser } from '../users.js'
import { pack, unpack } from '../../shared/protocol.js'

const fixturesDir = './server/tests/fixtures/adventures'

const setup = async () => {
  const db = createDb()
  const adventureStore = await createAdventureStore(db, fixturesDir)
  const sessionStore = createSessionStore(db)
  const advList = adventureStore.list()
  const adventure = adventureStore.get(advList[0].id)

  const u1 = createUser(db, 'Erik')

  return { db, sessionStore, adventureStore, adventure, u1 }
}

describe('error handling — session operations', () => {
  test('move before game starts fails', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    // Don't start — try to move
    const result = sessionStore.movePlayer(session.id, u1.user.id, 'hub')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('not in progress')
  })

  test('choice before game starts fails', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    const result = sessionStore.doChoice(session.id, u1.user.id, 'hub_rest', 'careful', 'USE')
    expect(result.ok).toBe(false)
  })

  test('finale before game starts fails', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    const result = sessionStore.doFinale(session.id, u1.user.id, 'x', 'y')
    expect(result.ok).toBe(false)
  })

  test('move with invalid user fails', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    sessionStore.start(session.id, u1.user.id)
    const result = sessionStore.movePlayer(session.id, 'nonexistent-user', 'hub')
    expect(result.ok).toBe(false)
  })

  test('choice with nonexistent session fails', async () => {
    const { sessionStore, u1 } = await setup()
    const result = sessionStore.doChoice('nonexistent', u1.user.id, 'a', 'b', 'c')
    expect(result.ok).toBe(false)
  })

  test('move to nonexistent session fails', async () => {
    const { sessionStore, u1 } = await setup()
    const result = sessionStore.movePlayer('nonexistent', u1.user.id, 'hub')
    expect(result.ok).toBe(false)
  })

  test('select role on nonexistent session fails', async () => {
    const { sessionStore, u1 } = await setup()
    const result = sessionStore.selectRole('nonexistent', u1.user.id, 'explorer')
    expect(result.ok).toBe(false)
  })

  test('select role on started session fails', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    sessionStore.start(session.id, u1.user.id)
    const result = sessionStore.selectRole(session.id, u1.user.id, 'thinker')
    expect(result.ok).toBe(false)
  })
})

describe('error handling — protocol', () => {
  test('pack/unpack handles null gracefully', () => {
    expect(unpack(null)).toBeNull()
    expect(unpack(undefined)).toBeNull()
    expect(unpack('')).toBeNull()
    expect(unpack('{invalid}')).toBeNull()
  })

  test('pack produces valid JSON', () => {
    const msg = { type: 'test', data: 'hello' }
    const packed = pack(msg)
    const unpacked = unpack(packed)
    expect(unpacked.type).toBe('test')
    expect(unpacked.data).toBe('hello')
  })

  test('unpack handles deeply nested objects', () => {
    const msg = { type: 'test', nested: { deep: { value: 42 } } }
    const packed = pack(msg)
    const unpacked = unpack(packed)
    expect(unpacked.nested.deep.value).toBe(42)
  })
})

describe('error handling — edge cases', () => {
  test('double start fails', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    sessionStore.start(session.id, u1.user.id)
    const result = sessionStore.start(session.id, u1.user.id)
    expect(result.ok).toBe(false)
  })

  test('empty session cleanup on last leave', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    const result = sessionStore.leave(session.id, u1.user.id)
    expect(result.empty).toBe(true)
    expect(sessionStore.get(session.id)).toBeNull()
  })

  test('buildRoomView on ended game returns null-ish room', async () => {
    const { sessionStore, adventure, u1 } = await setup()
    const session = sessionStore.create(adventure.id, adventure, u1.user.id, u1.user.name)
    sessionStore.selectRole(session.id, u1.user.id, 'explorer')
    sessionStore.start(session.id, u1.user.id)
    sessionStore.movePlayer(session.id, u1.user.id, 'hub')
    sessionStore.doFinale(session.id, u1.user.id, 'x', 'y')

    // Game is ended, but room view should still work (player was in hub)
    const view = sessionStore.buildRoomView(session.id, u1.user.id)
    expect(view).not.toBeNull()
    expect(view.room.id).toBe('hub')
  })
})
