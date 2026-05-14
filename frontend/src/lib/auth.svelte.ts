import { dev } from "$app/environment";
import {
  PUBLIC_AUTH_MODE,
  PUBLIC_GOOGLE_CLIENT_ID,
} from "$env/static/public";
import { CODURANCE_GOOGLE_HOSTED_DOMAIN } from "$lib/coduranceGoogle.js";
import { decodeGoogleCredentialPayload } from "$lib/decodeGoogleCredentialPayload.js";

const SESSION_KEY = "hostahtml.auth";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

type StoredAuth = {
  token: string;
  userEmail: string | null;
};

type AuthState = {
  token: string | null;
  userEmail: string | null;
};

export const authState = $state<AuthState>({
  token: null,
  userEmail: null,
});

let googleScriptPromise: Promise<void> | null = null;
const authListeners = new Set<(token: string | null) => void>();

export function initialiseAuth(googleButtonId: string): void {
  if (isLocalAuth()) {
    setAuth("dev-token", "local@hostahtml.dev");
    return;
  }

  restoreSession();
  if (authState.token) return;

  void loadGoogleScript().then(() => {
    google.accounts.id.initialize({
      client_id: PUBLIC_GOOGLE_CLIENT_ID,
      callback: (response) => {
        const payload = decodeGoogleCredentialPayload(response.credential);
        setAuth(response.credential, payload?.email ?? null);
      },
      hd: CODURANCE_GOOGLE_HOSTED_DOMAIN,
    });

    const el = document.getElementById(googleButtonId);
    if (el) {
      google.accounts.id.renderButton(el, { theme: "outline", size: "large" });
    }
  });
}

export function authToken(): string | null {
  if (!isLocalAuth() && authState.token && isExpired(authState.token)) {
    clearAuth();
  }
  return authState.token;
}

export function onAuthChange(
  listener: (token: string | null) => void
): () => void {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

function setAuth(token: string, userEmail: string | null): void {
  authState.token = token;
  authState.userEmail = userEmail;
  if (!isLocalAuth() && typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, userEmail }));
  }
  notifyAuthListeners();
}

function restoreSession(): void {
  if (typeof sessionStorage === "undefined") return;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return;

  try {
    const stored = JSON.parse(raw) as StoredAuth;
    if (isExpired(stored.token)) {
      clearAuth();
      return;
    }
    authState.token = stored.token;
    authState.userEmail = stored.userEmail;
  } catch {
    clearAuth();
  }
}

function clearAuth(): void {
  authState.token = null;
  authState.userEmail = null;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(SESSION_KEY);
  }
  notifyAuthListeners();
}

export function resetAuthForTest(): void {
  clearAuth();
  googleScriptPromise = null;
  authListeners.clear();
}

function notifyAuthListeners(): void {
  for (const listener of authListeners) {
    listener(authState.token);
  }
}

function isExpired(token: string): boolean {
  const payload = decodeGoogleCredentialPayload(token);
  if (!payload?.exp) return false;
  return payload.exp <= Math.floor(Date.now() / 1000);
}

function isLocalAuth(): boolean {
  return dev && PUBLIC_AUTH_MODE === "local";
}

function loadGoogleScript(): Promise<void> {
  googleScriptPromise ??= new Promise((resolve) => {
    const existing = document.head.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_SCRIPT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      if (typeof google !== "undefined") resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return googleScriptPromise;
}
