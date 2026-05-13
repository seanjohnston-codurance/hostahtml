import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.Ck_pO5nf.js","_app/immutable/chunks/C66fgR4u.js","_app/immutable/chunks/BP9TJaN3.js","_app/immutable/chunks/BLhNMCO6.js","_app/immutable/chunks/1Ruqt8yF.js"];
export const stylesheets = ["_app/immutable/assets/0.1Rmm2Unl.css"];
export const fonts = [];
