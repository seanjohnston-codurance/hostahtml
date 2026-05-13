<script lang="ts">
  import type { UploadResponse } from "@hostahtml/shared";

  let {
    result,
    copied,
    onCopy,
  }: {
    result: UploadResponse;
    copied: boolean;
    onCopy: () => void | Promise<void>;
  } = $props();
</script>

<div class="result-card">
  <div class="result-top">
    <span class="result-badge" class:draft={result.draft === true}>
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <path
          d="M1.5 6.5l3.5 3.5 6.5-6.5"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      {#if result.draft}
        Draft / not for circulation
      {:else}
        Live for {result.expiresInDays} days
      {/if}
    </span>
    <button class="copy-btn" class:copied={copied} onclick={onCopy} type="button">
      {#if copied}
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path
            d="M1.5 6.5l3.5 3.5 6.5-6.5"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Copied!
      {:else}
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <rect
            x="4"
            y="4"
            width="7.5"
            height="7.5"
            rx="1.5"
            stroke="currentColor"
            stroke-width="1.4"
          />
          <path
            d="M1.5 9V2.5A1 1 0 012.5 1.5H9"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
          />
        </svg>
        Copy link
      {/if}
    </button>
  </div>
  <a class="result-url" href={result.url} target="_blank" rel="noopener noreferrer">{result.url}</a>
</div>

<style>
  .result-card {
    margin-top: 1.25rem;
    padding: 1.25rem;
    background: #f6f7f9;
    border-radius: 10px;
    border: 1px solid #e2e8ef;
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
    color: #1e9e50;
    background: rgba(39, 174, 96, 0.1);
    padding: 4px 10px;
    border-radius: 100px;
    white-space: nowrap;
  }

  .result-badge.draft {
    color: #c44a13;
    background: rgba(232, 89, 26, 0.12);
  }

  .result-url {
    display: block;
    font-family: "DM Mono", monospace;
    font-size: 12px;
    color: #2d3f55;
    word-break: break-all;
    text-decoration: none;
    line-height: 1.65;
  }

  .result-url:hover {
    color: #e8591a;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 1.1rem;
    background: #e8591a;
    color: #fff;
    border: none;
    border-radius: 7px;
    cursor: pointer;
    font-family: "Nunito Sans", inherit;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.02em;
    white-space: nowrap;
    transition:
      background 0.15s,
      transform 0.1s;
  }

  .copy-btn:hover {
    background: #c44a13;
  }
  .copy-btn:active {
    transform: scale(0.96);
  }
  .copy-btn.copied {
    background: #1e9e50;
  }
</style>
