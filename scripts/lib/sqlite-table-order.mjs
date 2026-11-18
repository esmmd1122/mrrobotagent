/**
 * Build INSERT order from SQLite foreign_key_list (topological sort).
 * Handles cycles by appending unresolved tables in stable name order with warnings.
 */
export function sqliteForeignKeys(sqlite, table) {
  const rows = sqlite.prepare(`PRAGMA foreign_key_list("${table}")`).all()
  const refs = new Set()
  for (const row of rows) {
    const refTable = row.table
    if (refTable) refs.add(refTable)
  }
  return refs
}

export function buildTableInsertOrder(sqlite, tableNames) {
  const names = [...new Set(tableNames)]
  const nameSet = new Set(names)
  const deps = new Map()
  const selfReferencing = []
  for (const table of names) {
    const refs = [...sqliteForeignKeys(sqlite, table)].filter((t) => nameSet.has(t))
    if (refs.includes(table)) selfReferencing.push(table)
    const extRefs = refs.filter((t) => t !== table)
    deps.set(table, new Set(extRefs))
  }

  const ordered = []
  const satisfied = new Set()
  const pending = new Set(names)
  let progress = true
  while (pending.size && progress) {
    progress = false
    const batch = [...pending].sort()
    for (const table of batch) {
      const needs = deps.get(table) ?? new Set()
      if ([...needs].every((d) => satisfied.has(d))) {
        ordered.push(table)
        satisfied.add(table)
        pending.delete(table)
        progress = true
      }
    }
  }

  const unresolved = [...pending].sort()
  if (unresolved.length) ordered.push(...unresolved)
  const cycles = [...new Set([...selfReferencing, ...unresolved])]
  return { ordered, cycles }
}