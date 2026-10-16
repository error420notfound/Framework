import { useRef } from "react";
import { useEditor } from "../../app/store";
export function PanelResize({ side }: { side: "browser" | "inspector" }) {
  const state = useEditor();
  const key = side === "browser" ? "browserWidth" : "inspectorWidth";
  const value = state[key],
    min = side === "browser" ? 160 : 280,
    max = side === "browser" ? 280 : 440;
  const drag = useRef<{ x: number; value: number } | null>(null);
  const change = (n: number) =>
    useEditor.setState({ [key]: Math.max(min, Math.min(max, n)) });
  return (
    <div
      role="separator"
      aria-label={"Resize " + side}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      className={"panel-resize resize-" + side}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, value };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current)
          change(
            drag.current.value +
              (e.clientX - drag.current.x) * (side === "browser" ? 1 : -1),
          );
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onKeyDown={(e) => {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          change(
            e.key === "Home"
              ? min
              : e.key === "End"
                ? max
                : value +
                  (e.key === "ArrowRight" ? 1 : -1) *
                    (side === "browser" ? 1 : -1) *
                    10,
          );
        }
      }}
    />
  );
}
