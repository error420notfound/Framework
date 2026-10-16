import type { LibraryDocument } from "../domain/schema";
import { componentForNode, references, type Reference } from "../domain/engine";
import { propertyLabel } from "./resolution";
export function dependencyDestination(doc: LibraryDocument, r: Reference) {
  const e = doc.entities[r.from];
  const path = r.path;
  let id = r.from,
    scope = "base";
  let labels = [e?.name ?? r.from];
  let viewport: number | undefined;
  let variants: Record<string, string> | undefined,
    states: import("../domain/schema").State[] | undefined;
  if (e?.kind === "motion") {
    labels = [doc.entities[e.ownerId]?.name ?? e.ownerId, e.name];
    if (path[0] === "clips") {
      const clip = e.clips[Number(path[1])];
      if (clip) {
        scope = "clip:" + clip.id;
        labels.push(
          doc.entities[clip.targetId]?.name ?? clip.targetId,
          clip.property,
        );
      }
    }
  }
  if (e?.kind === "node") {
    const owner = componentForNode(doc, e.id);
    if (owner) labels.unshift(owner.name);
  }
  if (e?.kind === "component" && path[0] === "rules") {
    const rule = e.rules[Number(path[1])];
    if (rule) {
      scope = "rule:" + rule.id;
      labels.push(rule.name);
      variants = { ...e.defaults, ...rule.when.variants };
      states = rule.when.states;
    }
    if (path[2] === "patch") {
      id = String(path[3]);
      labels.push(doc.entities[id]?.name ?? id);
    }
  } else if (path[0] === "overrides" && e?.kind === "instance") {
    scope = "instance:" + String(path[1]);
    labels.push(
      "Instance override",
      doc.entities[String(path[1])]?.name ?? String(path[1]),
    );
  } else if (path[0] === "assignments") {
    labels.push(doc.entities[String(path[1])]?.name ?? String(path[1]));
  } else if (path[0] === "responsive" && e?.kind === "component") {
    viewport = e.responsive[Number(path[1])]?.maxWidth;
    scope = "responsive:" + viewport;
    labels.push("≤ " + e.responsive[Number(path[1])]?.maxWidth + " px");
    id = String(path[3]);
    labels.push(doc.entities[id]?.name ?? id);
  }
  const prop = path.at(-1) === "ref" ? path.at(-2) : undefined;
  if (prop && prop !== "binding") labels.push(propertyLabel(String(prop)));
  if (path[0] === "styleId") labels.push("Shared style");
  const duplicates =
    Object.values(doc.entities).filter(
      (x) => x.name === e?.name && x.kind === e?.kind,
    ).length > 1;
  return {
    id,
    scope,
    label: labels.join(" → ") + (duplicates ? " [" + r.from + "]" : ""),
    variants,
    states,
    viewport,
  };
}
export function downstreamReferences(doc: LibraryDocument, id: string) {
  const refs = references(doc),
    direct = new Set(refs.filter((r) => r.to === id).map((r) => r.from));
  const seen = new Set([id, ...direct]);
  const queue = [...direct];
  const result: Reference[] = [];
  while (queue.length) {
    const current = queue.shift()!;
    for (const r of refs)
      if (r.to === current && !seen.has(r.from)) {
        seen.add(r.from);
        queue.push(r.from);
        result.push(r);
      }
  }
  return result;
}
