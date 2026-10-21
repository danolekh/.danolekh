import { WEB3_LIVE } from "@/lib/config";
import { SectionHead } from "@/components/site-frame";

/* What I work with, as type on paper: no logos, since their colours would print as a third, fourth
 * and fifth ink. */
const skills = [
  "TypeScript",
  "React",
  "Next.js",
  "TanStack",
  "Node.js",
  "Bun",
  "PostgreSQL",
  "SQLite",
  "Drizzle ORM",
  "Zustand",
  "Radix UI",
  "Zig",
  "Python",
];

// EVM skills, appended once WEB3_LIVE flips.
const web3Skills = ["Solidity", "Foundry", "viem", "wagmi", "Base"];

const visibleSkills = WEB3_LIVE ? [...skills, ...web3Skills] : skills;

export default function Skills() {
  return (
    <section className="px-6 py-10 md:px-12">
      <SectionHead label="Tools" note={String(visibleSkills.length).padStart(2, "0")} />
      <ul className="flex flex-wrap gap-2.5">
        {visibleSkills.map((skill) => (
          <li
            key={skill}
            className="label border-[1.5px] border-current px-3 py-2 text-[12px] hover:border-signal hover:bg-signal hover:text-paper"
          >
            {skill}
          </li>
        ))}
      </ul>
    </section>
  );
}
