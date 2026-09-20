import type { CurrentUser } from "@restman/shared";
import { createContext, useContext } from "react";

const CurrentUserContext = createContext<CurrentUser | null>(null);

export const CurrentUserProvider = CurrentUserContext.Provider;

/** The signed-in, registered developer. Only available below `AuthGate`. */
export function useCurrentUser(): CurrentUser {
  const user = useContext(CurrentUserContext);
  if (!user) throw new Error("useCurrentUser must be used inside <AuthGate>");
  return user;
}
