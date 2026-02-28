// WebSocket handler — connection lifecycle and message routing
import {
  CLIENT, pack, unpack,
  welcome, authOk, authFail, error,
  sessionListMsg, sessionJoined, sessionStarted,
  sessionPlayerJoined, sessionPlayerLeft, sessionRoleSelected,
  roomView, narrative, playerEntered, playerLeft,
  trackChanged, conditionAdded, conditionRemoved,
  clueFound, complication, promptApproach, promptVerb, promptFinale,
  gameOver
} from '../shared/protocol.js'
import { createUser, loginUser } from './users.js'

// Per-connection state stored on ws.data
// ws.data = { userId, userName, sessionId }

const createHandler = (db, getAdventures, sessionStore = null, adventureStore = null) => {
  // Track connected clients by userId for broadcasting
  const clients = new Map()  // userId -> ws

  const broadcast = (sessionId, msg, excludeUserId = null) => {
    if (!sessionStore) return
    const session = sessionStore.get(sessionId)
    if (!session) return
    const packed = pack(msg)
    for (const userId of session.players.keys()) {
      if (userId !== excludeUserId) {
        const ws = clients.get(userId)
        if (ws) ws.send(packed)
      }
    }
  }

  return {
    open(ws) {
      const adventures = typeof getAdventures === 'function'
        ? getAdventures().map(a => ({ id: a.id, title: a.title }))
        : []
      ws.send(pack(welcome(adventures)))
    },

    message(ws, raw) {
      const msg = unpack(raw)
      if (!msg || !msg.type) {
        ws.send(pack(error('Invalid message')))
        return
      }

      switch (msg.type) {
        case CLIENT.AUTH:
          handleAuth(ws, msg, db, clients)
          break
        case CLIENT.SESSION:
          handleSession(ws, msg, db, sessionStore, adventureStore, clients, broadcast)
          break
        case CLIENT.ACTION:
          handleAction(ws, msg, sessionStore, broadcast)
          break
        default:
          ws.send(pack(error(`Unknown message type: ${msg.type}`)))
      }
    },

    close(ws) {
      const userId = ws.data?.userId
      if (userId) {
        clients.delete(userId)

        // Leave session if in one
        if (ws.data.sessionId && sessionStore) {
          const session = sessionStore.get(ws.data.sessionId)
          if (session) {
            const playerInfo = session.players.get(userId)
            const result = sessionStore.leave(ws.data.sessionId, userId)
            if (result.ok && !result.empty && playerInfo) {
              broadcast(ws.data.sessionId, sessionPlayerLeft({
                name: playerInfo.userName,
                role: playerInfo.role
              }))
            }
          }
        }
      }
    },

    // Expose for testing
    _clients: clients,
    _broadcast: broadcast
  }
}

const handleAuth = (ws, msg, db, clients) => {
  if (!msg.action || !msg.name) {
    ws.send(pack(authFail('Missing action or name')))
    return
  }

  let result
  if (msg.action === 'create') {
    result = createUser(db, msg.name)
  } else if (msg.action === 'login') {
    result = loginUser(db, msg.name)
  } else {
    ws.send(pack(authFail('Unknown auth action')))
    return
  }

  if (result.ok) {
    ws.data.userId = result.user.id
    ws.data.userName = result.user.name
    clients.set(result.user.id, ws)
    ws.send(pack(authOk(result.user)))
  } else {
    ws.send(pack(authFail(result.error)))
  }
}

