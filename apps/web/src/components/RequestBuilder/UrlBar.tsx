import type { HttpMethod } from "@restman/shared";
import { SaveIcon, SendIcon } from "lucide-react";
import { HTTP_METHODS, METHOD_COLORS } from "../../lib/http";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Spinner } from "../ui/spinner";

const METHOD_ITEMS = HTTP_METHODS.map((m) => ({ label: m, value: m }));

interface Props {
  method: HttpMethod;
  url: string;
  onMethodChange: (method: HttpMethod) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  onSave: () => void;
  isSending: boolean;
}

export function UrlBar({
  method,
  url,
  onMethodChange,
  onUrlChange,
  onSend,
  onSave,
  isSending,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <Select
        items={METHOD_ITEMS}
        value={method}
        onValueChange={(value) => value && onMethodChange(value as HttpMethod)}
      >
        <SelectTrigger
          aria-label="HTTP method"
          className={cn("w-28 font-mono font-semibold", METHOD_COLORS[method])}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {METHOD_ITEMS.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                className={cn("font-mono font-semibold", METHOD_COLORS[item.value])}
              >
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Input
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="https://api.example.com/resource"
        aria-label="Request URL"
        className="flex-1"
        onKeyDown={(e) => {
          if (e.key === "Enter") onSend();
        }}
      />

      <Button onClick={onSend} disabled={isSending || !url}>
        {isSending ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
        {isSending ? "Sending…" : "Send"}
      </Button>
      <Button variant="secondary" onClick={onSave}>
        <SaveIcon data-icon="inline-start" />
        Save
      </Button>
    </div>
  );
}
