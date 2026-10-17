import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "../../app/store";
import { createCompleteStarter } from "../../starter/collection";
import {
  instantiatePreset,
  planStarterInstall,
} from "../../starter/registration";
import { previewHtml } from "../../renderer/compiler";
const starter = createCompleteStarter();
export function StarterGallery({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { doc, command, select } = useEditor();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("preset"),
    [install, setInstall] = useState(false);
  const plan = useMemo(() => planStarterInstall(doc, starter), [doc]);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  const items = Object.values(doc.entities).filter(
    (e) =>
      e.kind === category && e.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <dialog
      ref={dialog}
      className="starter-gallery"
      aria-label="Library gallery"
      onCancel={onClose}
    >
      <div className="pane-heading">
        Library gallery{" "}
        <button onClick={onClose} aria-label="Close library gallery">
          Close
        </button>
      </div>
      <div className="gallery-toolbar">
        <input
          aria-label="Search gallery"
          placeholder="Search library…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Gallery category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="component">Components</option>
          <option value="preset">Presets</option>
          <option value="composition">Compositions</option>
        </select>
        <button onClick={() => setInstall(!install)}>
          Review starter additions
        </button>
      </div>
      {install ? (
        <section className="install-review">
          <h3>Additive starter installation</h3>
          <p>
            {plan.added.length} missing records can be added.{" "}
            {plan.preserved.length} existing records stay unchanged. Existing
            IDs win; incompatible dependent presets are skipped. Forks remain
            independent. This update adds missing records only.
          </p>
          <details>
            <summary>
              Preserved differences and conflicts ({plan.conflicts.length})
            </summary>
            <ul>
              {plan.conflicts.map((id) => (
                <li key={id}>
                  {doc.entities[id]?.name ?? starter.entities[id]?.name ?? id}{" "}
                  <code>{id}</code>
                </li>
              ))}
            </ul>
          </details>
          <details>
            <summary>Records to add ({plan.added.length})</summary>
            <ul>
              {plan.added.map((id) => (
                <li key={id}>
                  {starter.entities[id]?.name} · {starter.entities[id]?.kind}
                </li>
              ))}
            </ul>
          </details>
          <button
            disabled={!plan.commands.length || !!doc.release}
            onClick={() =>
              command(plan.commands, "Install missing starter records")
            }
          >
            Install {plan.added.length} missing records
          </button>
        </section>
      ) : null}
      <p className="small muted">
        Presets copy their configuration at insertion and keep a live definition
        reference. Later preset edits do not propagate. Definition edits inherit
        normally; instance overrides stay local.
      </p>
      <div className="gallery-grid">
        {items.map((e) => {
          const c =
            e.kind === "component"
              ? e
              : e.kind === "preset"
                ? doc.entities[e.componentId]
                : undefined;
          return (
            <article key={e.id} className="gallery-card">
              <h3>{e.name}</h3>
              <span className="small muted">{e.kind}</span>
              {c?.kind === "component" ? (
                <>
                  <p className="small">
                    {c.capabilities
                      ? `${c.capabilities.targets.join(", ")} · ${c.capabilities.dependencies.length ? c.capabilities.dependencies.join(", ") : "No client dependencies"} · hydration: ${c.capabilities.hydration}`
                      : "Native Astro / HTML · no client runtime"}
                  </p>
                  <p className="small muted">{c.capabilities?.limits}</p>
                  <details>
                    <summary>Preview and source</summary>
                    <iframe
                      loading="lazy"
                      sandbox=""
                      title={`${e.name} gallery preview`}
                      srcDoc={previewHtml(
                        doc,
                        c.id,
                        { themeId: doc.themeId, densityId: doc.densityId },
                        e.kind === "preset"
                          ? {
                              values: e.configuration,
                              variants: e.variants,
                              overrides: e.overrides,
                            }
                          : {},
                      )}
                    />
                    {c.capabilities ? (
                      <a
                        href={c.capabilities.source}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Official reference
                      </a>
                    ) : null}
                  </details>
                </>
              ) : null}
              {e.kind === "preset" ? (
                <>
                  <p className="small">{e.description}</p>
                  <button
                    disabled={!!doc.release}
                    onClick={() => {
                      const commands = instantiatePreset(doc, e.id);
                      command(commands, `Insert ${e.name}`);
                      const created = commands[0];
                      if (
                        created.type === "create" &&
                        useEditor.getState().doc.entities[created.entity.id]
                      ) {
                        select(created.entity.id);
                        onClose();
                      }
                    }}
                  >
                    Insert preset
                  </button>
                  <button
                    onClick={() => {
                      select(e.id);
                      onClose();
                    }}
                  >
                    Edit preset
                  </button>
                  <button
                    onClick={() => {
                      select(e.componentId);
                      onClose();
                    }}
                  >
                    Edit definition
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    select(e.id);
                    onClose();
                  }}
                >
                  Edit {e.kind}
                </button>
              )}
            </article>
          );
        })}
      </div>
      {!items.length ? (
        <p>
          No matching {category}s. Review starter additions to install missing
          records.
        </p>
      ) : null}
    </dialog>
  );
}
