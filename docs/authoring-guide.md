# Authoring Guide for DUNGEONS Adventures

Welcome to the DUNGEONS authoring guide! Whether you're a seasoned storyteller or just want to create a quick mystery for your kids, this guide will help you design, write, and test your own adventures.

## Overview

An adventure in DUNGEONS is a mystery game where players:

- Explore a world made up of interconnected rooms
- Talk to characters (NPCs) to uncover secrets
- Gather clues that point to suspects and hiding locations
- Piece together the truth and identify the culprit and their hideout
- Win by solving the mystery, or lose if time runs out

Each adventure is stored as a single JSON file in the `adventures/` directory. When the server starts, it automatically loads all valid JSON adventure files, making them available for players to choose from.

Adventures are designed for kids aged 6-12 and typically take 30-90 minutes to complete, depending on how thoroughly players explore.

## Planning Your Adventure

Before you write a single line of JSON, take time to plan your story. A good adventure starts with a solid mystery.

### The Core Mystery

Start by answering three questions:

1. **Who did it?** Choose 2-3 suspect characters. Give each a unique personality, appearance, and motive. A grumpy caretaker, a sneaky magician, a forgetful inventor — anything works as long as each suspect feels distinct.

2. **Where did they hide it?** Plan at least 3 hiding locations (these become rooms players can explore). A spooky attic, a hidden cave, a secret laboratory, a locked tower room — places that kids will find exciting to discover.

3. **Why did they do it?** Give the culprit a believable (or funny) reason. They wanted revenge, sought an adventure, were looking for treasure, or just thought it would be a fun prank.

### Design Your Suspects and Motivations

Create 2-3 NPC suspects with distinct personalities. For example:

- **The Gardener** — quiet, nervous, loves plants. Maybe they wanted the stolen item to protect a secret garden.
- **The Chef** — loud, cheerful, always cooking. Maybe they took it by accident while looking for something else.
- **The Clockmaker** — mysterious, brilliant, obsessed with puzzles. Maybe they needed it to build an invention.

Write a short description for each. Kids will interact with these characters, so make them memorable and fun.

### Plan Your Locations

Design 3-5 locations (rooms) that players will explore. One should be a "hub" — a safe, central area where NPCs hang out. The others should be dungeons or areas branching off from the hub.

For example, in a manor mystery:
- **Hub:** The main hall with NPCs, safe place to gather information
- **Dungeon A:** The dusty attic
- **Dungeon B:** The creaky cellar
- **Dungeon C:** The secret library

Each location should have 2-3 rooms. Players move through them to find clues and items.

### Write Your Clues

Clues are the heart of your mystery. Plan 5-8 clues that point to suspects and locations:

- **Clue 1:** A torn piece of fabric that matches the Gardener's apron
- **Clue 2:** Muddy footprints leading to the attic
- **Clue 3:** A note saying "Meet me in the cellar at midnight"
- **Clue 4:** A toolbox with the Clockmaker's initials
- **Clue 5:** The Chef's confession (if asked the right questions)

Clues can be:
- **Core clues** — essential to solving the mystery. Players must find these.
- **Bonus clues** — helpful hints that make solving easier, but aren't required.

Each clue should clearly point to either a suspect or a location (or both).

### Plan for Replayability

Design multiple "solution combinations" so players can replay the adventure with different outcomes:

- **Solution 1:** The Gardener hid it in the Attic
- **Solution 2:** The Clockmaker hid it in the Secret Library
- **Solution 3:** The Chef hid it in the Cellar (by accident)

Each solution should have different clues. When a player solves the mystery, they see an ending based on which combination they chose. This encourages replayability.

### Choose Your Setting

Pick a setting that excites kids:

- A spooky haunted manor
- A magical enchanted forest
- A futuristic space station
- A bustling village marketplace
- A pirate ship
- A mysterious library
- An underground kingdom

The setting should match your story and influence room descriptions, NPC personalities, and available items.

### Use a Universe (Optional)

If you're creating multiple adventures that share a world — same setting, same tone, same style of characters — you can define a **universe**. A universe is a markdown file in the `universes/` directory that describes the creative guidelines for your world.

