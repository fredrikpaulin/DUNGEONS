# DUNGEONS Story Format Reference

A comprehensive guide to the DUNGEONS adventure JSON format. Adventures define the map, characters, items, mechanics, and mystery of a story-driven dungeon experience.

## Overview

DUNGEONS adventures are JSON files that describe a complete interactive narrative. The top-level structure contains the following sections:

```json
{
  "meta": {},
  "config": {},
  "strings": {},
  "roles": [],
  "conditions": [],
  "items": [],
  "clues": {},
  "npcs": [],
  "rooms": {},
  "complications": [],
  "epilogues": {},
  "secrets": {}
}
```

**Required sections:** `meta`, `config`, `rooms`

All other sections are optional and should be included only if needed for your adventure.

---

## meta

Metadata about the adventure.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | The name of the adventure |
| `author` | string | No | Creator's name |
| `version` | string | Yes | Version number (e.g., "1.0.0") |
| `language` | string | No | Language code (default: "en") |
| `playerCount` | object | No | Player count constraints |
| `description` | string | No | Long description of the adventure |

### playerCount

Defines minimum and maximum players allowed.

| Field | Type | Default |
|-------|------|---------|
| `min` | integer | 1 |
| `max` | integer | 10 |

### Example

```json
{
  "meta": {
    "title": "The Haunted Manor Mystery",
    "author": "Fredrik",
    "version": "0.1.0",
    "language": "en",
    "playerCount": {
      "min": 1,
      "max": 4
    },
    "description": "Something precious has gone missing from Grimsworth Manor! Explore the creaky old house..."
  }
}
```

---

## config

