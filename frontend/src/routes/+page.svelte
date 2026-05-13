<script lang="ts">
  import type { UploadResponse } from "@hostahtml/shared";
  import { onMount } from "svelte";
  import { PUBLIC_API_URL, PUBLIC_GOOGLE_CLIENT_ID } from "$env/static/public";
  import Dropzone from "$lib/components/Dropzone.svelte";
  import ResultCard from "$lib/components/ResultCard.svelte";
  import SignInPane from "$lib/components/SignInPane.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import SiteHeader from "$lib/components/SiteHeader.svelte";
  import { CODURANCE_GOOGLE_HOSTED_DOMAIN } from "$lib/coduranceGoogle.js";
  import { decodeGoogleCredentialPayload } from "$lib/decodeGoogleCredentialPayload.js";

  const GOOGLE_BUTTON_ID = "google-signin-btn";

  let token = $state<string | null>(null);
  let userEmail = $state<string | null>(null);
  let uploading = $state(false);
  let result = $state<UploadResponse | null>(null);
  let error = $state<string | null>(null);
  let copied = $state(false);

  function onGoogleSignIn(response: { credential: string }) {
    token = response.credential;
    const payload = decodeGoogleCredentialPayload(response.credential);
    userEmail = payload?.email ?? null;
  }

  onMount(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => {
      google.accounts.id.initialize({
        client_id: PUBLIC_GOOGLE_CLIENT_ID,
        callback: onGoogleSignIn,
        hd: CODURANCE_GOOGLE_HOSTED_DOMAIN,
      });
      const el = document.getElementById(GOOGLE_BUTTON_ID);
      if (el) {
        google.accounts.id.renderButton(el, { theme: "outline", size: "large" });
      }
    };
    document.head.appendChild(script);
    return () => script.remove();
  });

  async function upload(file: File) {
    if (!token) return;
    uploading = true;
    error = null;
    result = null;
    try {
      const res = await fetch(
        `${PUBLIC_API_URL}/upload?filename=${encodeURIComponent(file.name)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": contentTypeForUpload(file),
            Authorization: `Bearer ${token}`,
          },
          body: file,
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

  <SiteHeader {userEmail} />

  <main class="main">
    {#if !token}
      <SignInPane googleButtonId={GOOGLE_BUTTON_ID} />
    {:else}
      <div class="upload-pane">
        <div class="card">
          <div class="card-header">
            <span class="eyebrow-sm">Upload</span>
            <h2 class="card-title">Share an HTML file or zip bundle</h2>
          </div>

          <Dropzone {uploading} onFile={upload} />

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
    align-items: center;
    justify-content: center;
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
