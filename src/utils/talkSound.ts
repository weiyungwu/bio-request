/**
 * Optional 說話音效 for the story dialog: short generated blips, no audio files.
 * Off unless the student turns it on (classrooms); the choice is remembered per browser.
 */
export const SOUND_KEY = 'bio-quest:sound'

export function readSoundOn(): boolean {
  try {
    return globalThis.localStorage?.getItem(SOUND_KEY) === 'on'
  } catch {
    return false
  }
}

export function writeSoundOn(on: boolean) {
  try {
    globalThis.localStorage?.setItem(SOUND_KEY, on ? 'on' : 'off')
  } catch {
    // Storage blocked: the toggle still works for this visit.
  }
}

type ContextClass = typeof AudioContext

/** One blip per call, around `pitch` Hz; the AudioContext is made on first use. */
export function createTalkVoice() {
  let ctx: AudioContext | undefined
  // Older iPads (iOS < 14.5) only have the prefixed name.
  const Context: ContextClass | undefined =
    globalThis.AudioContext ??
    (globalThis as unknown as { webkitAudioContext?: ContextClass }).webkitAudioContext

  function ready() {
    if (!Context) return undefined
    ctx ??= new Context()
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  }

  return {
    /** Call inside a click: Safari only lets audio start from a user gesture. */
    unlock() {
      ready()
    },
    blip(pitch: number) {
      const ac = ready()
      if (!ac) return
      const t = ac.currentTime
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = 'triangle'
      osc.frequency.value = pitch * (0.85 + Math.random() * 0.3)
      gain.gain.setValueAtTime(0.06, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
      osc.connect(gain).connect(ac.destination)
      osc.start(t)
      osc.stop(t + 0.06)
    },
    close() {
      ctx?.close().catch(() => {})
      ctx = undefined
    },
  }
}
