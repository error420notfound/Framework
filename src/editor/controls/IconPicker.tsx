import { useEffect, useId, useState } from "react";
import { loadIconCatalog, type CatalogIcon } from "../../icons/catalog";
import {
  encodeIcon,
  parseIcon,
  renderIcon,
  type IconLibrary,
  type IconStyle,
} from "../../icons/runtime";
import { CommitInput } from "./Fields";
const names = {
  lucide: "Lucide",
  material: "Material Symbols",
  bootstrap: "Bootstrap Icons",
};
export function IconPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const selected = parseIcon(value);
  const [open, setOpen] = useState(false);
  const [library, setLibrary] = useState<IconLibrary>(
    selected?.library ?? "lucide",
  );
  const [style, setStyle] = useState<IconStyle>(selected?.style ?? "outlined");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(60);
  const [catalog, setCatalog] = useState<CatalogIcon[]>([]);
  const [status, setStatus] = useState("");
  const [attempt, setAttempt] = useState(0);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    let active = true;
    setCatalog([]);
    setStatus("Loading icons...");
    loadIconCatalog(library).then(
      (icons) => {
        if (active) {
          setCatalog(icons);
          setStatus("");
        }
      },
      () => {
        if (active) setStatus("Could not load icons. Try again.");
      },
    );
    return () => {
      active = false;
    };
  }, [open, library, attempt]);
  const results = catalog.filter((icon) =>
    icon.name
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .includes(
        query.trim().toLowerCase().replaceAll("_", " ").replaceAll("-", " "),
      ),
  );
  const selection = (icon: CatalogIcon) =>
    encodeIcon({
      ...icon,
      library,
      ...(library === "material" ? { style } : {}),
    });
  return (
    <div
      className="icon-picker"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          document.getElementById(id + "-toggle")?.focus();
        }
      }}
    >
      <span className="icon-picker-label">{label}</span>
      <div className="icon-picker-current">
        <span
          className="icon-sample"
          dangerouslySetInnerHTML={{ __html: renderIcon(value) }}
        />
        <span>
          {selected
            ? names[selected.library] +
              " / " +
              selected.name +
              (selected.style ? " / " + selected.style : "")
            : "Text icon"}
        </span>
        <button
          type="button"
          id={id + "-toggle"}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            if (!open) {
              setLibrary(selected?.library ?? "lucide");
              setStyle(selected?.style ?? "outlined");
            }
            setOpen(!open);
          }}
        >
          {open ? "Close" : "Choose icon"}
        </button>
      </div>
      {!selected ? (
        <CommitInput label={label} value={value} onCommit={onChange} />
      ) : (
        <button
          type="button"
          className="text-link"
          onClick={() => onChange("")}
        >
          Use text icon
        </button>
      )}
      {open ? (
        <div
          id={id}
          className="icon-picker-panel"
          role="region"
          aria-label={label + " picker"}
        >
          <label className="field">
            <span>Icon library</span>
            <select
              aria-label="Icon library"
              value={library}
              onChange={(event) => {
                setLibrary(event.target.value as IconLibrary);
                setQuery("");
                setLimit(60);
              }}
            >
              {Object.entries(names).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {library === "material" ? (
            <label className="field">
              <span>Material style</span>
              <select
                aria-label="Material style"
                value={style}
                onChange={(event) => {
                  const next = event.target.value as IconStyle;
                  setStyle(next);
                  if (selected?.library === "material")
                    onChange(encodeIcon({ ...selected, style: next }));
                }}
              >
                {["outlined", "rounded", "sharp"].map((name) => (
                  <option key={name} value={name}>
                    {name[0].toUpperCase() + name.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <input
            type="search"
            aria-label="Search icons"
            placeholder="Search icons"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(60);
            }}
          />
          <p className="small muted" role="status">
            {status ||
              (results.length
                ? results.length + " icons"
                : "No matching icons")}
          </p>
          {status.startsWith("Could not") ? (
            <button type="button" onClick={() => setAttempt(attempt + 1)}>
              Retry loading icons
            </button>
          ) : null}
          <div
            className="icon-grid"
            aria-label="Icon choices"
            onKeyDown={(event) => {
              const offsets: Record<string, number> = {
                ArrowRight: 1,
                ArrowLeft: -1,
                ArrowDown: 4,
                ArrowUp: -4,
              };
              if (!(event.key in offsets)) return;
              const buttons = Array.from(
                event.currentTarget.querySelectorAll("button"),
              );
              const index = buttons.indexOf(event.target as HTMLButtonElement);
              if (index < 0) return;
              event.preventDefault();
              buttons[
                Math.max(
                  0,
                  Math.min(buttons.length - 1, index + offsets[event.key]),
                )
              ]?.focus();
            }}
          >
            {results.slice(0, limit).map((icon) => (
              <button
                type="button"
                key={icon.name}
                title={icon.name}
                aria-label={"Select " + names[library] + " " + icon.name}
                aria-pressed={
                  selected?.library === library &&
                  selected.name === icon.name &&
                  (library !== "material" || selected.style === style)
                }
                onClick={() => onChange(selection(icon))}
              >
                <span
                  className="icon-sample"
                  dangerouslySetInnerHTML={{
                    __html: renderIcon(selection(icon)),
                  }}
                />
                <span>
                  {icon.name.replaceAll("_", " ").replaceAll("-", " ")}
                </span>
              </button>
            ))}
          </div>
          {results.length > limit ? (
            <button type="button" onClick={() => setLimit(limit + 60)}>
              Show more icons
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
