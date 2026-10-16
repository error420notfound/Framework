import { execute } from "../domain/engine";
import {
  hexColor,
  type Binding,
  type ComponentEntity,
  type Entity,
  type LibraryDocument,
} from "../domain/schema";
export const ref = (id: string): Binding => ({ ref: id });
export const dim = (value: number, unit: "px" | "rem" = "px"): Binding => ({
  value: { type: "dimension", value, unit },
});
export function createStarter(): LibraryDocument {
  let doc: LibraryDocument = {
    schemaVersion: 1,
    id: "starter",
    name: "Starter library",
    revision: 0,
    entities: {},
    themeId: "light",
    densityId: "comfortable",
  };
  const entities: Entity[] = [
    {
      kind: "theme",
      id: "light",
      name: "Light",
      axis: "color",
      assignments: {},
    },
    { kind: "theme", id: "dark", name: "Dark", axis: "color", assignments: {} },
    {
      kind: "theme",
      id: "comfortable",
      name: "Comfortable",
      axis: "density",
      assignments: {},
    },
    {
      kind: "theme",
      id: "compact",
      name: "Compact",
      axis: "density",
      assignments: {},
    },
  ];
  for (const [id, name, hex] of [
    ["blue", "Blue 600", "#2563EB"],
    ["blueHover", "Blue 700", "#1D4ED8"],
    ["bluePressed", "Blue 800", "#1E40AF"],
    ["white", "White", "#FFFFFF"],
    ["ink", "Slate 900", "#0F172A"],
    ["muted", "Slate 500", "#64748B"],
    ["border", "Slate 200", "#E2E8F0"],
    ["canvas", "Slate 50", "#F8FAFC"],
    ["disabled", "Slate 300", "#CBD5E1"],
  ]) {
    entities.push({
      id: `source_${id}`,
      kind: "source",
      name,
      sourceType: "color",
      value: hexColor(hex),
      origin: {
        adapter: "illustrative-palette",
        externalId: id,
        metadata: {
          note: "Local illustrative fixture; not a live Chroma endpoint",
        },
      },
    });
    entities.push({
      id: `color_${id}`,
      name: `color.${id}`,
      kind: "token",
      layer: "foundation",
      valueType: "color",
      binding: ref(`source_${id}`),
    });
  }
  entities.push({
    id: "source_font",
    kind: "source",
    name: "System sans",
    sourceType: "font",
    value: {
      type: "fontFamily",
      value: "Inter, ui-sans-serif, system-ui, sans-serif",
    },
    weights: [400, 500, 600, 700],
    fontStyles: ["normal"],
  });
  for (const [id, name, binding, type] of [
    ["font_family", "font.family.sans", ref("source_font"), "fontFamily"],
    [
      "font_weight",
      "font.weight.medium",
      { value: { type: "fontWeight", value: 600 } },
      "fontWeight",
    ],
    ["font_size", "font.size.control", dim(14), "dimension"],
    ["space_inline", "space.inline", dim(16), "dimension"],
    ["space_block", "space.block", dim(10), "dimension"],
    ["radius", "radius.control", dim(6), "dimension"],
    ["space_gap", "space.gap", dim(8), "dimension"],
  ] as const)
    entities.push({
      id,
      name,
      kind: "token",
      layer: "foundation",
      valueType: type,
      binding: binding as Binding,
    });
  for (const [id, name, target, type] of [
    ["fill", "action.primary.default.fill", "color_blue", "color"],
    ["hover_fill", "action.primary.hover.fill", "color_blueHover", "color"],
    [
      "pressed_fill",
      "action.primary.pressed.fill",
      "color_bluePressed",
      "color",
    ],
    ["text", "action.primary.default.text", "color_white", "color"],
    ["secondary_fill", "action.secondary.fill", "color_white", "color"],
    ["secondary_text", "action.secondary.text", "color_ink", "color"],
    ["disabled_fill", "action.disabled.fill", "color_disabled", "color"],
    ["focus", "control.focus.ring", "color_blue", "color"],
    ["surface", "surface.canvas", "color_canvas", "color"],
    ["text_primary", "text.primary", "color_ink", "color"],
    ["padding_inline", "control.padding.inline", "space_inline", "dimension"],
    ["padding_block", "control.padding.block", "space_block", "dimension"],
  ] as const)
    entities.push({
      id,
      name,
      kind: "token",
      layer: "semantic",
      valueType: type,
      binding: ref(target),
    });
  entities.push(
    {
      id: "motion_fast",
      name: "motion.duration.fast",
      kind: "token",
      layer: "foundation",
      valueType: "duration",
      binding: { value: { type: "duration", value: 200, unit: "ms" } },
    },
    {
      id: "motion_standard",
      name: "motion.duration.standard",
      kind: "token",
      layer: "foundation",
      valueType: "duration",
      binding: { value: { type: "duration", value: 300, unit: "ms" } },
    },
  );
  entities.push({
    id: "control_label",
    name: "Control label",
    kind: "style",
    bindings: {
      fontFamily: ref("font_family"),
      fontWeight: ref("font_weight"),
      fontSize: ref("font_size"),
      lineHeight: { value: { type: "number", value: 1.4 } },
      letterSpacing: dim(0),
    },
  });
  entities.push({
    id: "button_root",
    name: "Button",
    kind: "node",
    primitive: "Button",
    bindings: {
      background: ref("fill"),
      color: ref("text"),
      paddingInline: ref("padding_inline"),
      paddingBlock: ref("padding_block"),
      borderRadius: ref("radius"),
      borderWidth: dim(1),
      borderColor: ref("fill"),
      gap: ref("space_gap"),
    },
    children: ["button_content"],
    props: {},
    expose: {},
  });
  entities.push({
    id: "button_content",
    name: "Content",
    kind: "node",
    primitive: "Inline",
    bindings: { gap: ref("space_gap") },
    children: ["button_icon", "button_label"],
    props: { align: "center" },
    expose: {},
  });
  entities.push({
    id: "button_icon",
    name: "Icon",
    kind: "node",
    primitive: "Icon",
    bindings: { fontSize: dim(18) },
    children: [],
    props: { text: "+" },
    expose: { text: "icon", hidden: "showIcon" },
    slot: "icon",
  });
  entities.push({
    id: "button_label",
    name: "Label",
    kind: "node",
    primitive: "Text",
    bindings: {},
    styleId: "control_label",
    children: [],
    props: { text: "Add item" },
    expose: { text: "label" },
    slot: "default",
  });
  const button: ComponentEntity = {
    id: "button",
    name: "Button",
    kind: "component",
    rootId: "button_root",
    behavior: "button",
    properties: [
      { id: "label", name: "Label", type: "text", default: "Add item" },
      { id: "icon", name: "Icon", type: "text", default: "+" },
      { id: "showIcon", name: "Show icon", type: "boolean", default: true },
      { id: "iconEnd", name: "Icon at end", type: "boolean", default: false },
      { id: "fullWidth", name: "Full width", type: "boolean", default: false },
      { id: "loading", name: "Loading", type: "boolean", default: false },
      { id: "disabled", name: "Disabled", type: "boolean", default: false },
    ],
    axes: {
      emphasis: ["primary", "secondary"],
      size: ["small", "medium", "large"],
    },
    defaults: { emphasis: "primary", size: "medium" },
    responsive: [],
    rules: [
      {
        id: "secondary",
        name: "Secondary",
        when: { variants: { emphasis: "secondary" }, states: [] },
        patch: {
          button_root: {
            background: ref("secondary_fill"),
            color: ref("secondary_text"),
            borderColor: ref("color_border"),
          },
        },
      },
      {
        id: "small",
        name: "Small",
        when: { variants: { size: "small" }, states: [] },
        patch: {
          button_root: { paddingInline: dim(12), paddingBlock: dim(6) },
          button_label: { fontSize: dim(12) },
        },
      },
      {
        id: "large",
        name: "Large",
        when: { variants: { size: "large" }, states: [] },
        patch: {
          button_root: { paddingInline: dim(24), paddingBlock: dim(14) },
          button_label: { fontSize: dim(16) },
        },
      },
      {
        id: "hover",
        name: "Hover",
        when: { variants: { emphasis: "primary" }, states: ["hover"] },
        patch: {
          button_root: {
            background: ref("hover_fill"),
            borderColor: ref("hover_fill"),
          },
        },
      },
      {
        id: "secondaryHover",
        name: "Secondary hover",
        when: { variants: { emphasis: "secondary" }, states: ["hover"] },
        patch: { button_root: { background: ref("color_canvas") } },
      },
      {
        id: "pressed",
        name: "Pressed",
        when: { variants: { emphasis: "primary" }, states: ["pressed"] },
        patch: {
          button_root: {
            background: ref("pressed_fill"),
            borderColor: ref("pressed_fill"),
          },
        },
      },
      {
        id: "disabled",
        name: "Disabled",
        when: { variants: {}, states: ["disabled"] },
        patch: {
          button_root: {
            background: ref("disabled_fill"),
            borderColor: ref("disabled_fill"),
            color: ref("color_muted"),
          },
        },
      },
      {
        id: "focus",
        name: "Focus-visible",
        when: { variants: {}, states: ["focus-visible"] },
        patch: {
          button_root: {
            outlineWidth: dim(3),
            outlineOffset: dim(3),
            outlineColor: ref("focus"),
          },
        },
      },
    ],
  };
  entities.push(button);
  // One transaction: references are validated after all entities exist.
  doc = execute(
    doc,
    entities.map((entity) => ({ type: "create", entity })),
  );
  doc = execute(doc, [
    {
      type: "update",
      id: "dark",
      changes: {
        assignments: {
          surface: ref("color_ink"),
          text_primary: ref("color_white"),
          secondary_fill: ref("color_ink"),
          secondary_text: ref("color_white"),
        },
      },
    },
    {
      type: "update",
      id: "compact",
      changes: {
        assignments: { padding_inline: dim(12), padding_block: dim(6) },
      },
    },
  ]);
  return { ...doc, revision: 0 };
}
