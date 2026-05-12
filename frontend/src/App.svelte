<script lang="ts">
  declare const google: any;

  const API_URL = import.meta.env.VITE_API_URL as string;
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

  let token = $state<string | null>(null);
  let userEmail = $state<string | null>(null);
  let uploading = $state(false);
  let result = $state<{ url: string; expiresInDays: number } | null>(null);
  let error = $state<string | null>(null);
  let dragOver = $state(false);
  let copied = $state(false);

  function onGoogleSignIn(response: { credential: string }) {
    token = response.credential;
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    userEmail = payload.email;
  }

  $effect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: onGoogleSignIn,
      });
      google.accounts.id.renderButton(
        document.getElementById('google-signin-btn')!,
        { theme: 'outline', size: 'large' }
      );
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
        `${API_URL}/upload?filename=${encodeURIComponent(file.name)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/html',
            Authorization: `Bearer ${token}`,
          },
          body: file,
        }
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Upload failed (${res.status})${body ? ': ' + body : ''}`);
      }
      result = await res.json();
    } catch (e) {
      error = (e as Error).message;
    } finally {
      uploading = false;
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) upload(file);
  }

  function onFileInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) upload(file);
  }

  async function copyUrl() {
    if (!result?.url) return;
    await navigator.clipboard.writeText(result.url);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<div class="page">
  <span class="bg-glyph" aria-hidden="true">&lt;/&gt;</span>

  <header class="site-header">
    <div class="wordmark">
      <div class="wordmark-icon" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <rect width="30" height="30" rx="7" fill="#E8591A"/>
          <path d="M9 11l-4 4 4 4M21 11l4 4-4 4M16.5 8.5l-3 13" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div>
        <div class="wordmark-name">hostahtml</div>
        <div class="wordmark-sub">by Codurance</div>
      </div>
    </div>

    {#if userEmail}
      <div class="user-chip">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <circle cx="6.5" cy="4.5" r="2.5" stroke="currentColor" stroke-width="1.4"/>
          <path d="M1.5 11.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        {userEmail}
      </div>
    {/if}
  </header>

  <main class="main">
    {#if !token}
      <div class="signin-pane">
        <div class="eyebrow">HTML file sharing, simplified</div>
        <h1 class="hero-title">Drop once.<br><em>Share anywhere.</em></h1>
        <p class="hero-lead">Upload an HTML file and get a shareable link in seconds. Live for 7 days, no setup required.</p>
        <div class="signin-card">
          <p class="signin-prompt">Sign in with your Codurance account</p>
          <div id="google-signin-btn"></div>
        </div>
      </div>
    {:else}
      <div class="upload-pane">
        <div class="card">
          <div class="card-header">
            <span class="eyebrow-sm">Upload</span>
            <h2 class="card-title">Share an HTML file</h2>
          </div>

          <div
            class="dropzone"
            class:over={dragOver}
            class:uploading
            ondragover={(e) => { e.preventDefault(); dragOver = true; }}
            ondragleave={() => { dragOver = false; }}
            ondrop={onDrop}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && document.getElementById('file-input')?.click()}
          >
            {#if uploading}
              <div class="upload-state">
                <div class="spinner" aria-hidden="true"></div>
                <span class="dz-label">Uploading…</span>
              </div>
            {:else}
              <div class="dz-idle">
                <div class="dz-icon" aria-hidden="true">
                  <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                    <path d="M22 30V14M14 22l8-8 8 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8 36h28" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
                  </svg>
                </div>
                <span class="dz-label">Drop your <code>.html</code> file here</span>
                <label class="dz-browse">
                  or <span class="dz-link">browse to select</span>
                  <input id="file-input" type="file" accept=".html,text/html" onchange={onFileInput} />
                </label>
              </div>
            {/if}
          </div>

          {#if error}
            <div class="error-bar" role="alert">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true" style="flex-shrink:0">
                <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" stroke-width="1.4"/>
                <path d="M7.5 4.5v4M7.5 10.5v.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
              {error}
            </div>
          {/if}

          {#if result}
            <div class="result-card">
              <div class="result-top">
                <span class="result-badge">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <path d="M1.5 6.5l3.5 3.5 6.5-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Live for {result.expiresInDays} days
                </span>
                <button class="copy-btn" class:copied onclick={copyUrl}>
                  {#if copied}
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                      <path d="M1.5 6.5l3.5 3.5 6.5-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Copied!
                  {:else}
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                      <rect x="4" y="4" width="7.5" height="7.5" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
                      <path d="M1.5 9V2.5A1 1 0 012.5 1.5H9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                    </svg>
                    Copy link
                  {/if}
                </button>
              </div>
              <a class="result-url" href={result.url} target="_blank" rel="noopener noreferrer">{result.url}</a>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </main>

  <footer class="site-footer">
    <span>© 2025 Codurance Ltd</span>
    <span class="footer-sep">·</span>
    <span>HTML sharing tool</span>
  </footer>
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }

  :global(body) {
    font-family: 'Nunito Sans', 'Helvetica Neue', Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    background: #1A2535;
    min-height: 100vh;
  }

  /* PAGE */
  .page {
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr auto;
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(ellipse 60% 50% at 92% 8%, rgba(232,89,26,0.11) 0%, transparent 60%),
      radial-gradient(ellipse 45% 60% at 4% 92%, rgba(43,181,200,0.08) 0%, transparent 55%),
      #1A2535;
  }

  .bg-glyph {
    position: absolute;
    top: 50%;
    right: -3%;
    transform: translateY(-50%);
    font-size: clamp(9rem, 22vw, 22rem);
    font-weight: 800;
    font-family: 'DM Mono', monospace;
    color: rgba(232, 89, 26, 0.05);
    pointer-events: none;
    user-select: none;
    letter-spacing: -0.05em;
    line-height: 1;
  }

  /* HEADER */
  .site-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 2.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    position: relative;
    z-index: 10;
  }

  .wordmark {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
  }

  .wordmark-name {
    font-size: 17px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.03em;
    line-height: 1.15;
  }

  .wordmark-sub {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.35);
  }

  .user-chip {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.5);
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 100px;
    padding: 0.375rem 0.9rem;
    letter-spacing: 0.01em;
  }

  /* MAIN */
  .main {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3.5rem 1.5rem;
    position: relative;
    z-index: 10;
  }

  /* SIGN-IN STATE */
  .signin-pane {
    max-width: 540px;
    width: 100%;
    text-align: center;
  }

  .eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #E8591A;
    margin-bottom: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }

  .eyebrow::before,
  .eyebrow::after {
    content: '';
    display: inline-block;
    width: 24px;
    height: 2px;
    background: #E8591A;
    border-radius: 1px;
    opacity: 0.55;
  }

  .hero-title {
    font-size: clamp(2.75rem, 6vw, 5rem);
    font-weight: 800;
    color: #fff;
    line-height: 1.05;
    letter-spacing: -0.035em;
    margin-bottom: 1.25rem;
  }

  .hero-title em {
    font-style: normal;
    color: #E8591A;
  }

  .hero-lead {
    font-size: 17px;
    font-weight: 300;
    color: rgba(255,255,255,0.52);
    line-height: 1.65;
    margin-bottom: 3rem;
  }

  .signin-card {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    padding: 2rem 2.5rem;
    backdrop-filter: blur(8px);
  }

  .signin-prompt {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,0.45);
    letter-spacing: 0.01em;
    margin: 0;
  }

  /* UPLOAD STATE */
  .upload-pane {
    width: 100%;
    max-width: 520px;
  }

  .card {
    background: #fff;
    border-radius: 16px;
    padding: 2rem;
    box-shadow:
      0 0 0 1px rgba(0,0,0,0.06),
      0 4px 8px -2px rgba(0,0,0,0.1),
      0 24px 48px -8px rgba(0,0,0,0.38),
      0 0 80px 0 rgba(232,89,26,0.07);
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
    color: #E8591A;
    margin-bottom: 0.5rem;
  }

  .eyebrow-sm::before {
    content: '';
    display: inline-block;
    width: 16px;
    height: 2px;
    background: #E8591A;
    border-radius: 1px;
  }

  .card-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: #1A2535;
    letter-spacing: -0.025em;
    line-height: 1.2;
  }

  /* DROPZONE */
  .dropzone {
    border: 2px dashed #D4DCE6;
    border-radius: 10px;
    padding: 2.75rem 1.5rem;
    text-align: center;
    cursor: pointer;
    transition:
      border-color 0.18s ease,
      background 0.18s ease;
    outline: none;
  }

  .dropzone:focus-visible {
    outline: 3px solid #E8591A;
    outline-offset: 3px;
  }

  .dropzone.over {
    border-color: #E8591A;
    border-style: solid;
    background: rgba(232,89,26,0.03);
  }

  .dropzone.uploading {
    border-style: solid;
    border-color: #2BB5C8;
    background: rgba(43,181,200,0.03);
    cursor: default;
  }

  .upload-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #E6F8FA;
    border-top-color: #2BB5C8;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .dz-idle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
  }

  .dz-icon {
    color: #B8C8D6;
    margin-bottom: 0.25rem;
    transition: color 0.18s;
  }

  .over .dz-icon { color: #E8591A; }

  .dz-label {
    font-size: 15px;
    font-weight: 600;
    color: #4D6070;
  }

  .dz-label code {
    font-family: 'DM Mono', monospace;
    font-size: 13px;
    background: #F0F3F7;
    padding: 1px 6px;
    border-radius: 4px;
    color: #1A2535;
  }

  .dz-browse {
    font-size: 13px;
    color: #8CA0B4;
    cursor: pointer;
  }

  .dz-link {
    color: #E8591A;
    text-decoration: underline;
    text-underline-offset: 2px;
    font-weight: 700;
  }

  .dz-browse input[type='file'] { display: none; }

  /* ERROR */
  .error-bar {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: #FEF0E8;
    border: 1px solid rgba(232,89,26,0.2);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #C44A13;
    line-height: 1.5;
  }

  /* RESULT */
  .result-card {
    margin-top: 1.25rem;
    padding: 1.25rem;
    background: #F6F7F9;
    border-radius: 10px;
    border: 1px solid #E2E8EF;
  }

  .result-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    gap: 0.75rem;
  }

  .result-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #1E9E50;
    background: rgba(39,174,96,0.1);
    padding: 4px 10px;
    border-radius: 100px;
    white-space: nowrap;
  }

  .result-url {
    display: block;
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    color: #2D3F55;
    word-break: break-all;
    text-decoration: none;
    line-height: 1.65;
  }

  .result-url:hover {
    color: #E8591A;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 1.1rem;
    background: #E8591A;
    color: #fff;
    border: none;
    border-radius: 7px;
    cursor: pointer;
    font-family: 'Nunito Sans', inherit;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.02em;
    white-space: nowrap;
    transition:
      background 0.15s,
      transform 0.1s;
  }

  .copy-btn:hover { background: #C44A13; }
  .copy-btn:active { transform: scale(0.96); }
  .copy-btn.copied { background: #1E9E50; }

  /* FOOTER */
  .site-footer {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.625rem;
    padding: 1.25rem 2.5rem;
    border-top: 1px solid rgba(255,255,255,0.07);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: rgba(255,255,255,0.22);
  }

  .footer-sep { opacity: 0.4; }
</style>
