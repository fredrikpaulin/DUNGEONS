// Lobby screen — session list, create, join, role selection, waiting room
import { cursor, screen, theme, style, write } from '../ansi.js'
import { readLine, menuSelect, waitAnyKey } from '../input.js'
import {
  sessionList, sessionCreate, sessionJoin, sessionSelectRole, sessionStart
} from '../../../shared/protocol.js'

const showSessionList = async (conn) => {
  write(screen.clear)
  write(cursor.to(2, 1) + `${theme.title}${style.bold}DUNGEONS${theme.reset} — Sessions`)
  write(cursor.to(2, 3) + `${theme.muted}Fetching sessions...${theme.reset}`)

  conn.send(sessionList())

  const listMsg = await new Promise(resolve => conn.on('session_list', resolve))
  const sessions = listMsg.sessions || []

  write(cursor.to(2, 3) + screen.clearLine)

  if (sessions.length === 0) {
    write(cursor.to(2, 3) + `${theme.muted}No active sessions${theme.reset}`)
  } else {
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i]
      write(cursor.to(4, 3 + i) + `${theme.choice}${i + 1}.${theme.reset} ${s.title} (${s.playerCount}/${s.maxPlayers} players) [${s.phase}]`)
    }
  }

  write(cursor.to(2, 4 + sessions.length) + `${theme.narrative}What would you like to do?${theme.reset}`)

  const items = [
    { label: 'Create new session' },
    { label: 'Join existing session' },
    { label: 'Refresh list' }
  ]

  const renderMenu = (menuItems, sel) => {
    for (let i = 0; i < menuItems.length; i++) {
      const marker = i === sel ? `${theme.prompt}▸ ${theme.reset}` : '  '
      write(cursor.to(4, 6 + sessions.length + i) + screen.clearLine + marker + `${theme.choice}${i + 1}.${theme.reset} ${menuItems[i].label}`)
    }
  }

  const choice = await menuSelect(items, renderMenu)

  if (choice === 0) return { action: 'create' }
  if (choice === 1) return { action: 'join', sessions }
  return { action: 'refresh' }
}

const showCreateSession = async (conn, adventures) => {
  write(screen.clear)
  write(cursor.to(2, 1) + `${theme.title}${style.bold}DUNGEONS${theme.reset} — New Session`)
  write(cursor.to(2, 3) + `${theme.narrative}Choose an adventure:${theme.reset}`)

  const items = adventures.map(a => ({ label: a.title }))
  const renderMenu = (menuItems, sel) => {
    for (let i = 0; i < menuItems.length; i++) {
      const marker = i === sel ? `${theme.prompt}▸ ${theme.reset}` : '  '
      write(cursor.to(4, 5 + i) + screen.clearLine + marker + `${theme.choice}${i + 1}.${theme.reset} ${menuItems[i].label}`)
    }
  }

  const choice = await menuSelect(items, renderMenu)
  const adventure = adventures[choice]

  conn.send(sessionCreate(adventure.id))

  const result = await new Promise(resolve => {
    conn.on('session_joined', resolve)
    conn.on('error', resolve)
  })

  return result
}

const showJoinSession = async (conn, sessions) => {
  write(screen.clear)
  write(cursor.to(2, 1) + `${theme.title}${style.bold}DUNGEONS${theme.reset} — Join Session`)

  if (sessions.length === 0) {
    write(cursor.to(2, 3) + `${theme.muted}No sessions available to join${theme.reset}`)
    await waitAnyKey()
    return null
  }

  write(cursor.to(2, 3) + `${theme.narrative}Choose a session:${theme.reset}`)

  const items = sessions.map(s => ({ label: `${s.title} (${s.playerCount}/${s.maxPlayers})` }))
  const renderMenu = (menuItems, sel) => {
    for (let i = 0; i < menuItems.length; i++) {
      const marker = i === sel ? `${theme.prompt}▸ ${theme.reset}` : '  '
      write(cursor.to(4, 5 + i) + screen.clearLine + marker + `${theme.choice}${i + 1}.${theme.reset} ${menuItems[i].label}`)
    }
  }

  const choice = await menuSelect(items, renderMenu)
  conn.send(sessionJoin(sessions[choice].id))

  const result = await new Promise(resolve => {
    conn.on('session_joined', resolve)
    conn.on('error', resolve)
  })

  return result
}

const showRoleSelection = async (conn, sessionData) => {
  write(screen.clear)
  write(cursor.to(2, 1) + `${theme.title}${style.bold}DUNGEONS${theme.reset} — ${sessionData.title}`)
  write(cursor.to(2, 3) + `${theme.narrative}Choose your role:${theme.reset}`)

  const roles = sessionData.roles || []
  const takenRoles = (sessionData.players || []).filter(p => p.role).map(p => p.role)
  const available = roles.filter(r => !takenRoles.includes(r.id))

  if (available.length === 0) {
    write(cursor.to(2, 5) + `${theme.muted}No roles available${theme.reset}`)
    return null
  }

  const items = available.map(r => ({ label: `${r.name} — ${r.description}` }))
  const renderMenu = (menuItems, sel) => {
    for (let i = 0; i < menuItems.length; i++) {
      const marker = i === sel ? `${theme.prompt}▸ ${theme.reset}` : '  '
      write(cursor.to(4, 5 + i) + screen.clearLine + marker + `${theme.choice}${i + 1}.${theme.reset} ${menuItems[i].label}`)
    }
  }

  const choice = await menuSelect(items, renderMenu)
  const role = available[choice]

  conn.send(sessionSelectRole(role.id))
  return role
}

const showLobbyWait = (conn, sessionData, isHost) => {
  write(screen.clear)
  write(cursor.to(2, 1) + `${theme.title}${style.bold}DUNGEONS${theme.reset} — Lobby`)
  write(cursor.to(2, 3) + `${theme.stat}${sessionData.title}${theme.reset}`)

  const drawPlayers = (players) => {
    write(cursor.to(2, 5) + `${theme.narrative}Players:${theme.reset}`)
    for (let i = 0; i < players.length; i++) {
      const p = players[i]
      const roleText = p.role ? ` (${p.role})` : ` ${theme.muted}(choosing role...)${theme.reset}`
      write(cursor.to(4, 6 + i) + screen.clearLine + `${theme.choice}${p.name}${theme.reset}${roleText}`)
    }
  }

  drawPlayers(sessionData.players || [])

  if (isHost) {
    write(cursor.to(2, 12) + `${theme.prompt}Press Enter to start when ready${theme.reset}`)
  } else {
    write(cursor.to(2, 12) + `${theme.muted}Waiting for host to start...${theme.reset}`)
  }

  // Return handlers so caller can update on events
  return {
    onPlayerJoined: (player) => {
      const players = sessionData.players || []
      players.push(player)
      drawPlayers(players)
    },
    onPlayerLeft: (player) => {
      const players = sessionData.players || []
      const idx = players.findIndex(p => p.name === player.name)
      if (idx >= 0) players.splice(idx, 1)
      drawPlayers(players)
    },
    onRoleSelected: (player) => {
      const players = sessionData.players || []
      const p = players.find(pp => pp.name === player.name)
      if (p) p.role = player.roleName || player.role
      drawPlayers(players)
    }
  }
}

export { showSessionList, showCreateSession, showJoinSession, showRoleSelection, showLobbyWait }
