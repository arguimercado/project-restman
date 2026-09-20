import { UserButton } from "@clerk/react";
import { RESTMAN_FILE_EXTENSION, type ImportResult } from "@restman/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, FolderOpenIcon, SendIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { collectionsApi } from "../../api/collections";
import { transferApi } from "../../api/transfer";
import { useCurrentUser } from "../Auth/CurrentUser";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarShortcut,
  MenubarTrigger,
} from "../ui/menubar";

const ACCEPTED_FILES = `${RESTMAN_FILE_EXTENSION},.json,.yaml,.yml`;
const MAX_WARNINGS_SHOWN = 8;

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function showImportResult(result: ImportResult) {
  const summary = `Imported ${plural(result.requestCount, "request")} into ${plural(
    result.collections.length,
    "collection",
  )} (${result.format === "openapi" ? "OpenAPI" : "Restman file"}).`;

  if (result.warnings.length === 0) {
    toast.success(summary);
    return;
  }

  const extra = result.warnings.length - MAX_WARNINGS_SHOWN;
  toast.warning(summary, {
    description: (
      <ul className="flex list-disc flex-col gap-0.5 pl-4">
        {result.warnings.slice(0, MAX_WARNINGS_SHOWN).map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
        {extra > 0 && <li>…and {extra} more</li>}
      </ul>
    ),
  });
}

export function AppMenuBar() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: collectionsApi.list,
  });

  const importFile = useMutation({
    mutationFn: (file: File) => transferApi.importFile(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      showImportResult(result);
    },
    onError: (error) => toast.error(`Import failed: ${error.message}`),
  });

  const exportAll = useMutation({
    mutationFn: () => transferApi.exportToFile(undefined, "restman-workspace"),
    onError: (error) => toast.error(`Export failed: ${error.message}`),
  });

  function openFilePicker() {
    if (!importFile.isPending) fileInput.current?.click();
  }

  // Ctrl/Cmd+O opens the import picker, like the File > Open shortcut in a desktop app.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        openFilePicker();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <header className="flex h-9 shrink-0 items-center gap-2 border-b bg-card px-2">
      <div className="flex items-center gap-1.5 px-1.5 text-sm font-semibold">
        <SendIcon className="size-4 text-primary" />
        Restman
      </div>

      <Menubar className="h-7 gap-0 border-0 bg-transparent p-0">
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent className="w-64">
            <MenubarItem disabled={importFile.isPending} onClick={openFilePicker}>
              <FolderOpenIcon />
              {importFile.isPending ? "Importing…" : "Open / Import…"}
              <MenubarShortcut>Ctrl+O</MenubarShortcut>
            </MenubarItem>
            <MenubarItem
              disabled={collections.length === 0 || exportAll.isPending}
              onClick={() => exportAll.mutate()}
            >
              <DownloadIcon />
              Export all
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {user.company.name} / {user.team.name}
        </span>
        <UserButton />
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED_FILES}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importFile.mutate(file);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />
    </header>
  );
}
