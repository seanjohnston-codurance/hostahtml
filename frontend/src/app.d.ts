/// <reference types="@sveltejs/kit" />

declare module "$env/static/public" {
  export const PUBLIC_API_URL: string;
  export const PUBLIC_AUTH_MODE: string;
  export const PUBLIC_GOOGLE_CLIENT_ID: string;
}

declare const google: {
  accounts: {
    id: {
      initialize: (opts: {
        client_id: string;
        callback: (r: { credential: string }) => void;
        /** Restrict account picker to this Google Workspace / Cloud Identity domain. */
        hd?: string;
      }) => void;
      renderButton: (
        el: HTMLElement,
        opts: { theme: string; size: string }
      ) => void;
    };
  };
};
