import { Link } from "@tanstack/react-router";
import { WEB3_LIVE, siteConfig } from "@/lib/config";
import { KickerArrow } from "@/components/site-frame";

const LINK = "ink-link";

// How to reach me, in the order people usually want them.
const CONTACTS = [
  { label: "Email", href: `mailto:${siteConfig.email}` },
  { label: "GitHub", href: siteConfig.links.github },
  { label: "LinkedIn", href: siteConfig.links.linkedin },
  { label: "X", href: siteConfig.links.twitter },
];

/* The masthead of the home page: my portrait in a registration frame, printed in blue duotone, and
 * my name in the poster face with the surname in pink. Then the same few lines as always. */
export default function Hero() {
  return (
    <section className="px-6 pt-12 pb-8 md:px-12 md:pt-16">
      <div className="grid items-end gap-8 sm:grid-cols-[auto_1fr] md:gap-12">
        <div className="reg w-40 sm:w-52 md:w-60">
          <img
            src="/images/me-face.jpg"
            alt="Dan Olekh"
            width={480}
            height={480}
            className="face aspect-square w-full object-cover"
            fetchPriority="high"
          />
        </div>
        <div>
          <div className="kicker">
            <span className="dot" />
            <KickerArrow />
            <span className="label">
              {WEB3_LIVE ? "Software engineer · TypeScript · EVM" : "Software engineer · Vienna"}
            </span>
          </div>
          <h1 className="display mt-4 text-[clamp(76px,15vw,184px)]">
            <span className="block">Dan</span>
            <span className="block text-signal mix-blend-multiply dark:mix-blend-normal">Olekh</span>
          </h1>
        </div>
      </div>

      <div className="mt-12 max-w-[42rem] space-y-3 text-lg leading-relaxed">
        {WEB3_LIVE ? (
          <>
            <p>
              I build products that hold money correctly: three years of TypeScript full-stack
              work, most recently the payment and ledger services of a multi-brand platform.
            </p>
            <p>
              Since September 2026 I build on EVM: a USDC milestone escrow on Base, a ledger-grade
              event indexer in Effect, and effect-viem.
            </p>
            <p>Contracts are verified, tests are public, write-ups are below.</p>
          </>
        ) : (
          <>
            <p>
              I'm an engineer who loves building fast, user-loved platforms. I love working with
              TypeScript and Zig.
            </p>
            <p>My goal is to build scalable products that look great and feel natural.</p>
          </>
        )}
        <p className="pt-2">
          Check out my{" "}
          <Link to="/feed" className={LINK}>
            feed
          </Link>{" "}
          for what I've been reading and thinking about, my{" "}
          <Link to="/b" className={LINK}>
            writing
          </Link>
          , or the{" "}
          <Link to="/lab" className={LINK}>
            lab
          </Link>
          , small interface things I build for products I like.
        </p>
        <p className="pt-2">
          Open to full-time or contract work, remote from Vienna. Here's my{" "}
          <Link to="/resume" className={LINK}>
            resume
          </Link>
          .
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 pt-1">
          {CONTACTS.map((c) => (
            <li key={c.label}>
              <a href={c.href} className={LINK}>
                {c.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
