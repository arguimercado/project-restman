import type { Project } from "@restman/shared";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon, FolderIcon, FolderPlusIcon, PlusIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { projectsApi } from "../api/projects";
import { CreateProjectDialog } from "../components/Projects/CreateProjectDialog";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../components/ui/empty";
import { Spinner } from "../components/ui/spinner";

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full transition-colors hover:bg-muted/50">
        <CardHeader>
          <CardTitle className="truncate">{project.name}</CardTitle>
          <CardDescription className="line-clamp-2">
            {project.description || "No description"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <Badge variant={project.role === "owner" ? "default" : "secondary"}>
            {project.role === "owner" ? "Owner" : "Member"}
          </Badge>
          <span className="flex items-center gap-1">
            <UsersIcon className="size-3.5" />
            {project.memberCount} {project.memberCount === 1 ? "member" : "members"}
          </span>
          <span className="flex items-center gap-1">
            <FolderIcon className="size-3.5" />
            {project.collectionCount} {project.collectionCount === 1 ? "collection" : "collections"}
          </span>
          <span className="ml-auto">
            {new Date(project.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

/** The first page after sign-in: the projects the developer is a member of. */
export function ProjectsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: projects, isPending, error } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
  });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">Projects</h1>
            <p className="text-sm text-muted-foreground">Projects you own or are a member of.</p>
          </div>
          {projects && projects.length > 0 && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              New project
            </Button>
          )}
        </div>

        {isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Loading projects…
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Could not load projects</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {projects && projects.length === 0 && (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderPlusIcon />
              </EmptyMedia>
              <EmptyTitle>No projects yet</EmptyTitle>
              <EmptyDescription>
                Create a project to organize your collections and requests.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setCreateOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Create project
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {projects && projects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
