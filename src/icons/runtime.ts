export type IconLibrary = "lucide" | "material" | "bootstrap";
export type IconStyle = "outlined" | "rounded" | "sharp";
export type IconSelection = {
  library: IconLibrary;
  name: string;
  style?: IconStyle;
  svg?: string;
  codepoint?: string;
};
// Selections remain strings so existing text properties, bindings and portable documents stay compatible.
export const encodeIcon = (icon: IconSelection) =>
  "fw-icon:" + JSON.stringify(icon);
export function parseIcon(value: unknown): IconSelection | undefined {
  if (
    typeof value !== "string" ||
    !value.startsWith("fw-icon:") ||
    value.length > 64000
  )
    return;
  try {
    const icon = JSON.parse(value.slice(8));
    if (
      !icon ||
      !["lucide", "material", "bootstrap"].includes(icon.library) ||
      typeof icon.name !== "string" ||
      !/^[a-z0-9][a-z0-9_-]{0,119}$/.test(icon.name)
    )
      return;
    if (icon.library === "material") {
      if (
        !["outlined", "rounded", "sharp"].includes(icon.style) ||
        typeof icon.codepoint !== "string" ||
        !/^[a-f0-9]{4,6}$/.test(icon.codepoint) ||
        parseInt(icon.codepoint, 16) > 0x10ffff
      )
        return;
    } else if (
      typeof icon.svg !== "string" ||
      icon.svg.length > 45000 ||
      !/^<svg[\s>]/.test(icon.svg.trim()) ||
      !icon.svg.trim().endsWith("</svg>")
    )
      return;
    return icon;
  } catch {
    return;
  }
}
// SVGs only appear as isolated CSS images, never as injected active SVG markup.
// Keep this renderer self-contained apart from parseIcon: Astro exports reuse both functions.
export function renderIcon(value: unknown): string {
  const escape = (text: unknown) =>
    String(text ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]!,
    );
  const icon = parseIcon(value);
  if (!icon)
    return typeof value === "string" && value.startsWith("fw-icon:")
      ? '<span data-fw-icon-missing title="Missing icon">&#x25a1;</span>'
      : escape(value);
  const attrs =
    ' aria-hidden="true" data-fw-icon="' + icon.library + "/" + icon.name + '"';
  if (icon.library === "material") {
    const family =
      "Material Symbols " + icon.style![0].toUpperCase() + icon.style!.slice(1);
    const url =
      "https://fonts.googleapis.com/css2?family=" +
      family.replaceAll(" ", "+") +
      "&amp;display=block";
    return (
      '<link rel="stylesheet" href="' +
      url +
      '"><span' +
      attrs +
      ' data-fw-icon-style="' +
      icon.style +
      '" style="font-family:&quot;' +
      family +
      '&quot;;font-weight:400;font-style:normal;font-size:1em;line-height:1;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr">&#x' +
      icon.codepoint +
      ";</span>"
    );
  }
  const uri =
    "data:image/svg+xml," +
    encodeURIComponent(icon.svg!.replaceAll("currentColor", "#000")).replaceAll(
      "'",
      "%27",
    );
  return (
    "<span" +
    attrs +
    ' style="display:inline-block;width:1em;height:1em;vertical-align:-.125em;background-color:currentColor;mask:url(&quot;' +
    uri +
    "&quot;) center/contain no-repeat;-webkit-mask:url(&quot;" +
    uri +
    '&quot;) center/contain no-repeat"></span>'
  );
}
