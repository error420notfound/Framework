import { InstanceAppearance } from "./InstanceAppearance";
import { PanelResize } from "../controls/PanelResize";
import { Breadcrumbs } from "../controls/Breadcrumbs";
import {
  appearanceGroup,
  baseBinding,
  effectiveBinding,
  scopePatch,
  scopeOrigin,
  changeScopeBinding,
} from "../resolution";
import { IconPicker } from "../controls/IconPicker";
import { iconProperty } from "../../icons/catalog";
import { useState, useEffect } from "react";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  RotateCcw,
  Trash2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useEditor } from "../../app/store";
import { componentForNode, resolve, usedBy } from "../../domain/engine";
import {
  cssValue,
  newId,
  primitives,
  propertyTypes,
  type Binding,
  type ComponentEntity,
  type Entity,
  type NodeEntity,
  type ValueType,
} from "../../domain/schema";
import {
  BindingEditor,
  CommitInput,
  Field,
  ValueEditor,
} from "../controls/Fields";
import { dim } from "../../starter/library";
import { FontStatus } from "../controls/FontStatus";
export type CreateRequest = {
  kind?: Entity["kind"];
  type?: ValueType;
  targetId?: string;
  property?: string;
  parentId?: string;
  ruleScope?: string;
};
export function Inspector({
  onCreate,
}: {
  onCreate: (request?: CreateRequest) => void;
}) {
  const { doc, selectedId, command, select } = useEditor();
  const entity = doc.entities[selectedId];
  const scope = useEditor((s) => s.bindingScope);
  const setScope = (bindingScope: string) =>
    useEditor.setState({ bindingScope });
  const selectedKind = doc.entities[selectedId]?.kind;
  const [section, setSection] = useState(
    selectedKind === "node" || selectedKind === "style"
      ? "Appearance"
      : "Properties",
  );
  const state = useEditor();
  useEffect(() => {
    if (scope !== "base") setSection("Appearance");
  }, [scope]);
  const [property, setProperty] = useState("background");
  const [replacement, setReplacement] = useState("");
  if (!entity)
    return (
      <aside className="inspector">
        <PanelResize side="inspector" />
        <div className="pane-heading">Inspector</div>
        <p className="muted inspector-hint">
          Select an item to inspect its values, bindings and uses.
        </p>
      </aside>
    );
  const update = (changes: Partial<Entity>) =>
    command(
      [{ type: "update", id: entity.id, changes }],
      `Update ${entity.name}`,
    );
  const component =
    entity.kind === "node"
      ? componentForNode(doc, entity.id)
      : entity.kind === "component"
        ? entity
        : undefined;
  const exposedIconProperty =
    entity.kind === "node" && entity.primitive === "Icon"
      ? component?.properties.find(
          (property) => property.id === entity.expose.text,
        )
      : undefined;
  const setNodeIcon = (text: string) => {
    if (entity.kind !== "node") return;
    command(
      [
        {
          type: "update",
          id: entity.id,
          changes: { props: { ...entity.props, text } },
        },
        ...(component && exposedIconProperty
          ? [
              {
                type: "update" as const,
                id: component.id,
                changes: {
                  properties: component.properties.map((property) =>
                    property.id === exposedIconProperty.id
                      ? { ...property, default: text }
                      : property,
                  ),
                },
              },
            ]
          : []),
      ],
      "Update icon",
    );
    if (exposedIconProperty && useEditor.getState().doc !== doc) {
      const previewValues = { ...useEditor.getState().previewValues };
      delete previewValues[exposedIconProperty.id];
      useEditor.setState({ previewValues });
    }
  };
  const bind = (p: string, b: Binding) => {
    if (entity.kind === "node" && scope !== "base" && component) {
      command(
        [
          {
            type: "update",
            id: component.id,
            changes: changeScopeBinding(
              component,
              scope,
              entity.id,
              p,
              b,
              state.variants,
            ),
          },
        ],
        "Bind " + p + " in " + scope,
      );
    } else
      command(
        [{ type: "bind", id: entity.id, property: p, binding: b }],
        `Bind ${p}`,
      );
  };
  let bindings =
    entity.kind === "node" || entity.kind === "style" ? entity.bindings : {};
  const inheritedStyle =
    entity.kind === "node" && entity.styleId
      ? doc.entities[entity.styleId]
      : undefined;
  if (
    entity.kind === "node" &&
    scope === "base" &&
    inheritedStyle?.kind === "style"
  )
    bindings = { ...inheritedStyle.bindings, ...entity.bindings };
  if (entity.kind === "node" && scope !== "base")
    bindings = {
      ...(inheritedStyle?.kind === "style" ? inheritedStyle.bindings : {}),
      ...entity.bindings,
      ...(scopePatch(component, scope, state.variants)?.[entity.id] ?? {}),
    };
  const createBinding = (p: string, type: ValueType) =>
    onCreate({
      kind: "token",
      type,
      targetId: entity.id,
      property: p,
      ruleScope: scope !== "base" ? scope : undefined,
    });
  const dependencyCount = usedBy(doc, entity.id).length;
  const priority = (p: string) => {
    const i = [
      "background",
      "paddingInline",
      "paddingBlock",
      "fontSize",
      "fontFamily",
      "fontWeight",
      "color",
      "lineHeight",
      "letterSpacing",
    ].indexOf(p);
    return i < 0 ? 100 : i;
  };
  const bindingEntries = Object.entries(bindings).sort(
    ([a], [b]) => priority(a) - priority(b),
  );
  const bindingFields = bindingEntries.map(([p, b]) => (
    <BindingEditor
      key={p}
      label={p}
      effective={
        entity.kind === "node" && component
          ? (() => {
              const winner = effectiveBinding(doc, component, entity, p, {
                variants: state.variants,
                values: state.previewValues,
                states: state.states,
                viewport: state.viewport,
              });
              return winner
                ? winner.origin +
                    " · " +
                    cssValue(
                      resolve(doc, winner.binding, {
                        themeId: state.themeId,
                        densityId: state.densityId,
                      }).value,
                    )
                : undefined;
            })()
          : undefined
      }
      origin={
        entity.kind === "node"
          ? scope !== "base" &&
            scopePatch(component, scope, state.variants)?.[entity.id]?.[p]
            ? scopeOrigin(component, scope, state.variants)
            : baseBinding(doc, entity, p)?.origin
          : "Shared style value"
      }
      type={propertyTypes[p] ?? "string"}
      binding={b}
      onChange={(b) => bind(p, b)}
      onCreate={(type) => createBinding(p, type)}
      {...{
        [entity.kind === "style" ? "onRemove" : "onReset"]: (
          entity.kind === "node"
            ? scope !== "base"
              ? !!scopePatch(component, scope, state.variants)?.[entity.id]?.[p]
              : !!entity.bindings[p]
            : !!bindings[p]
        )
          ? () => {
              if (entity.kind === "node" || entity.kind === "style") {
                if (scope !== "base" && component) {
                  command(
                    [
                      {
                        type: "update",
                        id: component.id,
                        changes: changeScopeBinding(
                          component,
                          scope,
                          entity.id,
                          p,
                          undefined,
                          state.variants,
                        ),
                      },
                    ],
                    "Reset selected scope binding",
                  );
                } else {
                  const next = { ...entity.bindings };
                  delete next[p];
                  update({ bindings: next });
                }
              }
            }
          : undefined,
      }}
    />
  ));
  return (
    <aside className="inspector" key={entity.id}>
      <PanelResize side="inspector" />
      <div className="pane-heading">
        {entity.name}
        <span className="muted">{entity.kind}</span>
      </div>
      <Breadcrumbs />
      <div className="inspector-tabs">
        <span>Inspector</span>
        <button
          onClick={() =>
            useEditor.setState({ bottom: "Dependencies", panelOpen: true })
          }
        >
          Used by <small>{dependencyCount}</small>
        </button>
      </div>
      {[
        "node",
        "component",
        "instance",
        "preset",
        "style",
        "composition",
      ].includes(entity.kind) ? (
        <div className="inspector-sections" aria-label="Inspector sections">
          {(entity.kind === "node"
            ? [
                "Appearance",
                "Anatomy",
                "Properties",
                "Variants and states",
                "Behaviour/motion",
              ]
            : entity.kind === "component"
              ? [
                  "Properties",
                  "Appearance",
                  "Anatomy",
                  "Variants and states",
                  "Behaviour/motion",
                ]
              : entity.kind === "style"
                ? ["Appearance"]
                : entity.kind === "preset"
                  ? ["Properties", "Variants and states"]
                  : entity.kind === "instance"
                    ? ["Properties", "Appearance", "Variants and states"]
                    : ["Properties", "Behaviour/motion"]
          ).map((tab) => (
            <button
              key={tab}
              aria-pressed={section === tab}
              onClick={() => {
                if (entity.kind === "component" && tab === "Appearance")
                  select(entity.rootId);
                else setSection(tab);
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      ) : null}
      <div className="inspector-content">
        <Field label="Name">
          <CommitInput
            label="Entity name"
            value={entity.name}
            onCommit={(name) =>
              command([{ type: "rename", id: entity.id, name }], "Rename item")
            }
          />
        </Field>
        <div className="scope-label">
          Editing{" "}
          {entity.kind === "instance"
            ? "one instance"
            : entity.kind === "node"
              ? "component anatomy"
              : entity.kind === "token"
                ? `${entity.layer} token`
                : entity.kind}
        </div>
        {entity.kind === "source" ? (
          <>
            <ValueEditor
              value={entity.value}
              onChange={(value) => update({ value })}
            />
            {entity.origin ? (
              <div className="binding-trace">
                <span className="muted">Source identity</span>
                <code>{entity.origin.adapter}</code>
                <code>{entity.origin.externalId}</code>
              </div>
            ) : null}
            {entity.sourceType === "font" ? (
              <>
                <FontStatus source={entity} />
                <Field label="Supported weights">
                  <CommitInput
                    label="Font weights"
                    value={(entity.weights ?? [400]).join(", ")}
                    onCommit={(s) =>
                      update({ weights: s.split(",").map(Number) })
                    }
                  />
                </Field>
                <Field label="HTTPS stylesheet">
                  <CommitInput
                    label="Font stylesheet"
                    value={entity.stylesheet ?? ""}
                    onCommit={(s) => update({ stylesheet: s || undefined })}
                  />
                </Field>
                <p className="small muted">
                  System fallback is always available. Remote stylesheets are
                  explicit dependencies; the isolated preview uses supplied font
                  files.
                </p>
              </>
            ) : null}
          </>
        ) : null}
        {entity.kind === "token" ? (
          <>
            <div className="metadata-row">
              <span>Type</span>
              <code>{entity.valueType}</code>
            </div>
            <BindingEditor
              label="Value"
              binding={entity.binding}
              type={entity.valueType}
              onChange={(binding) =>
                command(
                  [{ type: "bind", id: entity.id, property: "value", binding }],
                  "Update token binding",
                )
              }
              onCreate={(type) => createBinding("value", type)}
            />
          </>
        ) : null}
        {entity.kind === "theme" ? (
          <>
            <div className="metadata-row">
              <span>Independent axis</span>
              <code>{entity.axis}</code>
            </div>
            <p className="small muted">
              Assignments change values without duplicating component structure.
            </p>
          </>
        ) : null}
        {entity.kind === "node" ? (
          <>
            <div hidden={section !== "Anatomy"}>
              <Field label="Primitive">
                <select
                  aria-label="Primitive type"
                  value={entity.primitive}
                  onChange={(e) =>
                    update({
                      primitive: e.target.value as NodeEntity["primitive"],
                    })
                  }
                >
                  {primitives.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div
              hidden={!["Appearance", "Variants and states"].includes(section)}
            >
              {component ? (
                <Field label="Binding scope">
                  <select
                    aria-label="Binding scope"
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                  >
                    <option value="base">Definition defaults</option>
                    {component.rules.map((r) => (
                      <option key={r.id} value={`rule:${r.id}`}>
                        {r.when.states.length ? "State" : "Variant"}: {r.name}
                      </option>
                    ))}
                    {component.responsive.map((r) => (
                      <option
                        key={r.maxWidth}
                        value={"responsive:" + r.maxWidth}
                      >
                        Responsive: ≤ {r.maxWidth} px
                      </option>
                    ))}
                    {Object.entries(component.axes).flatMap(([axis, values]) =>
                      values.map((v) => (
                        <option
                          key={`${axis}:${v}`}
                          value={`variant:${axis}:${v}`}
                        >
                          {axis}: {v}
                        </option>
                      )),
                    )}
                    {[
                      "hover",
                      "focus-visible",
                      "pressed",
                      "disabled",
                      "loading",
                    ].map((s) => (
                      <option key={s} value={`state:${s}`}>
                        State: {s}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </div>
            <div hidden={section !== "Properties"}>
              {entity.primitive === "Icon" ? (
                <IconPicker
                  key={entity.id}
                  label="Node text"
                  value={String(
                    exposedIconProperty?.default ?? entity.props.text ?? "",
                  )}
                  onChange={setNodeIcon}
                />
              ) : (
                <Field label="Text / fallback">
                  <CommitInput
                    label="Node text"
                    value={entity.props.text ?? ""}
                    onCommit={(text) =>
                      update({ props: { ...entity.props, text } })
                    }
                  />
                </Field>
              )}
              {entity.primitive === "Text" ||
              entity.primitive === "Surface" ||
              entity.primitive === "Stack" ? (
                <Field label="Semantic element">
                  <select
                    aria-label="Semantic element"
                    value={entity.props.tag ?? ""}
                    onChange={(e) => {
                      const props = { ...entity.props };
                      if (e.target.value)
                        props.tag = e.target
                          .value as NodeEntity["props"]["tag"];
                      else delete props.tag;
                      update({ props });
                    }}
                  >
                    <option value="">Default</option>
                    {(entity.primitive === "Text"
                      ? [
                          "span",
                          "p",
                          "h1",
                          "h2",
                          "h3",
                          "h4",
                          "blockquote",
                          "code",
                        ]
                      : ["section", "article"]
                    ).map((tag) => (
                      <option key={tag}>{tag}</option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field label="Accessible role">
                <select
                  aria-label="Accessible role"
                  value={entity.props.role ?? ""}
                  onChange={(e) => {
                    const props = { ...entity.props };
                    if (e.target.value)
                      props.role = e.target
                        .value as NodeEntity["props"]["role"];
                    else delete props.role;
                    update({ props });
                  }}
                >
                  <option value="">Native semantics</option>
                  {["status", "alert", "img", "presentation"].map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
              </Field>
              <Field label="Accessible label">
                <CommitInput
                  label="Anatomy accessible label"
                  value={entity.props.label ?? ""}
                  onCommit={(label) =>
                    update({ props: { ...entity.props, label } })
                  }
                />
              </Field>
              {entity.primitive === "Grid" ? (
                <Field label="Grid columns">
                  <CommitInput
                    label="Grid columns"
                    type="number"
                    value={entity.props.columns ?? 2}
                    onCommit={(s) =>
                      update({ props: { ...entity.props, columns: Number(s) } })
                    }
                  />
                </Field>
              ) : null}
              {["Stack", "Inline", "Grid", "Surface"].includes(
                entity.primitive,
              ) ? (
                <>
                  <Field label="Alignment">
                    <select
                      aria-label="Node alignment"
                      value={entity.props.align ?? "stretch"}
                      onChange={(e) =>
                        update({
                          props: {
                            ...entity.props,
                            align: e.target.value as any,
                          },
                        })
                      }
                    >
                      {["start", "center", "end", "stretch"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Justification">
                    <select
                      aria-label="Node justification"
                      value={entity.props.justify ?? "start"}
                      onChange={(e) =>
                        update({
                          props: {
                            ...entity.props,
                            justify: e.target.value as any,
                          },
                        })
                      }
                    >
                      {["start", "center", "end", "between"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </Field>
                </>
              ) : null}
            </div>
            <div
              hidden={
                section !== "Appearance" ||
                (!entity.styleId &&
                  !["Text", "Icon"].includes(entity.primitive))
              }
            >
              <Field label="Typography style">
                <select
                  aria-label="Typography style"
                  value={entity.styleId ?? ""}
                  onChange={(e) =>
                    command(
                      [
                        {
                          type: "applyStyle",
                          id: entity.id,
                          styleId: e.target.value || undefined,
                        },
                      ],
                      "Apply typography style",
                    )
                  }
                >
                  <option value="">No style</option>
                  {Object.values(doc.entities)
                    .filter((e) => e.kind === "style")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </Field>
              <button
                className="text-link"
                onClick={() => onCreate({ kind: "style", targetId: entity.id })}
              >
                <Plus size={13} />
                Create a style
              </button>
              {entity.styleId ? (
                <div className="inheritance">
                  <span>
                    Inherited from {doc.entities[entity.styleId]?.name}
                  </span>
                  <button
                    className="icon-button"
                    title="Open style"
                    onClick={() => select(entity.styleId!)}
                  >
                    <ExternalLink size={13} />
                  </button>
                </div>
              ) : null}
            </div>
            <div hidden={section !== "Properties"}>
              <Field label="Expose text as property">
                <select
                  aria-label="Expose text property"
                  value={entity.expose.text ?? ""}
                  onChange={(e) =>
                    update({
                      expose: Object.fromEntries(
                        Object.entries({
                          ...entity.expose,
                          text: e.target.value,
                        }).filter(([, v]) => !!v),
                      ),
                    })
                  }
                >
                  <option value="">Static content</option>
                  {component?.properties
                    .filter((p) => p.type === "text")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Slot name">
                <CommitInput
                  label="Slot name"
                  value={entity.slot ?? ""}
                  onCommit={(slot) => update({ slot: slot || undefined })}
                />
              </Field>
              {entity.primitive === "Image" ? (
                <>
                  <Field label="Image asset">
                    <select
                      aria-label="Image asset"
                      value={entity.props.assetId ?? ""}
                      onChange={(e) =>
                        update({
                          props: {
                            ...entity.props,
                            assetId: e.target.value || undefined,
                          },
                        })
                      }
                    >
                      <option value="">Choose asset</option>
                      {Object.values(doc.entities)
                        .filter(
                          (e) =>
                            e.kind === "asset" &&
                            e.mediaType.startsWith("image"),
                        )
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Alternative text">
                    <CommitInput
                      label="Alternative text"
                      value={entity.props.alt ?? ""}
                      onCommit={(alt) =>
                        update({ props: { ...entity.props, alt } })
                      }
                    />
                  </Field>
                </>
              ) : null}
            </div>
            <div hidden={section !== "Anatomy"}>
              <div className="section-divider">
                <h3>Anatomy</h3>
                <button
                  className="text-link"
                  onClick={() =>
                    onCreate({ kind: "node", parentId: entity.id })
                  }
                >
                  <Plus size={13} />
                  Add part
                </button>
              </div>
              {entity.children.map((id, index) => (
                <div className="child-row" key={id}>
                  <button className="text-link" onClick={() => select(id)}>
                    {doc.entities[id]?.name}
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Move ${doc.entities[id]?.name} up`}
                    disabled={!index}
                    onClick={() =>
                      command(
                        [
                          {
                            type: "move",
                            id,
                            parentId: entity.id,
                            index: index - 1,
                          },
                        ],
                        "Reorder part",
                      )
                    }
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Move ${doc.entities[id]?.name} down`}
                    disabled={index === entity.children.length - 1}
                    onClick={() =>
                      command(
                        [
                          {
                            type: "move",
                            id,
                            parentId: entity.id,
                            index: index + 1,
                          },
                        ],
                        "Reorder part",
                      )
                    }
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${doc.entities[id]?.name}`}
                    onClick={() =>
                      command(
                        [{ type: "removeNode", id }],
                        "Remove anatomy part and its rules",
                      )
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : null}
        {entity.kind === "node" || entity.kind === "style" ? (
          <>
            {["Fill", "Layout and spacing", "Border", "Typography", "Effects"]
              .filter((group) =>
                bindingEntries.some(([p]) => appearanceGroup(p) === group),
              )
              .map((group) => (
                <details
                  open={["Fill", "Layout and spacing", "Typography"].includes(
                    group,
                  )}
                  className="appearance-group"
                  key={group}
                  hidden={
                    !["Appearance", "Variants and states"].includes(section)
                  }
                >
                  <summary>{group}</summary>
                  {bindingFields.filter(
                    (_, i) => appearanceGroup(bindingEntries[i][0]) === group,
                  )}
                </details>
              ))}
            <div
              className="add-binding"
              hidden={!["Appearance", "Variants and states"].includes(section)}
            >
              <select
                aria-label="New binding property"
                value={property}
                onChange={(e) => setProperty(e.target.value)}
              >
                {Object.keys(propertyTypes)
                  .filter((p) => !bindings[p])
                  .map((p) => (
                    <option key={p}>{p}</option>
                  ))}
              </select>
              <button
                className="icon-button"
                aria-label="Add binding"
                onClick={() => {
                  const type = propertyTypes[property];
                  const token = Object.values(doc.entities).find(
                    (e) => e.kind === "token" && e.valueType === type,
                  );
                  if (token) bind(property, { ref: token.id });
                  else createBinding(property, type);
                }}
              >
                <Plus size={16} />
              </button>
            </div>
          </>
        ) : null}
        {entity.kind === "component" ? (
          <ComponentInspector
            component={entity}
            onCreate={onCreate}
            section={section}
          />
        ) : null}
        {entity.kind === "instance" || entity.kind === "preset" ? (
          <>
            <button
              className="text-link"
              onClick={() => select(entity.componentId)}
            >
              Open definition <ExternalLink size={13} />
            </button>
            {(() => {
              const c = doc.entities[entity.componentId];
              if (c?.kind !== "component") return null;
              return (
                <>
                  <div hidden={section !== "Variants and states"}>
                    {Object.entries(c.axes).map(([axis, choices]) => (
                      <Field key={axis} label={axis}>
                        <select
                          aria-label={"Instance " + axis}
                          value={entity.variants[axis] ?? c.defaults[axis]}
                          onChange={(e) =>
                            update({
                              variants: {
                                ...entity.variants,
                                [axis]: e.target.value,
                              },
                            })
                          }
                        >
                          {choices.map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </Field>
                    ))}
                  </div>
                  <div hidden={section !== "Properties"}>
                    {c.properties.map((p) =>
                      iconProperty(doc, p.id, c.rootId) ? (
                        <IconPicker
                          key={p.id}
                          label={`Instance ${p.name}`}
                          value={String(
                            entity.configuration[p.id] ?? p.default,
                          )}
                          onChange={(value) =>
                            update({
                              configuration: {
                                ...entity.configuration,
                                [p.id]: value,
                              },
                            })
                          }
                        />
                      ) : (
                        <Field key={p.id} label={p.name}>
                          {p.type === "boolean" ? (
                            <input
                              type="checkbox"
                              checked={Boolean(
                                entity.configuration[p.id] ?? p.default,
                              )}
                              onChange={(e) =>
                                update({
                                  configuration: {
                                    ...entity.configuration,
                                    [p.id]: e.target.checked,
                                  },
                                })
                              }
                            />
                          ) : (
                            <CommitInput
                              label={`Instance ${p.name}`}
                              value={String(
                                entity.configuration[p.id] ?? p.default,
                              )}
                              onCommit={(s) =>
                                update({
                                  configuration: {
                                    ...entity.configuration,
                                    [p.id]: p.type === "number" ? Number(s) : s,
                                  },
                                })
                              }
                            />
                          )}
                        </Field>
                      ),
                    )}
                  </div>
                  <div hidden={section !== "Appearance"}>
                    {entity.kind === "instance" ? (
                      <InstanceAppearance instance={entity} />
                    ) : null}
                  </div>
                </>
              );
            })()}
          </>
        ) : null}
        {entity.kind === "composition" ? (
          <>
            <Field label="Layout">
              <select
                value={entity.layout}
                onChange={(e) => update({ layout: e.target.value as any })}
              >
                <option>stack</option>
                <option>inline</option>
                <option>grid</option>
              </select>
            </Field>
            <BindingEditor
              label="Gap"
              binding={entity.gap}
              type="dimension"
              onChange={(gap) => update({ gap })}
            />
            <button
              className="text-link"
              onClick={() =>
                onCreate({ kind: "instance", parentId: entity.id })
              }
            >
              <Plus size={13} />
              Add component instance
            </button>
            {entity.instances.map((id, index) => (
              <div className="child-row" key={id}>
                <button className="text-link" onClick={() => select(id)}>
                  {doc.entities[id]?.name}
                </button>
                <button
                  className="icon-button"
                  aria-label={`Move ${doc.entities[id]?.name} up`}
                  disabled={index === 0}
                  onClick={() => {
                    const instances = [...entity.instances];
                    [instances[index - 1], instances[index]] = [
                      instances[index],
                      instances[index - 1],
                    ];
                    update({ instances });
                  }}
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Remove ${doc.entities[id]?.name} from composition`}
                  onClick={() =>
                    update({
                      instances: entity.instances.filter((i) => i !== id),
                    })
                  }
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </>
        ) : null}
        {entity.kind === "asset" ? (
          <>
            <div className="metadata-row">
              <span>Format</span>
              <code>{entity.mediaType}</code>
            </div>
            {entity.mediaType.startsWith("image") ? (
              <img
                className="asset-image"
                alt={entity.name}
                src={`data:${entity.mediaType};base64,${entity.data}`}
              />
            ) : (
              <p className="small muted">
                Font file stored in the library; portable backups include its
                bytes.
              </p>
            )}
          </>
        ) : null}
        {["node", "component", "composition"].includes(entity.kind) ? (
          <div hidden={section !== "Behaviour/motion"}>
            <h3>Behaviour/motion</h3>
            <p className="small muted">
              {component
                ? "Native behaviour: " + component.behavior
                : "Coordinated composition motion"}
            </p>
            <button
              className="secondary full"
              onClick={() =>
                useEditor.setState({ bottom: "Motion", panelOpen: true })
              }
            >
              Open motion tools
            </button>
          </div>
        ) : null}
        <details className="record-actions">
          <summary>Record actions</summary>
          <button
            className="secondary full"
            onClick={() => {
              const id = newId(entity.kind);
              command(
                [
                  {
                    type: "duplicate",
                    id: entity.id,
                    newId: id,
                    name: `${entity.name} copy`,
                  },
                ],
                "Duplicate item",
              );
              if (useEditor.getState().doc.entities[id]) select(id);
            }}
          >
            <Copy size={13} />
            Duplicate
          </button>
          <Field
            label={
              dependencyCount
                ? `Replace ${dependencyCount} reference(s) with`
                : "Optional replacement"
            }
          >
            <select
              aria-label="Delete replacement"
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
            >
              <option value="">No replacement</option>
              {Object.values(doc.entities)
                .filter((e) => e.kind === entity.kind && e.id !== entity.id)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </Field>
          <button
            className="danger full"
            onClick={() =>
              command(
                [
                  {
                    type: "delete",
                    id: entity.id,
                    replacementId: replacement || undefined,
                  },
                ],
                "Delete item",
              )
            }
          >
            <Trash2 size={13} />
            Delete record
          </button>
          <p className="small muted">
            References are preserved. Used records require a compatible
            replacement.
          </p>
        </details>
      </div>
    </aside>
  );
}
function ComponentInspector({
  component: c,
  onCreate,
  section,
}: {
  section: string;
  component: ComponentEntity;
  onCreate: (r: CreateRequest) => void;
}) {
  const { command, select, doc } = useEditor();
  const [axisName, setAxisName] = useState("tone");
  const [choices, setChoices] = useState("neutral, accent");
  const update = (changes: Partial<ComponentEntity>) =>
    command([{ type: "update", id: c.id, changes }], "Edit component contract");
  return (
    <>
      <div hidden={section !== "Anatomy"}>
        <button className="secondary full" onClick={() => select(c.rootId)}>
          Edit anatomy
        </button>
      </div>
      <div hidden={section !== "Properties"}>
        <div className="section-divider">
          <h3>Public properties</h3>
        </div>
        {c.properties.map((p, index) =>
          iconProperty(doc, p.id, c.rootId) ? (
            <IconPicker
              key={p.id}
              label={`Default ${p.name}`}
              value={String(p.default)}
              onChange={(value) =>
                update({
                  properties: c.properties.map((entry, i) =>
                    i === index ? { ...entry, default: value } : entry,
                  ),
                })
              }
            />
          ) : (
            <Field key={p.id} label={p.name}>
              {p.type === "boolean" ? (
                <input
                  type="checkbox"
                  checked={!!p.default}
                  onChange={(e) =>
                    update({
                      properties: c.properties.map((v, i) =>
                        i === index ? { ...v, default: e.target.checked } : v,
                      ),
                    })
                  }
                />
              ) : (
                <CommitInput
                  label={`Default ${p.name}`}
                  value={String(p.default)}
                  onCommit={(v) =>
                    update({
                      properties: c.properties.map((p, i) =>
                        i === index
                          ? {
                              ...p,
                              default: p.type === "number" ? Number(v) : v,
                            }
                          : p,
                      ),
                    })
                  }
                />
              )}
            </Field>
          ),
        )}
        <button
          className="text-link"
          onClick={() => {
            const id = newId("prop");
            update({
              properties: [
                ...c.properties,
                { id, name: "Content", type: "text", default: "Content" },
              ],
            });
          }}
        >
          <Plus size={13} />
          Add text property
        </button>
      </div>
      <div hidden={section !== "Variants and states"}>
        <div className="section-divider">
          <h3>Variant axes</h3>
        </div>
        {Object.entries(c.axes).map(([axis, values]) => (
          <Field key={axis} label={axis}>
            <CommitInput
              label={`${axis} choices`}
              value={values.join(", ")}
              onCommit={(s) =>
                update({
                  axes: {
                    ...c.axes,
                    [axis]: s
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  },
                })
              }
            />
          </Field>
        ))}
        <Field label="New axis">
          <input
            aria-label="Axis name"
            value={axisName}
            onChange={(e) => setAxisName(e.target.value)}
          />
        </Field>
        <Field label="Choices">
          <input
            aria-label="Axis choices"
            value={choices}
            onChange={(e) => setChoices(e.target.value)}
          />
        </Field>
        <button
          className="text-link"
          onClick={() => {
            if (!/^[a-z][a-z0-9-]*$/.test(axisName))
              return useEditor.setState({
                error:
                  "Axis name must use lowercase letters, numbers and hyphens",
              });
            const values = choices
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            update({
              axes: { ...c.axes, [axisName]: values },
              defaults: { ...c.defaults, [axisName]: values[0] },
            });
          }}
        >
          <Plus size={13} />
          Add axis
        </button>
      </div>
      <div hidden={section !== "Properties"}>
        <button
          className="secondary full"
          onClick={() => onCreate({ kind: "instance", targetId: c.id })}
        >
          Create configured instance
        </button>
        <p className="small muted">
          Select an anatomy part to author variant and state bindings. Defaults
          apply before variant, interaction and instance overrides.
        </p>
      </div>
    </>
  );
}
