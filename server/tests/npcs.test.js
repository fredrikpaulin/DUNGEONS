import { test, expect, describe } from 'bun:test'
import { getNpcScene, visitNpc, getNpcReaction, getNpcDef, revealNpcInfo, npcSummary } from '../engine/npcs.js'
import { createGameState } from '../engine/state.js'

const miniStory = await Bun.file('./server/tests/fixtures/mini-story.json').json()
const combos = miniStory.secrets.combinations
const goblinCombo = combos[0] // goblin is culprit
const ravenCombo = combos[1]  // raven is culprit

const mkState = (combo) => createGameState(miniStory, combo, {})

describe('getNpcScene', () => {
  test('returns base scene for visit', () => {
    const goblin = miniStory.npcs.find(n => n.id === 'goblin')
    const state = mkState(ravenCombo) // goblin is innocent
    const scene = getNpcScene(goblin, 1, state)
    // innocent variant override
    expect(scene.narrative).toContain('waves cheerfully')
  })

  test('returns guilty variant when NPC is culprit', () => {
    const goblin = miniStory.npcs.find(n => n.id === 'goblin')
    const state = mkState(goblinCombo) // goblin is guilty
    const scene = getNpcScene(goblin, 1, state)
    expect(scene.narrative).toContain('sweats and stammers')
  })

  test('falls back to base scene when no variant override', () => {
    const goblin = miniStory.npcs.find(n => n.id === 'goblin')
    const state = mkState(goblinCombo)
    const scene = getNpcScene(goblin, 2, state)
    // No guilty override for visit 2, falls back to base
    expect(scene.narrative).toContain('avoids eye contact')
  })

  test('returns null for non-existent visit', () => {
    const elder = miniStory.npcs.find(n => n.id === 'elder')
    const state = mkState(goblinCombo)
    const scene = getNpcScene(elder, 99, state)
    expect(scene).toBeNull()
  })
})

describe('visitNpc', () => {
  test('increments visit count', () => {
    const state = mkState(goblinCombo)
    const s = visitNpc(state, 'goblin')
    expect(s.npcState.goblin.visits).toBe(1)
  })

  test('returns same state for unknown NPC', () => {
    const state = mkState(goblinCombo)
    const s = visitNpc(state, 'nobody')
    expect(s).toBe(state)
  })
})

describe('getNpcReaction', () => {
  test('returns reaction scene', () => {
    const goblin = miniStory.npcs.find(n => n.id === 'goblin')
    const reaction = getNpcReaction(goblin, 'accused')
    expect(reaction.narrative).toContain('protests loudly')
  })

  test('returns null for unknown reaction', () => {
    const elder = miniStory.npcs.find(n => n.id === 'elder')
    expect(getNpcReaction(elder, 'accused')).toBeNull()
  })
})

describe('getNpcDef', () => {
  test('returns NPC definition', () => {
    const npc = getNpcDef(miniStory, 'elder')
    expect(npc.name).toBe('Elder Oak')
  })

  test('returns null for unknown NPC', () => {
    expect(getNpcDef(miniStory, 'nobody')).toBeNull()
  })
})

describe('revealNpcInfo', () => {
  test('adds info to revealed list', () => {
    const state = mkState(goblinCombo)
    const s = revealNpcInfo(state, 'goblin', 'alibi')
    expect(s.npcState.goblin.revealed).toContain('alibi')
  })

  test('does not duplicate', () => {
    let state = mkState(goblinCombo)
    state = revealNpcInfo(state, 'goblin', 'alibi')
    state = revealNpcInfo(state, 'goblin', 'alibi')
    expect(state.npcState.goblin.revealed).toEqual(['alibi'])
  })
})

describe('npcSummary', () => {
  test('returns summary of all NPCs', () => {
    let state = mkState(goblinCombo)
    state = visitNpc(state, 'elder')
    const summary = npcSummary(state, miniStory)
    expect(summary).toHaveLength(3)
    expect(summary.find(n => n.id === 'elder').visits).toBe(1)
    expect(summary.find(n => n.id === 'goblin').visits).toBe(0)
  })
})
