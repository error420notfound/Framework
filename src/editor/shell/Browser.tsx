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
export function Browser({ onCreate }: { onCreate: () => void }) {
  const { doc, workspace, selectedId, componentId, search, select } =
    useEditor();
  const items = workspaceEntities(doc, workspace).filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <aside className="browser">
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
      <div className="section-label">
        {workspace}
        <span>{items.length}</span>
      </div>
      <div className="item-list">
        {items.map((e) => (
          <button
            key={e.id}
            className={`browser-item ${e.id === selectedId || (workspace === "Components" && e.id === componentId) ? "selected" : ""}`}
            onClick={() => select(e.id)}
          >
            <EntityIcon entity={e} />
            <span>{e.name}</span>
            <ChevronRight size={12} />
          </button>
        ))}
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
  if (c?.kind !== "component") return null;
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
    <div className="anatomy">
      <div className="pane-heading">
        {c.name}
        <span className="muted">Anatomy</span>
      </div>
      {tree(c.rootId)}
      <p className="anatomy-hint">
        Drag onto a container to move a part. Use the inspector to reorder.
      </p>
    </div>
  );
}
