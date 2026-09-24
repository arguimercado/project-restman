import { ClerkProvider } from "@clerk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { AuthGate } from "./components/AuthGate";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error(
    "Missing VITE_CLERK_PUBLISHABLE_KEY. Copy apps/desktop/.env.example to apps/desktop/.env and add your Clerk publishable key.",
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

// HashRouter, not BrowserRouter: a packaged app loads index.html over file://, where History API
// routing has no server to fall back to on a refresh/deep link.
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <HashRouter>
            <App />
          </HashRouter>
        </AuthGate>
      </QueryClientProvider>
    </ClerkProvider>
  </React.StrictMode>,
);
