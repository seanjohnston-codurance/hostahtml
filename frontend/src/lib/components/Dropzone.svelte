<script lang="ts">
  let {
    uploading,
    onFile,
  }: {
    uploading: boolean;
    onFile: (file: File) => void;
  } = $props();

  let dragOver = $state(false);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) onFile(file);
  }

  function onFileInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) onFile(file);
  }
</script>

<div
  class="dropzone"
  class:over={dragOver}
  class:uploading={uploading}
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
  onkeydown={(e) =>
    e.key === "Enter" && document.getElementById("file-input")?.click()}
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
          <path
            d="M22 30V14M14 22l8-8 8 8"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M8 36h28"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            opacity="0.35"
          />
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

<style>
  .dropzone {
    border: 2px dashed #d4dce6;
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
    outline: 3px solid #e8591a;
    outline-offset: 3px;
  }

  .dropzone.over {
    border-color: #e8591a;
    border-style: solid;
    background: rgba(232, 89, 26, 0.03);
  }

  .dropzone.uploading {
    border-style: solid;
    border-color: #2bb5c8;
    background: rgba(43, 181, 200, 0.03);
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
    border: 3px solid #e6f8fa;
    border-top-color: #2bb5c8;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .dz-idle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
  }

  .dz-icon {
    color: #b8c8d6;
    margin-bottom: 0.25rem;
    transition: color 0.18s;
  }

  .over .dz-icon {
    color: #e8591a;
  }

  .dz-label {
    font-size: 15px;
    font-weight: 600;
    color: #4d6070;
  }

  .dz-label code {
    font-family: "DM Mono", monospace;
    font-size: 13px;
    background: #f0f3f7;
    padding: 1px 6px;
    border-radius: 4px;
    color: #1a2535;
  }

  .dz-browse {
    font-size: 13px;
    color: #8ca0b4;
    cursor: pointer;
  }

  .dz-link {
    color: #e8591a;
    text-decoration: underline;
    text-underline-offset: 2px;
    font-weight: 700;
  }

  .dz-browse input[type="file"] {
    display: none;
  }
</style>
