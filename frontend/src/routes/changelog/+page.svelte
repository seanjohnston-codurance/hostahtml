<script lang="ts">
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import SiteHeader from "$lib/components/SiteHeader.svelte";
  import type { Changelog } from "$lib/changelog";

  let { data }: { data: { changelog: Changelog } } = $props();
</script>

<svelte:head>
  <title>Changelog - hostahtml</title>
  <meta
    name="description"
    content="Recent user-facing HostaHTML updates and improvements."
  />
</svelte:head>

<div class="page">
  <span class="bg-glyph" aria-hidden="true">log</span>
  <SiteHeader userEmail={null} currentPath="/changelog" />

  <main class="main">
    <section class="hero" aria-labelledby="changelog-title">
      <a class="back-link" href="/">Back to uploader</a>
      <p class="eyebrow">Release notes</p>
      <h1 id="changelog-title">{data.changelog.title}</h1>
      <p class="intro">{data.changelog.intro}</p>
    </section>

    <section class="timeline" aria-label="Changelog entries">
      {#each data.changelog.entries as entry}
        <article class="entry">
          <div class="date-block">
            <time datetime={entry.date}>{entry.displayDate}</time>
          </div>

          <div class="entry-card">
            {#each entry.sections as section}
              <section class="change-section" aria-labelledby={`${entry.date}-${section.heading}`}>
                <h2 id={`${entry.date}-${section.heading}`}>{section.heading}</h2>
                <ul>
                  {#each section.items as item}
                    <li>{item}</li>
                  {/each}
                </ul>
              </section>
            {/each}
          </div>
        </article>
      {/each}
    </section>
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
    right: -1rem;
    font-family: "DM Mono", monospace;
    font-size: clamp(7rem, 19vw, 18rem);
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
    padding: 4.5rem 0 5rem;
  }

  .hero {
    max-width: 680px;
    margin-bottom: 3.25rem;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    margin-bottom: 2rem;
    color: rgba(255, 255, 255, 0.62);
    font-size: 0.83rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    text-decoration: none;
  }

  .back-link:hover {
    color: #fff;
  }

  .eyebrow {
    margin: 0 0 0.7rem;
    color: #e8591a;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    color: #fff;
    font-size: clamp(3rem, 8vw, 6.8rem);
    font-weight: 800;
    letter-spacing: -0.075em;
    line-height: 0.92;
  }

  .intro {
    max-width: 34rem;
    margin: 1.1rem 0 0;
    color: rgba(255, 255, 255, 0.62);
    font-size: clamp(1rem, 2vw, 1.18rem);
    font-weight: 600;
    line-height: 1.6;
  }

  .timeline {
    display: grid;
    gap: 1.35rem;
  }

  .entry {
    display: grid;
    grid-template-columns: 12rem minmax(0, 1fr);
    gap: 1.35rem;
    align-items: start;
  }

  .date-block {
    position: sticky;
    top: 1rem;
    padding: 1rem 0;
  }

  time {
    display: inline-flex;
    color: #fff;
    font-size: 0.88rem;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  .entry-card {
    position: relative;
    display: grid;
    gap: 1rem;
    padding: 1.35rem;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(255, 255, 255, 0.65);
    border-radius: 22px;
    box-shadow:
      0 24px 70px rgba(0, 0, 0, 0.28),
      0 0 80px rgba(232, 89, 26, 0.06);
  }

  .entry-card::before {
    content: "";
    position: absolute;
    inset: 0.8rem auto auto -0.44rem;
    width: 0.88rem;
    height: 0.88rem;
    border-radius: 50%;
    background: #e8591a;
    box-shadow: 0 0 0 8px rgba(232, 89, 26, 0.16);
  }

  .change-section {
    display: grid;
    gap: 0.75rem;
    padding: 0.95rem 1rem;
    background: #fff;
    border: 1px solid rgba(26, 37, 53, 0.07);
    border-radius: 15px;
  }

  h2 {
    margin: 0;
    color: #e8591a;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  ul {
    display: grid;
    gap: 0.65rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    position: relative;
    padding-left: 1.15rem;
    color: #304154;
    font-size: 0.98rem;
    font-weight: 650;
    line-height: 1.5;
  }

  li::before {
    content: "";
    position: absolute;
    top: 0.66rem;
    left: 0;
    width: 0.42rem;
    height: 0.42rem;
    border-radius: 50%;
    background: #2bb5c8;
  }

  @media (max-width: 720px) {
    .main {
      padding-top: 2.5rem;
    }

    .entry {
      grid-template-columns: 1fr;
      gap: 0.65rem;
    }

    .date-block {
      position: static;
      padding: 0;
    }

    .entry-card::before {
      display: none;
    }
  }
</style>