For example, `universes/haunted-manor.md` defines the tone, humor style, character templates, and content boundaries for all adventures set in the Haunted Manor world. When you link an adventure to a universe (via `meta.universe`), the AI writing and editing tools automatically load these guidelines as context, ensuring consistency across adventures.

To create a universe, use the `create_universe` MCP tool or write a markdown file directly. See the included `universes/haunted-manor.md` for an example of what a universe file looks like.

To link an adventure to a universe, add the `universe` field to the adventure's `meta` section:

```json
{
  "meta": {
    "title": "The Haunted Manor Mystery",
    "universe": "haunted-manor"
  }
}
```

The universe name should match the filename (without `.md`) in the `universes/` directory.

## Adventure Structure

A DUNGEONS adventure is a JSON file with these main sections:

### `meta`

Basic information about your adventure:

```json
"meta": {
  "title": "Your Adventure Title",
  "author": "Your Name",
  "version": "0.1.0",
  "language": "en",
  "playerCount": {
    "min": 1,
    "max": 6
  },
  "description": "A brief, enticing description of the mystery for players.",
  "universe": "haunted-manor"
}
```

Keep the description to 2-3 sentences. Make it mysterious and exciting. The `universe` field is optional — set it to the name of a universe file (without `.md`) in the `universes/` directory to link this adventure to a shared creative universe.

### `config`

Game configuration including difficulty tracks, player stats, approaches, and starting settings:

- **tracks** — Time pressure, corruption, fear, etc. Tracks can count up or down and trigger effects when they reach a limit. Most adventures use a "Time" track to add urgency.
- **tokens** — Shared resources like courage or luck. When a player uses a token, the whole group's pool decreases.
- **stats** — Character abilities like Strength, Perception, Charm, Cunning. Players use these when making choices.
- **approaches** — How players tackle challenges: Brave (costs courage), Careful (safe), Wild (gains courage but triggers complications).
- **startRoom** — Which room players begin in (usually "hub").
- **verbMenu** — Actions players can perform: LOOK, TALK, USE, TAKE, PUSH, etc.
- **lobby** — Settings for player selection and game start.

Don't worry about all these details right now. Start simple and expand as you build.

### `roles`

Player roles with special abilities. For example:

- **Explorer** — Good at finding secret areas
- **Thinker** — Good at solving puzzles
- **Helper** — Good at persuading NPCs
- **Sneaker** — Good at finding hidden items

Each role has "tricks" — special actions they can use. You don't need many; 1-2 tricks per role is enough.

### `rooms`

The map. Each room has:

- **id** — Unique identifier (e.g., "hub", "attic_1", "cellar")
- **name** — Display name ("The Main Hall", "Dusty Attic")
- **narrative** — Description players read when entering (1-3 sentences)
- **zone** — Which area it belongs to ("hub", "dungeon_a", "dungeon_b")
- **exits** — Doors to other rooms, each with a label ("north", "down", "back")
- **choices** — Things players can do in the room (examine, take items, talk to NPCs)
- **items** — Objects that can be found or used here
- **npcs** — Characters present in this room
- **onEnter** — Effects triggered when entering (time costs, narrative text)

### `npcs`

Characters in your adventure. Each NPC has:

- **id** — Unique identifier
- **name** — Display name
- **role** — What they do (suspect, helper, red herring)
- **scenes** — What they say when players talk to them (numbered visit scenes)
- **reactions** — How they respond when accused or cleared
- **guiltyVariant** and **innocentVariant** — Different descriptions based on the secret

### `clues`

Evidence that points to suspects and locations. Each clue has:

- **id** — Unique identifier
- **text** — The clue description (what players learn)
- **pointsTo** — What it hints at: `{ "suspect": "npc_id" }` and/or `{ "location": "room_id" }`
- Clues are grouped into `core` (essential) and `bonus` (extra) arrays

### `items`

Collectible objects:

- **id** — Unique identifier
- **name** — Display name
- **description** — What it looks like
- **use** — What happens when used (optional)

### `conditions`

Status effects like "spooked", "frozen", "lost". Each has:

- **id** — Unique identifier
- **name** — Display name
- **description** — What it means

### `complications`

