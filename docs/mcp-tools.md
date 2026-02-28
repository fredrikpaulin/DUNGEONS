# DUNGEONS MCP Server Tools Reference

## Overview

DUNGEONS includes an MCP (Model Context Protocol) server for AI-assisted adventure authoring. It lets you create, edit, and review adventures using Claude or any MCP-compatible client. The server is built with [tiny-mcp-server](https://github.com/fredrikpaulin/tiny-mcp-server) and runs via Bun.

The MCP server exposes 21 tools organized into five categories: read/inspect, universe, write, AI-powered, and resource access. Tools operate on JSON adventure files in the adventures directory and markdown universe files in the universes directory.

## Setup

### Requirements

- Bun runtime
- Access to DUNGEONS project directory
- Claude Desktop or another MCP client

### Claude Desktop Configuration

Add this to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dungeons": {
      "command": "/path/to/.bun/bin/bun",
      "args": ["run", "mcp-server/index.js"],
      "cwd": "/path/to/DUNGEONS"
    }
  }
}
```

Replace `/path/to/.bun/bin/bun` with the full path to your Bun binary (run `which bun` to find it) and `/path/to/DUNGEONS` with your actual project path. Using the full path to `bun` is important because desktop apps don't inherit your shell's PATH.

### Environment Variables

- `ADVENTURES_DIR` — Directory where adventure files are read and written (defaults to `./adventures`)
- `UNIVERSES_DIR` — Directory where universe markdown files are stored (defaults to `./universes`)

Example:
```bash
ADVENTURES_DIR=/custom/path/to/adventures UNIVERSES_DIR=/custom/path/to/universes bun run mcp-server/index.js
```

## Resources

Resources provide read-only access to reference material and adventure files. They are accessed via resource URIs.

### `dungeons://schema`
**Story Schema**

Returns the complete JSON Schema that defines the DUNGEONS adventure format. Use this to understand the structure required for adventures or to validate custom adventure modifications.

### `dungeons://guide`
**Adventure Writing Guide**

Returns the Adventure Writing Guide (markdown), which covers target audience, core components (rooms, NPCs, clues, secrets), zone types, and best practices for adventure design.

### `dungeons://adventure/{filename}`
**Adventure File**

Returns the raw JSON content of a specific adventure file. Example: `dungeons://adventure/my-mystery.json`

Used by tools like `read_adventure` and returned in full by the resource interface.

### `dungeons://universe/{name}`
**Universe File**

Returns the markdown content of a universe guidelines file. Example: `dungeons://universe/haunted-manor`

Universe files define creative guidelines (tone, characters, worldbuilding) that span multiple adventures.

## Read & Inspect Tools (4)

These tools retrieve and analyze adventures without modifying them.

### list_adventures

Lists all adventure files in the adventures directory with summary statistics.

**Parameters:** None

**Returns:**
```
[
  {
    "file": "mystery-at-the-bakery.json",
    "title": "Mystery at the Bakery",
    "author": "Jane Doe",
    "version": "1.0.0",
    "rooms": 8,
    "npcs": 4,
    "items": 6
  },
  ...
]
```

If no adventures exist, returns a message suggesting `scaffold_adventure`.

### read_adventure

Reads and parses a complete adventure file, returning the full story structure.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filename` | string | Yes | Filename relative to adventures/ (e.g., `my-adventure.json`) |

**Returns:** Full adventure object (meta, config, rooms, NPCs, clues, secrets, etc.)

**Error handling:** Returns error details if the file cannot be parsed.

### inspect_adventure

Inspects an adventure and returns summary statistics, room graph, zone list, and validation status. Useful for getting a high-level overview without loading the entire file.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filename` | string | Yes | Filename relative to adventures/ |

**Returns:**
```
{
  "meta": { ... },
  "validation": { "ok": true/false, "errors": [...] },
  "stats": {
    "rooms": 8,
    "npcs": 4,
    "items": 6,
    "roles": 4,
    "conditions": 3,
    "coreClues": 5,
    "bonusClues": 2,
    "complications": 3,
    "epilogues": 2,
    "secretCombos": 2
  },
  "roomGraph": {
    "hub": { "name": "The Hub", "zone": "hub", "exits": [...], ... },
    ...
  },
  "unassignedClues": ["clue_id_1", "clue_id_2"],
  "zones": ["hub", "dungeon_1", "dungeon_2"]
}
```

