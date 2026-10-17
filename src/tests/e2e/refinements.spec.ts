import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const section = (page: Page, name: string) =>
  page
    .locator(".inspector-sections")
    .getByRole("button", { name, exact: true });
const state = async (page: Page) =>
  page.evaluate(async () => {
    const path = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .filter((name) => new URL(name).pathname === "/src/app/store.ts")
      .at(-1)!;
    const { useEditor } = await import(path);
    const s = useEditor.getState();
    return {
      doc: s.doc,
      history: s.past.length,
      selectedId: s.selectedId,
      componentId: s.componentId,
      bindingScope: s.bindingScope,
    };
  });
async function open(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
}
test("workspace memory, composition hierarchy, instance isolation, source and exact rule consumers", async ({
  page,
}) => {
  await open(page);
  const before = await state(page);
  await page.getByRole("button", { name: "Foundations", exact: true }).click();
  await page.locator(".record-name").filter({ hasText: "Blue 600" }).click();
  await page.getByRole("button", { name: "Components", exact: true }).click();
  await expect(page.getByLabel("Entity name")).toHaveValue("Label");
  await page.getByRole("button", { name: "Compositions", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Select a composition" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create first item" }),
  ).toHaveCount(0);
  await expect(page.locator(".composition-children .browser-item")).toHaveCount(
    4,
  );
  await page.locator(".browser-item").filter({ hasText: "BrewPanel" }).click();
  await page
    .locator(".composition-children .browser-item")
    .filter({ hasText: "Tare control" })
    .click();
  await expect(page.locator(".top-scope")).toHaveText("Instance scope");
  await expect(page.locator(".inspector .breadcrumbs")).toContainText(
    "BrewPanel",
  );
  const selected = await state(page);
  expect(selected.history).toBe(before.history);
  expect(selected.doc).toEqual(before.doc);
  await page.getByLabel("Instance Label", { exact: true }).fill("Only Tare");
  await page.getByLabel("Instance Label", { exact: true }).press("Enter");
  const edited = await state(page);
  expect(edited.doc.entities.button).toEqual(before.doc.entities.button);
  await page
    .getByRole("button", { name: "Open definition", exact: true })
    .click();
  await expect(page.getByLabel("Entity name")).toHaveValue("Button");
  await expect(page.getByLabel("Default Label", { exact: true })).toHaveValue(
    "Add item",
  );
  await page.getByRole("button", { name: "Compositions", exact: true }).click();
  await expect(page.getByLabel("Instance Label", { exact: true })).toHaveValue(
    "Only Tare",
  );
  await section(page, "Appearance").click();
  await expect(
    page.getByRole("button", { name: "Reset Instance fill" }),
  ).toHaveCount(0);
  await page.getByLabel("Instance fill binding").selectOption("color_ink");
  await expect(page.locator(".inspector")).toContainText("Instance override");
  await page.getByRole("button", { name: "Reset Instance fill" }).click();
  await expect(
    page.getByRole("button", { name: "Reset Instance fill" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Components", exact: true }).click();
  await page.locator(".tree-item").filter({ hasText: "Label" }).click();
  await page.locator(".inspector-tabs button").click();
  await expect(page.locator(".used-by")).toContainText("Direct consumers");
  await expect(page.locator(".used-by")).toContainText("Transitive downstream");
  const consumer = page.locator(".consumer").filter({
    has: page.getByRole("button", {
      name: "Button → Small → Label",
      exact: true,
    }),
  });
  await consumer.locator("summary").click();
  await expect(consumer).toContainText("rules.1.patch.button_label");
  await consumer.getByRole("button").click();
  await expect(page.getByLabel("Binding scope")).toHaveValue("rule:small");
  await expect(
    page.frameLocator("iframe").locator("[data-fw-part=button_label]"),
  ).toHaveCSS("font-size", "12px");
  await page
    .getByRole("button", { name: "Reset fontSize", exact: true })
    .click();
  await expect(
    page.frameLocator("iframe").locator("[data-fw-part=button_label]"),
  ).toHaveCSS("font-size", "14px");
  await expect(
    page.getByRole("button", { name: "Reset fontSize", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Foundations", exact: true }).click();
  await expect(page.getByLabel("Entity name")).toHaveValue("Blue 600");
  await page.getByRole("button", { name: "Components", exact: true }).click();
  await expect(page.getByLabel("Binding scope")).toHaveValue("rule:small");
});
test("inherited style literals, scoped overrides, selective reset and section drafts", async ({
  page,
}) => {
  await open(page);
  const line = page
    .locator(".binding-editor")
    .filter({ has: page.getByLabel("lineHeight binding") });
  await expect(line).toContainText("Inherited from Control label");
  await expect(
    line.getByRole("button", { name: "Reset lineHeight" }),
  ).toHaveCount(0);
  await expect(line).not.toContainText("Local override");
  await line.getByLabel("lineHeight binding").selectOption("__literal");
  await expect(line).toContainText("Explicit local value");
  await expect(
    line.getByRole("button", { name: "Reset lineHeight" }),
  ).toBeVisible();
  await line.getByRole("button", { name: "Reset lineHeight" }).click();
  await expect(line).toContainText("Inherited from Control label");
  await page.getByLabel("Binding scope").selectOption("variant:size:small");
  await page.getByLabel("fontSize binding").selectOption("__literal");
  const font = page
    .locator(".binding-editor")
    .filter({ has: page.getByLabel("fontSize binding") });
  await font.getByLabel("Value", { exact: true }).fill("17");
  await font.getByLabel("Value", { exact: true }).press("Enter");
  await page.getByRole("button", { name: "small", exact: true }).click();
  await expect(
    page.frameLocator("iframe").locator("[data-fw-part=button_label]"),
  ).toHaveCSS("font-size", "17px");
  await expect(font).toContainText("Variant override: Small");
  await page
    .getByRole("button", { name: "Reset fontSize", exact: true })
    .click();
  await expect(
    page.frameLocator("iframe").locator("[data-fw-part=button_label]"),
  ).toHaveCSS("font-size", "14px");
  await section(page, "Properties").click();
  await page.getByLabel("Node text", { exact: true }).fill("Pending fallback");
  await section(page, "Appearance").click();
  await section(page, "Properties").click();
  await expect(page.getByLabel("Node text", { exact: true })).toHaveValue(
    "Pending fallback",
  );
  await expect(page.locator(".record-actions")).not.toHaveAttribute("open", "");
  await page.locator(".record-actions > summary").focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Delete record", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await page.reload();
  await section(page, "Properties").click();
  await expect(page.getByLabel("Node text", { exact: true })).toHaveValue(
    "Pending fallback",
  );
});
test("colour conversions preserve gamut, precision, validation and portable export", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Foundations", exact: true }).click();
  await page.locator(".record-name").filter({ hasText: "Blue 600" }).click();
  const before = (await state(page)).doc.entities.source_blue;
  await page.getByLabel("L (0–1)", { exact: true }).focus();
  await page.keyboard.press("Tab");
  expect((await state(page)).doc.entities.source_blue).toEqual(before);
  for (let i = 0; i < 5; i++)
    for (const space of ["display-p3", "srgb", "oklch"])
      await page
        .getByLabel("Colour space", { exact: true })
        .selectOption(space);
  const converted = (await state(page)).doc.entities.source_blue;
  expect(converted.value.space).toBe("oklch");
  before.value.channels.forEach((v: number, i: number) =>
    expect(converted.value.channels[i]).toBeCloseTo(v, 9),
  );
  await page.getByLabel("Alpha (0–1)", { exact: true }).fill("1.5");
  await page.getByLabel("Alpha (0–1)", { exact: true }).press("Enter");
  await expect(page.getByRole("alert")).toContainText(
    "Alpha must be from 0 to 1",
  );
  expect((await state(page)).doc.entities.source_blue.value.alpha).toBe(1);
  await page.getByLabel("Alpha (0–1)", { exact: true }).press("Escape");
  await page
    .getByLabel("Colour space", { exact: true })
    .selectOption("display-p3");
  for (const [name, value] of [
    ["R (0–1)", "1"],
    ["G (0–1)", "0"],
    ["B (0–1)", "0"],
  ]) {
    await page.getByLabel(name, { exact: true }).fill(value);
    await page.getByLabel(name, { exact: true }).press("Enter");
  }
  await expect(page.getByLabel("Colour OKLCH")).toBeVisible();
  await expect(page.getByLabel("Colour hex")).toHaveCount(0);
  await page.getByLabel("Colour space", { exact: true }).selectOption("srgb");
  expect(
    (await state(page)).doc.entities.source_blue.value.channels[0],
  ).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  const saved = (await state(page)).doc;
  await page.reload();
  await page.getByRole("button", { name: "Foundations", exact: true }).click();
  await page.locator(".record-name").filter({ hasText: "Blue 600" }).click();
  const reloaded = (await state(page)).doc.entities.source_blue;
  expect(reloaded.value.space).toBe("oklch");
  expect(reloaded.value.alpha).toBe(saved.entities.source_blue.value.alpha);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Portable library" }).click();
  expect((await dl).suggestedFilename()).toContain(".formwork");
});
test("workspace sizes, keyboard and pointer resize, collapse preferences, viewport scale and console health", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !m.text().startsWith("Blocked script execution in 'about:srcdoc'")
    )
      errors.push(m.text());
  });
  await open(page);
  await mkdir("output/playwright", { recursive: true });
  await expect(page.locator(".bottom-content")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Validation 0", exact: true }),
  ).toBeVisible();
  for (const width of [1366, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator(".tree-item").filter({ hasText: "Button" }).click();
    await expect(page.getByLabel("background binding")).toBeInViewport();
    await expect(page.getByLabel("paddingInline binding")).toBeInViewport();
    await page.screenshot({
      path: "output/playwright/refined-button-" + width + ".png",
    });
    await page.locator(".tree-item").filter({ hasText: "Label" }).click();
    await expect(page.getByLabel("fontSize binding")).toBeInViewport();
    await page.screenshot({
      path: "output/playwright/refined-label-" + width + ".png",
    });
  }
  const before = await state(page);
  const resize = page.getByRole("separator", { name: "Resize inspector" });
  await resize.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(resize).toHaveAttribute("aria-valuenow", "330");
  await page.keyboard.press("End");
  await expect(resize).toHaveAttribute("aria-valuenow", "440");
  await page.keyboard.press("Home");
  await expect(resize).toHaveAttribute("aria-valuenow", "280");
  const handle = await page
    .getByRole("separator", { name: "Resize browser" })
    .boundingBox();
  if (!handle) throw 0;
  await page.mouse.move(handle.x + 3, handle.y + 100);
  await page.mouse.down();
  await page.mouse.move(handle.x + 43, handle.y + 100);
  await page.mouse.up();
  await expect(
    page.getByRole("separator", { name: "Resize browser" }),
  ).toHaveAttribute("aria-valuenow", "230");
  await page.getByRole("button", { name: "Toggle library browser" }).click();
  await expect(page.locator(".browser")).not.toBeVisible();
  await page.getByRole("button", { name: "Dependencies", exact: true }).click();
  await page.reload();
  await expect(page.locator(".browser")).not.toBeVisible();
  await expect(page.locator(".bottom-content")).toBeVisible();
  await expect(
    page.getByRole("separator", { name: "Resize inspector" }),
  ).toHaveAttribute("aria-valuenow", "280");
  await page.getByRole("button", { name: "Toggle library browser" }).click();
  await page.getByRole("button", { name: "Dependencies", exact: true }).click();
  await page.getByLabel("Preview viewport").selectOption("1280");
  const frameWidth = await page
    .locator('iframe[title="Component preview"]')
    .evaluate((el) => (el as HTMLIFrameElement).contentWindow?.innerWidth);
  expect(frameWidth).toBe(1280);
  await expect(page.locator(".canvas-title")).toContainText("% canvas scale");
  await page.setViewportSize({ width: 900, height: 900 });
  await page.getByRole("button", { name: "Toggle inspector" }).click();
  await expect(page.getByLabel("fontSize binding")).toBeInViewport();
  await page.screenshot({ path: "output/playwright/refined-narrow-900.png" });
  await page.getByRole("button", { name: "Toggle inspector" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Export", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByRole("button", { name: "Toggle inspector" }).click();
  await expect(page.getByLabel("fontSize binding")).toBeVisible();
  await page.screenshot({ path: "output/playwright/refined-mobile-390.png" });
  await page.getByRole("button", { name: "Toggle inspector" }).click();
  await page.getByRole("button", { name: "Toggle anatomy" }).click();
  await page.screenshot({
    path: "output/playwright/refined-mobile-canvas.png",
  });
  expect((await state(page)).doc).toEqual(before.doc);
  expect((await state(page)).history).toBe(before.history);
  expect(errors).toEqual([]);
});

test("responsive, nested-instance and motion consumers open the precise editing context", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await page.evaluate(async () => {
    const path = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .filter((n) => new URL(n).pathname === "/src/app/store.ts")
      .at(-1)!;
    const { useEditor } = await import(path);
    const s = useEditor.getState();
    const c = s.doc.entities.button;
    const instance = s.doc.entities.brew_panel.instances.find(
      (id: string) => s.doc.entities[id].componentId === "button",
    );
    s.command(
      [
        {
          type: "update",
          id: "button",
          changes: {
            responsive: [
              {
                maxWidth: 500,
                patch: {
                  button_root: {
                    paddingInline: { ref: "space_inline" },
                    gap: { ref: "space_gap" },
                  },
                },
              },
            ],
          },
        },
        {
          type: "override",
          id: instance,
          nodeId: "button_label",
          property: "fontSize",
          binding: { ref: "font_size" },
        },
        {
          type: "create",
          entity: {
            kind: "motion",
            id: "motion_route",
            name: "Press timeline",
            ownerId: "button",
            trigger: "press",
            reduced: "skip",
            clips: [
              {
                id: "clip_route",
                targetId: "button_root",
                property: "x",
                from: 0,
                to: 1,
                start: 0,
                duration: { ref: "motion_fast" },
                ease: "none",
              },
            ],
          },
        },
      ],
      "Author scope fixtures",
    );
  });
  await page
    .getByRole("button", { name: "Foundation tokens", exact: true })
    .click();
  await page
    .locator(".record-name")
    .filter({ hasText: "font.size.control" })
    .click();
  await page.locator(".inspector-tabs button").click();
  const nested = page
    .locator(".consumer > button")
    .filter({ hasText: "Instance override → Label → Font Size" });
  await nested.click();
  await expect(page.getByLabel("Instance anatomy")).toHaveValue("button_label");
  await expect(page.getByLabel("Instance fontSize binding")).toHaveValue(
    "font_size",
  );
  await page
    .getByRole("button", { name: "Reset Instance fontSize", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reset Instance fontSize", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Foundation tokens", exact: true })
    .click();
  await page
    .locator(".record-name")
    .filter({ hasText: "space.inline" })
    .click();
  await page
    .locator(".consumer > button")
    .filter({ hasText: "≤ 500 px → Button → Padding Inline" })
    .click();
  await expect(page.getByLabel("Binding scope")).toHaveValue("responsive:500");
  await expect(page.getByLabel("Preview viewport")).toHaveValue("500");
  await expect(page.getByLabel("paddingInline binding")).toHaveValue(
    "space_inline",
  );
  await page
    .getByRole("button", { name: "Reset paddingInline", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reset paddingInline", exact: true }),
  ).toHaveCount(0);
  expect(
    (await state(page)).doc.entities.button.responsive[0].patch.button_root.gap,
  ).toEqual({ ref: "space_gap" });
  await page
    .getByRole("button", { name: "Foundation tokens", exact: true })
    .click();
  await page
    .locator(".record-name")
    .filter({ hasText: "motion.duration.fast" })
    .click();
  await page
    .locator(".consumer > button")
    .filter({ hasText: "Press timeline" })
    .click();
  await expect(page.getByLabel("Entity name")).toHaveValue("Press timeline");
  await expect(page.locator(".top-scope")).toHaveText("Motion scope");
  await expect(page.locator('[data-motion-clip="clip_route"]')).toHaveClass(
    /selected/,
  );
  await expect(
    page.getByLabel("Clip 1 duration token", { exact: true }),
  ).toHaveValue("motion_fast");
  await expect(page.locator(".inspector .breadcrumbs")).toContainText("Button");
});
test("selected-record deletion and undo recovery leave an explicit empty selection", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Foundations", exact: true }).click();
  await page.getByRole("button", { name: "Create item", exact: true }).click();
  await page.getByLabel("New item name").fill("Temporary colour");
  await page
    .getByRole("button", { name: "Create source", exact: true })
    .click();
  await expect(page.getByLabel("Entity name")).toHaveValue("Temporary colour");
  await page.locator(".record-actions > summary").click();
  await page
    .getByRole("button", { name: "Delete record", exact: true })
    .click();
  await expect(page.getByLabel("Entity name")).toHaveCount(0);
  await expect(page.locator(".inspector")).toContainText("Select an item");
  await page.getByRole("button", { name: "Components", exact: true }).click();
  await expect(page.getByLabel("Entity name")).toHaveValue("Label");
  await page.getByRole("button", { name: "Foundations", exact: true }).click();
  await expect(page.getByLabel("Entity name")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page
    .locator(".browser-item")
    .filter({ hasText: "Temporary colour" })
    .click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Entity name")).toHaveCount(0);
  expect((await state(page)).selectedId).toBe("");
});
