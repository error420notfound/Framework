import {
  documentSchema,
  isRef,
  propertyTypes,
  type Binding,
  type ComponentEntity,
  type DesignValue,
  type Diagnostic,
  type Entity,
  type LibraryDocument,
  type NodeEntity,
  type ValueType,
} from "./schema";

export type Context = { themeId?: string; densityId?: string };
export function resolve(
  doc: LibraryDocument,
  binding: Binding,
  context: Context = {},
  seen: string[] = [],
): { value: DesignValue; chain: string[] } {
  if (!isRef(binding)) return { value: binding.value, chain: seen };
  const id = binding.ref;
  if (seen.includes(id))
    throw new Error(`Reference cycle: ${[...seen, id].join(" → ")}`);
  const entity = doc.entities[id];
  if (!entity) throw new Error(`Missing reference: ${id}`);
  if (entity.kind === "source")
    return { value: entity.value, chain: [...seen, id] };
  if (entity.kind !== "token")
    throw new Error(`${entity.name} is not a token or value source`);
  const themes = [
    context.themeId ?? doc.themeId,
    context.densityId ?? doc.densityId,
  ]
    .map((t) => doc.entities[t])
    .filter((e) => e?.kind === "theme");
  const assignments = themes.map((t) => t.assignments[id]).filter(Boolean);
  if (assignments.length > 1)
    throw new Error(`Theme/density assignment conflict: ${entity.name}`);
  const result = resolve(doc, assignments[0] ?? entity.binding, context, [
    ...seen,
    id,
  ]);
  if (result.value.type !== entity.valueType)
    throw new Error(
      `Type mismatch: ${entity.name} expects ${entity.valueType}, received ${result.value.type}`,
    );
  return result;
}

export type Reference = { from: string; to: string; path: (string | number)[] };
export function references(doc: LibraryDocument): Reference[] {
  const found: Reference[] = [];
  function walk(v: unknown, from: string, path: (string | number)[]) {
    if (!v || typeof v !== "object") return;
    for (const [k, value] of Object.entries(v)) {
      if (
        [
          "ref",
          "styleId",
          "rootId",
          "componentId",
          "assetId",
          "ownerId",
          "targetId",
        ].includes(k) &&
        typeof value === "string"
      )
        found.push({ from, to: value, path: [...path, k] });
      else if (["children", "instances"].includes(k) && Array.isArray(value))
        value.forEach((to, i) =>
          found.push({ from, to, path: [...path, k, i] }),
        );
      else if (
        ["assignments", "patch", "overrides"].includes(k) &&
        value &&
        typeof value === "object"
      )
        for (const [key, b] of Object.entries(value)) {
          found.push({ from, to: key, path: [...path, k, key] });
          walk(b, from, [...path, k, key]);
        }
      else if (k !== "expose") walk(value, from, [...path, k]);
    }
  }
  for (const e of Object.values(doc.entities)) walk(e, e.id, []);
  return found;
}
export const usedBy = (doc: LibraryDocument, id: string) =>
  references(doc).filter((r) => r.to === id);
