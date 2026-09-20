import { SignIn } from "@clerk/react";
import { CircleCheckIcon, SendIcon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { RegisterForm } from "./RegisterForm";

/** Shown to signed-out visitors: sign in with Clerk, or register a company and team. */
export function AuthScreen() {
  const [mode, setMode] = useState<"sign-in" | "register">("sign-in");
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  return (
    // `*:shrink-0`: children keep their natural height and the screen scrolls, instead of the
    // (overflow-hidden) card shrinking to fit and clipping its footer.
    <div className="flex h-full flex-col items-center gap-4 overflow-y-auto p-4 *:shrink-0">
      <div className="mt-auto flex items-center gap-2 text-lg font-semibold">
        <SendIcon className="size-5 text-primary" />
        Restman
      </div>

      {mode === "register" ? (
        <RegisterForm
          onSwitchToSignIn={() => setMode("sign-in")}
          onRegistered={(email) => {
            setRegisteredEmail(email);
            setMode("sign-in");
          }}
        />
      ) : (
        <>
          {registeredEmail && (
            <Alert className="max-w-md">
              <CircleCheckIcon />
              <AlertTitle>Account created</AlertTitle>
              <AlertDescription>Sign in with {registeredEmail} to continue.</AlertDescription>
            </Alert>
          )}
          <SignIn
            routing="hash"
            initialValues={{ emailAddress: registeredEmail ?? undefined }}
            // Sign-up happens through our own registration form, not Clerk's.
            appearance={{ elements: { footerAction: { display: "none" } } }}
          />
          <Button variant="ghost" onClick={() => setMode("register")}>
            New here? Register your company
          </Button>
        </>
      )}
      <div className="mb-auto" />
    </div>
  );
}
