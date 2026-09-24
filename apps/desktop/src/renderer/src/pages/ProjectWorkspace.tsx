import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collectionsApi } from "../api/collections";
import { projectsApi } from "../api/projects";

/** Placeholder: the request builder hasn't been built for desktop yet — collections only, so far. */
export function ProjectWorkspace() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.get(projectId),
    retry: false,
  });

  const collections = useQuery({
    queryKey: ["collections", projectId],
    queryFn: () => collectionsApi.list(projectId),
    enabled: !project.isError,
  });

  const create = useMutation({
    mutationFn: () => collectionsApi.create(projectId, name.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections", projectId] });
      setName("");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => collectionsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collections", projectId] }),
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <Link to="/" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Projects
      </Link>

      {project.isPending && <p className="text-sm text-neutral-400">Loading project…</p>}
      {project.isError && (
        <p className="text-sm text-red-400">Could not load project: {project.error.message}</p>
      )}

      {project.data && (
        <>
          <div>
            <h1 className="text-xl font-semibold">{project.data.name}</h1>
            <p className="text-sm text-neutral-400">{project.data.description || "No description"}</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim() && !create.isPending) create.mutate();
            }}
            className="flex items-center gap-2"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New collection name"
              maxLength={200}
              className="flex-1 rounded-md border border-neutral-800 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-neutral-600"
            />
            <button
              type="submit"
              disabled={!name.trim() || create.isPending}
              className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "New collection"}
            </button>
          </form>
          {create.isError && <p className="text-sm text-red-400">{create.error.message}</p>}

          {collections.isPending && <p className="text-sm text-neutral-400">Loading collections…</p>}
          {collections.isError && (
            <p className="text-sm text-red-400">Could not load collections: {collections.error.message}</p>
          )}
          {collections.data && collections.data.length === 0 && (
            <p className="text-sm text-neutral-500">No collections yet.</p>
          )}

          {collections.data && collections.data.length > 0 && (
            <ul className="flex flex-col gap-2">
              {collections.data.map((collection) => (
                <li
                  key={collection.id}
                  className="flex items-center justify-between rounded-md border border-neutral-800 p-3"
                >
                  <span className="font-medium">{collection.name}</span>
                  <button
                    onClick={() => remove.mutate(collection.id)}
                    disabled={remove.isPending}
                    className="text-sm text-neutral-500 hover:text-red-400 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-md border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
            The request builder (opening a collection, adding/running requests) hasn't been built for
            the desktop app yet.
          </div>
        </>
      )}
    </div>
  );
}
