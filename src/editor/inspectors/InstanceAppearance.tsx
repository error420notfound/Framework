import { useState } from "react";
import { useEditor } from "../../app/store";
import { descendants } from "../../domain/engine";
import {
  propertyTypes,
  type Entity,
  type NodeEntity,
  type Binding,
} from "../../domain/schema";
import { effectiveBinding, appearanceGroup } from "../resolution";
import { BindingEditor, Field } from "../controls/Fields";
type Instance = Extract<Entity, { kind: "instance" }>;
export function InstanceAppearance({ instance }: { instance: Instance }) {
  const { doc, bindingScope, command, states, viewport } = useEditor();
  const [property, setProperty] = useState("background");
  const c = doc.entities[instance.componentId];
  if (c?.kind !== "component") return null;
  const nodes = descendants(doc, c.rootId),
    requested = bindingScope.startsWith("instance:")
      ? bindingScope.slice(9)
      : c.rootId;
  const id = nodes.includes(requested) ? requested : c.rootId;
  const node = doc.entities[id] as NodeEntity;
  const style = node.styleId ? doc.entities[node.styleId] : undefined;
  const keys = new Set([
    "background",
    ...Object.keys(style?.kind === "style" ? style.bindings : {}),
    ...Object.keys(node.bindings),
    ...c.rules.flatMap((r) => Object.keys(r.patch[id] ?? {})),
    ...Object.keys(instance.overrides[id] ?? {}),
  ]);
  const fields = [...keys]
    .map((p) => {
      const winner = effectiveBinding(doc, c, node, p, {
        variants: instance.variants,
        states,
        viewport,
        values: instance.configuration,
        overrides: instance.overrides,
      });
      return { p, winner };
    })
    .filter((f) => f.winner || f.p === "background");
  const change = (p: string, binding?: Binding) =>
    command(
      [
        {
          type: "override",
          id: instance.id,
          nodeId: id,
          property: p,
          ...(binding ? { binding } : {}),
        },
      ],
      (binding ? "Override" : "Reset") + " instance " + p,
    );
  return (
    <>
      <Field label="Instance anatomy">
        <select
          aria-label="Instance anatomy"
          value={id}
          onChange={(e) =>
            useEditor.setState({ bindingScope: "instance:" + e.target.value })
          }
        >
          {nodes.map((id) => (
            <option key={id} value={id}>
              {doc.entities[id]?.name} [{id}]
            </option>
          ))}
        </select>
      </Field>
      {["Fill", "Layout and spacing", "Border", "Typography", "Effects"]
        .filter((group) => fields.some((f) => appearanceGroup(f.p) === group))
        .map((group) => (
          <details open className="appearance-group" key={group}>
            <summary>{group}</summary>
            {fields
              .filter((f) => appearanceGroup(f.p) === group)
              .map(({ p, winner }) => (
                <BindingEditor
                  key={p}
                  label={
                    id === c.rootId && p === "background"
                      ? "Instance fill"
                      : "Instance " + p
                  }
                  binding={
                    winner?.binding ?? {
                      value: {
                        type: "color",
                        space: "srgb",
                        channels: [0, 0, 0],
                        alpha: 0,
                      },
                    }
                  }
                  type={propertyTypes[p]}
                  origin={
                    instance.overrides[id]?.[p]
                      ? "Instance override"
                      : "Inherited from definition · " +
                        (winner?.origin ?? "No authored value")
                  }
                  onChange={(b) => change(p, b)}
                  onReset={
                    instance.overrides[id]?.[p] ? () => change(p) : undefined
                  }
                />
              ))}
          </details>
        ))}
      <div className="add-binding">
        <select
          aria-label="New instance override property"
          value={property}
          onChange={(e) => setProperty(e.target.value)}
        >
          {Object.keys(propertyTypes).map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <button
          aria-label="Add instance override"
          onClick={() => {
            const token = Object.values(doc.entities).find(
              (e) =>
                e.kind === "token" && e.valueType === propertyTypes[property],
            );
            if (token) change(property, { ref: token.id });
          }}
        >
          +
        </button>
      </div>
    </>
  );
}
