import { execute } from "../domain/engine";
import {
  type ComponentEntity,
  type Entity,
  type LibraryDocument,
  type NodeEntity,
} from "../domain/schema";
import { ref, dim, createStarter } from "./library";
import type { Command } from "../domain/engine";

export function authorCollection(doc: LibraryDocument): LibraryDocument {
  const entities: Entity[] = [];
  function node(
    id: string,
    name: string,
    primitive: NodeEntity["primitive"],
    children: string[] = [],
    bindings: NodeEntity["bindings"] = {},
    props: NodeEntity["props"] = {},
    expose: NodeEntity["expose"] = {},
  ): string {
    entities.push({
      id,
      name,
      kind: "node",
      primitive,
      children,
      bindings,
      props,
      expose,
    });
    return id;
  }
  function component(
    id: string,
    name: string,
    rootId: string,
    properties: ComponentEntity["properties"] = [],
    behavior: ComponentEntity["behavior"] = "static",
  ) {
    entities.push({
      id,
      name,
      kind: "component",
      rootId,
      properties,
      behavior,
      axes: {},
      defaults: {},
      rules: [],
      responsive: [],
    });
  }
  const text = node(
    "text_root",
    "Text",
    "Text",
    [],
    {
      fontFamily: ref("font_family"),
      fontSize: dim(16),
      color: ref("text_primary"),
    },
    { text: "Design is in the details." },
    { text: "content" },
  );
  component("text_component", "Text", text, [
    {
      id: "content",
      name: "Content",
      type: "text",
      default: "Design is in the details.",
    },
  ]);
  component(
    "icon_component",
    "Icon",
    node(
      "icon_root",
      "Icon",
      "Icon",
      [],
      { color: ref("text_primary"), fontSize: dim(24) },
      { text: "+" },
      { text: "symbol" },
    ),
    [{ id: "symbol", name: "Symbol", type: "text", default: "+" }],
  );
  component(
    "image_component",
    "Image",
    node(
      "image_root",
      "Image",
      "Image",
      [],
      { maxWidth: { value: { type: "dimension", value: 100, unit: "%" } } },
      { alt: "Choose an image asset" },
      { assetId: "image" },
    ),
    [{ id: "image", name: "Image asset", type: "asset", default: "" }],
  );
  for (const primitive of ["Surface", "Stack", "Inline", "Grid"] as const) {
    const id = primitive.toLowerCase();
    component(
      `${id}_component`,
      primitive,
      node(
        `${id}_root`,
        primitive,
        primitive,
        [],
        {
          gap: dim(16),
          paddingInline: dim(20),
          paddingBlock: dim(20),
          background: ref("surface"),
          color: ref("text_primary"),
        },
        { columns: 2 },
      ),
    );
    const layoutRoot = entities.find((e) => e.id === `${id}_root`);
    if (layoutRoot?.kind === "node") layoutRoot.slot = "default";
  }
  component(
    "link_component",
    "Link",
    node(
      "link_root",
      "Link",
      "Link",
      [],
      {
        color: ref("focus"),
        fontFamily: ref("font_family"),
        fontSize: dim(14),
      },
      { text: "View details", href: "#details" },
      { text: "label", href: "href" },
    ),
    [
      { id: "label", name: "Label", type: "text", default: "View details" },
      { id: "href", name: "Destination", type: "text", default: "#details" },
    ],
    "link",
  );
  component(
    "textfield_component",
    "TextField",
    node(
      "textfield_root",
      "Text field",
      "TextField",
      [],
      {
        fontFamily: ref("font_family"),
        fontSize: dim(14),
        paddingInline: ref("padding_inline"),
        paddingBlock: ref("padding_block"),
        borderRadius: ref("radius"),
        borderWidth: dim(1),
        borderColor: ref("color_border"),
        background: ref("secondary_fill"),
        color: ref("secondary_text"),
      },
      { text: "Enter a value" },
      { text: "placeholder" },
    ),
    [
      {
        id: "placeholder",
        name: "Placeholder",
        type: "text",
        default: "Enter a value",
      },
    ],
    "input",
  );
  component(
    "checkbox_component",
    "Checkbox",
    node(
      "checkbox_root",
      "Checkbox",
      "Checkbox",
      [],
      { width: dim(18), minHeight: dim(18) },
      { text: "Enable option" },
      { text: "label" },
    ),
    [
      {
        id: "label",
        name: "Accessible label",
        type: "text",
        default: "Enable option",
      },
    ],
    "checkbox",
  );
  const weightValue = node(
    "weight_value",
    "Weight value",
    "Text",
    [],
    {
      fontFamily: ref("font_family"),
      fontWeight: { value: { type: "fontWeight", value: 600 } },
      fontSize: dim(48),
      lineHeight: { value: { type: "number", value: 1.1 } },
      color: ref("text_primary"),
    },
    { text: "18.2" },
    { text: "weight" },
  );
  const weightUnit = node(
    "weight_unit",
    "Unit",
    "Text",
    [],
    { fontSize: dim(16), color: ref("color_muted") },
    { text: "g" },
    { text: "unit" },
  );
  const weightStatus = node(
    "weight_status",
    "Connection status",
    "Text",
    [],
    { fontSize: dim(12), color: ref("color_muted") },
    { text: "Stable · Connected" },
    { text: "status" },
  );
  const weightLine = node(
    "weight_line",
    "Value and unit",
    "Inline",
    [weightValue, weightUnit],
    { gap: dim(8) },
    { align: "end" },
  );
  const weightRoot = node(
    "weight_root",
    "Weight readout",
    "Stack",
    [weightLine, weightStatus],
    {
      gap: dim(10),
      paddingInline: dim(24),
      paddingBlock: dim(24),
      background: ref("surface"),
      borderRadius: ref("radius"),
    },
  );
  component("weight_readout", "WeightReadout", weightRoot, [
    { id: "weight", name: "Weight", type: "number", default: 18.2 },
    { id: "unit", name: "Unit", type: "text", default: "g" },
    {
      id: "status",
      name: "Status",
      type: "text",
      default: "Stable · Connected",
    },
  ]);
  const timerLabel = node(
    "timer_label",
    "Label",
    "Text",
    [],
    { fontSize: dim(12), color: ref("color_muted") },
    { text: "Brew time" },
  );
  const timerValue = node(
    "timer_value",
    "Elapsed",
    "Text",
    [],
    {
      fontFamily: ref("font_family"),
      fontSize: dim(36),
      fontWeight: ref("font_weight"),
      color: ref("text_primary"),
    },
    { text: "00:42" },
    { text: "elapsed" },
  );
  component(
    "timer_component",
    "Timer",
    node("timer_root", "Timer", "Stack", [timerLabel, timerValue], {
      gap: dim(10),
      paddingInline: dim(24),
      paddingBlock: dim(24),
      background: ref("surface"),
      borderRadius: ref("radius"),
    }),
    [
      {
        id: "elapsed",
        name: "Formatted elapsed time",
        type: "text",
        default: "00:42",
      },
    ],
  );
  entities.push(
    {
      id: "brew_weight",
      kind: "instance",
      name: "Brew weight",
      componentId: "weight_readout",
      configuration: { weight: 18.2, status: "Stable · Connected" },
      variants: {},
      overrides: {},
    },
    {
      id: "brew_timer",
      kind: "instance",
      name: "Brew timer",
      componentId: "timer_component",
      configuration: { elapsed: "00:42" },
      variants: {},
      overrides: {},
    },
    {
      id: "brew_tare",
      kind: "instance",
      name: "Tare control",
      componentId: "button",
      configuration: { label: "Tare", icon: "↺" },
      variants: { emphasis: "secondary" },
      overrides: {},
    },
    {
      id: "brew_start",
      kind: "instance",
      name: "Start control",
      componentId: "button",
      configuration: { label: "Start brew", icon: "+" },
      variants: {},
      overrides: {},
    },
  );
  entities.push({
    id: "brew_panel",
    name: "BrewPanel",
    kind: "composition",
    instances: ["brew_weight", "brew_timer", "brew_tare", "brew_start"],
    layout: "grid",
    gap: dim(16),
    columns: 2,
    domain: "Brewing",
    dataContract: {
      weight: "number",
      connectionStatus: "text",
      stable: "boolean",
      overload: "boolean",
      elapsed: "text",
      tare: "action",
      start: "action",
    },
  });
  return execute(
    doc,
    entities
      .filter((e) => !doc.entities[e.id])
      .map((entity) => ({ type: "create", entity })),
  );
}
export const sampleScenarios = {
  Connected: { weight: 18.2, status: "Stable · Connected" },
  Disconnected: { weight: 0, status: "Disconnected · Last value unavailable" },
  Stale: { weight: 18.2, status: "Stale · Waiting for an update" },
  Unstable: { weight: 18.4, status: "Unstable · Settling" },
  Overload: { weight: 5000, status: "Overload · Remove weight" },
} as const;
export function applyBrewScenario(
  doc: LibraryDocument,
  scenario: keyof typeof sampleScenarios,
): Command[] {
  const value = sampleScenarios[scenario];
  if (doc.entities.brew_weight?.kind !== "instance") return [];
  return [
    {
      type: "update",
      id: "brew_weight",
      changes: { configuration: { ...value } },
    },
  ];
}
export const createCompleteStarter = () => ({
  ...authorCollection(createStarter()),
  revision: 0,
});
