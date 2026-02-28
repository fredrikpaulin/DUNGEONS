import { test, expect, describe } from 'bun:test'
import { isTriggered, getTrackTriggerEffects, trackSummary } from '../engine/tracks.js'
import { createGameState } from '../engine/state.js'

const miniStory = await Bun.file('./server/tests/fixtures/mini-story.json').json()
const combo = miniStory.secrets.combinations[0]

describe('isTriggered', () => {
  test('returns true when value equals triggerAt', () => {
    expect(isTriggered({ value: 0, triggerAt: 0 })).toBe(true)
    expect(isTriggered({ value: 6, triggerAt: 6 })).toBe(true)
  })

  test('returns false when value does not equal triggerAt', () => {
    expect(isTriggered({ value: 3, triggerAt: 0 })).toBe(false)
  })

  test('returns false when no triggerAt defined', () => {
    expect(isTriggered({ value: 0 })).toBe(false)
  })
})

describe('getTrackTriggerEffects', () => {
  test('returns trigger effects for weather track', () => {
    const effects = getTrackTriggerEffects(miniStory, 'weather')
    expect(effects).toHaveLength(1)
    expect(effects[0].type).toBe('narrative')
    expect(effects[0].text).toContain('storm')
  })

  test('returns trigger effects for noise track', () => {
    const effects = getTrackTriggerEffects(miniStory, 'noise')
    expect(effects).toHaveLength(1)
    expect(effects[0].text).toContain('guard')
  })

  test('returns empty for unknown track', () => {
    expect(getTrackTriggerEffects(miniStory, 'bogus')).toEqual([])
  })
})

describe('trackSummary', () => {
  test('returns summary of all tracks', () => {
    const state = createGameState(miniStory, combo, {})
    const summary = trackSummary(state, miniStory)
    expect(summary).toHaveLength(2)
    expect(summary[0].id).toBe('weather')
    expect(summary[0].value).toBe(6)
    expect(summary[0].triggered).toBe(false)
    expect(summary[1].id).toBe('noise')
  })
})
