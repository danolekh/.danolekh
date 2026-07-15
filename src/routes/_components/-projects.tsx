import { Link } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { projects, type Project } from "@/data/projects";

export default function Projects() {
  return (
    <section className="py-8 px-6 md:px-12">
      <div className="max-w-208 mx-auto">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Projects</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const inner = (
    <Card size="sm" className="h-full hover:ring-foreground/20 transition-all cursor-pointer">
      <img
        src={project.cover}
        alt={`${project.title} preview`}
        className="h-36 w-full object-cover"
      />
      <CardHeader>
        <CardTitle className="text-base">{project.title}</CardTitle>
        <CardDescription>{project.subtitle}</CardDescription>
      </CardHeader>
    </Card>
  );

  if (project.internal) {
    return (
      <Link to="/p/$project" params={{ project: project.slug }} className="block">
        {inner}
      </Link>
    );
  }

  return (
    <a href={project.href} target="_blank" rel="noopener noreferrer" className="block">
      {inner}
    </a>
  );
}
