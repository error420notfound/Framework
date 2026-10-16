import { dependencyDestination, downstreamReferences } from "../dependencies";
import { ChevronDown, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { useEditor } from "../../app/store";
import { resolve, usedBy, validate } from "../../domain/engine";
import { cssValue } from "../../domain/schema";
import { lazy, Suspense } from "react";
const MotionPanel = lazy(() =>
  import("./MotionPanel").then((module) => ({ default: module.MotionPanel })),
);
export function BottomPanel() {
  const { doc, selectedId, bottom, panelOpen, select } = useEditor();
  const e = doc.entities[selectedId];
  const uses = usedBy(doc, selectedId);
  const issues = validate(doc);
  const downstream = downstreamReferences(doc, selectedId);
  const consumer = (r: (typeof uses)[number], i: number) => {
    const dest = dependencyDestination(doc, r);
    return (
      <div className="consumer" key={r.from + ":" + i}>
        <button
          onClick={() => {
            select(dest.id, dest.scope);
            if (dest.viewport) useEditor.setState({ viewport: dest.viewport });
            if (dest.variants)
              useEditor.setState({
                variants: dest.variants,
                states: dest.states ?? [],
              });
          }}
        >
          {dest.label}
          <ArrowUpRight size={13} />
        </button>
        <details>
          <summary>Technical details</summary>
          <code>
            {r.from} → {r.to} · {r.path.join(".")}
          </code>
        </details>
      </div>
    );
  };
  let chain: string[] = [];
  let value = "";
  try {
    if (e?.kind === "token" || e?.kind === "source") {
      const r = resolve(doc, { ref: e.id });
      chain = r.chain;
      value = cssValue(r.value);
    } else if (e?.kind === "node") {
      const style = e.styleId ? doc.entities[e.styleId] : undefined;
      const b =
        e.bindings.background ??
        Object.values(e.bindings)[0] ??
        (style?.kind === "style"
          ? (style.bindings.fontSize ?? Object.values(style.bindings)[0])
          : undefined);
      if (b) {
        const r = resolve(doc, b);
        chain = r.chain;
        value = cssValue(r.value);
      }
    }
  } catch {}
  return (
    <section className={`bottom-panel ${panelOpen ? "open" : ""}`}>
      <div className="bottom-tabs">
        {(["Dependencies", "Validation", "Motion"] as const).map((tab) => (
          <button
            key={tab}
            className={bottom === tab ? "active" : ""}
            aria-expanded={bottom === tab && panelOpen}
            onClick={() =>
              useEditor.setState({
                bottom: tab,
                panelOpen: bottom === tab ? !panelOpen : true,
              })
            }
          >
            {tab}
            {tab === "Validation" ? <span>{issues.length}</span> : null}
          </button>
        ))}
        <span className="bottom-scope">
          {e?.name ?? "Library document"} ·{" "}
          {new Set(uses.map((r) => r.from)).size} direct · {downstream.length}{" "}
          transitive downstream
        </span>
        <button
          className="icon-button"
          aria-label="Toggle bottom panel"
          onClick={() => useEditor.setState({ panelOpen: !panelOpen })}
        >
          <ChevronDown
            size={16}
            style={{ transform: panelOpen ? "none" : "rotate(180deg)" }}
          />
        </button>
      </div>
      {panelOpen ? (
        <div className="bottom-content">
          {bottom === "Motion" ? (
            <Suspense
              fallback={<p className="small muted">Loading motion tools…</p>}
            >
              <MotionPanel />
            </Suspense>
          ) : bottom === "Validation" ? (
            <div className="validation-list">
              {issues.length ? (
                issues.map((i, index) => (
                  <button
                    key={index}
                    onClick={() => i.entityId && select(i.entityId)}
                  >
                    {i.message}
                  </button>
                ))
              ) : (
                <p>
                  <CheckCircle2 size={17} />
                  Document is valid. References, types and anatomy checks pass.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="source-chain">
                <h3>Reference chain</h3>
                {chain.length ? (
                  chain.map((id, i) => (
                    <div className="chain-step" key={id}>
                      <span className="chain-line">{i ? "↑" : "○"}</span>
                      <button className="text-link" onClick={() => select(id)}>
                        {doc.entities[id]?.name}
                      </button>
                      <span className="muted small">
                        {doc.entities[id]?.kind}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="small muted">
                    Select a token or a bound part to follow its source.
                  </p>
                )}
                {value ? <code className="resolved-chain">{value}</code> : null}
              </div>
              <div className="used-by">
                <h3>
                  Direct consumers{" "}
                  <span>{new Set(uses.map((r) => r.from)).size}</span>
                </h3>
                {uses.length ? (
                  uses.map(consumer)
                ) : (
                  <p className="small muted">
                    No direct consumers of this record.
                  </p>
                )}
                <h3>
                  Transitive downstream consumers{" "}
                  <span>{downstream.length}</span>
                </h3>
                {downstream.map(consumer)}
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
