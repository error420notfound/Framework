import { gsap } from "gsap";
import { compileMotion, type MotionEntity } from "../../domain/motion";
import type { LibraryDocument } from "../../domain/schema";
export function createMotionTimeline(
  doc: LibraryDocument,
  motion: MotionEntity,
  preview: Document,
  reduced: boolean,
  onUpdate?: (progress: number) => void,
) {
  const compiled = compileMotion(doc, motion);
  const timeline = gsap.timeline({
    paused: true,
    onUpdate() {
      onUpdate?.(timeline.progress());
    },
  });
  const owner = doc.entities[motion.ownerId];
  const fadedTargets = new Set<string>();
  for (const clip of compiled.clips) {
    const target =
      owner?.kind === "component"
        ? preview.querySelector(`[data-fw-part="${clip.targetId}"]`)
        : preview.querySelector(`[data-fw-instance="${clip.targetId}"]`);
    if (!target) continue;
    if (reduced && motion.reduced === "fade") {
      if (fadedTargets.has(clip.targetId)) continue;
      fadedTargets.add(clip.targetId);
    }
    if (reduced && motion.reduced === "skip") {
      timeline.set(target, { [clip.property]: clip.to }, 0);
      continue;
    }
    const property = reduced ? "opacity" : clip.property;
    const from = reduced ? 0 : clip.from,
      to = reduced ? 1 : clip.to;
    timeline.fromTo(
      target,
      { [property]: from },
      {
        [property]: to,
        duration: reduced ? Math.min(0.15, clip.duration) : clip.duration,
        ease: clip.ease,
        immediateRender: false,
      },
      reduced ? 0 : clip.start,
    );
  }
  return timeline;
}
