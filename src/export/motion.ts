import { compileMotion } from "../domain/motion";
import type { LibraryDocument } from "../domain/schema";
export function motionRuntime(doc: LibraryDocument): string {
  const motions = Object.values(doc.entities)
    .filter((e) => e.kind === "motion")
    .map((m) => {
      const owner = doc.entities[m.ownerId];
      return {
        ...compileMotion(doc, m),
        ownerKind: owner.kind,
        rootId: owner.kind === "component" ? owner.rootId : undefined,
      };
    });
  return `import { gsap } from 'gsap';
const motions = ${JSON.stringify(motions).replaceAll("<", "\\u003c")};
export function initializeMotion() {
  for (const motion of motions) {
    const selector = motion.ownerKind === 'component' ? '[data-fw-component="'+motion.ownerId+'"]' : '[data-fw-composition="'+motion.ownerId+'"]';
    document.querySelectorAll(selector).forEach(root => {
      const key = 'data-fw-motion-'+motion.id;
      if (root.hasAttribute(key)) return;
      root.setAttribute(key,'ready');
      const media = gsap.matchMedia();
      media.add({ reduced: '(prefers-reduced-motion: reduce)', standard: '(prefers-reduced-motion: no-preference)' }, context => {
        const reduced = context.conditions.reduced;
        const timeline = gsap.timeline({paused:true});
        const fadedTargets = new Set();
        for (const clip of motion.clips) {
          const target = motion.ownerKind === 'component' && clip.targetId === motion.rootId ? root : root.querySelector('[data-fw-'+(motion.ownerKind === 'component' ? 'part' : 'instance')+'="'+clip.targetId+'"]');
          if (!target) continue;
          if(reduced && motion.reduced==='fade'){if(fadedTargets.has(clip.targetId))continue;fadedTargets.add(clip.targetId);}
          if (reduced && motion.reduced === 'skip') { timeline.set(target,{[clip.property]:clip.to},0); continue; }
          const property = reduced ? 'opacity' : clip.property;
          timeline.fromTo(target,{[property]:reduced?0:clip.from},{[property]:reduced?1:clip.to,duration:reduced?Math.min(.15,clip.duration):clip.duration,ease:clip.ease,immediateRender:false},reduced?0:clip.start);
        }
        const play=()=>{if(!root.matches(':disabled'))timeline.restart();};
        const reverse=()=>timeline.reverse();
        const keydown=event=>{if(event.key===' '||event.key==='Enter')play();};
        const keyup=event=>{if(event.key===' '||event.key==='Enter')reverse();};
        const event=motion.trigger==='press'?'pointerdown':'pointerenter';
        if(motion.trigger==='entrance')timeline.play();
        else {root.addEventListener(event,play);root.addEventListener(motion.trigger==='press'?'pointerup':'pointerleave',reverse);}
        if(motion.trigger==='press'){root.addEventListener('keydown',keydown);root.addEventListener('keyup',keyup);}
        return ()=>{root.removeEventListener(event,play);root.removeEventListener(motion.trigger==='press'?'pointerup':'pointerleave',reverse);root.removeEventListener('keydown',keydown);root.removeEventListener('keyup',keyup);timeline.revert();};
      });
      document.addEventListener('astro:before-swap',()=>media.revert(),{once:true});
    });
  }
}
`;
}
