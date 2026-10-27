/** How long a star label takes to fade fully in or out. */
export const LABEL_FADE_MS = 120

/** Label opacity [0..1] by star ID; labels that have faded out are absent. */
export type LabelOpacities = ReadonlyMap<string, number>

export interface LabelFadeStep {
  opacities: LabelOpacities
  /** True while any label is still fading. */
  animating: boolean
}

/**
 * Time to advance the fades by since the previous frame. A fade starts at elapsed 0 (no previous
 * frame), so it always runs LABEL_FADE_MS of real time; reduced motion jumps to the end.
 */
export function fadeElapsedMs(
  previousMs: number | null,
  nowMs: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return Infinity
  if (previousMs === null) return 0
  return Math.max(0, nowMs - previousMs)
}

/**
 * Moves shown labels toward opacity 1 and the others toward 0.
 * A fading label is dropped at once when its star is no longer present (left the cube).
 */
export function advanceLabelFades(
  previous: LabelOpacities,
  shown: ReadonlySet<string>,
  present: ReadonlySet<string>,
  elapsedMs: number,
): LabelFadeStep {
  const step: number = elapsedMs / LABEL_FADE_MS
  const opacities = new Map<string, number>()
  let animating = false
  for (const id of shown) {
    const opacity: number = Math.min(1, (previous.get(id) ?? 0) + step)
    opacities.set(id, opacity)
    if (opacity < 1) animating = true
  }
  for (const [id, before] of previous) {
    if (shown.has(id) || !present.has(id)) continue
    const opacity: number = Math.max(0, before - step)
    if (opacity > 0) {
      opacities.set(id, opacity)
      animating = true
    }
  }
  return { opacities, animating }
}