**Note:** The `unassignedClues` array highlights clues that exist but are not referenced in any secret combination. These should either be assigned or removed.

### validate_adventure

Validates an adventure file against the DUNGEONS schema and performs cross-reference checks (e.g., room exits point to valid rooms, NPCs exist, clues are assigned).

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filename` | string | Yes | Filename relative to adventures/ |

**Returns:**
```
{
  "valid": true/false,
  "errors": ["error message 1", "error message 2", ...]
}
```

Use this before publishing an adventure to catch structural issues.

## Universe Tools (4)

These tools manage universe files — markdown documents that define creative guidelines for one or more adventures.

### list_universes

Lists all universe files in the universes directory.

**Parameters:** None

**Returns:** Array of `{ name, file, description }` objects. The description is extracted from the first line of each markdown file.

### read_universe

Reads a universe file's full content.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | Yes | Universe name (without `.md` extension) |

**Returns:** `{ name, content }` with the full markdown text.

### create_universe

Creates a new universe file. If no custom content is provided, generates a template with recommended sections (Creative Pillars, Narrative Voice, Humor Guidelines, Character Templates, Worldbuilding, Content Boundaries, Pacing).

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | Yes | Universe name (used as filename) |
| `title` | string | No | Display title for the universe |
| `description` | string | No | Brief description |
| `content` | string | No | Full markdown content (overrides template) |

**Returns:** `{ created, path }` on success, or error if the universe already exists.

### update_universe

Replaces the content of an existing universe file.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | Yes | Universe name (without `.md` extension) |
| `content` | string | Yes | New markdown content |

**Returns:** `{ updated }` on success.

## Write Tools (10)

These tools modify adventure files, creating or updating content.

### scaffold_adventure

Creates a new adventure file with a minimal valid structure. This is the first step when starting a new adventure.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filename` | string | Yes | Name of the adventure file (e.g., `my-mystery.json`) |
| `title` | string | Yes | Display name of the adventure |
| `author` | string | No | Author name (defaults to "Unknown") |
| `description` | string | No | Short description of the adventure |
| `theme` | string | No | Theme hint for the hub room narrative |
| `playerCount` | object | No | `{ "min": 1, "max": 4 }` (defaults to 1-4 players) |
| `universe` | string | No | Universe name to link this adventure to (sets `meta.universe`) |

**Returns:**
```
{
  "created": "adventures/my-mystery.json",
  "valid": true,
  "message": "Adventure 'My Mystery' scaffolded. Use add_room, add_npc, add_item, etc. to flesh it out."
}
```

The scaffolded adventure includes:
- A `hub` room (safe starting area)
- Default config with tracks (time), tokens (courage), stats, approaches, and role definitions
- Empty arrays for rooms, NPCs, items, clues, conditions, complications, and secrets
- Win/loss epilogues

### add_room

Adds a new room to the adventure. Optionally creates return exits from other rooms.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filename` | string | Yes | Adventure filename |
| `room` | object | Yes | Room object (see below) |
| `connectFrom` | array | No | Array of `{roomId, label}` to auto-create return exits |

**Room object structure:**
```
{
  "id": "room_identifier",      // Required: unique ID in snake_case
  "name": "Display Name",        // Required: human-readable name
  "zone": "dungeon_1",           // Optional: zone name (defaults to "hub")
  "tags": ["tag1", "tag2"],      // Optional: array of tags (e.g., ["safe", "puzzle"])
  "narrative": "Description...", // Required: what players see when entering
  "exits": [],                   // Optional: array of {target, label} objects
  "choices": [],                 // Optional: array of interactive choices
  "onEnter": [],                 // Optional: array of effects triggered on entry
  "clue": null,                  // Optional: clue object or null
  "items": null                  // Optional: item pool or null
}
```

**Example: connectFrom parameter**
```
"connectFrom": [
  { "roomId": "hub", "label": "Enter the cave" },
  { "roomId": "chamber_1", "label": "Go deeper" }
]
```

This creates exits in the hub and chamber_1 rooms pointing back to the new room.

**Returns:**
```
{
  "added": "new_room_id",
  "name": "Room Name",
  "totalRooms": 9
}
```

### update_room

Updates specific fields in an existing room. This is a merge operation — only provided fields are changed.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filename` | string | Yes | Adventure filename |
| `roomId` | string | Yes | ID of the room to update |
| `updates` | object | Yes | Object with fields to merge (e.g., `{"narrative": "...", "tags": [...]}`) |

