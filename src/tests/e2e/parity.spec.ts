import { test, expect } from "@playwright/test";
import { createStarter } from "../../starter/library";
import { previewHtml } from "../../renderer/compiler";
test("preview and Astro agree across theme, density, emphasis, size and state matrix", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "The full 72-case parity matrix runs in Chromium; other engines run the essential authoring and native-runtime journeys.",
  );
  test.setTimeout(60000);
  const preview = await context.newPage();
  const doc = createStarter();
  await page.goto("http://127.0.0.1:4322/");
  const styles = (el: Element) => {
    const s = getComputedStyle(el);
    return {
      background: s.backgroundColor,
      color: s.color,
      paddingInline: s.paddingInline,
      paddingBlock: s.paddingBlock,
      borderColor: s.borderColor,
      borderRadius: s.borderRadius,
      outline: s.outlineWidth,
    };
  };
  for (const theme of ["light", "dark"])
    for (const density of ["comfortable", "compact"])
      for (const emphasis of ["primary", "secondary"])
        for (const size of ["small", "medium", "large"]) {
          const exported = page
            .locator(
              `section[data-fw-theme="${theme}"][data-fw-density="${density}"]`,
            )
            .getByRole("button", { name: `${emphasis} ${size}`, exact: true });
          for (const state of [
            "default",
            "hover",
            "focus-visible",
            "disabled",
            "loading",
          ] as const) {
            if (state === "disabled" || state === "loading") continue; // Dedicated native state controls below.
            await preview.setContent(
              previewHtml(
                doc,
                "button",
                { themeId: theme, densityId: density },
                {
                  variants: { emphasis, size },
                  states: state === "default" ? [] : [state],
                },
              ),
            );
            await page.mouse.move(0, 0);
            await exported.evaluate((el) => (el as HTMLElement).blur());
            if (state === "hover") await exported.hover();
            if (state === "focus-visible") await exported.focus();
            const a = await exported.evaluate(styles),
              b = await preview.getByRole("button").evaluate(styles);
            expect(
              a,
              `${theme}/${density}/${emphasis}/${size}/${state}`,
            ).toEqual(b);
            expect(
              await exported
                .locator("[data-fw-part=button_label]")
                .evaluate((el) => getComputedStyle(el).fontSize),
            ).toEqual(
              await preview
                .locator("[data-fw-part=button_label]")
                .evaluate((el) => getComputedStyle(el).fontSize),
            );
          }
        }
  for (const state of ["disabled", "loading"] as const) {
    await preview.setContent(
      previewHtml(doc, "button", {}, { states: [state, "focus-visible"] }),
    );
    const rendered = preview.getByRole("button");
    await expect(rendered).toBeDisabled();
    await expect(rendered).toHaveCSS("outline-width", "3px");
    const exported = page
      .getByRole("button", {
        name: state === "disabled" ? "Disabled" : "Loading",
        exact: true,
      })
      .first();
    await expect(exported).toBeDisabled();
  }
  await preview.close();
});
