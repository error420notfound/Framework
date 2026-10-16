import { describe, it, expect } from "vitest";
import { encodeIcon, parseIcon, renderIcon } from "../icons/runtime";
import { loadIconCatalog } from "../icons/catalog";
import { documentSchema, type ComponentEntity } from "../domain/schema";
import { execute } from "../domain/engine";
import { createStarter } from "../starter/library";
import {
  renderComponent,
  compileComponent,
  previewHtml,
} from "../renderer/compiler";
import { astroFiles } from "../export/astro";
import { strFromU8 } from "fflate";
import { importPortable, portableBytes } from "../persistence/library";
describe("icon libraries", () => {
  it("loads complete catalogs and round-trips selections through validation, portable backups and rendering", async () => {
    let doc = createStarter();
    for (const library of ["lucide", "bootstrap", "material"] as const) {
      const catalog = await loadIconCatalog(library);
      expect(catalog.length).toBeGreaterThan(1000);
      expect(
        catalog.filter(
          (icon) =>
            !parseIcon(
              encodeIcon({
                ...icon,
                library,
                ...(library === "material"
                  ? { style: "outlined" as const }
                  : {}),
              }),
            ),
        ),
      ).toEqual([]);
      const icon = catalog.find(
        (icon) => icon.name === (library === "material" ? "favorite" : "heart"),
      )!;
      const value = encodeIcon({
        ...icon,
        library,
        ...(library === "material" ? { style: "outlined" as const } : {}),
      });
      expect(parseIcon(value)?.library).toBe(library);
      const button = doc.entities.button as ComponentEntity;
      doc = execute(doc, [
        {
          type: "update",
          id: "button",
          changes: {
            properties: button.properties.map((p) =>
              p.id === "icon" ? { ...p, default: value } : p,
            ),
          },
        },
      ]);
      expect(documentSchema.parse(doc)).toBeTruthy();
      doc = importPortable(portableBytes(doc));
      expect(renderComponent(doc, compileComponent(doc, "button"))).toContain(
        'data-fw-icon="' + library + "/" + icon.name + '"',
      );
    }
    const largest = (await loadIconCatalog("bootstrap")).reduce((a, b) =>
      (a.svg?.length ?? 0) > (b.svg?.length ?? 0) ? a : b,
    );
    const largeIcon = encodeIcon({ ...largest, library: "bootstrap" });
    expect(largeIcon.length).toBeGreaterThan(2000);
    doc = execute(doc, [
      {
        type: "update",
        id: "button_icon",
        changes: { props: { text: largeIcon } },
      },
    ]);
    expect(documentSchema.parse(doc)).toBeTruthy();
    const compiled = compileComponent(doc, "button");
    const lucide = encodeIcon({
      ...(await loadIconCatalog("lucide")).find((i) => i.name === "heart")!,
      library: "lucide",
    });
    const bootstrap = encodeIcon({
      ...(await loadIconCatalog("bootstrap")).find((i) => i.name === "heart")!,
      library: "bootstrap",
    });
    doc = execute(doc, [
      {
        type: "create",
        entity: {
          id: "mixed_icon_instance",
          name: "Mixed icon",
          kind: "instance",
          componentId: "button",
          configuration: { icon: bootstrap },
          variants: {},
          overrides: {},
        },
      },
    ]);
    const restored = importPortable(portableBytes(doc));
    expect(
      renderComponent(restored, compiled, { values: { icon: lucide } }),
    ).toContain("lucide/heart");
    expect(
      renderComponent(restored, compiled, {
        values: (restored.entities.mixed_icon_instance as any).configuration,
      }),
    ).toContain("bootstrap/heart");
    const files = astroFiles(doc);
    const source = strFromU8(files["components/icons.js"]);
    const renderer = new Function(
      source.replace(/export /g, "") + "; return renderIcon;",
    )();
    expect(
      renderer(
        (doc.entities.button as ComponentEntity).properties.find(
          (p) => p.id === "icon",
        )!.default,
      ),
    ).toContain("material/favorite");
    expect(strFromU8(files["components/Button.astro"])).toContain(
      'set:html={renderIcon(values["icon"])}',
    );
    expect(previewHtml(doc, "button", {})).toContain(
      "https://fonts.gstatic.com",
    );
  });
  it("preserves legacy glyphs and escapes invalid or malicious content", () => {
    expect(renderIcon("+")).toBe("+");
    expect(renderIcon("")).toBe("");
    expect(renderIcon("<script>")).toBe("&lt;script&gt;");
    expect(renderIcon("fw-icon:{}")).toContain("data-fw-icon-missing");
    expect(
      parseIcon(
        "fw-icon:" +
          JSON.stringify({
            library: "material",
            name: "heart",
            style: "bad",
            codepoint: "e87d",
          }),
      ),
    ).toBeUndefined();
    const malicious = encodeIcon({
      library: "bootstrap",
      name: "heart",
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    });
    expect(renderIcon(malicious)).not.toContain("<script>");
    for (const style of ["outlined", "rounded", "sharp"] as const)
      expect(
        renderIcon(
          encodeIcon({
            library: "material",
            name: "heart",
            style,
            codepoint: "e87d",
          }),
        ),
      ).toContain('data-fw-icon-style="' + style + '"');
    const doc = createStarter();
    expect(renderComponent(doc, compileComponent(doc, "button"))).toContain(
      ">+</span>",
    );
  });
});
