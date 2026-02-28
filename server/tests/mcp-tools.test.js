import { test, expect, describe } from 'bun:test'
import { createTools, WRITING_GUIDE } from '../../mcp-server/tools.js'
import { mkdirSync } from 'fs'
import { $ } from 'bun'

const SCHEMA_PATH = './server/schema/story.schema.json'
let tmpCounter = 0

const mockSample = async ({ systemPrompt, messages }) => {
  const text = messages[0]?.content?.text || ''
  if (text.includes('Create a room')) return JSON.stringify({ id: 'gen_room', name: 'Generated Room', zone: 'dungeon', tags: [], narrative: 'A generated room.', exits: [], choices: [], onEnter: [], clue: null, items: null })
  return 'Mock AI response for: ' + text.slice(0, 50)
}

const setup = () => {
  const dir = `/tmp/dungeons-test-${++tmpCounter}-${Date.now()}`
  const uDir = `${dir}/_universes`
  mkdirSync(dir, { recursive: true })
  mkdirSync(uDir, { recursive: true })
  return { tools: createTools(dir, uDir, SCHEMA_PATH, mockSample), dir, uDir }
}

const readFile = async (dir, filename) => await Bun.file(`${dir}/${filename}`).json()

describe('scaffold_adventure', () => {
  test('creates a valid adventure file', async () => {
    const { tools, dir } = setup()
    const result = await tools.scaffoldAdventure({ filename: 'test.json', title: 'Test Adventure' })
    expect(result.valid).toBe(true)
    const story = await readFile(dir, 'test.json')
    expect(story.meta.title).toBe('Test Adventure')
    expect(story.rooms.hub).toBeDefined()
    expect(story.config.startRoom).toBe('hub')
    await $`rm -rf ${dir}`.quiet()
  })

  test('uses provided author and theme', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 't.json', title: 'Pirate Cove', author: 'Fredrik', theme: 'pirate' })
    const story = await readFile(dir, 't.json')
    expect(story.meta.author).toBe('Fredrik')
    expect(story.rooms.hub.narrative).toContain('pirate')
    await $`rm -rf ${dir}`.quiet()
  })

  test('uses default author when not provided', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 't.json', title: 'Default' })
    const story = await readFile(dir, 't.json')
    expect(story.meta.author).toBe('Unknown')
    await $`rm -rf ${dir}`.quiet()
  })

  test('includes all required sections', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 't.json', title: 'Full' })
    const story = await readFile(dir, 't.json')
    expect(story.config.tracks.length).toBeGreaterThan(0)
    expect(story.config.tokens.length).toBeGreaterThan(0)
    expect(story.config.stats.length).toBe(4)
    expect(story.config.approaches.length).toBe(3)
    expect(story.roles.length).toBe(4)
    expect(story.epilogues.win).toBeDefined()
    expect(story.epilogues.loss).toBeDefined()
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('add_room', () => {
  test('adds a room to existing adventure', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    const result = await tools.addRoom({ filename: 'a.json', room: { id: 'cave', name: 'Dark Cave', narrative: 'A dark cave.' } })
    expect(result.added).toBe('cave')
    expect(result.totalRooms).toBe(2)
    const story = await readFile(dir, 'a.json')
    expect(story.rooms.cave.name).toBe('Dark Cave')
    await $`rm -rf ${dir}`.quiet()
  })

  test('creates reverse exits via connectFrom', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    await tools.addRoom({
      filename: 'a.json',
      room: { id: 'mine', name: 'Mine', narrative: 'A mine.' },
      connectFrom: [{ roomId: 'hub', label: 'Enter the mine' }]
    })
    const story = await readFile(dir, 'a.json')
    expect(story.rooms.hub.exits.some(e => e.target === 'mine')).toBe(true)
    await $`rm -rf ${dir}`.quiet()
  })

  test('does not duplicate reverse exits', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    await tools.addRoom({ filename: 'a.json', room: { id: 'mine', name: 'Mine', narrative: 'A mine.' }, connectFrom: [{ roomId: 'hub', label: 'Mine' }] })
    await tools.addRoom({ filename: 'a.json', room: { id: 'mine', name: 'Mine Updated', narrative: 'Updated.' }, connectFrom: [{ roomId: 'hub', label: 'Mine' }] })
    const story = await readFile(dir, 'a.json')
    expect(story.rooms.hub.exits.filter(e => e.target === 'mine').length).toBe(1)
    await $`rm -rf ${dir}`.quiet()
  })

  test('fills defaults for optional fields', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    await tools.addRoom({ filename: 'a.json', room: { id: 'r1', name: 'Room', narrative: 'Text.' } })
    const story = await readFile(dir, 'a.json')
    expect(story.rooms.r1.zone).toBe('hub')
    expect(story.rooms.r1.tags).toEqual([])
    expect(story.rooms.r1.choices).toEqual([])
    expect(story.rooms.r1.clue).toBeNull()
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('update_room', () => {
  test('merges updates into existing room', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    await tools.updateRoom({ filename: 'a.json', roomId: 'hub', updates: { narrative: 'Updated narrative.' } })
    const story = await readFile(dir, 'a.json')
    expect(story.rooms.hub.narrative).toBe('Updated narrative.')
    expect(story.rooms.hub.name).toBe('The Hub')
    await $`rm -rf ${dir}`.quiet()
  })

  test('returns error for missing room', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    const result = await tools.updateRoom({ filename: 'a.json', roomId: 'nonexistent', updates: {} })
    expect(result.error).toContain('not found')
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('add_npc', () => {
  test('adds NPC to adventure', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    const result = await tools.addNpc({ filename: 'a.json', npc: { id: 'bob', name: 'Bob the Guard' } })
    expect(result.added).toBe('bob')
    const story = await readFile(dir, 'a.json')
    expect(story.npcs[0].name).toBe('Bob the Guard')
    expect(story.npcs[0].role).toBe('suspect')
    await $`rm -rf ${dir}`.quiet()
  })

  test('upserts existing NPC', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    await tools.addNpc({ filename: 'a.json', npc: { id: 'bob', name: 'Bob' } })
    await tools.addNpc({ filename: 'a.json', npc: { id: 'bob', name: 'Bob Updated', role: 'witness' } })
    const story = await readFile(dir, 'a.json')
    expect(story.npcs.length).toBe(1)
    expect(story.npcs[0].name).toBe('Bob Updated')
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('add_item', () => {
  test('adds item to adventure', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    const result = await tools.addItem({ filename: 'a.json', item: { id: 'key', name: 'Rusty Key', tags: ['key'] } })
    expect(result.added).toBe('key')
    const story = await readFile(dir, 'a.json')
    expect(story.items[0].tags).toContain('key')
    await $`rm -rf ${dir}`.quiet()
  })

  test('upserts existing item', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    await tools.addItem({ filename: 'a.json', item: { id: 'key', name: 'Key' } })
    await tools.addItem({ filename: 'a.json', item: { id: 'key', name: 'Golden Key' } })
    const story = await readFile(dir, 'a.json')
    expect(story.items.length).toBe(1)
    expect(story.items[0].name).toBe('Golden Key')
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('add_clue', () => {
  test('adds core clue by default', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    const result = await tools.addClue({ filename: 'a.json', clue: { id: 'c1', text: 'A suspicious footprint' } })
    expect(result.pool).toBe('core')
    const story = await readFile(dir, 'a.json')
    expect(story.clues.core.length).toBe(1)
    await $`rm -rf ${dir}`.quiet()
  })

  test('adds bonus clue when specified', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    await tools.addClue({ filename: 'a.json', clue: { id: 'b1', text: 'Extra hint', type: 'bonus' } })
    const story = await readFile(dir, 'a.json')
    expect(story.clues.bonus.length).toBe(1)
    await $`rm -rf ${dir}`.quiet()
  })

  test('upserts existing clue', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    await tools.addClue({ filename: 'a.json', clue: { id: 'c1', text: 'Old text' } })
    await tools.addClue({ filename: 'a.json', clue: { id: 'c1', text: 'New text' } })
    const story = await readFile(dir, 'a.json')
    expect(story.clues.core.length).toBe(1)
    expect(story.clues.core[0].text).toBe('New text')
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('add_condition', () => {
  test('adds condition', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    const result = await tools.addCondition({ filename: 'a.json', condition: { id: 'frozen', name: 'Frozen', statModifier: { stat: 'str', delta: -1 } } })
    expect(result.added).toBe('frozen')
    const story = await readFile(dir, 'a.json')
    expect(story.conditions[0].statModifier.delta).toBe(-1)
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('add_complication', () => {
  test('adds complication', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    const result = await tools.addComplication({ filename: 'a.json', complication: { id: 1, name: 'Cave In', size: 'large', narrative: 'Rocks fall!' } })
    expect(result.added).toBe(1)
    const story = await readFile(dir, 'a.json')
    expect(story.complications[0].size).toBe('large')
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('set_secret', () => {
  test('adds secret combination', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    const result = await tools.setSecret({
      filename: 'a.json',
      secret: { culprit: 'bob', hideout: 'cave', clueAssignments: { mine: 'c1' } }
    })
    expect(result.totalCombos).toBe(1)
    const story = await readFile(dir, 'a.json')
    expect(story.secrets.combinations[0].culprit).toBe('bob')
    expect(story.secrets.combinations[0].epilogue).toBe('win_bob_cave')
    await $`rm -rf ${dir}`.quiet()
  })

  test('upserts same culprit+hideout', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    await tools.setSecret({ filename: 'a.json', secret: { culprit: 'bob', hideout: 'cave', clueAssignments: { mine: 'c1' } } })
    await tools.setSecret({ filename: 'a.json', secret: { culprit: 'bob', hideout: 'cave', clueAssignments: { mine: 'c2' }, epilogue: 'custom' } })
    const story = await readFile(dir, 'a.json')
    expect(story.secrets.combinations.length).toBe(1)
    expect(story.secrets.combinations[0].clueAssignments.mine).toBe('c2')
    expect(story.secrets.combinations[0].epilogue).toBe('custom')
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('set_epilogue', () => {
  test('adds epilogue', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    const result = await tools.setEpilogue({ filename: 'a.json', epilogue: { id: 'happy', narrative: 'Everyone rejoiced!' } })
    expect(result.set).toBe('happy')
    const story = await readFile(dir, 'a.json')
    expect(story.epilogues.happy.narrative).toBe('Everyone rejoiced!')
    await $`rm -rf ${dir}`.quiet()
  })

  test('overwrites existing epilogue', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    await tools.setEpilogue({ filename: 'a.json', epilogue: { id: 'win', narrative: 'New win text' } })
    const story = await readFile(dir, 'a.json')
    expect(story.epilogues.win.narrative).toBe('New win text')
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('list_adventures', () => {
  test('lists adventures in directory', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'one.json', title: 'One' })
    await tools.scaffoldAdventure({ filename: 'two.json', title: 'Two' })
    const list = await tools.listAdventures()
    expect(list.length).toBe(2)
    expect(list.map(a => a.title)).toContain('One')
    expect(list.map(a => a.title)).toContain('Two')
    await $`rm -rf ${dir}`.quiet()
  })

  test('returns message for empty directory', async () => {
    const { tools, dir } = setup()
    const result = await tools.listAdventures()
    expect(result.message).toContain('No adventures found')
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('read_adventure', () => {
  test('reads and parses adventure', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'Readable' })
    const result = await tools.readAdventure({ filename: 'a.json' })
    expect(result.meta.title).toBe('Readable')
    await $`rm -rf ${dir}`.quiet()
  })

  test('returns error for missing file', async () => {
    const { tools, dir } = setup()
    const result = await tools.readAdventure({ filename: 'nope.json' })
    expect(result.error).toBeDefined()
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('inspect_adventure', () => {
  test('returns stats and graph', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    await tools.addRoom({ filename: 'a.json', room: { id: 'cave', name: 'Cave', narrative: 'Dark.', zone: 'dungeon_a' }, connectFrom: [{ roomId: 'hub', label: 'Cave' }] })
    const result = await tools.inspectAdventure({ filename: 'a.json' })
    expect(result.stats.rooms).toBe(2)
    expect(result.roomGraph.hub).toBeDefined()
    expect(result.roomGraph.cave).toBeDefined()
    expect(result.zones).toContain('dungeon_a')
    expect(result.validation.ok).toBe(true)
    await $`rm -rf ${dir}`.quiet()
  })

  test('detects unassigned clues', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    await tools.addClue({ filename: 'a.json', clue: { id: 'c1', text: 'Clue one' } })
    await tools.addClue({ filename: 'a.json', clue: { id: 'c2', text: 'Clue two' } })
    await tools.setSecret({ filename: 'a.json', secret: { culprit: 'x', hideout: 'y', clueAssignments: { hub: 'c1' } } })
    const result = await tools.inspectAdventure({ filename: 'a.json' })
    expect(result.unassignedClues).toContain('c2')
    expect(result.unassignedClues).not.toContain('c1')
    await $`rm -rf ${dir}`.quiet()
  })

  test('returns error for missing file', async () => {
    const { tools, dir } = setup()
    const result = await tools.inspectAdventure({ filename: 'nope.json' })
    expect(result.error).toContain('Cannot read')
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('validate_adventure', () => {
  test('validates a scaffolded adventure', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'a.json', title: 'A' })
    const result = await tools.validateAdventure({ filename: 'a.json' })
    expect(result.valid).toBe(true)
    expect(result.errors.length).toBe(0)
    await $`rm -rf ${dir}`.quiet()
  })

  test('detects validation errors', async () => {
    const { tools, dir } = setup()
    await Bun.write(`${dir}/bad.json`, JSON.stringify({ meta: { title: 'Bad' }, rooms: {} }))
    const result = await tools.validateAdventure({ filename: 'bad.json' })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    await $`rm -rf ${dir}`.quiet()
  })

  test('returns error for missing file', async () => {
    const { tools, dir } = setup()
    const result = await tools.validateAdventure({ filename: 'nope.json' })
    expect(result.valid).toBe(false)
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('resources', () => {
  test('schema resource returns valid JSON', async () => {
    const { tools, dir } = setup()
    const schema = await tools.schemaResource()
    const parsed = JSON.parse(schema)
    expect(parsed.$schema).toBeDefined()
    expect(parsed.title).toContain('DUNGEONS')
    await $`rm -rf ${dir}`.quiet()
  })

  test('guide resource returns writing guide', async () => {
    const { tools, dir } = setup()
    const guide = await tools.guideResource()
    expect(guide).toContain('DUNGEONS Adventure Writing Guide')
    await $`rm -rf ${dir}`.quiet()
  })

  test('adventure resource reads existing file', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'res.json', title: 'Resource Test' })
    const text = await tools.adventureResource({ filename: 'res.json' })
    const parsed = JSON.parse(text)
    expect(parsed.meta.title).toBe('Resource Test')
    await $`rm -rf ${dir}`.quiet()
  })

  test('adventure resource returns error for missing file', async () => {
    const { tools, dir } = setup()
    const text = await tools.adventureResource({ filename: 'nope.json' })
    const parsed = JSON.parse(text)
    expect(parsed.error).toContain('not found')
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('AI tools', () => {
  test('writer calls sample with prompt', async () => {
    let capturedArgs
    const mockFn = async (args) => { capturedArgs = args; return 'Generated text' }
    const dir = `/tmp/dungeons-test-ai-${Date.now()}`
    const uDir = `${dir}/_universes`
    mkdirSync(dir, { recursive: true })
    mkdirSync(uDir, { recursive: true })
    const tools = createTools(dir, uDir, SCHEMA_PATH, mockFn)
    const result = await tools.writer({ request: 'A spooky cave description' })
    expect(result.text).toBe('Generated text')
    expect(capturedArgs.systemPrompt).toContain('DUNGEONS')
    expect(capturedArgs.messages[0].content.text).toContain('spooky cave')
    await $`rm -rf ${dir}`.quiet()
  })

  test('writer includes adventure context when filename given', async () => {
    let capturedArgs
    const mockFn = async (args) => { capturedArgs = args; return 'text' }
    const dir = `/tmp/dungeons-test-ai2-${Date.now()}`
    const uDir = `${dir}/_universes`
    mkdirSync(dir, { recursive: true })
    mkdirSync(uDir, { recursive: true })
    const tools = createTools(dir, uDir, SCHEMA_PATH, mockFn)
    await tools.scaffoldAdventure({ filename: 'ctx.json', title: 'Context Test' })
    await tools.writer({ filename: 'ctx.json', request: 'A room' })
    expect(capturedArgs.messages[0].content.text).toContain('Context Test')
    await $`rm -rf ${dir}`.quiet()
  })

  test('editor calls sample with adventure JSON', async () => {
    let capturedArgs
    const mockFn = async (args) => { capturedArgs = args; return 'Review feedback' }
    const dir = `/tmp/dungeons-test-ai3-${Date.now()}`
    const uDir = `${dir}/_universes`
    mkdirSync(dir, { recursive: true })
    mkdirSync(uDir, { recursive: true })
    const tools = createTools(dir, uDir, SCHEMA_PATH, mockFn)
    await tools.scaffoldAdventure({ filename: 'ed.json', title: 'Editor Test' })
    const result = await tools.editor({ filename: 'ed.json', focus: 'narrative' })
    expect(result.review).toBe('Review feedback')
    expect(result.validation.ok).toBe(true)
    expect(capturedArgs.messages[0].content.text).toContain('narrative')
    await $`rm -rf ${dir}`.quiet()
  })

  test('editor returns error for missing file', async () => {
    const { tools, dir } = setup()
    const result = await tools.editor({ filename: 'nope.json' })
    expect(result.error).toContain('Cannot read')
    await $`rm -rf ${dir}`.quiet()
  })

  test('generate_room parses valid JSON response', async () => {
    const { tools, dir } = setup()
    const result = await tools.generateRoom({ description: 'A dark cave' })
    expect(result.room).toBeDefined()
    expect(result.room.id).toBe('gen_room')
    expect(result.note).toContain('add_room')
    await $`rm -rf ${dir}`.quiet()
  })

  test('generate_room handles non-JSON response', async () => {
    const mockFn = async () => 'Not valid JSON at all'
    const dir = `/tmp/dungeons-test-ai4-${Date.now()}`
    const uDir = `${dir}/_universes`
    mkdirSync(dir, { recursive: true })
    mkdirSync(uDir, { recursive: true })
    const tools = createTools(dir, uDir, SCHEMA_PATH, mockFn)
    const result = await tools.generateRoom({ description: 'Something' })
    expect(result.rawText).toBeDefined()
    expect(result.note).toContain('manual cleanup')
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('WRITING_GUIDE', () => {
  test('is a non-empty string', () => {
    expect(typeof WRITING_GUIDE).toBe('string')
    expect(WRITING_GUIDE.length).toBeGreaterThan(100)
  })

  test('mentions target audience', () => {
    expect(WRITING_GUIDE).toContain('6-12')
  })
})

describe('universe tools', () => {
  test('create_universe creates a template file', async () => {
    const { tools, dir, uDir } = setup()
    const result = await tools.createUniverse({ name: 'test-world', title: 'Test World', description: 'A test universe' })
    expect(result.created).toBe('test-world')
    const content = await Bun.file(`${uDir}/test-world.md`).text()
    expect(content).toContain('# Test World')
    expect(content).toContain('A test universe')
    expect(content).toContain('Creative Pillars')
    await $`rm -rf ${dir}`.quiet()
  })

  test('create_universe with custom content', async () => {
    const { tools, dir, uDir } = setup()
    const result = await tools.createUniverse({ name: 'custom', content: '# My Universe\nCustom content here.' })
    expect(result.created).toBe('custom')
    const content = await Bun.file(`${uDir}/custom.md`).text()
    expect(content).toBe('# My Universe\nCustom content here.')
    await $`rm -rf ${dir}`.quiet()
  })

  test('create_universe rejects duplicate', async () => {
    const { tools, dir, uDir } = setup()
    await tools.createUniverse({ name: 'dupe' })
    const result = await tools.createUniverse({ name: 'dupe' })
    expect(result.error).toContain('already exists')
    await $`rm -rf ${dir}`.quiet()
  })

  test('read_universe returns content', async () => {
    const { tools, dir, uDir } = setup()
    await Bun.write(`${uDir}/reading.md`, '# Reading Test\nSome guidelines.')
    const result = await tools.readUniverseFn({ name: 'reading' })
    expect(result.name).toBe('reading')
    expect(result.content).toContain('Reading Test')
    await $`rm -rf ${dir}`.quiet()
  })

  test('read_universe returns error for missing', async () => {
    const { tools, dir } = setup()
    const result = await tools.readUniverseFn({ name: 'nonexistent' })
    expect(result.error).toContain('not found')
    await $`rm -rf ${dir}`.quiet()
  })

  test('update_universe overwrites content', async () => {
    const { tools, dir, uDir } = setup()
    await tools.createUniverse({ name: 'updatable', content: 'Original' })
    const result = await tools.updateUniverse({ name: 'updatable', content: 'Updated content' })
    expect(result.updated).toBe('updatable')
    const content = await Bun.file(`${uDir}/updatable.md`).text()
    expect(content).toBe('Updated content')
    await $`rm -rf ${dir}`.quiet()
  })

  test('update_universe returns error for missing', async () => {
    const { tools, dir } = setup()
    const result = await tools.updateUniverse({ name: 'nope', content: 'stuff' })
    expect(result.error).toContain('not found')
    await $`rm -rf ${dir}`.quiet()
  })

  test('list_universes returns all universes', async () => {
    const { tools, dir, uDir } = setup()
    await Bun.write(`${uDir}/alpha.md`, '# Alpha Universe')
    await Bun.write(`${uDir}/beta.md`, '# Beta Universe')
    const result = await tools.listUniverses()
    expect(result.length).toBe(2)
    const names = result.map(u => u.name)
    expect(names).toContain('alpha')
    expect(names).toContain('beta')
    await $`rm -rf ${dir}`.quiet()
  })

  test('list_universes returns message when empty', async () => {
    const { tools, dir } = setup()
    const result = await tools.listUniverses()
    expect(result.message).toContain('No universes')
    await $`rm -rf ${dir}`.quiet()
  })

  test('universe_resource reads content', async () => {
    const { tools, dir, uDir } = setup()
    await Bun.write(`${uDir}/res-test.md`, '# Resource Test Universe')
    const content = await tools.universeResource({ name: 'res-test' })
    expect(content).toContain('Resource Test Universe')
    await $`rm -rf ${dir}`.quiet()
  })

  test('universe_resource returns error for missing', async () => {
    const { tools, dir } = setup()
    const content = await tools.universeResource({ name: 'nope' })
    expect(content).toContain('not found')
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('universe + AI tool integration', () => {
  test('writer includes universe context from meta.universe', async () => {
    let capturedArgs
    const mockFn = async (args) => { capturedArgs = args; return 'text' }
    const dir = `/tmp/dungeons-test-u1-${Date.now()}`
    const uDir = `${dir}/_universes`
    mkdirSync(dir, { recursive: true })
    mkdirSync(uDir, { recursive: true })
    const tools = createTools(dir, uDir, SCHEMA_PATH, mockFn)
    await Bun.write(`${uDir}/spooky.md`, '# Spooky Universe\nAll narratives should be mysterious.')
    await tools.scaffoldAdventure({ filename: 'u.json', title: 'Universe Test', universe: 'spooky' })
    await tools.writer({ filename: 'u.json', request: 'A room' })
    expect(capturedArgs.systemPrompt).toContain('UNIVERSE GUIDELINES')
    expect(capturedArgs.systemPrompt).toContain('Spooky Universe')
    await $`rm -rf ${dir}`.quiet()
  })

  test('writer uses universe override parameter', async () => {
    let capturedArgs
    const mockFn = async (args) => { capturedArgs = args; return 'text' }
    const dir = `/tmp/dungeons-test-u2-${Date.now()}`
    const uDir = `${dir}/_universes`
    mkdirSync(dir, { recursive: true })
    mkdirSync(uDir, { recursive: true })
    const tools = createTools(dir, uDir, SCHEMA_PATH, mockFn)
    await Bun.write(`${uDir}/override.md`, '# Override Universe\nUse bright colors.')
    await tools.writer({ request: 'A room', universe: 'override' })
    expect(capturedArgs.systemPrompt).toContain('Override Universe')
    await $`rm -rf ${dir}`.quiet()
  })

  test('editor includes universe context', async () => {
    let capturedArgs
    const mockFn = async (args) => { capturedArgs = args; return 'review' }
    const dir = `/tmp/dungeons-test-u3-${Date.now()}`
    const uDir = `${dir}/_universes`
    mkdirSync(dir, { recursive: true })
    mkdirSync(uDir, { recursive: true })
    const tools = createTools(dir, uDir, SCHEMA_PATH, mockFn)
    await Bun.write(`${uDir}/editor-test.md`, '# Editor Universe\nMust be kid-friendly.')
    await tools.scaffoldAdventure({ filename: 'e.json', title: 'Ed Test', universe: 'editor-test' })
    await tools.editor({ filename: 'e.json' })
    expect(capturedArgs.systemPrompt).toContain('UNIVERSE GUIDELINES')
    expect(capturedArgs.systemPrompt).toContain('Editor Universe')
    expect(capturedArgs.systemPrompt).toContain('universe guidelines')
    await $`rm -rf ${dir}`.quiet()
  })

  test('generate_room includes universe context', async () => {
    let capturedArgs
    const mockFn = async (args) => { capturedArgs = args; return JSON.stringify({ id: 'r', name: 'R', zone: 'z', tags: [], narrative: 'n', exits: [], choices: [], onEnter: [], clue: null, items: null }) }
    const dir = `/tmp/dungeons-test-u4-${Date.now()}`
    const uDir = `${dir}/_universes`
    mkdirSync(dir, { recursive: true })
    mkdirSync(uDir, { recursive: true })
    const tools = createTools(dir, uDir, SCHEMA_PATH, mockFn)
    await Bun.write(`${uDir}/gen-test.md`, '# Gen Universe\nRooms should feel cozy.')
    await tools.scaffoldAdventure({ filename: 'g.json', title: 'Gen Test', universe: 'gen-test' })
    await tools.generateRoom({ filename: 'g.json', description: 'A kitchen' })
    expect(capturedArgs.systemPrompt).toContain('UNIVERSE GUIDELINES')
    expect(capturedArgs.systemPrompt).toContain('Gen Universe')
    await $`rm -rf ${dir}`.quiet()
  })

  test('AI tools skip universe when file missing', async () => {
    let capturedArgs
    const mockFn = async (args) => { capturedArgs = args; return 'text' }
    const dir = `/tmp/dungeons-test-u5-${Date.now()}`
    const uDir = `${dir}/_universes`
    mkdirSync(dir, { recursive: true })
    mkdirSync(uDir, { recursive: true })
    const tools = createTools(dir, uDir, SCHEMA_PATH, mockFn)
    await tools.scaffoldAdventure({ filename: 'no-u.json', title: 'No Universe', universe: 'nonexistent' })
    await tools.writer({ filename: 'no-u.json', request: 'A room' })
    expect(capturedArgs.systemPrompt).not.toContain('UNIVERSE GUIDELINES')
    await $`rm -rf ${dir}`.quiet()
  })

  test('scaffold_adventure sets meta.universe', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'su.json', title: 'With Universe', universe: 'my-world' })
    const story = await readFile(dir, 'su.json')
    expect(story.meta.universe).toBe('my-world')
    await $`rm -rf ${dir}`.quiet()
  })

  test('scaffold_adventure omits meta.universe when not provided', async () => {
    const { tools, dir } = setup()
    await tools.scaffoldAdventure({ filename: 'nu.json', title: 'No Universe' })
    const story = await readFile(dir, 'nu.json')
    expect(story.meta.universe).toBeUndefined()
    await $`rm -rf ${dir}`.quiet()
  })
})

describe('full authoring workflow', () => {
  test('scaffold → add rooms → add NPCs → add clues → set secrets → validate', async () => {
    const { tools, dir } = setup()

    await tools.scaffoldAdventure({ filename: 'w.json', title: 'Workflow Test', author: 'Test', theme: 'forest' })
    await tools.addRoom({ filename: 'w.json', room: { id: 'clearing', name: 'Forest Clearing', narrative: 'A sunlit clearing.', zone: 'dungeon_a' }, connectFrom: [{ roomId: 'hub', label: 'Enter clearing' }] })
    await tools.addRoom({ filename: 'w.json', room: { id: 'pond', name: 'Hidden Pond', narrative: 'A still pond.', zone: 'dungeon_a', exits: [{ target: 'clearing', label: 'Back to clearing' }] }, connectFrom: [{ roomId: 'clearing', label: 'Follow the stream' }] })
    await tools.addNpc({ filename: 'w.json', npc: { id: 'owl', name: 'Professor Owl', scenes: { hub: { narrative: 'The owl blinks wisely.' } } } })
    await tools.addNpc({ filename: 'w.json', npc: { id: 'fox', name: 'Sly Fox', role: 'suspect' } })
    await tools.addItem({ filename: 'w.json', item: { id: 'lantern', name: 'Lantern', tags: ['light'] } })
    await tools.addClue({ filename: 'w.json', clue: { id: 'c1', text: 'Fox fur on a branch', pointsTo: { suspect: 'fox' } } })
    await tools.addClue({ filename: 'w.json', clue: { id: 'c2', text: 'Muddy tracks to the pond', pointsTo: { location: 'pond' } } })
    await tools.addComplication({ filename: 'w.json', complication: { id: 1, name: 'Sudden Rain', size: 'small', narrative: 'Rain starts falling!' } })
    await tools.setSecret({ filename: 'w.json', secret: { culprit: 'fox', hideout: 'pond', clueAssignments: { clearing: 'c1', pond: 'c2' } } })
    await tools.setEpilogue({ filename: 'w.json', epilogue: { id: 'win_fox_pond', type: 'win', culprit: 'fox', hideout: 'pond', narrative: 'You caught the sly fox at the pond!' } })

    const validation = await tools.validateAdventure({ filename: 'w.json' })
    expect(validation.valid).toBe(true)

    const inspection = await tools.inspectAdventure({ filename: 'w.json' })
    expect(inspection.stats.rooms).toBe(3)
    expect(inspection.stats.npcs).toBe(2)
    expect(inspection.stats.items).toBe(1)
    expect(inspection.stats.coreClues).toBe(2)
    expect(inspection.stats.complications).toBe(1)
    expect(inspection.stats.secretCombos).toBe(1)
    expect(inspection.unassignedClues.length).toBe(0)
    expect(inspection.zones).toContain('dungeon_a')
    expect(inspection.roomGraph.hub.exits).toContain('clearing')
    expect(inspection.roomGraph.clearing.exits).toContain('pond')

    await $`rm -rf ${dir}`.quiet()
  })
})
