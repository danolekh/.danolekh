/* The soundtrack, synthesized: a 128 BPM bed in A minor (kick, hats, clap, a sidechained sub, a pad
 * and a pluck arp) and the sound design on the picture's own cues (the typing, the burst, the score
 * ticking to 99, the chime, whooshes into every cut, the halftone, the card's flip, the events on
 * the wires, the riser into the slam and the closing chord). Every time comes from the scenes'
 * exported cues, so a hit lands on the frame it belongs to.
 *
 * `schedule(ctx)` works on a live AudioContext (the stage's `a` key plays it with the picture) or an
 * OfflineAudioContext (`renderWav()`, which finish.ts calls through Playwright to write the WAV). */

import { at, BAR, BEAT, DURATION } from "./lib/time";
import { CARDSTOCK_CUES } from "./scenes/Cardstock";
import { CONSOLLINE_CUES } from "./scenes/Consolline";
import { LOCKUP_CUES } from "./scenes/Lockup";
import { NAME_CUES } from "./scenes/Name";
import { OASI_CUES, scoreAt } from "./scenes/Oasi";
import { SPORTMAGAZ_CUES } from "./scenes/Sportmagaz";
import { SYSTEMS_CUES } from "./scenes/Systems";

export const RATE = 48000;

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
// Am, Am, F, C, G, Am, F, Am: roots and the chords over them.
const ROOTS = [45, 45, 41, 48, 43, 45, 41, 45];
const CHORDS = [
  [57, 60, 64, 71],
  [57, 60, 64, 71],
  [53, 57, 60, 64],
  [48, 52, 55, 62],
  [55, 59, 62, 66],
  [57, 60, 64, 67],
  [53, 57, 60, 67],
  [57, 60, 64, 71],
];

type Ctx = BaseAudioContext;

