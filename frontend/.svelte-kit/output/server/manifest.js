export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([".gitkeep"]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.CzRwRw-0.js",app:"_app/immutable/entry/app.hcbP5aia.js",imports:["_app/immutable/entry/start.CzRwRw-0.js","_app/immutable/chunks/CBpnTW07.js","_app/immutable/chunks/BP9TJaN3.js","_app/immutable/chunks/CjoAnE_0.js","_app/immutable/entry/app.hcbP5aia.js","_app/immutable/chunks/BP9TJaN3.js","_app/immutable/chunks/NWQ8pGRW.js","_app/immutable/chunks/C66fgR4u.js","_app/immutable/chunks/CjoAnE_0.js","_app/immutable/chunks/DpiFCpY_.js","_app/immutable/chunks/BLhNMCO6.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js'))
		],
		remotes: {
			
		},
		routes: [
			
		],
		prerendered_routes: new Set(["/","/changelog","/changelog/__data.json"]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
