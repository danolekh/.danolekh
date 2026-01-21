import { cn } from "@/lib/utils";
import { ExternalLinkIcon } from "lucide-react";

export const AnimusSection = ({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("mb-8 border-l-2 border-red-700/50 pl-4", className)}>
    <h2 className="text-red-500 text-sm font-bold tracking-[0.2em] mb-4 uppercase flex items-center gap-2">
      <div className="w-2 h-2 bg-red-500 rotate-45" /> {title}
    </h2>
    {children}
  </div>
);

export const DataRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-baseline border-b border-white/10 py-2 font-mono text-sm">
    <span className="text-stone-400 uppercase tracking-wider text-xs">{label}</span>
    <span className="text-white text-right">{value}</span>
  </div>
);

export const TechTag = ({ label }: { label: string }) => (
  <span className="inline-flex items-center px-2 py-1 bg-red-950/30 border border-red-900/50 text-xs font-mono uppercase tracking-wide mr-2 mb-2">
    {label}
  </span>
);

export const ProjectCard = ({
  title,
  jobRole,
  description,
  stack,
  href,
}: {
  title: string;
  jobRole: string;
  description: string;
  stack: string[];
  href?: string;
}) => (
  <div className="bg-linear-to-br from-stone-900/90 to-black p-4 border border-stone-800 mb-4 group hover:border-red-800/50 transition-colors">
    <div className="flex justify-between items-start mb-2">
      {href ? (
        <a href={href} target="_blank" rel="noopener">
          <h3 className="text-xl text-white font-light uppercase tracking-wide flex items-center justify-center gap-2">
            {title}
            <ExternalLinkIcon className="size-4" />
          </h3>
        </a>
      ) : (
        <h3 className="text-xl text-white font-light uppercase tracking-wide">{title}</h3>
      )}
      <span className="text-xs text-red-500 border border-red-500/30 px-1 py-0.5">{jobRole}</span>
    </div>
    <p className="text-stone-400 text-sm mb-4 font-light leading-relaxed">{description}</p>
    <div className="flex flex-wrap">
      {stack.map((s) => (
        <TechTag key={s} label={s} />
      ))}
    </div>
  </div>
);
