import { useEffect, useState } from "react";
import type { Entity } from "../../domain/schema";
import { useEditor } from "../../app/store";
export function FontStatus({
  source,
}: {
  source: Extract<Entity, { kind: "source" }>;
}) {
  const doc = useEditor((s) => s.doc);
  const [status, setStatus] = useState("System fallback ready");
  const a = source.assetId ? doc.entities[source.assetId] : undefined;
  useEffect(() => {
    let current = true;
    if (a?.kind !== "asset") {
      setStatus(
        source.stylesheet
          ? "Remote stylesheet registered · include explicitly in consumer"
          : "System fallback ready",
      );
      return;
    }
    setStatus("Loading font file…");
    const font = new FontFace(
      "Formwork source check",
      `url(data:${a.mediaType};base64,${a.data})`,
    );
    font
      .load()
      .then(() => {
        if (current) setStatus("Font file ready");
      })
      .catch(() => {
        if (current)
          setStatus("Font file failed to load · fallback will be used");
      });
    return () => {
      current = false;
    };
  }, [a, source.stylesheet]);
  return (
    <p className="font-status small" role="status">
      {status}
    </p>
  );
}
