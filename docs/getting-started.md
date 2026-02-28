# Getting Started with DUNGEONS

Welcome! This guide will help you set up DUNGEONS on your computer so you and your kids can explore mysteries together. Don't worry—you don't need to be a programmer. If you can open a terminal and type a few commands, you're ready to go.

## What You Need

Before you start, make sure you have:

- **Bun runtime** — A modern JavaScript runtime that makes DUNGEONS run fast. You can install it with a single command (see below).
- **A computer to run the server** — Mac, Linux, or Windows with WSL (Windows Subsystem for Linux). Any computer will work; it doesn't need to be powerful.
- **Terminal windows for players** — Each player needs their own terminal window. This can be multiple windows on the same computer, or different computers on the same local network (like your home WiFi).

That's it! No special software, accounts, or internet connection required.

## Install Bun

Bun is a fast JavaScript runtime that runs DUNGEONS. Installation is quick and easy.

Open a terminal and run this command:

```bash
curl -fsSL https://bun.sh/install | bash
```

This will download and install Bun. The installer will guide you through the process.

When it's done, verify the installation by typing:

```bash
bun --version
```

If you see a version number, you're all set!

## Download DUNGEONS

Get the DUNGEONS files on your computer. If you have them already, great! Otherwise, follow the instructions in the project README to clone or download the repository.

Once you have the files, open a terminal and navigate to the DUNGEONS directory:

```bash
cd /path/to/dungeons
```

(Replace `/path/to/dungeons` with wherever you saved the files.)

## Starting the Server

The server is the heart of DUNGEONS. It manages the story, keeps track of all players, and runs on your host computer.

In a terminal, from the DUNGEONS directory, type:

```bash
bun server/index.js
```

The server will start and you should see output like this:

```
Loaded 1 adventure(s)
DUNGEONS server listening on port 3000
```

This means the server is ready and waiting for players to connect. Leave this terminal open—if you close it, the server stops.

### What if you want to change the port?

By default, the server runs on port 3000. If that port is already in use, you can change it with the PORT environment variable:

```bash
PORT=5000 bun server/index.js
```

The server will then listen on port 5000 instead. Make sure you tell your players to connect to the same port.

### Other options

You can also customize where the database and adventures are stored:

- `DB_PATH` — Location of the game database (default: `dungeons.db` in the current directory)
- `ADVENTURES_DIR` — Folder containing adventure files (default: `./adventures`)

Example:

```bash
PORT=3000 DB_PATH=./data/dungeons.db ADVENTURES_DIR=./my-adventures bun server/index.js
```

## Connecting Players

Once the server is running, each player opens their own terminal window and connects. This can be on the same computer or on different computers on the same network.

### On the same computer

Each player opens a new terminal window and runs:

```bash
bun client/index.js
```

This connects to the server on `localhost:3000` (the local computer).

### On different computers (over your local network)

First, find the server computer's IP address.

**On Mac or Linux:**

Open a terminal on the server computer and run:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Look for an address that starts with `192.168.` or `10.0.` — that's your local network IP.

**On Windows:**

Open Command Prompt and run:

```bash
ipconfig
```

Look for the "IPv4 Address" that starts with `192.168.` or `10.0.`

Once you have the IP address, each player runs:

```bash
bun client/index.js <server-ip>:3000
```

For example, if the server computer's IP is `192.168.1.50`:

```bash
bun client/index.js 192.168.1.50:3000
```

## First Game Walkthrough

Now that your players are connected, here's what happens:

### Step 1: Create or Load a Player

When a player connects, they see a prompt asking if they want to create a new player or load an existing one. New players choose a cool name and jump in. Players who've played before can log back in with their existing name.

### Step 2: Pick an Adventure

Players see a list of available adventures. The adventures are stories—mysteries to solve, characters to meet, clues to find. Start with **The Haunted Manor Mystery**, a classic ghost-hunting tale designed for 1-4 players.

### Step 3: Create or Join a Session

One player creates a new game session and becomes the **Host**. Other players see that session and join it. Once everyone has joined, the Host confirms that all players are ready and starts the game.

### Step 4: Pick a Role

Each player chooses a role that matches their style:

- **Explorer** — Move around and find new places
- **Thinker** — Figure out puzzles and clues
- **Helper** — Support the team and look after everyone
- **Sneaker** — Find hidden things and move quietly

Roles don't lock you into one action. They're just a way to give each player a special flavor. You can still do anything anyone else can do.

### Step 5: Explore and Solve

The mystery begins! Players work together to:

- Explore rooms and find items
- Talk to characters (NPCs) to learn secrets
- Gather clues and piece together the truth
- Make choices that shape the story
- Solve puzzles and overcome challenges

Each player sees the same room and story, but can make independent choices. It's collaborative—you win or lose together.

### Step 6: The Finale

At the end, players gather all their clues and solve the mystery. You'll be asked to identify the culprit and where they're hiding. Answer correctly and you win!

## Tips for Parents and Hosts

### Start small

Begin with "The Haunted Manor Mystery." It's short, engaging, and perfect for kids aged 6-12. Finish in one sitting or split it across multiple sessions.

### Let kids take their time

There's no time limit. If kids want to explore every room and talk to every character, that's great! DUNGEONS is about story and discovery, not rushing.

### Play together

You can play as a player alongside your kids, or play as the Host who starts the game. Either way, it's more fun together.

### Save and resume

The game auto-saves after each action. If you need to stop, just close the terminals. Next time, players can log back in and continue where they left off.

### Multiple sessions

You can have multiple game sessions running at the same time. One group playing The Haunted Manor Mystery while another group plays a different adventure. Just have different players join different sessions.

### No internet required

Once you've installed Bun and downloaded DUNGEONS, you don't need an internet connection to play. Everything runs on your local network (or single computer).

### Age-appropriate content

All adventures included with DUNGEONS are designed for children aged 6-12. They focus on mystery, problem-solving, teamwork, and courage. No violence, gore, or scary content.

## Troubleshooting

### "Connection refused"

The server isn't running. Make sure you started `bun server/index.js` in a terminal and that it says "listening on port 3000" (or whatever port you configured).

### "Cannot connect to host"

Make sure the IP address is correct. Run `ifconfig` (Mac/Linux) or `ipconfig` (Windows) to double-check. Also make sure all computers are on the same WiFi network.

### Port is already in use

Another program is using port 3000. Try a different port using the PORT environment variable:

```bash
PORT=5001 bun server/index.js
```

### Player can't see the game

Make sure the player's terminal is large enough (at least 60 characters wide and 20 lines tall). Resize the terminal window if needed.

### Games keep getting disconnected

Check your WiFi connection. If players are far from the router, move closer. Also check that your firewall isn't blocking connections to the port.

## Next Steps

Once your players have finished their first adventure, you can:

- Play other adventures
- Create your own adventure (see the **Authoring Guide** in the docs folder)
- Invite more players to join a group game
- Challenge your kids to beat different adventures

## Need Help?

If something doesn't work as expected, check:

1. The server terminal for error messages
2. That Bun is installed correctly (`bun --version`)
3. That all computers are on the same network
4. That the correct IP address is being used
5. That the port isn't blocked by a firewall

Good luck, and enjoy your adventures in DUNGEONS!
