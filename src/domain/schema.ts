import { z } from "zod";
import { parseIcon } from "../icons/runtime";
const iconText = z.union([
  z.string().max(2000),
  z
    .string()
    .max(64000)
    .refine((value) => !!parseIcon(value), "Invalid icon selection"),
]);

export const valueTypes = [
  "color",
  "dimension",
  "number",
  "fontFamily",
  "fontWeight",
  "duration",
  "easing",
  "string",
] as const;
export type ValueType = (typeof valueTypes)[number];
const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,95}$/);
export const valueSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("color"),
    space: z.enum(["srgb", "oklch", "display-p3"]),
    channels: z.tuple([
      z.number().finite(),
      z.number().finite(),
      z.number().finite(),
    ]),
    alpha: z.number().min(0).max(1).default(1),
  }),
  z.strictObject({
    type: z.literal("dimension"),
    value: z.number().finite(),
    unit: z.enum(["px", "rem", "em", "%", "vh", "vw"]),
  }),
  z.strictObject({ type: z.literal("number"), value: z.number().finite() }),
  z.strictObject({
    type: z.literal("fontWeight"),
    value: z.number().min(1).max(1000),
  }),
  z.strictObject({
    type: z.literal("duration"),
    value: z.number().min(0),
    unit: z.enum(["ms", "s"]),
  }),
  z.strictObject({
    type: z.literal("fontFamily"),
    value: z
      .string()
      .min(1)
      .max(300)
      .regex(/^[a-zA-Z0-9 ,"'-]+$/),
  }),
  z.strictObject({
    type: z.literal("easing"),
    value: z
      .string()
      .regex(
        /^(linear|ease|ease-in|ease-out|ease-in-out|cubic-bezier\([-0-9., ]+\))$/,
      ),
  }),
  z.strictObject({ type: z.literal("string"), value: z.string().max(2000) }),
]);
export type DesignValue = z.infer<typeof valueSchema>;
export const bindingSchema = z.union([
  z.strictObject({ ref: id }),
  z.strictObject({ value: valueSchema }),
]);
export type Binding = z.infer<typeof bindingSchema>;
const base = { id, name: z.string().min(1).max(120) };
export const primitives = [
  "Text",
  "Icon",
  "Image",
  "Surface",
  "Stack",
  "Inline",
  "Grid",
  "Button",
  "Link",
  "TextField",
  "Checkbox",
  "Separator",
  "Progress",
  "Table",
  "TableHead",
  "TableBody",
  "TableRow",
  "TableHeader",
  "TableCell",
  "TableCaption",
  "Spinner",
  "Skeleton",
] as const;
export const propertyTypes: Record<string, ValueType> = {
  background: "color",
  color: "color",
  borderColor: "color",
  outlineColor: "color",
  paddingInline: "dimension",
  paddingBlock: "dimension",
  gap: "dimension",
  borderRadius: "dimension",
  fontFamily: "fontFamily",
  fontWeight: "fontWeight",
  fontSize: "dimension",
  lineHeight: "number",
  letterSpacing: "dimension",
  opacity: "number",
  width: "dimension",
  minHeight: "dimension",
  maxWidth: "dimension",
  borderWidth: "dimension",
  outlineWidth: "dimension",
  outlineOffset: "dimension",
  transitionDuration: "duration",
};
const bindings = z.record(z.string(), bindingSchema);
const propertyValue = z.union([iconText, z.boolean(), z.number().finite()]);
const patch = z.record(id, bindings);
export const states = [
  "hover",
  "focus-visible",
  "pressed",
  "disabled",
  "loading",
] as const;
export type State = (typeof states)[number];
const selectorKey = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/);
const rules = z.strictObject({
  id,
  name: z.string(),
  when: z.strictObject({
    variants: z.record(selectorKey, selectorKey).default({}),
    states: z.array(z.enum(states)).default([]),
  }),
  patch,
});
const prop = z.strictObject({
  id,
  name: z.string(),
  type: z.enum(["text", "boolean", "choice", "asset", "number"]),
  default: propertyValue,
  options: z.array(z.string()).optional(),
});
const entitySchema = z.discriminatedUnion("kind", [
  z.strictObject({
    ...base,
    kind: z.literal("source"),
    sourceType: z.enum(["color", "font", "scale"]),
    value: valueSchema,
    origin: z
      .strictObject({
        adapter: z.string(),
        externalId: z.string(),
        metadata: z.record(z.string(), z.string()).default({}),
      })
      .optional(),
    assetId: id.optional(),
    weights: z.array(z.number()).optional(),
    fontStyles: z.array(z.enum(["normal", "italic"])).optional(),
    stylesheet: z.url().optional(),
  }),
  z.strictObject({
    ...base,
    kind: z.literal("token"),
    layer: z.enum(["foundation", "semantic"]),
    valueType: z.enum(valueTypes),
    binding: bindingSchema,
  }),
  z.strictObject({
    ...base,
    kind: z.literal("theme"),
    axis: z.enum(["color", "density"]),
    assignments: z.record(id, bindingSchema),
  }),
  z.strictObject({ ...base, kind: z.literal("style"), bindings }),
  z.strictObject({
    ...base,
    kind: z.literal("node"),
    primitive: z.enum(primitives),
    bindings,
    styleId: id.optional(),
    children: z.array(id),
    props: z
      .strictObject({
        text: iconText.optional(),
        assetId: id.optional(),
        alt: z.string().max(500).optional(),
        href: z.string().max(2000).optional(),
        columns: z.number().int().min(1).max(12).optional(),
        align: z.enum(["start", "center", "end", "stretch"]).optional(),
        justify: z.enum(["start", "center", "end", "between"]).optional(),
        tag: z
          .enum([
            "span",
            "p",
            "h1",
            "h2",
            "h3",
            "h4",
            "blockquote",
            "code",
            "section",
            "article",
          ])
          .optional(),
        role: z.enum(["status", "alert", "img", "presentation"]).optional(),
        label: z.string().max(500).optional(),
      })
      .default({}),
    expose: z
      .partialRecord(z.enum(["text", "assetId", "hidden", "href"]), id)
      .default({}),
    slot: z
      .string()
      .regex(/^[a-z][a-z0-9-]*$/)
      .optional(),
  }),
  z.strictObject({
    ...base,
    kind: z.literal("component"),
    rootId: id,
    properties: z.array(prop),
    axes: z.record(selectorKey, z.array(selectorKey).min(1)),
    defaults: z.record(selectorKey, selectorKey),
    rules: z.array(rules),
    behavior: z.enum(["button", "link", "input", "checkbox", "static"]),
    responsive: z
      .array(z.strictObject({ maxWidth: z.number().positive(), patch }))
      .default([]),
    capabilities: z
      .strictObject({
        targets: z.array(z.enum(["astro", "html"])),
        dependencies: z.array(z.string()),
        hydration: z.enum(["none", "script", "react"]),
        limits: z.string(),
        source: z.string(),
        revision: z.string(),
      })
      .optional(),
  }),
  z.strictObject({
    ...base,
    kind: z.literal("preset"),
    componentId: id,
    mode: z.literal("snapshot"),
    configuration: z.record(z.string(), propertyValue),
    variants: z.record(z.string(), z.string()),
    overrides: patch,
    description: z.string(),
  }),
  z.strictObject({
    ...base,
    kind: z.literal("instance"),
    componentId: id,
    configuration: z.record(z.string(), propertyValue),
    variants: z.record(z.string(), z.string()),
    overrides: patch,
  }),
  z.strictObject({
    ...base,
    kind: z.literal("composition"),
    instances: z.array(id),
    layout: z.enum(["stack", "inline", "grid"]),
    gap: bindingSchema,
    columns: z.number().int().min(1).max(12),
    domain: z.string().optional(),
    dataContract: z
      .record(z.string(), z.enum(["number", "text", "boolean", "action"]))
      .default({}),
  }),
  z.strictObject({
    ...base,
    kind: z.literal("motion"),
    ownerId: id,
    trigger: z.enum(["entrance", "press", "hover"]),
    reduced: z.enum(["skip", "fade"]),
    clips: z
      .array(
        z.strictObject({
          id,
          targetId: id,
          property: z.enum(["opacity", "x", "y", "scale", "rotation"]),
          from: z.number().finite(),
          to: z.number().finite(),
          start: z.number().min(0).max(60),
          duration: bindingSchema,
          ease: z.enum(["none", "power1.out", "power2.out", "power2.inOut"]),
        }),
      )
      .max(100),
  }),
  z.strictObject({
    ...base,
    kind: z.literal("asset"),
    mediaType: z.enum([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "font/woff2",
      "font/woff",
      "font/ttf",
    ]),
    data: z.string().max(14000000),
    filename: z.string().regex(/^[a-zA-Z0-9_.-]+$/),
  }),
]);
export type Entity = z.infer<typeof entitySchema>;
export type NodeEntity = Extract<Entity, { kind: "node" }>;
export type ComponentEntity = Extract<Entity, { kind: "component" }>;
export type TokenEntity = Extract<Entity, { kind: "token" }>;
export const documentSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    id,
    name: z.string().min(1).max(120),
    revision: z.number().int().nonnegative(),
    release: z
      .strictObject({
        id: z.string(),
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
        sourceRevision: z.number().int().nonnegative(),
      })
      .optional(),
    entities: z.record(id, entitySchema),
    themeId: id,
    densityId: id,
    provenance: z
      .strictObject({
        libraryId: id,
        revision: z.number(),
        releaseId: z.string().optional(),
      })
      .optional(),
  })
  .strict();
export type LibraryDocument = z.infer<typeof documentSchema>;
export type Diagnostic = { code: string; message: string; entityId?: string };
export const newId = (prefix = "e") =>
  `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
export const isRef = (b: Binding): b is { ref: string } => "ref" in b;
export const hexColor = (hex: string): DesignValue => ({
  type: "color",
  space: "srgb",
  channels: [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ],
  alpha: 1,
});
export function cssValue(v: DesignValue): string {
  if (v.type === "color") {
    const [a, b, c] = v.channels;
    return v.space === "srgb"
      ? v.channels.some((n) => n < 0 || n > 1)
        ? `color(srgb ${a} ${b} ${c} / ${v.alpha})`
        : `rgb(${a * 255} ${b * 255} ${c * 255} / ${v.alpha})`
      : v.space === "oklch"
        ? `oklch(${a} ${b} ${c} / ${v.alpha})`
        : `color(display-p3 ${a} ${b} ${c} / ${v.alpha})`;
  }
  if (v.type === "dimension" || v.type === "duration")
    return `${v.value}${v.unit}`;
  return String(v.value);
}
