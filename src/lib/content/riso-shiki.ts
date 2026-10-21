import type { ThemeRegistration } from "shiki";

/* Code in the site's two inks. Pink stays out of code text (too faint at code size on paper), so
 * blue carries the code and plum, the blue-over-pink overprint, marks keywords, tags and strings.
 * The night theme flips it: paper ink on plum, with pink allowed because it reads on the dark. */

export const risoLight: ThemeRegistration = {
  name: "riso",
  type: "light",
  colors: { "editor.background": "#eaebdc", "editor.foreground": "#2d4b8f" },
  tokenColors: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#2d4b8fa8", fontStyle: "italic" } },
    { scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.operator.new", "keyword.control"], settings: { foreground: "#231547", fontStyle: "bold" } },
    { scope: ["entity.name.tag", "support.class.component", "entity.name.type", "support.type"], settings: { foreground: "#231547", fontStyle: "bold" } },
    { scope: ["string", "string.quoted", "string.template", "constant.numeric", "constant.language"], settings: { foreground: "#231547" } },
    { scope: ["entity.other.attribute-name"], settings: { foreground: "#2d4b8f", fontStyle: "italic" } },
    { scope: ["punctuation", "meta.brace", "punctuation.definition.tag"], settings: { foreground: "#2d4b8fb8" } },
  ],
};

export const risoNight: ThemeRegistration = {
  name: "riso-night",
  type: "dark",
  colors: { "editor.background": "#2e2059", "editor.foreground": "#eaebdc" },
  tokenColors: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#eaebdc99", fontStyle: "italic" } },
    { scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.operator.new", "keyword.control"], settings: { foreground: "#e0739f", fontStyle: "bold" } },
    { scope: ["entity.name.tag", "support.class.component", "entity.name.type", "support.type"], settings: { foreground: "#e0739f", fontStyle: "bold" } },
    { scope: ["string", "string.quoted", "string.template", "constant.numeric", "constant.language"], settings: { foreground: "#f2c6d6" } },
    { scope: ["entity.other.attribute-name"], settings: { foreground: "#eaebdc", fontStyle: "italic" } },
    { scope: ["punctuation", "meta.brace", "punctuation.definition.tag"], settings: { foreground: "#eaebdcb0" } },
  ],
};

export const RISO_THEMES = { light: "riso", dark: "riso-night" } as const;
