import { readPanelPreferences } from "./preferences";
import { create } from "zustand";
import { workspaceFor, selectionContext } from "./navigation";
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
  bindingScope: string;
  contexts: Partial<
    Record<
      Workspace,
      {
        selectedId: string;
        componentId: string;
        bindingScope: string;
        variants: Record<string, string>;
        states: State[];
        previewValues: Record<string, string | number | boolean>;
      }
    >
  >;
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
  dirtyFields: Record<string, boolean>;
  bottom: "Dependencies" | "Validation" | "Motion";
  panelOpen: boolean;
  browserWidth: number;
  inspectorWidth: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  anatomyCollapsed: boolean;
  command: (commands: Command[], label: string) => void;
  undo: () => void;
  redo: () => void;
  select: (id: string, scope?: string) => void;
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
  bindingScope: "base",
  contexts: {},
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
  dirtyFields: {},
  ...readPanelPreferences(),
  command(commands, label) {
    try {
      const prev = get().doc;
      const doc = execute(prev, commands);
      set({
        doc,
        ...(!doc.entities[get().selectedId]
          ? { selectedId: "", componentId: "", bindingScope: "base" }
          : {}),
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
      ...(!entry.doc.entities[get().selectedId]
        ? { selectedId: "", componentId: "", bindingScope: "base" }
        : {}),
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
  select(id, scope = "base") {
    const state = get(),
      e = state.doc.entities[id];
    if (!e) return;
    const workspace =
      e.kind === "node" && state.workspace === "Primitives" && scope === "base"
        ? "Primitives"
        : workspaceFor(e, state.doc);
    const context = {
      selectedId: state.selectedId,
      componentId: state.componentId,
      bindingScope: state.bindingScope,
      variants: state.variants,
      states: state.states,
      previewValues: state.previewValues,
    };
    const target = selectionContext(state.doc, id, workspace);
    const component = state.doc.entities[target.componentId];
    set({
      ...target,
      bindingScope: scope,
      ...(e.kind === "motion"
        ? { bottom: "Motion" as const, panelOpen: true }
        : {}),
      workspace,
      search: "",
      contexts: { ...state.contexts, [state.workspace]: context },
      ...(target.componentId !== state.componentId
        ? {
            variants: component?.kind === "component" ? component.defaults : {},
            states: [],
            previewValues: {},
          }
        : {}),
    });
  },
  navigate(workspace) {
    const state = get();
    if (workspace === state.workspace) return;
    const context = {
      selectedId: state.selectedId,
      componentId: state.componentId,
      bindingScope: state.bindingScope,
      variants: state.variants,
      states: state.states,
      previewValues: state.previewValues,
    };
    const remembered = state.contexts[workspace];
    const valid = selectionContext(
      state.doc,
      remembered?.selectedId ?? "",
      workspace,
    );
    set({
      workspace,
      search: "",
      contexts: { ...state.contexts, [state.workspace]: context },
      ...valid,
      ...(valid.selectedId && remembered
        ? remembered
        : { variants: {}, states: [], previewValues: {} }),
    });
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
      componentId: "",
      contexts: {},
      bindingScope: "base",
      variants: {},
      states: [],
      previewValues: {},
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
      componentId: "",
      contexts: {},
      bindingScope: "base",
      variants: {},
      states: [],
      previewValues: {},
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
            ...selectionContext(doc, "button_label", "Components"),
            contexts: {},
            workspace: "Components",
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

let lastPanelPreferences = "";
useEditor.subscribe((state) => {
  const preferences = JSON.stringify({
    panelOpen: state.panelOpen,
    bottom: state.bottom,
    browserWidth: state.browserWidth,
    inspectorWidth: state.inspectorWidth,
    leftCollapsed: state.leftCollapsed,
    rightCollapsed: state.rightCollapsed,
    anatomyCollapsed: state.anatomyCollapsed,
  });
  if (preferences !== lastPanelPreferences) {
    lastPanelPreferences = preferences;
    try {
      localStorage.setItem("formwork.panels.v1", preferences);
    } catch {
      /* Preferences are optional; document save remains independent. */
    }
  }
});
