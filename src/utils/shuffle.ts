/**
 * Fisher–Yates shuffle. With 2+ items it never returns the input order, so
 * choices listed beside their answers never line up row for row.
 */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  if (out.length > 1 && out.every((item, i) => item === items[i])) out.push(out.shift()!)
  return out
}
