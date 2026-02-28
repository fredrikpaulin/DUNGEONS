// Protocol — message types and builder helpers for client ↔ server communication
// All messages are JSON objects with a "type" field

// --- Message Types ---

const CLIENT = {
  AUTH: 'auth',
  SESSION: 'session',
  ACTION: 'action'
}

const SERVER = {
  WELCOME: 'welcome',
  AUTH_OK: 'auth_ok',
  AUTH_FAIL: 'auth_fail',
  SESSION_LIST: 'session_list',
  SESSION_JOINED: 'session_joined',
  SESSION_STARTED: 'session_started',
  SESSION_PLAYER_JOINED: 'session_player_joined',
  SESSION_PLAYER_LEFT: 'session_player_left',
  SESSION_ROLE_SELECTED: 'session_role_selected',
  ROOM_VIEW: 'room_view',
  PROMPT_APPROACH: 'prompt_approach',
  PROMPT_VERB: 'prompt_verb',
  PROMPT_FINALE: 'prompt_finale',
  NARRATIVE: 'narrative',
  CLUE_FOUND: 'clue_found',
  COMPLICATION: 'complication',
  PLAYER_ENTERED: 'player_entered',
  PLAYER_LEFT: 'player_left',
  TRACK_CHANGED: 'track_changed',
  CONDITION_ADDED: 'condition_added',
  CONDITION_REMOVED: 'condition_removed',
  GAME_OVER: 'game_over',
  ERROR: 'error'
}

// --- Client Message Builders ---

const auth = (action, name) => ({ type: CLIENT.AUTH, action, name })
const authLogin = (name) => auth('login', name)
const authCreate = (name) => auth('create', name)

const session = (action, data = {}) => ({ type: CLIENT.SESSION, action, ...data })
const sessionList = () => session('list')
const sessionCreate = (adventureId) => session('create', { adventureId })
const sessionJoin = (sessionId) => session('join', { sessionId })
const sessionStart = () => session('start')
const sessionSelectRole = (roleId) => session('select_role', { roleId })
const sessionLeave = () => session('leave')

const action = (action, data = {}) => ({ type: CLIENT.ACTION, action, ...data })
const actionChoose = (choiceId) => action('choose', { choiceId })
const actionApproach = (approachId) => action('approach', { approachId })
const actionVerb = (verbId) => action('verb', { verbId })
const actionUseItem = (itemId) => action('use_item', { itemId })
const actionUseTrick = () => action('use_trick')
const actionFinaleAnswer = (culprit, hideout) => action('finale_answer', { culprit, hideout })
const actionMove = (roomId) => action('move', { roomId })

// --- Server Message Builders ---

const welcome = (adventures) => ({ type: SERVER.WELCOME, adventures, user: null })
const authOk = (user) => ({ type: SERVER.AUTH_OK, user })
const authFail = (message) => ({ type: SERVER.AUTH_FAIL, message })
const error = (message) => ({ type: SERVER.ERROR, message })

const sessionListMsg = (sessions) => ({ type: SERVER.SESSION_LIST, sessions })
const sessionJoined = (sessionData) => ({ type: SERVER.SESSION_JOINED, session: sessionData })
const sessionStarted = () => ({ type: SERVER.SESSION_STARTED })
const sessionPlayerJoined = (player) => ({ type: SERVER.SESSION_PLAYER_JOINED, player })
const sessionPlayerLeft = (player) => ({ type: SERVER.SESSION_PLAYER_LEFT, player })
const sessionRoleSelected = (player) => ({ type: SERVER.SESSION_ROLE_SELECTED, player })

const roomView = (data) => ({ type: SERVER.ROOM_VIEW, ...data })
const narrative = (text) => ({ type: SERVER.NARRATIVE, text })
const clueFound = (clue) => ({ type: SERVER.CLUE_FOUND, clue })
const complication = (comp) => ({ type: SERVER.COMPLICATION, complication: comp })
const playerEntered = (player) => ({ type: SERVER.PLAYER_ENTERED, player })
const playerLeft = (player) => ({ type: SERVER.PLAYER_LEFT, player })
const trackChanged = (track, value, delta) => ({ type: SERVER.TRACK_CHANGED, track, value, delta })
const conditionAdded = (condition, player) => ({ type: SERVER.CONDITION_ADDED, condition, player })
const conditionRemoved = (condition, player) => ({ type: SERVER.CONDITION_REMOVED, condition, player })
const promptApproach = (approaches) => ({ type: SERVER.PROMPT_APPROACH, approaches })
const promptVerb = (verbs) => ({ type: SERVER.PROMPT_VERB, verbs })
const promptFinale = (suspects, hideouts) => ({ type: SERVER.PROMPT_FINALE, suspects, hideouts })
const gameOver = (epilogue) => ({ type: SERVER.GAME_OVER, epilogue })

// --- Helpers ---

const pack = (msg) => JSON.stringify(msg)
const unpack = (raw) => {
  try { return JSON.parse(raw) }
  catch { return null }
}

export {
  CLIENT, SERVER,
  // Client builders
  authLogin, authCreate,
  sessionList, sessionCreate, sessionJoin, sessionStart, sessionSelectRole, sessionLeave,
  actionChoose, actionApproach, actionVerb, actionUseItem, actionUseTrick, actionFinaleAnswer, actionMove,
  // Server builders
  welcome, authOk, authFail, error,
  sessionListMsg, sessionJoined, sessionStarted, sessionPlayerJoined, sessionPlayerLeft, sessionRoleSelected,
  roomView, narrative, clueFound, complication,
  playerEntered, playerLeft, trackChanged,
  conditionAdded, conditionRemoved,
  promptApproach, promptVerb, promptFinale,
  gameOver,
  // Helpers
  pack, unpack
}
