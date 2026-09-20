import type { KeyValue } from "@restman/shared";
import { nanoid } from "nanoid";
import { PlusIcon, XIcon } from "lucide-react";
import { IconButton } from "./IconButton";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";

interface Props {
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
}

export function KeyValueEditor({ rows, onChange }: Props) {
  function updateRow(id: string, patch: Partial<KeyValue>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    onChange([...rows, { id: nanoid(), key: "", value: "", enabled: true }]);
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-2">
          <Checkbox
            checked={row.enabled}
            aria-label="Enabled"
            onCheckedChange={(checked) => updateRow(row.id, { enabled: checked })}
          />
          <Input
            value={row.key}
            onChange={(e) => updateRow(row.id, { key: e.target.value })}
            placeholder="Key"
            aria-label="Key"
            className="flex-1"
          />
          <Input
            value={row.value}
            onChange={(e) => updateRow(row.id, { value: e.target.value })}
            placeholder="Value"
            aria-label="Value"
            className="flex-1"
          />
          <IconButton label="Remove row" onClick={() => removeRow(row.id)}>
            <XIcon />
          </IconButton>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="self-start" onClick={addRow}>
        <PlusIcon data-icon="inline-start" />
        Add
      </Button>
    </div>
  );
}
