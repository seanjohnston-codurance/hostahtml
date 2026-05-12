# 01 — SvelteKit migration + component split

Status: done

## Motivation

`frontend/src/App.svelte` is a ~270-line monolith with ~420 lines of scoped CSS, no tests, and no routing primitives. SvelteKit 2 gives us route conventions for free, and splitting the component makes each piece testable.

## Scope

- Replace the Vite SPA entrypoint with SvelteKit 2.x + `@sveltejs/adapter-static`. Keep `vite` and `@sveltejs/vite-plugin-svelte` as explicit dev dependencies because SvelteKit/Vitest still use them.
- **Stay on Svelte 5** (`package.json` already pins `svelte ^5.0.0`; `App.svelte` already uses `$state`/`$effect`). No downgrade.
- Configure adapter-static: `pages: 'dist', assets: 'dist', fallback: '200.html'`. The GitHub Actions deploy at `.github/workflows/deploy.yml` syncs `frontend/dist/` to S3, so `dist` is fixed.
- `src/routes/+layout.ts` exports `prerender: true`. Leave SSR enabled for the build-time prerender pass; this still deploys as static files and does not introduce a runtime SSR server.
- New files: `src/app.html` (replaces `index.html`), `src/app.css` (global reset + body), `src/routes/+layout.svelte`, `src/routes/+page.svelte`.
- Split `App.svelte` into `src/lib/components/`:
  - `SiteHeader.svelte` — wordmark + user chip. Props: `userEmail: string | null`.
  - `SignInPane.svelte` — hero + Google sign-in container. Props: `googleButtonId: string`.
  - `Dropzone.svelte` — drag/drop zone. Props: `uploading: boolean`, `onFile: (file: File) => void`. `dragOver` state internal.
  - `ResultCard.svelte` — URL + copy button. Props: `result`, `copied: boolean`, `onCopy`. Purely presentational.
  - `SiteFooter.svelte` — static copyright.
- `+page.svelte` owns all `$state`, the `$effect` that loads Google's GSI script, the `upload()` function, and the `copied` timer.
- Tests live next to components (`Foo.svelte` ↔ `Foo.test.ts`), Vitest + jsdom + `@testing-library/svelte` v5. **Red-first** for each component.

## Svelte 5 syntax requirements

- Props: `let { foo }: { foo: T } = $props();` — never `export let`
- State: `let x = $state(…);`
- Effects: `$effect(() => { …; return cleanup; });`
- Event handlers as attributes: `onclick={…}`, `ondrop={…}`
- Component children/layout content: use Svelte 5 snippets (`let { children } = $props();` + `{@render children()}`), not legacy `<slot />`.

## Out of scope

- Backend changes.
- New product features or new routes.

## Acceptance

- [ ] `npx svelte --version` reports 5.x.
- [ ] `npm run test -w frontend` — all component tests green.
- [ ] `npm run check -w frontend` — clean (also catches accidental Svelte 4 syntax).
- [ ] `npm run build -w frontend` emits `frontend/dist/index.html` for the prerendered `/` route and `frontend/dist/200.html` for CloudFront fallback routing.
- [ ] `grep -l '\$props\|\$state\|\$effect' frontend/src/lib/components/*.svelte frontend/src/routes/+page.svelte` lists every component that takes props or holds state.
- [ ] Manual: sign-in → upload → copy link flow works in `npm run dev -w frontend`.
- [ ] `src/main.ts`, `index.html`, `src/vite-env.d.ts`, `src/App.svelte` all deleted.

## Comments
