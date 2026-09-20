import { useAuth, useClerk } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { authApi } from "../../api/auth";
import { ApiError, setTokenProvider } from "../../lib/apiClient";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Spinner } from "../ui/spinner";
import { AuthScreen } from "./AuthScreen";
import { CurrentUserProvider } from "./CurrentUser";

function FullScreenMessage({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center p-6">{children}</div>;
}

/** Renders the app only for a signed-in developer who has completed registration. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();

  // Set during render, not in an effect: children's queries fire on mount, before a parent's effects.
  setTokenProvider(getToken);

  // Signing out must not leave the previous user's data around for the next one.
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      queryClient.clear();
      useWorkspaceStore.getState().reset();
    }
  }, [isLoaded, isSignedIn, queryClient]);

  const me = useQuery({
    queryKey: ["me", userId],
    queryFn: authApi.me,
    enabled: isLoaded && !!isSignedIn,
    retry: false,
    staleTime: Infinity,
  });

  if (!isLoaded) {
    return (
      <FullScreenMessage>
        <Spinner />
      </FullScreenMessage>
    );
  }

  if (!isSignedIn) return <AuthScreen />;

  if (me.isPending) {
    return (
      <FullScreenMessage>
        <Spinner />
      </FullScreenMessage>
    );
  }

  if (me.isError) {
    // 403: signed in with Clerk, but the account never went through our registration.
    const notRegistered = me.error instanceof ApiError && me.error.status === 403;
    return (
      <FullScreenMessage>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{notRegistered ? "Account not registered" : "Could not load your account"}</CardTitle>
            <CardDescription>
              {notRegistered
                ? "This account isn't linked to a company and team. Sign out and register your company to use Restman."
                : "Something went wrong while contacting the server."}
            </CardDescription>
          </CardHeader>
          {!notRegistered && (
            <CardContent>
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{me.error.message}</AlertDescription>
              </Alert>
            </CardContent>
          )}
          <CardFooter className="gap-2">
            {!notRegistered && <Button onClick={() => me.refetch()}>Try again</Button>}
            <Button variant="outline" onClick={() => signOut()}>
              Sign out
            </Button>
          </CardFooter>
        </Card>
      </FullScreenMessage>
    );
  }

  // Keyed by user so nothing (open tabs, cached queries) can carry over between accounts.
  return (
    <CurrentUserProvider key={me.data.id} value={me.data}>
      {children}
    </CurrentUserProvider>
  );
}
