import { resolve } from "./engine";
import type { Entity, LibraryDocument } from "./schema";
export type MotionEntity = Extract<Entity, { kind: "motion" }>;
export function compileMotion(doc: LibraryDocument, motion: MotionEntity) {
  return {
    ...motion,
    clips: motion.clips.map((clip) => {
      const value = resolve(doc, clip.duration).value;
      if (value.type !== "duration")
        throw new Error("Motion duration must be a duration token/value");
      return {
        ...clip,
        duration: value.value / (value.unit === "ms" ? 1000 : 1),
      };
    }),
  };
}
