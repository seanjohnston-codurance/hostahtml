import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.D50h3gK5.js","_app/immutable/chunks/BpxQ12zc.js","_app/immutable/chunks/DMqyKtgr.js","_app/immutable/chunks/BPJklaHr.js"];
export const stylesheets = ["_app/immutable/assets/0.1Rmm2Unl.css"];
export const fonts = [];
