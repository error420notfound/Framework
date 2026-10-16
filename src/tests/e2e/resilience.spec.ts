import { test, expect } from "@playwright/test";
test("long labels, missing icon content, invalid imports and failed font loading are explicit", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.locator(".preview-content > summary").click();
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
  await page.locator(".records input[type=file]").setInputFiles({
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

test("library switching preserves the requested destination while autosaving edits", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  const sourceId = await page.getByLabel("Library name").inputValue();
  await page.getByLabel("Library name").fill("Cancelled name");
  await page.getByLabel("Library name").press("Escape");
  await expect(page.getByLabel("Library name")).toHaveValue(sourceId);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "Fork library", exact: true }).click();
  await expect(page.getByLabel("Library name")).toHaveValue(
    "Starter library fork",
  );
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  const options = await page
    .getByLabel("Open library")
    .locator("option")
    .evaluateAll((nodes) =>
      nodes.map((n) => ({
        id: (n as HTMLOptionElement).value,
        name: n.textContent,
      })),
    );
  const original = options.find((o) => o.name === sourceId)!;
  await page.getByLabel("Library name").fill("Unsaved fork edit");
  await page.getByLabel("Open library").selectOption(original.id);
  await expect(page.getByLabel("Library name")).toHaveValue("Starter library");
  await page
    .getByLabel("Open library")
    .selectOption({ label: "Unsaved fork edit" });
  await expect(page.getByLabel("Library name")).toHaveValue(
    "Unsaved fork edit",
  );
});
