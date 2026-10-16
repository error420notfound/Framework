import { test, expect } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("icon libraries, keyboard selection, saved defaults, styles and mobile picker", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
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
  await expect(page).toHaveTitle(/Formwork/);
  await page
    .getByRole("button", { name: "Button", exact: true })
    .first()
    .click();
  const picker = page.locator(".inspector .icon-picker");
  const frame = page.frameLocator('iframe[title="Component preview"]');
  for (const [library, name, label] of [
    ["lucide", "heart", "Lucide"],
    ["bootstrap", "heart", "Bootstrap Icons"],
    ["material", "favorite", "Material Symbols"],
  ]) {
    await picker
      .getByRole("button", { name: "Choose icon", exact: true })
      .click();
    await picker.getByLabel("Icon library").selectOption(library);
    await picker.getByLabel("Search icons").fill(name);
    const choice = picker.getByRole("button", {
      name: "Select " + label + " " + name,
      exact: true,
    });
    await expect(choice).toBeVisible();
    await choice.focus();
    await page.keyboard.press("Enter");
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await expect(
      frame.locator('[data-fw-icon="' + library + "/" + name + '"]'),
    ).toBeVisible();
    if (library === "material")
      for (const style of ["outlined", "rounded", "sharp"]) {
        await frame.locator("[data-fw-icon]").evaluate(async (element) => {
          await element.ownerDocument.fonts.ready;
        });
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        await picker.getByLabel("Material style").selectOption(style);
        await frame
          .locator('[data-fw-icon-style="' + style + '"]')
          .evaluate(async (element) => {
            await element.ownerDocument.fonts.load(
              '16px "Material Symbols ' +
                element.getAttribute("data-fw-icon-style")![0].toUpperCase() +
                element.getAttribute("data-fw-icon-style")!.slice(1) +
                '"',
            );
          });
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        await expect(
          frame.locator('[data-fw-icon-style="' + style + '"]'),
        ).toBeVisible();
      }
    await expect(
      page.getByRole("button", { name: "Saved", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Saved", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Button", exact: true })
      .first()
      .click();
    await expect(picker).toContainText(label + " / " + name);
    await expect(
      frame.locator('[data-fw-icon="' + library + "/" + name + '"]'),
    ).toBeVisible();
  }
  await picker
    .getByRole("button", { name: "Choose icon", exact: true })
    .click();
  await expect(picker.getByLabel("Icon library")).toHaveValue("material");
  await expect(picker.getByLabel("Material style")).toHaveValue("sharp");
  await picker.getByLabel("Search icons").fill("no-icon-matches-this-query");
  await expect(picker.getByRole("status")).toHaveText("No matching icons");
  await picker.getByLabel("Search icons").press("Escape");
  await expect(
    picker.getByRole("button", { name: "Choose icon", exact: true }),
  ).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Toggle inspector" }).click();
  await picker
    .getByRole("button", { name: "Choose icon", exact: true })
    .click();
  await picker.getByLabel("Icon library").selectOption("bootstrap");
  await picker.getByLabel("Search icons").fill("heart");
  await expect(
    picker.getByRole("button", {
      name: "Select Bootstrap Icons heart",
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({ path: join(tmpdir(), "formwork-icons-mobile.png") });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: join(tmpdir(), "formwork-icons-desktop.png") });
  expect(errors).toEqual([]);
});

test("anatomy icon choices update the exposed default and middle preview together", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  const frame = page.frameLocator('iframe[title="Component preview"]');
  const anatomy = page.locator(".anatomy");
  const picker = page.locator(".inspector .icon-picker");
  // Reproduce a stale transient preview value masking the definition choice.
  await page.locator(".preview-content > summary").click();
  await page.getByLabel("Preview Icon", { exact: true }).fill("old preview");
  await page.getByLabel("Preview Icon", { exact: true }).press("Enter");
  await anatomy.getByRole("button", { name: "Icon", exact: true }).click();
  await page
    .locator(".inspector-sections")
    .getByRole("button", { name: "Properties", exact: true })
    .click();
  for (const [library, name, label] of [
    ["lucide", "circle-fading-plus", "Lucide"],
    ["bootstrap", "heart", "Bootstrap Icons"],
    ["material", "favorite", "Material Symbols"],
  ]) {
    await picker
      .getByRole("button", { name: "Choose icon", exact: true })
      .click();
    await picker.getByLabel("Icon library").selectOption(library);
    await picker.getByLabel("Search icons").fill(name);
    await picker
      .getByRole("button", {
        name: "Select " + label + " " + name,
        exact: true,
      })
      .click();
    await expect(
      frame.locator('[data-fw-icon="' + library + "/" + name + '"]'),
    ).toBeVisible();
    await expect(page.locator(".preview-content .icon-picker")).toContainText(
      label + " / " + name,
    );
    await picker.getByRole("button", { name: "Close", exact: true }).click();
  }
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(frame.locator('[data-fw-icon="bootstrap/heart"]')).toBeVisible();
  await expect(picker).toContainText("Bootstrap Icons / heart");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(
    frame.locator('[data-fw-icon="material/favorite"]'),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    frame.locator('[data-fw-icon="material/favorite"]'),
  ).toBeVisible();
  await anatomy.getByRole("button", { name: "Icon", exact: true }).click();
  await expect(picker).toContainText("Material Symbols / favorite");
  await page
    .getByRole("button", { name: "Button", exact: true })
    .first()
    .click();
  await expect(picker).toContainText("Material Symbols / favorite");
  // A static anatomy icon must continue to work without an exposed property.
  await anatomy.getByRole("button", { name: "Icon", exact: true }).click();
  await page
    .locator(".inspector-sections")
    .getByRole("button", { name: "Properties", exact: true })
    .click();
  await page.getByLabel("Expose text property").selectOption("");
  await picker
    .getByRole("button", { name: "Choose icon", exact: true })
    .click();
  await picker.getByLabel("Icon library").selectOption("lucide");
  await picker.getByLabel("Search icons").fill("coffee");
  await picker
    .getByRole("button", { name: "Select Lucide coffee", exact: true })
    .click();
  await expect(frame.locator('[data-fw-icon="lucide/coffee"]')).toBeVisible();
  await page.screenshot({
    path: join(tmpdir(), "formwork-anatomy-icon-fixed.png"),
  });
});
