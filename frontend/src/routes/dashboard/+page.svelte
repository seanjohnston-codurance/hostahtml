<script lang="ts">
  import type {
    ListSharesResponse,
    ShareSummary,
    UpdateShareResponse,
  } from "@hostahtml/shared";
  import { onMount } from "svelte";
  import { PUBLIC_API_URL } from "$env/static/public";
  import {
    authState,
    authToken,
    initialiseAuth,
    onAuthChange,
  } from "$lib/auth.svelte.js";
  import SignInPane from "$lib/components/SignInPane.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import SiteHeader from "$lib/components/SiteHeader.svelte";

  const GOOGLE_BUTTON_ID = "google-dashboard-signin-btn";

  let shares = $state<ShareSummary[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let busyToken = $state<string | null>(null);
  let confirmingDeleteToken = $state<string | null>(null);
  let loadedForToken = $state<string | null>(null);
  let sortedShares = $derived(
    [...shares].sort((a, b) => b.createdAt - a.createdAt)
  );

  onMount(() => {
    const unsubscribe = onAuthChange(loadSharesForToken);
    initialiseAuth(GOOGLE_BUTTON_ID);
    loadSharesForToken(authState.token);
    return unsubscribe;
  });

  function loadSharesForToken(token: string | null) {
    if (token && loadedForToken !== token) {
      loadedForToken = token;
      void loadShares();
    }
  }

  async function loadShares() {
    const token = authToken();
    if (!token) return;
    loading = true;
    error = null;
    try {
      const res = await fetch(`${PUBLIC_API_URL}/shares`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Could not load shares (${res.status})`);
      const body = (await res.json()) as ListSharesResponse;
      shares = body.shares;
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  async function toggleDraft(share: ShareSummary) {
    const token = authToken();
    if (!token || share.deleted) return;
    await mutateShare(share.token, {
      method: "PATCH",
      body: JSON.stringify({ draft: !share.draft }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async function deleteShare(share: ShareSummary) {
    const token = authToken();
    if (!token || share.deleted) return;
    confirmingDeleteToken = null;
    await mutateShare(share.token, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  function requestDeleteConfirmation(share: ShareSummary) {
    confirmingDeleteToken = share.token;
  }

  function cancelDeleteConfirmation() {
    confirmingDeleteToken = null;
  }

  async function mutateShare(token: string, init: RequestInit) {
    busyToken = token;
    error = null;
    try {
      const res = await fetch(`${PUBLIC_API_URL}/shares/${token}`, init);
      if (!res.ok) throw new Error(`Could not update share (${res.status})`);
      const body = (await res.json()) as UpdateShareResponse;
      replaceShare(body.share);
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busyToken = null;
    }
  }

  function replaceShare(updated: ShareSummary) {
    shares = shares.map((share) =>
      share.token === updated.token ? updated : share
    );
  }

  function formatDate(epochSeconds: number): string {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(epochSeconds * 1000));
  }
</script>

<svelte:head>
  <title>Dashboard - hostahtml</title>
  <meta
    name="description"
    content="View and manage your active HostaHTML shares."
  />
</svelte:head>

<div class="page">
  <span class="bg-glyph" aria-hidden="true">dash</span>
  <SiteHeader userEmail={authState.userEmail} currentPath="/dashboard" />

  <main class="main">
    {#if !authState.token}
      <SignInPane googleButtonId={GOOGLE_BUTTON_ID} />
    {:else}
      <section class="dashboard" aria-labelledby="dashboard-title">
        <div class="hero">
          <p class="eyebrow">Dashboard</p>
          <h1 id="dashboard-title">Your active shares</h1>
          <p>
            Manage current share links, switch draft state, and see deleted
            shares until they expire.
          </p>
        </div>

        {#if error}
          <div class="error-bar" role="alert">{error}</div>
        {/if}

        {#if loading}
          <div class="empty-card">Loading your shares…</div>
        {:else if sortedShares.length === 0}
          <div class="empty-card">No active shares yet.</div>
        {:else}
          <div class="share-list" aria-label="Your active shares">
            {#each sortedShares as share (share.token)}
              <article class="share-card" class:deleted={share.deleted}>
                <div class="thumbnail-slot" aria-hidden="true"></div>

                <div class="share-body">
                  <div class="share-content">
                    <p class="filename">{share.filename}</p>
                    <div class="title-line">
                      <h2>{share.title ?? share.filename}</h2>
                      {#if share.deleted}
                        <span class="deleted-status">Deleted</span>
                      {:else if share.draft}
                        <span class="badge draft-badge">Draft</span>
                      {:else}
                        <span class="badge live-badge">Live</span>
                      {/if}
                    </div>

                    <div class="url-row">
                      {#if share.deleted}
                        <span class="share-url deleted-url">{share.url}</span>
                      {:else}
                        <a
                          class="share-url"
                          href={share.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {share.url}
                        </a>
                      {/if}
                    </div>
                  </div>

                  {#if share.deleted}
                    <div class="share-footer">
                      <span class="expiry-text">Expires {formatDate(share.expiresAt)}</span>
                    </div>
                  {:else}
                    <div class="share-footer">
                      <span class="expiry-text">Expires {formatDate(share.expiresAt)}</span>
                      <div class="actions">
                        {#if confirmingDeleteToken === share.token}
                          <button
                            type="button"
                            class="danger-btn"
                            disabled={busyToken === share.token}
                            onclick={() => deleteShare(share)}
                          >
                            Confirm delete
                          </button>
                          <button
                            type="button"
                            class="secondary-btn"
                            disabled={busyToken === share.token}
                            onclick={cancelDeleteConfirmation}
                          >
                            Cancel
                          </button>
                        {:else}
                          <button
                            type="button"
                            class="secondary-btn"
                            disabled={busyToken === share.token}
                            onclick={() => toggleDraft(share)}
                          >
                            Mark {share.draft ? "live" : "as draft"}
                          </button>
                          <button
                            type="button"
                            class="danger-btn"
                            disabled={busyToken === share.token}
                            onclick={() => requestDeleteConfirmation(share)}
                          >
                            Delete
                          </button>
                        {/if}
                      </div>
                    </div>
                  {/if}
                </div>
              </article>
            {/each}
          </div>
        {/if}
      </section>
    {/if}
  </main>

  <SiteFooter />
</div>

<style>
  .page {
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr auto;
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(ellipse 65% 50% at 90% 4%, rgba(232, 89, 26, 0.14) 0%, transparent 60%),
      radial-gradient(ellipse 50% 65% at 6% 96%, rgba(43, 181, 200, 0.1) 0%, transparent 58%),
      linear-gradient(135deg, rgba(255, 255, 255, 0.025), transparent 34%),
      #1a2535;
  }

  .bg-glyph {
    position: absolute;
    top: 8rem;
    right: -2rem;
    font-family: "DM Mono", monospace;
    font-size: clamp(6rem, 17vw, 16rem);
    font-weight: 400;
    color: rgba(255, 255, 255, 0.035);
    letter-spacing: -0.12em;
    line-height: 0.8;
    pointer-events: none;
    user-select: none;
  }

  .main {
    position: relative;
    z-index: 10;
    width: min(980px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 3rem 0 4rem;
  }

  .dashboard {
    display: grid;
    gap: 1rem;
  }

  .hero {
    max-width: 680px;
    margin-bottom: 1rem;
  }

  .eyebrow {
    margin: 0 0 0.5rem;
    color: #e8591a;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1 {
    color: #fff;
    font-size: clamp(2rem, 5vw, 3.5rem);
    letter-spacing: -0.04em;
  }

  .hero p:last-child {
    margin-top: 0.75rem;
    color: rgba(255, 255, 255, 0.68);
    line-height: 1.6;
  }

  .share-list {
    display: grid;
    gap: 1rem;
  }

  .share-card,
  .empty-card {
    background: #fff;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.06),
      0 4px 8px -2px rgba(0, 0, 0, 0.1),
      0 24px 48px -8px rgba(0, 0, 0, 0.28);
  }

  .share-card {
    display: grid;
    grid-template-columns: 10rem minmax(0, 1fr);
    overflow: hidden;
    border-radius: 18px;
  }

  .empty-card {
    border-radius: 16px;
    padding: 1.25rem;
  }

  .share-card.deleted {
    opacity: 0.78;
  }

  .thumbnail-slot {
    position: relative;
    min-height: 9rem;
    background:
      linear-gradient(135deg, rgba(232, 89, 26, 0.09), rgba(43, 181, 200, 0.08)),
      #f1f5f9;
    border-right: 1px solid #dfe7ef;
  }

  .thumbnail-slot::before {
    content: "";
    position: absolute;
    inset: 1rem;
    border: 1px dashed #cbd6df;
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0 24%, transparent 24%),
      linear-gradient(90deg, rgba(232, 89, 26, 0.16) 0 18%, rgba(232, 89, 26, 0.06) 18% 36%, rgba(45, 63, 85, 0.05) 36%);
  }

  .share-body {
    display: grid;
    gap: 0.8rem;
    align-content: center;
    padding: 1rem;
    min-width: 0;
  }

  .share-content {
    min-width: 0;
  }

  .filename {
    color: #6b7f90;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    word-break: break-word;
  }

  .title-line {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.55rem;
    margin-top: 0.25rem;
  }

  h2 {
    color: #1a2535;
    font-size: 1.25rem;
    letter-spacing: -0.025em;
    line-height: 1.1;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    border-radius: 100px;
    padding: 0.25rem 0.65rem;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .live-badge {
    color: #1e9e50;
    background: rgba(39, 174, 96, 0.1);
  }

  .draft-badge {
    color: #c44a13;
    background: rgba(232, 89, 26, 0.12);
  }

  .deleted-status {
    color: #6b7280;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .url-row {
    margin-top: 0.35rem;
  }

  .share-url {
    display: block;
    color: #2d3f55;
    font-family: "DM Mono", monospace;
    font-size: 12px;
    line-height: 1.65;
    text-decoration: none;
    word-break: break-all;
  }

  a.share-url:hover {
    color: #e8591a;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .deleted-url {
    color: #7d8b99;
  }

  .share-footer {
    display: flex;
    gap: 0.8rem;
    align-items: center;
    justify-content: space-between;
  }

  .expiry-text {
    color: #6b7f90;
    font-size: 13px;
    font-weight: 800;
    line-height: 1.45;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .secondary-btn,
  .danger-btn {
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-family: "Nunito Sans", inherit;
    font-size: 12px;
    font-weight: 800;
    padding: 0.6rem 0.9rem;
  }

  .secondary-btn {
    background: #edf3f8;
    color: #2d3f55;
  }

  .danger-btn {
    background: #fef0e8;
    color: #c44a13;
  }

  .secondary-btn:disabled,
  .danger-btn:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .error-bar {
    padding: 0.75rem 1rem;
    background: #fef0e8;
    border: 1px solid rgba(232, 89, 26, 0.2);
    border-radius: 8px;
    color: #c44a13;
    font-size: 13px;
    font-weight: 700;
  }

  .empty-card {
    color: #4d6070;
    font-weight: 700;
  }

  @media (max-width: 640px) {
    .share-card {
      grid-template-columns: 1fr;
    }

    .thumbnail-slot {
      min-height: 8rem;
      border-right: 0;
      border-bottom: 1px solid #dfe7ef;
    }

    .share-footer,
    .actions {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
