<script lang="ts">
  let {
    userEmail,
    currentPath = "/",
  }: {
    userEmail: string | null;
    currentPath?: string;
  } = $props();
</script>

<header class="site-header">
  <a class="wordmark" href="/">
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
  </a>

  <div class="header-actions">
    <nav class="site-nav" aria-label="Primary">
      <a
        class:active={currentPath === "/"}
        href="/"
        aria-current={currentPath === "/" ? "page" : undefined}
      >
        Uploader
      </a>
      <a
        class="updates-nav-item"
        class:active={currentPath === "/changelog"}
        href="/changelog"
        aria-current={currentPath === "/changelog" ? "page" : undefined}
      >
        What's new?
      </a>
      <a
        class:active={currentPath === "/dashboard"}
        href="/dashboard"
        aria-current={currentPath === "/dashboard" ? "page" : undefined}
      >
        Dashboard
      </a>
    </nav>

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
  </div>
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

  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .site-nav {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 100px;
  }

  .site-nav a {
    padding: 0.35rem 0.75rem;
    color: rgba(255, 255, 255, 0.58);
    border-radius: 100px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.01em;
    text-decoration: none;
    transition:
      background 0.18s ease,
      color 0.18s ease;
  }

  .site-nav a:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }

  .site-nav .updates-nav-item {
    color: #ffd8c8;
    background: rgba(232, 89, 26, 0.16);
    box-shadow: inset 0 0 0 1px rgba(232, 89, 26, 0.32);
  }

  .site-nav .updates-nav-item:hover {
    color: #fff;
    background: rgba(232, 89, 26, 0.26);
  }

  .site-nav a.active {
    background: #fff;
    color: #1a2535;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.18),
      0 0 24px rgba(255, 255, 255, 0.08);
  }

  .user-chip {
    position: fixed;
    right: 1.25rem;
    bottom: 1.25rem;
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    background: rgba(26, 37, 53, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 100px;
    padding: 0.375rem 0.9rem;
    letter-spacing: 0.01em;
    backdrop-filter: blur(14px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
  }

  @media (max-width: 640px) {
    .site-header {
      align-items: flex-start;
      flex-direction: column;
      gap: 1rem;
      padding: 1.25rem;
    }

    .header-actions {
      width: 100%;
      justify-content: space-between;
    }

    .user-chip {
      right: 1rem;
      bottom: 1rem;
      max-width: calc(100% - 2rem);
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
</style>
