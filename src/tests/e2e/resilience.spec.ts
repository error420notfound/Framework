import { test, expect } from "@playwright/test";
test("long labels, missing icon content, invalid imports and failed font loading are explicit", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Preview Label", { exact: true })
    .fill(
      "A very long label with enough words to wrap in a narrow component preview and remain readable throughout the authoring workflow",
    );
  await page.getByLabel("Preview Icon", { exact: true }).fill("");
  await page.getByLabel("Preview viewport").selectOption("320");
  const frame = page.frameLocator("iframe");
  await expect(frame.getByRole("button")).toContainText("A very long label");
  expect(
    await frame
      .locator("body")
      .evaluate(
        (body) =>
          body.scrollWidth <= body.ownerDocument.documentElement.clientWidth,
      ),
  ).toBe(true);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("button", { name: "Import library", exact: true })
    .click();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "bad.formwork",
      mimeType: "application/json",
      buffer: Buffer.from('{"schemaVersion":99}'),
    });
  await expect(page.getByRole("alert")).toContainText("Import rejected");
  await page.getByRole("button", { name: "Dismiss error" }).click();
  await page.getByRole("button", { name: "Foundations", exact: true }).click();
  await page
    .locator(".records input[type=file]")
    .setInputFiles({
      name: "invalid.woff2",
      mimeType: "font/woff2",
      buffer: Buffer.from("not a font"),
    });
  await page
    .locator(".record-name")
    .filter({ hasText: /invalid$/ })
    .click();
  await expect(page.locator(".font-status")).toContainText(
    "Font file failed to load",
  );
});
