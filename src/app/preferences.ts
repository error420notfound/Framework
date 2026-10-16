export const panelDefaults = {
  panelOpen: false,
  bottom: "Dependencies" as "Dependencies" | "Validation" | "Motion",
  browserWidth: 190,
  inspectorWidth: 320,
  leftCollapsed: false,
  rightCollapsed: false,
  anatomyCollapsed: false,
};
export function readPanelPreferences() {
  try {
    const p = JSON.parse(localStorage.getItem("formwork.panels.v1") ?? "{}");
    return {
      ...panelDefaults,
      panelOpen: typeof p.panelOpen === "boolean" ? p.panelOpen : false,
      bottom: ["Dependencies", "Validation", "Motion"].includes(p.bottom)
        ? p.bottom
        : "Dependencies",
      browserWidth: Math.max(160, Math.min(280, Number(p.browserWidth) || 190)),
      inspectorWidth: Math.max(
        280,
        Math.min(440, Number(p.inspectorWidth) || 320),
      ),
      leftCollapsed: p.leftCollapsed === true,
      rightCollapsed: p.rightCollapsed === true,
      anatomyCollapsed: p.anatomyCollapsed === true,
    };
  } catch {
    return panelDefaults;
  }
}
