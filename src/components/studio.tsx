import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link } from "@tanstack/react-router";
import { Accordion } from "@base-ui/react/accordion";
import { motion, useAnimationFrame, useMotionValue, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import "@fontsource-variable/geist";
import "@fontsource-variable/inter-tight";
import { ClientGlobe } from "@/components/client-globe";
import { HowStage, STEP_ENDS, type Step } from "@/components/how-stage";
import { ServiceTiles } from "@/components/service-tiles";
import { WorkGallery } from "@/components/work-gallery";

// The page buyers see: what I build, the proof, how it runs, what it costs. One action everywhere.

const CAL = "https://cal.com/danolekh";

const TOP_ROW_CENTER = 620;
const NARROW_GALLERY_HEIGHT = 300;

// Section entrances play once per page load; navigating away and back shows them at rest.
const seen = new Set<string>();

function Reveal({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen.has(id) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen stays as it is; only what's still below the fold waits for its turn.
    if (el.getBoundingClientRect().top < innerHeight) {
      seen.add(id);
      return;
    }
    el.style.opacity = "0";
    el.style.transform = "translateY(32px)";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        seen.add(id);
        el.style.transition = "opacity 700ms cubic-bezier(0.22,1,0.36,1), transform 700ms cubic-bezier(0.22,1,0.36,1)";
        el.style.opacity = "1";
        el.style.transform = "none";
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function BookCall({ label = "Book a call", size = "lg", invert }: { label?: string; size?: "sm" | "lg"; invert?: boolean }) {
  const big = size === "lg";
  return (
    <a
      href={CAL}
      target="_blank"
      rel="noopener"
      className={`pointer-events-auto inline-flex items-center rounded-full font-semibold transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 active:translate-y-px ${
        big ? "h-14 gap-3 pr-6 pl-2 text-base" : "h-10 gap-2 pr-4 pl-1 text-sm"
      } ${invert ? "bg-white text-neutral-900 hover:bg-neutral-200" : "bg-neutral-900 text-white hover:bg-neutral-700"}`}
    >
      <img
        src="/images/me.jpeg"
        alt=""
        width={big ? 40 : 32}
        height={big ? 40 : 32}
        className={`rounded-full object-cover ${big ? "size-10" : "size-8"}`}
      />
      {label}
    </a>
  );
}

function Nav() {
  return (
    <nav className="fixed inset-x-0 top-4 z-40 flex justify-center px-4" aria-label="Main">
      <div className="flex items-center gap-1 rounded-full bg-white/75 p-1 pl-5 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        <a href="#top" className="mr-4 text-sm font-semibold tracking-tight">
          Dan Olekh
        </a>
        {[
          ["Work", "#work"],
          ["How", "#how"],
          ["Pricing", "#pricing"],
        ].map(([label, href]) => (
          <a
            key={href}
            href={href}
            className="hidden rounded-full px-3 py-2 text-sm text-neutral-600 transition-colors duration-300 hover:text-neutral-900 min-[700px]:block"
          >
            {label}
          </a>
        ))}
        <span className="ml-2">
          <BookCall size="sm" />
        </span>
      </div>
    </nav>
  );
}

// Client work and open source I can point to: Oasi Kadir, SportMagaz, Consolline, Quextro, Azulejo,
// Lean Travel, U-Dak, cardstock, milestone-escrow, Gidropodbor.
const PRODUCTS_SHIPPED = 10;

function Hero() {
  return (
    <div className="relative min-[700px]:has-[canvas]:h-(--gallery-height)" id="top">
      <header className="pointer-events-none relative z-10 mx-auto max-w-170 px-6 pt-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-balance min-[700px]:text-5xl">
          Your website or web app, designed, built and live in weeks.
        </h1>
        <p className="mt-6 text-lg text-pretty text-neutral-600">
          I'm Dan, an engineer in Vienna. You talk to me and I build it. Often you'll see a working
          version of your site before you pay.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <BookCall />
          <p className="flex items-center gap-3 text-sm font-medium text-neutral-600">
            {PRODUCTS_SHIPPED} products shipped
            <span role="img" aria-label="Rated 5.0 on Upwork" className="flex gap-0.5 text-neutral-900">
              {[0, 1, 2, 3, 4].map((i) => (
                <svg key={i} viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden="true">
                  <path d="M10 1.6l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 15l-5.2 2.8 1-5.9L1.5 7.8l5.9-.8z" />
                </svg>
              ))}
            </span>
          </p>
        </div>
      </header>
      <WorkGallery topRowCenter={TOP_ROW_CENTER} narrowHeight={NARROW_GALLERY_HEIGHT} />
    </div>
  );
}

const LOGOS = [
  { name: "Oasi Kadir", src: "/clients/logos/oasi-kadir.webp" },
  { name: "Consolline", src: "/clients/logos/consolline.webp" },
  { name: "SportMagaz", src: "/clients/logos/sportmagaz.webp" },
  { name: "Lean Travel Management", src: "/clients/logos/lean-travel.webp" },
  { name: "U-Dak Dakdekkers", src: "/clients/logos/u-dak.webp" },
];

/** Who I've built for, in one grey, drifting past. The second copy is what makes the loop seamless. */
function ClientLogos() {
  return (
    <section aria-label="Clients" className="logo-rail mx-auto max-w-6xl overflow-hidden pb-16 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
      <style>{`
        @keyframes logo-rail { to { transform: translateX(-50%) } }
        .logo-rail ul { animation: logo-rail 36s linear infinite; }
        .logo-rail:hover ul { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .logo-rail ul { animation: none; } }
      `}</style>
      <ul className="flex w-max items-center">
        {[0, 1, 2, 3].map((copy) =>
          LOGOS.map((logo) => (
            <li key={`${copy}-${logo.name}`} aria-hidden={copy > 0 || undefined} className="shrink-0 px-10">
              <img src={logo.src} alt={copy > 0 ? "" : logo.name} loading="lazy" className="h-8 w-auto max-w-[190px] object-contain opacity-50 brightness-0" />
            </li>
          )),
        )}
      </ul>
    </section>
  );
}

const PROOF = [
  { value: "69 → 99", label: "Mobile PageSpeed score", who: "Oasi Kadir", project: "oasi-kadir" },
  { value: "16 s → under 2 s", label: "Page load on a phone", who: "Oasi Kadir", project: "oasi-kadir" },
  { value: "2,000+", label: "Products in a custom admin panel", who: "SportMagaz", project: "sportmagaz" },
  { value: "4 languages", label: "148 pages, built on my own", who: "Consolline", project: "consolline" },
] as const;

function Proof() {
  return (
    <section aria-label="Results" className="mx-auto max-w-6xl px-6 pt-12 pb-24 min-[700px]:pt-0">
      <Reveal id="proof" className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
        {PROOF.map((p) => (
          <Link key={p.label} to="/p/$project" params={{ project: p.project }} className="group block">
            <p className="text-3xl font-semibold tracking-tight">{p.value}</p>
            <p className="mt-2 text-sm text-neutral-600">{p.label}</p>
            <p className="mt-1 text-sm text-neutral-500 transition-colors duration-300 group-hover:text-neutral-900">{p.who}</p>
          </Link>
        ))}
      </Reveal>
    </section>
  );
}

const TAGLINE = "See your site working first. Then own every line of it.";

function Tagline() {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = TAGLINE.split(" ");
  const [lit, setLit] = useState(words.length);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let shown = -1;
    let goal = 0;
    let last = 0;
    // However hard the page is flung, the words light up one after another, never all at once.
    const WORDS_PER_SECOND = 28;
    const step = (now: number) => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Starts when the text enters the lower part of the screen, done by the time it's mid screen.
      const p = (innerHeight * 0.85 - r.top) / (innerHeight * 0.45);
      goal = Math.max(0, Math.min(words.length, p * words.length));
      const offScreen = r.bottom < 0 || r.top > innerHeight;
      if (shown < 0 || offScreen) shown = goal;
      else {
        const room = (WORDS_PER_SECOND * Math.min(now - last, 50)) / 1000;
        shown += Math.max(-room, Math.min(room, goal - shown));
      }
      last = now;
      setLit(Math.round(shown));
      if (Math.abs(goal - shown) > 0.01) raf = requestAnimationFrame(step);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    step(performance.now());
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, [words.length]);
  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <p ref={ref} className="text-4xl font-semibold tracking-tight text-balance min-[700px]:text-6xl">
        {words.map((w, i) => (
          <span
            key={i}
            className="transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ opacity: i < lit ? 1 : 0.5 }}
          >
            {w}{" "}
          </span>
        ))}
      </p>
    </section>
  );
}

function Services() {
  return (
    <section aria-labelledby="services" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <Reveal id="services">
        <h2 id="services" className="max-w-2xl text-4xl font-semibold tracking-tight text-balance">
          If it runs on the web, I can build it.
        </h2>
        <ServiceTiles />
      </Reveal>
    </section>
  );
}

const STEPS = [
  { name: "Talk", text: "A call about your business and what's slowing it down. You don't need a requirements document." },
  {
    name: "See it",
    text: "When the project is clear enough, I design it with your own content. You see it, comment on it and change it before you pay.",
  },
  {
    name: "Build and ship",
    text: "The design becomes the real site, in milestones at a fixed price, each one approved before you pay. Then it goes live on your accounts, documented, with two weeks of fixes included.",
  },
];

// The film may run through the whole section no faster than this, however hard the page is flung: a share
// of the section per second. Slow scrolling never reaches it, so normal reading stays tied to the scrollbar.
const FILM_MAX_SPEED = 0.42;
const FILM_SMOOTH_TIME = 0.16;

/** Follows a scroll progress with weight and a speed limit. Out of view there's nothing to watch, so it just jumps. */
function useCappedProgress(target: MotionValue<number>, section: RefObject<HTMLElement | null>) {
  const out = useMotionValue(target.get());
  const velocity = useRef(0);
  const inView = useRef(false);
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      inView.current = entry?.isIntersecting ?? false;
    });
    io.observe(el);
    return () => io.disconnect();
  }, [section]);
  useAnimationFrame((_, delta) => {
    const goal = target.get();
    const current = out.get();
    if (!inView.current || reduced.current) {
      velocity.current = 0;
      if (current !== goal) out.set(goal);
      return;
    }
    if (Math.abs(goal - current) < 0.00005 && Math.abs(velocity.current) < 0.0005) {
      velocity.current = 0;
      if (current !== goal) out.set(goal);
      return;
    }
    // A critically damped follower with a top speed, so a flick starts and ends softly too.
    const dt = Math.min(delta / 1000, 0.05);
    const omega = 2 / FILM_SMOOTH_TIME;
    const x = omega * dt;
    const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const limit = FILM_MAX_SPEED * FILM_SMOOTH_TIME;
    const change = Math.max(-limit, Math.min(limit, current - goal));
    const held = current - change;
    const temp = (velocity.current + omega * change) * dt;
    velocity.current = (velocity.current - omega * temp) * decay;
    let next = held + (change + temp) * decay;
    if (goal - current > 0 === next > goal) {
      next = goal;
      velocity.current = 0;
    }
    out.set(next);
  });
  return out;
}

