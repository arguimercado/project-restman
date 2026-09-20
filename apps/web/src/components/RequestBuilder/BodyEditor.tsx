import type { BodyConfig, BodyType } from "@restman/shared";
import { KeyValueEditor } from "../KeyValueEditor";
import { Textarea } from "../ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "json", label: "JSON" },
  { value: "text", label: "Text" },
  { value: "xml", label: "XML" },
  { value: "html", label: "HTML" },
  { value: "form-urlencoded", label: "Form URL-encoded" },
];
const RAW_TYPES = new Set<BodyType>(["json", "text", "xml", "html"]);

export function BodyEditor({
  body,
  onChange,
}: {
  body: BodyConfig;
  onChange: (body: BodyConfig) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={0}
        value={[body.type]}
        // Base UI lets a single-select group be emptied; a body always has a type.
        onValueChange={(value) => value[0] && onChange({ ...body, type: value[0] as BodyType })}
      >
        {BODY_TYPES.map((type) => (
          <ToggleGroupItem key={type.value} value={type.value}>
            {type.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {body.type === "form-urlencoded" && (
        <KeyValueEditor
          rows={body.formFields ?? []}
          onChange={(formFields) => onChange({ ...body, formFields })}
        />
      )}

      {RAW_TYPES.has(body.type) && (
        <Textarea
          value={body.content ?? ""}
          onChange={(e) => onChange({ ...body, content: e.target.value })}
          placeholder={body.type === "json" ? '{\n  "key": "value"\n}' : ""}
          spellCheck={false}
          aria-label="Request body"
          className="h-48 resize-y font-mono"
        />
      )}
    </div>
  );
}
