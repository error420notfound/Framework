import { references, validate } from "../domain/engine";
import type { LibraryDocument } from "../domain/schema";
/** Keep exactly the selected authored roots and their forward dependency closure. */
export function exportSelection(
  doc: LibraryDocument,
  ids: string[],
  target: "astro" | "html" = "astro",
): LibraryDocument {
  if (!ids.length)
    throw new Error(
      "Select at least one component, preset or composition to export.",
    );
  const keep = new Set<string>();
  const refs = references(doc);
  const visit = (id: string) => {
    if (keep.has(id)) return;
    const e = doc.entities[id];
    if (!e) throw new Error(`Missing export dependency: ${id}`);
    keep.add(id);
    if (e.kind === "theme") return;
    for (const r of refs) if (r.from === id) visit(r.to);
    if (e.kind === "component") {
      if (e.capabilities && !e.capabilities.targets.includes(target))
        throw new Error(
          `${e.name} does not support ${target}. Supported targets: ${e.capabilities.targets.join(", ")}. ${e.capabilities.limits}`,
        );
      for (const p of e.properties)
        if (p.type === "asset" && p.default) visit(String(p.default));
    }
    if (e.kind === "instance" || e.kind === "preset") {
      const c = doc.entities[e.componentId];
      if (c?.kind === "component")
        for (const p of c.properties)
          if (p.type === "asset" && e.configuration[p.id])
            visit(String(e.configuration[p.id]));
    }
    if (e.kind === "component" || e.kind === "composition")
      for (const m of Object.values(doc.entities))
        if (m.kind === "motion" && m.ownerId === id) visit(m.id);
  };
  ids.forEach((id) => {
    if (
      !["component", "composition", "preset", "instance"].includes(
        doc.entities[id]?.kind,
      )
    )
      throw new Error("Select a component, preset, instance or composition.");
    visit(id);
  });
  Object.values(doc.entities)
    .filter((e) => e.kind === "theme")
    .forEach((e) => keep.add(e.id));
  let count = -1;
  while (count !== keep.size) {
    count = keep.size;
    for (const e of Object.values(doc.entities))
      if (e.kind === "theme")
        for (const [id, b] of Object.entries(e.assignments))
          if (keep.has(id) && "ref" in b) visit(b.ref);
  }
  const entities = Object.fromEntries(
    [...keep].map((id) => {
      const e = doc.entities[id];
      return [
        id,
        e.kind === "theme"
          ? {
              ...e,
              assignments: Object.fromEntries(
                Object.entries(e.assignments).filter(([key]) => keep.has(key)),
              ),
            }
          : e,
      ];
    }),
  );
  const selected = { ...doc, entities };
  const issues = validate(selected);
  if (issues.length) throw new Error(issues.map((i) => i.message).join("\n"));
  return selected;
}