Random events triggered by "wild" approaches. Each complication:

- **id** — Unique identifier
- **narrative** — What happens (1-2 sentences)
- **effects** — What changes (time costs, conditions, etc.)

### `secrets`

The solution combinations. Each secret maps a culprit and hideout to specific clue placements:

```json
"secrets": {
  "combinations": [
    {
      "culprit": "gardener",
      "hideout": "attic",
      "clueAssignments": {
        "cellar": "muddy_footprints",
        "attic": "torn_apron"
      },
      "epilogue": "win_gardener_attic"
    }
  ]
}
```

This tells the game: "If the culprit is the gardener and the hideout is the attic, place the muddy footprints clue in the cellar room and the torn apron clue in the attic room." The `clueAssignments` map room IDs to clue IDs.

### `epilogues`

Ending narratives for winning and losing:

```json
"epilogues": {
  "win": "You solved the mystery! The culprit was {culprit} and they hid the item in {hideout}. The End!",
  "lose": "Time ran out. You never found out who took it... Better luck next time!"
}
```

For the full field-by-field reference, see [docs/story-format.md](story-format.md).

## Room Design Tips

Rooms are where the story happens. Design them carefully.

### Hub vs. Dungeons

- **Hub** — A safe, central area. NPCs live here. Players can talk to suspects and gather basic information. Example: the manor's main hall.
- **Dungeons** — Branching areas off the hub. Darker, more mysterious. Players find clues and items here. Example: the attic, cellar, library.

### Room Layout

Each room should have:

- **A narrative** — What players see when they enter. Use all five senses. What does it smell like? Sound like? What's the mood?
- **2-3 choices** — Things players can do: examine objects, take items, talk to NPCs, solve puzzles.
- **At least one exit** — A way to leave (back to hub or to another room).

Keep narratives short. 1-3 sentences. Kids have short attention spans.

### Room Depth

You can use `onEnter` effects to make deeper rooms cost time or require conditions:

```json
"onEnter": [
  {
    "type": "track",
    "track": "time",
    "delta": -1
  }
]
```

This means: "Entering this room costs 1 time." It's good for rooms that should feel remote or dangerous.

### Creating Atmosphere

Use descriptive language that kids understand:

- Instead of: "The fetid miasma of centuries permeates this locale."
- Try: "It smells weird, like old socks and mystery."

Paint pictures without being scary:

- Instead of: "A corpse dangles from the rafters."
- Try: "Something's hanging from the ceiling. A coat? A flag? You can't quite tell."

### Room Connections

Map out how rooms connect before writing JSON. A simple diagram helps:

```
Hub
├── Attic
│   ├── Attic Bedroom
│   └── Attic Storage
├── Cellar
│   ├── Cellar Wine Room
│   └── Cellar Passage
└── Library
    ├── Main Library
    └── Secret Room
```

Each room should have a way back to the hub or to adjacent rooms. No dead ends (unless you want them).

## Writing for Kids

Your audience is 6-12 year olds. Write accordingly.

### Language and Tone

- Use simple vocabulary. Avoid complex words unless they fit the setting.
- Short sentences. Long paragraphs are boring.
- Active voice. "You find a key" not "A key is discovered."
- Humor. Kids love jokes and silly characters. Don't be afraid to be funny.
- Mysterious, not scary. Building suspense is good. Graphic violence or genuine horror is not.

### Character Voices

Give each NPC a distinct way of speaking:

- The Gardener speaks simply, in nature metaphors: "This mystery grows like a weed, tangled and confused."
- The Chef uses food metaphors: "This case is a recipe with missing ingredients."
- The Clockmaker speaks in riddles: "The hands of fate turn, but in which direction?"

### Clue Pacing

Don't dump all clues in one room. Spread them across the adventure so players feel like they're making progress. Early clues should be obvious. Later clues can be more cryptic.

### Choices That Matter

When players make choices, make it feel like the choice mattered. If they pick "Talk to the Gardener," have the Gardener respond specifically. Don't just repeat the same dialogue.

### Age-Appropriate Content

- No graphic violence, gore, or sexual content
- No real-world trauma (death of a loved one, abuse, serious illness)
- Avoid making fun of real groups of people
- Keep scares light and playful: "spooked" is good, "traumatized" is not

