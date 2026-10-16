import { useEffect, useState, type ReactNode } from "react";
import {
  cssValue,
  hexColor,
  type Binding,
  type DesignValue,
  type ValueType,
} from "../../domain/schema";
import { resolve } from "../../domain/engine";
import { useEditor } from "../../app/store";
import { ArrowUpRight, Link2, Plus, RotateCcw } from "lucide-react";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function CommitInput({
  value,
  onCommit,
  label,
  type = "text",
}: {
  value: string | number;
  onCommit: (value: string) => void;
  label: string;
  type?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <input
      aria-label={label}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== String(value)) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(String(value));
          e.currentTarget.blur();
        }
      }}
    />
  );
}
export function ValueEditor({
  value,
  onChange,
}: {
  value: DesignValue;
  onChange: (v: DesignValue) => void;
}) {
  if (value.type === "color") {
    const hex =
      value.space === "srgb"
        ? "#" +
          value.channels
            .map((n) =>
              Math.round(Math.min(1, Math.max(0, n)) * 255)
                .toString(16)
                .padStart(2, "0"),
            )
            .join("")
        : "#2563eb";
    return (
      <div className="value-editor">
        <div className="color-line">
          <span
            className="swatch large"
            style={{ background: cssValue(value) }}
          />
          <CommitInput
            label="Colour hex"
            value={hex.toUpperCase()}
            onCommit={(s) => {
              if (/^#[0-9a-f]{6}$/i.test(s)) onChange(hexColor(s));
              else
                useEditor.setState({
                  error: "Use a six-digit colour such as #2563EB",
                });
            }}
          />
        </div>
        <Field label="Colour space">
          <select
            value={value.space}
            onChange={(e) =>
              onChange({
                ...value,
                space: e.target.value as typeof value.space,
              })
            }
          >
            <option value="srgb">sRGB</option>
            <option value="oklch">OKLCH</option>
            <option value="display-p3">Display P3</option>
          </select>
        </Field>
        <div className="channels">
          {value.channels.map((n, i) => (
            <CommitInput
              key={i}
              type="number"
              label={`Channel ${i + 1}`}
              value={n}
              onCommit={(s) => {
                const channels = [...value.channels] as [
                  number,
                  number,
                  number,
                ];
                channels[i] = Number(s);
                onChange({ ...value, channels });
              }}
            />
          ))}
        </div>
        <Field label="Alpha">
          <CommitInput
            label="Alpha"
            type="number"
            value={value.alpha}
            onCommit={(s) => onChange({ ...value, alpha: Number(s) })}
          />
        </Field>
      </div>
    );
  }
  return (
    <div className="input-unit">
      <CommitInput
        label="Value"
        type={typeof value.value === "number" ? "number" : "text"}
        value={value.value}
        onCommit={(s) =>
          onChange({
            ...value,
            value: typeof value.value === "number" ? Number(s) : s,
          } as DesignValue)
        }
      />
      {"unit" in value ? (
        <select
          aria-label="Unit"
          value={value.unit}
          onChange={(e) =>
            onChange({ ...value, unit: e.target.value } as DesignValue)
          }
        >
          {(value.type === "duration"
            ? ["ms", "s"]
            : ["px", "rem", "em", "%", "vh", "vw"]
          ).map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
export function BindingEditor({
  binding,
  type,
  onChange,
  onCreate,
  label,
  onReset,
  origin,
}: {
  binding: Binding;
  type: ValueType;
  onChange: (b: Binding) => void;
  onCreate?: (type: ValueType) => void;
  label: string;
  onReset?: () => void;
  origin?: string;
}) {
  const doc = useEditor((s) => s.doc),
    select = useEditor((s) => s.select);
  const themeId = useEditor((s) => s.themeId),
    densityId = useEditor((s) => s.densityId);
  let chain: string[] = [],
    resolved = "";
  try {
    const r = resolve(doc, binding, {
      themeId,
      densityId,
    });
    chain = r.chain;
    resolved = cssValue(r.value);
  } catch (e) {
    resolved = (e as Error).message;
  }
  const choices = Object.values(doc.entities).filter(
    (e) =>
      (e.kind === "token" && e.valueType === type) ||
      (e.kind === "source" && e.value.type === type),
  );
  return (
    <div className="binding-editor">
      {origin ? <span className="binding-origin">{origin}</span> : null}
      <div className="binding-title">
        <span>{label}</span>
        {onReset ? (
          <button
            className="icon-button"
            title="Reset override"
            aria-label={`Reset ${label}`}
            onClick={onReset}
          >
            <RotateCcw size={13} />
          </button>
        ) : null}
      </div>
      <div className="binding-select">
        <Link2 size={13} />
        <select
          aria-label={`${label} binding`}
          value={"ref" in binding ? binding.ref : "__literal"}
          onChange={(e) => {
            if (e.target.value === "__create") {
              onCreate?.(type);
              return;
            }
            if (e.target.value === "__literal") {
              const v = resolve(doc, binding, { themeId, densityId }).value;
              onChange({ value: v });
            } else onChange({ ref: e.target.value });
          }}
        >
          <option value="__literal">Local value</option>
          {choices.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
          {onCreate ? (
            <option value="__create">+ Create compatible token…</option>
          ) : null}
        </select>
        {"ref" in binding ? (
          <button
            className="icon-button"
            aria-label={`Jump to ${label} source`}
            title="Jump to source"
            onClick={() => select(binding.ref)}
          >
            <ArrowUpRight size={15} />
          </button>
        ) : null}
      </div>
      {"value" in binding ? (
        <ValueEditor
          value={binding.value}
          onChange={(value) => onChange({ value })}
        />
      ) : null}
      <div className="binding-trace">
        <span className="muted">
          {"ref" in binding ? "From token" : "Local override"}
        </span>
        {chain.slice(0, 2).map((id) => (
          <button
            key={id}
            className="text-link trace-link"
            onClick={() => select(id)}
          >
            {doc.entities[id]?.name}
          </button>
        ))}
        <span className="muted">Resolved value</span>
        <code>{resolved}</code>
      </div>
    </div>
  );
}
export function Empty({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: () => void;
}) {
  return (
    <div className="empty">
      <Plus size={24} />
      <h2>{title}</h2>
      <p>{detail}</p>
      {action ? (
        <button className="primary" onClick={action}>
          Create first item
        </button>
      ) : null}
    </div>
  );
}
