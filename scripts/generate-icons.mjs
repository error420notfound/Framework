import fs from "node:fs/promises";
const output = new URL("../src/icons/catalogs/", import.meta.url);
await fs.mkdir(output, { recursive: true });
for (const [library, folder] of [
  ["lucide", "lucide-static/icons"],
  ["bootstrap", "bootstrap-icons/icons"],
]) {
  const directory = new URL("../node_modules/" + folder + "/", import.meta.url);
  const entries = await fs.readdir(directory);
  const icons = await Promise.all(
    entries
      .filter((name) => name.endsWith(".svg"))
      .sort()
      .map(async (file) => ({
        name: file.slice(0, -4),
        svg: (await fs.readFile(new URL(file, directory), "utf8"))
          .replace(/<!--[\s\S]*?-->/g, "")
          .trim(),
      })),
  );
  await fs.writeFile(new URL(library + ".json", output), JSON.stringify(icons));
  console.log(library + ": " + icons.length);
}
const response = await fetch(
  "https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsOutlined%5BFILL,GRAD,opsz,wght%5D.codepoints",
);
if (!response.ok)
  throw new Error("Material Symbols catalog: " + response.status);
const icons = (await response.text())
  .trim()
  .split(/\r?\n/)
  .map((line) => {
    const [name, codepoint] = line.split(/\s+/);
    return { name, codepoint };
  });
await fs.writeFile(new URL("material.json", output), JSON.stringify(icons));
console.log("material: " + icons.length);

// Embed stable JavaScript source in exports; function.toString() is unsafe after app minification.
const { stripTypeScriptTypes } = await import("node:module");
const runtime = await fs.readFile(
  new URL("../src/icons/runtime.ts", import.meta.url),
  "utf8",
);
await fs.writeFile(
  new URL("../src/icons/runtime-source.json", import.meta.url),
  JSON.stringify(stripTypeScriptTypes(runtime)),
);

const licenses = Object.fromEntries(
  await Promise.all(
    ["lucide", "bootstrap", "material"].map(async (name) => [
      name,
      await fs.readFile(
        new URL("../src/icons/licenses/" + name + ".txt", import.meta.url),
        "utf8",
      ),
    ]),
  ),
);
await fs.writeFile(
  new URL("../src/icons/licenses.json", import.meta.url),
  JSON.stringify(licenses),
);
