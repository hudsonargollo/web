// Krikkit Lab — node:volume-registry polyfill.


import type { MemoryVolume } from "../memory-volume";

let labSharedVolume: MemoryVolume | null = null;

// must be called once during init before watchers/scanners are used
export function setSharedVolume(vol: MemoryVolume): void {
  labSharedVolume = vol;
}

export function getSharedVolume(): MemoryVolume | null {
  return labSharedVolume;
}
