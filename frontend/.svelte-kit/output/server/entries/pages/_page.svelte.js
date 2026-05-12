import "clsx";
import { p as attr } from "../../chunks/attributes.js";
function SignInPane($$renderer, $$props) {
  let { googleButtonId } = $$props;
  $$renderer.push(`<div class="signin-pane svelte-1ubkrso"><div class="eyebrow svelte-1ubkrso">HTML file sharing, simplified</div> <h1 class="hero-title svelte-1ubkrso">Drop once.<br/><em class="svelte-1ubkrso">Share anywhere.</em></h1> <p class="hero-lead svelte-1ubkrso">Upload an HTML file and get a shareable link in seconds. Live for 7 days, no setup required.</p> <div class="signin-card svelte-1ubkrso"><p class="signin-prompt svelte-1ubkrso">Sign in with your Codurance account</p> <div${attr("id", googleButtonId)}></div></div></div>`);
}
function SiteFooter($$renderer) {
  $$renderer.push(`<footer class="site-footer svelte-4jwo3w"><span>© 2026 Codurance Ltd</span> <span class="footer-sep svelte-4jwo3w">·</span> <span>HTML sharing tool</span></footer>`);
}
function SiteHeader($$renderer, $$props) {
  $$renderer.push(`<header class="site-header svelte-a8kxe2"><div class="wordmark svelte-a8kxe2"><div class="wordmark-icon" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 30 30" fill="none"><rect width="30" height="30" rx="7" fill="#E8591A"></rect><path d="M9 11l-4 4 4 4M21 11l4 4-4 4M16.5 8.5l-3 13" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path></svg></div> <div><div class="wordmark-name svelte-a8kxe2">hostahtml</div> <div class="wordmark-sub svelte-a8kxe2">by Codurance</div></div></div> `);
  {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--></header>`);
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const GOOGLE_BUTTON_ID = "google-signin-btn";
    $$renderer2.push(`<div class="page svelte-1uha8ag"><span class="bg-glyph svelte-1uha8ag" aria-hidden="true">&lt;/></span> `);
    SiteHeader($$renderer2);
    $$renderer2.push(`<!----> <main class="main svelte-1uha8ag">`);
    {
      $$renderer2.push("<!--[0-->");
      SignInPane($$renderer2, { googleButtonId: GOOGLE_BUTTON_ID });
    }
    $$renderer2.push(`<!--]--></main> `);
    SiteFooter($$renderer2);
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  _page as default
};