Game rules and mechanical configuration.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tracks` | array | No | Global counters (time, noise, etc.) |
| `tokens` | array | No | Shared resource pools |
| `stats` | array | No | Player character attributes |
| `approaches` | array | No | Methods to tackle choices (brave, careful, wild) |
| `startRoom` | string | No | ID of the first room players enter |
| `verbMenu` | array | No | Available action verbs |
| `lobby` | object | No | Lobby and game start settings |

### tracks

Global counters that affect game state. Common use: time passing, noise level, danger rising.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `name` | string | No | Display name |
| `start` | integer | Yes | Initial value |
| `min` | integer | Yes | Minimum value |
| `max` | integer | Yes | Maximum value |
| `direction` | string | Yes | "up" or "down" |
| `triggerAt` | integer | No | Value at which effects trigger |
| `triggerEffects` | array | No | Effects triggered at `triggerAt` |

Direction indicates if the track counts up or down. When it reaches `triggerAt`, `triggerEffects` execute.

Example: A "time" track that counts down from 8 to 0, triggering effects at 0:

```json
{
  "id": "time",
  "name": "Time",
  "start": 8,
  "min": 0,
  "max": 10,
  "direction": "down",
  "triggerAt": 0,
  "triggerEffects": [
    {
      "type": "narrative",
      "text": "Time has run out!"
    }
  ]
}
```

### tokens

Shared resource pools. Each player starts with `startPerPlayer` tokens; `pool` is the global maximum.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `name` | string | No | Display name |
| `pool` | integer | Yes | Total pool size |
| `startPerPlayer` | integer | No | Tokens each player starts with (default: 0) |

Example:

```json
{
  "id": "courage",
  "name": "Courage",
  "pool": 5,
  "startPerPlayer": 1
}
```

### stats

Player character attributes like Strength, Perception, Charm, Cunning.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (e.g., "str", "per") |
| `name` | string | No | Display name (e.g., "Strength") |
| `min` | integer | No | Minimum value (default: 0) |
| `max` | integer | No | Maximum value (default: 3) |

Example:

```json
{
  "id": "per",
  "name": "Perception",
  "min": 0,
  "max": 3
}
```

### approaches

How players can tackle a choice. Common approaches: brave (risky), careful (safe), wild (chaotic).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `name` | string | No | Display name |
| `effects` | array | No | Effects applied when this approach is chosen |
| `requiresComplication` | boolean | No | If true, can only be chosen when a complication exists (default: false) |

Example:

```json
{
  "id": "wild",
  "name": "Wild",
  "effects": [
    {
      "type": "token",
      "token": "courage",
      "delta": 1
    }
  ],
  "requiresComplication": true
}
```

### verbMenu

Array of action verbs available to players in the UI.

```json
"verbMenu": ["LOOK", "TALK", "USE", "TAKE", "PUSH"]
```

### lobby

Settings for the lobby and game start.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `minPlayers` | integer | 1 | Minimum players to auto-start |
| `maxPlayers` | integer | 10 | Maximum players allowed |
| `roleSelection` | string | "pick" | How roles are assigned: "pick" (player chooses), "random" (assigned randomly), or "assign" (host assigns) |
| `autoStart` | boolean | false | Whether to auto-start when lobby is full |

Example:

```json
{
  "minPlayers": 1,
  "maxPlayers": 4,
  "roleSelection": "pick",
  "autoStart": false
}
```

---

## strings

UI localization strings. Allows customization of interface text.

| Field | Type | Description |
|-------|------|-------------|
| `choose_prompt` | string | Prompt for making a choice (e.g., "Choose [1-{n}]:") |
| `also_here` | string | Label for NPCs/items in a room (e.g., "Also here:") |
| `press_any_key` | string | Prompt to continue (e.g., "Press any key...") |
| `items_label` | string | Label for inventory (e.g., "Items:") |
| `conditions_label` | string | Label for active conditions (e.g., "Conditions:") |

Example:

```json
{
  "choose_prompt": "Choose [1-{n}]:",
  "also_here": "Also here:",
  "press_any_key": "Press any key...",
  "items_label": "Items:",
  "conditions_label": "Conditions:"
}
```

---

## roles

Player roles with special abilities called "tricks".

Each role array item:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `name` | string | Yes | Display name |
| `description` | string | No | What this role is good at |
| `tricks` | array | No | Special abilities (see tricks) |

### trick

A special ability tied to a role.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `name` | string | Yes | Display name |
| `description` | string | No | What the trick does |
| `trigger` | string | No | When the trick activates: "enter_room" (automatic) or "manual" (player chooses) |
| `uses` | string | No | Limitation: "once_per_room", "once_per_dungeon", "passive", or "always" |
| `effects` | array | No | Effects triggered when the trick activates |

Example:

```json
{
  "id": "explorer",
  "name": "Explorer",
  "description": "Good at finding things",
  "tricks": [
    {
      "id": "scout",
      "name": "Scout Ahead",
      "description": "Peek into next room",
      "trigger": "enter_room",
      "uses": "once_per_dungeon",
      "effects": [
        {
          "type": "narrative",
          "text": "You scout ahead and spot something."
        }
      ]
    }
  ]
}
```

---

## rooms

The dungeon map as an object keyed by room ID.

Each room:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `name` | string | Yes | Display name |
| `zone` | string | No | Zone or area grouping (e.g., "basement", "tower") |
| `tags` | array | No | Categories (e.g., ["hub", "safe"]) |
| `narrative` | string | Yes | Description of the room |
| `narrativeVariants` | object | No | Conditional alternate narratives |
| `footnotes` | array | No | Footnotes or annotations for the room |
| `exits` | array | No | Doors/passages to other rooms |
| `choices` | array | No | Actions the player can take |
| `onEnter` | array | No | Effects triggered upon entering |
| `clue` | object or null | No | Clue available in this room |
| `items` | object or null | No | Items available in this room |

### narrativeVariants

Object mapping condition IDs to alternate narrative text. Shown instead of the main `narrative` if the condition is active.

```json
"narrativeVariants": {
  "frozen": "The room is icy cold."
}
```

### exit

A passage to another room.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | string | Yes | ID of the destination room |
| `label` | string | Yes | Display text (e.g., "Go north to the tower") |
| `requires` | object or null | No | Stat requirement to use this exit |
| `requiresItem` | string or null | No | Item ID required to use this exit |

The `requires` object:

| Field | Type |
|-------|------|
| `stat` | string |
| `min` | integer |

Example:

```json
{
  "target": "tower_top",
  "label": "Climb to the top",
  "requires": {
    "stat": "str",
    "min": 1
  },
  "requiresItem": "rope"
}
```

### choice

An action the player can perform in a room.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `label` | string | Yes | Display text |
| `verb` | string | No | Associated verb (e.g., "LOOK", "TALK") |
| `narrative` | string | No | Flavor text describing the action |
| `requires` | object or null | No | Stat requirement |
| `requiresItem` | string or null | No | Item ID required |
| `target` | string | Yes | ID of destination room (can be same room) |
| `effects` | array | No | Effects applied when choice is taken |
| `conditionalNarrative` | object | No | Alternate narrative based on conditions |
| `revealAfter` | array | No | Clue IDs that must be found first to reveal this choice |

Example:

```json
{
  "id": "mine_enter",
  "label": "Venture deeper",
  "verb": "PUSH",
  "narrative": "You push forward into darkness.",
  "requires": {
    "stat": "str",
    "min": 1
  },
  "target": "mine_deep",
  "effects": [
    {
      "type": "track",
      "track": "noise",
      "delta": 1
    }
  ],
  "revealAfter": ["K1", "K2"]
}
```

### clue

A clue available in this room.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | "core" (required) or "bonus" (optional) |
| `pool` | array | Yes | List of clue IDs that can appear |
| `instruction` | string | No | Flavor text for finding the clue |

Example:

```json
{
  "type": "core",
  "pool": ["K1", "K2", "K5"],
  "instruction": "Search the area"
}
```

### items

Items available in this room.

| Field | Type | Description |
|-------|------|-------------|
| `guaranteed` | string or null | Item ID that is always present |
| `draw` | integer | Number of random items to draw from the global item pool |

Example:

```json
{
  "guaranteed": "torch",
  "draw": 0
}
```

### Full room example

```json
{
  "id": "mine_entrance",
  "name": "Mine Entrance",
  "zone": "dungeon_a",
  "tags": ["entrance"],
  "narrative": "A dark mine shaft stretches before you.",
  "exits": [
    {
      "target": "mine_deep",
      "label": "Go deeper"
    },
    {
      "target": "hub",
      "label": "Go back to village"
    }
  ],
  "choices": [
    {
      "id": "mine_look",
      "label": "Search the entrance",
      "verb": "LOOK",
      "narrative": "You find scratch marks on the walls.",
      "target": "mine_entrance",
      "effects": [
        {
          "type": "track",
          "track": "weather",
          "delta": -1
        }
      ]
    }
  ],
  "onEnter": [
    {
      "type": "narrative",
      "text": "The air grows cold as you enter."
    }
  ],
  "clue": {
    "type": "core",
    "pool": ["K1", "K2", "K5"],
    "instruction": "Search the area"
  },
  "items": {
    "guaranteed": null,
    "draw": 1
  }
}
```

---

## effects

Effects are actions triggered by rooms, choices, tricks, items, and track milestones. There are 13 effect types.

| Type | Description |
|------|-------------|
| `track` | Modify a track's value |
| `token` | Add or remove tokens from a pool |
| `condition` | Add or remove a condition from a player |
| `item` | Add or remove an item from a player's inventory |
| `clue` | Grant a clue directly |
| `insight` | Provide narrative insight (displayed to all players) |
| `narrative` | Display narrative text |
| `goto` | Move players to a different room |
| `complication` | Trigger a complication event |
| `npc_reveal` | Reveal or interact with an NPC |
| `verb_reward` | Add a reward verb or action to the menu |
| `leader_flip` | Change who the "leader" is (for voting mechanics) |
| `rest` | Restore player health/conditions |

### track

Modify a global track value.

```json
{
  "type": "track",
  "track": "time",
  "delta": -1
}
```

| Field | Type |
|-------|------|
| `track` | string (track ID) |
| `delta` | integer (amount to change) |

### token

Add or remove tokens.

```json
{
  "type": "token",
  "token": "courage",
  "delta": 1
}
```

| Field | Type |
|-------|------|
| `token` | string (token ID) |
| `delta` | integer (positive to add, negative to remove) |

### condition

Add or remove a condition.

```json
{
  "type": "condition",
  "condition": "frozen",
  "action": "add",
  "target": "self"
}
```

| Field | Type |
|-------|------|
| `condition` | string (condition ID) |
| `action` | string ("add" or "remove") |
| `target` | string (usually "self") |

### item

Add or remove an item.

```json
{
  "type": "item",
  "action": "add",
  "id": "key"
}
```

| Field | Type |
|-------|------|
| `action` | string ("add" or "remove") |
| `id` | string (item ID) |

### clue

Grant a clue directly.

```json
{
  "type": "clue",
  "id": "K1"
}
```

| Field | Type |
|-------|------|
| `id` | string (clue ID) |

### insight

Display insight text visible to all players.

```json
{
  "type": "insight",
  "text": "Something important has been revealed..."
}
```

| Field | Type |
|-------|------|
| `text` | string |

### narrative

Display narrative text.

```json
{
  "type": "narrative",
  "text": "The door creaks open slowly."
}
```

| Field | Type |
|-------|------|
| `text` | string |

### goto

Move players to another room.

```json
{
  "type": "goto",
  "target": "finale"
}
```

| Field | Type |
|-------|------|
| `target` | string (room ID) |

### complication

Trigger a complication (a random obstacle).

```json
{
  "type": "complication",
  "size": "small"
}
```

| Field | Type |
|-------|------|
| `size` | string ("small" or "large") |

### npc_reveal

Reveal or show an NPC.

```json
{
  "type": "npc_reveal",
  "npc": "elder"
}
```

| Field | Type |
|-------|------|
| `npc` | string (NPC ID) |

### verb_reward

Add a verb or action to the menu.

```json
{
  "type": "verb_reward",
  "id": "fight"
}
```

| Field | Type |
|-------|------|
| `id` | string (verb ID) |

### leader_flip

Change who the current "leader" is.

```json
{
  "type": "leader_flip"
}
```

### rest

Restore a player (remove some/all conditions).

```json
{
  "type": "rest"
}
```

---

## npcs

Non-player characters who inhabit the dungeon.

Each NPC:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `name` | string | Yes | Display name |
| `role` | string | No | NPC role or type (e.g., "quest_giver", "suspect") |
| `scenes` | object | No | Conversations keyed by location and visit number |
| `reactions` | object | No | How NPC reacts to accusations (e.g., "accused", "cleared") |
| `guiltyVariant` | object or null | No | Behavior changes if this NPC is the culprit |
| `innocentVariant` | object or null | No | Behavior changes if this NPC is innocent |

### scenes

Object keyed by scene ID (typically `{room}_visit_{number}`). Each scene contains:

| Field | Type | Required |
|-------|------|----------|
| `narrative` | string | Yes |
| `effects` | array | No |

Example:

```json
"scenes": {
  "hub_visit_1": {
    "narrative": "The Elder greets you warmly.",
    "effects": []
  },
  "hub_visit_2": {
    "narrative": "The Elder looks worried.",
    "effects": [
      {
        "type": "token",
        "token": "insight",
        "delta": 1
      }
    ]
  }
}
```

### guiltyVariant / innocentVariant

Override scenes or reactions based on the NPC's guilt/innocence.

| Field | Type |
|-------|------|
| `sceneOverrides` | object (keyed by scene ID, contains narrative and effects) |
| `reactionOverrides` | object (keyed by reaction type, contains narrative and effects) |

Example:

```json
{
  "guiltyVariant": {
    "sceneOverrides": {
      "hub_visit_1": {
        "narrative": "Grix sweats and stammers.",
        "effects": [
          {
            "type": "track",
            "track": "noise",
            "delta": 1
          }
        ]
      }
    }
  },
  "innocentVariant": {
    "sceneOverrides": {
      "hub_visit_1": {
        "narrative": "Grix waves cheerfully.",
        "effects": []
      }
    }
  }
}
```

### Full NPC example

```json
{
  "id": "goblin",
  "name": "Grix the Goblin",
  "role": "suspect",
  "scenes": {
    "hub_visit_1": {
      "narrative": "Grix fidgets nervously.",
      "effects": []
    },
    "hub_visit_2": {
      "narrative": "Grix avoids eye contact.",
      "effects": []
    }
  },
  "reactions": {
    "accused": {
      "narrative": "Grix protests loudly!",
      "effects": []
    }
  },
  "guiltyVariant": {
    "sceneOverrides": {
      "hub_visit_1": {
        "narrative": "Grix sweats and stammers.",
        "effects": []
      }
    }
  },
  "innocentVariant": {
    "sceneOverrides": {
      "hub_visit_1": {
        "narrative": "Grix waves cheerfully.",
        "effects": []
      }
    }
  }
}
```

---

## clues

Clues are evidence pointing to suspects and locations. Divided into core and bonus clues.

```json
{
  "core": [...],
  "bonus": [...]
}
```

Each clue:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (e.g., "K1", "B1") |
| `text` | string | Yes | The clue's content (e.g., "Footprints lead east") |
| `pointsTo` | object | No | Suspect and location this clue suggests |
| `isRedHerring` | boolean | No | If true, this clue is a false lead (default: false) |

### pointsTo

Links a clue to a suspect and location.

| Field | Type |
|-------|------|
| `suspect` | string (NPC ID) |
| `location` | string (room ID or zone) |

Example:

```json
{
  "core": [
    {
      "id": "K1",
      "text": "Footprints lead east",
      "pointsTo": {
        "suspect": "goblin",
        "location": "dungeon_a"
      }
    },
    {
      "id": "K2",
      "text": "Green scales on the floor",
      "pointsTo": {
        "suspect": "goblin",
        "location": "dungeon_a"
      }
    }
  ],
  "bonus": [
    {
      "id": "B1",
      "text": "The goblin was seen near the mine",
      "pointsTo": {
        "suspect": "goblin",
        "location": "dungeon_a"
      }
    }
  ]
}
```

---

## items

Physical objects that players can collect and use.

Each item:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `name` | string | Yes | Display name |
| `description` | string | No | Detailed description |
| `tags` | array | No | Categories (e.g., ["light", "fire"]) |
| `useEffects` | array | No | Effects triggered when used |

Example:

```json
[
  {
    "id": "torch",
    "name": "Torch",
    "description": "A lit torch",
    "tags": ["light", "fire"],
    "useEffects": [
      {
        "type": "condition",
        "condition": "frozen",
        "action": "remove",
        "target": "self"
      }
    ]
  },
  {
    "id": "key",
    "name": "Old Key",
    "description": "A rusty key",
    "tags": ["unlock"],
    "useEffects": []
  }
]
```

---

## conditions

Status effects that modify player stats or gameplay.

Each condition:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `name` | string | Yes | Display name |
| `statModifier` | object | No | How this condition affects stats |
| `curedBy` | array | No | How to remove the condition |

### statModifier

| Field | Type |
|-------|------|
| `stat` | string (stat ID) |
| `delta` | integer (amount to reduce stat by) |

Example:

```json
[
  {
    "id": "frozen",
    "name": "Frozen",
    "statModifier": {
      "stat": "str",
      "delta": -1
    },
    "curedBy": ["rest", "item:torch"]
  },
  {
    "id": "blinded",
    "name": "Blinded",
    "statModifier": {
      "stat": "per",
      "delta": -1
    },
    "curedBy": ["rest"]
  }
]
```

---

## complications

Random obstacles that disrupt player plans. Add challenge and urgency.

Each complication:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Unique numeric ID |
| `name` | string | Yes | Display name |
| `size` | string | Yes | "small" (minor obstacle) or "large" (major crisis) |
| `narrative` | string | Yes | Description of what happens |
| `effects` | array | No | Effects triggered by this complication |

Example:

```json
[
  {
    "id": 1,
    "name": "Loose rocks",
    "size": "small",
    "narrative": "Rocks tumble from above!",
    "effects": [
      {
        "type": "track",
        "track": "noise",
        "delta": 1
      }
    ]
  },
  {
    "id": 3,
    "name": "Cave-in",
    "size": "large",
    "narrative": "The passage collapses!",
    "effects": [
      {
        "type": "track",
        "track": "noise",
        "delta": 2
      },
      {
        "type": "track",
        "track": "weather",
        "delta": -1
      }
    ]
  }
]
```

---

## epilogues

Ending sequences keyed by unique IDs. Display the conclusion and culprit reveal.

Each epilogue:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `type` | string | No | "win" (correct solution) or "loss" (failed) |
| `culprit` | string | No | NPC ID of the guilty party |
| `hideout` | string | No | Room ID or zone where culprit hid |
| `narrative` | string | Yes | The ending text |
| `gagPayoffs` | array | No | Humorous payoffs for specific player "gags" |

### gagPayoffs

Array of payoffs linked to player-performed gags.

| Field | Type |
|-------|------|
| `gag` | string (gag ID) |
| `text` | string (payoff narrative) |

Example:

```json
{
  "win_goblin_a": {
    "id": "win_goblin_a",
    "type": "win",
    "culprit": "goblin",
    "hideout": "dungeon_a",
    "narrative": "You found Grix hiding in the mine! The treasure is returned."
  },
  "loss": {
    "id": "loss",
    "type": "loss",
    "narrative": "The mystery remains unsolved. Perhaps next time..."
  }
}
```

---

## secrets

The mystery's solution logic. Defines valid culprit-hideout combinations and how clues are distributed.

| Field | Type | Required |
|-------|------|----------|
| `combinations` | array | Yes |

Each combination:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `culprit` | string | Yes | NPC ID of the guilty party |
| `hideout` | string | Yes | Room ID or zone where they're hiding |
| `clueAssignments` | object | Yes | Maps room IDs to clue IDs placed there |
| `roomOverrides` | object | No | Modify room narratives based on this solution |
| `epilogue` | string | No | Epilogue ID to display if this solution is correct |

### clueAssignments

Object mapping room IDs to specific clue IDs. Determines which clues appear where.

```json
{
  "mine_entrance": "K1",
  "mine_deep": "K2",
  "tower_base": "K6",
  "tower_top": "B1"
}
```

### roomOverrides

Modify room narratives when this secret is active. Allows environmental hints that subtly point to the solution.

| Field | Type | Description |
|-------|------|-------------|
| `narrativeAppend` | string | Text appended to the room's narrative |
| `narrativeReplace` | string | Text that replaces the room's narrative |

Example:

```json
{
  "combinations": [
    {
      "culprit": "goblin",
      "hideout": "dungeon_a",
      "clueAssignments": {
        "mine_entrance": "K1",
        "mine_deep": "K2",
        "tower_base": "K6",
        "tower_top": "B1"
      },
      "roomOverrides": {
        "mine_deep": {
          "narrativeAppend": " You notice green scales on the floor."
        }
      },
      "epilogue": "win_goblin_a"
    },
    {
      "culprit": "raven",
      "hideout": "dungeon_b",
      "clueAssignments": {
        "mine_entrance": "K5",
        "mine_deep": "K1",
        "tower_base": "K3",
        "tower_top": "B2"
      },
      "roomOverrides": {
        "tower_top": {
          "narrativeAppend": " Black feathers litter the floor."
        }
      },
      "epilogue": "win_raven_b"
    }
  ]
}
```

---

## Complete Minimal Adventure

A bare-bones adventure with only required sections:

```json
{
  "meta": {
    "title": "Minimal Mystery",
    "version": "1.0"
  },
  "config": {
    "startRoom": "start"
  },
  "rooms": {
    "start": {
      "id": "start",
      "name": "Starting Room",
      "narrative": "You are here."
    }
  }
}
```

---

## Tips for Adventure Design

1. **Balance clues:** Include 2-3 core clues per suspect-location combo. Bonus clues reward exploration.

2. **Track usage:** Use tracks to create time pressure, noise limits, or other environmental factors.

3. **Room variety:** Mix rooms with no choices (narrative passages) and those with multiple options.

4. **Stat gates:** Use `requires` on exits and choices to make player stats matter.

5. **Item synergy:** Design items that solve specific conditions or unlock special choices.

6. **NPC variants:** Use `guiltyVariant` and `innocentVariant` to give NPCs subtle tells based on the solution.

7. **Red herrings:** Include clues that point to innocent suspects to create uncertainty.

8. **Complications:** Trigger small complications regularly to keep tension high; reserve large ones for key moments.

9. **Epilogues:** Create multiple epilogues (one per solution combo) to reward the players' deductions.

10. **Test your secrets:** Ensure each solution combo has enough clues and that clue placement makes sense logically.