**Returns:**
```
{ "updated": "room_id" }
```

Or if room not found:
```
{ "error": "Room 'room_id' not found" }
```

### add_npc

Adds a new NPC (suspect) to the adventure, or updates an existing one with the same ID.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filename` | string | Yes | Adventure filename |
| `npc` | object | Yes | NPC object (see below) |

**NPC object structure:**
```
{
  "id": "npc_id",                // Required: unique ID
  "name": "NPC Name",            // Required: display name
  "role": "suspect",             // Optional: "suspect", "ally", or other role
  "scenes": {},                  // Optional: { sceneId: "narrative text", ... }
  "reactions": {},               // Optional: { reactionId: "response...", ... }
  "guiltyVariant": null,         // Optional: narrative changes if NPC is guilty
  "innocentVariant": null        // Optional: narrative changes if NPC is innocent
}
```

**Returns:**
```
{
  "added": "npc_id",
  "totalNpcs": 4
}
```

### add_item

Adds a new item to the adventure, or updates an existing one with the same ID.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filename` | string | Yes | Adventure filename |
| `item` | object | Yes | Item object (see below) |

**Item object structure:**
```
{
  "id": "item_id",               // Required: unique ID
  "name": "Item Name",           // Required: display name
  "description": "What it is",   // Optional: flavor text
  "tags": ["tag1"],              // Optional: categorization
  "useEffects": []               // Optional: effects when used
}
```

**Returns:**
```
{
  "added": "item_id",
  "totalItems": 6
}
```

### add_clue

Adds a clue (core or bonus evidence) to the adventure, or updates an existing one.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filename` | string | Yes | Adventure filename |
| `clue` | object | Yes | Clue object (see below) |

**Clue object structure:**
```
{
  "id": "clue_id",              // Required: unique ID
  "text": "The evidence...",     // Required: what the clue says
  "type": "core" or "bonus",    // Optional: "core" (essential) or "bonus" (extra)
  "pointsTo": {                 // Optional: what the clue reveals
    "culprit": "suspect_id",
    "location": "room_id"
  }
}
```

**Returns:**
```
{
  "added": "clue_id",
  "pool": "core" or "bonus",
  "totalClues": 7
}
```

### add_condition

Adds a status condition (status effect) to the adventure. Conditions modify stats or gameplay during the adventure.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filename` | string | Yes | Adventure filename |
| `condition` | object | Yes | Condition object (see below) |

**Condition object structure:**
```
{
  "id": "condition_id",         // Required: unique ID
  "name": "Condition Name",     // Required: display name
  "description": "Effect...",   // Optional: what it does
  "effects": []                 // Optional: stat modifiers
}
```

Example: `{ "id": "frozen", "name": "Frozen", "description": "Move slowly" }`

**Returns:**
```
{
  "added": "condition_id",
  "totalConditions": 3
}
```

### add_complication

Adds a complication event — a random encounter triggered by the "wild" approach.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filename` | string | Yes | Adventure filename |
| `complication` | object | Yes | Complication object (see below) |

**Complication object structure:**
```
{
  "id": "complication_id",      // Required: unique ID
  "name": "Event Name",         // Required: display name
  "size": "minor" or "major",   // Required: severity level
  "narrative": "What happens...", // Required: description
  "effects": []                 // Optional: game effects
}
```

Example:
```
{
  "id": "cave_collapse",
  "name": "Cave Collapse",
  "size": "major",
  "narrative": "The ground shakes and rocks fall from above!"
}
```

**Returns:**
```
{
  "added": "complication_id",
  "totalComplications": 3
}
```

### set_secret

Creates or updates a secret combination — the solution to the mystery.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filename` | string | Yes | Adventure filename |
| `secret` | object | Yes | Secret object (see below) |

**Secret object structure:**
```
{
  "culprit": "npc_id",          // Required: which NPC is guilty
  "hideout": "room_id",         // Required: where the crime happened
  "clueAssignments": {          // Required: maps clue IDs to room IDs
    "clue_id_1": "room_1",
    "clue_id_2": "room_2"
  },
  "roomOverrides": {},           // Optional: narrative changes based on this secret
  "epilogue": "epilogue_id"     // Optional: which ending to show (auto-generated if omitted)
}
```

Example:
```
{
  "culprit": "villain",
  "hideout": "secret_chamber",
  "clueAssignments": {
    "muddy_boots": "forest",
    "torn_cloak": "temple",
    "jewel_shard": "hideout"
  }
}
```

