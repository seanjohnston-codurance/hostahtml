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
		client: {start:"_app/immutable/entry/start.CxjVq_0_.js",app:"_app/immutable/entry/app.Bd9Yjz3F.js",imports:["_app/immutable/entry/start.CxjVq_0_.js","_app/immutable/chunks/C8bJ7vBe.js","_app/immutable/chunks/DMqyKtgr.js","_app/immutable/chunks/De7jbtvQ.js","_app/immutable/entry/app.Bd9Yjz3F.js","_app/immutable/chunks/DMqyKtgr.js","_app/immutable/chunks/D30ehQjL.js","_app/immutable/chunks/BpxQ12zc.js","_app/immutable/chunks/De7jbtvQ.js","_app/immutable/chunks/Dv-4QprU.js","_app/immutable/chunks/BPJklaHr.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
