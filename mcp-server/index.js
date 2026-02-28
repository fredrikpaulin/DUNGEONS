// DUNGEONS MCP Server — adventure authoring tools
// Uses tiny-mcp-server for the MCP protocol layer
import { registerTool, registerResource, registerResourceTemplate, sample, serve } from 'tiny-mcp-server'
import { createTools } from './tools.js'

const ADVENTURES_DIR = process.env.ADVENTURES_DIR || './adventures'
const UNIVERSES_DIR = process.env.UNIVERSES_DIR || './universes'
const SCHEMA_PATH = './server/schema/story.schema.json'

const tools = createTools(ADVENTURES_DIR, UNIVERSES_DIR, SCHEMA_PATH, sample)

// ─── Resources ──────────────────────────────────────────────────────────────

registerResource('dungeons://schema', 'Story Schema', 'JSON Schema defining the DUNGEONS adventure format', 'application/json', tools.schemaResource)
registerResource('dungeons://guide', 'Adventure Writing Guide', 'Guide to writing adventures for DUNGEONS', 'text/markdown', tools.guideResource)
registerResourceTemplate('dungeons://adventure/{filename}', 'Adventure File', 'Read a specific adventure JSON file', 'application/json', tools.adventureResource)
registerResourceTemplate('dungeons://universe/{name}', 'Universe File', 'Read a universe guidelines markdown file', 'text/markdown', tools.universeResource)

// ─── Tools: Read & Inspect ──────────────────────────────────────────────────

registerTool('list_adventures', 'List all adventure files in the adventures directory',
  { type: 'object', properties: {}, required: [] }, tools.listAdventures)

registerTool('read_adventure', 'Read and parse an adventure file, returning its full structure',
  { type: 'object', properties: { filename: { type: 'string', description: 'Filename relative to adventures/' } }, required: ['filename'] },
  tools.readAdventure)

registerTool('inspect_adventure', 'Inspect an adventure: show summary stats, room graph, and any validation errors',
  { type: 'object', properties: { filename: { type: 'string', description: 'Filename relative to adventures/' } }, required: ['filename'] },
  tools.inspectAdventure)

registerTool('validate_adventure', 'Validate an adventure file against the DUNGEONS schema and cross-reference checks',
  { type: 'object', properties: { filename: { type: 'string', description: 'Filename relative to adventures/' } }, required: ['filename'] },
  tools.validateAdventure)

// ─── Tools: Universe ────────────────────────────────────────────────────────

registerTool('list_universes', 'List all universe files in the universes directory',
  { type: 'object', properties: {}, required: [] }, tools.listUniverses)

registerTool('read_universe', 'Read a universe guidelines file',
  { type: 'object', properties: { name: { type: 'string', description: 'Universe name (without .md extension)' } }, required: ['name'] },
  tools.readUniverseFn)

registerTool('create_universe', 'Create a new universe guidelines file with recommended template sections',
  { type: 'object', properties: { name: { type: 'string', description: 'Universe name (used as filename)' }, title: { type: 'string' }, description: { type: 'string' }, content: { type: 'string', description: 'Full markdown content (overrides template)' } }, required: ['name'] },
  tools.createUniverse)

registerTool('update_universe', 'Update a universe guidelines file (full content replacement)',
  { type: 'object', properties: { name: { type: 'string', description: 'Universe name (without .md extension)' }, content: { type: 'string', description: 'New markdown content' } }, required: ['name', 'content'] },
  tools.updateUniverse)

// ─── Tools: Scaffold & Write ────────────────────────────────────────────────

registerTool('scaffold_adventure', 'Create a new adventure file with a minimal valid structure',
  {
    type: 'object',
    properties: {
      filename: { type: 'string' }, title: { type: 'string' }, author: { type: 'string' },
      description: { type: 'string' }, theme: { type: 'string' },
      playerCount: { type: 'object', properties: { min: { type: 'number' }, max: { type: 'number' } } },
      universe: { type: 'string', description: 'Universe name to link this adventure to' }
    },
    required: ['filename', 'title']
  }, tools.scaffoldAdventure)

