import { convertColor, srgbHex, type Color } from "../../domain/color";
import { cssValue, hexColor } from "../../domain/schema";
import { CommitInput, Field } from "./Fields";
function ColorNumber({
  label,
  value,
  scale = 1,
  digits = 4,
  validate,
  onChange,
}: {
  label: string;
  value: number;
  scale?: number;
  digits?: number;
  validate?: (n: number) => string;
  onChange: (n: number) => void;
}) {
  return (
    <Field label={label}>
      <CommitInput
        label={label}
        type="number"
        value={value * scale}
        displayValue={String(Number((value * scale).toFixed(digits)))}
        validate={(s) =>
          !s.trim() || !Number.isFinite(Number(s))
            ? "Enter a finite number."
            : (validate?.(Number(s) / scale) ?? "")
        }
        onCommit={(s) => {
          const n = Number(s) / scale;
          if (n !== value) onChange(n);
        }}
      />
    </Field>
  );
}
export function ColorEditor({
  value,
  onChange,
}: {
  value: Color;
  onChange: (c: Color) => void;
}) {
  const hex = srgbHex(value);
  const names =
    value.space === "oklch"
      ? ["L (0–1)", "C (≥ 0)", "H (0–360°)"]
      : value.space === "srgb"
        ? ["R (0–255)", "G (0–255)", "B (0–255)"]
        : ["R (0–1)", "G (0–1)", "B (0–1)"];
  return (
    <div className="value-editor">
      <div className="color-line">
        <span
          className="swatch large"
          aria-label="Colour swatch"
          style={{ background: cssValue(value) }}
        />
        {hex ? (
          <CommitInput
            label="Colour hex"
            value={hex}
            validate={(s) =>
              /^#[0-9a-f]{6}$/i.test(s)
                ? ""
                : "Use six hexadecimal digits, such as #2563EB."
            }
            onCommit={(s) => {
              if (/^#[0-9a-f]{6}$/i.test(s)) {
                onChange(
                  convertColor(
                    { ...hexColor(s), alpha: value.alpha } as Color,
                    value.space,
                  ),
                );
              }
            }}
          />
        ) : (
          <span className="small muted">Outside sRGB gamut</span>
        )}
      </div>
      <Field label="Colour space">
        <select
          aria-label="Colour space"
          value={value.space}
          onChange={(e) =>
            onChange(convertColor(value, e.target.value as Color["space"]))
          }
        >
          <option value="srgb">sRGB</option>
          <option value="oklch">OKLCH</option>
          <option value="display-p3">Display P3</option>
        </select>
      </Field>
      <div className="channels">
        {value.channels.map((n, i) => (
          <ColorNumber
            key={value.space + i}
            label={names[i]}
            value={n}
            scale={value.space === "srgb" ? 255 : 1}
            validate={
              value.space === "oklch"
                ? (x) =>
                    i === 0 && (x < 0 || x > 1)
                      ? "Lightness must be from 0 to 1."
                      : i === 1 && x < 0
                        ? "Chroma must be zero or greater."
                        : i === 2 && (x < 0 || x > 360)
                          ? "Hue must be from 0 to 360 degrees."
                          : ""
                : undefined
            }
            onChange={(n) => {
              const channels = [...value.channels] as Color["channels"];
              channels[i] = n;
              onChange({ ...value, channels });
            }}
          />
        ))}
      </div>
      <ColorNumber
        label="Alpha (0–1)"
        value={value.alpha}
        validate={(n) => (n < 0 || n > 1 ? "Alpha must be from 0 to 1." : "")}
        onChange={(alpha) => onChange({ ...value, alpha })}
      />
      <p className="small muted">
        {value.space === "oklch"
          ? "L is lightness; C is chroma; H is hue in degrees."
          : "RGB ranges describe the display gamut. Extended channel values are preserved during conversion."}{" "}
        Conversion preserves colour and alpha; it does not reinterpret channels.
      </p>
      {!hex ? (
        <p className="small gamut-note">
          An sRGB hex value cannot represent this colour. Source channels remain
          intact; the swatch depends on your display’s gamut.
        </p>
      ) : (
        <p className="small muted">
          Hex is an 8-bit sRGB representation; editing hex changes RGB
          precision.
        </p>
      )}
      <details>
        <summary>Resolved CSS and precision</summary>
        <code className="color-css">{cssValue(value)}</code>
        <p className="small muted">
          Fields show up to 4 decimal places. CSS details show full stored
          precision. Saving and export retain stored precision.
        </p>
      </details>
    </div>
  );
}
