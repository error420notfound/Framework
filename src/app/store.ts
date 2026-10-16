import { create } from "zustand";
import { execute, fork, type Command } from "../domain/engine";
import { newId, type LibraryDocument, type State } from "../domain/schema";
import { createCompleteStarter as createStarter } from "../starter/collection";
import {
  indexedDbAdapter,
  type PersistenceAdapter,
} from "../persistence/library";

export const workspaces = [
  "Foundations",
  "Foundation tokens",
  "Semantic tokens",
  "Themes",
  "Styles",
  "Primitives",
  "Components",
  "Compositions",
] as const;
export type Workspace = (typeof workspaces)[number];
type HistoryEntry = { doc: LibraryDocument; label: string };
type EditorState = {
  doc: LibraryDocument;
  libraries: LibraryDocument[];
  past: HistoryEntry[];
  future: HistoryEntry[];
  workspace: Workspace;
  selectedId: string;
  componentId: string;
  search: string;
  themeId: string;
  densityId: string;
  variants: Record<string, string>;
  states: State[];
  previewValues: Record<string, string | boolean | number>;
  viewport: number;
  saveState: "Loading" | "Unsaved" | "Saving" | "Saved" | "Failed";
  error: string;
  ready: boolean;
  bottom: "Dependencies" | "Validation" | "Motion";
  panelOpen: boolean;
  command: (commands: Command[], label: string) => void;
  undo: () => void;
  redo: () => void;
  select: (id: string) => void;
  navigate: (workspace: Workspace) => void;
  save: () => Promise<void>;
  openLibrary: (id: string) => void;
  forkLibrary: () => void;
  importLibrary: (doc: LibraryDocument) => void;
};
let adapter: PersistenceAdapter = indexedDbAdapter;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saveQueue = Promise.resolve();
let generation = 0;
const starter = createStarter();
export const useEditor = create<EditorState>((set, get) => ({
  doc: fork(starter, newId("library"), "Starter library"),
  libraries: [],
  past: [],
  future: [],
  workspace: "Components",
  selectedId: "button_label",
  componentId: "button",
  search: "",
  themeId: "light",
  densityId: "comfortable",
  variants: { emphasis: "primary", size: "medium" },
  states: [],
  previewValues: {},
  viewport: 768,
  saveState: "Loading",
  error: "",
  ready: false,
  bottom: "Dependencies",
  panelOpen: true,
  command(commands, label) {
    try {
      const prev = get().doc;
      const doc = execute(prev, commands);
      set({
        doc,
        past: [...get().past, { doc: prev, label }].slice(-100),
        future: [],
        saveState: "Unsaved",
        error: "",
      });
      schedule();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
  undo() {
    const { past, doc, future } = get();
    const entry = past.at(-1);
    if (!entry) return;
    set({
      doc: { ...entry.doc, revision: doc.revision + 1 },
      past: past.slice(0, -1),
      future: [...future, { doc, label: entry.label }],
      saveState: "Unsaved",
      error: "",
    });
    schedule();
  },
  redo() {
    const { future, doc, past } = get();
    const entry = future.at(-1);
    if (!entry) return;
    set({
      doc: { ...entry.doc, revision: doc.revision + 1 },
      future: future.slice(0, -1),
      past: [...past, { doc, label: entry.label }],
      saveState: "Unsaved",
      error: "",
    });
    schedule();
  },
  select(id) {
    const e = get().doc.entities[id];
    if (!e) return;
    const workspace =
      e.kind === "token"
        ? e.layer === "foundation"
          ? "Foundation tokens"
          : "Semantic tokens"
        : e.kind === "source" || e.kind === "asset"
          ? "Foundations"
          : e.kind === "theme"
            ? "Themes"
            : e.kind === "style"
              ? "Styles"
              : e.kind === "composition" || e.kind === "instance"
                ? "Compositions"
                : "Components";
    set({
      selectedId: id,
      workspace,
      search: "",
      ...(e.kind === "component"
        ? {
            componentId: id,
            variants: e.defaults,
            previewValues: {},
            states: [],
          }
        : {}),
    });
  },
  navigate(workspace) {
    set({ workspace, search: "" });
  },
  async save() {
    const doc = structuredClone(get().doc),
      currentGeneration = generation;
    set({ saveState: "Saving" });
    const run = saveQueue.catch(() => {}).then(() => adapter.save(doc));
    saveQueue = run;
    try {
      await run;
      const state = get();
      if (currentGeneration === generation && state.doc.id === doc.id) {
        set({
          libraries: [...state.libraries.filter((l) => l.id !== doc.id), doc],
          saveState: state.doc.revision === doc.revision ? "Saved" : "Unsaved",
          error: state.error.startsWith("Local save failed:")
            ? ""
            : state.error,
        });
      }
    } catch (e) {
      if (currentGeneration === generation && get().doc.id === doc.id)
        set({
          saveState: "Failed",
          error: `Local save failed: ${(e as Error).message}. Retry or download a portable backup.`,
        });
    }
  },
  openLibrary(id) {
    const doc = get().libraries.find((d) => d.id === id);
    if (!doc) return;
    generation++;
    set({
      doc: structuredClone(doc),
      past: [],
      future: [],
      selectedId: "",
      themeId: doc.themeId,
      densityId: doc.densityId,
      saveState: "Saved",
    });
  },
  forkLibrary() {
    const doc = fork(get().doc, newId("library"), `${get().doc.name} fork`);
    generation++;
    set({ doc, past: [], future: [], saveState: "Unsaved" });
    schedule();
  },
  importLibrary(input) {
    const doc = fork(input, newId("library"), `${input.name} imported`);
    generation++;
    set({
      doc,
      past: [],
      future: [],
      selectedId: "",
      themeId: doc.themeId,
      densityId: doc.densityId,
      saveState: "Unsaved",
    });
    schedule();
  },
}));
function schedule() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void useEditor.getState().save(), 450);
}
export async function initialize(
  persistence: PersistenceAdapter = indexedDbAdapter,
) {
  adapter = persistence;
  try {
    const libraries = await adapter.loadAll();
    const doc = libraries.at(-1);
    useEditor.setState({
      libraries,
      ready: true,
      ...(doc
        ? {
            doc,
            themeId: doc.themeId,
            densityId: doc.densityId,
            saveState: "Saved" as const,
          }
        : { saveState: "Unsaved" as const }),
    });
    if (!doc) schedule();
  } catch (e) {
    useEditor.setState({
      ready: true,
      saveState: "Failed",
      error: `Could not load browser libraries: ${(e as Error).message}. The starter is available; download a backup before leaving.`,
    });
  }
}
