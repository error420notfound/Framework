import { z } from "zod";
import { valueSchema, newId, type Entity } from "./schema";
// An explicit adapter contract, not an assumed Chroma network API.
export const paletteSchema = z.object({
  adapter: z.literal("chroma-palette-v1"),
  sourceId: z.string().min(1),
  name: z.string(),
  entries: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string(),
        color: valueSchema.refine((v) => v.type === "color"),
      }),
    )
    .min(1)
    .max(1000),
});
export function importPalette(input: unknown): Entity[] {
  const palette = paletteSchema.parse(input);
  if (new Set(palette.entries.map((e) => e.id)).size !== palette.entries.length)
    throw new Error("Duplicate palette entry identity");
  return palette.entries.map((e) => ({
    id: newId("source"),
    kind: "source",
    name: e.name,
    sourceType: "color",
    value: e.color,
    origin: {
      adapter: palette.adapter,
      externalId: e.id,
      metadata: { paletteId: palette.sourceId, paletteName: palette.name },
    },
  }));
}
