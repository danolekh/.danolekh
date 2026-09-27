import { createRoot } from "react-dom/client";

import { Showreel } from "./Showreel";

// oxlint-disable-next-line no-unassigned-import -- the stage's styles
import "./showreel.css";

createRoot(document.getElementById("root")!).render(<Showreel />);

// The soundtrack, for finish.ts to render offline through Playwright.
void import("./audio").then(({ renderWav }) => {
  (window as unknown as { __renderWav: typeof renderWav }).__renderWav = renderWav;
});
