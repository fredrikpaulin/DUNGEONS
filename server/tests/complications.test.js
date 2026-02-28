import { test, expect, describe } from 'bun:test'
import { selectComplication, selectComplicationRandom, recordComplication } from '../engine/complications.js'
import { createGameState } from '../engine/state.js'

const miniStory = await Bun.file('./server/tests/fixtures/mini-story.json').json()
const combo = miniStory.secrets.combinations[0]

describe('selectComplication', () => {
  test('selects a small complication', () => {
    const comp = selectComplication(miniStory, 'small', [])
    expect(comp).not.toBeNull()
    expect(comp.size).toBe('small')
  })

  test('selects a large complication', () => {
    const comp = selectComplication(miniStory, 'large', [])
    expect(comp).not.toBeNull()
    expect(comp.size).toBe('large')
  })

  test('avoids recently used complications', () => {
    const history = [{ id: 1, turn: 0 }] // id 1 = "Loose rocks" (small)
    const comp = selectComplication(miniStory, 'small', history)
    expect(comp.id).not.toBe(1)
  })

  test('allows repeats when all have been used', () => {
    const history = [{ id: 1, turn: 0 }, { id: 2, turn: 1 }] // both smalls
    const comp = selectComplication(miniStory, 'small', history)
    expect(comp).not.toBeNull()
  })

  test('returns null for unknown size', () => {
    expect(selectComplication(miniStory, 'huge', [])).toBeNull()
  })
})

describe('recordComplication', () => {
  test('adds to history', () => {
    const state = createGameState(miniStory, combo, {})
    const s = recordComplication(state, 1)
    expect(s.complicationHistory).toHaveLength(1)
    expect(s.complicationHistory[0].id).toBe(1)
  })

  test('preserves previous history', () => {
    let state = createGameState(miniStory, combo, {})
    state = recordComplication(state, 1)
    state = recordComplication(state, 3)
    expect(state.complicationHistory).toHaveLength(2)
  })
})
