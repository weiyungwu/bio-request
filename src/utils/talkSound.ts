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

/** One blip per call, around `pitch` Hz; the AudioContext is made on first use. */
export function createTalkVoice() {
  let ctx: AudioContext | undefined
  return {
    blip(pitch: number) {
      const Context = globalThis.AudioContext
      if (!Context) return
      ctx ??= new Context()
      if (ctx.state === 'suspended') void ctx.resume()
      const t = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = pitch * (0.85 + Math.random() * 0.3)
      gain.gain.setValueAtTime(0.06, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.06)
    },
    close() {
      void ctx?.close()
      ctx = undefined
    },
  }
}