Mysteries work great for this age group because they focus on puzzle-solving and teamwork, not violence.

## Using MCP Tools

DUNGEONS includes an MCP server with AI-assisted authoring tools. You can use these with Claude or any MCP-compatible client.

### Setup

First, add the MCP server to your editor or client. Instructions vary depending on your setup, but generally:

1. Point your MCP client to the DUNGEONS server
2. The server will provide these tools:
   - `scaffold_adventure` — Create a new adventure template
   - `add_room` — Add a room to an existing adventure
   - `add_npc` — Add a character
   - `add_item` — Add an object
   - `add_clue` — Add a clue
   - `writer` — Generate narrative text using AI
   - `editor` — Review your adventure for quality and balance
   - `validate_adventure` — Check for schema errors
   - `inspect_adventure` — View stats and room graph

### Typical Workflow

1. **Scaffold** — Use `scaffold_adventure` to create a blank adventure file.
2. **Build** — Use `add_room`, `add_npc`, `add_item`, `add_clue` to add content.
3. **Write** — Use the `writer` tool to generate or improve narrative text.
4. **Review** — Use the `editor` tool to check for balance, clarity, and fun factor.
5. **Validate** — Use `validate_adventure` to catch any JSON errors.
6. **Test** — Play through your adventure and tweak as needed.

### Writer Tool

The `writer` tool generates narrative text. Give it a clear request:

```
"Write a creepy but not scary description of an attic. Include cobwebs, dust, and the smell of old wood. Keep it to 2 sentences."
```

The AI will generate something like:

```
"Dust motes dance in thin shafts of light from a single window. Cobwebs hang like curtains, and everything smells like old wood and forgotten memories."
```

You can refine the output and use it as-is or as a starting point.

### Editor Tool

The `editor` tool reviews your entire adventure and provides feedback:

- Are clues well-distributed across rooms?
- Do all rooms feel important or are some empty?
- Is the difficulty balanced?
- Are the NPCs distinct and interesting?
- Is the mystery solvable with the clues provided?

Use this feedback to improve your adventure before testing.

### Validate and Inspect

- `validate_adventure` checks that your JSON is valid and all references are correct. It will flag missing NPCs, invalid room IDs, etc.
- `inspect_adventure` gives you stats: total rooms, NPCs, clues, unsolved mysteries, disconnected rooms, etc.

Run these regularly while building. They catch mistakes early.

## Testing Your Adventure

Before you publish, test thoroughly.

### Validation Checks

