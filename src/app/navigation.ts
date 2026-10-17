import type { Entity, LibraryDocument } from "../domain/schema";
import { componentForNode } from "../domain/engine";
import type { Workspace } from "./store";
export function workspaceFor(e: Entity, doc?: LibraryDocument): Workspace {
  if (e.kind === "motion" && doc?.entities[e.ownerId])
    return doc.entities[e.ownerId].kind === "composition"
      ? "Compositions"
      : "Components";
  if (e.kind === "token")
    return e.layer === "foundation" ? "Foundation tokens" : "Semantic tokens";
  if (e.kind === "source" || e.kind === "asset") return "Foundations";
  if (e.kind === "theme") return "Themes";
  if (e.kind === "style") return "Styles";
  if (e.kind === "instance" || e.kind === "composition") return "Compositions";
  return "Components";
}
export function selectionContext(
  doc: LibraryDocument,
  id: string,
  workspace: Workspace,
) {
  const e = doc.entities[id];
  if (
    !e ||
    (workspaceFor(e, doc) !== workspace &&
      !(workspace === "Primitives" && e.kind === "node"))
  )
    return { selectedId: "", componentId: "", bindingScope: "base" };
  const owner = e.kind === "node" ? componentForNode(doc, id) : undefined;
  return {
    selectedId: id,
    componentId:
      e.kind === "motion"
        ? doc.entities[e.ownerId]?.kind === "component"
          ? e.ownerId
          : ""
        : e.kind === "component"
          ? id
          : (e.kind === "instance" || e.kind === "preset")
            ? e.componentId
            : (owner?.id ?? ""),
    bindingScope: "base",
  };
}
export function compositionsFor(doc: LibraryDocument, instanceId: string) {
  return Object.values(doc.entities).filter(
    (e) => e.kind === "composition" && e.instances.includes(instanceId),
  );
}
