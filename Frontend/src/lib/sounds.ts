let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) {
    audioContext = new Ctx();
  }
  return audioContext;
};

const ensureRunning = async (ctx: AudioContext) => {
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {}
  }
};

const playTone = (
  ctx: AudioContext,
  frequency: number,
  durationSec: number,
  delaySec = 0,
  volume = 0.08,
  type: OscillatorType = "sine"
) => {
  const now = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationSec + 0.02);
};

export const playNotificationSound = async () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  await ensureRunning(ctx);
  playTone(ctx, 880, 0.12, 0, 0.05, "triangle");
  playTone(ctx, 1175, 0.12, 0.14, 0.05, "triangle");
};

export const startCallRingtone = () => {
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  let stopped = false;
  const ring = async () => {
    await ensureRunning(ctx);
    if (stopped) return;
    // Two-tone repeating ring pattern.
    playTone(ctx, 660, 0.18, 0, 0.06, "sine");
    playTone(ctx, 880, 0.22, 0.22, 0.06, "sine");
  };

  ring();
  const intervalId = window.setInterval(ring, 1600);

  return () => {
    stopped = true;
    window.clearInterval(intervalId);
  };
};
