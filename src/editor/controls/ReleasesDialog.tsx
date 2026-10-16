import { useEffect, useRef, useState } from "react";
import { X, Download, Copy, Plus } from "lucide-react";
import { useEditor } from "../../app/store";
import {
  createRelease,
  adoptRelease,
  type Release,
} from "../../domain/releases";
import { newId } from "../../domain/schema";
import {
  download,
  loadReleases,
  portableBytes,
  saveRelease,
} from "../../persistence/library";
export function ReleasesDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { doc, save, importLibrary } = useEditor();
  const [releases, setReleases] = useState<Release[]>([]),
    [version, setVersion] = useState("0.1.0"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    loadReleases()
      .then(setReleases)
      .catch((e) => setError(e.message));
  }, []);
  async function snapshot() {
    setBusy(true);
    try {
      await save();
      if (useEditor.getState().saveState !== "Saved")
        throw new Error("Save the current draft before creating a snapshot.");
      const release = createRelease(useEditor.getState().doc, version);
      await saveRelease(release);
      setReleases(await loadReleases());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function adopt(r: Release) {
    await save();
    if (useEditor.getState().saveState !== "Saved") return;
    const document = adoptRelease(
      r,
      newId("library"),
      `${r.document.name} ${r.version} draft`,
    );
    useEditor.setState({
      doc: document,
      past: [],
      future: [],
      selectedId: "",
      themeId: document.themeId,
      densityId: document.densityId,
      saveState: "Unsaved",
    });
    await useEditor.getState().save();
    onClose();
  }
  return (
    <dialog className="modal releases-modal" ref={dialog} onCancel={onClose}>
      <div className="modal-heading">
        <h2>Library releases</h2>
        <button
          className="icon-button"
          aria-label="Close releases"
          onClick={onClose}
        >
          <X size={17} />
        </button>
      </div>
      <p className="muted">
        Immutable local snapshots. Adopting creates an independent draft;
        existing libraries keep their chosen version.
      </p>
      <div className="release-create">
        <input
          aria-label="Release version"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="0.1.0"
        />
        <button
          className="primary"
          disabled={busy}
          onClick={() => void snapshot()}
        >
          <Plus size={14} />
          Create snapshot
        </button>
      </div>
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      <div className="release-list">
        {releases.length ? (
          releases.map((r) => (
            <div className="release-row" key={r.id}>
              <div>
                <strong>
                  {r.document.name} · {r.version}
                </strong>
                <span className="muted small">
                  Revision {r.revision} ·{" "}
                  {new Date(r.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                className="icon-button"
                aria-label={`Download ${r.version}`}
                onClick={() =>
                  download(
                    portableBytes(r.document),
                    `${r.document.name}-${r.version}.formwork`,
                  )
                }
              >
                <Download size={15} />
              </button>
              <button className="secondary" onClick={() => void adopt(r)}>
                <Copy size={13} />
                Adopt
              </button>
            </div>
          ))
        ) : (
          <p className="small muted">No snapshots yet.</p>
        )}
      </div>
    </dialog>
  );
}
