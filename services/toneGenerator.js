// Expo SDK 54 moved the old cacheDirectory/writeAsStringAsync/EncodingType
// API to expo-file-system/legacy -- the default 'expo-file-system' export no
// longer has them, so this file was silently throwing on every call (caught
// by the "silently fail" try/catch below) and Frequency Tuner / Affirmation
// Beat never actually produced sound.
import * as FileSystem from 'expo-file-system/legacy';

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function encodeWavStereo(left, right, sampleRate) {
  const numSamples = left.length;
  const blockAlign = 4;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7fff, true); offset += 2;
    view.setInt16(offset, r < 0 ? r * 0x8000 : r * 0x7fff, true); offset += 2;
  }
  return buffer;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '', i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    result += chars[bytes[i] >> 2];
    result += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    result += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    result += chars[bytes[i + 2] & 63];
  }
  if (i < bytes.length) {
    const b0 = bytes[i], b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    result += chars[b0 >> 2];
    result += chars[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < bytes.length ? chars[(b1 & 15) << 2] : '=';
    result += '==';
  }
  return result;
}

// Generates a short looping stereo tone (binaural: different L/R freq, plain frequency: same L/R)
// and writes it to a local cache file, returning a file:// URI playable with expo-av.
// Headphones required for binaural beats to register correctly.
export async function generateToneFile({ leftFreq, rightFreq, durationSec = 8, sampleRate = 22050, amplitude = 0.22 }) {
  const numSamples = Math.floor(durationSec * sampleRate);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);
  const fadeSamples = Math.floor(sampleRate * 0.08);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let env = 1;
    if (i < fadeSamples) env = i / fadeSamples;
    else if (i > numSamples - fadeSamples) env = (numSamples - i) / fadeSamples;
    left[i] = Math.sin(2 * Math.PI * leftFreq * t) * amplitude * env;
    right[i] = Math.sin(2 * Math.PI * rightFreq * t) * amplitude * env;
  }

  const wavBuffer = encodeWavStereo(left, right, sampleRate);
  const base64 = arrayBufferToBase64(wavBuffer);
  const fileUri = `${FileSystem.cacheDirectory}tone_${Math.round(leftFreq)}_${Math.round(rightFreq)}.wav`;
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return fileUri;
}
