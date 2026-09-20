import { SendIcon } from "lucide-react";
import { AppMenuBar } from "./components/AppMenuBar/AppMenuBar";
import { RequestBuilder } from "./components/RequestBuilder/RequestBuilder";
import { ResponseViewer } from "./components/ResponseViewer/ResponseViewer";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { TabBar } from "./components/Tabs/TabBar";
import { Button } from "./components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./components/ui/empty";
import { useWorkspaceStore } from "./store/workspaceStore";

export default function App() {
  const activeTab = useWorkspaceStore((s) => s.tabs.find((t) => t.draft.tabId === s.activeTabId));
  const openNewTab = useWorkspaceStore((s) => s.openNewTab);

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      <AppMenuBar />
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
                <EmptyMedia variant="icon">
                  <SendIcon />
                </EmptyMedia>
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
    </div>
  );
}
