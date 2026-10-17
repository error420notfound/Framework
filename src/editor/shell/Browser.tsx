import {
  Search,
  Plus,
  ChevronRight,
  Type,
  Box,
  Layers,
  Palette,
  Braces,
  Image,
  Component,
  GripVertical,
} from "lucide-react";
import { PanelResize } from "../controls/PanelResize";
import { compositionsFor } from "../../app/navigation";
import { useEditor, type Workspace } from "../../app/store";
import type { Entity, LibraryDocument } from "../../domain/schema";
export const workspaceEntities = (doc: LibraryDocument, workspace: Workspace) =>
  Object.values(doc.entities).filter((e) =>
    workspace === "Foundations"
      ? e.kind === "source" || e.kind === "asset"
      : workspace === "Foundation tokens"
        ? e.kind === "token" && e.layer === "foundation"
        : workspace === "Semantic tokens"
          ? e.kind === "token" && e.layer === "semantic"
          : workspace === "Themes"
            ? e.kind === "theme"
            : workspace === "Styles"
              ? e.kind === "style"
              : workspace === "Primitives"
                ? e.kind === "node"
                : workspace === "Components"
                  ? e.kind === "component"
                  : e.kind === "composition" || e.kind === "instance",
  );
export const EntityIcon = ({ entity }: { entity: Entity }) =>
  entity.kind === "source" ? (
    <Palette size={15} />
  ) : entity.kind === "token" ? (
    <Braces size={15} />
  ) : entity.kind === "style" ? (
    <Type size={15} />
  ) : entity.kind === "asset" ? (
    <Image size={15} />
  ) : entity.kind === "node" ? (
    entity.primitive === "Text" ? (
      <Type size={15} />
    ) : (
      <Box size={15} />
    )
  ) : entity.kind === "component" ? (
    <Component size={15} />
  ) : (
    <Layers size={15} />
  );
export function Browser({
  onCreate,
  onGallery,
}: {
  onCreate: () => void;
  onGallery: () => void;
}) {
  const { doc, workspace, selectedId, componentId, search, select } =
    useEditor();
  const matches = (id: string) =>
    doc.entities[id]?.name.toLowerCase().includes(search.toLowerCase());
  const items = workspaceEntities(doc, workspace).filter(
    (e) =>
      matches(e.id) || (e.kind === "composition" && e.instances.some(matches)),
  );
  return (
    <aside className="browser">
      <PanelResize side="browser" />
      <div className="browser-search">
        <Search size={15} />
        <input
          aria-label="Search library"
          placeholder={`Search ${workspace.toLowerCase()}…`}
          value={search}
          onChange={(e) => useEditor.setState({ search: e.target.value })}
        />
        <button
          className="icon-button"
          aria-label="Create item"
          onClick={onCreate}
        >
          <Plus size={18} />
        </button>
      </div>
      {workspace === "Components" || workspace === "Compositions" ? (
        <button className="gallery-open" onClick={onGallery}>
          Library gallery / install
        </button>
      ) : null}
      <div className="section-label">
        {workspace}
        <span>{items.length}</span>
      </div>
      <div className="item-list">
        {workspace === "Compositions" ? (
          <>
            {items
              .filter((e) => e.kind === "composition")
              .map(
                (e) =>
                  e.kind === "composition" && (
                    <details className="composition-branch" key={e.id} open>
                      <summary>
                        <button
                          className={`browser-item ${selectedId === e.id || (doc.entities[selectedId]?.kind === "motion" && doc.entities[selectedId].ownerId === e.id) ? "selected" : ""}`}
                          onClick={() => select(e.id)}
                        >
                          <EntityIcon entity={e} />
                          <span>{e.name}</span>
                        </button>
                      </summary>
                      <div className="composition-children">
                        {e.instances.map((id) => {
                          const child = doc.entities[id];
                          return child ? (
                            <button
                              className={`browser-item ${selectedId === id ? "selected" : ""}`}
                              key={id}
                              onClick={() => select(id)}
                            >
                              <EntityIcon entity={child} />
                              <span>{child.name}</span>
                            </button>
                          ) : null;
                        })}
                      </div>
                    </details>
                  ),
              )}
            {items.some(
              (e) =>
                e.kind === "instance" && !compositionsFor(doc, e.id).length,
            ) ? (
              <div className="section-label">Standalone instances</div>
            ) : null}
            {items
              .filter(
                (e) =>
                  e.kind === "instance" && !compositionsFor(doc, e.id).length,
              )
              .map((e) => (
                <button
                  className={`browser-item ${selectedId === e.id ? "selected" : ""}`}
                  key={e.id}
                  onClick={() => select(e.id)}
                >
                  <EntityIcon entity={e} />
                  <span>{e.name}</span>
                </button>
              ))}
          </>
        ) : (
          items.map((e) => (
            <button
              key={e.id}
              className={`browser-item ${e.id === selectedId || (workspace === "Components" && e.id === componentId) ? "selected" : ""}`}
              onClick={() => select(e.id)}
            >
              <EntityIcon entity={e} />
              <span>{e.name}</span>
              <ChevronRight size={12} />
            </button>
          ))
        )}
        {!items.length ? (
          <p className="small muted">No matching items.</p>
        ) : null}
      </div>
      <div className="browser-footer">
        <span className="status-dot" />
        Local library<span>Schema v{doc.schemaVersion}</span>
      </div>
    </aside>
  );
}
export function AnatomyTree() {
  const { doc, componentId, selectedId, select, command } = useEditor();
  const c = doc.entities[componentId];
  const collapsed = useEditor((s) => s.anatomyCollapsed);
  if (c?.kind !== "component") return null;
  if (["instance", "preset"].includes(doc.entities[selectedId]?.kind))
    return null;

  function tree(id: string, depth = 0) {
    const n = doc.entities[id];
    if (n?.kind !== "node") return null;
    return (
      <div key={id}>
        <button
          draggable={depth > 0}
          onDragStart={(e) => e.dataTransfer.setData("text/plain", id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const moving = e.dataTransfer.getData("text/plain");
            if (moving)
              command(
                [
                  {
                    type: "move",
                    id: moving,
                    parentId: id,
                    index: n.children.length,
                  },
                ],
                "Move anatomy node",
              );
          }}
          className={`tree-item ${selectedId === id ? "selected" : ""}`}
          style={{ paddingLeft: 12 + depth * 16 }}
          onClick={() => select(id)}
        >
          <ChevronRight
            size={12}
            className={n.children.length ? "expanded" : "invisible"}
          />
          <EntityIcon entity={n} />
          <span>{n.name}</span>
          {depth > 0 ? (
            <GripVertical size={12} className="drag-handle" />
          ) : null}
        </button>
        {n.children.map((child) => tree(child, depth + 1))}
      </div>
    );
  }
  return (
    <div className={`anatomy ${collapsed ? "collapsed" : ""}`}>
      <button
        className="anatomy-toggle"
        aria-label="Toggle anatomy"
        aria-expanded={!collapsed}
        onClick={() => useEditor.setState({ anatomyCollapsed: !collapsed })}
      >
        {collapsed ? "Anatomy ›" : "‹ Hide anatomy"}
      </button>
      <div hidden={collapsed}>
        <div className="pane-heading">
          {c.name}
          <span className="muted">Anatomy</span>
        </div>
        {tree(c.rootId)}
        <p className="anatomy-hint">
          Drag onto a container to move a part. Use the inspector to reorder.
        </p>
      </div>
    </div>
  );
}
