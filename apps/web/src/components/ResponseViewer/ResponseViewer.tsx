import { CircleAlertIcon, SendIcon } from "lucide-react";
import { useState } from "react";
import { statusColor } from "../../lib/http";
import { cn } from "../../lib/utils";
import type { TabState } from "../../store/workspaceStore";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { Spinner } from "../ui/spinner";
import { Table, TableBody, TableCell, TableRow } from "../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

type ViewMode = "pretty" | "raw" | "headers";
const VIEW_MODES: ViewMode[] = ["pretty", "raw", "headers"];

export function ResponseViewer({ tab }: { tab: TabState }) {
  const [view, setView] = useState<ViewMode>("pretty");
  const { response, isSending, error } = tab;

  if (isSending) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Spinner />
          </EmptyMedia>
          <EmptyTitle>Sending request…</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  if (error) {
    return (
      <div className="p-3">
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Request failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!response) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SendIcon />
          </EmptyMedia>
          <EmptyTitle>No response yet</EmptyTitle>
          <EmptyDescription>Send the request to see the response here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  let prettyBody = response.body;
  if (response.bodyIsJson) {
    try {
      prettyBody = JSON.stringify(JSON.parse(response.body), null, 2);
    } catch {
      // fall back to raw text
    }
  }

  return (
    <Tabs
      value={view}
      onValueChange={(value) => setView(value as ViewMode)}
      className="min-h-0 flex-1 gap-0"
    >
      <div className="flex shrink-0 items-center gap-3 border-b px-3 py-1.5 text-sm">
        <Badge variant="outline" className={cn("font-mono", statusColor(response.status))}>
          {response.status} {response.statusText}
        </Badge>
        <span className="text-muted-foreground">{response.timeMs} ms</span>
        <span className="text-muted-foreground">{(response.sizeBytes / 1024).toFixed(2)} KB</span>
        <TabsList variant="line" className="ml-auto">
          {VIEW_MODES.map((v) => (
            <TabsTrigger key={v} value={v} className="capitalize">
              {v}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="pretty" className="min-h-0 flex-1 overflow-auto p-3">
        <pre className="font-mono text-sm break-all whitespace-pre-wrap">{prettyBody}</pre>
      </TabsContent>
      <TabsContent value="raw" className="min-h-0 flex-1 overflow-auto p-3">
        <pre className="font-mono text-sm break-all whitespace-pre-wrap">{response.body}</pre>
      </TabsContent>
      <TabsContent value="headers" className="min-h-0 flex-1 overflow-auto p-3">
        <Table>
          <TableBody>
            {Object.entries(response.headers).map(([key, value]) => (
              <TableRow key={key}>
                <TableCell className="font-mono text-muted-foreground">{key}</TableCell>
                <TableCell className="font-mono whitespace-normal break-all">{value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  );
}
