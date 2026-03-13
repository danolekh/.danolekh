import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import appCss from "../styles.css?url";
import { createMeta } from "@/lib/seo";
import { ThemeProvider, useTheme } from "next-themes";
import PixelBlast from "@/components/pixel-blasts";

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
  const { theme } = useTheme();

  return (
    <div className="min-h-dvh flex flex-col items-center">
      <div className="fixed inset-0 -z-10 h-full w-full bg-background transition-colors duration-300">
        <PixelBlast
          variant="triangle"
          pixelSize={3}
          color={theme === "dark" ? "#ffffff" : "blue"}
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
      </div>
      <main className="w-full relative flex justify-center">
        <div className="w-full max-w-6xl min-h-dvh overflow-hidden bg-[linear-gradient(90deg,transparent_0%,#ffffffd9_15%,#ffffffd9_85%,transparent_100%)] dark:bg-[linear-gradient(90deg,transparent_0%,#0b0b0bd9_15%,#0b0b0bd9_85%,transparent_100%)]">
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
