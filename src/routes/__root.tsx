import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import appCss from "../styles.css?url";
import { createMeta } from "@/lib/seo";
import { ThemeProvider, useTheme } from "next-themes";
import { CustomCursor } from "@/components/custom-cursor";
import { useHeavyEffectsAllowed } from "@/lib/use-heavy-effects";

// Lazy so three.js and postprocessing split into their own chunk. Statically imported they landed
// in the single entry bundle, which meant every visitor downloaded and parsed them — including the
// weak devices that now skip the effect, where that parse cost is itself a main source of jank.
const PixelBlast = lazy(() => import("@/components/pixel-blasts"));

export const Route = createRootRoute({
  head: () => {
    const seo = createMeta();
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        ...seo.meta,
      ],
      links: [{ rel: "stylesheet", href: appCss }, ...seo.links],
    };
  },

  component: RootComponent,
  shellComponent: RootDocument,
});

function RootComponent() {
  // Use `resolvedTheme` (not `theme`, which is "system" by default with enableSystem) and only mount
  // the WebGL background once the client knows the resolved theme. Keying on resolvedTheme remounts
  // PixelBlast on theme change so its deferred init paints the correct color (white on dark, blue on
  // light) instead of the stale value captured at first paint.
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Weak devices skip the WebGL background entirely: the wrapper below already paints
  // `bg-background`, so dropping it costs nothing visually and buys back the frame budget.
  const heavyEffectsAllowed = useHeavyEffectsAllowed();

  // Latched, so a device whose frame rate already proved too low doesn't get the effect handed
  // back on the next theme change (which remounts PixelBlast via its `key`).
  const [tooSlow, setTooSlow] = useState(false);
  const handleTooSlow = useCallback(() => setTooSlow(true), []);

  return (
    <div className="min-h-dvh flex flex-col items-center">
      <div className="fixed inset-0 -z-10 h-full w-full bg-background transition-colors duration-300">
        {mounted && heavyEffectsAllowed && !tooSlow && (
          <Suspense fallback={null}>
            <PixelBlast
              key={resolvedTheme ?? "light"}
              minFps={24}
              onTooSlow={handleTooSlow}
              variant="triangle"
              pixelSize={3}
              color={resolvedTheme === "dark" ? "#ffffff" : "blue"}
              pixelSizeJitter={0.35}
              patternScale={3.75}
              patternDensity={0.75}
              speed={2}
              edgeFade={0.2}
              enableRipples={true}
              liquid={false}
              rippleSpeed={0.15}
              rippleThickness={0.05}
              rippleIntensityScale={0.5}
            />
          </Suspense>
        )}
      </div>
      <main className="w-full relative flex justify-center">
        <div className="w-full max-w-6xl min-h-dvh overflow-x-clip bg-[linear-gradient(90deg,transparent_0%,#ffffffd9_15%,#ffffffd9_85%,transparent_100%)] dark:bg-[linear-gradient(90deg,transparent_0%,#0b0b0bd9_15%,#0b0b0bd9_85%,transparent_100%)]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider attribute={"class"} enableSystem disableTransitionOnChange>
          <CustomCursor />
          {children}
        </ThemeProvider>
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  );
}