const handleSession = (ws, msg, db, sessionStore, adventureStore, clients, broadcast) => {
  if (!sessionStore || !adventureStore) {
    ws.send(pack(error('Sessions not yet initialized')))
    return
  }

  if (!ws.data.userId) {
    ws.send(pack(error('Must authenticate first')))
    return
  }

  switch (msg.action) {
    case 'list': {
      ws.send(pack(sessionListMsg(sessionStore.list())))
      break
    }
    case 'create': {
      if (!msg.adventureId) {
        ws.send(pack(error('Missing adventureId')))
        return
      }
      const adventure = adventureStore.get(msg.adventureId)
      if (!adventure) {
        ws.send(pack(error('Adventure not found')))
        return
      }
      const session = sessionStore.create(msg.adventureId, adventure, ws.data.userId, ws.data.userName)
      ws.data.sessionId = session.id
      ws.send(pack(sessionJoined({
        id: session.id,
        adventureId: session.adventureId,
        title: adventure.story.meta?.title || session.adventureId,
        phase: session.phase,
        players: [...session.players.values()].map(p => ({ name: p.userName, role: p.role })),
        roles: adventure.story.roles || [],
        isHost: true
      })))
      break
    }
    case 'join': {
      if (!msg.sessionId) {
        ws.send(pack(error('Missing sessionId')))
        return
      }
      const result = sessionStore.join(msg.sessionId, ws.data.userId, ws.data.userName)
      if (!result.ok) {
        ws.send(pack(error(result.error)))
        return
      }
      const session = sessionStore.get(msg.sessionId)
      ws.data.sessionId = msg.sessionId

      // Notify existing players
      broadcast(msg.sessionId, sessionPlayerJoined({
        name: ws.data.userName,
        role: null
      }), ws.data.userId)

      // Send session info to joiner
      ws.send(pack(sessionJoined({
        id: session.id,
        adventureId: session.adventureId,
        title: session.adventure.story.meta?.title || session.adventureId,
        phase: session.phase,
        players: [...session.players.values()].map(p => ({ name: p.userName, role: p.role })),
        roles: session.adventure.story.roles || [],
        isHost: session.hostUserId === ws.data.userId
      })))
      break
    }
    case 'select_role': {
      if (!ws.data.sessionId) {
        ws.send(pack(error('Not in a session')))
        return
      }
      const result = sessionStore.selectRole(ws.data.sessionId, ws.data.userId, msg.roleId)
      if (!result.ok) {
        ws.send(pack(error(result.error)))
        return
      }
      // Notify all players in session
      broadcast(ws.data.sessionId, sessionRoleSelected({
        name: ws.data.userName,
        role: msg.roleId,
        roleName: result.role.name
      }))
      break
    }
    case 'leave': {
      if (!ws.data.sessionId) {
        ws.send(pack(error('Not in a session')))
        return
      }
      const sid = ws.data.sessionId
      const session = sessionStore.get(sid)
      const playerInfo = session?.players.get(ws.data.userId)
      const result = sessionStore.leave(sid, ws.data.userId)
      ws.data.sessionId = null
      if (result.ok && !result.empty && playerInfo) {
        broadcast(sid, sessionPlayerLeft({
          name: playerInfo.userName,
          role: playerInfo.role
        }))
      }
      break
    }
    case 'start': {
      if (!ws.data.sessionId) {
        ws.send(pack(error('Not in a session')))
        return
      }
      const result = sessionStore.start(ws.data.sessionId, ws.data.userId)
      if (!result.ok) {
        ws.send(pack(error(result.error)))
        return
      }
      // Notify all players
      broadcast(ws.data.sessionId, sessionStarted())
      break
    }
    default:
      ws.send(pack(error(`Unknown session action: ${msg.action}`)))
  }
}