1. Run `validate_adventure` to check for schema errors and invalid references.
2. Run `inspect_adventure` to see the room graph and clue coverage.
3. Look for:
   - Unreachable rooms (rooms with no exits)
   - Unassigned clues (clues not placed in any room)
   - Missing NPCs (referenced but not defined)
   - Broken exits (pointing to rooms that don't exist)

### Playtest

Play through the adventure yourself:

1. Start the server: `bun server/index.js`
2. Connect a client: `bun client/index.js`
3. Create a player and start the adventure
4. Explore every room, talk to every NPC, pick up every item
5. Test different solution paths (try to solve the mystery in different ways)

As you play:

- Does the story flow smoothly?
- Are descriptions clear?
- Do all choices work?
- Can you find enough clues to solve the mystery?
- Are there any typos or unclear passages?
- Does the difficulty feel right? Too easy? Too hard?

### Playtest Checklist

- [ ] Start a new game and create a player
- [ ] Explore the entire map (all rooms reachable)
- [ ] Talk to every NPC
- [ ] Collect items from every room
- [ ] Gather clues pointing to at least 2 solutions
- [ ] Try to solve the mystery with different suspect/location combinations
- [ ] Check the winning and losing epilogue messages
- [ ] Verify time pressure works (if applicable)
- [ ] Test role-specific tricks and abilities
- [ ] Check that all choices respond appropriately

### Common Issues

**Unsolvable mystery:** Players can't find enough clues to point to the correct answer. Add more clues or make existing ones more obvious.

**Boring rooms:** A room has no choices and no narrative interest. Add an NPC to talk to, an item to find, or a puzzle to solve.

**Unbalanced difficulty:** The mystery is too easy or too hard. Review clue placement. Make sure bonus clues exist for struggling players.

**Confusing exits:** Players get lost between rooms. Review your room layout and make sure exits have clear labels.

**Typos and grammar:** Read through all text carefully. Typos break immersion.

## Writing Effective Clues

Clues are your adventure's core mechanic. Write them carefully.

### Clue Characteristics

- **Clear** — Players understand what the clue means without needing explanation.
- **Specific** — "A torn piece of red fabric" is better than "evidence."
- **Actionable** — The clue should point somewhere. Either to a suspect ("This fabric matches the Gardener's jacket") or a location ("These muddy prints lead to the attic").
- **Discoverable** — Players must find clues through exploration, dialogue, or puzzle-solving. They shouldn't just appear.

### Examples of Good Clues

- **Physical clue:** A muddy footprint on the attic door that matches the Gardener's boots
- **Dialogue clue:** The Clockmaker accidentally mentions knowing about the hideout
- **Circumstantial clue:** The Chef is nervous and keeps checking a pocket watch
- **Combination clue:** Finding a note in the cellar written in the Clockmaker's handwriting

### Clue Placement Strategy

- **Early rooms:** Place obvious clues that point clearly to one suspect or location
- **Mid-adventure:** Place clues that are slightly harder to interpret
- **Late adventure:** Place twist clues that might contradict earlier evidence

This paces the mystery so players feel like they're making progress.

## Publishing Your Adventure

Once you've tested and refined your adventure:

1. Save your JSON file in the `adventures/` directory with a descriptive name (e.g., `my-forest-mystery.json`)
2. Restart the server: `bun server/index.js`
3. The server will load your adventure automatically
4. Players can now select it from the adventure list

That's it! Your adventure is live.

## Tips for Success

- **Start small.** Your first adventure doesn't need to be huge. 3-4 rooms with 2 suspects is a great start.
- **Test early.** Don't wait until you're "done" to playtest. Test as you build and fix issues along the way.
- **Make it personal.** Use settings and characters your kids love. A mystery set in a theme park or a bakery is more engaging than a generic dungeon.
- **Playtesting is everything.** The best way to improve is to watch kids play and see where they get stuck or confused.
- **Read other adventures.** Look at the example adventures included with DUNGEONS. See how they structure clues, design rooms, and pace the story.
- **Iterate.** Your first version won't be perfect. After playtest feedback, make changes and improve it.
- **Have fun.** Remember: you're creating a fun experience for kids. That's the goal. Perfection is secondary.

## Troubleshooting Common Problems

**"My adventure won't load"**

The JSON is invalid. Check:
- All quotes match (no extra or missing quotes)
- All braces match (every `{` has a corresponding `}`)
- All commas are correct (no comma after the last item in an object or array)

Run `validate_adventure` to find the exact error.

**"Players get stuck in one room"**

Check the `exits` array. Make sure each room has at least one exit back to the hub or to another room. Verify that exit room IDs actually exist.

**"Nobody can find the clues"**

Clues might be too hidden or too vague. Consider:
- Making clue descriptions more explicit
- Adding more clues pointing to the same suspect
- Placing bonus clues in obvious locations as hints

**"The mystery doesn't make sense"**

Review your clues and solution combinations. Make sure:
- Each solution has at least 3 clues pointing to it
- Clues for different solutions don't contradict each other
- All clues are actually placed in rooms (not orphaned in the data)

**"Dialogue choices don't work"**

Make sure NPC IDs in choice objects match actual NPCs. Verify that scene IDs exist in the NPC definition.

## Resources

- Example adventures: `adventures/` directory
- Story format reference: [docs/story-format.md](story-format.md)
- MCP tool reference: [docs/mcp-tools.md](mcp-tools.md)
- Player guide: [docs/how-to-play.md](how-to-play.md)

## Final Words

Creating a DUNGEONS adventure is creative work. You're writing a story, designing a puzzle, and building an experience. It takes time and iteration, but the result — watching kids get excited about your mystery, work together to solve it, and ask to play again — is incredibly rewarding.

You've got this. Have fun creating!
