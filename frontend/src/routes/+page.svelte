<script lang="ts">
  import type { UploadResponse } from "@hostahtml/shared";
  import { onMount } from "svelte";
  import { PUBLIC_API_URL } from "$env/static/public";
  import { authState, authToken, initialiseAuth } from "$lib/auth.svelte.js";
  import Dropzone from "$lib/components/Dropzone.svelte";
  import ResultCard from "$lib/components/ResultCard.svelte";
  import SignInPane from "$lib/components/SignInPane.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import SiteHeader from "$lib/components/SiteHeader.svelte";

  const GOOGLE_BUTTON_ID = "google-signin-btn";

  let uploading = $state(false);
  let result = $state<UploadResponse | null>(null);
  let error = $state<string | null>(null);
  let copied = $state(false);
  let selectedFile = $state<File | null>(null);
  let draft = $state(false);

  onMount(() => {
    initialiseAuth(GOOGLE_BUTTON_ID);
  });

  async function uploadSelectedFile() {
    const token = authToken();
    if (!token || !selectedFile) return;
    uploading = true;
    error = null;
    result = null;
    try {
      const query = `filename=${encodeURIComponent(selectedFile.name)}${draft ? "&draft=1" : ""}`;
      const res = await fetch(
        `${PUBLIC_API_URL}/upload?${query}`,
        {
          method: "POST",
          headers: {
            "Content-Type": contentTypeForUpload(selectedFile),
            Authorization: `Bearer ${token}`,
          },
          body: selectedFile,
        }
      );
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Upload failed (${res.status})${body ? ": " + body : ""}`);
      }
      result = (await res.json()) as UploadResponse;
    } catch (e) {
      error = (e as Error).message;
    } finally {
      uploading = false;
    }
  }

  function contentTypeForUpload(file: File): string {
    if (file.type) return file.type;
    if (file.name.toLowerCase().endsWith(".zip")) return "application/zip";
    return "text/html";
  }

  function selectFile(file: File) {
    selectedFile = file;
    error = null;
    result = null;
    copied = false;
  }

  async function copyUrl() {
    if (!result?.url) return;
    await navigator.clipboard.writeText(result.url);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }
</script>

<div class="page">
  <span class="bg-glyph" aria-hidden="true">&lt;/&gt;</span>

  <SiteHeader userEmail={authState.userEmail} currentPath="/" />

  <main class="main">
    {#if !authState.token}
      <SignInPane googleButtonId={GOOGLE_BUTTON_ID} />
    {:else}
      <div class="upload-pane">
        <div class="card">
          <div class="card-header">
            <span class="eyebrow-sm">Upload</span>
            <h2 class="card-title">Share an HTML file or zip bundle</h2>
          </div>

          <Dropzone {uploading} onFile={selectFile} />

          <div class="upload-options">
            {#if selectedFile}
              <div class="selected-file">
                <span class="selected-label">Selected file</span>
                <strong>{selectedFile.name}</strong>
              </div>
            {:else}
              <p class="selection-hint">Choose a file, then decide whether this share is a draft.</p>
            {/if}

            <label class="draft-toggle">
              <input type="checkbox" bind:checked={draft} disabled={uploading} />
              <span>
                <strong>Mark as draft</strong>
                <small>Shared pages will show a not-for-circulation watermark.</small>
              </span>
            </label>

            <button
              class="upload-btn"
              type="button"
              disabled={!selectedFile || uploading}
              onclick={uploadSelectedFile}
            >
              {#if uploading}
                Uploading…
              {:else if draft}
                Upload draft share
              {:else}
                Upload live share
              {/if}
            </button>
          </div>

          {#if error}
            <div class="error-bar" role="alert">
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                aria-hidden="true"
                style="flex-shrink:0"
              >
                <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" stroke-width="1.4" />
                <path
                  d="M7.5 4.5v4M7.5 10.5v.5"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
              {error}
            </div>
          {/if}

          {#if result}
            <ResultCard {result} {copied} onCopy={copyUrl} />
          {/if}
        </div>
      </div>
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
      radial-gradient(ellipse 60% 50% at 92% 8%, rgba(232, 89, 26, 0.11) 0%, transparent 60%),
      radial-gradient(ellipse 45% 60% at 4% 92%, rgba(43, 181, 200, 0.08) 0%, transparent 55%),
      #1a2535;
  }

  .bg-glyph {
    position: absolute;
    top: 50%;
    right: -3%;
    transform: translateY(-50%);
    font-size: clamp(9rem, 22vw, 22rem);
    font-weight: 800;
    font-family: "DM Mono", monospace;
    color: rgba(232, 89, 26, 0.05);
    pointer-events: none;
    user-select: none;
    letter-spacing: -0.05em;
    line-height: 1;
  }

  .main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    padding: 3.5rem 1.5rem;
    position: relative;
    z-index: 10;
  }

  .upload-pane {
    width: 100%;
    max-width: 520px;
  }

  .card {
    background: #fff;
    border-radius: 16px;
    padding: 2rem;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.06),
      0 4px 8px -2px rgba(0, 0, 0, 0.1),
      0 24px 48px -8px rgba(0, 0, 0, 0.38),
      0 0 80px 0 rgba(232, 89, 26, 0.07);
  }

  .card-header {
    margin-bottom: 1.5rem;
  }

  .eyebrow-sm {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: #e8591a;
    margin-bottom: 0.5rem;
  }

  .eyebrow-sm::before {
    content: "";
    display: inline-block;
    width: 16px;
    height: 2px;
    background: #e8591a;
    border-radius: 1px;
  }

  .card-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: #1a2535;
    letter-spacing: -0.025em;
    line-height: 1.2;
  }

  .upload-options {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    margin-top: 1rem;
  }

  .selected-file,
  .selection-hint {
    margin: 0;
    padding: 0.75rem 0.9rem;
    border-radius: 8px;
    background: #f6f7f9;
    border: 1px solid #e2e8ef;
    color: #4d6070;
    font-size: 13px;
  }

  .selected-file {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .selected-label {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #8ca0b4;
  }

  .selected-file strong {
    color: #1a2535;
    font-size: 14px;
    word-break: break-word;
  }

  .draft-toggle {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.9rem;
    border-radius: 10px;
    border: 1px solid #e2e8ef;
    color: #2d3f55;
    cursor: pointer;
  }

  .draft-toggle input {
    width: 1.1rem;
    height: 1.1rem;
    margin-top: 0.1rem;
    accent-color: #e8591a;
  }

  .draft-toggle strong,
  .draft-toggle small {
    display: block;
  }

  .draft-toggle strong {
    font-size: 14px;
    color: #1a2535;
  }

  .draft-toggle small {
    margin-top: 0.15rem;
    font-size: 12px;
    line-height: 1.45;
    color: #6b7f90;
  }

  .upload-btn {
    width: 100%;
    padding: 0.8rem 1rem;
    border: none;
    border-radius: 8px;
    background: #e8591a;
    color: #fff;
    cursor: pointer;
    font-family: "Nunito Sans", inherit;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.02em;
    transition:
      background 0.15s,
      transform 0.1s;
  }

  .upload-btn:hover:not(:disabled) {
    background: #c44a13;
  }

  .upload-btn:active:not(:disabled) {
    transform: scale(0.98);
  }

  .upload-btn:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .error-bar {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: #fef0e8;
    border: 1px solid rgba(232, 89, 26, 0.2);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #c44a13;
    line-height: 1.5;
  }
</style>
