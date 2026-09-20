import type {
  AuthConfig,
  BodyConfig,
  ExecuteResponsePayload,
  HttpMethod,
  KeyValue,
  SavedRequest,
} from "@restman/shared";
import { nanoid } from "nanoid";
import { create } from "zustand";

export interface RequestDraft {
  tabId: string;
  savedId: string | null;
  collectionId: string | null;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  auth: AuthConfig;
  body: BodyConfig;
  isDirty: boolean;
}

export interface TabState {
  draft: RequestDraft;
  response: ExecuteResponsePayload | null;
  isSending: boolean;
  error: string | null;
}

function emptyDraft(collectionId: string | null): RequestDraft {
  return {
    tabId: nanoid(),
    savedId: null,
    collectionId,
    name: "Untitled Request",
    method: "GET",
    url: "",
    params: [],
    headers: [],
    auth: { type: "none" },
    body: { type: "none" },
    isDirty: false,
  };
}

interface WorkspaceState {
  tabs: TabState[];
  activeTabId: string | null;
  openNewTab: (collectionId?: string | null) => void;
  openSavedRequest: (request: SavedRequest) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateDraft: (tabId: string, patch: Partial<RequestDraft>) => void;
  setResponse: (tabId: string, response: ExecuteResponsePayload | null) => void;
  setSending: (tabId: string, isSending: boolean) => void;
  setError: (tabId: string, error: string | null) => void;
  markSaved: (tabId: string, savedId: string, collectionId: string) => void;
  /** Drops every open tab, e.g. on sign-out, so nothing carries over to the next user. */
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openNewTab: (collectionId = null) => {
    const draft = emptyDraft(collectionId);
    const tab: TabState = { draft, response: null, isSending: false, error: null };
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: draft.tabId }));
  },

  openSavedRequest: (request) => {
    const existing = get().tabs.find((t) => t.draft.savedId === request.id);
    if (existing) {
      set({ activeTabId: existing.draft.tabId });
      return;
    }
    const draft: RequestDraft = {
      tabId: nanoid(),
      savedId: request.id,
      collectionId: request.collectionId,
      name: request.name,
      method: request.method,
      url: request.url,
      params: request.params,
      headers: request.headers,
      auth: request.auth,
      body: request.body,
      isDirty: false,
    };
    const tab: TabState = { draft, response: null, isSending: false, error: null };
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: draft.tabId }));
  },

  closeTab: (tabId) => {
    set((state) => {
      const tabs = state.tabs.filter((t) => t.draft.tabId !== tabId);
      const activeTabId =
        state.activeTabId === tabId ? (tabs.at(-1)?.draft.tabId ?? null) : state.activeTabId;
      return { tabs, activeTabId };
    });
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  updateDraft: (tabId, patch) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.draft.tabId === tabId ? { ...t, draft: { ...t.draft, ...patch, isDirty: true } } : t,
      ),
    }));
  },

  setResponse: (tabId, response) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.draft.tabId === tabId ? { ...t, response } : t)),
    }));
  },

  setSending: (tabId, isSending) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.draft.tabId === tabId ? { ...t, isSending } : t)),
    }));
  },

  setError: (tabId, error) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.draft.tabId === tabId ? { ...t, error } : t)),
    }));
  },

  markSaved: (tabId, savedId, collectionId) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.draft.tabId === tabId
          ? { ...t, draft: { ...t.draft, savedId, collectionId, isDirty: false } }
          : t,
      ),
    }));
  },

  reset: () => set({ tabs: [], activeTabId: null }),
}));
