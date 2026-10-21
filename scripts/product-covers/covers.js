// The case-study covers for the home grid and the case-study heroes: each product's real pages,
// captured from the live sites, in a laptop and a phone (and for SportMagaz, its admin panel in a
// window behind). Boxes are in cover pixels (1600×900); a screen's y/x/w are in its capture's pixels.
// glow is the product's own accent, per theme, very faint.

export const COVERS = {
  "oasi-kadir": {
    glow: { light: "rgb(233 190 108 / 0.42)", dark: "rgb(233 190 108 / 0.16)" },
    laptop: { box: { left: 200, top: 150, width: 1000 }, screen: { src: "oasi-home-desktop.jpg" } },
    phone: { box: { left: 1130, top: 262, width: 270 }, screen: { src: "oasi-events-mobile.jpg" } },
  },
  consolline: {
    glow: { light: "rgb(184 240 58 / 0.34)", dark: "rgb(184 240 58 / 0.12)" },
    laptop: { box: { left: 200, top: 150, width: 1000 }, screen: { src: "cl-home-desktop.jpg" } },
    phone: { box: { left: 1130, top: 262, width: 270 }, screen: { src: "cl-route-mobile.jpg" } },
  },
  sportmagaz: {
    // The shop on the laptop and the phone; its admin panel, built alongside it, stands behind.
    glow: { light: "rgb(255 210 0 / 0.36)", dark: "rgb(255 210 0 / 0.12)" },
    window: { box: { left: 760, top: 70, width: 700 }, screen: { src: "sm-admin-editor.jpg" } },
    laptop: { box: { left: 150, top: 190, width: 960 }, screen: { src: "sm-category-desktop.jpg" } },
    phone: { box: { left: 1120, top: 300, width: 250 }, screen: { src: "sm-product-mobile.jpg" } },
  },
}
