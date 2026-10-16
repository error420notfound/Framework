import { IconPicker } from "../controls/IconPicker";
import { iconProperty } from "../../icons/catalog";
import { useMemo } from "react";
import { useEditor } from "../../app/store";
import { previewHtml } from "../../renderer/compiler";
import { states, type State } from "../../domain/schema";
import { Monitor, Smartphone } from "lucide-react";
import { Empty } from "../controls/Fields";
export function Canvas() {
  const {
    doc,
    componentId,
    themeId,
    densityId,
    variants,
    states: active,
    previewValues,
    viewport,
    selectedId,
  } = useEditor();
  const selected = doc.entities[selectedId];
  const instance = selected?.kind === "instance" ? selected : undefined;
  const id = instance?.componentId ?? componentId;
  const c = doc.entities[id];
  const html = useMemo(() => {
    try {
      return previewHtml(
        doc,
        id,
        { themeId, densityId },
        {
          variants: { ...variants, ...instance?.variants },
          states: active,
          values: { ...previewValues, ...instance?.configuration },
          overrides: instance?.overrides,
        },
        viewport,
      );
    } catch (e) {
      return `<p>${String(e)}</p>`;
    }
  }, [
    doc,
    id,
    themeId,
    densityId,
    variants,
    active,
    previewValues,
    viewport,
    instance,
  ]);
  if (c?.kind !== "component")
    return (
      <Empty
        title="Choose a component"
        detail="Create a definition, then assemble its anatomy."
      />
    );
  function toggle(state: State) {
    let next = active.includes(state)
      ? active.filter((s) => s !== state)
      : [...active, state];
    if (state === "disabled" && next.includes("disabled"))
      next = next.filter((s) => s !== "hover" && s !== "pressed");
    if ((state === "hover" || state === "pressed") && next.includes(state))
      next = next.filter((s) => s !== "disabled");
    useEditor.setState({ states: next });
  }
  return (
    <section className="canvas-workspace">
      <div className="context-toolbar">
        <div className="context-group">
          <span>Colour theme</span>
          <select
            aria-label="Preview theme"
            value={themeId}
            onChange={(e) => useEditor.setState({ themeId: e.target.value })}
          >
            {Object.values(doc.entities)
              .filter((e) => e.kind === "theme" && e.axis === "color")
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </select>
        </div>
        <div className="context-group">
          <span>Density</span>
          <select
            aria-label="Preview density"
            value={densityId}
            onChange={(e) => useEditor.setState({ densityId: e.target.value })}
          >
            {Object.values(doc.entities)
              .filter((e) => e.kind === "theme" && e.axis === "density")
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </select>
        </div>
        <div className="context-group">
          <span>Viewport</span>
          <div className="viewport-select">
            <Monitor size={14} />
            <select
              aria-label="Preview viewport"
              value={viewport}
              onChange={(e) =>
                useEditor.setState({ viewport: Number(e.target.value) })
              }
            >
              <option value={320}>320 px</option>
              <option value={768}>768 px</option>
              <option value={1280}>1280 px</option>
            </select>
          </div>
        </div>
        {Object.entries(c.axes).map(([axis, choices]) => (
          <div className="context-group" key={axis}>
            <span>{axis}</span>
            <div className="segmented">
              {choices.map((v) => (
                <button
                  key={v}
                  aria-pressed={(variants[axis] ?? c.defaults[axis]) === v}
                  onClick={() =>
                    useEditor.setState({ variants: { ...variants, [axis]: v } })
                  }
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="canvas-title">
        <span>
          {c.name}{" "}
          <span className="muted">
            / {instance ? "Instance" : "Definition"} preview
          </span>
        </span>
        <span className="muted">
          {viewport < 400 ? <Smartphone size={13} /> : <Monitor size={13} />}{" "}
          {viewport} px
        </span>
      </div>
      <div className="preview-frame">
        <iframe
          title="Component preview"
          sandbox="allow-same-origin"
          srcDoc={html}
          style={{ maxWidth: viewport }}
          onLoad={(event) => {
            const frame = event.currentTarget;
            frame.contentDocument?.addEventListener("pointerdown", (event) => {
              const target = (event.target as Element).closest(
                "[data-fw-part]",
              );
              const id = target?.getAttribute("data-fw-part");
              if (id && !instance) useEditor.getState().select(id);
            });
          }}
        />
      </div>
      <div className="state-heading">
        <h3>Component states</h3>
        <button
          className="text-link"
          onClick={() => useEditor.setState({ states: [] })}
        >
          Reset preview
        </button>
      </div>
      <div className="state-controls">
        {states.map((state) => (
          <label key={state} className={active.includes(state) ? "active" : ""}>
            <input
              type="checkbox"
              checked={active.includes(state)}
              onChange={() => toggle(state)}
            />
            {state === "focus-visible"
              ? "Focus-visible"
              : state[0].toUpperCase() + state.slice(1)}
          </label>
        ))}
      </div>
      <p className="preview-note">
        States combine in this preview. Disabled and loading block activation;
        focus remains additive.
      </p>
      <div className="preview-content">
        <h3>Instance content</h3>
        {c.properties
          .filter((p) => !["disabled", "loading"].includes(p.id))
          .map((p) =>
            iconProperty(doc, p.id, c.rootId) ? (
              <IconPicker
                key={id + "-" + p.id}
                label={`Preview ${p.name}`}
                value={String(previewValues[p.id] ?? p.default)}
                onChange={(value) =>
                  useEditor.setState({
                    previewValues: { ...previewValues, [p.id]: value },
                  })
                }
              />
            ) : (
              <label className="inline-field" key={p.id}>
                <span>{p.name}</span>
                {p.type === "boolean" ? (
                  <input
                    type="checkbox"
                    checked={Boolean(previewValues[p.id] ?? p.default)}
                    onChange={(e) =>
                      useEditor.setState({
                        previewValues: {
                          ...previewValues,
                          [p.id]: e.target.checked,
                        },
                      })
                    }
                  />
                ) : p.type === "asset" ? (
                  <select
                    aria-label={`Preview ${p.name}`}
                    value={String(previewValues[p.id] ?? p.default)}
                    onChange={(e) =>
                      useEditor.setState({
                        previewValues: {
                          ...previewValues,
                          [p.id]: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="">No asset</option>
                    {Object.values(doc.entities)
                      .filter(
                        (e) =>
                          e.kind === "asset" && e.mediaType.startsWith("image"),
                      )
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    type={p.type === "number" ? "number" : "text"}
                    aria-label={`Preview ${p.name}`}
                    value={String(previewValues[p.id] ?? p.default)}
                    onChange={(e) =>
                      useEditor.setState({
                        previewValues: {
                          ...previewValues,
                          [p.id]:
                            p.type === "number"
                              ? Number(e.target.value)
                              : e.target.value,
                        },
                      })
                    }
                  />
                )}
              </label>
            ),
          )}
      </div>
    </section>
  );
}
