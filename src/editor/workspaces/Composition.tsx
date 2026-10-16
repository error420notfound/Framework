import { useMemo, useState } from "react";
import { useEditor } from "../../app/store";
import {
  compileComponent,
  renderComponent,
  tokenCss,
} from "../../renderer/compiler";
import { cssValue } from "../../domain/schema";
import { resolve } from "../../domain/engine";
import { Empty } from "../controls/Fields";
import type { CreateRequest } from "../inspectors/Inspector";
import { sampleScenarios } from "../../starter/collection";
export function Composition({
  onCreate,
}: {
  onCreate: (r: CreateRequest) => void;
}) {
  const { doc, selectedId, themeId, densityId, viewport } = useEditor();
  const c = doc.entities[selectedId];
  const [scenario, setScenario] =
    useState<keyof typeof sampleScenarios>("Connected");
  const html = useMemo(() => {
    if (c?.kind !== "composition") return "";
    let css = tokenCss(doc);
    const nodes = c.instances
      .map((id) => {
        const i = doc.entities[id];
        if (i?.kind !== "instance") return "";
        const compiled = compileComponent(doc, i.componentId);
        css += compiled.css;
        return `<div data-fw-instance="${id}">${renderComponent(doc, compiled, { values: { ...i.configuration, ...(i.componentId === "weight_readout" ? sampleScenarios[scenario] : {}) }, variants: i.variants, overrides: i.overrides })}</div>`;
      })
      .join("");
    return `<!doctype html><html data-fw-theme="${themeId}" data-fw-density="${densityId}"><head><meta http-equiv="Content-Security-Policy" content="default-src 'none';style-src 'unsafe-inline' https://fonts.googleapis.com;img-src data:;font-src data: https://fonts.gstatic.com"><style>${css}body{font:14px system-ui;margin:32px}main{display:${c.layout === "grid" ? "grid" : "flex"};flex-direction:${c.layout === "inline" ? "row" : "column"};gap:${cssValue(resolve(doc, c.gap).value)};grid-template-columns:repeat(${c.columns},minmax(0,1fr));align-items:start;flex-wrap:wrap}@media(max-width:500px){main{grid-template-columns:1fr}}[data-fw-instance]{min-width:0}[data-fw-component]{max-width:100%}</style></head><body><main>${nodes}</main></body></html>`;
  }, [doc, c, themeId, densityId, scenario]);
  if (c?.kind !== "composition")
    return (
      <Empty
        title="Compose a system"
        detail="Create a composition and arrange reusable component instances."
        action={() => onCreate({ kind: "composition" })}
      />
    );
  return (
    <section className="records">
      <div className="workspace-heading">
        <div>
          <h1>{c.name}</h1>
          <p>
            {c.instances.length} reusable instances · {c.layout} layout
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => onCreate({ kind: "instance", parentId: c.id })}
        >
          Add instance
        </button>
      </div>
      <div className="composition-controls">
        <label>
          Theme
          <select
            aria-label="Composition theme"
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
        </label>
        <label>
          Viewport
          <select
            aria-label="Composition viewport"
            value={viewport}
            onChange={(e) =>
              useEditor.setState({ viewport: Number(e.target.value) })
            }
          >
            <option value={320}>320 px</option>
            <option value={768}>768 px</option>
            <option value={1280}>1280 px</option>
          </select>
        </label>
        {c.id === "brew_panel" ? (
          <label>
            Sample data
            <select
              aria-label="Brew scenario"
              value={scenario}
              onChange={(e) =>
                setScenario(e.target.value as keyof typeof sampleScenarios)
              }
            >
              {Object.keys(sampleScenarios).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {!c.instances.length ? (
        <Empty
          title="Add your first instance"
          detail="Each instance keeps a reference to its component definition."
          action={() => onCreate({ kind: "instance", parentId: c.id })}
        />
      ) : (
        <div className="composition-preview">
          <iframe
            className="composition-frame"
            title="Composition preview"
            sandbox="allow-same-origin"
            srcDoc={html}
            style={{ maxWidth: viewport }}
            onLoad={(event) => {
              event.currentTarget.contentDocument?.addEventListener(
                "pointerdown",
                (event) => {
                  const id = (event.target as Element)
                    .closest("[data-fw-instance]")
                    ?.getAttribute("data-fw-instance");
                  if (id) useEditor.getState().select(id);
                },
              );
            }}
          />
        </div>
      )}
      <div className="source-note">
        <h3>Application contract</h3>
        <p>
          Applications supply data and own actions. The sample scenarios do not
          connect to a device or run a timer.
        </p>
        <div className="contract-list">
          {Object.entries(c.dataContract).map(([name, type]) => (
            <code key={name}>
              {name}: {type}
            </code>
          ))}
        </div>
      </div>
    </section>
  );
}
