import {
  type Binding,
  type ComponentEntity,
  type Entity,
  type LibraryDocument,
  type NodeEntity,
} from "../domain/schema";
import { register } from "./registration";
import { dim, ref } from "./library";
export const SHADCN_REVISION = "d2fba50ee5b9113008b5bb908563527b7efd2f27";
const number = (value: number): Binding => ({
  value: { type: "number", value },
});
const textProp = (
  id: string,
  name: string,
  value: string,
): ComponentEntity["properties"][number] => ({
  id,
  name,
  type: "text",
  default: value,
});
export function authorExpansion(input: LibraryDocument): LibraryDocument {
  const entities: Entity[] = [];
  const node = (
    id: string,
    name: string,
    primitive: NodeEntity["primitive"],
    bindings: NodeEntity["bindings"] = {},
    children: string[] = [],
    props: NodeEntity["props"] = {},
    expose: NodeEntity["expose"] = {},
    slot?: string,
  ) => {
    entities.push({
      id,
      name,
      kind: "node",
      primitive,
      bindings,
      children,
      props,
      expose,
      ...(slot ? { slot } : {}),
    });
    return id;
  };
  const capabilities = (source: string) => ({
    targets: ["astro", "html"] as ("astro" | "html")[],
    dependencies: [],
    hydration: "none" as const,
    limits:
      "Native anatomy, content, bindings, variants and slots. Application actions belong to the consumer.",
    source: `https://ui.shadcn.com/docs/components/radix/${source}`,
    revision: SHADCN_REVISION,
  });
  const component = (
    id: string,
    name: string,
    rootId: string,
    properties: ComponentEntity["properties"] = [],
    axes: ComponentEntity["axes"] = {},
    defaults: ComponentEntity["defaults"] = {},
    rules: ComponentEntity["rules"] = [],
  ) => {
    entities.push({
      id,
      name,
      kind: "component",
      rootId,
      properties,
      axes,
      defaults,
      rules,
      behavior: "static",
      responsive: [],
      capabilities: capabilities(name.toLowerCase()),
    });
  };
  const preset = (
    id: string,
    name: string,
    componentId: string,
    configuration: Record<string, string | number | boolean> = {},
    variants: Record<string, string> = {},
    overrides: Extract<Entity, { kind: "preset" }>["overrides"] = {},
    description = "Snapshot configuration; inherits its shared component definition.",
  ) =>
    entities.push({
      id,
      name,
      kind: "preset",
      componentId,
      mode: "snapshot",
      configuration,
      variants,
      overrides,
      description,
    });
  const type = {
    fontFamily: ref("font_family"),
    fontSize: ref("font_size"),
    color: ref("text_primary"),
  };
  const box = {
    ...type,
    background: ref("surface"),
    borderColor: ref("color_border"),
    borderWidth: dim(1),
    borderRadius: ref("radius"),
    paddingInline: ref("padding_inline"),
    paddingBlock: ref("padding_block"),
  };
  entities.push(
    {
      id: "source_danger",
      name: "Red 600",
      kind: "source",
      sourceType: "color",
      value: {
        type: "color",
        space: "oklch",
        channels: [0.5770988158658138, 0.2151567338031568, 27.32504873954491],
        alpha: 1,
      } as const,
    },
    {
      id: "color_danger",
      name: "color.danger",
      kind: "token",
      layer: "foundation",
      valueType: "color",
      binding: ref("source_danger"),
    },
    {
      id: "danger_fill",
      name: "feedback.danger.fill",
      kind: "token",
      layer: "semantic",
      valueType: "color",
      binding: ref("color_danger"),
    },
  );
  const button = input.entities.button as ComponentEntity;
  const buttonCommands = [
    {
      type: "update",
      id: "button",
      changes: {
        capabilities: capabilities("button"),
        axes: {
          ...button.axes,
          emphasis: [
            ...button.axes.emphasis,
            "outline",
            "destructive",
            "ghost",
          ],
        },
        rules: [
          ...button.rules,
          {
            id: "outline",
            name: "Outline",
            when: { variants: { emphasis: "outline" }, states: [] },
            patch: {
              button_root: {
                background: ref("surface"),
                color: ref("text_primary"),
                borderColor: ref("color_border"),
              },
            },
          },
          {
            id: "destructive",
            name: "Destructive",
            when: { variants: { emphasis: "destructive" }, states: [] },
            patch: {
              button_root: {
                background: ref("danger_fill"),
                color: ref("color_white"),
                borderColor: ref("danger_fill"),
              },
            },
          },
          {
            id: "ghost",
            name: "Ghost",
            when: { variants: { emphasis: "ghost" }, states: [] },
            patch: {
              button_root: {
                background: {
                  value: {
                    ...({
                      type: "color",
                      space: "oklch",
                      channels: [0, 0, 0],
                      alpha: 1,
                    } as const),
                    alpha: 0,
                  },
                },
                color: ref("text_primary"),
                borderWidth: dim(0),
              },
            },
          },
        ],
      },
    },
  ].map((c) => c as import("../domain/engine").Command);
  // Register dependencies with their consumers in one validated transaction below.
  preset(
    "preset_button_outline",
    "Outline Button with trailing icon",
    "button",
    { label: "Continue", icon: "→", iconEnd: true },
    { emphasis: "outline" },
  );
  preset(
    "preset_button_destructive",
    "Destructive Button",
    "button",
    { label: "Delete", showIcon: false },
    { emphasis: "destructive" },
  );
  // Typography uses one Text definition and reusable shared styles.
  for (const [role, size, weight] of [
    ["heading", 32, 600],
    ["body", 16, 400],
    ["muted", 14, 400],
  ] as const) {
    entities.push({
      id: `type_${role}`,
      name: `Typography / ${role}`,
      kind: "style",
      bindings: {
        fontFamily: ref("font_family"),
        fontSize: dim(size),
        fontWeight: { value: { type: "fontWeight", value: weight } },
        lineHeight: number(role === "heading" ? 1.2 : 1.5),
        color: ref(role === "muted" ? "color_muted" : "text_primary"),
      },
    });
  }
  // Semantic element is an independent axis on the existing Text definition.
  const text = input.entities.text_component as ComponentEntity;
  const textRoot = input.entities.text_root as NodeEntity;
  entities.push({ ...textRoot, styleId: "type_body", bindings: {} });
  entities.push({
    ...text,
    capabilities: capabilities("typography"),
    axes: {
      element: ["span", "p", "h1", "h2", "h3", "blockquote", "code"],
      tone: ["body", "heading", "muted"],
    },
    defaults: { element: "p", tone: "body" },
    rules: [
      {
        id: "heading",
        name: "Heading",
        when: { variants: { tone: "heading" }, states: [] },
        patch: {
          text_root: {
            fontSize: dim(32),
            fontWeight: ref("font_weight"),
            lineHeight: number(1.2),
          },
        },
      },
      {
        id: "muted",
        name: "Muted",
        when: { variants: { tone: "muted" }, states: [] },
        patch: { text_root: { fontSize: dim(14), color: ref("color_muted") } },
      },
    ],
  });
  preset(
    "preset_heading",
    "Heading",
    "text_component",
    { content: "A considered interface" },
    { element: "h2", tone: "heading" },
  );
  preset(
    "preset_muted",
    "Muted paragraph",
    "text_component",
    { content: "Additional information about this section." },
    { element: "p", tone: "muted" },
  );
  const badge = node(
    "badge_root",
    "Badge",
    "Inline",
    {
      ...type,
      background: ref("secondary_fill"),
      color: ref("secondary_text"),
      paddingInline: dim(8),
      paddingBlock: dim(2),
      borderRadius: ref("radius"),
      borderColor: ref("color_border"),
      borderWidth: dim(1),
    },
    [],
    { text: "Status" },
    { text: "label" },
    "default",
  );
  component(
    "badge_component",
    "Badge",
    badge,
    [textProp("label", "Label", "Status")],
    {
      tone: ["secondary", "primary", "destructive"],
      size: ["small", "medium"],
    },
    { tone: "secondary", size: "medium" },
    [
      {
        id: "primary",
        name: "Primary",
        when: { variants: { tone: "primary" }, states: [] },
        patch: { badge_root: { background: ref("fill"), color: ref("text") } },
      },
      {
        id: "danger",
        name: "Destructive",
        when: { variants: { tone: "destructive" }, states: [] },
        patch: {
          badge_root: {
            background: ref("danger_fill"),
            color: ref("color_white"),
          },
        },
      },
      {
        id: "small",
        name: "Small",
        when: { variants: { size: "small" }, states: [] },
        patch: { badge_root: { fontSize: dim(12) } },
      },
    ],
  );
  preset(
    "preset_badge_status",
    "Status Badge",
    "badge_component",
    { label: "Connected" },
    { tone: "secondary" },
  );
  const avatarFallback = node(
    "avatar_fallback",
    "Fallback initials",
    "Text",
    { fontWeight: ref("font_weight") },
    [],
    { text: "FW" },
    { text: "initials" },
  );
  const avatarImage = node(
    "avatar_image",
    "Avatar image",
    "Image",
    { width: dim(40), minHeight: dim(40), borderRadius: dim(999) },
    [],
    { alt: "" },
    { assetId: "image" },
  );
  component(
    "avatar_component",
    "Avatar",
    node(
      "avatar_root",
      "Avatar",
      "Inline",
      {
        ...type,
        background: ref("secondary_fill"),
        borderRadius: dim(999),
        width: dim(40),
        minHeight: dim(40),
      },
      [avatarImage, avatarFallback],
      { role: "img", label: "User avatar" },
    ),
    [
      textProp("label", "Accessible label", "User avatar"),
      textProp("initials", "Fallback initials", "FW"),
      { id: "image", name: "Image asset", type: "asset", default: "" },
    ],
  );
  preset("preset_avatar", "Initials Avatar", "avatar_component", {
    initials: "JD",
  });
  component(
    "separator_component",
    "Separator",
    node("separator_root", "Divider", "Separator", {
      width: { value: { type: "dimension", value: 100, unit: "%" } },
      borderColor: ref("color_border"),
      borderWidth: dim(1),
    }),
  );
  preset("preset_separator", "Section separator", "separator_component");
  const title = node(
    "card_title",
    "Title",
    "Text",
    { fontWeight: ref("font_weight"), fontSize: dim(20) },
    [],
    { text: "Card title", tag: "h3" },
    { text: "title" },
    "title",
  );
  const description = node(
    "card_description",
    "Description",
    "Text",
    { color: ref("color_muted") },
    [],
    { text: "Card description", tag: "p" },
    { text: "description" },
    "description",
  );
  const header = node(
    "card_header",
    "Header",
    "Stack",
    { gap: ref("space_gap") },
    [title, description],
    {},
    {},
    "header",
  );
  const content = node(
    "card_content_text",
    "Content text",
    "Text",
    {},
    [],
    { text: "Card content", tag: "p" },
    { text: "content" },
  );
  const footer = node(
    "card_footer_text",
    "Footer text",
    "Text",
    { color: ref("color_muted") },
    [],
    { text: "Last updated just now", tag: "p" },
    { text: "footer" },
  );
  const contentSlot = node(
    "card_content",
    "Content",
    "Stack",
    {},
    [content],
    {},
    {},
    "default",
  );
  const footerSlot = node(
    "card_footer",
    "Footer",
    "Stack",
    {},
    [footer],
    {},
    {},
    "footer",
  );
  component(
    "card_component",
    "Card",
    node(
      "card_root",
      "Card",
      "Stack",
      {
        ...box,
        gap: ref("padding_inline"),
        width: dim(340),
        maxWidth: { value: { type: "dimension", value: 100, unit: "%" } },
      },
      [header, contentSlot, footerSlot],
      { tag: "article" },
    ),
    [
      textProp("title", "Title", "Card title"),
      textProp("description", "Description", "Card description"),
      textProp("content", "Content", "Card content"),
      textProp("footer", "Footer", "Last updated just now"),
    ],
    { size: ["default", "compact"] },
    { size: "default" },
    [
      {
        id: "compact",
        name: "Compact",
        when: { variants: { size: "compact" }, states: [] },
        patch: {
          card_root: {
            gap: dim(8),
            paddingInline: dim(12),
            paddingBlock: dim(12),
          },
        },
      },
    ],
  );
  preset("preset_card_metric", "Metric Card", "card_component", {
    title: "Total revenue",
    description: "This month",
    content: "$45,231.89",
    footer: "+20.1% from last month",
  });
  const alertIcon = node(
    "alert_icon",
    "Icon",
    "Icon",
    { fontSize: dim(20) },
    [],
    { text: "ⓘ" },
    { text: "icon" },
    "icon",
  );
  const alertTitle = node(
    "alert_title",
    "Title",
    "Text",
    { fontWeight: ref("font_weight") },
    [],
    { text: "Heads up", tag: "h4" },
    { text: "title" },
    "title",
  );
  const alertDescription = node(
    "alert_description",
    "Description",
    "Text",
    { color: ref("color_muted") },
    [],
    { text: "Your changes have been saved.", tag: "p" },
    { text: "description" },
    "default",
  );
  component(
    "alert_component",
    "Alert",
    node(
      "alert_root",
      "Alert",
      "Stack",
      { ...box, gap: ref("space_gap"), width: dim(360) },
      [alertIcon, alertTitle, alertDescription],
      { role: "alert" },
    ),
    [
      textProp("title", "Title", "Heads up"),
      textProp("description", "Description", "Your changes have been saved."),
      textProp("icon", "Icon", "ⓘ"),
    ],
    { tone: ["default", "destructive"] },
    { tone: "default" },
    [
      {
        id: "danger",
        name: "Destructive",
        when: { variants: { tone: "destructive" }, states: [] },
        patch: {
          alert_root: { borderColor: ref("danger_fill") },
          alert_title: { color: ref("danger_fill") },
        },
      },
    ],
  );
  preset("preset_alert", "Informational Alert", "alert_component");
  component(
    "skeleton_component",
    "Skeleton",
    node("skeleton_root", "Placeholder", "Skeleton", {
      width: dim(240),
      minHeight: dim(24),
      borderRadius: ref("radius"),
      background: ref("color_border"),
    }),
  );
  preset("preset_skeleton", "Text Skeleton", "skeleton_component");
  component(
    "spinner_component",
    "Spinner",
    node(
      "spinner_root",
      "Spinner",
      "Spinner",
      { fontSize: dim(24), color: ref("fill") },
      [],
      { text: "◌" },
    ),
    [textProp("label", "Accessible label", "Loading")],
  );
  preset("preset_spinner", "Loading Spinner", "spinner_component");
  component(
    "progress_component",
    "Progress",
    node("progress_root", "Progress", "Progress", {
      width: dim(280),
      minHeight: dim(12),
      color: ref("fill"),
      background: ref("color_border"),
      borderRadius: ref("radius"),
    }),
    [
      { id: "value", name: "Value (0–100)", type: "number", default: 60 },
      textProp("label", "Accessible label", "Upload progress"),
    ],
  );
  preset("preset_progress", "Upload Progress", "progress_component", {
    value: 60,
  });
  const caption = node(
    "table_caption",
    "Caption",
    "TableCaption",
    { color: ref("color_muted"), paddingBlock: ref("padding_block") },
    [],
    { text: "Recent invoices" },
    { text: "caption" },
    "caption",
  );
  const cells = ["Invoice", "Status", "Amount"].map((label, i) =>
    node(
      `table_header_${i}`,
      label,
      "TableHeader",
      {
        paddingInline: ref("padding_inline"),
        paddingBlock: ref("padding_block"),
        fontWeight: ref("font_weight"),
        borderColor: ref("color_border"),
        borderWidth: dim(1),
      },
      [],
      { text: label },
      { text: `column${i + 1}` },
    ),
  );
  const head = node("table_head", "Head", "TableHead", {}, [
    node("table_head_row", "Header row", "TableRow", {}, cells),
  ]);
  const rows = [
    ["INV001", "Paid", "$250.00"],
    ["INV002", "Pending", "$150.00"],
  ].map((row, r) =>
    node(
      `table_row_${r}`,
      `Row ${r + 1}`,
      "TableRow",
      {},
      row.map((value, i) =>
        node(
          `table_cell_${r}_${i}`,
          `Row ${r + 1} ${["invoice", "status", "amount"][i]}`,
          "TableCell",
          {
            paddingInline: ref("padding_inline"),
            paddingBlock: ref("padding_block"),
            borderColor: ref("color_border"),
            borderWidth: dim(1),
          },
          [],
          { text: value },
          { text: `cell${r + 1}${i + 1}` },
        ),
      ),
    ),
  );
  const body = node(
    "table_body",
    "Body",
    "TableBody",
    {},
    rows,
    {},
    {},
    "default",
  );
  component(
    "table_component",
    "Table",
    node(
      "table_root",
      "Table",
      "Table",
      {
        ...type,
        width: { value: { type: "dimension", value: 100, unit: "%" } },
      },
      [caption, head, body],
    ),
    [
      textProp("caption", "Caption", "Recent invoices"),
      ...["Invoice", "Status", "Amount"].map((x, i) =>
        textProp(`column${i + 1}`, `Column ${i + 1}`, x),
      ),
      ...["INV001", "Paid", "$250.00", "INV002", "Pending", "$150.00"].map(
        (x, i) =>
          textProp(
            `cell${Math.floor(i / 3) + 1}${(i % 3) + 1}`,
            `Cell ${Math.floor(i / 3) + 1}, ${(i % 3) + 1}`,
            x,
          ),
      ),
    ],
  );
  preset("preset_table", "Invoice Table", "table_component");
  // Overrides to existing Text records are explicit registration updates; all new records use create.
  const commands = entities.map((entity) => ({
    type: input.entities[entity.id] ? ("update" as const) : ("create" as const),
    ...(input.entities[entity.id]
      ? { id: entity.id, changes: entity }
      : { entity }),
  }));
  return register(
    input,
    entities.filter((e) => !input.entities[e.id]),
    [
      ...buttonCommands,
      ...commands.filter((c) => c.type === "update"),
    ] as import("../domain/engine").Command[],
  );
}
