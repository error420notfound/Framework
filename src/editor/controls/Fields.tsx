import { ColorEditor } from "./ColorEditor";
import { useEffect, useState, useId, useRef, type ReactNode } from "react";
import {
  cssValue,
  type Binding,
  type DesignValue,
  type ValueType,
} from "../../domain/schema";
import { propertyLabel } from "../resolution";
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
function trackDraft(id: string, dirty: boolean) {
  const current = useEditor.getState().dirtyFields;
  if (Boolean(current[id]) === dirty) return;
  const dirtyFields = { ...current };
  if (dirty) dirtyFields[id] = true;
  else delete dirtyFields[id];
  useEditor.setState({ dirtyFields });
}
export function CommitInput({
  value,
  onCommit,
  label,
  type = "text",
  displayValue,
  validate,
}: {
  value: string | number;
  onCommit: (v: string) => void;
  label: string;
  type?: string;
  displayValue?: string;
  validate?: (s: string) => string;
}) {
  const fieldId = useId(),
    cancelNextBlur = useRef(false),
    edited = useRef(false);
  const shown = displayValue ?? String(value);
  const [draft, setDraft] = useState(shown),
    [error, setError] = useState("");
  useEffect(() => {
    setDraft(shown);
    setError("");
    edited.current = false;
    trackDraft(fieldId, false);
  }, [value, shown, fieldId]);
  useEffect(() => () => trackDraft(fieldId, false), [fieldId]);
  return (
    <>
      <input
        aria-label={label}
        type={type}
        step={type === "number" ? "any" : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? fieldId : undefined}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          edited.current = true;
          setError("");
          trackDraft(fieldId, e.target.value !== String(value));
        }}
        onBlur={() => {
          if (cancelNextBlur.current) {
            cancelNextBlur.current = false;
            trackDraft(fieldId, false);
            return;
          }
          if (edited.current && draft !== String(value)) {
            const message = validate?.(draft) ?? "";
            if (message) {
              setError(message);
              trackDraft(fieldId, true);
              return;
            }
            onCommit(draft);
          }
          edited.current = false;
          setDraft(displayValue ?? draft);
          trackDraft(fieldId, false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            cancelNextBlur.current = true;
            edited.current = false;
            setDraft(shown);
            setError("");
            e.currentTarget.blur();
          }
        }}
      />
      {error ? (
        <span className="form-error" id={fieldId} role="alert">
          {error}
        </span>
      ) : null}
    </>
  );
}
export function ValueEditor({
  value,
  onChange,
}: {
  value: DesignValue;
  onChange: (v: DesignValue) => void;
}) {
  if (value.type === "color")
    return <ColorEditor value={value} onChange={onChange} />;
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
  onRemove,
  origin,
  effective,
}: {
  binding: Binding;
  type: ValueType;
  onChange: (b: Binding) => void;
  onCreate?: (type: ValueType) => void;
  label: string;
  onReset?: () => void;
  onRemove?: () => void;
  origin?: string;
  effective?: string;
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
      {effective && !effective.startsWith(origin + " ·") ? (
        <span className="binding-origin">Effective preview · {effective}</span>
      ) : null}
      <div className="binding-title">
        <span>{propertyLabel(label)}</span>
        {onRemove ? (
          <button
            className="icon-button"
            aria-label={`Remove ${propertyLabel(label)} from shared style`}
            title="Remove binding from shared style"
            onClick={onRemove}
          >
            ×
          </button>
        ) : null}
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
          <option value="__literal">Literal value</option>
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
      <details className="binding-trace">
        <summary>
          Resolved value ·{" "}
          {resolved.length > 38 ? resolved.slice(0, 35) + "…" : resolved}
        </summary>
        <span className="muted">
          {"ref" in binding ? "Token reference" : "Literal value"}
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
      </details>
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
