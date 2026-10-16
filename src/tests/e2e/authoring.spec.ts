import { test, expect } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("foundation → anatomy → save → portable import → export", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    // Playwright attempts frame utilities in srcdoc. Keep the intentional script sandbox.
    if (
      message.type() === "error" &&
      !message.text().startsWith("Blocked script execution in 'about:srcdoc'")
    )
      errors.push(message.text());
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  const preview = () => page.frameLocator('iframe[title="Component preview"]');
  await expect(
    preview().getByRole("button", { name: "Add item" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Foundations", exact: true }).click();
  await page.locator(".record-name").filter({ hasText: "Blue 600" }).click();
  await page.getByLabel("Colour hex").fill("#CC4400");
  await page.getByLabel("Colour hex").press("Enter");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Colour hex")).toHaveValue("#2563EB");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Colour hex")).toHaveValue("#CC4400");
  await page.getByRole("button", { name: "Components", exact: true }).click();
  await expect(preview().getByRole("button")).toHaveCSS(
    "background-color",
    "rgb(204, 68, 0)",
  );
  await page
    .getByRole("button", { name: "Button", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Edit anatomy" }).click();
  await page.getByLabel("background binding").selectOption("secondary_fill");
  await expect(preview().getByRole("button")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await page.getByRole("button", { name: "Jump to background source" }).click();
  await expect(page.getByLabel("Entity name")).toHaveValue(
    "action.secondary.fill",
  );
  await expect(page.locator(".source-chain")).toContainText("color.white");
  await page.getByRole("button", { name: "Styles", exact: true }).click();
  await page.locator(".style-specimen").click();
  await page.getByLabel("fontSize binding").selectOption("__literal");
  const size = page
    .locator(".binding-editor")
    .filter({ has: page.locator(".binding-title", { hasText: "fontSize" }) })
    .getByLabel("Value", { exact: true });
  await size.fill("18");
  await size.press("Enter");
  await page.getByRole("button", { name: "Components", exact: true }).click();
  await expect(preview().locator('[data-fw-part="button_label"]')).toHaveCSS(
    "font-size",
    "18px",
  );
  await page.getByLabel("Preview theme").selectOption("dark");
  await page.getByLabel("Preview density").selectOption("compact");
  await page.getByRole("button", { name: "large", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Focus-visible", exact: true })
    .check();
  await page.getByRole("checkbox", { name: "Loading", exact: true }).check();
  await expect(preview().getByRole("button")).toBeDisabled();
  await expect(preview().getByRole("button")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(preview().getByRole("button")).toHaveCSS("outline-width", "3px");
  await page.getByRole("button", { name: "Reset preview" }).click();
  await page.getByRole("checkbox", { name: "Disabled", exact: true }).check();
  await expect(preview().getByRole("button")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  let downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Portable library" }).click();
  const backup = await downloadPromise;
  const path = join(tmpdir(), "formwork-roundtrip.formwork");
  await backup.saveAs(path);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("button", { name: "Import library", exact: true })
    .click();
  await page.locator("input[type=file]").first().setInputFiles(path);
  await expect(page.getByRole("dialog")).toContainText("validated records");
  await page.getByRole("button", { name: "Import as new library" }).click();
  await expect(page.getByLabel("Library name")).toHaveValue(
    "Starter library imported",
  );
  await page.getByRole("button", { name: "Export", exact: true }).click();
  downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Astro package" }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/astro.zip$/);
  await expect(page.locator("[role=alert]")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("context creation, constrained anatomy, search and keyboard dialogs", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.locator(".tree-item").filter({ hasText: "Content" }).click();
  await page.getByRole("button", { name: "Add part", exact: true }).click();
  await page.getByLabel("New item name").fill("Second label");
  await page.getByLabel("New primitive").selectOption("Text");
  await page.getByRole("button", { name: "Create node", exact: true }).click();
  await expect(
    page.locator(".tree-item", { hasText: "Second label" }),
  ).toBeVisible();
  await page.getByLabel("Node text").fill("Extra");
  await page.getByLabel("Node text").press("Enter");
  await expect(page.frameLocator("iframe").getByRole("button")).toContainText(
    "Extra",
  );
  await page.getByLabel("Primitive type").selectOption("Button");
  await expect(page.getByRole("alert")).toContainText("Nested interactive");
  await page.getByRole("button", { name: "Dismiss error" }).click();
  await page
    .getByRole("button", { name: "Foundation tokens", exact: true })
    .click();
  await page.getByRole("button", { name: "Create item", exact: true }).click();
  await page.getByLabel("New item name").fill("space.custom");
  await page.getByLabel("Value type").selectOption("dimension");
  await page.getByRole("button", { name: "Create token", exact: true }).click();
  await expect(page.getByLabel("Entity name")).toHaveValue("space.custom");
  await page.getByLabel("Search library").fill("custom");
  await expect(page.locator(".record-table tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Create item", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("desktop and narrow layouts, preview CSS isolation and console health", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.addStyleTag({
    content: "button[data-fw-component]{background:rgb(255,0,0)!important}",
  });
  await expect(page.frameLocator("iframe").getByRole("button")).toHaveCSS(
    "background-color",
    "rgb(37, 99, 235)",
  );
  const before = await page
    .locator(".brand")
    .evaluate((e) => getComputedStyle(e).backgroundColor);
  await page
    .frameLocator("iframe")
    .locator("body")
    .evaluate((body) => {
      const style = body.ownerDocument.createElement("style");
      style.id = "qa-isolation";
      style.textContent =
        "body *{font-size:80px!important;background:rgb(255,0,0)!important}";
      body.append(style);
    });
  await expect(page.locator(".brand")).toHaveCSS("background-color", before);
  await expect(page.frameLocator("iframe").getByRole("button")).toHaveCSS(
    "font-size",
    "80px",
  );
  await page
    .frameLocator("iframe")
    .locator("#qa-isolation")
    .evaluate((el) => el.remove());
  await page.screenshot({ path: join(tmpdir(), "formwork-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Export", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByRole("button", { name: "Toggle inspector" }).click();
  await expect(page.getByLabel("Entity name")).toBeVisible();
  await page.getByRole("button", { name: "Toggle inspector" }).click();
  await page.screenshot({ path: join(tmpdir(), "formwork-narrow.png") });
  expect(errors).toEqual([]);
});
test("exported Astro native behavior, slots, keyboard and themes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4322/");
  await expect(page).toHaveTitle("Formwork Astro consumer");
  await expect(
    page.getByRole("button", { name: "Disabled", exact: true }),
  ).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Disabled", exact: true }).first(),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Loading", exact: true }).first(),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Custom accessible name" }).first(),
  ).toContainText("Slotted label");
  const button = page.getByRole("button", { name: "Count activation" }).first();
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#activations")).toHaveText("1");
  await page.keyboard.press("Space");
  await expect(page.locator("#activations")).toHaveText("2");
  await expect(button).toHaveCSS("outline-width", "3px");
  const dark = page.locator("[data-fw-theme=dark]").first();
  await expect(dark).toHaveCSS("background-color", "rgb(15, 23, 42)");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", { name: "Loading", exact: true }).first(),
  ).toHaveAttribute("aria-busy", "true");
  expect(errors).toEqual([]);
});