export function descendants(
  doc: LibraryDocument,
  root: string,
  seen = new Set<string>(),
): string[] {
  if (seen.has(root)) throw new Error("Anatomy cycle");
  seen.add(root);
  const n = doc.entities[root];
  if (n?.kind !== "node") throw new Error(`Missing anatomy node: ${root}`);
  return [
    root,
    ...n.children.flatMap((c) => descendants(doc, c, new Set(seen))),
  ];
}
export function validate(doc: LibraryDocument): Diagnostic[] {
  const issues: Diagnostic[] = [];
  const add = (code: string, message: string, entityId?: string) =>
    issues.push({ code, message, entityId });
  for (const [key, e] of Object.entries(doc.entities))
    if (key !== e.id) add("identity", "Entity key differs from stable ID", key);
  for (const r of references(doc))
    if (!doc.entities[r.to])
      add("missing", `Missing ${r.to} at ${r.path.join(".")}`, r.from);
  for (const [id, axis] of [
    [doc.themeId, "color"],
    [doc.densityId, "density"],
  ]) {
    const t = doc.entities[id];
    if (t?.kind !== "theme" || t.axis !== axis)
      add("mode", `Invalid ${axis} selection`, id);
  }
  const colors = Object.values(doc.entities).filter(
    (e) => e.kind === "theme" && e.axis === "color",
  );
  const densities = Object.values(doc.entities).filter(
    (e) => e.kind === "theme" && e.axis === "density",
  );
  const contexts = colors.flatMap((t) =>
    densities.map((d) => ({ themeId: t.id, densityId: d.id })),
  );
  const check = (b: Binding, type: ValueType | undefined, id: string) => {
    for (const ctx of contexts.length ? contexts : [{}])
      try {
        const r = resolve(doc, b, ctx);
        if (type && r.value.type !== type)
          throw new Error(`Expected ${type}, received ${r.value.type}`);
      } catch (err) {
        add("binding", (err as Error).message, id);
      }
  };
  for (const e of Object.values(doc.entities)) {
    if (e.kind === "token") check({ ref: e.id }, e.valueType, e.id);
    if (e.kind === "theme")
      for (const [id, b] of Object.entries(e.assignments)) {
        const token = doc.entities[id];
        if (token?.kind !== "token")
          add("theme", "Assignments require a token", e.id);
        check(b, token?.kind === "token" ? token.valueType : undefined, e.id);
      }
    if (e.kind === "style" || e.kind === "node")
      for (const [p, b] of Object.entries(e.bindings)) {
        if (!propertyTypes[p])
          add("property", `Unsupported property ${p}`, e.id);
        else check(b, propertyTypes[p], e.id);
      }
    if (e.kind === "node") {
      if (
        e.props.tag &&
        !(
          (e.primitive === "Text" &&
            [
              "span",
              "p",
              "h1",
              "h2",
              "h3",
              "h4",
              "blockquote",
              "code",
            ].includes(e.props.tag)) ||
          (["Surface", "Stack"].includes(e.primitive) &&
            ["section", "article"].includes(e.props.tag))
        )
      )
        add("anatomy", "Semantic tag is incompatible with the primitive", e.id);
      if (e.styleId && doc.entities[e.styleId]?.kind !== "style")
        add("style", "Invalid style reference", e.id);
      if (e.props.assetId && doc.entities[e.props.assetId]?.kind !== "asset")
        add("asset", "Invalid asset reference", e.id);
      if (
        [
          "Text",
          "Icon",
          "Image",
          "TextField",
          "Checkbox",
          "Separator",
          "Progress",
          "Spinner",
          "Skeleton",
        ].includes(e.primitive) &&
        e.children.length
      )
        add("anatomy", `${e.primitive} cannot have children`, e.id);
      if (
        e.props.href &&
        !/^(https?:\/\/|mailto:|tel:|\/|#)/.test(e.props.href)
      )
        add("url", "Unsafe link URL", e.id);
      try {
        descendants(doc, e.id);
      } catch (err) {
        add("anatomy", (err as Error).message, e.id);
      }
    }
    if (e.kind === "node") {
      const allowedParents: Record<string, string[]> = {
        TableHead: ["Table"],
        TableBody: ["Table"],
        TableCaption: ["Table"],
        TableRow: ["TableHead", "TableBody"],
        TableHeader: ["TableRow"],
        TableCell: ["TableRow"],
      };
      const allowedChildren: Record<string, string[]> = {
        Table: ["TableCaption", "TableHead", "TableBody"],
        TableHead: ["TableRow"],
        TableBody: ["TableRow"],
        TableRow: ["TableHeader", "TableCell"],
      };
      if (
        allowedChildren[e.primitive] &&
        e.children.some((id) => {
          const child = doc.entities[id];
          return (
            child?.kind !== "node" ||
            !allowedChildren[e.primitive].includes(child.primitive)
          );
        })
      )
        add(
          "anatomy",
          "Table anatomy requires valid native table children",
          e.id,
        );
      if (allowedParents[e.primitive]) {
        const parents = Object.values(doc.entities).filter(
          (p) => p.kind === "node" && p.children.includes(e.id),
        );
        if (
          parents.some(
            (p) =>
              p.kind === "node" &&
              !allowedParents[e.primitive].includes(p.primitive),
          )
        )
          add("anatomy", "Invalid native table parent", e.id);
      }
    }
    if (e.kind === "component") {
      try {
        const nodes = descendants(doc, e.rootId);
        if (
          [
            "TableHead",
            "TableBody",
            "TableRow",
            "TableHeader",
            "TableCell",
            "TableCaption",
          ].includes((doc.entities[e.rootId] as NodeEntity).primitive)
        )
          throw new Error("Table parts require a Table component root");
        if (
          e.axes.element &&
          ((doc.entities[e.rootId] as NodeEntity).primitive !== "Text" ||
            e.axes.element.some(
              (tag) =>
                ![
                  "span",
                  "p",
                  "h1",
                  "h2",
                  "h3",
                  "h4",
                  "blockquote",
                  "code",
                ].includes(tag),
            ))
        )
          throw new Error(
            "Element axis requires a Text root and supported semantic elements",
          );
        const visited = new Set<string>();
        function nesting(id: string, interactive: boolean) {
          const n = doc.entities[id] as NodeEntity;
          if (visited.has(id))
            throw new Error("Anatomy nodes must have one parent");
          visited.add(id);
          if (
            ["Button", "Inline"].includes(n.primitive) &&
            n.children.some(
              (id) =>
                ["Surface", "Stack", "Grid", "Table", "Separator"].includes(
                  (doc.entities[id] as NodeEntity).primitive,
                ) ||
                [
                  "p",
                  "h1",
                  "h2",
                  "h3",
                  "h4",
                  "blockquote",
                  "section",
                  "article",
                ].includes((doc.entities[id] as NodeEntity).props.tag ?? ""),
            )
          )
            throw new Error(
              "Native phrasing content cannot contain block layout nodes",
            );
          const active = ["Button", "Link", "TextField", "Checkbox"].includes(
            n.primitive,
          );
          if (interactive && active)
            throw new Error("Nested interactive controls are not allowed");
          for (const [field, prop] of Object.entries(n.expose)) {
            const publicProperty = (e as ComponentEntity).properties.find(
              (p) => p.id === prop,
            );
            if (!publicProperty) throw new Error("Unknown exposed property");
            if (
              (field === "hidden" && publicProperty.type !== "boolean") ||
              (field === "assetId" && publicProperty.type !== "asset") ||
              (field === "href" && publicProperty.type !== "text") ||
              (field === "text" &&
                !["text", "number", "choice"].includes(publicProperty.type))
            )
              throw new Error(
                "Exposed property type is incompatible with its anatomy field",
              );
          }
          n.children.forEach((c) => nesting(c, interactive || active));
        }
        nesting(e.rootId, false);
        if (new Set(e.properties.map((p) => p.id)).size !== e.properties.length)
          add("property", "Public property IDs must be unique", e.id);
        for (const p of e.properties) {
          if (
            (p.type === "boolean" && typeof p.default !== "boolean") ||
            (p.type === "number" && typeof p.default !== "number") ||
            (["text", "choice", "asset"].includes(p.type) &&
              typeof p.default !== "string")
          )
            add("property", `Invalid default for ${p.name}`, e.id);
          if (p.type === "choice" && !p.options?.includes(String(p.default)))
            add("property", "Choice defaults must be allowed options", e.id);
          if (
            p.type === "asset" &&
            p.default &&
            doc.entities[String(p.default)]?.kind !== "asset"
          )
            add("asset", "Missing public default asset", e.id);
        }
        if (
          e.behavior === "button" &&
          (doc.entities[e.rootId] as NodeEntity).primitive !== "Button"
        )
          add(
            "behavior",
            "Button behavior requires a native Button root",
            e.id,
          );
        for (const rule of [...e.rules, ...e.responsive])
          for (const [id, bindings] of Object.entries(rule.patch)) {
            if (!nodes.includes(id))
              add("rule", "Rule targets a node outside this component", e.id);
            for (const [p, b] of Object.entries(bindings)) {
              if (!propertyTypes[p])
                add("property", `Unsupported property ${p}`, e.id);
              else check(b, propertyTypes[p], e.id);
            }
          }
        for (const rule of e.rules)
          for (const [axis, v] of Object.entries(rule.when.variants))
            if (!e.axes[axis]?.includes(v))
              add("variant", "Unknown variant choice", e.id);
        for (const [axis, v] of Object.entries(e.defaults))
          if (!e.axes[axis]?.includes(v))
            add("variant", "Invalid variant default", e.id);
      } catch (err) {
        add("anatomy", (err as Error).message, e.id);
      }
    }
    if (e.kind === "instance" || e.kind === "preset") {
      const c = doc.entities[e.componentId];
      if (c?.kind !== "component")
        add("instance", "Invalid component definition", e.id);
      else {
        for (const [k, v] of Object.entries(e.configuration)) {
          const p = c.properties.find((p) => p.id === k);
          if (
            !p ||
            (p.type === "boolean" && typeof v !== "boolean") ||
            (p.type === "number" && typeof v !== "number") ||
            (["text", "asset", "choice"].includes(p.type) &&
              typeof v !== "string")
          )
            add("instance", `Invalid property ${k}`, e.id);
        }
        for (const [axis, v] of Object.entries(e.variants))
          if (!c.axes[axis]?.includes(v))
            add("variant", "Invalid instance variant", e.id);
        for (const [node, bs] of Object.entries(e.overrides)) {
          if (!descendants(doc, c.rootId).includes(node))
            add("override", "Override outside definition", e.id);
          for (const [p, b] of Object.entries(bs)) {
            if (!propertyTypes[p])
              add("property", `Unsupported override property ${p}`, e.id);
            else check(b, propertyTypes[p], e.id);
          }
        }
      }
    }
    if (e.kind === "composition") {
      check(e.gap, "dimension", e.id);
      for (const i of e.instances)
        if (doc.entities[i]?.kind !== "instance")
          add("composition", "Composition must contain instances", e.id);
    }
    if (e.kind === "asset") {
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(e.data))
        add("asset", "Invalid base64 asset", e.id);
      if (e.mediaType === "image/svg+xml")
        add(
          "asset",
          "SVG import is not supported; use raster icons to avoid active content",
          e.id,
        );
    }
    if (
      e.kind === "source" &&
      e.stylesheet &&
      !/^https:\/\//.test(e.stylesheet)
    )
      add("font", "Remote font stylesheet requires HTTPS", e.id);
    if (e.kind === "motion") {
      for (const other of Object.values(doc.entities))
        if (
          other.kind === "motion" &&
          other.id !== e.id &&
          other.ownerId === e.ownerId &&
          e.clips.some((a) =>
            other.clips.some(
              (b) => a.targetId === b.targetId && a.property === b.property,
            ),
          )
        )
          add(
            "motion",
            "Conflicting ownership across motion definitions. Use one timeline for the same target/property.",
            e.id,
          );
      const owner = doc.entities[e.ownerId];
      const targets =
        owner?.kind === "component"
          ? descendants(doc, owner.rootId)
          : owner?.kind === "composition"
            ? owner.instances
            : [];
      if (!targets.length)
        add(
          "motion",
          "Motion owner must be a component or nonempty composition",
          e.id,
        );
      for (const clip of e.clips) {
        if (
          clip.property === "opacity" &&
          owner?.kind === "component" &&
          [...owner.rules, ...owner.responsive].some(
            (r) => r.patch[clip.targetId]?.opacity,
          )
        )
          add(
            "motion",
            "Opacity has conflicting ownership with a component visual rule",
            e.id,
          );
        if (!targets.includes(clip.targetId))
          add("motion", "Motion target is outside its owner", e.id);
        check(clip.duration, "duration", e.id);
        const target = doc.entities[clip.targetId];
        if (
          clip.property === "opacity" &&
          target?.kind === "node" &&
          (target.bindings.opacity ||
            (target.styleId &&
              doc.entities[target.styleId]?.kind === "style" &&
              (
                doc.entities[target.styleId] as Extract<
                  Entity,
                  { kind: "style" }
                >
              ).bindings.opacity))
        )
          add(
            "motion",
            "Opacity has conflicting ownership with a style binding",
            e.id,
          );
      }
      for (let i = 0; i < e.clips.length; i++)
        for (let j = i + 1; j < e.clips.length; j++) {
          const a = e.clips[i],
            b = e.clips[j];
          if (a.targetId !== b.targetId || a.property !== b.property) continue;
          try {
            const seconds = (binding: Binding) => {
              const v = resolve(doc, binding).value;
              return v.type === "duration"
                ? v.value / (v.unit === "ms" ? 1000 : 1)
                : 0;
            };
            if (
              a.start < b.start + seconds(b.duration) &&
              b.start < a.start + seconds(a.duration)
            )
              add(
                "motion",
                `Conflicting ${a.property} ownership: ${a.id} and ${b.id}`,
                e.id,
              );
          } catch {}
        }
    }
  }
  return Array.from(
    new Map(issues.map((i) => [`${i.entityId}:${i.message}`, i])).values(),
  );
}
export function parseDocument(input: unknown): LibraryDocument {
  const doc = documentSchema.parse(input);
  const issues = validate(doc);
  if (issues.length)
    throw new Error(
      issues.map((i) => `${i.entityId ?? "Document"}: ${i.message}`).join("\n"),
    );
  return doc;
}
export type Command =
  | { type: "renameLibrary"; name: string }
  | { type: "create"; entity: Entity }
  | { type: "update"; id: string; changes: Partial<Entity> }
  | { type: "rename"; id: string; name: string }
  | { type: "bind"; id: string; property: string; binding: Binding }
  | { type: "applyStyle"; id: string; styleId: string | undefined }
  | {
      type: "override";
      id: string;
      nodeId: string;
      property: string;
      binding?: Binding;
    }
  | { type: "move"; id: string; parentId: string; index: number }
  | { type: "removeNode"; id: string }
  | { type: "delete"; id: string; replacementId?: string }
  | { type: "duplicate"; id: string; newId: string; name: string }
  | {
      type: "createTheme";
      id: string;
      name: string;
      axis: "color" | "density";
      fromId?: string;
    };