function StepBar({ scroll, from, to }: { scroll: MotionValue<number>; from: number; to: number }) {
  const scaleX = useTransform(scroll, [from, to], [0, 1]);
  return (
    <span className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-900/15">
      <motion.span className="block h-full origin-left bg-neutral-900" style={{ scaleX }} />
    </span>
  );
}

/** The page scrolls, the stage stays, and the scrollbar plays the story. Phones get the stage pinned above the text. */
function How() {
  const steps = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: steps, offset: ["start 62%", "end 85%"] });
  const section = useRef<HTMLElement>(null);
  const scroll = useCappedProgress(scrollYProgress, section);
  const [active, setActive] = useState<Step>(0);
  useMotionValueEvent(scroll, "change", (p) => {
    setActive(p < STEP_ENDS[0] ? 0 : p < STEP_ENDS[1] ? 1 : 2);
  });
  return (
    <section ref={section} id="how" className="scroll-mt-16 py-24">
      <div className="mx-auto grid max-w-[1320px] gap-x-12 px-6 min-[900px]:grid-cols-[1fr_2fr]">
        <div className="min-[900px]:col-start-1">
          <h2 className="max-w-md text-4xl font-semibold tracking-tight text-balance">From a conversation to working software.</h2>
        </div>
        <div className="sticky top-16 z-10 -mx-6 mt-8 bg-white/90 px-6 py-4 backdrop-blur-md min-[900px]:top-[max(5.5rem,calc(50vh-22rem))] min-[900px]:col-start-2 min-[900px]:row-span-2 min-[900px]:row-start-1 min-[900px]:mx-0 min-[900px]:mt-0 min-[900px]:self-start min-[900px]:bg-transparent min-[900px]:p-0 min-[900px]:backdrop-blur-none">
          <HowStage scroll={scroll} />
          <div className="mt-4 flex gap-2" aria-hidden="true">
            {STEPS.map((s, i) => (
              <StepBar key={s.name} scroll={scroll} from={i === 0 ? 0 : STEP_ENDS[i - 1]!} to={STEP_ENDS[i]!} />
            ))}
          </div>
        </div>
        <ol ref={steps} className="min-[900px]:col-start-1 min-[900px]:row-start-2">
          {STEPS.map((s, i) => (
            <li key={s.name} data-step={i} className={`flex min-h-[90vh] flex-col min-[900px]:min-h-[110vh] justify-center py-8 transition-opacity duration-300 ${active === i ? "opacity-100" : "opacity-80"}`}>
              <p className="text-sm text-neutral-500">{i + 1}</p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight">{s.name}</h3>
              <p className="mt-3 max-w-md text-lg text-pretty text-neutral-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const CLIENTS = [
  {
    name: "Ashraf Salem",
    role: "Oasi Kadir",
    source: "5.0 review on Upwork",
    quote:
      "What impressed me most is that he kept finding and fixing problems I didn't even know we had, like hosting compliance issues and DNS conflicts during the migration, and he always came with the solution already worked out and clearly explained. [...] He treated the project like it was his own.",
    avatar: "/clients/ashraf.jpg",
    project: "oasi-kadir",
    place: "Rome, Italy",
    lat: 41.98,
    lon: 12.55,
  },
  {
    name: "Jan-Arie den Hertog",
    role: "Owner, Lean Travel Management",
    source: "By email",
    quote: "I have to start with the remark that I am impressed on what you have built so far. Excellent work!",
    avatar: "/clients/jan-arie.jpg",
    place: "Hardinxveld-Giessendam, Netherlands",
    lat: 51.83,
    lon: 4.84,
    dx: -21,
    dy: -10,
  },
  {
    name: "Richard Noya",
    role: "U-Dak Dakdekkers",
    source: "Upwork message",
    quote: "We've reviewed the site and we're happy with it. Thanks for the good work!",
    avatar: "/clients/u-dak.svg",
    place: "Utrecht, Netherlands",
    lat: 52.09,
    lon: 5.12,
    dx: 21,
    dy: -10,
  },
  {
    name: "Oleksii",
    role: "Owner, SportMagaz",
    source: "Translated from Ukrainian",
    quote: "You're the best! [...] Very grateful!",
    avatar: "/clients/oleksii.jpg",
    project: "sportmagaz",
    place: "Kyiv, Ukraine",
    lat: 50.45,
    lon: 30.52,
  },
];

/** Comments on one side, the world on the other: pointing at a comment turns the globe to whoever wrote it. */
function Clients() {
  const [active, setActive] = useState<number | null>(null);
  const list = useRef<HTMLUListElement>(null);

  // Phones get one comment at a time under the globe; swiping to the next one turns it.
  useEffect(() => {
    const el = list.current;
    if (!el || matchMedia("(min-width: 900px)").matches) return;
    setActive(0);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.client));
        }
      },
      { root: el, threshold: 0.7 },
    );
    el.querySelectorAll("[data-client]").forEach((card) => io.observe(card));
    return () => io.disconnect();
  }, []);

  return (
    <section aria-labelledby="clients" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <Reveal id="clients">
        <div className="grid gap-x-12 min-[900px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] min-[900px]:items-center">
          <div>
            <h2 id="clients" className="text-4xl font-semibold tracking-tight text-balance">
              In their own words.
            </h2>
            <div className="mx-auto mt-6 max-w-md [&>div]:aspect-square min-[900px]:max-w-none">
              <ClientGlobe pins={CLIENTS} active={active} />
            </div>
          </div>
          <ul
            ref={list}
            className="-mx-6 mt-4 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] min-[900px]:mx-0 min-[900px]:mt-0 min-[900px]:grid min-[900px]:overflow-visible min-[900px]:px-0 min-[900px]:pb-0"
          >
            {CLIENTS.map((c, i) => (
              <li
                key={c.name}
                data-client={i}
                onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
                className={`w-[86%] shrink-0 snap-center rounded-2xl p-6 transition-[background-color,box-shadow,opacity] duration-300 min-[900px]:w-auto ${
                  active === i ? "bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_16px_40px_rgba(0,0,0,0.08)]" : "bg-neutral-100/70"
                } ${active !== null && active !== i ? "min-[900px]:opacity-50" : ""}`}
              >
                <figure>
                  <figcaption className="flex items-center gap-3">
                    <img src={c.avatar} alt="" width={40} height={40} loading="lazy" className="size-10 rounded-full bg-white object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" />
                    <span className="min-w-0 leading-tight">
                      <span className="block text-sm font-semibold">{c.name}</span>
                      <span className="block truncate text-sm text-neutral-500">{c.role}</span>
                    </span>
                  </figcaption>
                  <blockquote className="mt-4 text-base text-pretty text-neutral-800">“{c.quote}”</blockquote>
                </figure>
                <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
                  <button
                    type="button"
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive(i)}
                    className="inline-flex items-center gap-1.5 rounded transition-colors duration-300 hover:text-neutral-900"
                  >
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M8 14.5s5-4.3 5-8.2A5 5 0 0 0 3 6.3c0 3.9 5 8.2 5 8.2Z" />
                      <circle cx="8" cy="6.3" r="1.7" />
                    </svg>
                    {c.place}
                  </button>
                  <span>
                    {c.project ? (
                      <Link to="/p/$project" params={{ project: c.project }} className="underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 hover:text-neutral-900">
                        {c.source}
                      </Link>
                    ) : (
                      c.source
                    )}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-12 text-center">
          <BookCall />
        </div>
      </Reveal>
    </section>
  );
}

const PLANS = [
  {
    name: "Project",
    pitch: "One thing built and shipped, for a price agreed up front.",
    price: "From $3,000",
    items: [
      "Live in 1 to 4 weeks, depending on how fast feedback comes",
      "Fixed scope and fixed price",
      "Milestones you approve before paying",
      "Design included, in Figma when you want it",
      "Code, accounts and documentation are yours",
      "Two weeks of fixes after launch",
    ],
    cta: "Discuss a project",
  },
  {
    name: "Partner",
    pitch: "Your dedicated go to for the website after launch.",
    price: "From $2,000 a month",
    items: [
      "Maintenance, speed and uptime watched for you",
      "Four new content pages a month for search and AI answers",
      "Small features and integration changes",
      "Replies within 24 hours on weekdays, same day if something breaks",
      "A short monthly report on speed, traffic and leads",
      "Three month trial, then 30 days' notice either way",
    ],
    cta: "Discuss a partnership",
  },
];

function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <Reveal id="pricing">
        <h2 className="text-4xl font-semibold tracking-tight text-balance">Two ways to work together.</h2>
        <div className="mt-12 grid gap-6 min-[900px]:grid-cols-2">
          {PLANS.map((p, i) => (
            <article
              key={p.name}
              className={`flex flex-col rounded-3xl p-8 ${i === 0 ? "bg-neutral-900 text-white" : "bg-white text-neutral-900 ring-1 ring-neutral-200"}`}
            >
              <h3 className="text-2xl font-semibold tracking-tight">{p.name}</h3>
              <p className={`mt-2 text-base ${i === 0 ? "text-neutral-300" : "text-neutral-600"}`}>{p.pitch}</p>
              <p className="mt-6 text-3xl font-semibold tracking-tight">{p.price}</p>
              <ul className={`mt-6 mb-8 grid gap-3 text-base ${i === 0 ? "text-neutral-200" : "text-neutral-700"}`}>
                {p.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <svg viewBox="0 0 16 16" className="mt-1 size-4 shrink-0 opacity-50" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                      <path d="M3 8.5l3.2 3.2L13 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-pretty">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                <BookCall label={p.cta} invert={i === 0} />
              </div>
            </article>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

const FAQ = [
  ["Am I hiring an agency?", "No. It's me, from the first call to the last commit. Nobody else gets handed your project."],
  [
    "Do you use AI?",
    "Yes. AI agents write a lot of the code, which is a big part of why this is fast. I review everything before it ships, and if I can't explain how something works, it doesn't go in.",
  ],
  [
    "Will I really see something before I pay?",
    "Often, yes. If I can understand the business from a call or your current site, I build a working version first. Bigger or vaguer projects start with a small paid first milestone instead.",
  ],
  [
    "How fast is it?",
    "A marketing site can go live in about a week if your feedback comes the same day. Most projects take two to four weeks, and you set the pace.",
  ],
  [
    "Can you take over an existing site or app?",
    "Yes. I've rebuilt a live site from a minified bundle with no source code, and I'm happy to pick up a build someone else started.",
  ],
  ["Who owns the result?", "You do. Code, hosting, domains and data sit under your own accounts, with documentation."],
  [
    "What happens after launch?",
    "Two weeks of fixes are included. After that you can run it yourself with the documentation, or keep me on as your Partner.",
  ],
  ["Where are you based?", "Vienna, UTC+1. My afternoons overlap with mornings in the US and Canada."],
];

function Questions() {
  return (
    <section aria-labelledby="faq" className="mx-auto max-w-3xl px-6 py-24">
      <Reveal id="faq">
        <h2 id="faq" className="text-4xl font-semibold tracking-tight">
          Questions
        </h2>
        <Accordion.Root className="mt-12 border-t border-neutral-300">
          {FAQ.map(([q, a]) => (
            <Accordion.Item key={q} className="border-b border-neutral-300">
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-6 py-4 text-left text-lg font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900">
                  {q}
                  <svg viewBox="0 0 16 16" className="size-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[panel-open]:rotate-45" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M8 2v12M2 8h12" strokeLinecap="round" />
                  </svg>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel className="h-(--accordion-panel-height) overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[ending-style]:h-0 data-[starting-style]:h-0">
                <p className="pb-6 text-base text-pretty text-neutral-600">{a}</p>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Reveal>
    </section>
  );
}

function Closing() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-24 text-center">
      <Reveal id="closing">
        <h2 className="text-5xl font-semibold tracking-tight text-balance">Have something to build?</h2>
        <p className="mt-6 text-lg text-pretty text-neutral-600">
          Bring the problem, the idea or the stalled build. I'll help you find the clearest way to working software.
        </p>
        <div className="mt-8">
          <BookCall />
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  const links: [string, string][] = [
    ["GitHub", "https://github.com/danolekh"],
    ["X", "https://x.com/danolekh"],
    ["LinkedIn", "https://www.linkedin.com/in/danolekh"],
  ];
  return (
    <footer className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-neutral-300 px-6 py-8 text-sm text-neutral-500">
      <p>© 2026 Dan Olekh, Vienna</p>
      <div className="flex flex-wrap gap-4">
        <Link to="/about" className="transition-colors duration-300 hover:text-neutral-900">About</Link>
        <Link to="/b" className="transition-colors duration-300 hover:text-neutral-900">Writing</Link>
        <Link to="/lab" className="transition-colors duration-300 hover:text-neutral-900">Lab</Link>
        {links.map(([label, href]) => (
          <a key={label} href={href} target="_blank" rel="noopener" className="transition-colors duration-300 hover:text-neutral-900">
            {label}
          </a>
        ))}
      </div>
    </footer>
  );
}

export function Studio() {
  return (
    <div
      className="studio relative min-h-dvh overflow-x-clip bg-white text-neutral-900 [--gallery-height:300px] min-[700px]:[--gallery-height:1152px] min-[700px]:[--gallery-mask:linear-gradient(to_bottom,black_calc(100%-90px),transparent)]"
      style={{ colorScheme: "light" }}
    >
      <style>{`.studio, .studio *:not([style*="Inter Tight"]) { font-family: "Geist Variable", system-ui, sans-serif; }`}</style>
      <Nav />
      <main className="relative z-10">
        <Hero />
        <ClientLogos />
        <Proof />
        <Tagline />
        <Services />
        <How />
        <Clients />
        <Pricing />
        <Questions />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}
