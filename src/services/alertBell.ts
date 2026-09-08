let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  return audioContext;
}

function strike(ctx: AudioContext, when: number, level = 1) {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, when);
  master.gain.exponentialRampToValueAtTime(0.22 * level, when + 0.008);
  master.gain.exponentialRampToValueAtTime(0.0001, when + 1.35);
  master.connect(ctx.destination);

  const partials = [
    { frequency: 740, gain: 0.95, decay: 1.25 },
    { frequency: 1110, gain: 0.52, decay: 0.95 },
    { frequency: 1485, gain: 0.28, decay: 0.72 },
    { frequency: 2220, gain: 0.12, decay: 0.42 }
  ];

  partials.forEach(partial => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(partial.frequency, when);
    oscillator.frequency.exponentialRampToValueAtTime(partial.frequency * 0.996, when + partial.decay);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(partial.gain, when + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + partial.decay);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(when);
    oscillator.stop(when + partial.decay + 0.05);
  });
}

function ring(ctx: AudioContext) {
  const now = ctx.currentTime + 0.01;
  strike(ctx, now, 1);
  strike(ctx, now + 0.34, 0.72);
}

export async function enableOldHotelBell(): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') await ctx.resume();
    if (ctx.state !== 'running') return false;
    strike(ctx, ctx.currentTime + 0.02, 0.72);
    return true;
  } catch {
    return false;
  }
}

export function playOldHotelBell(): boolean {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'running') {
      ring(ctx);
      return true;
    }

    if (ctx.state === 'suspended') {
      ctx.resume()
        .then(() => {
          if (ctx.state === 'running') ring(ctx);
        })
        .catch(() => {});
    }

    return false;
  } catch {
    return false;
  }
}

export function isOldHotelBellReady(): boolean {
  return Boolean(audioContext && audioContext.state === 'running');
}
