import { openDB } from "idb";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { parseDocument } from "../domain/engine";
import type { LibraryDocument } from "../domain/schema";
import { releaseSchema, type Release } from "../domain/releases";

export interface PersistenceAdapter {
  loadAll(): Promise<LibraryDocument[]>;
  save(doc: LibraryDocument): Promise<void>;
}
const database = () =>
  openDB("formwork", 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("libraries"))
        db.createObjectStore("libraries", { keyPath: "id" });
      if (!db.objectStoreNames.contains("releases"))
        db.createObjectStore("releases", { keyPath: "id" });
    },
  });
export async function loadReleases(): Promise<Release[]> {
  const db = await database();
  return (await db.getAll("releases")).map((r) => releaseSchema.parse(r));
}
export async function saveRelease(release: Release): Promise<void> {
  const parsed = releaseSchema.parse(release);
  const db = await database();
  const tx = db.transaction("releases", "readwrite");
  const all = await tx.store.getAll();
  if (
    all.some(
      (r) => r.libraryId === parsed.libraryId && r.version === parsed.version,
    )
  ) {
    tx.abort();
    throw new Error(
      "That version already has an immutable snapshot. Choose a new version.",
    );
  }
  await tx.store.add(structuredClone(parsed));
  await tx.done;
}
export const indexedDbAdapter: PersistenceAdapter = {
  async loadAll() {
    const db = await database();
    const records = await db.getAll("libraries");
    return records.map(parseDocument);
  },
  async save(doc) {
    const db = await database();
    const transaction = db.transaction("libraries", "readwrite");
    await transaction.store.put(structuredClone(doc));
    await transaction.done;
  },
};
export function portableBytes(doc: LibraryDocument): Uint8Array {
  const copy = structuredClone(doc);
  const files: Record<string, Uint8Array> = {};
  for (const a of Object.values(copy.entities))
    if (a.kind === "asset") {
      files[`assets/${a.id}`] = Uint8Array.from(atob(a.data), (c) =>
        c.charCodeAt(0),
      );
      a.data = "";
    }
  files["library.json"] = strToU8(JSON.stringify(copy, null, 2));
  return zipSync(files);
}
export function importPortable(bytes: Uint8Array): LibraryDocument {
  if (bytes.length > 25_000_000)
    throw new Error("Library file exceeds the 25 MB import limit");
  const possibleJson = strFromU8(bytes)
    .replace(/^\uFEFF/, "")
    .trimStart();
  if (possibleJson.startsWith("{"))
    return parseDocument(JSON.parse(possibleJson));
  let total = 0;
  const files = unzipSync(bytes, {
    filter(file) {
      total += file.originalSize;
      if (total > 50_000_000) throw new Error("Expanded library exceeds 50 MB");
      if (file.name.includes("..") || file.name.startsWith("/"))
        throw new Error("Unsafe archive path");
      return (
        file.name === "library.json" ||
        /^assets\/[a-zA-Z0-9_-]+$/.test(file.name)
      );
    },
  });
  if (!files["library.json"]) throw new Error("Missing library.json");
  const input = JSON.parse(strFromU8(files["library.json"]));
  if (input.entities)
    for (const a of Object.values(input.entities) as any[])
      if (a.kind === "asset") {
        const data = files[`assets/${a.id}`];
        if (!data) throw new Error(`Missing asset ${a.name}`);
        a.data = bytesToBase64(data);
      }
  return parseDocument(input);
}
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export function download(
  bytes: Uint8Array,
  name: string,
  mime = "application/zip",
) {
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], { type: mime }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
