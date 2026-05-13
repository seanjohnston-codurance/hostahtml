import "clsx";
import { a1 as attr } from "../../chunks/renderer.js";
import { S as SiteHeader, a as SiteFooter } from "../../chunks/SiteHeader.js";
function SignInPane($$renderer, $$props) {
  let { googleButtonId } = $$props;
  $$renderer.push(`<div class="signin-pane svelte-1ubkrso"><div class="eyebrow svelte-1ubkrso">HTML file sharing, simplified</div> <h1 class="hero-title svelte-1ubkrso">Drop once.<br/><em class="svelte-1ubkrso">Share anywhere.</em></h1> <p class="hero-lead svelte-1ubkrso">Upload an HTML file and get a shareable link in seconds. Live for 7 days, no setup required.</p> <div class="signin-card svelte-1ubkrso"><p class="signin-prompt svelte-1ubkrso">Sign in with your Codurance account</p> <div${attr("id", googleButtonId)}></div></div></div>`);
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const GOOGLE_BUTTON_ID = "google-signin-btn";
    let userEmail = null;
    $$renderer2.push(`<div class="page svelte-1uha8ag"><span class="bg-glyph svelte-1uha8ag" aria-hidden="true">&lt;/></span> `);
    SiteHeader($$renderer2, { userEmail, currentPath: "/" });
    $$renderer2.push(`<!----> <main class="main svelte-1uha8ag">`);
    {
      $$renderer2.push("<!--[0-->");
      SignInPane($$renderer2, { googleButtonId: GOOGLE_BUTTON_ID });
    }
    $$renderer2.push(`<!--]--> <a class="updates-link svelte-1uha8ag" href="/changelog">See what's new</a></main> `);
    SiteFooter($$renderer2);
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  _page as default
};
