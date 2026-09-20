import { useQuery } from "@tanstack/react-query";
import { FolderXIcon } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { projectsApi } from "../api/projects";
import { RequestBuilder } from "../components/RequestBuilder/RequestBuilder";
import { ResponseViewer } from "../components/ResponseViewer/ResponseViewer";
import { Sidebar } from "../components/Sidebar/Sidebar";
import { TabBar } from "../components/Tabs/TabBar";
import { Button } from "../components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../components/ui/empty";
import { Spinner } from "../components/ui/spinner";
import { useProjectId } from "../lib/useProjectId";
import { useWorkspaceStore } from "../store/workspaceStore";

/** The request workspace (collections, tabs, builder, response) for one project. */
export function ProjectWorkspace() {
  const projectId = useProjectId();
  const activeTab = useWorkspaceStore((s) => s.tabs.find((t) => t.draft.tabId === s.activeTabId));
  const openNewTab = useWorkspaceStore((s) => s.openNewTab);
  const reset = useWorkspaceStore((s) => s.reset);

  // Open tabs belong to one project: drop them when leaving it or switching to another.
  useEffect(() => reset, [projectId, reset]);

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.get(projectId),
    retry: false,
  });

  if (project.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Not a member, or no such project: the API answers 404 for both.
  if (project.isError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderXIcon />
          </EmptyMedia>
          <EmptyTitle>Project not found</EmptyTitle>
          <EmptyDescription>It does not exist, or you are not a member of it.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/" />} nativeButton={false}>
            Back to projects
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <TabBar />
        {activeTab ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <RequestBuilder tab={activeTab} />
            <ResponseViewer tab={activeTab} />
          </div>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No request open</EmptyTitle>
              <EmptyDescription>
                Select a request from a collection, or start a new one.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => openNewTab()}>New request</Button>
            </EmptyContent>
          </Empty>
        )}
      </main>
    </div>
  );
}
