let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  return audioContext;
}

function strike(ctx: AudioContext, when: number, level = 1) {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18, when);
  compressor.knee.setValueAtTime(18, when);
  compressor.ratio.setValueAtTime(5, when);
  compressor.attack.setValueAtTime(0.003, when);
  compressor.release.setValueAtTime(0.22, when);
  compressor.connect(ctx.destination);

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, when);
  master.gain.exponentialRampToValueAtTime(0.42 * level, when + 0.006);
  master.gain.exponentialRampToValueAtTime(0.0001, when + 1.6);
  master.connect(compressor);

  // Corpo metálico mais grave e presente, lembrando campainha de balcão antiga.
  const partials = [
    { frequency: 560, gain: 1.0, decay: 1.45 },
    { frequency: 840, gain: 0.78, decay: 1.2 },
    { frequency: 1120, gain: 0.48, decay: 0.92 },
    { frequency: 1680, gain: 0.26, decay: 0.62 },
    { frequency: 2520, gain: 0.12, decay: 0.34 }
  ];

  partials.forEach(partial => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(partial.frequency, when);
    oscillator.frequency.exponentialRampToValueAtTime(partial.frequency * 0.994, when + partial.decay);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(partial.gain, when + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + partial.decay);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(when);
    oscillator.stop(when + partial.decay + 0.05);
  });

  // Ataque curto para o "clac" mecânico da campainha chamar atenção imediatamente.
  const attackOsc = ctx.createOscillator();
  const attackGain = ctx.createGain();
  attackOsc.type = 'triangle';
  attackOsc.frequency.setValueAtTime(3200, when);
  attackOsc.frequency.exponentialRampToValueAtTime(1450, when + 0.055);
  attackGain.gain.setValueAtTime(0.22 * level, when);
  attackGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.075);
  attackOsc.connect(attackGain);
  attackGain.connect(compressor);
  attackOsc.start(when);
  attackOsc.stop(when + 0.08);

  // Pequeno impacto grave dá presença em caixas de TV e notebooks.
  const thumpOsc = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thumpOsc.type = 'sine';
  thumpOsc.frequency.setValueAtTime(190, when);
  thumpOsc.frequency.exponentialRampToValueAtTime(125, when + 0.09);
  thumpGain.gain.setValueAtTime(0.12 * level, when);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.11);
  thumpOsc.connect(thumpGain);
  thumpGain.connect(compressor);
  thumpOsc.start(when);
  thumpOsc.stop(when + 0.12);
}

function ring(ctx: AudioContext) {
  const now = ctx.currentTime + 0.01;
  strike(ctx, now, 1);
  strike(ctx, now + 0.28, 0.88);
}

export async function enableOldHotelBell(): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') await ctx.resume();
    if (ctx.state !== 'running') return false;
    strike(ctx, ctx.currentTime + 0.02, 0.82);
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
