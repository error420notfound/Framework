import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Plus, Trash2 } from "lucide-react";
import { useEditor } from "../../app/store";
import { componentForNode, descendants } from "../../domain/engine";
import { newId } from "../../domain/schema";
import { compileMotion, type MotionEntity } from "../../domain/motion";
import { createMotionTimeline } from "../preview/motion";
import { CommitInput } from "../controls/Fields";
import type { gsap } from "gsap";
export function MotionPanel() {
  const {
    doc,
    selectedId,
    componentId,
    command,
    themeId,
    densityId,
    variants,
    states,
    previewValues,
    viewport,
  } = useEditor();
  const selected = doc.entities[selectedId];
  const owner =
    selected?.kind === "composition"
      ? selected
      : selected?.kind === "instance"
        ? doc.entities[selected.componentId]
        : selected?.kind === "node"
          ? componentForNode(doc, selected.id)
          : doc.entities[componentId];
  const motions = Object.values(doc.entities).filter(
    (e): e is MotionEntity => e.kind === "motion" && e.ownerId === owner?.id,
  );
  const [motionId, setMotionId] = useState(""),
    [reduced, setReduced] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [progress, setProgress] = useState(0),
    [playing, setPlaying] = useState(false);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const motion = motions.find((e) => e.id === motionId) ?? motions[0];
  useEffect(() => {
    timeline.current?.revert();
    timeline.current = null;
    setProgress(0);
    setPlaying(false);
    return () => {
      timeline.current?.revert();
    };
  }, [
    doc,
    motion?.id,
    reduced,
    selectedId,
    themeId,
    densityId,
    variants,
    states,
    previewValues,
    viewport,
  ]);
  function ready() {
    if (timeline.current) return timeline.current;
    if (!motion) return null;
    const iframe = document.querySelector<HTMLIFrameElement>(
      'iframe[title="Composition preview"],iframe[title="Component preview"]',
    );
    if (!iframe?.contentDocument) return null;
    timeline.current = createMotionTimeline(
      doc,
      motion,
      iframe.contentDocument,
      reduced,
      (p) => {
        setProgress(p);
        if (p === 1) setPlaying(false);
      },
    );
    return timeline.current;
  }
  function add() {
    if (!owner || (owner.kind !== "component" && owner.kind !== "composition"))
      return;
    const id = newId("motion");
    const targetId =
      owner.kind === "component" ? owner.rootId : owner.instances[0];
    if (!targetId) return;
    const property = (["y", "opacity", "scale", "x", "rotation"] as const).find(
      (property) =>
        !motions.some((m) =>
          m.clips.some(
            (c) => c.targetId === targetId && c.property === property,
          ),
        ),
    );
    if (!property) {
      useEditor.setState({
        error:
          "All properties on this target already have motion owners. Add a clip to the existing timeline instead.",
      });
      return;
    }
    command(
      [
        {
          type: "create",
          entity: {
            id,
            name: "Entrance",
            kind: "motion",
            ownerId: owner.id,
            trigger: "entrance",
            reduced: "skip",
            clips: [
              {
                id: newId("clip"),
                targetId,
                property,
                from: 12,
                to: 0,
                start: 0,
                duration: {
                  value: { type: "duration", value: 300, unit: "ms" },
                },
                ease: "power2.out",
              },
            ],
          },
        },
      ],
      "Create motion",
    );
    setMotionId(id);
  }
  const update = (changes: Partial<MotionEntity>) =>
    motion &&
    command([{ type: "update", id: motion.id, changes }], "Edit motion");
  const targetIds =
    owner?.kind === "component"
      ? descendants(doc, owner.rootId)
      : owner?.kind === "composition"
        ? owner.instances
        : [];
  return (
    <div className="motion-panel">
      <div className="motion-toolbar">
        <select
          aria-label="Motion definition"
          value={motion?.id ?? ""}
          onChange={(e) => setMotionId(e.target.value)}
        >
          <option value="" disabled>
            Choose a motion
          </option>
          {motions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <button className="secondary" onClick={add}>
          <Plus size={13} />
          Add motion
        </button>
        {motion ? (
          <>
            <button
              className="icon-button"
              aria-label={playing ? "Pause motion" : "Play motion"}
              onClick={() => {
                const t = ready();
                if (playing) t?.pause();
                else if (progress === 1) t?.restart();
                else t?.play();
                setPlaying(!playing);
              }}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              className="icon-button"
              aria-label="Reset motion"
              onClick={() => {
                timeline.current?.revert();
                timeline.current = null;
                setProgress(0);
                setPlaying(false);
              }}
            >
              <RotateCcw size={15} />
            </button>
            <input
              type="range"
              aria-label="Motion playhead"
              min={0}
              max={1}
              step={0.01}
              value={progress}
              onChange={(e) => {
                ready()?.pause().progress(Number(e.target.value));
                setProgress(Number(e.target.value));
                setPlaying(false);
              }}
            />
            <code>{Math.round(progress * 100)}%</code>
            <label className="reduced-control">
              <input
                type="checkbox"
                checked={reduced}
                onChange={(e) => setReduced(e.target.checked)}
              />
              Reduced motion
            </label>
          </>
        ) : null}
      </div>
      {motion ? (
        <>
          <div className="motion-settings">
            <CommitInput
              label="Motion name"
              value={motion.name}
              onCommit={(name) => update({ name })}
            />
            <select
              aria-label="Motion trigger"
              value={motion.trigger}
              onChange={(e) =>
                update({ trigger: e.target.value as MotionEntity["trigger"] })
              }
            >
              <option value="entrance">Entrance</option>
              <option value="press">Press</option>
              <option value="hover">Hover</option>
            </select>
            <select
              aria-label="Reduced motion alternative"
              value={motion.reduced}
              onChange={(e) =>
                update({ reduced: e.target.value as "skip" | "fade" })
              }
            >
              <option value="skip">Reduced: skip movement</option>
              <option value="fade">Reduced: short fade</option>
            </select>
            <button
              className="text-link"
              onClick={() =>
                command([{ type: "delete", id: motion.id }], "Delete motion")
              }
            >
              Delete motion
            </button>
          </div>
          <div className="timeline-clips">
            {motion.clips.map((clip, index) => {
              const compiled = compileMotion(doc, motion).clips[index];
              const change = (patch: Partial<typeof clip>) =>
                update({
                  clips: motion.clips.map((c, i) =>
                    i === index ? { ...c, ...patch } : c,
                  ),
                });
              return (
                <div className="clip-row" key={clip.id}>
                  <select
                    aria-label={`Clip ${index + 1} target`}
                    value={clip.targetId}
                    onChange={(e) => change({ targetId: e.target.value })}
                  >
                    {targetIds.map((id) => (
                      <option key={id} value={id}>
                        {doc.entities[id]?.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={`Clip ${index + 1} property`}
                    value={clip.property}
                    onChange={(e) =>
                      change({ property: e.target.value as any })
                    }
                  >
                    {["opacity", "x", "y", "scale", "rotation"].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                  <CommitInput
                    type="number"
                    label={`Clip ${index + 1} from`}
                    value={clip.from}
                    onCommit={(s) => change({ from: Number(s) })}
                  />
                  <span>→</span>
                  <CommitInput
                    type="number"
                    label={`Clip ${index + 1} to`}
                    value={clip.to}
                    onCommit={(s) => change({ to: Number(s) })}
                  />
                  <CommitInput
                    type="number"
                    label={`Clip ${index + 1} start`}
                    value={clip.start}
                    onCommit={(s) => change({ start: Number(s) })}
                  />
                  <CommitInput
                    type="number"
                    label={`Clip ${index + 1} duration`}
                    value={compiled.duration}
                    onCommit={(s) =>
                      change({
                        duration: {
                          value: {
                            type: "duration",
                            value: Number(s),
                            unit: "s",
                          },
                        },
                      })
                    }
                  />
                  <div className="clip-track">
                    <span
                      style={{
                        left: `${(clip.start / 3) * 100}%`,
                        width: `${Math.max(3, (compiled.duration / 3) * 100)}%`,
                      }}
                    />
                  </div>
                  <select
                    aria-label={`Clip ${index + 1} duration token`}
                    value={"ref" in clip.duration ? clip.duration.ref : ""}
                    onChange={(e) =>
                      change({
                        duration: e.target.value
                          ? { ref: e.target.value }
                          : {
                              value: {
                                type: "duration",
                                value: compiled.duration,
                                unit: "s",
                              },
                            },
                      })
                    }
                  >
                    <option value="">Local duration</option>
                    {Object.values(doc.entities)
                      .filter(
                        (e) => e.kind === "token" && e.valueType === "duration",
                      )
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                  <select
                    aria-label={`Clip ${index + 1} easing`}
                    value={clip.ease}
                    onChange={(e) =>
                      change({ ease: e.target.value as typeof clip.ease })
                    }
                  >
                    {["none", "power1.out", "power2.out", "power2.inOut"].map(
                      (e) => (
                        <option key={e}>{e}</option>
                      ),
                    )}
                  </select>
                  <button
                    className="icon-button"
                    aria-label={`Remove clip ${index + 1}`}
                    onClick={() =>
                      update({
                        clips: motion.clips.filter((c) => c.id !== clip.id),
                      })
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            className="text-link"
            onClick={() =>
              update({
                clips: [
                  ...motion.clips,
                  {
                    id: newId("clip"),
                    targetId: targetIds[0],
                    property: "opacity",
                    from: 0,
                    to: 1,
                    start: 0.3,
                    duration: {
                      value: { type: "duration", value: 200, unit: "ms" },
                    },
                    ease: "power2.out",
                  },
                ],
              })
            }
          >
            <Plus size={13} />
            Add timeline clip
          </button>
        </>
      ) : (
        <p className="small muted">
          Select a component or composition and add a motion. Timing and named
          targets are saved with the library.
        </p>
      )}
    </div>
  );
}
