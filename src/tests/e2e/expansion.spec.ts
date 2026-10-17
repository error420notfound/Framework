import { test, expect } from "@playwright/test";

test("gallery filters, inserts linked presets, edits locally and reopens", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Library gallery / install" }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "/tmp/formwork-gallery-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("dialog", { name: "Library gallery", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator(".starter-gallery")
      .evaluate((el) => el.getBoundingClientRect().right <= innerWidth),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/formwork-gallery-mobile.png" });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByLabel("Search gallery").fill("Outline Button");
  await expect(page.locator(".gallery-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Insert preset", exact: true })
    .click();
  await expect(page.locator(".breadcrumbs").first()).toContainText("Instance");
  const frame = page.frameLocator('iframe[title="Component preview"]');
  await expect(frame.getByRole("button", { name: "Continue" })).toBeVisible();
  await page
    .getByLabel("Instance Label", { exact: true })
    .fill("Only this instance");
  await page.getByLabel("Instance Label", { exact: true }).press("Enter");
  await expect(
    frame.getByRole("button", { name: "Only this instance" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Compositions", exact: true }).click();
  await page
    .locator(".browser-item")
    .filter({ hasText: "Outline Button with trailing icon" })
    .click();
  await expect(
    frame.getByRole("button", { name: "Only this instance" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open definition", exact: false })
    .click();
  await expect(frame.getByRole("button", { name: "Add item" })).toBeVisible();
  await page.getByRole("button", { name: "Library gallery / install" }).click();
  await page.getByLabel("Search gallery").fill("Destructive Button");
  await page
    .getByRole("button", { name: "Insert preset", exact: true })
    .click();
  await expect(
    frame.getByRole("button", { name: "Delete", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("every core family edits through the existing inspector and persists", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  for (const name of [
    "Badge",
    "Avatar",
    "Separator",
    "Card",
    "Alert",
    "Skeleton",
    "Spinner",
    "Progress",
    "Table",
  ]) {
    await page
      .locator(".browser-item")
      .getByText(name, { exact: true })
      .click();
    await expect(page.locator(".inspector .pane-heading")).toContainText(name);
    await page.getByLabel("Entity name").fill(`${name} edited`);
    await page.getByLabel("Entity name").press("Enter");
    const geometry: Record<string, [string, string]> = {
      Badge: ["paddingInline", "13"],
      Avatar: ["width", "52"],
      Separator: ["borderWidth", "3"],
      Card: ["paddingInline", "23"],
      Alert: ["paddingInline", "21"],
      Skeleton: ["width", "196"],
      Spinner: ["fontSize", "32"],
      Progress: ["width", "220"],
      Table: ["width", "80"],
    };
    await page
      .locator(".inspector-sections")
      .getByRole("button", { name: "Anatomy", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Edit anatomy", exact: true })
      .click();
    await page
      .locator(".inspector-sections")
      .getByRole("button", { name: "Appearance", exact: true })
      .click();
    const [property, value] = geometry[name];
    const field = page
      .locator(".binding-editor")
      .filter({ has: page.getByLabel(`${property} binding`, { exact: true }) });
    const group = field.locator("xpath=ancestor::details[1]");
    if ((await group.count()) && (await group.getAttribute("open")) === null)
      await group.locator(":scope > summary").click();
    await field
      .getByLabel(`${property} binding`, { exact: true })
      .selectOption("__literal");
    await field.getByLabel("Value", { exact: true }).fill(value);
    await field.getByLabel("Value", { exact: true }).press("Enter");
    await expect(field.getByLabel("Value", { exact: true })).toHaveValue(value);

    await expect(
      page
        .locator(".browser-item")
        .getByText(`${name} edited`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Saved", exact: true }),
    ).toBeVisible();
  }
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  for (const name of [
    "Badge",
    "Avatar",
    "Separator",
    "Card",
    "Alert",
    "Skeleton",
    "Spinner",
    "Progress",
    "Table",
  ])
    await expect(
      page
        .locator(".browser-item")
        .getByText(`${name} edited`, { exact: true }),
    ).toBeVisible();
});

test("generated Astro showcase renders core families, native semantics and responsive long content", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("http://127.0.0.1:4322/expansion/");
  await expect(page).toHaveTitle("Formwork expansion showcase");
  await expect(page.locator("[data-example]")).toHaveCount(15);
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  await expect(
    page.locator('[data-fw-component="badge_component"]'),
  ).toContainText("Connected");
  await expect(
    page.getByRole("heading", { name: "A considered interface" }),
  ).toHaveJSProperty("tagName", "H2");
  await expect(page.getByRole("table")).toContainText("INV001");
  await expect(page.getByRole("columnheader")).toHaveCount(3);
  await expect(page.getByRole("progressbar")).toHaveJSProperty("value", 60);
  await expect(page.getByRole("progressbar")).toHaveCSS(
    "color",
    "rgb(37, 99, 235)",
  );
  await expect(page.getByRole("progressbar")).toHaveCSS(
    "background-color",
    "rgb(226, 232, 240)",
  );
  await expect(page.getByRole("alert")).toContainText(
    "Your changes have been saved.",
  );
  await expect(page.getByRole("status")).toHaveAttribute(
    "aria-label",
    "Loading",
  );
  await expect(page.locator('[data-example="missing-avatar"]')).toContainText(
    "NA",
  );
  const button = page.getByRole("button", { name: "Continue" });
  await button.focus();
  await expect(button).toBeFocused();
  await page.screenshot({
    path: "/tmp/formwork-expansion-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator('[data-example="long-card"]')).toContainText(
    "Long content remains editable",
  );
  await page.screenshot({
    path: "/tmp/formwork-expansion-mobile.png",
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-fw-primitive="Spinner"]')).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator('[data-fw-primitive="Skeleton"]')).toHaveCSS(
    "animation-name",
    "none",
  );
  expect(errors).toEqual([]);
});

test("core presets use equivalent preview and generated Astro styles and anatomy", async ({
  page,
  context,
}) => {
  const { createCompleteStarter } = await import("../../starter/collection");
  const { previewHtml } = await import("../../renderer/compiler");
  const doc = createCompleteStarter();
  await page.goto("http://127.0.0.1:4322/expansion/");
  const preview = await context.newPage();
  for (const preset of Object.values(doc.entities)) {
    if (preset.kind !== "preset") continue;
    await preview.setContent(
      previewHtml(
        doc,
        preset.componentId,
        { themeId: "light", densityId: "comfortable" },
        {
          values: preset.configuration,
          variants: preset.variants,
          overrides: preset.overrides,
        },
      ),
    );
    const exported = page
      .locator(`[data-example="${preset.id}"] [data-fw-component]`)
      .first();
    const actual = preview.locator("[data-fw-component]").first();
    const snapshot = (el: Element) => {
      const css = getComputedStyle(el);
      return {
        tag: el.tagName,
        color: css.color,
        background: css.backgroundColor,
        font: css.fontSize,
        weight: css.fontWeight,
        paddingInline: css.paddingInline,
        paddingBlock: css.paddingBlock,
        border: css.borderColor,
        radius: css.borderRadius,
        gap: css.gap,
      };
    };
    expect(await exported.evaluate(snapshot), preset.name).toEqual(
      await actual.evaluate(snapshot),
    );
    expect(await exported.locator("[data-fw-part]").count(), preset.name).toBe(
      await actual.locator("[data-fw-part]").count(),
    );
  }
  await preview.close();
});
