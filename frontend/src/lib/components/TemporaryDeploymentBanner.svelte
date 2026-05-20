<div class="banner" role="status">
  <span class="banner-tag" aria-hidden="true">Heads up</span>
  <p class="banner-text">
    This is a <strong>temporary deployment</strong> running in an AWS Playground, and is not guaranteed to be available long-term. 
    <br />
    It is also <strong>not yet ready for external documents</strong>; please keep shares internal for now.
  </p>
</div>

<style>
  .banner {
    position: relative;
    z-index: 10;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    width: min(980px, calc(100% - 2rem));
    margin: 1rem auto 0;
    padding: 0.75rem 1rem;
    background: rgba(232, 89, 26, 0.14);
    border: 1px solid rgba(232, 89, 26, 0.45);
    border-radius: 12px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
    color: #fff7f1;
    font-size: 0.88rem;
    line-height: 1.45;
  }

  .banner-tag {
    flex-shrink: 0;
    padding: 0.2rem 0.55rem;
    background: #e8591a;
    color: #fff;
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    border-radius: 999px;
  }

  .banner-text {
    margin: 0;
    flex: 1 1 18rem;
    color: rgba(255, 255, 255, 0.92);
    font-weight: 600;
  }

  .banner-text strong {
    color: #fff;
    font-weight: 800;
  }

  @media (max-width: 640px) {
    .banner {
      margin: 0.75rem 1rem 0;
      width: auto;
    }
  }
</style>
