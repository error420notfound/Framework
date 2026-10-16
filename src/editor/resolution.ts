import type {
  Binding,
  ComponentEntity,
  LibraryDocument,
  NodeEntity,
  State,
} from "../domain/schema";
import { statePriority } from "../renderer/compiler";
export function scopeRule(
  c: ComponentEntity | undefined,
  scope: string,
  variants: Record<string, string> = {},
) {
  if (!c || scope === "base") return undefined;
  if (scope.startsWith("rule:"))
    return c.rules.find((r) => r.id === scope.slice(5));
  const [kind, key, value] = scope.split(":");
  return c.rules.find((r) =>
    kind === "variant"
      ? !r.when.states.length &&
        Object.keys(r.when.variants).length === 1 &&
        r.when.variants[key] === value
      : r.when.states.length === 1 &&
        r.when.states[0] === key &&
        Object.entries(r.when.variants).every(
          ([a, v]) => (variants[a] ?? c.defaults[a]) === v,
        ),
  );
}
export function baseBinding(doc: LibraryDocument, n: NodeEntity, p: string) {
  const style = n.styleId ? doc.entities[n.styleId] : undefined;
  return n.bindings[p]
    ? {
        binding: n.bindings[p],
        origin:
          "ref" in n.bindings[p]
            ? "Direct token binding"
            : "Explicit local value",
        reset: true,
      }
    : style?.kind === "style" && style.bindings[p]
      ? {
          binding: style.bindings[p],
          origin: "Inherited from " + style.name,
          reset: false,
        }
      : undefined;
}
export function effectiveBinding(
  doc: LibraryDocument,
  c: ComponentEntity,
  n: NodeEntity,
  p: string,
  options: {
    variants?: Record<string, string>;
    states?: State[];
    overrides?: Record<string, Record<string, Binding>>;
    viewport?: number;
    values?: Record<string, string | number | boolean>;
  } = {},
) {
  let result = baseBinding(doc, n, p);
  const variants = { ...c.defaults, ...options.variants };
  const values = {
    ...Object.fromEntries(c.properties.map((p) => [p.id, p.default])),
    ...options.values,
  };
  const active = new Set(options.states ?? []);
  if (values.loading) active.add("loading");
  if (values.disabled) active.add("disabled");
  if (active.has("loading") || active.has("disabled")) {
    active.add("disabled");
    active.delete("hover");
    active.delete("pressed");
  }
  for (const r of [...c.rules].sort(
    (a, b) => statePriority(a.when.states) - statePriority(b.when.states),
  ))
    if (
      Object.entries(r.when.variants).every(([a, v]) => variants[a] === v) &&
      r.when.states.every((s) => active.has(s)) &&
      r.patch[n.id]?.[p]
    )
      result = {
        binding: r.patch[n.id][p],
        origin:
          (r.when.states.length ? "State override: " : "Variant override: ") +
          r.name,
        reset: true,
      };
  for (const r of c.responsive)
    if (
      options.viewport !== undefined &&
      options.viewport <= r.maxWidth &&
      r.patch[n.id]?.[p]
    )
      result = {
        binding: r.patch[n.id][p],
        origin: "Responsive override: ≤ " + r.maxWidth + " px",
        reset: true,
      };
  if (options.overrides?.[n.id]?.[p])
    result = {
      binding: options.overrides[n.id][p],
      origin: "Instance override",
      reset: true,
    };
  return result;
}
export const propertyLabel = (p: string) =>
  p.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
export function appearanceGroup(p: string) {
  return /font|lineHeight|letterSpacing|^color$/.test(p)
    ? "Typography"
    : /padding|gap|width|Width|minHeight/.test(p) && !/^border|^outline/.test(p)
      ? "Layout and spacing"
      : p === "background"
        ? "Fill"
        : /^border/.test(p)
          ? "Border"
          : "Effects";
}

/** Read and change one authoring layer without changing the winning preview layer. */
export function scopePatch(
  c: ComponentEntity | undefined,
  scope: string,
  variants: Record<string, string> = {},
) {
  return scope.startsWith("responsive:")
    ? c?.responsive.find((r) => r.maxWidth === Number(scope.slice(11)))?.patch
    : scopeRule(c, scope, variants)?.patch;
}
export function scopeOrigin(
  c: ComponentEntity | undefined,
  scope: string,
  variants: Record<string, string> = {},
) {
  if (scope.startsWith("responsive:"))
    return "Responsive override: ≤ " + scope.slice(11) + " px";
  const rule = scopeRule(c, scope, variants);
  return rule
    ? (rule.when.states.length ? "State override: " : "Variant override: ") +
        rule.name
    : undefined;
}
export function changeScopeBinding(
  c: ComponentEntity,
  scope: string,
  nodeId: string,
  p: string,
  b: Binding | undefined,
  variants: Record<string, string> = {},
): Partial<ComponentEntity> {
  const change = (patch: Record<string, Record<string, Binding>>) => {
    if (b) (patch[nodeId] ??= {})[p] = b;
    else if (patch[nodeId]) {
      delete patch[nodeId][p];
      if (!Object.keys(patch[nodeId]).length) delete patch[nodeId];
    }
  };
  if (scope.startsWith("responsive:")) {
    const responsive = structuredClone(c.responsive),
      r = responsive.find((r) => r.maxWidth === Number(scope.slice(11)));
    if (!r) throw new Error("Responsive scope no longer exists");
    change(r.patch);
    return { responsive };
  }
  const rules = structuredClone(c.rules);
  let rule = rules.find((r) => r.id === scopeRule(c, scope, variants)?.id);
  if (!rule) {
    if (scope.startsWith("rule:")) throw new Error("Rule no longer exists");
    const [kind, key, value] = scope.split(":");
    rule = {
      id: scope.replaceAll(":", "_"),
      name: kind === "state" ? key : key + ": " + value,
      when: {
        variants: kind === "variant" ? { [key]: value } : {},
        states: kind === "state" ? [key as State] : [],
      },
      patch: {},
    };
    rules.push(rule);
  }
  change(rule.patch);
  return { rules };
}
