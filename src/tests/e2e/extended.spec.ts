import { test, expect } from "@playwright/test";
test("BrewPanel scenarios and narrow composition use reusable instances", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Compositions", exact: true }).click();
  await page.locator(".browser-item").filter({ hasText: "BrewPanel" }).click();
  const preview = page.frameLocator('iframe[title="Composition preview"]');
  await expect(preview.locator("body")).toContainText("18.2");
  for (const scenario of ["Disconnected", "Stale", "Unstable", "Overload"]) {
    await page.getByLabel("Brew scenario").selectOption(scenario);
    await expect(preview.locator("body")).toContainText(scenario);
  }
  await page.getByLabel("Composition viewport").selectOption("320");
  await expect(preview.locator("main")).toHaveCSS(
    "grid-template-columns",
    "256px",
  );
  expect(errors).toEqual([]);
});
test("state rules are authored and canvas parts are selectable", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page
    .frameLocator("iframe")
    .locator("[data-fw-part=button_label]")
    .click();
  await expect(page.getByLabel("Entity name")).toHaveValue("Label");
  await page.locator(".tree-item").filter({ hasText: "Button" }).click();
  await page.getByLabel("Binding scope").selectOption("state:hover");
  await page.getByLabel("New binding property").selectOption("background");
  await page.getByRole("button", { name: "Add binding", exact: true }).click();
  await page.getByLabel("background binding").selectOption("color_ink");
  await page.getByRole("checkbox", { name: "Hover", exact: true }).check();
  await expect(page.frameLocator("iframe").getByRole("button")).toHaveCSS(
    "background-color",
    "rgb(15, 23, 42)",
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
});
test("motion playback, scrubbing, timing edits, reload and reduced alternative", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Motion", exact: true }).click();
  await page.getByRole("button", { name: "Add motion", exact: true }).click();
  await page.getByLabel("Motion playhead").fill("0.5");
  await expect(page.frameLocator("iframe").getByRole("button")).not.toHaveCSS(
    "transform",
    "none",
  );
  await page.getByLabel("Clip 1 duration", { exact: true }).fill("0.6");
  await page.getByLabel("Clip 1 duration", { exact: true }).press("Enter");
  await page.getByRole("button", { name: "Play motion", exact: true }).click();
  await expect(page.getByLabel("Motion playhead")).toHaveValue("1");
  await page
    .getByRole("checkbox", { name: "Reduced motion", exact: true })
    .check();
  await page.getByLabel("Motion playhead").fill("1");
  await expect(page.frameLocator("iframe").getByRole("button")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 0, 0)",
  );
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Motion", exact: true }).click();
  await expect(page.getByLabel("Clip 1 duration", { exact: true })).toHaveValue(
    "0.6",
  );
  expect(errors).toEqual([]);
});
test("release snapshots remain isolated and adoption is explicit", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("button", { name: "Library releases", exact: true })
    .click();
  await page.getByRole("button", { name: "Create snapshot" }).click();
  await expect(page.locator(".release-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Close releases" }).click();
  await page.getByLabel("Library name").fill("Edited draft");
  await page.getByLabel("Library name").press("Enter");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("button", { name: "Library releases", exact: true })
    .click();
  await expect(page.locator(".release-row")).toContainText("Starter library");
  await page.getByRole("button", { name: "Adopt", exact: true }).click();
  await expect(page.getByLabel("Library name")).toHaveValue(
    "Starter library 0.1.0 draft",
  );
});
test("generated starter and motion runtimes build and run outside editor", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4322/library");
  await expect(
    page.getByRole("textbox", { name: "Your name" }),
  ).toHaveAttribute("placeholder", "Your name");
  await page.getByRole("checkbox", { name: "Accept option" }).check();
  await expect(page.locator("[data-fw-part=weight_value]")).toHaveText("21.4");
  await expect(page.locator("[data-fw-part=timer_value]")).toHaveText("01:05");
  await page.goto("http://127.0.0.1:4322/motion");
  const button = page.getByRole("button", { name: "Press motion" });
  await expect(button).toHaveAttribute("data-fw-motion-motion_button", "ready");
  await button.hover();
  await page.mouse.down();
  await expect(button).not.toHaveCSS("transform", "none");
  await page.mouse.up();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await button.hover();
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator("[data-fw-instance=brew_weight]")).toHaveCSS(
    "opacity",
    "1",
  );
  expect(errors).toEqual([]);
});
