import { z } from "zod";
import { documentSchema, newId, type LibraryDocument } from "./schema";
import { fork, parseDocument } from "./engine";
export const releaseSchema = z.object({
  id: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  libraryId: z.string(),
  revision: z.number().int(),
  createdAt: z.iso.datetime(),
  document: documentSchema,
});
export type Release = z.infer<typeof releaseSchema>;
export function createRelease(doc: LibraryDocument, version: string): Release {
  const id = newId("release");
  return releaseSchema.parse({
    id,
    version,
    libraryId: doc.id,
    revision: doc.revision,
    createdAt: new Date().toISOString(),
    document: parseDocument({
      ...structuredClone(doc),
      release: { id, version, sourceRevision: doc.revision },
    }),
  });
}
export function adoptRelease(
  release: Release,
  id: string,
  name: string,
): LibraryDocument {
  const parsed = releaseSchema.parse(release);
  const doc = fork(parseDocument(parsed.document), id, name);
  doc.provenance = {
    libraryId: parsed.libraryId,
    revision: parsed.revision,
    releaseId: parsed.id,
  };
  return doc;
}
