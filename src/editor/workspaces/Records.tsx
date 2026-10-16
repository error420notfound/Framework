import { useRef } from "react";
import { Upload, Plus, ArrowUpRight, Link2, Type } from "lucide-react";
import { useEditor } from "../../app/store";
import { cssValue, newId, type Entity } from "../../domain/schema";
import { resolve, usedBy } from "../../domain/engine";
import { workspaceEntities } from "../shell/Browser";
import { CommitInput, Empty, ValueEditor } from "../controls/Fields";
import type { CreateRequest } from "../inspectors/Inspector";
import { importPalette } from "../../domain/importers";
import { bytesToBase64 } from "../../persistence/library";
import type { Command } from "../../domain/engine";
export function Records({
  onCreate,
}: {
  onCreate: (r?: CreateRequest) => void;
}) {
  const {
    doc,
    workspace,
    search,
    selectedId,
    select,
    command,
    themeId,
    densityId,
  } = useEditor();
  const file = useRef<HTMLInputElement>(null);
  const items = workspaceEntities(doc, workspace).filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()),
  );
  const selected = doc.entities[selectedId];
  async function upload(files: FileList | null) {
    if (!files?.[0]) return;
    const f = files[0];
    try {
      if (f.size > 10_000_000) throw new Error("Asset limit: 10 MB");
      if (f.name.endsWith(".json")) {
        const entities = importPalette(JSON.parse(await f.text()));
        command(
          entities.map((entity) => ({ type: "create", entity })),
          "Import palette",
        );
        return;
      }
      const extension = f.name.split(".").at(-1)?.toLowerCase();
      const mime: Record<
        string,
        Extract<Entity, { kind: "asset" }>["mediaType"]
      > = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
        gif: "image/gif",
        woff2: "font/woff2",
        woff: "font/woff",
        ttf: "font/ttf",
      };
      if (!extension || !mime[extension])
        throw new Error(
          "Use PNG, JPEG, WebP, GIF, WOFF, WOFF2 or TTF. SVG is intentionally excluded.",
        );
      const assetId = newId("asset"),
        data = bytesToBase64(new Uint8Array(await f.arrayBuffer()));
      const commands: Command[] = [
        {
          type: "create",
          entity: {
            id: assetId,
            kind: "asset",
            name: f.name,
            filename: f.name.replace(/[^a-zA-Z0-9_.-]/g, "_"),
            mediaType: mime[extension],
            data,
          },
        },
      ];
      if (mime[extension].startsWith("font")) {
        const name = f.name
          .replace(/\.[^.]+$/, "")
          .replace(/[^a-zA-Z0-9 -]/g, " ");
        commands.push({
          type: "create",
          entity: {
            id: newId("font"),
            kind: "source",
            name,
            sourceType: "font",
            value: {
              type: "fontFamily",
              value: `"${name}", system-ui, sans-serif`,
            },
            assetId,
            weights: [400],
            fontStyles: ["normal"],
          },
        });
      }
      command(commands, "Import asset");
      select(assetId);
    } catch (e) {
      useEditor.setState({ error: (e as Error).message });
    } finally {
      if (file.current) file.current.value = "";
    }
  }
  if (workspace === "Themes" && selected?.kind === "theme")
    return (
      <section className="records">
        <div className="workspace-heading">
          <div>
            <h1>{selected.name}</h1>
            <p>
              {selected.axis === "color" ? "Colour theme" : "Density mode"}{" "}
              assignments
            </p>
          </div>
          <button className="secondary" onClick={() => onCreate()}>
            <Plus size={14} />
            Create mode
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Default binding</th>
              <th>{selected.name} assignment</th>
              <th>Resolved</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(doc.entities)
              .filter((e) => e.kind === "token")
              .map((t) => {
                if (t.kind !== "token") return null;
                const binding = selected.assignments[t.id];
                return (
                  <tr key={t.id}>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => select(t.id)}
                      >
                        {t.name}
                      </button>
                    </td>
                    <td>
                      {"ref" in t.binding
                        ? doc.entities[t.binding.ref]?.name
                        : cssValue(t.binding.value)}
                    </td>
                    <td>
                      <select
                        aria-label={`Assignment ${t.name}`}
                        value={
                          binding && "ref" in binding
                            ? binding.ref
                            : binding
                              ? "__local"
                              : ""
                        }
                        onChange={(e) => {
                          const assignments = { ...selected.assignments };
                          if (e.target.value)
                            assignments[t.id] = { ref: e.target.value };
                          else delete assignments[t.id];
                          command(
                            [
                              {
                                type: "update",
                                id: selected.id,
                                changes: { assignments },
                              },
                            ],
                            "Change mode assignment",
                          );
                        }}
                      >
                        <option value="">Use default</option>
                        {binding && "value" in binding ? (
                          <option value="__local">
                            {cssValue(binding.value)}
                          </option>
                        ) : null}
                        {Object.values(doc.entities)
                          .filter(
                            (e) =>
                              (e.kind === "token" &&
                                e.valueType === t.valueType &&
                                e.id !== t.id) ||
                              (e.kind === "source" &&
                                e.value.type === t.valueType),
                          )
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td>
                      <code>
                        {cssValue(
                          resolve(
                            doc,
                            { ref: t.id },
                            {
                              themeId:
                                selected.axis === "color"
                                  ? selected.id
                                  : themeId,
                              densityId:
                                selected.axis === "density"
                                  ? selected.id
                                  : densityId,
                            },
                          ).value,
                        )}
                      </code>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </section>
    );
  return (
    <section className="records">
      <div className="workspace-heading">
        <div>
          <h1>{workspace}</h1>
          <p>
            {workspace === "Foundations"
              ? "Palettes, font registrations and source assets"
              : workspace === "Styles"
                ? "Reusable token bindings, shared across anatomy"
                : workspace === "Themes"
                  ? "Independent colour themes and density modes"
                  : "Named values with stable references"}
          </p>
        </div>
        <div className="heading-actions">
          {workspace === "Foundations" ? (
            <>
              <input
                ref={file}
                hidden
                type="file"
                accept=".json,.png,.jpg,.jpeg,.webp,.gif,.woff,.woff2,.ttf"
                onChange={(e) => void upload(e.target.files)}
              />
              <button
                className="secondary"
                onClick={() => file.current?.click()}
              >
                <Upload size={14} />
                Import source
              </button>
            </>
          ) : null}
          <button className="secondary" onClick={() => onCreate()}>
            <Plus size={14} />
            Create
          </button>
        </div>
      </div>
      {!items.length ? (
        <Empty
          title="No records yet"
          detail="Create a record or adjust your search to begin."
          action={() => onCreate()}
        />
      ) : workspace === "Styles" ? (
        <div className="style-specimens">
          {items.map((e) => {
            if (e.kind !== "style") return null;
            const style = Object.fromEntries(
              Object.entries(e.bindings).map(([p, b]) => [
                p,
                cssValue(resolve(doc, b).value),
              ]),
            );
            return (
              <button
                key={e.id}
                className={`style-specimen ${selectedId === e.id ? "active" : ""}`}
                onClick={() => select(e.id)}
              >
                <span className="specimen-label">
                  <Type size={16} />
                  {e.name}
                  <ArrowUpRight size={16} />
                </span>
                <span style={style}>The details make the system.</span>
                <span className="muted small">Aa Bb Cc · 0123456789</span>
              </button>
            );
          })}
        </div>
      ) : (
        <table className="record-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Value / reference</th>
              <th>Used by</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => {
              let resolved = "",
                color = "";
              if (e.kind === "token" || e.kind === "source")
                try {
                  const r = resolve(doc, { ref: e.id }, { themeId, densityId });
                  resolved = cssValue(r.value);
                  if (r.value.type === "color") color = resolved;
                } catch (err) {
                  resolved = (err as Error).message;
                }
              return (
                <tr
                  key={e.id}
                  className={selectedId === e.id ? "selected" : ""}
                  onClick={() => select(e.id)}
                >
                  <td>
                    <button
                      className="record-name"
                      onClick={() => select(e.id)}
                    >
                      {color ? (
                        <span
                          className="swatch"
                          style={{ background: color }}
                        />
                      ) : (
                        <span className="record-symbol">
                          {e.kind === "theme"
                            ? "◐"
                            : e.kind === "token"
                              ? "{ }"
                              : e.kind === "asset"
                                ? "▧"
                                : "Aa"}
                        </span>
                      )}
                      {e.name}
                    </button>
                  </td>
                  <td>
                    <span className="type-label">
                      {e.kind === "token"
                        ? e.valueType
                        : e.kind === "source"
                          ? e.sourceType
                          : e.kind === "theme"
                            ? e.axis
                            : e.kind}
                    </span>
                  </td>
                  <td>
                    {e.kind === "token" && "ref" in e.binding ? (
                      <span className="reference-value">
                        <Link2 size={12} />
                        {doc.entities[e.binding.ref]?.name}
                      </span>
                    ) : (
                      <code>
                        {resolved || (e.kind === "asset" ? e.filename : "—")}
                      </code>
                    )}
                  </td>
                  <td>
                    <button
                      className="usage-count"
                      aria-label={`Used by ${e.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        select(e.id);
                        useEditor.setState({
                          bottom: "Dependencies",
                          panelOpen: true,
                        });
                      }}
                    >
                      {usedBy(doc, e.id).length}
                      <ArrowUpRight size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {workspace === "Foundations" ? (
        <div className="source-note">
          <h3>Bring your foundations</h3>
          <p>
            Import a palette through the documented Chroma adapter, register a
            font, or add image assets. The included palette is an illustrative
            local fixture.
          </p>
          <a href="/fixtures/chroma-palette.json" download>
            Download palette format example <ArrowUpRight size={13} />
          </a>
        </div>
      ) : null}
    </section>
  );
}
