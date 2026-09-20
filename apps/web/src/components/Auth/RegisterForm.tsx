import type { RegisterPayload } from "@restman/shared";
import { useMutation } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";
import { useState } from "react";
import { authApi } from "../../api/auth";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "../ui/field";
import { Input } from "../ui/input";
import { Spinner } from "../ui/spinner";

interface Props {
  /** Called after the account was created; the developer can now sign in. */
  onRegistered: (email: string) => void;
  onSwitchToSignIn: () => void;
}

const EMPTY: RegisterPayload = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  companyName: "",
  teamName: "",
};

export function RegisterForm({ onRegistered, onSwitchToSignIn }: Props) {
  const [form, setForm] = useState<RegisterPayload>(EMPTY);

  const register = useMutation({
    mutationFn: () => authApi.register(form),
    onSuccess: (user) => onRegistered(user.email),
  });

  function bind(field: keyof RegisterPayload) {
    return {
      value: form[field],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((current) => ({ ...current, [field]: e.target.value })),
    };
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Register your company</CardTitle>
        <CardDescription>
          Create your developer account together with your company and team.
        </CardDescription>
      </CardHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          register.mutate();
        }}
      >
        <CardContent className="flex flex-col gap-4">
          {register.isError && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Registration failed</AlertTitle>
              <AlertDescription>{register.error.message}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <FieldSet>
              <FieldLegend>You</FieldLegend>
              <FieldGroup className="gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <Field>
                    <FieldLabel htmlFor="reg-first-name">First name</FieldLabel>
                    <Input id="reg-first-name" autoComplete="given-name" required {...bind("firstName")} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="reg-last-name">Last name</FieldLabel>
                    <Input id="reg-last-name" autoComplete="family-name" required {...bind("lastName")} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="reg-email">Work email</FieldLabel>
                  <Input id="reg-email" type="email" autoComplete="email" required {...bind("email")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="reg-password">Password</FieldLabel>
                  <Input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    {...bind("password")}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Your company and team</FieldLegend>
              <FieldGroup className="gap-3">
                <Field>
                  <FieldLabel htmlFor="reg-company">Company</FieldLabel>
                  <Input id="reg-company" autoComplete="organization" required {...bind("companyName")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="reg-team">Team</FieldLabel>
                  <Input id="reg-team" required {...bind("teamName")} />
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-2">
          <Button type="submit" className="w-full" disabled={register.isPending}>
            {register.isPending && <Spinner data-icon="inline-start" />}
            {register.isPending ? "Creating account…" : "Create account"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={onSwitchToSignIn}>
            Already registered? Sign in
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
