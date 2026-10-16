import {
  cssValue,
  isRef,
  type Binding,
  type ComponentEntity,
  type LibraryDocument,
  type NodeEntity,
  type State,
} from "../domain/schema";
import { descendants, resolve, type Context } from "../domain/engine";
export const escapeHtml = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const kebab = (p: string) => p.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const variable = (id: string) => `--fw-${id}`;
function bindingCss(doc: LibraryDocument, b: Binding) {
  const value = resolve(doc, b).value;
  if (value.type === "string")
    throw new Error("Content cannot be bound as CSS");
  return isRef(b) ? `var(${variable(b.ref)})` : cssValue(value);
}
function declarations(doc: LibraryDocument, bs: Record<string, Binding>) {
  return Object.entries(bs)
    .map(([p, b]) => `${kebab(p)}:${bindingCss(doc, b)}`)
    .join(";");
}
export type CompiledNode = {
  id: string;
  tag: string;
  node: NodeEntity;
  children: CompiledNode[];
};
export type CompiledComponent = {
  id: string;
  definition: ComponentEntity;
  root: CompiledNode;
  css: string;
};
export const tags: Record<NodeEntity["primitive"], string> = {
  Text: "span",
  Icon: "span",
  Image: "img",
  Surface: "div",
  Stack: "div",
  Inline: "span",
  Grid: "div",
  Button: "button",
  Link: "a",
  TextField: "input",
  Checkbox: "input",
};
export function tokenCss(doc: LibraryDocument): string {
  const tokens = Object.values(doc.entities).filter(
    (e) =>
      (e.kind === "token" && e.valueType !== "string") ||
      (e.kind === "source" && e.value.type !== "string"),
  );
  const declaration = (ctx: Context) =>
    tokens
      .map(
        (t) =>
          `${variable(t.id)}:${cssValue(resolve(doc, { ref: t.id }, ctx).value)}`,
      )
      .join(";");
  let css = `:root{${declaration({})}}`;
  const themes = Object.values(doc.entities).filter(
    (e) => e.kind === "theme" && e.axis === "color",
  );
  const densities = Object.values(doc.entities).filter(
    (e) => e.kind === "theme" && e.axis === "density",
  );
  for (const t of themes)
    for (const d of densities)
      css += `[data-fw-theme="${t.id}"][data-fw-density="${d.id}"]{${declaration({ themeId: t.id, densityId: d.id })}}`;
  for (const s of Object.values(doc.entities))
    if (s.kind === "source" && s.sourceType === "font" && s.assetId) {
      const a = doc.entities[s.assetId];
      if (a?.kind === "asset")
        css += `@font-face{font-family:"${s.name.replace(/[^a-zA-Z0-9 -]/g, "")}";src:url("./assets/${a.id}.${a.filename.split(".").at(-1)}");font-weight:${Math.min(...(s.weights ?? [400]))} ${Math.max(...(s.weights ?? [400]))};font-display:swap;}`;
    }
  return css;
}
export const statePriority = (states: State[]) =>
  states.includes("focus-visible")
    ? 5
    : states.includes("disabled")
      ? 4
      : states.includes("loading")
        ? 3
        : states.includes("pressed")
          ? 2
          : states.includes("hover")
            ? 1
            : 0;
