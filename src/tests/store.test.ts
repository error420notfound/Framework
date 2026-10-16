import { afterEach, describe, it, expect, vi } from "vitest";
import { initialize, useEditor } from "../app/store";
import { createStarter } from "../starter/library";
import type { PersistenceAdapter } from "../persistence/library";
const reset = () =>
  useEditor.setState({
    doc: createStarter(),
    past: [],
    future: [],
    libraries: [],
    saveState: "Unsaved",
    error: "",
  });
afterEach(() => {
  vi.useRealTimers();
});
describe("history and persistence states", () => {
  it("records one history entry for a multi-command transaction and ignores navigation", async () => {
    vi.useFakeTimers();
    reset();
    useEditor.getState().command(
      [
        { type: "rename", id: "fill", name: "Renamed" },
        { type: "rename", id: "text", name: "Text renamed" },
      ],
      "Rename roles",
    );
    expect(useEditor.getState().past).toHaveLength(1);
    useEditor.getState().select("fill");
    useEditor.getState().navigate("Themes");
    expect(useEditor.getState().past).toHaveLength(1);
    useEditor.getState().undo();
    expect(useEditor.getState().doc.entities.fill.name).toBe(
      "action.primary.default.fill",
    );
    expect(useEditor.getState().doc.entities.text.name).toBe(
      "action.primary.default.text",
    );
    useEditor.getState().redo();
    expect(useEditor.getState().doc.entities.fill.name).toBe("Renamed");
  });
  it("does not report Saved before the write commits and rejects stale acknowledgements", async () => {
    vi.useFakeTimers();
    reset();
    let finish: () => void = () => {};
    const adapter: PersistenceAdapter = {
      loadAll: async () => [createStarter()],
      save: () =>
        new Promise<void>((r) => {
          finish = r;
        }),
    };
    await initialize(adapter);
    const pending = useEditor.getState().save();
    await Promise.resolve();
    await Promise.resolve();
    expect(useEditor.getState().saveState).toBe("Saving");
    useEditor
      .getState()
      .command(
        [{ type: "rename", id: "fill", name: "Changed during save" }],
        "Rename",
      );
    finish();
    await pending;
    expect(useEditor.getState().saveState).toBe("Unsaved");
  });
  it("surfaces failed writes and allows retry", async () => {
    vi.useFakeTimers();
    reset();
    let fail = true;
    await initialize({
      loadAll: async () => [createStarter()],
      save: async () => {
        if (fail) throw new Error("quota");
      },
    });
    await useEditor.getState().save();
    expect(useEditor.getState().saveState).toBe("Failed");
    expect(useEditor.getState().error).toContain("quota");
    fail = false;
    await useEditor.getState().save();
    expect(useEditor.getState().saveState).toBe("Saved");
  });
});
