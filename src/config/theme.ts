export const themeConfig = {
  storageKey: "shuleos-theme",
  defaultTheme: "system",
  themes: ["light", "dark", "system"] as const,
  brandingVariables: ["--school-primary", "--school-primary-dark"] as const,
};

export type ShuleOSTheme = (typeof themeConfig.themes)[number];
