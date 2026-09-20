import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { collectionsApi } from "../../api/collections";
import { useProjectId } from "../../lib/useProjectId";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../ui/empty";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "../ui/input-group";
import { ScrollArea } from "../ui/scroll-area";
import { Spinner } from "../ui/spinner";
import { CollectionItem } from "./CollectionItem";

export function Sidebar() {
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const [newName, setNewName] = useState("");

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ["collections", projectId],
    queryFn: () => collectionsApi.list(projectId),
  });

  const createCollection = useMutation({
    mutationFn: (name: string) => collectionsApi.create(projectId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collections", projectId] }),
    onError: (error) => toast.error(`Could not create collection: ${error.message}`),
  });

  function submit() {
    const name = newName.trim();
    if (!name) return;
    createCollection.mutate(name);
    setNewName("");
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="border-b p-3">
        <InputGroup>
          <InputGroupInput
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New collection name"
            aria-label="New collection name"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="Add collection"
              size="icon-xs"
              disabled={!newName.trim()}
              onClick={submit}
            >
              <FolderPlusIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-0.5 p-2">
          {isLoading && (
            <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
              <Spinner /> Loading…
            </div>
          )}
          {collections.map((collection) => (
            <CollectionItem key={collection.id} collection={collection} />
          ))}
          {!isLoading && collections.length === 0 && (
            <Empty className="p-4">
              <EmptyHeader>
                <EmptyTitle>No collections yet</EmptyTitle>
                <EmptyDescription>
                  Add one above, or use File → Open / Import to load a collection.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