export function compileComponent(
  doc: LibraryDocument,
  id: string,
): CompiledComponent {
  const c = doc.entities[id];
  if (c?.kind !== "component") throw new Error("Select a component");
  const rootSelector = `[data-fw-component="${c.id}"]`;
  const selector = (node: string) =>
    node === c.rootId
      ? rootSelector
      : `${rootSelector} [data-fw-part="${node}"]`;
  let css = `${rootSelector}{box-sizing:border-box;position:relative;text-decoration:none;border:0 solid transparent;outline:0 solid transparent;font:inherit;max-inline-size:100%;overflow-wrap:anywhere;cursor:${["button", "link", "checkbox"].includes(c.behavior) ? "pointer" : c.behavior === "input" ? "text" : "inherit"};display:${(doc.entities[c.rootId] as NodeEntity).primitive === "Surface" ? "block" : (doc.entities[c.rootId] as NodeEntity).primitive === "Text" ? "inline" : "inline-flex"};align-items:center;justify-content:center;vertical-align:middle}${rootSelector} *,${rootSelector} *::before,${rootSelector} *::after{box-sizing:border-box;min-width:0}${rootSelector}[data-fw-full="true"]{width:100%}${rootSelector}[data-fw-end="true"] [data-fw-primitive="Inline"]{flex-direction:row-reverse}${rootSelector}:disabled{cursor:not-allowed}${rootSelector}[aria-busy="true"]{cursor:progress}${rootSelector}[aria-busy="true"]::after{content:"";width:12px;height:12px;margin-inline-start:8px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:fw-spin .8s linear infinite}@keyframes fw-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){${rootSelector}[aria-busy="true"]::after{animation:none;border-right-color:currentColor}}`;
  function compile(nodeId: string): CompiledNode {
    const n = doc.entities[nodeId] as NodeEntity;
    const s = n.styleId ? doc.entities[n.styleId] : undefined;
    const bs = { ...(s?.kind === "style" ? s.bindings : {}), ...n.bindings };
    const layout =
      n.primitive === "Stack"
        ? "display:flex;flex-direction:column;align-items:stretch;"
        : n.primitive === "Inline"
          ? "display:inline-flex;align-items:center;"
          : n.primitive === "Grid"
            ? `display:grid;grid-template-columns:repeat(${n.props.columns ?? 2},minmax(0,1fr));`
            : "";
    css += `${selector(n.id)}{${layout}${n.props.align ? `align-items:${n.props.align};` : ""}${n.props.justify ? `justify-content:${n.props.justify === "between" ? "space-between" : n.props.justify};` : ""}${declarations(doc, bs)}}`;
    return {
      id: n.id,
      tag: tags[n.primitive],
      node: n,
      children: n.children.map(compile),
    };
  }
  const root = compile(c.rootId);
  for (const r of [...c.rules].sort(
    (a, b) => statePriority(a.when.states) - statePriority(b.when.states),
  )) {
    const variant = Object.entries(r.when.variants)
      .map(([k, v]) => `[data-fw-${k}="${v}"]`)
      .join("");
    const state = r.when.states
      .map((s) =>
        s === "hover"
          ? ":hover:not(:disabled)"
          : s === "pressed"
            ? ":active:not(:disabled)"
            : s === "focus-visible"
              ? ":focus-visible"
              : s === "disabled"
                ? ":disabled"
                : '[aria-busy="true"]',
      )
      .join("");
    const sim =
      r.when.states.map((s) => `[data-fw-preview~="${s}"]`).join("") +
      (r.when.states.some((s) => s === "hover" || s === "pressed")
        ? ":not(:disabled)"
        : "");
    for (const [n, b] of Object.entries(r.patch)) {
      const suffix = n === c.rootId ? "" : ` [data-fw-part="${n}"]`;
      const nativeCondition = variant + state,
        previewCondition = variant + sim;
      css += `${rootSelector}${nativeCondition ? `:where(${nativeCondition})` : ""}${suffix},${rootSelector}${previewCondition ? `:where(${previewCondition})` : ""}${suffix}{${declarations(doc, b)}}`;
    }
  }
  for (const r of c.responsive)
    css += `@media(max-width:${r.maxWidth}px){${Object.entries(r.patch)
      .map(([n, b]) => `${selector(n)}{${declarations(doc, b)}}`)
      .join("")}}`;
  return { id, definition: c, root, css };
}
export type RenderOptions = {
  values?: Record<string, string | boolean | number>;
  variants?: Record<string, string>;
  states?: State[];
  overrides?: Record<string, Record<string, Binding>>;
  assetUrl?: (id: string) => string;
};
export function renderComponent(
  doc: LibraryDocument,
  compiled: CompiledComponent,
  options: RenderOptions = {},
): string {
  const c = compiled.definition,
    values = {
      ...Object.fromEntries(c.properties.map((p) => [p.id, p.default])),
      ...options.values,
    },
    variants = { ...c.defaults, ...options.variants };
  const active = new Set(options.states ?? []);
  const loading = !!values.loading || active.has("loading"),
    disabled = !!values.disabled || active.has("disabled") || loading;
  const assetUrl =
    options.assetUrl ??
    ((id: string) => {
      const a = doc.entities[id];
      return a?.kind === "asset" ? `data:${a.mediaType};base64,${a.data}` : "";
    });
  function render(n: CompiledNode, isRoot = false): string {
    const node = n.node;
    let text = node.props.text ?? "";
    const textProp = node.expose.text;
    if (textProp) text = String(values[textProp] ?? text);
    if (node.expose.hidden && values[node.expose.hidden] === false) return "";
    let attrs = ` data-fw-part="${n.id}" data-fw-primitive="${node.primitive}"`;
    if (isRoot) {
      attrs += ` data-fw-component="${c.id}" data-fw-preview="${escapeHtml([...active].join(" "))}" data-fw-full="${!!values.fullWidth}" data-fw-end="${!!values.iconEnd}"`;
      for (const [axis, v] of Object.entries(variants))
        attrs += ` data-fw-${axis}="${escapeHtml(v)}"`;
      if (n.tag === "button")
        attrs += ` type="button"${disabled ? " disabled" : ""} aria-busy="${loading}"`;
    }
    if (node.primitive === "Icon") attrs += ' aria-hidden="true"';
    if (node.primitive === "Image") {
      const aid = node.expose.assetId
        ? String(values[node.expose.assetId])
        : node.props.assetId;
      attrs += ` src="${escapeHtml(aid ? assetUrl(aid) : "")}" alt="${escapeHtml(node.props.alt ?? "")}"`;
    }
    if (node.primitive === "Link") {
      const href = node.expose.href
        ? String(values[node.expose.href] ?? node.props.href ?? "#")
        : (node.props.href ?? "#");
      attrs += ` href="${escapeHtml(/^(https?:\/\/|mailto:|tel:|\/|#)/.test(href) ? href : "#")}"`;
    }
    if (node.primitive === "Checkbox")
      attrs +=
        ' type="checkbox" aria-label="' + escapeHtml(text || node.name) + '"';
    if (node.primitive === "TextField")
      attrs +=
        ' type="text" aria-label="' +
        escapeHtml(node.name) +
        '" placeholder="' +
        escapeHtml(text) +
        '"';
    const overrides = options.overrides?.[node.id];
    if (overrides)
      attrs += ` style="${escapeHtml(declarations(doc, overrides))}"`;
    return `<${n.tag}${attrs}>${n.tag === "input" || n.tag === "img" ? "" : escapeHtml(text) + n.children.map((c) => render(c)).join("") + `</${n.tag}>`}`;
  }
  return render(compiled.root, true);
}
export function previewHtml(
  doc: LibraryDocument,
  componentId: string,
  context: Context,
  options: RenderOptions = {},
  width = 768,
): string {
  const c = compileComponent(doc, componentId);
  let css = tokenCss(doc) + c.css;
  for (const a of Object.values(doc.entities))
    if (a.kind === "asset")
      css = css.replaceAll(
        `./assets/${a.id}.${a.filename.split(".").at(-1)}`,
        `data:${a.mediaType};base64,${a.data}`,
      );
  const bg = doc.entities.surface
    ? cssValue(resolve(doc, { ref: "surface" }, context).value)
    : "#fff";
  return `<!doctype html><html lang="en" data-fw-theme="${context.themeId ?? doc.themeId}" data-fw-density="${context.densityId ?? doc.densityId}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline';"><style>html{background:${bg};color-scheme:${context.themeId === "dark" ? "dark" : "light"}}body{margin:0;min-height:280px;display:flex;align-items:center;justify-content:center;padding:36px;font:14px system-ui}${css}</style></head><body><main style="max-width:${width}px;${options.values?.fullWidth ? "width:100%" : ""}">${renderComponent(doc, c, options)}</main></body></html>`;
}
