// Story loader — load from file or object, validate, build lookup maps

import { validate } from './validate.js'

// Load story from a JSON file path
const loadStoryFromFile = async (filePath) => {
  try {
    const file = Bun.file(filePath)
    const story = await file.json()
    return loadStoryFromObject(story)
  } catch (err) {
    return { ok: false, errors: [`Failed to load story: ${err.message}`], story: null, lookups: null }
  }
}

// Load story from a plain object (already parsed)
const loadStoryFromObject = (story) => {
  const { ok, errors } = validate(story, { required: ['meta', 'config', 'rooms'] })
  if (!ok) return { ok: false, errors, story: null, lookups: null }

  const lookups = buildLookups(story)
  return { ok: true, errors: [], story, lookups }
}

// Build lookup maps for quick access
const buildLookups = (story) => ({
  rooms: story.rooms || {},
  items: new Map((story.items || []).map(i => [i.id, i])),
  clues: new Map([
    ...(story.clues?.core || []).map(c => [c.id, { ...c, type: 'core' }]),
    ...(story.clues?.bonus || []).map(c => [c.id, { ...c, type: 'bonus' }])
  ]),
  npcs: new Map((story.npcs || []).map(n => [n.id, n])),
  roles: new Map((story.roles || []).map(r => [r.id, r])),
  conditions: new Map((story.conditions || []).map(c => [c.id, c])),
  complications: {
    small: (story.complications || []).filter(c => c.size === 'small'),
    large: (story.complications || []).filter(c => c.size === 'large')
  },
  epilogues: story.epilogues || {},
  secrets: story.secrets?.combinations || [],
  stats: story.config?.stats || [],
  approaches: story.config?.approaches || [],
  tracks: story.config?.tracks || [],
  tokens: story.config?.tokens || [],
  verbMenu: story.config?.verbMenu || [],
  strings: story.strings || {}
})

export { loadStoryFromFile, loadStoryFromObject, buildLookups }
