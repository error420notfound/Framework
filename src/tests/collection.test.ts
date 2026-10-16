import { describe, it, expect } from "vitest";
import { createCompleteStarter } from "../starter/collection";
import { validate, execute } from "../domain/engine";
import { astroFiles } from "../export/astro";
import { strFromU8 } from "fflate";
describe("authored starter collection", () => {
  it("uses the same model and native primitives", () => {
    const doc = createCompleteStarter();
    expect(validate(doc)).toEqual([]);
    for (const id of [
      "text_component",
      "icon_component",
      "image_component",
      "surface_component",
      "stack_component",
      "inline_component",
      "grid_component",
      "button",
      "link_component",
      "textfield_component",
      "checkbox_component",
      "weight_readout",
      "timer_component",
    ])
      expect(doc.entities[id]?.kind).toBe("component");
  });
  it("exports reusable composition definitions and application data slots", () => {
    const files = astroFiles(createCompleteStarter());
    const composition = strFromU8(files["components/BrewPanel.astro"]);
    expect(composition).toContain(
      "import WeightReadout from './WeightReadout.astro'",
    );
    expect(composition).toContain('data["brew_weight"]');
    expect(composition).toContain('data-fw-instance="brew_tare"');
    expect(composition).not.toMatch(/setInterval|WebSocket/);
  });
  it("removes anatomy with owned rules without orphaned targets", () => {
    const doc = execute(createCompleteStarter(), [
      { type: "removeNode", id: "button_label" },
    ]);
    expect(validate(doc)).toEqual([]);
    expect(doc.entities.button_label).toBeUndefined();
  });
});
