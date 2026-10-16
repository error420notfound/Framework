import { changeScopeBinding } from "../resolution";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useEditor } from "../../app/store";
import {
  hexColor,
  newId,
  primitives,
  valueTypes,
  type DesignValue,
  type Entity,
  type ValueType,
} from "../../domain/schema";
import { Field } from "./Fields";
import type { CreateRequest } from "../inspectors/Inspector";
import { componentForNode, type Command } from "../../domain/engine";
const defaultValues: Record<ValueType, DesignValue> = {
  color: hexColor("#2563EB"),
  dimension: { type: "dimension", value: 16, unit: "px" },
  number: { type: "number", value: 1 },
  fontFamily: { type: "fontFamily", value: "system-ui, sans-serif" },
  fontWeight: { type: "fontWeight", value: 500 },
  duration: { type: "duration", value: 200, unit: "ms" },
  easing: { type: "easing", value: "ease-out" },
  string: { type: "string", value: "Content" },
};
export function CreateDialog({
  request,
  onClose,
}: {
  request: CreateRequest;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { workspace, doc, selectedId, command, select } = useEditor();
  const defaultKind =
    workspace === "Foundations"
      ? "source"
      : workspace.includes("tokens")
        ? "token"
        : workspace === "Themes"
          ? "theme"
          : workspace === "Styles"
            ? "style"
            : workspace === "Primitives"
              ? "node"
              : workspace === "Compositions"
                ? "composition"
                : "component";
  const kind = request.kind ?? defaultKind;
  const [name, setName] = useState(""),
    [valueType, setValueType] = useState<ValueType>(request.type ?? "color"),
    [primitive, setPrimitive] = useState<(typeof primitives)[number]>("Text"),
    [axis, setAxis] = useState<"color" | "density">("color"),
    [definition, setDefinition] = useState(request.targetId ?? "button"),
    [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  function submit() {
    if (!name.trim()) return setError("Enter a name.");
    const id = newId(kind);
    let entity: Entity;
    const commands: Command[] = [];
    if (kind === "source")
      entity = {
        id,
        name,
        kind,
        sourceType:
          valueType === "color"
            ? "color"
            : valueType === "fontFamily"
              ? "font"
              : "scale",
        value: defaultValues[valueType],
      };
    else if (kind === "token")
      entity = {
        id,
        name,
        kind,
        layer: workspace === "Foundation tokens" ? "foundation" : "semantic",
        valueType,
        binding: { value: defaultValues[valueType] },
      };
    else if (kind === "theme")
      entity = { id, name, kind, axis, assignments: {} };
    else if (kind === "style")
      entity = {
        id,
        name,
        kind,
        bindings: {
          fontFamily: { ref: "font_family" },
          fontSize: { ref: "font_size" },
          fontWeight: { ref: "font_weight" },
          lineHeight: { value: { type: "number", value: 1.4 } },
          letterSpacing: { value: { type: "dimension", value: 0, unit: "px" } },
        },
      };
    else if (kind === "node")
      entity = {
        id,
        name,
        kind,
        primitive,
        children: [],
        bindings: {},
        props: {
          text:
            primitive === "Text"
              ? "Text"
              : primitive === "Icon"
                ? "+"
                : undefined,
        },
        expose: {},
      };
    else if (kind === "component") {
      const rootId = newId("node");
      commands.push({
        type: "create",
        entity: {
          id: rootId,
          name: "Root",
          kind: "node",
          primitive: "Surface",
          children: [],
          props: {},
          expose: {},
          bindings: {},
        },
      });
      entity = {
        id,
        name,
        kind,
        rootId,
        properties: [],
        axes: {},
        defaults: {},
        rules: [],
        responsive: [],
        behavior: "static",
      };
    } else if (kind === "instance")
      entity = {
        id,
        name,
        kind,
        componentId: definition,
        configuration: {},
        variants: {},
        overrides: {},
      };
    else if (kind === "composition")
      entity = {
        id,
        name,
        kind,
        instances: [],
        layout: "stack",
        columns: 2,
        gap: { value: { type: "dimension", value: 16, unit: "px" } },
        dataContract: {},
      };
    else return setError("Use file import to add an asset.");
    commands.push({ type: "create", entity });
    if (request.targetId && kind === "token" && !request.ruleScope)
      commands.push({
        type: "bind",
        id: request.targetId,
        property: request.property ?? "value",
        binding: { ref: id },
      });
    if (request.targetId && kind === "token" && request.ruleScope) {
      const component = componentForNode(doc, request.targetId);
      if (component) {
        commands.push({
          type: "update",
          id: component.id,
          changes: changeScopeBinding(
            component,
            request.ruleScope,
            request.targetId,
            request.property ?? "background",
            { ref: id },
            useEditor.getState().variants,
          ),
        });
      }
    }
    if (request.targetId && kind === "style")
      commands.push({ type: "applyStyle", id: request.targetId, styleId: id });
    if (request.parentId) {
      const parent = doc.entities[request.parentId];
      if (kind === "node" && parent?.kind === "node")
        commands.push({
          type: "update",
          id: parent.id,
          changes: { children: [...parent.children, id] },
        });
      if (kind === "instance" && parent?.kind === "composition")
        commands.push({
          type: "update",
          id: parent.id,
          changes: { instances: [...parent.instances, id] },
        });
    }
    command(commands, `Create ${kind}`);
    if (useEditor.getState().doc.entities[id]) {
      select(id);
      onClose();
    } else setError(useEditor.getState().error);
  }
  return (
    <dialog ref={dialog} className="modal" onCancel={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="modal-heading">
          <h2>Create {kind}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <p className="muted small">Add a reusable record to {doc.name}.</p>
        <Field label="Name">
          <input
            autoFocus
            aria-label="New item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === "token" ? "action.secondary.fill" : "Name"}
          />
        </Field>
        {kind === "token" || kind === "source" ? (
          <Field label="Value type">
            <select
              aria-label="Value type"
              value={valueType}
              onChange={(e) => setValueType(e.target.value as ValueType)}
            >
              {valueTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        ) : null}
        {kind === "node" ? (
          <Field label="Primitive">
            <select
              aria-label="New primitive"
              value={primitive}
              onChange={(e) => setPrimitive(e.target.value as any)}
            >
              {primitives.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
        ) : null}
        {kind === "theme" ? (
          <Field label="Mode axis">
            <select
              value={axis}
              onChange={(e) => setAxis(e.target.value as any)}
            >
              <option value="color">Colour theme</option>
              <option value="density">Density</option>
            </select>
          </Field>
        ) : null}
        {kind === "instance" ? (
          <Field label="Component definition">
            <select
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
            >
              {Object.values(doc.entities)
                .filter((e) => e.kind === "component")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
        ) : null}
        {error ? (
          <p role="alert" className="form-error">
            {error}
          </p>
        ) : null}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Create {kind}
          </button>
        </div>
      </form>
    </dialog>
  );
}
