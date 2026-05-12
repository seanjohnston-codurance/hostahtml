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

<main>
  <h1>hostahtml</h1>

  {#if !token}
    <p class="subtitle">Sign in to upload and share HTML files.</p>
    <div id="google-signin-btn"></div>
  {:else}
    <p class="user">Signed in as {userEmail}</p>

    <div
      class="dropzone"
      class:over={dragOver}
      ondragover={(e) => {
        e.preventDefault();
        dragOver = true;
      }}
      ondragleave={() => {
        dragOver = false;
      }}
      ondrop={onDrop}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && document.getElementById('file-input')?.click()}
    >
      {#if uploading}
        <span class="hint">Uploading…</span>
      {:else}
        <span class="hint">Drop an HTML file here</span>
        <label class="browse">
          or <span class="link">browse</span>
          <input id="file-input" type="file" accept=".html,text/html" onchange={onFileInput} />
        </label>
      {/if}
    </div>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    {#if result}
      <div class="result">
        <p class="result-label">Live for {result.expiresInDays} days:</p>
        <a href={result.url} target="_blank" rel="noopener noreferrer">{result.url}</a>
        <button onclick={copyUrl}>{copied ? 'Copied!' : 'Copy link'}</button>
      </div>
    {/if}
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f0f0f;
    color: #e8e8e8;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  main {
    width: min(480px, 90vw);
    padding: 2rem 0;
  }

  h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
    color: #f5a623;
    letter-spacing: -0.5px;
  }

  .subtitle {
    color: #888;
    margin: 0 0 1.5rem;
    font-size: 0.9rem;
  }

  .user {
    font-size: 0.8rem;
    color: #666;
    margin: 0 0 1.25rem;
  }

  .dropzone {
    border: 2px dashed #333;
    border-radius: 10px;
    padding: 3rem 2rem;
    text-align: center;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .dropzone:focus {
    outline: 2px solid #f5a623;
    outline-offset: 2px;
  }

  .dropzone.over {
    border-color: #f5a623;
    background: rgba(245, 166, 35, 0.04);
  }

  .hint {
    color: #aaa;
    font-size: 0.95rem;
  }

  .browse {
    font-size: 0.875rem;
    color: #666;
    cursor: pointer;
  }

  .link {
    color: #f5a623;
    text-decoration: underline;
  }

  .browse input[type='file'] {
    display: none;
  }

  .error {
    color: #e05c5c;
    margin-top: 1rem;
    font-size: 0.875rem;
  }

  .result {
    margin-top: 1.5rem;
    padding: 1rem 1.25rem;
    background: #1a1a1a;
    border-radius: 8px;
    border: 1px solid #2a2a2a;
  }

  .result-label {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .result a {
    display: block;
    color: #f5a623;
    word-break: break-all;
    font-size: 0.8rem;
    margin-bottom: 0.75rem;
    text-decoration: none;
  }

  .result a:hover {
    text-decoration: underline;
  }

  .result button {
    padding: 0.4rem 1rem;
    background: #f5a623;
    color: #000;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    transition: opacity 0.15s;
  }

  .result button:hover {
    opacity: 0.85;
  }
</style>
