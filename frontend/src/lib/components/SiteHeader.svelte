<script lang="ts">
  let { userEmail }: { userEmail: string | null } = $props();
</script>

<header class="site-header">
  <div class="wordmark">
    <div class="wordmark-icon" aria-hidden="true">
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
        <rect width="30" height="30" rx="7" fill="#E8591A" />
        <path
          d="M9 11l-4 4 4 4M21 11l4 4-4 4M16.5 8.5l-3 13"
          stroke="white"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
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
        <circle cx="6.5" cy="4.5" r="2.5" stroke="currentColor" stroke-width="1.4" />
        <path
          d="M1.5 11.5c0-2.76 2.24-5 5-5s5 2.24 5 5"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
        />
      </svg>
      {userEmail}
    </div>
  {/if}
</header>

<style>
  .site-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 2.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
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
    color: rgba(255, 255, 255, 0.35);
  }

  .user-chip {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 100px;
    padding: 0.375rem 0.9rem;
    letter-spacing: 0.01em;
  }
</style>
