// JSON Schema validation — lightweight, no dependencies
// Validates story structure against our schema's required fields and types

const validate = (story, schema) => {
  const errors = []

  // Check required top-level fields
  for (const field of schema.required || []) {
    if (story[field] === undefined) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  // Validate meta
  if (story.meta) {
    if (!story.meta.title) errors.push('meta.title is required')
    if (!story.meta.version) errors.push('meta.version is required')
  }

  // Validate config
  if (story.config) {
    // Validate tracks
    for (const t of story.config.tracks || []) {
      if (!t.id) errors.push('Track missing id')
      if (t.start === undefined) errors.push(`Track ${t.id}: missing start`)
      if (t.min === undefined) errors.push(`Track ${t.id}: missing min`)
      if (t.max === undefined) errors.push(`Track ${t.id}: missing max`)
      if (!t.direction) errors.push(`Track ${t.id}: missing direction`)
    }
    // Validate approaches
    for (const a of story.config.approaches || []) {
      if (!a.id) errors.push('Approach missing id')
    }
    // Validate stats
    for (const s of story.config.stats || []) {
      if (!s.id) errors.push('Stat missing id')
    }
  }

  // Validate rooms
  if (story.rooms) {
    for (const [roomId, room] of Object.entries(story.rooms)) {
      if (!room.id) errors.push(`Room ${roomId}: missing id`)
      if (!room.name) errors.push(`Room ${roomId}: missing name`)
      if (!room.narrative) errors.push(`Room ${roomId}: missing narrative`)
      // Validate choices
      for (const c of room.choices || []) {
        if (!c.id) errors.push(`Room ${roomId}: choice missing id`)
        if (!c.label) errors.push(`Room ${roomId}: choice ${c.id} missing label`)
        if (!c.target) errors.push(`Room ${roomId}: choice ${c.id} missing target`)
      }
      // Validate exits
      for (const e of room.exits || []) {
        if (!e.target) errors.push(`Room ${roomId}: exit missing target`)
        if (!e.label) errors.push(`Room ${roomId}: exit missing label`)
      }
    }
  }

  // Validate roles
  for (const r of story.roles || []) {
    if (!r.id) errors.push('Role missing id')
    if (!r.name) errors.push('Role missing name')
  }

  // Validate conditions
  for (const c of story.conditions || []) {
    if (!c.id) errors.push('Condition missing id')
    if (!c.name) errors.push('Condition missing name')
  }

  // Validate items
  for (const i of story.items || []) {
    if (!i.id) errors.push('Item missing id')
    if (!i.name) errors.push('Item missing name')
  }

  // Validate clues
  for (const c of story.clues?.core || []) {
    if (!c.id) errors.push('Core clue missing id')
    if (!c.text) errors.push(`Core clue ${c.id}: missing text`)
  }
  for (const c of story.clues?.bonus || []) {
    if (!c.id) errors.push('Bonus clue missing id')
    if (!c.text) errors.push(`Bonus clue ${c.id}: missing text`)
  }

  // Validate NPCs
  for (const n of story.npcs || []) {
    if (!n.id) errors.push('NPC missing id')
    if (!n.name) errors.push('NPC missing name')
  }

  // Validate complications
  for (const c of story.complications || []) {
    if (c.id === undefined) errors.push('Complication missing id')
    if (!c.name) errors.push(`Complication ${c.id}: missing name`)
    if (!c.size) errors.push(`Complication ${c.id}: missing size`)
    if (!c.narrative) errors.push(`Complication ${c.id}: missing narrative`)
  }

  // Validate secrets
  for (const combo of story.secrets?.combinations || []) {
    if (!combo.culprit) errors.push('Secret combo missing culprit')
    if (!combo.hideout) errors.push('Secret combo missing hideout')
    if (!combo.clueAssignments) errors.push('Secret combo missing clueAssignments')
  }

  // Cross-reference: startRoom exists
  if (story.config?.startRoom && story.rooms && !story.rooms[story.config.startRoom]) {
    errors.push(`startRoom "${story.config.startRoom}" does not exist in rooms`)
  }

  // Cross-reference: choice targets exist
  if (story.rooms) {
    for (const [roomId, room] of Object.entries(story.rooms)) {
      for (const c of room.choices || []) {
        if (c.target && !story.rooms[c.target]) {
          errors.push(`Room ${roomId}: choice "${c.id}" targets non-existent room "${c.target}"`)
        }
      }
      for (const e of room.exits || []) {
        if (e.target && !story.rooms[e.target]) {
          errors.push(`Room ${roomId}: exit targets non-existent room "${e.target}"`)
        }
      }
    }
  }

  return { ok: errors.length === 0, errors }
}

export { validate }
