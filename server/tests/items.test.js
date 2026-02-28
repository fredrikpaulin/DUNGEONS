import { test, expect, describe } from 'bun:test'
import { addItem, removeItem, hasItem, drawItems, giveItem, takeItem, getItemDef } from '../engine/items.js'
import { createPlayer, createGameState } from '../engine/state.js'

const miniStory = await Bun.file('./server/tests/fixtures/mini-story.json').json()
const combo = miniStory.secrets.combinations[0]

const mkPlayer = () => createPlayer('p1', 'Erik', 'explorer', { str: 3 })
const mkState = () => createGameState(miniStory, combo, { p1: mkPlayer(), p2: createPlayer('p2', 'Maja', 'thinker', { per: 3 }) })

describe('addItem / removeItem / hasItem', () => {
  test('adds an item', () => {
    const p = addItem(mkPlayer(), 'torch')
    expect(hasItem(p, 'torch')).toBe(true)
  })

  test('removes an item', () => {
    let p = addItem(mkPlayer(), 'torch')
    p = removeItem(p, 'torch')
    expect(hasItem(p, 'torch')).toBe(false)
  })

  test('removes only first occurrence', () => {
    let p = addItem(mkPlayer(), 'torch')
    p = addItem(p, 'torch')
    p = removeItem(p, 'torch')
    expect(p.items).toEqual(['torch'])
  })

  test('no-op removing item not in inventory', () => {
    const p = removeItem(mkPlayer(), 'torch')
    expect(p.items).toEqual([])
  })
})

describe('drawItems', () => {
  test('draws from item pool to player', () => {
    const state = mkState()
    const s = drawItems(state, 'p1', 2)
    expect(s.players.p1.items).toHaveLength(2)
    expect(s.itemPool).toHaveLength(4)
  })

  test('draws nothing when count is 0', () => {
    const state = mkState()
    const s = drawItems(state, 'p1', 0)
    expect(s.players.p1.items).toHaveLength(0)
    expect(s.itemPool).toHaveLength(6)
  })

  test('handles drawing more than pool has', () => {
    const state = mkState()
    const s = drawItems(state, 'p1', 100)
    expect(s.players.p1.items).toHaveLength(6)
    expect(s.itemPool).toHaveLength(0)
  })
})

describe('giveItem', () => {
  test('gives specific item to player', () => {
    const state = mkState()
    const s = giveItem(state, 'p1', 'key')
    expect(s.players.p1.items).toContain('key')
  })

  test('does not remove from pool', () => {
    const state = mkState()
    const s = giveItem(state, 'p1', 'key')
    expect(s.itemPool).toHaveLength(6) // pool unchanged
  })
})

describe('takeItem', () => {
  test('removes item from player and returns to pool', () => {
    let state = mkState()
    state = giveItem(state, 'p1', 'torch')
    const s = takeItem(state, 'p1', 'torch')
    expect(s.players.p1.items).not.toContain('torch')
    expect(s.itemPool).toHaveLength(7) // 6 + returned
  })

  test('no-op if player doesnt have item', () => {
    const state = mkState()
    const s = takeItem(state, 'p1', 'torch')
    expect(s).toBe(state)
  })
})

describe('getItemDef', () => {
  test('returns item definition', () => {
    const def = getItemDef(miniStory, 'torch')
    expect(def.name).toBe('Torch')
    expect(def.tags).toContain('fire')
  })

  test('returns null for unknown item', () => {
    expect(getItemDef(miniStory, 'bogus')).toBeNull()
  })
})
