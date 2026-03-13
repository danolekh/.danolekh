import { Badge } from "@/components/ui/badge";
import { IconPaw } from "@tabler/icons-react";
import { useTheme } from "next-themes";

const SVGL = "https://svgl.app/library";

interface Skill {
  name: string;
  icon:
    | string
    | { light: string; dark: string }
    | { type: "component" };
}

const skills: Skill[] = [
  { name: "TypeScript", icon: `${SVGL}/typescript.svg` },
  { name: "React", icon: { light: `${SVGL}/react_light.svg`, dark: `${SVGL}/react_dark.svg` } },
  { name: "Next.js", icon: `${SVGL}/nextjs_icon_dark.svg` },
  { name: "TanStack", icon: `${SVGL}/tanstack.svg` },
  { name: "Node.js", icon: `${SVGL}/nodejs.svg` },
  { name: "Bun", icon: `${SVGL}/bun.svg` },
  { name: "PostgreSQL", icon: `${SVGL}/postgresql.svg` },
  { name: "SQLite", icon: `${SVGL}/sqlite.svg` },
  { name: "Drizzle ORM", icon: { light: `${SVGL}/drizzle-orm_light.svg`, dark: `${SVGL}/drizzle-orm_dark.svg` } },
  { name: "Zustand", icon: { type: "component" } },
  { name: "Radix UI", icon: { light: `${SVGL}/radix-ui_light.svg`, dark: `${SVGL}/radix-ui_dark.svg` } },
  { name: "Zig", icon: `${SVGL}/zig.svg` },
  { name: "Python", icon: `${SVGL}/python.svg` },
];

export default function Skills() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  function getIconSrc(icon: Skill["icon"]): string | null {
    if (typeof icon === "string") return icon;
    if ("light" in icon) return isDark ? icon.dark : icon.light;
    return null;
  }

  return (
    <section className="py-8 px-6 md:px-12">
      <div className="max-w-208 mx-auto">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => {
            const src = getIconSrc(skill.icon);
            return (
              <Badge key={skill.name} variant="secondary" className="gap-1.5 px-2.5 py-1 text-sm h-auto">
                {src ? (
                  <img src={src} alt={skill.name} className="size-4" />
                ) : (
                  <IconPaw className="size-4" />
                )}
                {skill.name}
              </Badge>
            );
          })}
        </div>
      </div>
    </section>
  );
}
