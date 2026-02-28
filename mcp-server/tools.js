// DUNGEONS MCP Server — tool handlers (testable without MCP protocol)
import { loadStoryFromFile } from '../server/loader/story-loader.js'
import { validate } from '../server/loader/validate.js'

const createTools = (adventuresDir, universesDir, schemaPath, sampleFn) => {

  const readStory = async (filename) => {
    const path = `${adventuresDir}/${filename}`
    return await Bun.file(path).json()
  }

  const writeStory = async (filename, story) => {
    const path = `${adventuresDir}/${filename}`
    await Bun.write(path, JSON.stringify(story, null, 2))
  }

  // ─── Universe Helpers ─────────────────────────────────────────────────────

  const readUniverseFile = async (name) => {
    const path = `${universesDir}/${name}.md`
    const file = Bun.file(path)
    if (!await file.exists()) return null
    return await file.text()
  }

  const loadUniverseForStory = async (story, universeOverride) => {
    const name = universeOverride || story?.meta?.universe
    if (!name) return ''
    const content = await readUniverseFile(name)
    return content || ''
  }

  // ─── Resources ──────────────────────────────────────────────────────────

  const schemaResource = async () => {
    const file = Bun.file(schemaPath)
    return await file.text()
  }

  const guideResource = async () => WRITING_GUIDE

  const adventureResource = async ({ filename }) => {
    const path = `${adventuresDir}/${filename}`
    const file = Bun.file(path)
    if (!await file.exists()) return JSON.stringify({ error: `Adventure not found: ${filename}` })
    return await file.text()
  }

  const universeResource = async ({ name }) => {
    const content = await readUniverseFile(name)
    if (!content) return `Universe not found: ${name}`
    return content
  }

  // ─── Read & Inspect ─────────────────────────────────────────────────────

  const listAdventures = async () => {
    const results = []
    try {
      const glob = new Bun.Glob('**/*.json')
      for await (const path of glob.scan({ cwd: adventuresDir, absolute: false })) {
        try {
          const story = await Bun.file(`${adventuresDir}/${path}`).json()
          results.push({
            file: path,
            title: story.meta?.title || path,
            author: story.meta?.author || 'Unknown',
            version: story.meta?.version || '?',
            rooms: Object.keys(story.rooms || {}).length,
            npcs: (story.npcs || []).length,
            items: (story.items || []).length
          })
        } catch { results.push({ file: path, error: 'Failed to parse' }) }
      }
    } catch { /* dir missing is fine */ }
    return results.length ? results : { message: 'No adventures found. Use scaffold_adventure to create one.' }
  }

  const readAdventure = async ({ filename }) => {
    const result = await loadStoryFromFile(`${adventuresDir}/${filename}`)
    if (!result.ok) return { error: 'Failed to load', details: result.errors }
    return result.story
  }

  const inspectAdventure = async ({ filename }) => {
    let story
    try { story = await readStory(filename) } catch (e) {
      return { error: `Cannot read file: ${e.message}` }
    }

    const validation = validate(story, { required: ['meta', 'config', 'rooms'] })
    const rooms = story.rooms || {}
    const roomIds = Object.keys(rooms)

    const graph = {}
    for (const [id, room] of Object.entries(rooms)) {
      graph[id] = {
        name: room.name,
        zone: room.zone || 'none',
        exits: (room.exits || []).map(e => e.target),
        choices: (room.choices || []).length,
        hasClue: !!room.clue,
        hasItems: !!room.items
      }
    }

    const allClueIds = [...(story.clues?.core || []).map(c => c.id), ...(story.clues?.bonus || []).map(c => c.id)]
    const assignedClues = new Set()
    for (const combo of story.secrets?.combinations || []) {
      for (const clueId of Object.values(combo.clueAssignments || {})) assignedClues.add(clueId)
    }
    const unassignedClues = allClueIds.filter(id => !assignedClues.has(id))

    return {
      meta: story.meta,
      validation,
      stats: {
        rooms: roomIds.length,
        npcs: (story.npcs || []).length,
        items: (story.items || []).length,
        roles: (story.roles || []).length,
        conditions: (story.conditions || []).length,
        coreClues: (story.clues?.core || []).length,
        bonusClues: (story.clues?.bonus || []).length,
        complications: (story.complications || []).length,
        epilogues: Object.keys(story.epilogues || {}).length,
        secretCombos: (story.secrets?.combinations || []).length
      },
      roomGraph: graph,
      unassignedClues,
      zones: [...new Set(roomIds.map(id => rooms[id].zone).filter(Boolean))]
    }
  }

  const validateAdventure = async ({ filename }) => {
    let story
    try { story = await readStory(filename) } catch (e) {
      return { valid: false, errors: [`Cannot read file: ${e.message}`] }
    }
    const result = validate(story, { required: ['meta', 'config', 'rooms'] })
    return { valid: result.ok, errors: result.errors }
  }

  // ─── Universe Tools ────────────────────────────────────────────────────

  const listUniverses = async () => {
    const results = []
    try {
      const glob = new Bun.Glob('**/*.md')
      for await (const path of glob.scan({ cwd: universesDir, absolute: false })) {
        try {
          const content = await Bun.file(`${universesDir}/${path}`).text()
          const firstLine = content.split('\n').find(l => l.trim()) || ''
          const name = path.replace(/\.md$/, '')
          results.push({ name, file: path, description: firstLine.replace(/^#\s*/, '') })
        } catch { results.push({ file: path, error: 'Failed to read' }) }
      }
    } catch { /* dir missing is fine */ }
    return results.length ? results : { message: 'No universes found. Use create_universe to create one.' }
  }

  const readUniverseFn = async ({ name }) => {
    const content = await readUniverseFile(name)
    if (!content) return { error: `Universe not found: ${name}` }
    return { name, content }
  }

  const createUniverse = async ({ name, title, description, content }) => {
    const path = `${universesDir}/${name}.md`
    const file = Bun.file(path)
    if (await file.exists()) return { error: `Universe "${name}" already exists. Use update_universe to modify it.` }

    const md = content || `# ${title || name}

${description || 'A DUNGEONS universe.'}

## Creative Pillars
<!-- What makes this universe special? What themes drive the stories? -->

## Narrative Voice
<!-- How should the narrator sound? Formal, casual, whimsical? -->

## Humor Guidelines
<!-- What kind of humor fits? Puns, slapstick, wordplay? -->

## Character Templates
<!-- What kinds of characters inhabit this world? -->

## Worldbuilding
<!-- Rules of the world, locations, history, culture -->

## Content Boundaries
<!-- What to include and what to avoid -->

## Pacing
<!-- How should stories flow? Fast-paced, slow burn, episodic? -->
`
    await Bun.write(path, md)
    return { created: name, path }
  }

  const updateUniverse = async ({ name, content }) => {
    const path = `${universesDir}/${name}.md`
    const file = Bun.file(path)
    if (!await file.exists()) return { error: `Universe not found: ${name}` }
    await Bun.write(path, content)
    return { updated: name }
  }

  // ─── Scaffold & Write ───────────────────────────────────────────────────

  const scaffoldAdventure = async ({ filename, title, author, description, theme, playerCount, universe }) => {
    const meta = {
      title,
      author: author || 'Unknown',
      version: '0.1.0',
      language: 'en',
      playerCount: playerCount || { min: 1, max: 4 },
      description: description || ''
    }
    if (universe) meta.universe = universe
    const scaffold = {
      meta,
      config: {
        tracks: [
          { id: 'time', name: 'Time', start: 8, min: 0, max: 10, direction: 'down', triggerAt: 0, triggerEffects: [{ type: 'narrative', text: 'Time has run out!' }] }
        ],
        tokens: [
          { id: 'courage', name: 'Courage', pool: 5, startPerPlayer: 1 }
        ],
        stats: [
          { id: 'str', name: 'Strength', min: 0, max: 3 },
          { id: 'per', name: 'Perception', min: 0, max: 3 },
          { id: 'cha', name: 'Charm', min: 0, max: 3 },
          { id: 'cun', name: 'Cunning', min: 0, max: 3 }
        ],
        approaches: [
          { id: 'brave', name: 'Brave', effects: [{ type: 'token', token: 'courage', delta: -1 }] },
          { id: 'careful', name: 'Careful', effects: [] },
          { id: 'wild', name: 'Wild', effects: [{ type: 'token', token: 'courage', delta: 1 }], requiresComplication: true }
        ],
        startRoom: 'hub',
        verbMenu: ['LOOK', 'TALK', 'USE', 'TAKE', 'PUSH'],
        lobby: { minPlayers: 1, maxPlayers: playerCount?.max || 4, roleSelection: 'pick', autoStart: false }
      },
      strings: {
        choose_prompt: 'Choose [1-{n}]:',
        also_here: 'Also here:',
        press_any_key: 'Press any key...',
        items_label: 'Items:',
        conditions_label: 'Conditions:'
      },
      roles: [
        { id: 'explorer', name: 'Explorer', description: 'Good at finding things', tricks: [
          { id: 'scout', name: 'Scout Ahead', description: 'Peek into next room', trigger: 'enter_room', uses: 'once_per_dungeon', effects: [{ type: 'narrative', text: 'You scout ahead and spot something.' }] }
        ]},
        { id: 'thinker', name: 'Thinker', description: 'Good at puzzles', tricks: [
          { id: 'analyze', name: 'Analyze', description: 'Study the room', trigger: 'manual', uses: 'once_per_room', effects: [{ type: 'token', token: 'courage', delta: 1 }] }
        ]},
        { id: 'helper', name: 'Helper', description: 'Good at teamwork', tricks: [
          { id: 'encourage', name: 'Encourage', description: 'Boost a friend', trigger: 'manual', uses: 'once_per_room', effects: [{ type: 'token', token: 'courage', delta: 1 }] }
        ]},
        { id: 'sneaker', name: 'Sneaker', description: 'Good at stealth', tricks: [
          { id: 'sneak', name: 'Sneak Past', description: 'Avoid trouble', trigger: 'manual', uses: 'once_per_room', effects: [{ type: 'track', track: 'time', delta: 1 }] }
        ]}
      ],
      conditions: [],
      items: [],
      clues: { core: [], bonus: [] },
      npcs: [],
      rooms: {
        hub: {
          id: 'hub', name: 'The Hub', zone: 'hub',
          tags: ['hub', 'safe'],
          narrative: `You arrive at the ${theme || 'mysterious'} hub. Paths lead in all directions.`,
          exits: [],
          choices: [
            { id: 'hub_rest', label: 'Rest', verb: 'USE', narrative: 'You take a moment to rest.', requires: null, target: 'hub', effects: [{ type: 'rest' }] }
          ],
          onEnter: [],
          clue: null,
          items: null
        }
      },
      complications: [],
      epilogues: {
        win: { id: 'win', type: 'win', narrative: 'You solved the mystery!' },
        loss: { id: 'loss', type: 'loss', narrative: 'The mystery remains unsolved...' }
      },
      secrets: { combinations: [] }
    }

    await writeStory(filename, scaffold)
    const validation = validate(scaffold, { required: ['meta', 'config', 'rooms'] })
    return { created: `${adventuresDir}/${filename}`, valid: validation.ok, message: `Adventure "${title}" scaffolded. Use add_room, add_npc, add_item, etc. to flesh it out.` }
  }

  const addRoom = async ({ filename, room, connectFrom }) => {
    const story = await readStory(filename)

    const fullRoom = {
      id: room.id,
      name: room.name,
      zone: room.zone || 'hub',
      tags: room.tags || [],
      narrative: room.narrative,
      exits: room.exits || [],
      choices: room.choices || [],
      onEnter: room.onEnter || [],
      clue: room.clue || null,
      items: room.items || null
    }

    story.rooms[room.id] = fullRoom

    for (const conn of connectFrom || []) {
      if (story.rooms[conn.roomId]) {
        story.rooms[conn.roomId].exits = story.rooms[conn.roomId].exits || []
        if (!story.rooms[conn.roomId].exits.some(e => e.target === room.id)) {
          story.rooms[conn.roomId].exits.push({ target: room.id, label: conn.label })
        }
      }
    }

    await writeStory(filename, story)
    return { added: room.id, name: room.name, totalRooms: Object.keys(story.rooms).length }
  }

  const updateRoom = async ({ filename, roomId, updates }) => {
    const story = await readStory(filename)
    if (!story.rooms[roomId]) return { error: `Room "${roomId}" not found` }
    story.rooms[roomId] = { ...story.rooms[roomId], ...updates }
    await writeStory(filename, story)
    return { updated: roomId }
  }

  const addNpc = async ({ filename, npc }) => {
    const story = await readStory(filename)
    story.npcs = story.npcs || []
    const existing = story.npcs.findIndex(n => n.id === npc.id)
    const fullNpc = {
      id: npc.id, name: npc.name, role: npc.role || 'suspect',
      scenes: npc.scenes || {}, reactions: npc.reactions || {},
      guiltyVariant: npc.guiltyVariant || null, innocentVariant: npc.innocentVariant || null
    }
    if (existing >= 0) story.npcs[existing] = fullNpc
    else story.npcs.push(fullNpc)
    await writeStory(filename, story)
    return { added: npc.id, totalNpcs: story.npcs.length }
  }

  const addItem = async ({ filename, item }) => {
    const story = await readStory(filename)
    story.items = story.items || []
    const existing = story.items.findIndex(i => i.id === item.id)
    const fullItem = { id: item.id, name: item.name, description: item.description || '', tags: item.tags || [], useEffects: item.useEffects || [] }
    if (existing >= 0) story.items[existing] = fullItem
    else story.items.push(fullItem)
    await writeStory(filename, story)
    return { added: item.id, totalItems: story.items.length }
  }

  const addClue = async ({ filename, clue }) => {
    const story = await readStory(filename)
    story.clues = story.clues || { core: [], bonus: [] }
    const pool = clue.type === 'bonus' ? 'bonus' : 'core'
    const arr = story.clues[pool]
    const existing = arr.findIndex(c => c.id === clue.id)
    const fullClue = { id: clue.id, text: clue.text, pointsTo: clue.pointsTo || {} }
    if (existing >= 0) arr[existing] = fullClue
    else arr.push(fullClue)
    await writeStory(filename, story)
    return { added: clue.id, pool, totalClues: story.clues.core.length + story.clues.bonus.length }
  }

  const addCondition = async ({ filename, condition }) => {
    const story = await readStory(filename)
    story.conditions = story.conditions || []
    const existing = story.conditions.findIndex(c => c.id === condition.id)
    if (existing >= 0) story.conditions[existing] = condition
    else story.conditions.push(condition)
    await writeStory(filename, story)
    return { added: condition.id, totalConditions: story.conditions.length }
  }

  const addComplication = async ({ filename, complication }) => {
    const story = await readStory(filename)
    story.complications = story.complications || []
    const existing = story.complications.findIndex(c => c.id === complication.id)
    const full = { ...complication, effects: complication.effects || [] }
    if (existing >= 0) story.complications[existing] = full
    else story.complications.push(full)
    await writeStory(filename, story)
    return { added: complication.id, totalComplications: story.complications.length }
  }

  const setSecret = async ({ filename, secret }) => {
    const story = await readStory(filename)
    story.secrets = story.secrets || { combinations: [] }
    const existing = story.secrets.combinations.findIndex(c => c.culprit === secret.culprit && c.hideout === secret.hideout)
    const full = { culprit: secret.culprit, hideout: secret.hideout, clueAssignments: secret.clueAssignments, roomOverrides: secret.roomOverrides || {}, epilogue: secret.epilogue || `win_${secret.culprit}_${secret.hideout}` }
    if (existing >= 0) story.secrets.combinations[existing] = full
    else story.secrets.combinations.push(full)
    await writeStory(filename, story)
    return { set: `${secret.culprit}/${secret.hideout}`, totalCombos: story.secrets.combinations.length }
  }

  const setEpilogue = async ({ filename, epilogue }) => {
    const story = await readStory(filename)
    story.epilogues = story.epilogues || {}
    story.epilogues[epilogue.id] = epilogue
    await writeStory(filename, story)
    return { set: epilogue.id, totalEpilogues: Object.keys(story.epilogues).length }
  }

  // ─── AI Tools ───────────────────────────────────────────────────────────

  const writer = async ({ filename, request, tone, context, universe }) => {
    let adventureContext = ''
    let universeContext = ''
    let story = null
    if (filename) {
      try {
        story = await readStory(filename)
        adventureContext = `\nAdventure: "${story.meta?.title}" by ${story.meta?.author}\nDescription: ${story.meta?.description || 'N/A'}\nRooms: ${Object.keys(story.rooms || {}).map(id => story.rooms[id].name).join(', ')}\nNPCs: ${(story.npcs || []).map(n => n.name).join(', ')}\n`
      } catch {}
    }
    const uContent = await loadUniverseForStory(story, universe)
    if (uContent) universeContext = `\n--- UNIVERSE GUIDELINES ---\n${uContent}\n--- END UNIVERSE GUIDELINES ---\n`

    const systemPrompt = `You are a creative writer for DUNGEONS, a story-driven MUD for children aged 6-12. Write engaging, age-appropriate narrative text. Keep sentences short and vivid. Use sensory details. Avoid anything scary or violent — think "mysterious and exciting" not "terrifying". Output ONLY the requested text, no explanations or metadata.${universeContext}`
    const prompt = `${adventureContext}${context ? `\nContext: ${context}` : ''}${tone ? `\nTone: ${tone}` : ''}\n\nPlease write: ${request}`

    const result = await sampleFn({
      systemPrompt,
      messages: [{ role: 'user', content: { type: 'text', text: prompt } }],
      maxTokens: 500
    })

    return { text: result }
  }

  const editor = async ({ filename, focus, universe }) => {
    let story
    try { story = await readStory(filename) } catch (e) {
      return { error: `Cannot read adventure: ${e.message}` }
    }

    const validation = validate(story, { required: ['meta', 'config', 'rooms'] })
    const storyJson = JSON.stringify(story, null, 2)
    const focusText = focus || 'full'

    let universeContext = ''
    const uContent = await loadUniverseForStory(story, universe)
    if (uContent) universeContext = `\n--- UNIVERSE GUIDELINES ---\n${uContent}\n--- END UNIVERSE GUIDELINES ---\n`

    const systemPrompt = `You are an editor for DUNGEONS adventures — MUD games for children aged 6-12. Review the adventure JSON and provide specific, actionable feedback. Consider: narrative quality, age-appropriateness, game balance, clue logic, room connectivity, NPC depth, and overall fun. Be constructive and specific — reference room/NPC/item IDs. Format as a prioritized list of suggestions.${universeContext ? ' Also verify the adventure aligns with the universe guidelines.' : ''}${universeContext}`
    const prompt = `Review this adventure (focus: ${focusText}):\n\nValidation: ${validation.ok ? 'PASSED' : `FAILED: ${validation.errors.join(', ')}`}\n\n${storyJson}`

    const result = await sampleFn({
      systemPrompt,
      messages: [{ role: 'user', content: { type: 'text', text: prompt } }],
      maxTokens: 1000
    })

    return { review: result, validation }
  }

  const generateRoom = async ({ filename, description, zone, connectTo, hasClue, hasItems, universe }) => {
    let adventureContext = ''
    let universeContext = ''
    let story = null
    if (filename) {
      try {
        story = await readStory(filename)
        const existingRooms = Object.keys(story.rooms || {}).join(', ')
        const stats = (story.config?.stats || []).map(s => s.id).join(', ')
        const verbs = (story.config?.verbMenu || []).join(', ')
        adventureContext = `Existing rooms: ${existingRooms}\nStats: ${stats}\nVerb menu: ${verbs}\n`
      } catch {}
    }
    const uContent = await loadUniverseForStory(story, universe)
    if (uContent) universeContext = `\n--- UNIVERSE GUIDELINES ---\n${uContent}\n--- END UNIVERSE GUIDELINES ---\n`

    const systemPrompt = `You are a room designer for DUNGEONS, a MUD for children aged 6-12. Generate a complete room definition as valid JSON.${universeContext} The room must follow this structure:
{
  "id": "snake_case_id",
  "name": "Display Name",
  "zone": "${zone || 'dungeon'}",
  "tags": [],
  "narrative": "...",
  "exits": [{"target": "room_id", "label": "Go somewhere"}],
  "choices": [{"id": "unique_id", "label": "Do something", "verb": "LOOK|TALK|USE|TAKE|PUSH", "narrative": "Result text", "requires": null, "target": "this_room_id", "effects": []}],
  "onEnter": [],
  "clue": ${hasClue ? '{"type": "core", "pool": [], "instruction": "Search the area"}' : 'null'},
  "items": ${hasItems ? '{"guaranteed": null, "draw": 1}' : 'null'}
}
Output ONLY valid JSON, nothing else.`

    const prompt = `${adventureContext}\nCreate a room: ${description}\n${connectTo?.length ? `Connect to rooms: ${connectTo.join(', ')}` : ''}`

    const result = await sampleFn({
      systemPrompt,
      messages: [{ role: 'user', content: { type: 'text', text: prompt } }],
      maxTokens: 800
    })

    try {
      const room = JSON.parse(result)
      return { room, note: 'Use add_room to add this to your adventure' }
    } catch {
      return { rawText: result, note: 'Could not parse as JSON — may need manual cleanup' }
    }
  }

  return {
    // Resources
    schemaResource, guideResource, adventureResource, universeResource,
    // Read tools
    listAdventures, readAdventure, inspectAdventure, validateAdventure,
    // Universe tools
    listUniverses, readUniverseFn, createUniverse, updateUniverse,
    // Write tools
    scaffoldAdventure, addRoom, updateRoom, addNpc, addItem,
    addClue, addCondition, addComplication, setSecret, setEpilogue,
    // AI tools
    writer, editor, generateRoom
  }
}

// ─── Writing Guide ──────────────────────────────────────────────────────────

const WRITING_GUIDE = `# DUNGEONS Adventure Writing Guide

## Target Audience
Children aged 6-12. Keep language simple, tone exciting but not scary.

## Structure
An adventure is a mystery to solve. Players explore rooms, gather clues, talk to NPCs,
and ultimately name the culprit and hideout.

### Core Components

**Rooms** — Places to explore. Each room has:
- A narrative (what you see/hear/feel)
- Exits (paths to other rooms)
- Choices (things to do, each with a verb, approach, and effects)
- Optional: clues, items, onEnter effects

**Room Zones**: \`hub\` (safe starting area), \`dungeon_X\` (explorable areas). The hub
is where NPCs live and players return between excursions.

**NPCs** — Characters in the hub. Each has:
- Visit scenes (different text each time you visit)
- Guilty/innocent variants (changes behavior based on the secret)
- Reactions (responses to accusations)

**Clues** — Evidence pointing to the culprit and hideout:
- Core clues: essential for solving the mystery
- Bonus clues: extra hints for observant players
- Each clue has \`pointsTo: { suspect, location }\`

**Secrets** — The solution combinations. Each has:
- culprit + hideout
- clueAssignments: which clue appears in which room
- roomOverrides: narrative tweaks based on the secret

**Items** — Collectible objects with optional use effects.
**Conditions** — Status effects (frozen, scared) that modify stats.
**Complications** — Random events triggered by the "wild" approach.
**Tracks** — Global counters (time, noise) that create urgency.

## Tips
1. Start with the mystery: who did it, where, and why?
2. Design 2-3 secret combinations for replayability
3. Make each room feel distinct — use all five senses
4. Give NPCs personality, not just information
5. Balance clue distribution across rooms and zones
6. Test with the \`inspect_adventure\` and \`validate_adventure\` tools
7. Keep narratives under 3 sentences — kids have short attention spans
`

export { createTools, WRITING_GUIDE }
