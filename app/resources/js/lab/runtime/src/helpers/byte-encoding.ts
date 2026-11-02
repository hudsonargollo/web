// Krikkit Lab byte/string encoding helpers.

// Chunked to avoid blowing the call stack on large buffers
const CHUNK_BYTES = 8192;

export function bytesToBase64(data: Uint8Array): string {
  const parts: string[] = [];
  for (let offset = 0; offset < data.length; offset += CHUNK_BYTES) {
    const end = Math.min(offset + CHUNK_BYTES, data.length);
    let chunk = '';
    for (let i = offset; i < end; i++) {
      chunk += String.fromCharCode(data[i]);
    }
    parts.push(chunk);
  }
  return btoa(parts.join(''));
}

export function base64ToBytes(encoded: string): Uint8Array {
  const raw = atob(encoded);
  const result = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    result[i] = raw.charCodeAt(i);
  }
  return result;
}

// Pre-computed hex lookup table
const HEX_TABLE: string[] = new Array(256);
for (let i = 0; i < 256; i++) {
  HEX_TABLE[i] = (i < 16 ? '0' : '') + i.toString(16);
}

export function bytesToHex(data: Uint8Array): string {
  const chars = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    chars[i] = HEX_TABLE[data[i]];
  }
  return chars.join('');
}

export function bytesToLatin1(data: Uint8Array): string {
  const parts: string[] = [];
  for (let offset = 0; offset < data.length; offset += CHUNK_BYTES) {
    const end = Math.min(offset + CHUNK_BYTES, data.length);
    let chunk = '';
    for (let i = offset; i < end; i++) {
      chunk += String.fromCharCode(data[i]);
    }
    parts.push(chunk);
  }
  return parts.join('');
}
