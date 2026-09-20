import { PlusIcon, XIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { IconButton } from "../IconButton";

export function TabBar() {
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const closeTab = useWorkspaceStore((s) => s.closeTab);
  const openNewTab = useWorkspaceStore((s) => s.openNewTab);

  return (
    <div className="flex h-9 shrink-0 items-center border-b bg-card">
      <div className="flex h-full min-w-0 flex-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.draft.tabId === activeTabId;
          return (
            <div
              key={tab.draft.tabId}
              className={cn(
                "group flex h-full shrink-0 items-center gap-1 border-r pr-1 pl-3 text-sm",
                isActive
                  ? "-mb-px border-b border-b-background bg-background text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <button
                type="button"
                className="flex max-w-40 items-center gap-1.5 outline-none"
                onClick={() => setActiveTab(tab.draft.tabId)}
              >
                <span className="truncate">{tab.draft.name}</span>
                {tab.draft.isDirty && (
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-primary"
                    role="img"
                    aria-label="Unsaved changes"
                  />
                )}
              </button>
              <IconButton label="Close tab" onClick={() => closeTab(tab.draft.tabId)}>
                <XIcon />
              </IconButton>
            </div>
          );
        })}
      </div>
      <IconButton label="New request" size="icon-sm" className="mx-1" onClick={() => openNewTab()}>
        <PlusIcon />
      </IconButton>
    </div>
  );
}
