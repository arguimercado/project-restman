import type { Collection } from "@restman/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRightIcon,
  DownloadIcon,
  FolderIcon,
  FolderOpenIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { collectionsApi } from "../../api/collections";
import { requestsApi } from "../../api/requests";
import { transferApi } from "../../api/transfer";
import { cn } from "../../lib/utils";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { ConfirmDialog } from "../ConfirmDialog";
import { IconButton } from "../IconButton";
import { RequestListItem } from "./RequestListItem";

export function CollectionItem({ collection }: { collection: Collection }) {
  const [expanded, setExpanded] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();
  const openNewTab = useWorkspaceStore((s) => s.openNewTab);

  const { data: requests = [] } = useQuery({
    queryKey: ["requests", collection.id],
    queryFn: () => requestsApi.listByCollection(collection.id),
    enabled: expanded,
  });

  const removeCollection = useMutation({
    mutationFn: () => collectionsApi.remove(collection.id),
    onSuccess: () => {
      // Tabs of the deleted collection's requests would otherwise save into rows that are gone.
      const { tabs, closeTab } = useWorkspaceStore.getState();
      for (const tab of tabs) {
        if (tab.draft.collectionId === collection.id) closeTab(tab.draft.tabId);
      }
      queryClient.removeQueries({ queryKey: ["requests", collection.id] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (error) => toast.error(`Delete failed: ${error.message}`),
  });

  const exportCollection = useMutation({
    mutationFn: () => transferApi.exportToFile([collection.id], collection.name),
    onError: (error) => toast.error(`Export failed: ${error.message}`),
  });

  return (
    <div>
      <div className="group flex items-center gap-1 rounded-md pr-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronRightIcon
            className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")}
          />
          {expanded ? (
            <FolderOpenIcon className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{collection.name}</span>
        </button>
        <div className="flex opacity-0 group-hover:opacity-100 has-[:focus-visible]:opacity-100">
          <IconButton label="New request" onClick={() => openNewTab(collection.id)}>
            <PlusIcon />
          </IconButton>
          <IconButton
            label="Export to .restman file"
            disabled={exportCollection.isPending}
            onClick={() => exportCollection.mutate()}
          >
            <DownloadIcon />
          </IconButton>
          <IconButton label="Delete collection" onClick={() => setConfirmOpen(true)}>
            <Trash2Icon />
          </IconButton>
        </div>
      </div>

      {expanded && (
        <div className="ml-4 flex flex-col gap-0.5 border-l pl-2">
          {requests.map((request) => (
            <RequestListItem key={request.id} request={request} />
          ))}
          {requests.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">No requests</p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete collection?"
        description={`"${collection.name}" and all of its requests will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={() => removeCollection.mutate()}
      />
    </div>
  );
}