**Returns:**
```
{
  "set": "villain/secret_chamber",
  "totalCombos": 2
}
```

An adventure can have multiple secret combinations for replayability.

### set_epilogue

Creates or updates an epilogue — the ending shown after solving the mystery.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filename` | string | Yes | Adventure filename |
| `epilogue` | object | Yes | Epilogue object (see below) |

**Epilogue object structure:**
```
{
  "id": "epilogue_id",          // Required: unique ID
  "type": "win" or "loss",      // Optional: ending type
  "narrative": "The story...",  // Required: the ending text
  "effects": []                 // Optional: final game effects
}
```

Example:
```
{
  "id": "villain_caught",
  "type": "win",
  "narrative": "The villain is caught and the town is safe again!"
}
```

**Returns:**
```
{
  "set": "epilogue_id",
  "totalEpilogues": 3
}
```

## AI-Powered Tools (3)

These tools use Claude to generate or review adventure content. All AI tools are **universe-aware**: if the adventure has a `meta.universe` field, the corresponding universe guidelines are automatically loaded as context. You can also override the universe with the `universe` parameter.

### writer

Generates narrative text for rooms, NPCs, clues, and other story elements. Produces age-appropriate, vivid prose tailored to DUNGEONS style.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `request` | string | Yes | What to write (e.g., "a spooky room description") |
| `filename` | string | No | Adventure filename for context |
| `tone` | string | No | Tone to adopt (e.g., "mysterious", "humorous", "scary") |
| `context` | string | No | Additional context for the writer |
| `universe` | string | No | Universe name override (auto-detected from adventure if not provided) |

**Returns:**
```
{
  "text": "Generated narrative text here..."
}
```

**Tips:**
- Specific requests produce better results: "write a room narrative for a dusty library" vs. "write text"
- Provide context when available to ensure consistency with existing adventure tone
- Output is limited to 500 tokens (roughly 400 words)

### editor

Reviews an adventure for consistency, balance, age-appropriateness, and overall quality. Provides specific, actionable feedback.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filename` | string | Yes | Adventure filename to review |
| `focus` | string | No | Focus area (e.g., "narrative", "balance", "clues") |
| `universe` | string | No | Universe name override (auto-detected from adventure if not provided) |

**Returns:**
```
{
  "review": "Detailed feedback and suggestions...",
  "validation": { "ok": true/false, "errors": [...] }
}
```

The review includes:
- Structural validation results
- Suggestions for narrative improvement
- Game balance observations
- Age-appropriateness checks
- Clue distribution analysis
- Room connectivity feedback

**Tips:**
- Run this regularly during development
- Use the `focus` parameter to target specific aspects
- Address validation errors before seeking editorial feedback

### generate_room

Generates a complete room definition (as JSON) from a natural language description. Produces valid DUNGEONS room structure.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `description` | string | Yes | What the room should be (e.g., "a dark forest clearing with mushrooms") |
| `filename` | string | No | Adventure filename for context (room templates, stats, etc.) |
| `zone` | string | No | Zone name (e.g., "dungeon_1"); defaults to "dungeon" |
| `connectTo` | array | No | Room IDs to connect to via exits (e.g., `["hub", "room_2"]`) |
| `hasClue` | boolean | No | Whether to include a clue structure (defaults to false) |
| `hasItems` | boolean | No | Whether to include an item pool (defaults to false) |
| `universe` | string | No | Universe name override (auto-detected from adventure if not provided) |

**Returns:**
```
{
  "room": {
    "id": "generated_room_id",
    "name": "Room Name",
    "zone": "dungeon_1",
    "tags": ["tag1"],
    "narrative": "Description...",
    "exits": [{...}],
    "choices": [{...}],
    "onEnter": [],
    "clue": null or { ... },
    "items": null or { ... }
  },
  "note": "Use add_room to add this to your adventure"
}
```

If JSON parsing fails:
```
{
  "rawText": "...",
  "note": "Could not parse as JSON — may need manual cleanup"
}
```

**Tips:**
- Provide rich descriptions for more interesting rooms
- Use `connectTo` to ensure the room fits your map
- Set `hasClue` and `hasItems` to pre-populate those structures
- Always use `add_room` to integrate the result into your adventure
- Review the generated room structure before using it — you may want to adjust narrative or choices

## Typical Workflow

This workflow demonstrates how to build an adventure from scratch:

