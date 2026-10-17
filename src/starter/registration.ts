import { execute, references, validate, type Command } from "../domain/engine";
import { newId, type Entity, type LibraryDocument } from "../domain/schema";

export type Preset = Extract<Entity, { kind: "preset" }>;
/** Preset configuration is copied once; the definition reference remains live. */
export function instantiatePreset(
  doc: LibraryDocument,
  presetId: string,
  id = newId("instance"),
): Command[] {
  const preset = doc.entities[presetId];
  if (preset?.kind !== "preset") throw new Error("Select a preset");
  return [
    {
      type: "create",
      entity: {
        id,
        name: preset.name,
        kind: "instance",
        componentId: preset.componentId,
        configuration: structuredClone(preset.configuration),
        variants: { ...preset.variants },
        overrides: structuredClone(preset.overrides),
      },
    },
  ];
}
export function register(
  doc: LibraryDocument,
  entities: Entity[],
  updates: Command[] = [],
) {
  return execute(doc, [
    ...updates,
    ...entities.map((entity) => ({ type: "create" as const, entity })),
  ]);
}
export type InstallPlan = {
  commands: Command[];
  added: string[];
  preserved: string[];
  conflicts: string[];
};
/** Add missing records only. Never replace records, including in independent forks. */
export function planStarterInstall(
  doc: LibraryDocument,
  starter: LibraryDocument,
): InstallPlan {
  const preserved = Object.keys(starter.entities).filter(
    (id) => !!doc.entities[id],
  );
  const conflicts = preserved.filter(
    (id) =>
      JSON.stringify(doc.entities[id]) !== JSON.stringify(starter.entities[id]),
  );
  const blocked = new Set(
    preserved.filter(
      (id) => doc.entities[id].kind !== starter.entities[id].kind,
    ),
  );
  for (const component of Object.values(starter.entities)) {
    if (component.kind !== "component") continue;
    const existing = doc.entities[component.id];
    if (
      existing &&
      !["button", "text_component"].includes(component.id) &&
      component.capabilities &&
      (existing.kind !== "component" ||
        existing.capabilities?.source !== component.capabilities.source)
    )
      blocked.add(component.id);
    if (!existing) {
      const visit = (id: string) => {
        const node = starter.entities[id];
        if (node?.kind !== "node") return;
        if (conflicts.includes(id)) blocked.add(id);
        node.children.forEach(visit);
      };
      visit(component.rootId);
    }
  }
  // Existing definitions own their anatomy. New starter anatomy must not leak into a user's definition.
  for (const component of Object.values(starter.entities)) {
    if (component.kind !== "component" || !doc.entities[component.id]) continue;
    const visit = (id: string) => {
      const n = starter.entities[id];
      if (n?.kind !== "node") return;
      if (!doc.entities[id]) blocked.add(id);
      n.children.forEach(visit);
    };
    visit(component.rootId);
  }
  const refs = references(starter);
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of refs)
      if (blocked.has(r.to) && !doc.entities[r.from] && !blocked.has(r.from)) {
        blocked.add(r.from);
        changed = true;
      }
  }
  // Omit the entire new anatomy of a blocked family rather than leaving orphan parts.
  for (const component of Object.values(starter.entities))
    if (component.kind === "component" && blocked.has(component.id)) {
      const visit = (id: string) => {
        const n = starter.entities[id];
        if (n?.kind !== "node") return;
        if (!doc.entities[id]) blocked.add(id);
        n.children.forEach(visit);
      };
      visit(component.rootId);
    }
  let entities = Object.values(starter.entities).filter(
    (e) => !doc.entities[e.id] && !blocked.has(e.id),
  );
  // A preserved definition may have changed its properties/axes; omit incompatible new presets.
  let candidate = {
    ...doc,
    entities: {
      ...doc.entities,
      ...Object.fromEntries(entities.map((e) => [e.id, e])),
    },
  };
  for (const issue of validate(candidate))
    if (issue.entityId && !doc.entities[issue.entityId])
      blocked.add(issue.entityId);
  changed = true;
  while (changed) {
    changed = false;
    for (const r of refs)
      if (blocked.has(r.to) && !doc.entities[r.from] && !blocked.has(r.from)) {
        blocked.add(r.from);
        changed = true;
      }
  }
  entities = entities.filter((e) => !blocked.has(e.id));
  const commands: Command[] = entities.map((entity) => ({
    type: "create",
    entity,
  }));
  if (commands.length) execute({ ...doc, release: undefined }, commands); // Preflight the exact transaction shown to the user.
  return {
    commands,
    added: entities.map((e) => e.id),
    preserved,
    conflicts: [...new Set([...conflicts, ...blocked])],
  };
}
