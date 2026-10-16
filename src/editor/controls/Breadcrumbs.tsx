import { useEditor } from "../../app/store";
import { componentForNode } from "../../domain/engine";
import { compositionsFor } from "../../app/navigation";
export function Breadcrumbs() {
  const { doc, selectedId, select } = useEditor();
  const e = doc.entities[selectedId];
  if (!e) return null;
  const owner = e.kind === "node" ? componentForNode(doc, e.id) : undefined;
  return (
    <nav className="breadcrumbs" aria-label="Editing context">
      {e.kind === "motion" ? (
        <>
          <button onClick={() => select(e.ownerId)}>
            {doc.entities[e.ownerId]?.name} /
          </button>
          <span>{e.name} · Motion</span>
        </>
      ) : e.kind === "instance" ? (
        <>
          {compositionsFor(doc, e.id).map((c) => (
            <button key={c.id} onClick={() => select(c.id)}>
              {c.name} /
            </button>
          ))}
          <span>{e.name} · Instance</span>
          <button onClick={() => select(e.componentId)}>
            Definition: {doc.entities[e.componentId]?.name}
          </button>
        </>
      ) : (
        <>
          {owner ? (
            <button onClick={() => select(owner.id)}>{owner.name} /</button>
          ) : null}
          <span>
            {e.name} ·{" "}
            {e.kind === "node"
              ? "Definition anatomy"
              : e.kind === "component" || e.kind === "composition"
                ? "Definition"
                : e.kind}
          </span>
        </>
      )}
    </nav>
  );
}
