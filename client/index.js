// Client entry point — connect to server, run TUI
import { connect } from './connection.js'
import { screen, cursor, theme, write } from './tui/ansi.js'
import { enableRaw, disableRaw, waitAnyKey } from './tui/input.js'
import { showConnect, showAuthResult } from './tui/screens/connect.js'
import { showSessionList, showCreateSession, showJoinSession, showRoleSelection, showLobbyWait } from './tui/screens/lobby.js'
import { showRoom } from './tui/screens/room.js'
import { showApproachSelect } from './tui/screens/approach.js'
import { showVerbSelect } from './tui/screens/verb.js'
import { showFinale } from './tui/screens/finale.js'
import { showEpilog } from './tui/screens/epilog.js'
import { showNarrative } from './tui/narrator.js'
import { createRenderer } from './renderer.js'
import {
  authCreate, authLogin, sessionStart,
  actionMove, actionChoose, actionApproach, actionVerb, actionFinaleAnswer
} from '../shared/protocol.js'

const host = process.argv[2] || 'localhost:3000'
const url = `ws://${host}/ws`

const cleanup = () => {
  disableRaw()
  write(cursor.show + screen.mainBuffer)
}

const main = async () => {
  write(screen.altBuffer + cursor.hide)
  enableRaw()

  process.on('exit', cleanup)
  process.on('SIGINT', () => { cleanup(); process.exit(0) })

  try {
    write(screen.clear)
    write(cursor.to(2, 1) + `${theme.title}DUNGEONS${theme.reset}`)
    write(cursor.to(2, 3) + `${theme.muted}Connecting to ${host}...${theme.reset}`)

    const conn = await connect(url)
    const renderer = createRenderer()

    // Auth flow
    const { action, name } = await showConnect(conn)

    const authMsg = action === 'create' ? authCreate(name) : authLogin(name)
    conn.send(authMsg)

    const authResult = await new Promise(resolve => {
      conn.on('auth_ok', resolve)
      conn.on('auth_fail', resolve)
    })

    showAuthResult(authResult)

    if (authResult.type !== 'auth_ok') {
      await new Promise(r => setTimeout(r, 2000))
      cleanup()
      process.exit(1)
    }

    // Store adventures from welcome
    const adventures = conn._welcomeAdventures || []

    // Session flow
    let sessionData = null
    while (!sessionData) {
      const listResult = await showSessionList(conn)

      if (listResult.action === 'create') {
        const result = await showCreateSession(conn, adventures)
        if (result.type === 'session_joined') sessionData = result.session
      } else if (listResult.action === 'join') {
        const result = await showJoinSession(conn, listResult.sessions || [])
        if (result && result.type === 'session_joined') sessionData = result.session
      }
    }

    // Role selection
    await showRoleSelection(conn, sessionData)

    // Lobby wait
    const lobby = showLobbyWait(conn, sessionData, sessionData.isHost)

    conn.on('session_player_joined', lobby.onPlayerJoined)
    conn.on('session_player_left', lobby.onPlayerLeft)
    conn.on('session_role_selected', lobby.onRoleSelected)

    if (sessionData.isHost) {
      await waitAnyKey()
      conn.send(sessionStart())
    }

    await new Promise(resolve => conn.on('session_started', resolve))

    // Request initial room by moving to hub (server will send room_view)
    conn.send(actionMove('hub'))

    // Game loop
    let running = true
    while (running) {
      // Wait for room_view
      const view = await new Promise(resolve => conn.on('room_view', resolve))

      // Handle any incoming narratives/events asynchronously
      conn.on('narrative', async (msg) => {
        await showNarrative(msg.text, 15)
      })

      // Show room and get player action
      const playerAction = await showRoom(conn, view)

      if (!playerAction) continue

      if (playerAction.action === 'move') {
        conn.send(actionMove(playerAction.roomId))
      } else if (playerAction.action === 'choose') {
        conn.send(actionChoose(playerAction.choiceId))

        // Wait for approach prompt
        const approachMsg = await new Promise(resolve => conn.on('prompt_approach', resolve))
        const approachId = await showApproachSelect(approachMsg.approaches)
        conn.send(actionApproach(approachId))

        // Wait for verb prompt
        const verbMsg = await new Promise(resolve => conn.on('prompt_verb', resolve))
        const verbId = await showVerbSelect(verbMsg.verbs)
        conn.send(actionVerb(verbId))

        // Wait for narrative result, then room_view comes in next loop
        const narr = await new Promise(resolve => conn.on('narrative', resolve))
        await showNarrative(narr.text, 15)
        await waitAnyKey(`${theme.muted}Press any key...${theme.reset}`)
      }

      // Check for game over
      conn.on('game_over', async (msg) => {
        running = false
        await showEpilog(msg.epilogue)
        cleanup()
        process.exit(0)
      })

      // Check for finale prompt
      conn.on('prompt_finale', async (msg) => {
        const { culprit, hideout } = await showFinale(msg.suspects, msg.hideouts)
        conn.send(actionFinaleAnswer(culprit, hideout))
      })
    }
  } catch (err) {
    cleanup()
    console.error('Connection failed:', err.message)
    process.exit(1)
  }
}

main()
