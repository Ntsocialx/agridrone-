// Generates the app's two original feedback sounds as small 16-bit mono WAV files.
// Run from mobile/: node scripts/make-sounds.mjs   (writes assets/sounds/*.wav)
import { mkdirSync, writeFileSync } from "node:fs";

const RATE = 22050;

/** One note: a sine with a soft attack, exponential decay and a quiet octave for warmth. */
function note(freqStart, freqEnd, seconds, { volume = 0.3, decay = 9 } = {}) {
  const n = Math.round(seconds * RATE);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const freq = freqStart + (freqEnd - freqStart) * (i / n);
    phase += (2 * Math.PI * freq) / RATE;
    const attack = Math.min(1, t / 0.008); // no click at the start
    const env = attack * Math.exp(-decay * t);
    out[i] = volume * env * (Math.sin(phase) + 0.25 * Math.sin(2 * phase));
  }
  return out;
}

/** Mixes notes that start at the given times (seconds). */
function mix(parts, seconds) {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (const [start, samples] of parts) {
    const offset = Math.round(start * RATE);
    for (let i = 0; i < samples.length && offset + i < out.length; i++) out[offset + i] += samples[i];
  }
  return out;
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

mkdirSync("assets/sounds", { recursive: true });

// Success: two soft rising notes, C6 then E6.
const chime = mix([[0, note(1046.5, 1046.5, 0.3)], [0.09, note(1318.5, 1318.5, 0.32, { volume: 0.28 })]], 0.42);
writeFileSync("assets/sounds/success.wav", wav(chime));

// Error: a short low tone that drops slightly.
const blip = note(330, 220, 0.2, { volume: 0.4, decay: 12 });
writeFileSync("assets/sounds/error.wav", wav(blip));

console.log("wrote assets/sounds/success.wav and assets/sounds/error.wav");
