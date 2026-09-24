import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { projectsApi } from "../api/projects";

/** Placeholder first page: proves the Electron shell reaches the real API and renders real data. */
export function ProjectsPage() {
  const {
    data: projects,
    isPending,
    error,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Projects</h1>

      {isPending && <p className="text-sm text-neutral-400">Loading projects…</p>}
      {error && <p className="text-sm text-red-400">Could not load projects: {error.message}</p>}

      {projects && projects.length === 0 && (
        <p className="text-sm text-neutral-400">No projects yet. Create one from the web app.</p>
      )}

      {projects && projects.length > 0 && (
        <ul className="flex flex-col gap-2">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                to={`/projects/${project.id}`}
                className="block rounded-md border border-neutral-800 p-3 transition-colors hover:bg-neutral-900"
              >
                <div className="font-medium">{project.name}</div>
                <div className="text-sm text-neutral-400">{project.description || "No description"}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