export function schedule(ctx: Ctx, when = 0) {
  const T = (t: number) => when + t;
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  // ——— Buses ———
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.14;
  comp.knee.value = 8;
  master.connect(comp).connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 2.4, 2.6);
  const wet = ctx.createGain();
  wet.gain.value = 0.32;
  reverb.connect(wet).connect(master);

  const music = ctx.createGain();
  music.gain.value = 0.85;
  music.connect(master);
  const sfx = ctx.createGain();
  sfx.gain.value = 0.8;
  sfx.connect(master);
  const send = (node: AudioNode, amount: number) => {
    const g = ctx.createGain();
    g.gain.value = amount;
    node.connect(g).connect(reverb);
  };

  const noise = noiseBuffer(ctx, 2);
  const noiseSource = (t: number, length: number) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    src.start(T(t), rand() * 1.5);
    src.stop(T(t + length + 0.05));
    return src;
  };
  const env = (t: number, peak: number, attack: number, decay: number, shape: "exp" | "lin" = "exp") => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, T(t));
    g.gain.linearRampToValueAtTime(peak, T(t + attack));
    if (shape === "exp") g.gain.exponentialRampToValueAtTime(0.0001, T(t + attack + decay));
    else g.gain.linearRampToValueAtTime(0.0001, T(t + attack + decay));
    return g;
  };
  const pan = (value: number) => {
    const p = ctx.createStereoPanner();
    p.pan.value = value;
    return p;
  };

  // ——— Instruments ———
  const kick = (t: number, gain = 1) => {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(160, T(t));
    o.frequency.exponentialRampToValueAtTime(42, T(t + 0.12));
    const g = env(t, gain, 0.002, 0.42);
    o.connect(g).connect(music);
    o.start(T(t));
    o.stop(T(t + 0.5));
    const click = noiseSource(t, 0.01);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2500;
    click.connect(hp).connect(env(t, 0.25 * gain, 0.001, 0.012)).connect(music);
  };
  const hat = (t: number, gain = 0.12, open = false) => {
    const src = noiseSource(t, open ? 0.25 : 0.06);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 8000;
    src.connect(hp).connect(env(t, gain, 0.001, open ? 0.22 : 0.04)).connect(pan(0.25)).connect(music);
  };
  const clap = (t: number, gain = 0.34) => {
    for (const d of [0, 0.011, 0.023]) {
      const src = noiseSource(t + d, 0.2);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1400;
      bp.Q.value = 0.9;
      const g = env(t + d, gain * (d ? 0.6 : 1), 0.001, d === 0.023 ? 0.16 : 0.02);
      src.connect(bp).connect(g).connect(music);
      send(g, 0.25);
    }
  };
  const sub = (t: number, note: number, length: number, gain = 0.34) => {
    const o = ctx.createOscillator();
    o.frequency.value = midi(note - 12);
    const s = ctx.createOscillator();
    s.type = "sawtooth";
    s.frequency.value = midi(note);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 260;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, T(t));
    g.gain.linearRampToValueAtTime(gain, T(t + 0.02));
    g.gain.setValueAtTime(gain, T(t + length - 0.05));
    g.gain.linearRampToValueAtTime(0.0001, T(t + length));
    const sg = ctx.createGain();
    sg.gain.value = 0.35;
    o.connect(g);
    s.connect(sg).connect(lp).connect(g);
    g.connect(duck);
    o.start(T(t));
    s.start(T(t));
    o.stop(T(t + length + 0.02));
    s.stop(T(t + length + 0.02));
  };
  // The bass ducks under every kick.
  const duck = ctx.createGain();
  duck.connect(music);
  const pump = (t: number) => {
    duck.gain.setValueAtTime(0.25, T(t));
    duck.gain.linearRampToValueAtTime(1, T(t + BEAT * 0.8));
  };
  const pad = (t: number, notes: number[], length: number, gain = 0.05, attack = 0.35) => {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(700, T(t));
    lp.frequency.linearRampToValueAtTime(2200, T(t + length));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, T(t));
    g.gain.linearRampToValueAtTime(gain, T(t + attack));
    g.gain.setValueAtTime(gain, T(t + length - 0.4));
    g.gain.linearRampToValueAtTime(0.0001, T(t + length));
    lp.connect(g).connect(music);
    send(g, 0.6);
    for (const n of notes)
      for (const detune of [-9, 0, 8]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = midi(n);
        o.detune.value = detune;
        o.connect(lp);
        o.start(T(t));
        o.stop(T(t + length + 0.05));
      }
  };
  const pluck = (t: number, note: number, gain = 0.07, p = 0) => {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = midi(note);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(3200, T(t));
    lp.frequency.exponentialRampToValueAtTime(500, T(t + 0.18));
    const g = env(t, gain, 0.003, 0.2);
    o.connect(lp).connect(g).connect(pan(p)).connect(music);
    send(g, 0.35);
    o.start(T(t));
    o.stop(T(t + 0.3));
  };

  // ——— Sound design ———
  const blip = (t: number, freq: number, gain = 0.08, length = 0.05, type: OscillatorType = "sine", p = 0) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = env(t, gain, 0.002, length);
    o.connect(g).connect(pan(p)).connect(sfx);
    o.start(T(t));
    o.stop(T(t + length + 0.05));
    return g;
  };
  const key = (t: number, gain = 0.16) => {
    const src = noiseSource(t, 0.03);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2600 + rand() * 2400;
    bp.Q.value = 3;
    src.connect(bp).connect(env(t, gain, 0.001, 0.02)).connect(pan(rand() * 0.4 - 0.2)).connect(sfx);
  };
  /** Noise swept through a band-pass, swelling into `hit` and panned across. */
  const whoosh = (hit: number, length = 0.36, gain = 0.22, from = 400, to = 5200, reverse = false) => {
    const t = hit - length;
    const src = noiseSource(t, length + 0.05);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(reverse ? to : from, T(t));
    bp.frequency.exponentialRampToValueAtTime(reverse ? from : to, T(hit));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, T(t));
    g.gain.exponentialRampToValueAtTime(gain, T(hit - 0.02));
    g.gain.linearRampToValueAtTime(0.0001, T(hit + 0.03));
    const p = ctx.createStereoPanner();
    p.pan.setValueAtTime(-0.7, T(t));
    p.pan.linearRampToValueAtTime(0.7, T(hit));
    src.connect(bp).connect(g).connect(p).connect(sfx);
    send(g, 0.2);
  };
  const boom = (t: number, gain = 0.9, length = 1.4) => {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(90, T(t));
    o.frequency.exponentialRampToValueAtTime(34, T(t + 0.5));
    o.connect(env(t, gain, 0.003, length)).connect(sfx);
    o.start(T(t));
    o.stop(T(t + length + 0.1));
    const src = noiseSource(t, 0.5);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(5000, T(t));
    lp.frequency.exponentialRampToValueAtTime(200, T(t + 0.4));
    const g = env(t, gain * 0.5, 0.002, 0.45);
    src.connect(lp).connect(g).connect(sfx);
    send(g, 0.9);
  };
  const riser = (from: number, to: number, gain = 0.16) => {
    const src = noiseSource(from, to - from);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(300, T(from));
    bp.frequency.exponentialRampToValueAtTime(7000, T(to));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, T(from));
    g.gain.exponentialRampToValueAtTime(gain, T(to - 0.01));
    g.gain.linearRampToValueAtTime(0.0001, T(to + 0.01));
    src.connect(bp).connect(g).connect(sfx);
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(110, T(from));
    o.frequency.exponentialRampToValueAtTime(880, T(to));
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, T(from));
    og.gain.exponentialRampToValueAtTime(gain * 0.35, T(to - 0.01));
    og.gain.linearRampToValueAtTime(0.0001, T(to + 0.01));
    o.connect(lp).connect(og).connect(sfx);
    send(og, 0.3);
    o.start(T(from));
    o.stop(T(to + 0.05));
  };
  const chime = (t: number, notes: number[], gain = 0.09, length = 1.6) => {
    notes.forEach((n, i) => {
      const g = blip(t + i * 0.012, midi(n), gain / (1 + i * 0.4), length);
      send(g, 0.8);
    });
  };
  const glitch = (t: number, length = 0.1) => {
    for (let i = 0; i < 5; i++) {
      const s = t + (i * length) / 5;
      blip(s, 200 + rand() * 1800, 0.05, length / 6, "square", rand() * 1.6 - 0.8);
    }
    const src = noiseSource(t, length);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    src.connect(bp).connect(env(t, 0.12, 0.002, length)).connect(sfx);
  };
  const swish = (t: number, gain = 0.14) => whoosh(t + 0.18, 0.2, gain, 900, 4200);

  // ——— Bed ———
  for (let bar = 0; bar < 8; bar++) {
    const b = at(bar);
    if (bar >= 1 && bar <= 6) {
      for (let beat = 0; beat < 4; beat++) {
        kick(b + beat * BEAT, bar === 6 && beat >= 2 ? 0.75 : 1);
        pump(b + beat * BEAT);
      }
      sub(b, ROOTS[bar]!, BAR, bar === 1 ? 0.26 : 0.34);
    }
    if (bar >= 2 && bar <= 6)
      for (let e = 0; e < 8; e++) if (e % 2) hat(b + e * (BEAT / 2), 0.1);
    if (bar === 6) for (let s = 0; s < 16; s++) hat(b + s * (BEAT / 4), 0.05 + s * 0.004);
    if (bar >= 3 && bar <= 6) {
      clap(b + BEAT);
      clap(b + 3 * BEAT);
    }
    if (bar >= 4 && bar <= 6) {
      const chord = CHORDS[bar]!;
      for (let s = 0; s < 16; s++) {
        if (bar === 6 && s >= 8) break;
        const n = chord[[0, 1, 2, 3, 2, 1, 3, 2][s % 8]!]! + (s >= 8 ? 12 : 0);
        pluck(b + s * (BEAT / 4), n, 0.05, s % 2 ? 0.3 : -0.3);
      }
    }
  }
  pad(NAME_CUES.burst, CHORDS[0]!, BAR * 2 - NAME_CUES.burst, 0.045, 0.2);
  pad(at(7), [...CHORDS[7]!, 76], DURATION - at(7), 0.06, 0.25);
  sub(at(7), 45, DURATION - at(7) - 0.05, 0.3);

  // ——— Bar 1: the typing, the riser, the burst ———
  for (let i = 0; i < NAME_CUES.chars; i++) key(NAME_CUES.typeFrom + ((i + 0.5) / NAME_CUES.chars) * (NAME_CUES.typeTo - NAME_CUES.typeFrom));
  riser(0.02, NAME_CUES.burst, 0.12);
  kick(NAME_CUES.burst, 1.1);
  boom(NAME_CUES.burst, 0.8, 1.6);
  chime(NAME_CUES.burst + 0.02, [69, 76, 81], 0.05, 1.8);
  whoosh(NAME_CUES.dock[1], NAME_CUES.dock[1] - NAME_CUES.dock[0], 0.16, 5200, 500, false);

  // ——— Bars 2-3: the score, the glitch, the chime; the proof ———
  whoosh(at(1), 0.3, 0.2);
  let last = 0;
  for (let t = at(1); t < OASI_CUES.top + 0.01; t += 0.001) {
    const v = Math.round(scoreAt(t));
    if (v !== last) {
      blip(t, 900 + v * 22, 0.035, 0.018, "triangle", (v / 100) * 0.6 - 0.3);
      last = v;
    }
  }
  glitch(OASI_CUES.glitch, 0.1);
  chime(OASI_CUES.top, [81, 88, 93, 100], 0.11, 1.5);
  boom(OASI_CUES.top, 0.35, 0.6);
  whoosh(OASI_CUES.proof, 0.3, 0.16, 3000, 400, true);
  blip(OASI_CUES.proof, 120, 0.25, 0.25);
  whoosh(OASI_CUES.strike + 0.12, 0.12, 0.12, 1200, 6000);
  whoosh(OASI_CUES.after + 0.02, 0.18, 0.16);
  OASI_CUES.starTimes.forEach((t, i) => {
    const g = blip(t, midi(84 + [0, 2, 4, 7, 9][i]!), 0.07, 0.35, "sine", i * 0.2 - 0.4);
    send(g, 0.7);
  });
  whoosh(OASI_CUES.end + 0.1, 0.3, 0.24);

  // ——— Bar 4: SportMagaz ———
  SPORTMAGAZ_CUES.chips.forEach((t, i) => blip(t, midi(76 + i * 5), 0.08, 0.12, "triangle"));
  swish(SPORTMAGAZ_CUES.fan);

  // ——— Bar 5: the halftone, consolline, the redline ———
  const h = noiseSource(CONSOLLINE_CUES.halftone[0], CONSOLLINE_CUES.halftone[1] - CONSOLLINE_CUES.halftone[0]);
  const hbp = ctx.createBiquadFilter();
  hbp.type = "bandpass";
  hbp.frequency.value = 900;
  hbp.Q.value = 0.7;
  const hg = ctx.createGain();
  hg.gain.setValueAtTime(0.0001, T(CONSOLLINE_CUES.halftone[0]));
  hg.gain.exponentialRampToValueAtTime(0.2, T(at(4)));
  hg.gain.exponentialRampToValueAtTime(0.0001, T(CONSOLLINE_CUES.halftone[1]));
  h.connect(hbp).connect(hg).connect(sfx);
  for (let i = 0; i < 12; i++) blip(CONSOLLINE_CUES.halftone[0] + i * 0.035, 1500 + rand() * 2500, 0.025, 0.01, "square", rand() - 0.5);
  boom(at(4), 0.4, 0.7);
  CONSOLLINE_CUES.chips.forEach((t, i) => blip(t, midi(76 + i * 5), 0.08, 0.12, "triangle"));
  swish(CONSOLLINE_CUES.shot);
  key(CONSOLLINE_CUES.line, 0.2);
  key(CONSOLLINE_CUES.line + 0.2, 0.2);
  chime(CONSOLLINE_CUES.pill, [88, 95], 0.05, 0.4);
  whoosh(at(5), 0.3, 0.2);

  // ——— Bar 6: cardstock ———
  CARDSTOCK_CUES.keys.forEach((t) => key(t, 0.12));
  chime(CARDSTOCK_CUES.installed, [84, 91], 0.05, 0.4);
  CARDSTOCK_CUES.chips.forEach((t, i) => blip(t, midi(76 + i * 5), 0.08, 0.12, "triangle"));
  CARDSTOCK_CUES.flips.forEach((t) => swish(t - 0.05, 0.16));
  whoosh(at(6), 0.3, 0.2);

  // ——— Bar 7: events on the wires, the wall, the riser ———
  SYSTEMS_CUES.nodes.forEach((t, i) => blip(t, midi(72 + [0, 3, 7, 10, 12, 15][i]!), 0.05, 0.08, "triangle", i * 0.3 - 0.75));
  SYSTEMS_CUES.pulses.forEach((t, i) => blip(t, 2200 + (i % 4) * 300, 0.025, 0.02, "sine", (i % 2) * 0.8 - 0.4));
  whoosh(SYSTEMS_CUES.wall, 0.25, 0.2, 5000, 300, true);
  riser(SYSTEMS_CUES.wall, SYSTEMS_CUES.out, 0.2);

  // ——— Bar 8: the slam and the closing chord ———
  kick(at(7), 1.2);
  boom(at(7), 1, 1.8);
  hat(at(7), 0.1, true);
  whoosh(LOCKUP_CUES.nameLands, 0.4, 0.12, 5000, 700, true);
  chime(LOCKUP_CUES.photo, [81, 88, 93], 0.05, 1.2);
  LOCKUP_CUES.chips.forEach((t, i) => blip(t, midi(81 + i * 7), 0.06, 0.2, "triangle"));
}

