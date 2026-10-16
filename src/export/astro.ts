import {
  compileComponent,
  escapeHtml,
  tokenCss,
  type CompiledNode,
} from "../renderer/compiler";
import { type LibraryDocument } from "../domain/schema";
import { cssValue, isRef } from "../domain/schema";
import { zipSync, strToU8 } from "fflate";
import { motionRuntime } from "./motion";

export function astroFiles(doc: LibraryDocument): Record<string, Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  let css = tokenCss(doc);
  const names = new Map<string, string>();
  const usedNames = new Set<string>();
  for (const e of Object.values(doc.entities).filter(
    (e) => e.kind === "component" || e.kind === "composition",
  )) {
    let name = e.name.replace(/[^a-zA-Z0-9]/g, "") || e.id;
    if (!/^[A-Z]/.test(name)) name = `C${name}`;
    if (usedNames.has(name.toLowerCase())) name += e.id;
    names.set(e.id, name);
    usedNames.add(name.toLowerCase());
  }
  for (const component of Object.values(doc.entities).filter(
    (e) => e.kind === "component",
  )) {
    const c = compileComponent(doc, component.id);
    css += c.css;
    const defaults = Object.fromEntries(
      component.properties.map((p) => [p.id, p.default]),
    );
    const expression = (s: string) =>
      JSON.stringify(s).replaceAll("<", "\\u003c");
    function markup(n: CompiledNode, root = false): string {
      const node = n.node;
      let attrs = ` data-fw-part="${n.id}" data-fw-primitive="${node.primitive}"`;
      if (root) {
        attrs += ` {...nativeProps} data-fw-component="${component.id}" data-fw-full={String(values.fullWidth ?? false)} data-fw-end={String(values.iconEnd ?? false)}`;
        for (const axis of Object.keys(component.axes))
          attrs += ` data-fw-${axis}={variants[${expression(axis)}]}`;
        if (n.tag === "button")
          attrs +=
            ' type={type ?? "button"} disabled={Boolean(values.disabled || values.loading)} aria-busy={Boolean(values.loading)}';
      }
      attrs += root
        ? ` style={[nativeProps.style, nodeOverrides[${expression(n.id)}]].filter(Boolean).join(';')}`
        : ` style={nodeOverrides[${expression(n.id)}]}`;
      if (node.primitive === "Icon") attrs += ' aria-hidden="true"';
      if (node.primitive === "Image")
        attrs += ` src={assetUrls[values[${expression(node.expose.assetId ?? "")}]] ?? ${expression(node.props.assetId ? `/formwork/assets/${node.props.assetId}.${(doc.entities[node.props.assetId] as any)?.filename?.split(".").at(-1)}` : "")}} alt=${expression(node.props.alt ?? "")}`;
      if (node.primitive === "Link")
        attrs += node.expose.href
          ? ` href={safeHref(values[${expression(node.expose.href)}])}`
          : ` href=${expression(node.props.href ?? "#")}`;
      if (node.primitive === "TextField" || node.primitive === "Checkbox") {
        attrs += ` type="${node.primitive === "Checkbox" ? "checkbox" : "text"}"`;
        if (!root) attrs += ` aria-label=${expression(node.name)}`;
        if (node.primitive === "TextField")
          attrs += node.expose.text
            ? ` placeholder={values[${expression(node.expose.text)}]}`
            : ` placeholder=${expression(node.props.text ?? "")}`;
        if (root)
          attrs +=
            node.primitive === "Checkbox"
              ? ` aria-label={nativeProps['aria-label'] ?? values[${expression(node.expose.text ?? "")}] ?? ${expression(node.name)}}`
              : ` aria-label={nativeProps['aria-label'] ?? ${expression(node.name)}}`;
      }
      let content = node.expose.text
        ? `{values[${expression(node.expose.text)}]}`
        : `{${expression(node.props.text ?? "")}}`;
      content += n.children.map((ch) => markup(ch)).join("");
      if (node.slot)
        content =
          node.slot === "default"
            ? `<slot>${content}</slot>`
            : `<slot name="${node.slot}">${content}</slot>`;
      const html = ["img", "input"].includes(n.tag)
        ? `<${n.tag}${attrs} />`
        : `<${n.tag}${attrs}>${content}</${n.tag}>`;
      return node.expose.hidden
        ? `{values[${expression(node.expose.hidden)}] !== false && (${html})}`
        : html;
    }
    const propertyNames = component.properties.map((p) => p.id);
    const axisNames = Object.keys(component.axes);
    const source = `---\n// Generated from Formwork anatomy; no editor or client runtime.\nimport './library.css';\nconst { type, nodeOverrides = {}, ...incoming } = Astro.props;\nconst safeHref = value => /^(https?:\\/\\/|mailto:|tel:|\\/|#)/.test(String(value)) ? value : '#';\nconst defaults = ${expression(defaults as any)};\nconst variants = { ...${expression(component.defaults as any)}, ...Object.fromEntries(Object.entries(incoming).filter(([key]) => ${expression(axisNames as any)}.includes(key))) };\nconst values = { ...defaults, ...Object.fromEntries(Object.entries(incoming).filter(([key]) => ${expression(propertyNames as any)}.includes(key))) };\nconst nativeProps = Object.fromEntries(Object.entries(incoming).filter(([key]) => !${expression([...propertyNames, ...axisNames] as any)}.includes(key)));\nconst assetUrls = ${JSON.stringify(
      Object.fromEntries(
        Object.values(doc.entities)
          .filter((e) => e.kind === "asset")
          .map((a) => [
            a.id,
            `/formwork/assets/${a.id}.${a.filename.split(".").at(-1)}`,
          ]),
      ),
    )};\n---\n${markup(c.root, true)}\n`;
    const motionScript = Object.values(doc.entities).some(
      (e) => e.kind === "motion" && e.ownerId === component.id,
    )
      ? `<script>import {initializeMotion} from './motion';initializeMotion();</script>`
      : "";
    files[`components/${names.get(component.id)}.astro`] = strToU8(
      source + motionScript,
    );
  }
  for (const composition of Object.values(doc.entities).filter(
    (e) => e.kind === "composition",
  )) {
    const instances = composition.instances
      .map((id) => doc.entities[id])
      .filter((e) => e.kind === "instance");
    const imports = [...new Set(instances.map((i) => i.componentId))]
      .map((id) => `import ${names.get(id)} from './${names.get(id)}.astro';`)
      .join("\n");
    const layout = `display:${composition.layout === "grid" ? "grid" : "flex"};flex-direction:${composition.layout === "inline" ? "row" : "column"};flex-wrap:wrap;align-items:start;gap:${isRef(composition.gap) ? `var(--fw-${composition.gap.ref})` : cssValue(composition.gap.value)};grid-template-columns:repeat(${composition.columns},minmax(0,1fr))`;
    css += `[data-fw-composition="${composition.id}"]{${layout}}@media(max-width:500px){[data-fw-composition="${composition.id}"]{grid-template-columns:1fr}}`;
    const children = instances
      .map((i) => {
        const overrides = Object.fromEntries(
          Object.entries(i.overrides).map(([id, bs]) => [
            id,
            Object.entries(bs)
              .map(
                ([p, b]) =>
                  `${p.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${isRef(b) ? `var(--fw-${b.ref})` : cssValue(b.value)}`,
              )
              .join(";"),
          ]),
        );
        return `<${names.get(i.componentId)} {...${JSON.stringify({ ...i.configuration, ...i.variants })}} {...(data[${JSON.stringify(i.id)}] ?? {})} nodeOverrides={${JSON.stringify(overrides)}} data-fw-instance="${i.id}" />`;
      })
      .join("\n");
    const motionScript = Object.values(doc.entities).some(
      (e) => e.kind === "motion" && e.ownerId === composition.id,
    )
      ? `<script>import {initializeMotion} from './motion';initializeMotion();</script>`
      : "";
    files[`components/${names.get(composition.id)}.astro`] = strToU8(
      `---\n${imports}\nimport './library.css';\n// Application supplies data per stable instance ID and attaches actions via data-fw-instance.\nconst {data = {}, ...nativeProps} = Astro.props;\n---\n<div {...nativeProps} data-fw-composition="${composition.id}">${children}</div>\n${motionScript}`,
    );
  }
  if (Object.values(doc.entities).some((e) => e.kind === "motion")) {
    files["components/motion.js"] = strToU8(motionRuntime(doc));
    files["package.json"] = strToU8(
      JSON.stringify(
        { private: true, dependencies: { gsap: "^3.15.0" } },
        null,
        2,
      ),
    );
  }
  css = css.replaceAll("./assets/", "/formwork/assets/");
  files["components/library.css"] = strToU8(css);
  for (const a of Object.values(doc.entities))
    if (a.kind === "asset")
      files[`public/formwork/assets/${a.id}.${a.filename.split(".").at(-1)}`] =
        Uint8Array.from(atob(a.data), (c) => c.charCodeAt(0));
  files["README.md"] = strToU8(
    `# ${doc.name}\n\nCopy components/ into src/components/formwork/ and public/ into your Astro public directory. Import Button from './components/formwork/Button.astro'. Wrap output in an element with data-fw-theme="${doc.themeId}" and data-fw-density="${doc.densityId}".\n\n<Button label="Continue" emphasis="primary" size="medium" />\n\nDefault and named icon slots are supported. Native attributes pass through; attach event listeners in your application using id/data attributes. No function/event strings are imported from library data. Loading disables activation, sets aria-busy, and retains label. Color and density contexts inherit. Preview flags are never exported.\n\nRemote font stylesheet registrations are metadata; include the declared HTTPS stylesheet explicitly in your app. Portable files are backups; browser autosave is local to this browser.\n`,
  );
  return files;
}
export const exportAstro = (doc: LibraryDocument) => zipSync(astroFiles(doc));
