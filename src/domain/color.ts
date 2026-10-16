import type { DesignValue } from "./schema";
export type Color = Extract<DesignValue, { type: "color" }>;
type V = [number, number, number];
type M = [V, V, V];
const mul = (m: M, v: V): V =>
  m.map((row) => row.reduce((n, x, i) => n + x * v[i], 0)) as V;
function inverse(m: M): M {
  const [[a, b, c], [d, e, f], [g, h, i]] = m,
    det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  return [
    [e * i - f * h, c * h - b * i, b * f - c * e],
    [f * g - d * i, a * i - c * g, c * d - a * f],
    [d * h - e * g, b * g - a * h, a * e - b * d],
  ].map((r) => r.map((x) => x / det)) as M;
}
// D65 matrices and extended-range transfer curves, CSS Color 4 section 19.
// https://www.w3.org/TR/css-color-4/#color-conversion-code
const rgb: M = [
  [506752 / 1228815, 87881 / 245763, 12673 / 70218],
  [87098 / 409605, 175762 / 245763, 12673 / 175545],
  [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
];
const p3: M = [
  [608311 / 1250200, 189793 / 714400, 198249 / 1000160],
  [35783 / 156275, 247089 / 357200, 198249 / 2500400],
  [0, 32229 / 714400, 5220557 / 5000800],
];
const lms: M = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
];
const lab: M = [
  [0.2104542553, 0.793617785, -0.0040720468],
  [1.9779984951, -2.428592205, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.808675766],
];
const invRGB = inverse(rgb),
  invP3 = inverse(p3),
  invLMS = inverse(lms),
  invLab = inverse(lab);
const decode = (v: number) =>
  Math.abs(v) <= 0.04045
    ? v / 12.92
    : Math.sign(v) * Math.pow((Math.abs(v) + 0.055) / 1.055, 2.4);
const encode = (v: number) =>
  Math.abs(v) <= 0.0031308
    ? 12.92 * v
    : Math.sign(v) * (1.055 * Math.pow(Math.abs(v), 1 / 2.4) - 0.055);
export function convertColor(color: Color, space: Color["space"]): Color {
  if (color.space === space) return structuredClone(color);
  let linear: V;
  if (color.space === "oklch") {
    const [L, C, H] = color.channels,
      h = (H * Math.PI) / 180;
    const roots = mul(invLab, [L, C * Math.cos(h), C * Math.sin(h)]);
    linear = mul(invLMS, roots.map((x) => x * x * x) as V);
  } else {
    const channels = color.channels.map(decode) as V;
    linear = color.space === "srgb" ? channels : mul(invRGB, mul(p3, channels));
  }
  let channels: V;
  if (space === "oklch") {
    const [L, a, b] = mul(lab, mul(lms, linear).map(Math.cbrt) as V);
    const C = Math.hypot(a, b);
    channels = [
      L,
      C,
      C < 1e-7 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
    ];
  } else
    channels = (space === "srgb" ? linear : mul(invP3, mul(rgb, linear))).map(
      encode,
    ) as V;
  return { ...color, space, channels };
}
export function srgbHex(color: Color): string | undefined {
  const rgb = convertColor(color, "srgb");
  if (rgb.channels.some((n) => n < -1e-6 || n > 1 + 1e-6)) return undefined;
  return (
    "#" +
    rgb.channels
      .map((n) =>
        Math.round(Math.max(0, Math.min(1, n)) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
      .toUpperCase()
  );
}
