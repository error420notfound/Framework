import type { IconLibrary } from "./runtime";
export type CatalogIcon = { name: string; svg?: string; codepoint?: string };
const loaders = {
  lucide: () => import("./catalogs/lucide.json"),
  bootstrap: () => import("./catalogs/bootstrap.json"),
  material: () => import("./catalogs/material.json"),
};
export async function loadIconCatalog(
  library: IconLibrary,
): Promise<CatalogIcon[]> {
  return (await loaders[library]()).default;
}
export function iconProperty(
  doc: { entities: Record<string, unknown> },
  property: string,
  rootId: string,
): boolean {
  const visit = (id: string): boolean => {
    const node = doc.entities[id] as {
      kind?: string;
      primitive?: string;
      expose?: { text?: string };
      children?: string[];
    };
    return (
      !!node &&
      ((node.primitive === "Icon" && node.expose?.text === property) ||
        (node.children ?? []).some(visit))
    );
  };
  return visit(rootId);
}
