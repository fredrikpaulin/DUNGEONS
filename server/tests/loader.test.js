import { test, expect, describe } from 'bun:test'
import { loadStoryFromFile, loadStoryFromObject, buildLookups } from '../loader/story-loader.js'
import { validate } from '../loader/validate.js'

const miniStory = await Bun.file('./server/tests/fixtures/mini-story.json').json()

describe('validate', () => {
  test('valid story passes validation', () => {
    const result = validate(miniStory, { required: ['meta', 'config', 'rooms'] })
    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('missing meta fails', () => {
    const { ok, errors } = validate({ config: {}, rooms: {} }, { required: ['meta', 'config', 'rooms'] })
    expect(ok).toBe(false)
    expect(errors.some(e => e.includes('meta'))).toBe(true)
  })

  test('missing rooms fails', () => {
    const { ok } = validate({ meta: { title: 'T', version: '1' }, config: {} }, { required: ['meta', 'config', 'rooms'] })
    expect(ok).toBe(false)
  })

  test('room missing narrative fails', () => {
    const story = {
      meta: { title: 'T', version: '1' },
      config: {},
      rooms: { r1: { id: 'r1', name: 'Room' } }
    }
    const { ok, errors } = validate(story, { required: ['meta', 'config', 'rooms'] })
    expect(ok).toBe(false)
    expect(errors.some(e => e.includes('narrative'))).toBe(true)
  })

  test('choice targeting non-existent room reports error', () => {
    const story = {
      meta: { title: 'T', version: '1' },
      config: {},
      rooms: {
        r1: { id: 'r1', name: 'Room', narrative: 'Test', choices: [
          { id: 'c1', label: 'Go', target: 'nonexistent' }
        ]}
      }
    }
    const { ok, errors } = validate(story, { required: ['meta', 'config', 'rooms'] })
    expect(ok).toBe(false)
    expect(errors.some(e => e.includes('nonexistent'))).toBe(true)
  })

  test('invalid startRoom reports error', () => {
    const story = {
      meta: { title: 'T', version: '1' },
      config: { startRoom: 'missing_room' },
      rooms: { hub: { id: 'hub', name: 'Hub', narrative: 'Hub', choices: [] } }
    }
    const { errors } = validate(story, { required: ['meta', 'config', 'rooms'] })
    expect(errors.some(e => e.includes('startRoom'))).toBe(true)
  })
})

describe('loadStoryFromObject', () => {
  test('loads valid story', () => {
    const result = loadStoryFromObject(miniStory)
    expect(result.ok).toBe(true)
    expect(result.story).toBe(miniStory)
    expect(result.lookups).not.toBeNull()
  })

  test('rejects invalid story', () => {
    const result = loadStoryFromObject({ config: {} })
    expect(result.ok).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('loadStoryFromFile', () => {
  test('loads mini-story fixture', async () => {
    const result = await loadStoryFromFile('./server/tests/fixtures/mini-story.json')
    expect(result.ok).toBe(true)
    expect(result.story.meta.title).toBe('Test Adventure')
  })

  test('fails for missing file', async () => {
    const result = await loadStoryFromFile('./nonexistent.json')
    expect(result.ok).toBe(false)
  })
})

describe('buildLookups', () => {
  test('builds all lookup maps', () => {
    const lookups = buildLookups(miniStory)
    expect(lookups.items.get('torch').name).toBe('Torch')
    expect(lookups.clues.get('K1').type).toBe('core')
    expect(lookups.clues.get('B1').type).toBe('bonus')
    expect(lookups.npcs.get('elder').name).toBe('Elder Oak')
    expect(lookups.roles.get('explorer').name).toBe('Explorer')
    expect(lookups.conditions.get('frozen').name).toBe('Frozen')
    expect(lookups.complications.small).toHaveLength(2)
    expect(lookups.complications.large).toHaveLength(2)
    expect(lookups.secrets).toHaveLength(2)
    expect(lookups.stats).toHaveLength(4)
    expect(lookups.verbMenu).toHaveLength(5)
    expect(lookups.strings.also_here).toBe('Also here:')
  })
})
