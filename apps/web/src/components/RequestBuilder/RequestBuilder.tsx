import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { executeApi } from "../../api/execute";
import { requestsApi } from "../../api/requests";
import type { RequestDraft, TabState } from "../../store/workspaceStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { KeyValueEditor } from "../KeyValueEditor";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AuthEditor } from "./AuthEditor";
import { BodyEditor } from "./BodyEditor";
import { UrlBar } from "./UrlBar";

type SectionTab = "params" | "headers" | "body" | "auth";
const SECTIONS: SectionTab[] = ["params", "headers", "body", "auth"];

const activeRowCount = (rows: RequestDraft["params"]) => rows.filter((r) => r.enabled && r.key).length;
const SECTION_COUNTS: Partial<Record<SectionTab, (draft: RequestDraft) => number>> = {
  params: (draft) => activeRowCount(draft.params),
  headers: (draft) => activeRowCount(draft.headers),
};

export function RequestBuilder({ tab }: { tab: TabState }) {
  const [section, setSection] = useState<SectionTab>("params");
  const { draft } = tab;
  const queryClient = useQueryClient();

  const updateDraft = useWorkspaceStore((s) => s.updateDraft);
  const setResponse = useWorkspaceStore((s) => s.setResponse);
  const setSending = useWorkspaceStore((s) => s.setSending);
  const setError = useWorkspaceStore((s) => s.setError);
  const markSaved = useWorkspaceStore((s) => s.markSaved);

  const sendMutation = useMutation({
    mutationFn: () =>
      executeApi.send({
        method: draft.method,
        url: draft.url,
        params: draft.params,
        headers: draft.headers,
        auth: draft.auth,
        body: draft.body,
      }),
    onMutate: () => {
      setSending(draft.tabId, true);
      setError(draft.tabId, null);
    },
    onSuccess: (response) => setResponse(draft.tabId, response),
    onError: (error: unknown) =>
      setError(draft.tabId, error instanceof Error ? error.message : "Request failed"),
    onSettled: () => setSending(draft.tabId, false),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input = {
        name: draft.name,
        method: draft.method,
        url: draft.url,
        params: draft.params,
        headers: draft.headers,
        auth: draft.auth,
        body: draft.body,
      };
      if (draft.savedId) return requestsApi.update(draft.savedId, input);
      if (!draft.collectionId) throw new Error("Pick a collection to save into first");
      return requestsApi.create(draft.collectionId, input);
    },
    onSuccess: (saved) => {
      markSaved(draft.tabId, saved.id, saved.collectionId);
      queryClient.invalidateQueries({ queryKey: ["requests", saved.collectionId] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="flex flex-col gap-3 border-b p-3">
      <Input
        value={draft.name}
        onChange={(e) => updateDraft(draft.tabId, { name: e.target.value })}
        aria-label="Request name"
        className="h-7 w-64 border-transparent bg-transparent px-1.5 font-medium shadow-none hover:bg-muted focus-visible:bg-muted dark:bg-transparent"
      />

      <UrlBar
        method={draft.method}
        url={draft.url}
        onMethodChange={(method) => updateDraft(draft.tabId, { method })}
        onUrlChange={(url) => updateDraft(draft.tabId, { url })}
        onSend={() => sendMutation.mutate()}
        onSave={() => saveMutation.mutate()}
        isSending={tab.isSending}
      />

      <Tabs value={section} onValueChange={(value) => setSection(value as SectionTab)}>
        <TabsList variant="line">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s}
              {SECTION_COUNTS[s]?.(draft) ? (
                <Badge variant="secondary">{SECTION_COUNTS[s]?.(draft)}</Badge>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="params" className="pt-1">
          <KeyValueEditor
            rows={draft.params}
            onChange={(params) => updateDraft(draft.tabId, { params })}
          />
        </TabsContent>
        <TabsContent value="headers" className="pt-1">
          <KeyValueEditor
            rows={draft.headers}
            onChange={(headers) => updateDraft(draft.tabId, { headers })}
          />
        </TabsContent>
        <TabsContent value="body" className="pt-1">
          <BodyEditor body={draft.body} onChange={(body) => updateDraft(draft.tabId, { body })} />
        </TabsContent>
        <TabsContent value="auth" className="pt-1">
          <AuthEditor auth={draft.auth} onChange={(auth) => updateDraft(draft.tabId, { auth })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
