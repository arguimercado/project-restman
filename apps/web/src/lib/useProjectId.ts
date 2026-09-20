import { useParams } from "react-router-dom";

/** The id of the project being viewed. Only valid below the `/projects/:projectId` route. */
export function useProjectId(): string {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) throw new Error("useProjectId must be used inside a project route");
  return projectId;
}
