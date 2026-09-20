import type { AuthConfig, AuthType } from "@restman/shared";
import { Field, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "bearer", label: "Bearer token" },
  { value: "basic", label: "Basic" },
  { value: "apiKey", label: "API key" },
];

const API_KEY_LOCATIONS: { value: "header" | "query"; label: string }[] = [
  { value: "header", label: "Header" },
  { value: "query", label: "Query param" },
];

export function AuthEditor({
  auth,
  onChange,
}: {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}) {
  return (
    <FieldGroup>
      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={0}
        value={[auth.type]}
        // Base UI lets a single-select group be emptied; auth always has a type.
        onValueChange={(value) => value[0] && onChange({ type: value[0] as AuthType })}
      >
        {AUTH_TYPES.map((type) => (
          <ToggleGroupItem key={type.value} value={type.value}>
            {type.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {auth.type === "bearer" && (
        <Field>
          <FieldLabel htmlFor="auth-token">Token</FieldLabel>
          <Input
            id="auth-token"
            value={auth.bearer?.token ?? ""}
            onChange={(e) => onChange({ ...auth, bearer: { token: e.target.value } })}
            placeholder="Token"
          />
        </Field>
      )}

      {auth.type === "basic" && (
        <div className="grid grid-cols-2 gap-2">
          <Field>
            <FieldLabel htmlFor="auth-username">Username</FieldLabel>
            <Input
              id="auth-username"
              value={auth.basic?.username ?? ""}
              onChange={(e) =>
                onChange({
                  ...auth,
                  basic: { username: e.target.value, password: auth.basic?.password ?? "" },
                })
              }
              placeholder="Username"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="auth-password">Password</FieldLabel>
            <Input
              id="auth-password"
              type="password"
              value={auth.basic?.password ?? ""}
              onChange={(e) =>
                onChange({
                  ...auth,
                  basic: { username: auth.basic?.username ?? "", password: e.target.value },
                })
              }
              placeholder="Password"
            />
          </Field>
        </div>
      )}

      {auth.type === "apiKey" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field>
              <FieldLabel htmlFor="auth-api-key">Key</FieldLabel>
              <Input
                id="auth-api-key"
                value={auth.apiKey?.key ?? ""}
                onChange={(e) =>
                  onChange({
                    ...auth,
                    apiKey: {
                      key: e.target.value,
                      value: auth.apiKey?.value ?? "",
                      addTo: auth.apiKey?.addTo ?? "header",
                    },
                  })
                }
                placeholder="Key"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="auth-api-value">Value</FieldLabel>
              <Input
                id="auth-api-value"
                value={auth.apiKey?.value ?? ""}
                onChange={(e) =>
                  onChange({
                    ...auth,
                    apiKey: {
                      key: auth.apiKey?.key ?? "",
                      value: e.target.value,
                      addTo: auth.apiKey?.addTo ?? "header",
                    },
                  })
                }
                placeholder="Value"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>Add to</FieldLabel>
            <ToggleGroup
              variant="outline"
              size="sm"
              spacing={0}
              value={[auth.apiKey?.addTo ?? "header"]}
              onValueChange={(value) =>
                value[0] &&
                onChange({
                  ...auth,
                  apiKey: {
                    key: auth.apiKey?.key ?? "",
                    value: auth.apiKey?.value ?? "",
                    addTo: value[0] as "header" | "query",
                  },
                })
              }
            >
              {API_KEY_LOCATIONS.map((location) => (
                <ToggleGroupItem key={location.value} value={location.value}>
                  {location.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        </>
      )}
    </FieldGroup>
  );
}
