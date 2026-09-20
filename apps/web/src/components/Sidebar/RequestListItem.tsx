import type { SavedRequest } from "@restman/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { requestsApi } from "../../api/requests";
import { METHOD_COLORS } from "../../lib/http";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { ConfirmDialog } from "../ConfirmDialog";
import { IconButton } from "../IconButton";
import { cn } from "../../lib/utils";

export function RequestListItem({ request }: { request: SavedRequest }) {
  const queryClient = useQueryClient();
  const openSavedRequest = useWorkspaceStore((s) => s.openSavedRequest);
  const isActive = useWorkspaceStore((s) =>
    s.tabs.some((t) => t.draft.tabId === s.activeTabId && t.draft.savedId === request.id),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const removeRequest = useMutation({
    mutationFn: () => requestsApi.remove(request.id),
    onSuccess: () => {
      const { tabs, closeTab } = useWorkspaceStore.getState();
      for (const tab of tabs) {
        if (tab.draft.savedId === request.id) closeTab(tab.draft.tabId);
      }
      queryClient.invalidateQueries({ queryKey: ["requests", request.collectionId] });
    },
    onError: (error) => toast.error(`Delete failed: ${error.message}`),
  });

  return (
    <>
      <div
        className={cn(
          "group flex items-center justify-between gap-1 rounded-md pr-1 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
        )}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={() => openSavedRequest(request)}
        >
          <span className={cn("w-12 shrink-0 font-mono text-xs font-semibold", METHOD_COLORS[request.method])}>
            {request.method}
          </span>
          <span className="truncate">{request.name}</span>
        </button>
        <IconButton
          label="Delete request"
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2Icon />
        </IconButton>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete request?"
        description={`"${request.name}" will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={() => removeRequest.mutate()}
      />
    </>
  );
}
