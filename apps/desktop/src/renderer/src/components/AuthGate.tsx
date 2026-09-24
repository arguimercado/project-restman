import { SignIn, useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { authApi } from "../api/auth";
import { ApiError, setTokenProvider } from "../lib/apiClient";
import { CurrentUserProvider } from "./CurrentUser";

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center p-6">{children}</div>;
}

/** Renders the app only for a signed-in developer who has completed registration on the web app. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();

  // Set during render, not in an effect: children's queries fire on mount, before a parent's effects.
  setTokenProvider(getToken);

  const me = useQuery({
    queryKey: ["me", userId],
    queryFn: authApi.me,
    enabled: isLoaded && !!isSignedIn,
    retry: false,
    staleTime: Infinity,
  });

  if (!isLoaded) return <Centered>Loading…</Centered>;

  if (!isSignedIn) {
    return (
      <Centered>
        <SignIn routing="hash" />
      </Centered>
    );
  }

  if (me.isPending) return <Centered>Loading your account…</Centered>;

  if (me.isError) {
    const notRegistered = me.error instanceof ApiError && me.error.status === 403;
    return (
      <Centered>
        <p className="max-w-sm text-center text-sm text-neutral-400">
          {notRegistered
            ? "This account isn't registered yet. Register your company and team from the web app first."
            : `Could not load your account: ${me.error.message}`}
        </p>
      </Centered>
    );
  }

  return (
    <CurrentUserProvider key={me.data.id} value={me.data}>
      {children}
    </CurrentUserProvider>
  );
}
