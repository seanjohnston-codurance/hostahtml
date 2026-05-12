/// <reference types="@sveltejs/kit" />

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
