# DUNGEONS

A story-driven multiplayer dungeon system for children aged 6-12, where small groups of players connect from their own terminals to explore mysteries together.

## What is DUNGEONS?

DUNGEONS is a cooperative storytelling game system. Unlike traditional video games, DUNGEONS is text-based and runs in a terminal. A parent, teacher, or storyteller hosts a dungeon on their computer, and players connect with their own devices to form a party. Together, they navigate through a story, solve puzzles, collect clues, and uncover mysteries.

Each adventure is a complete story with multiple rooms to explore, characters to meet, items to find, and choices to make. The system supports 1 to 4+ players in a single session—from a child playing solo to a full classroom adventure.

## Quick Start

DUNGEONS requires the Bun runtime. If you don't have it installed, visit https://bun.sh.

### Start the Server

From the DUNGEONS directory:

```bash
bun server/index.js
```

The server will start on port 3000 and wait for players to connect.

### Connect a Client

From another terminal (or another computer on the same network), run:

```bash
bun client/index.js
```

Follow the prompts to create a new player or load an existing one, then select an adventure to begin.

## Server Configuration

The server respects these environment variables:

- `PORT` (default: 3000) — The port the server listens on.
- `DB_PATH` (default: dungeons.db) — Path to the SQLite database file.
- `ADVENTURES_DIR` (default: ./adventures) — Directory containing adventure JSON files.

Example:

```bash
PORT=5000 DB_PATH=/var/lib/dungeons.db bun server/index.js
```

## Included Adventures

The following adventures are included with DUNGEONS:

- **The Haunted Manor Mystery** — A classic ghost-hunting mystery set in an abandoned mansion. Perfect for 1-4 players. Explores themes of problem-solving, teamwork, and courage.

## Documentation

Explore the full documentation in the `docs/` folder:

- **docs/getting-started.md** — Setup guide for parents and hosts. Learn how to prepare the server, configure networking, and invite players.
- **docs/how-to-play.md** — Player guide written in kid-friendly language. Explains how to move around, interact with objects, and collaborate with teammates.
- **docs/authoring-guide.md** — Complete guide for creating your own adventures. Covers design principles, story structure, and testing.
- **docs/story-format.md** — Technical reference for the adventure JSON format. Details all supported fields, data types, and examples.
- **docs/mcp-tools.md** — Reference for the MCP server and its AI-assisted authoring tools. Learn how to use Claude or other AI tools to help write adventures.

## Creating Adventures

Creating a new adventure is straightforward. You can write the adventure JSON by hand, or use the included MCP tools to work with Claude or other AI assistants. The adventure file defines rooms, characters, items, clues, and the choices that shape the story.

Hand-written adventures give you complete control. AI-assisted authoring with the MCP tools lets you quickly prototype ideas and generate narrative content. Either way, the result is a portable JSON file that any DUNGEONS instance can run.

See docs/authoring-guide.md to get started, or docs/mcp-tools.md for AI-assisted workflows.

## Tech Stack

DUNGEONS is built with:

- **Bun** — A fast, modern JavaScript runtime. No Node.js required.
- **Minimal dependencies** — The server and client use only built-in Bun APIs. The MCP server uses [tiny-mcp-server](https://github.com/fredrikpaulin/tiny-mcp-server) as its sole dependency.
- **WebSocket** — Real-time bidirectional communication between server and clients.
- **SQLite** — Lightweight, serverless database for player and session persistence.
- **Raw ANSI TUI** — A text-based interface that works in any terminal, with no external UI libraries.

## License

See LICENSE file in the repository.