registerTool('add_room', 'Add a new room to an adventure. Connects it via exits from/to existing rooms.',
  {
    type: 'object',
    properties: {
      filename: { type: 'string' },
      room: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, zone: { type: 'string' }, tags: { type: 'array' }, narrative: { type: 'string' }, exits: { type: 'array' }, choices: { type: 'array' }, onEnter: { type: 'array' }, clue: {}, items: {} }, required: ['id', 'name', 'narrative'] },
      connectFrom: { type: 'array', items: { type: 'object', properties: { roomId: { type: 'string' }, label: { type: 'string' } }, required: ['roomId', 'label'] } }
    },
    required: ['filename', 'room']
  }, tools.addRoom)

registerTool('update_room', 'Update fields on an existing room',
  { type: 'object', properties: { filename: { type: 'string' }, roomId: { type: 'string' }, updates: { type: 'object' } }, required: ['filename', 'roomId', 'updates'] },
  tools.updateRoom)

registerTool('add_npc', 'Add an NPC to the adventure',
  { type: 'object', properties: { filename: { type: 'string' }, npc: { type: 'object', required: ['id', 'name'] } }, required: ['filename', 'npc'] },
  tools.addNpc)

registerTool('add_item', 'Add an item to the adventure',
  { type: 'object', properties: { filename: { type: 'string' }, item: { type: 'object', required: ['id', 'name'] } }, required: ['filename', 'item'] },
  tools.addItem)

registerTool('add_clue', 'Add a clue (core or bonus) to the adventure',
  { type: 'object', properties: { filename: { type: 'string' }, clue: { type: 'object', required: ['id', 'text'] } }, required: ['filename', 'clue'] },
  tools.addClue)

registerTool('add_condition', 'Add a status condition to the adventure',
  { type: 'object', properties: { filename: { type: 'string' }, condition: { type: 'object', required: ['id', 'name'] } }, required: ['filename', 'condition'] },
  tools.addCondition)

registerTool('add_complication', 'Add a complication event to the adventure',
  { type: 'object', properties: { filename: { type: 'string' }, complication: { type: 'object', required: ['id', 'name', 'size', 'narrative'] } }, required: ['filename', 'complication'] },
  tools.addComplication)

registerTool('set_secret', 'Add or update a secret combination',
  { type: 'object', properties: { filename: { type: 'string' }, secret: { type: 'object', required: ['culprit', 'hideout', 'clueAssignments'] } }, required: ['filename', 'secret'] },
  tools.setSecret)

registerTool('set_epilogue', 'Add or update an epilogue',
  { type: 'object', properties: { filename: { type: 'string' }, epilogue: { type: 'object', required: ['id', 'narrative'] } }, required: ['filename', 'epilogue'] },
  tools.setEpilogue)

// ─── Tools: AI-Powered ──────────────────────────────────────────────────────

registerTool('writer', 'AI writer — generates narrative text for rooms, NPCs, clues, and other story elements',
  { type: 'object', properties: { filename: { type: 'string' }, request: { type: 'string' }, tone: { type: 'string' }, context: { type: 'string' }, universe: { type: 'string', description: 'Universe name override (auto-detected from adventure if not provided)' } }, required: ['request'] },
  tools.writer)

registerTool('editor', 'AI editor — reviews adventure content for consistency, balance, and fun factor',
  { type: 'object', properties: { filename: { type: 'string' }, focus: { type: 'string' }, universe: { type: 'string', description: 'Universe name override (auto-detected from adventure if not provided)' } }, required: ['filename'] },
  tools.editor)

registerTool('generate_room', 'AI room generator — describe what you want and get a complete room definition',
  { type: 'object', properties: { filename: { type: 'string' }, description: { type: 'string' }, zone: { type: 'string' }, connectTo: { type: 'array', items: { type: 'string' } }, hasClue: { type: 'boolean' }, hasItems: { type: 'boolean' }, universe: { type: 'string', description: 'Universe name override (auto-detected from adventure if not provided)' } }, required: ['description'] },
  tools.generateRoom)

// ─── Start Server ───────────────────────────────────────────────────────────

serve({ name: 'dungeons-mcp', version: '1.0.0' })