### 1. Scaffold the adventure
```
scaffold_adventure({
  "filename": "my-mystery.json",
  "title": "Mystery at the Library",
  "author": "Your Name",
  "description": "A book has gone missing...",
  "theme": "mysterious library",
  "playerCount": { "min": 1, "max": 4 }
})
```

### 2. Build the room map
```
generate_room({
  "filename": "my-mystery.json",
  "description": "A cozy reading room with tall shelves and a fireplace",
  "zone": "library",
  "connectTo": ["hub"],
  "hasClue": true
})
```
Then use `add_room` to integrate the generated room.

Repeat for additional rooms, building out your adventure geography.

### 3. Add NPCs (suspects)
```
add_npc({
  "filename": "my-mystery.json",
  "npc": {
    "id": "librarian",
    "name": "Ms. Chen",
    "role": "suspect",
    "scenes": {
      "scene1": "The librarian looks busy organizing books..."
    }
  }
})
```

Add multiple suspects so players have options to investigate.

### 4. Create clues
```
add_clue({
  "filename": "my-mystery.json",
  "clue": {
    "id": "wet_book",
    "text": "A book is soaked with tea",
    "type": "core",
    "pointsTo": {
      "culprit": "janitor",
      "location": "staff_room"
    }
  }
})
```

Create both core clues (essential for solving) and bonus clues (extra hints).

### 5. Define the solution
```
set_secret({
  "filename": "my-mystery.json",
  "secret": {
    "culprit": "janitor",
    "hideout": "staff_room",
    "clueAssignments": {
      "wet_book": "kitchen",
      "muddy_footprints": "staff_room",
      "confession_letter": "hidden_shelf"
    }
  }
})
```

You can define multiple secrets for replayability.

### 6. Polish narratives
```
writer({
  "filename": "my-mystery.json",
  "request": "Write a spooky yet non-scary narrative for the dusty archive room",
  "tone": "mysterious and exciting",
  "context": "This is where the book was originally kept"
})
```

Use `update_room` to insert the generated text.

### 7. Add complexity
```
add_complication({
  "filename": "my-mystery.json",
  "complication": {
    "id": "alarm_triggers",
    "name": "Alarm System",
    "size": "major",
    "narrative": "Oh no! The library alarm starts blaring!"
  }
})
```

Add conditions, items, and complications to deepen gameplay.

### 8. Review and validate
```
inspect_adventure({
  "filename": "my-mystery.json"
})
```

Check the stats, room graph, zones, and unassigned clues.

```
validate_adventure({
  "filename": "my-mystery.json"
})
```

Fix any validation errors (missing exits, undefined NPCs, etc.).

### 9. Get editorial feedback
```
editor({
  "filename": "my-mystery.json",
  "focus": "balance"
})
```

Refine based on suggestions. Iterate on narrative, clue distribution, and game flow.

### 10. Final validation
```
inspect_adventure({
  "filename": "my-mystery.json"
})
```

Ensure all clues are assigned, all rooms are reachable, and stats look correct.

Your adventure is ready to play!

## Best Practices

- **Validate early and often.** Use `validate_adventure` after adding major content.
- **Test replayability.** Create 2-3 secret combinations so players experience different mysteries.
- **Balance clues.** Use `inspect_adventure` to verify clue distribution across rooms.
- **Keep language simple.** Target audience is 6-12 year-olds; sentences should be short and vivid.
- **Use the writer and editor tools.** They catch consistency issues and suggest improvements.
- **Document your mystery.** Track culprit, hideout, and key clues before building.
- **Playtest.** Have real feedback from players before considering an adventure complete.

## Troubleshooting

**"Adventure not found" error**
- Check the filename matches exactly (case-sensitive)
- Ensure the file is in the adventures directory (or the directory specified by `ADVENTURES_DIR`)

**Validation errors after writing**
- Run `inspect_adventure` to see the specific errors
- Common issues: room exits point to non-existent rooms, NPCs referenced in clues don't exist, clues not assigned to secrets

**Unassigned clues**
- Use `inspect_adventure` to identify them
- Either assign them to a secret via `set_secret`, or remove them

**Room not reachable**
- Check the room graph in `inspect_adventure`
- Ensure at least one other room has an exit pointing to it, or it's the start room

**Generated content doesn't parse**
- The `generate_room` tool occasionally produces malformed JSON
- The error message will show the raw text — fix it manually or request regeneration