export function execute(
  doc: LibraryDocument,
  commands: Command[],
): LibraryDocument {
  if (doc.release)
    throw new Error(
      "Release snapshots are immutable. Fork or adopt the release to edit it.",
    );
  const next = structuredClone(doc);
  for (const c of commands) {
    const e = "id" in c ? next.entities[c.id] : undefined;
    if (c.type === "renameLibrary") next.name = c.name;
    else if (c.type === "create") {
      if (next.entities[c.entity.id]) throw new Error("ID already exists");
      next.entities[c.entity.id] = structuredClone(c.entity);
    } else if (c.type === "createTheme") {
      if (next.entities[c.id]) throw new Error("ID already exists");
      const from = c.fromId ? next.entities[c.fromId] : undefined;
      next.entities[c.id] = {
        id: c.id,
        name: c.name,
        kind: "theme",
        axis: c.axis,
        assignments:
          from?.kind === "theme" ? structuredClone(from.assignments) : {},
      };
    } else {
      if (!e) throw new Error("Entity not found");
      if (c.type === "rename") e.name = c.name;
      if (c.type === "update")
        Object.assign(e, c.changes, { id: e.id, kind: e.kind });
      if (c.type === "bind") {
        if (e.kind === "token") e.binding = c.binding;
        else if (e.kind === "style" || e.kind === "node")
          e.bindings[c.property] = c.binding;
        else throw new Error("Unsupported binding target");
      }
      if (c.type === "applyStyle") {
        if (e.kind !== "node") throw new Error("Select an anatomy node");
        e.styleId = c.styleId;
      }
      if (c.type === "override") {
        if (e.kind !== "instance") throw new Error("Select an instance");
        if (c.binding) (e.overrides[c.nodeId] ??= {})[c.property] = c.binding;
        else {
          delete e.overrides[c.nodeId]?.[c.property];
          if (!Object.keys(e.overrides[c.nodeId] ?? {}).length)
            delete e.overrides[c.nodeId];
        }
      }
      if (c.type === "duplicate") {
        if (next.entities[c.newId]) throw new Error("ID already exists");
        const copy = structuredClone(e);
        copy.id = c.newId;
        copy.name = c.name;
        if (copy.kind === "component") {
          const ids = descendants(next, e.kind === "component" ? e.rootId : "");
          const map = Object.fromEntries(
            ids.map((id, i) => [id, `${c.newId}_n${i}`]),
          );
          for (const old of ids) {
            const n = structuredClone(next.entities[old]) as NodeEntity;
            n.id = map[old];
            n.children = n.children.map((id) => map[id]);
            next.entities[n.id] = n;
          }
          copy.rootId = map[copy.rootId];
          for (const r of [...copy.rules, ...copy.responsive])
            r.patch = Object.fromEntries(
              Object.entries(r.patch).map(([id, b]) => [map[id], b]),
            );
        }
        if (copy.kind === "node") {
          const ids = descendants(next, e.id);
          const map = Object.fromEntries(
            ids.map((id, i) => [id, i === 0 ? c.newId : `${c.newId}_n${i}`]),
          );
          for (const old of ids) {
            const n = structuredClone(next.entities[old]) as NodeEntity;
            n.id = map[old];
            n.children = n.children.map((id) => map[id]);
            if (old === e.id) Object.assign(copy, n, { name: c.name });
            else next.entities[n.id] = n;
          }
        }
        next.entities[copy.id] = copy;
      }
      if (c.type === "move") {
        const parent = next.entities[c.parentId];
        if (e.kind !== "node" || parent?.kind !== "node")
          throw new Error("Move requires anatomy nodes");
        if (
          Object.values(next.entities).some(
            (c) => c.kind === "component" && c.rootId === e.id,
          )
        )
          throw new Error(
            "A component root cannot be moved into another anatomy tree",
          );
        if (descendants(next, e.id).includes(parent.id))
          throw new Error("Cannot move into a descendant");
        for (const n of Object.values(next.entities))
          if (n.kind === "node")
            n.children = n.children.filter((id) => id !== e.id);
        parent.children.splice(c.index, 0, e.id);
      }
      if (c.type === "removeNode") {
        if (e.kind !== "node") throw new Error("Select an anatomy node");
        const ids = new Set(descendants(next, e.id));
        if (
          Object.values(next.entities).some(
            (c) => c.kind === "component" && ids.has(c.rootId),
          )
        )
          throw new Error(
            "Cannot remove a component root. Delete or replace its component definition instead.",
          );
        for (const item of Object.values(next.entities)) {
          if (item.kind === "node")
            item.children = item.children.filter((id) => !ids.has(id));
          if (item.kind === "component")
            for (const r of [...item.rules, ...item.responsive])
              for (const id of ids) delete r.patch[id];
          if (item.kind === "instance")
            for (const id of ids) delete item.overrides[id];
          if (item.kind === "motion")
            item.clips = item.clips.filter((clip) => !ids.has(clip.targetId));
        }
        for (const id of ids) delete next.entities[id];
      }
      if (c.type === "delete") {
        const refs = usedBy(next, c.id);
        if (refs.length && !c.replacementId)
          throw new Error(
            `Used by ${refs.length} reference(s). Choose a compatible replacement first.`,
          );
        if (c.replacementId) {
          const replacement = next.entities[c.replacementId];
          if (
            !replacement ||
            replacement.id === c.id ||
            replacement.kind !== e.kind
          )
            throw new Error("Replacement must have the same entity kind");
          if (next.themeId === c.id) next.themeId = c.replacementId;
          if (next.densityId === c.id) next.densityId = c.replacementId;
          for (const r of refs) {
            let target: any = next.entities[r.from];
            for (let i = 0; i < r.path.length - 1; i++)
              target = target[r.path[i]];
            const key = r.path.at(-1)!;
            if (
              ["assignments", "patch", "overrides"].includes(
                String(r.path.at(-2)),
              )
            ) {
              if (Object.hasOwn(target, c.replacementId))
                throw new Error(
                  "Replacement would overwrite an existing assignment or rule. Resolve that consumer first.",
                );
              target[c.replacementId] = target[key];
              delete target[key];
            } else target[key] = c.replacementId;
          }
        }
        delete next.entities[c.id];
      }
    }
  }
  next.revision++;
  return parseDocument(next);
}
export function fork(
  doc: LibraryDocument,
  id: string,
  name: string,
): LibraryDocument {
  return parseDocument({
    ...structuredClone(doc),
    id,
    name,
    revision: 0,
    release: undefined,
    provenance: { libraryId: doc.id, revision: doc.revision },
  });
}
export function componentForNode(
  doc: LibraryDocument,
  id: string,
): ComponentEntity | undefined {
  return Object.values(doc.entities).find(
    (e): e is ComponentEntity =>
      e.kind === "component" && descendants(doc, e.rootId).includes(id),
  );
}

/** Direct and transitive consumers for an edit-impact summary. */
export function impact(
  doc: LibraryDocument,
  id: string,
): { direct: number; downstream: number } {
  const refs = references(doc);
  const seen = new Set<string>([id]);
  const queue = [id];
  while (queue.length) {
    const current = queue.shift()!;
    for (const r of refs)
      if (r.to === current && !seen.has(r.from)) {
        seen.add(r.from);
        queue.push(r.from);
      }
  }
  return {
    direct: refs.filter((r) => r.to === id).length,
    downstream: seen.size - 1,
  };
}