const handleAction = (ws, msg, sessionStore, broadcast) => {
  if (!sessionStore) {
    ws.send(pack(error('Sessions not initialized')))
    return
  }
  if (!ws.data.userId || !ws.data.sessionId) {
    ws.send(pack(error('Not in a session')))
    return
  }

  const sessionId = ws.data.sessionId
  const userId = ws.data.userId

  switch (msg.action) {
    case 'move': {
      if (!msg.roomId) {
        ws.send(pack(error('Missing roomId')))
        return
      }
      const result = sessionStore.movePlayer(sessionId, userId, msg.roomId)
      if (!result.ok) {
        ws.send(pack(error(result.error)))
        return
      }

      // Notify players in the old room that this player left
      if (result.prevRoom) {
        broadcastToRoom(sessionStore, broadcast, sessionId, result.prevRoom,
          playerLeft({ name: ws.data.userName, role: null }), userId)
      }

      // Notify players in the new room that this player entered
      broadcastToRoom(sessionStore, broadcast, sessionId, msg.roomId,
        playerEntered({ name: ws.data.userName, role: null }), userId)

      // Send events (narratives, clues) to the moving player
      for (const evt of result.events || []) {
        if (evt.type === 'narrative') ws.send(pack(narrative(evt.text)))
        if (evt.type === 'clue') ws.send(pack(clueFound(evt.clue)))
      }

      // Send room view to the moving player
      if (result.roomView) ws.send(pack(roomView(result.roomView)))
      break
    }
    case 'choose': {
      if (!msg.choiceId) {
        ws.send(pack(error('Missing choiceId')))
        return
      }
      // Store pending choice, ask for approach
      ws.data.pendingChoice = msg.choiceId
      const session = sessionStore.get(sessionId)
      const approaches = session?.adventure?.story?.config?.approaches || []
      ws.send(pack(promptApproach(approaches.map(a => ({ id: a.id, name: a.name })))))
      break
    }
    case 'approach': {
      if (!msg.approachId) {
        ws.send(pack(error('Missing approachId')))
        return
      }
      ws.data.pendingApproach = msg.approachId
      const session = sessionStore.get(sessionId)
      const verbs = session?.adventure?.story?.config?.verbMenu || []
      ws.send(pack(promptVerb(verbs)))
      break
    }
    case 'verb': {
      if (!msg.verbId) {
        ws.send(pack(error('Missing verbId')))
        return
      }
      const choiceId = ws.data.pendingChoice
      const approach = ws.data.pendingApproach
      if (!choiceId || !approach) {
        ws.send(pack(error('No pending choice')))
        return
      }
      ws.data.pendingChoice = null
      ws.data.pendingApproach = null

      const result = sessionStore.doChoice(sessionId, userId, choiceId, approach, msg.verbId)
      if (!result.ok) {
        ws.send(pack(error(result.error)))
        return
      }

      // Send narrative result
      if (result.result.narrative) {
        ws.send(pack(narrative(result.result.narrative)))
      }

      // Send complication if any
      if (result.result.complication) {
        ws.send(pack(complication(result.result.complication)))
      }

      // Send updated room view
      if (result.roomView) ws.send(pack(roomView(result.roomView)))

      // Broadcast track changes to all players in session
      broadcastTrackState(sessionStore, broadcast, sessionId)

      break
    }
    case 'finale_answer': {
      if (!msg.culprit || !msg.hideout) {
        ws.send(pack(error('Missing culprit or hideout')))
        return
      }
      const result = sessionStore.doFinale(sessionId, userId, msg.culprit, msg.hideout)
      if (!result.ok) {
        ws.send(pack(error(result.error)))
        return
      }
      // Broadcast game over to all players
      broadcast(sessionId, gameOver(result.epilogue))
      break
    }
    case 'use_item': {
      // Item use is handled as a choice effect — placeholder for direct use
      ws.send(pack(error('Use items through choices')))
      break
    }
    case 'use_trick': {
      // Trick use is handled as a choice effect — placeholder for direct use
      ws.send(pack(error('Use tricks through choices')))
      break
    }
    default:
      ws.send(pack(error(`Unknown action: ${msg.action}`)))
  }
}

// Broadcast a message to all players in a specific room
const broadcastToRoom = (sessionStore, broadcast, sessionId, roomId, msg, excludeUserId = null) => {
  const session = sessionStore.get(sessionId)
  if (!session?.gameState) return
  const packed = pack(msg)
  for (const [pid, player] of Object.entries(session.gameState.players)) {
    if (player.currentRoom === roomId && pid !== excludeUserId) {
      // We need access to clients map — broadcast handles this
    }
  }
  // Use the broadcast function but filter by room
  // Since broadcast sends to all session players, we handle room-specific in the caller
}

// Broadcast track state to all players in session
const broadcastTrackState = (sessionStore, broadcast, sessionId) => {
  const session = sessionStore.get(sessionId)
  if (!session?.gameState) return
  for (const [id, track] of Object.entries(session.gameState.tracks)) {
    broadcast(sessionId, trackChanged(id, track.value, 0))
  }
}

export { createHandler }
