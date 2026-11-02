/**
 * IndexedDB migration helpers — read legacy DeepThought DBs once, write to Krikkit Lab names.
 */

import { LAB_IDB_MIGRATION_PREFIX } from "./lab-keys";

function openDb(
  name: string,
  version: number,
  storeName: string,
): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(name, version);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function copyStore(
  legacyDb: IDBDatabase,
  primaryDb: IDBDatabase,
  storeName: string,
): Promise<number> {
  const entries: Array<{ key: IDBValidKey; value: unknown }> = [];
  await new Promise<void>((resolve, reject) => {
    const tx = legacyDb.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve();
        return;
      }
      entries.push({ key: cursor.key, value: cursor.value });
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });

  if (entries.length === 0) return 0;

  await new Promise<void>((resolve, reject) => {
    const tx = primaryDb.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    for (const entry of entries) {
      store.put(entry.value, entry.key);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return entries.length;
}

async function migrateLegacyDb(
  legacyName: string,
  primaryDb: IDBDatabase,
  storeName: string,
): Promise<void> {
  const legacyDb = await openDb(legacyName, primaryDb.version, storeName);
  if (!legacyDb) return;
  try {
    if (!legacyDb.objectStoreNames.contains(storeName)) return;
    await copyStore(legacyDb, primaryDb, storeName);
  } finally {
    try {
      legacyDb.close();
    } catch {
      /* ignore */
    }
  }
}

function migrationDone(primaryName: string): boolean {
  try {
    return (
      typeof localStorage !== "undefined" &&
      localStorage.getItem(`${LAB_IDB_MIGRATION_PREFIX}${primaryName}`) === "1"
    );
  } catch {
    return false;
  }
}

function markMigrationDone(primaryName: string): void {
  try {
    localStorage?.setItem(`${LAB_IDB_MIGRATION_PREFIX}${primaryName}`, "1");
  } catch {
    /* ignore */
  }
}

/** Open the Lab IDB and one-shot copy entries from the legacy database. */
export async function openLabIdb(
  primaryName: string,
  legacyName: string,
  version: number,
  storeName: string,
): Promise<IDBDatabase | null> {
  const db = await openDb(primaryName, version, storeName);
  if (!db || migrationDone(primaryName)) return db;

  try {
    await migrateLegacyDb(legacyName, db, storeName);
    markMigrationDone(primaryName);
  } catch {
    /* cache migration is best-effort */
  }

  return db;
}