/** Renders the whole soundtrack offline and returns it as a 16-bit stereo WAV. */
export async function renderWav(): Promise<ArrayBuffer> {
  const ctx = new OfflineAudioContext(2, Math.round(DURATION * RATE), RATE);
  schedule(ctx);
  return wav(await ctx.startRendering());
}

function noiseBuffer(ctx: Ctx, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.round(seconds * ctx.sampleRate), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < data.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (s / 0x7fffffff) * 2 - 1;
  }
  return buffer;
}

/** A stereo room: decaying noise, a little different per side. */
function impulse(ctx: Ctx, seconds: number, decay: number) {
  const length = Math.round(seconds * ctx.sampleRate);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    let s = 999 + c * 77;
    for (let i = 0; i < length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      data[i] = ((s / 0x7fffffff) * 2 - 1) * (1 - i / length) ** decay;
    }
  }
  return buffer;
}

function wav(buffer: AudioBuffer): ArrayBuffer {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const out = new DataView(new ArrayBuffer(44 + frames * channels * 2));
  const text = (offset: number, s: string) => [...s].forEach((c, i) => out.setUint8(offset + i, c.charCodeAt(0)));
  text(0, "RIFF");
  out.setUint32(4, 36 + frames * channels * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, channels, true);
  out.setUint32(24, buffer.sampleRate, true);
  out.setUint32(28, buffer.sampleRate * channels * 2, true);
  out.setUint16(32, channels * 2, true);
  out.setUint16(34, 16, true);
  text(36, "data");
  out.setUint32(40, frames * channels * 2, true);
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let o = 44;
  for (let i = 0; i < frames; i++)
    for (let c = 0; c < channels; c++) {
      const v = Math.max(-1, Math.min(1, data[c]![i]!));
      out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
  return out.buffer;
}
