<script lang="ts">
  let { googleButtonId }: { googleButtonId: string } = $props();
</script>

<div class="signin-pane">
  <div class="eyebrow">HTML file sharing, simplified</div>
  <h1 class="hero-title">Drop once.<br /><em>Share anywhere.</em></h1>
  <p class="hero-lead">
    Upload an HTML file and get a shareable link in seconds. Live for 7 days, no setup required.
  </p>
  <div class="signin-card">
    <p class="signin-prompt">Sign in with your Codurance account</p>
    <div id={googleButtonId}></div>
  </div>
</div>

<style>
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
    color: #e8591a;
    margin-bottom: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }

  .eyebrow::before,
  .eyebrow::after {
    content: "";
    display: inline-block;
    width: 24px;
    height: 2px;
    background: #e8591a;
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
    color: #e8591a;
  }

  .hero-lead {
    font-size: 17px;
    font-weight: 300;
    color: rgba(255, 255, 255, 0.52);
    line-height: 1.65;
    margin-bottom: 3rem;
  }

  .signin-card {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    padding: 2rem 2.5rem;
    backdrop-filter: blur(8px);
  }

  .signin-prompt {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 0.01em;
    margin: 0;
  }
</style>
