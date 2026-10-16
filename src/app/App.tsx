import { useEffect, useRef, useState } from "react";
import {
  Box,
  Undo2,
  Redo2,
  Download,
  ChevronDown,
  Copy,
  Upload,
  Save,
  Menu,
  PanelRightClose,
  X,
  ArrowUpRight,
  Palette,
  Braces,
  Layers,
  Type,
  Component,
  LayoutGrid,
  Shapes,
} from "lucide-react";
import { useEditor, workspaces } from "./store";
import { Browser, AnatomyTree } from "../editor/shell/Browser";
import { BottomPanel } from "../editor/shell/BottomPanel";
import { Inspector, type CreateRequest } from "../editor/inspectors/Inspector";
import { Canvas } from "../editor/workspaces/Canvas";
import { Records } from "../editor/workspaces/Records";
import { Composition } from "../editor/workspaces/Composition";
import { CreateDialog } from "../editor/controls/CreateDialog";
import { CommitInput } from "../editor/controls/Fields";
import {
  download,
  importPortable,
  portableBytes,
} from "../persistence/library";
import { exportAstro } from "../export/astro";
import { ReleasesDialog } from "../editor/controls/ReleasesDialog";
import type { LibraryDocument } from "../domain/schema";
const navIcons = [
  Palette,
  Braces,
  Braces,
  Layers,
  Type,
  Shapes,
  Component,
  LayoutGrid,
];
export function App() {
  const state = useEditor();
  const {
    doc,
    workspace,
    selectedId,
    saveState: persistedSaveState,
    error,
    ready,
  } = state;
  const saveState =
    Object.values(state.dirtyFields).some(Boolean) &&
    persistedSaveState !== "Failed" &&
    persistedSaveState !== "Loading"
      ? "Unsaved"
      : persistedSaveState;
  const [create, setCreate] = useState<CreateRequest | null>(null),
    [menu, setMenu] = useState(false),
    [leftOpen, setLeftOpen] = useState(false),
    [rightOpen, setRightOpen] = useState(false),
    [pending, setPending] = useState<LibraryDocument | null>(null);
  const [releasesOpen, setReleasesOpen] = useState(false);
  const file = useRef<HTMLInputElement>(null),
    review = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        target.blur();
        void useEditor.getState().save();
      }
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) useEditor.getState().redo();
        else useEditor.getState().undo();
      }
    }
    window.addEventListener("keydown", key);
    const leave = (e: BeforeUnloadEvent) => {
      if (
        ["Unsaved", "Saving", "Failed"].includes(
          useEditor.getState().saveState,
        ) ||
        Object.values(useEditor.getState().dirtyFields).some(Boolean)
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("beforeunload", leave);
    };
  }, []);
  useEffect(() => {
    if (pending) review.current?.showModal();
  }, [pending]);
  async function preserveThen(action: () => void) {
    (document.activeElement as HTMLElement | null)?.blur();
    const current = useEditor.getState();
    if (current.saveState !== "Saved") {
      await current.save();
      if (useEditor.getState().saveState !== "Saved") return;
    }
    action();
  }
  async function importFile(f: File | undefined) {
    if (!f) return;
    try {
      setPending(importPortable(new Uint8Array(await f.arrayBuffer())));
    } catch (e) {
      useEditor.setState({ error: `Import rejected: ${(e as Error).message}` });
    }
    if (file.current) file.current.value = "";
  }
  function exportFiles(kind: "portable" | "astro") {
    try {
      download(
        kind === "portable" ? portableBytes(doc) : exportAstro(doc),
        `${doc.name.replace(/[^a-zA-Z0-9_-]/g, "-")}${kind === "portable" ? ".formwork" : "-astro.zip"}`,
      );
      setMenu(false);
    } catch (e) {
      useEditor.setState({ error: `Export failed: ${(e as Error).message}` });
    }
  }
  const selected = doc.entities[selectedId],
    isCanvas =
      workspace === "Components" ||
      (workspace === "Compositions" && selected?.kind === "instance");
  return (
    <div
      className={`app ${leftOpen ? "left-open" : ""} ${rightOpen ? "right-open" : ""}`}
    >
      <header className="topbar">
        <button
          className="mobile-panel icon-button"
          aria-label="Toggle library browser"
          onClick={() => setLeftOpen(!leftOpen)}
        >
          <Menu size={20} />
        </button>
        <div className="brand">
          <Box size={25} strokeWidth={1.8} />
          <strong>Formwork</strong>
        </div>
        <div className="top-divider" />
        <div className="library-title">
          <CommitInput
            label="Library name"
            value={doc.name}
            onCommit={(name) => {
              if (!name.trim()) return;
              state.command(
                [{ type: "renameLibrary", name }],
                "Rename library",
              );
            }}
          />
          {state.libraries.length > 1 ? (
            <select
              aria-label="Open library"
              value={doc.id}
              onChange={(e) => {
                const libraryId = e.target.value;
                void preserveThen(() => state.openLibrary(libraryId));
              }}
            >
              {state.libraries.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="top-divider scope-divider" />
        <span className="top-scope">
          {selected?.kind === "token"
            ? `${selected.layer === "foundation" ? "Foundation" : "Semantic"} token`
            : selected?.kind === "style"
              ? "Reusable style"
              : selected?.kind === "source"
                ? "Foundation source"
                : selected?.kind === "instance"
                  ? "Instance scope"
                  : "Definition scope"}
        </span>
        <div className="topbar-spacer" />
        <button
          className={`save-status ${saveState.toLowerCase()}`}
          onClick={() => void state.save()}
          title="Save locally / retry"
        >
          <span className="status-dot" />
          {saveState}
        </button>
        <div className="history-controls">
          <button
            className="icon-button"
            aria-label="Undo"
            title={`Undo ${state.past.at(-1)?.label ?? ""} (Ctrl+Z)`}
            disabled={!state.past.length}
            onClick={state.undo}
          >
            <Undo2 size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
            disabled={!state.future.length}
            onClick={state.redo}
          >
            <Redo2 size={17} />
          </button>
        </div>
        <div className="export-menu">
          <button
            className="primary export-button"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            Export <ChevronDown size={14} />
          </button>
          {menu ? (
            <>
              <div className="menu-dismiss" onClick={() => setMenu(false)} />
              <div className="dropdown">
                <button onClick={() => exportFiles("astro")}>
                  <Download size={15} />
                  Astro package<span>.zip</span>
                </button>
                <button onClick={() => exportFiles("portable")}>
                  <Save size={15} />
                  Portable library<span>.formwork</span>
                </button>
                <hr />
                <button
                  onClick={() => {
                    file.current?.click();
                    setMenu(false);
                  }}
                >
                  <Upload size={15} />
                  Import library
                </button>
                <button
                  onClick={() =>
                    void preserveThen(() => {
                      state.forkLibrary();
                      setMenu(false);
                    })
                  }
                >
                  <Copy size={15} />
                  Fork library
                </button>
                <button
                  onClick={() => {
                    setReleasesOpen(true);
                    setMenu(false);
                  }}
                >
                  Library releases
                </button>
                <p>
                  Autosave stays in this browser. Download portable files for
                  backup and transfer.
                </p>
              </div>
            </>
          ) : null}
        </div>
        <input
          hidden
          ref={file}
          type="file"
          accept=".formwork,.json,.zip"
          onChange={(e) => void importFile(e.target.files?.[0])}
        />
        <button
          className="mobile-panel icon-button"
          aria-label="Toggle inspector"
          onClick={() => setRightOpen(!rightOpen)}
        >
          <PanelRightClose size={19} />
        </button>
      </header>
      <nav className="workspace-nav" aria-label="Workspaces">
        {workspaces.map((w, i) => {
          const Icon = navIcons[i];
          return (
            <button
              key={w}
              className={workspace === w ? "active" : ""}
              onClick={() => {
                state.navigate(w);
                setLeftOpen(false);
              }}
            >
              <Icon size={16} />
              {w}
            </button>
          );
        })}
      </nav>
      {error ? (
        <div role="alert" className="error-banner">
          <span>{error}</span>
          {saveState === "Failed" ? (
            <button onClick={() => void state.save()}>Retry save</button>
          ) : null}
          <button
            className="icon-button"
            aria-label="Dismiss error"
            onClick={() => useEditor.setState({ error: "" })}
          >
            <X size={15} />
          </button>
        </div>
      ) : null}
      {!ready ? (
        <div className="loading-screen">Opening your local library…</div>
      ) : (
        <div className="workspace">
          <Browser onCreate={() => setCreate({})} />
          <main
            className={`main-workspace ${isCanvas ? "component-workspace" : ""}`}
          >
            {isCanvas ? (
              <div className="component-editor">
                <AnatomyTree />
                <Canvas />
              </div>
            ) : workspace === "Compositions" ? (
              <Composition onCreate={(r) => setCreate(r)} />
            ) : (
              <Records onCreate={(r) => setCreate(r ?? {})} />
            )}
            <BottomPanel />
          </main>
          <Inspector
            key={selectedId}
            onCreate={(r) => {
              setCreate(r ?? {});
              setRightOpen(false);
            }}
          />
        </div>
      )}
      <footer className="statusbar">
        <span>
          <span className="status-dot" />
          Local-first workspace
        </span>
        <span>
          {Object.keys(doc.entities).length} records · {doc.name}
        </span>
        <span>Ctrl Z undo · Ctrl S save</span>
      </footer>
      {releasesOpen ? (
        <ReleasesDialog onClose={() => setReleasesOpen(false)} />
      ) : null}
      {create ? (
        <CreateDialog request={create} onClose={() => setCreate(null)} />
      ) : null}
      {pending ? (
        <dialog
          ref={review}
          className="modal"
          onCancel={() => setPending(null)}
        >
          <div className="modal-heading">
            <h2>Import library</h2>
            <button
              className="icon-button"
              aria-label="Cancel import"
              onClick={() => setPending(null)}
            >
              <X size={17} />
            </button>
          </div>
          <p>
            <strong>{pending.name}</strong>
          </p>
          <p>
            {Object.keys(pending.entities).length} validated records · Schema v
            {pending.schemaVersion}
          </p>
          <p className="muted">
            Import creates an independent library. Your current library will be
            saved first.
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button
              className="primary"
              onClick={() =>
                void preserveThen(() => {
                  state.importLibrary(pending);
                  setPending(null);
                })
              }
            >
              Import as new library
            </button>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
