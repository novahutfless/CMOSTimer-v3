const CACHE_PREFIX = 'cmostimer-';
const CACHE_NAME = `${CACHE_PREFIX}v3`;

const precacheAppShell = async () => {
	const cache = await caches.open(CACHE_NAME);
	const appUrl = new URL('./', self.registration.scope);
	const response = await fetch(new Request(appUrl, { cache: 'reload' }));
	if (!response.ok) throw new Error(`Unable to cache app shell (${response.status}).`);

	await cache.put(appUrl, response.clone());
	const html = await response.text();
	const referencedUrls = Array.from(html.matchAll(/(?:src|href)=["']([^"']+)["']/g), (match) => match[1]);
	const sameOriginUrls = Array.from(new Set(referencedUrls
		.map((value) => new URL(value, appUrl))
		.filter((url) => url.origin === self.location.origin)
		.map((url) => url.href)));

	await Promise.all(sameOriginUrls.map(async (url) => {
		const assetResponse = await fetch(new Request(url, { cache: 'reload' }));
		if (assetResponse.ok) await cache.put(url, assetResponse);
	}));
};

self.addEventListener('install', (event) => {
	event.waitUntil(precacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
	event.waitUntil((async () => {
		const cacheNames = await caches.keys();
		await Promise.all(
			cacheNames
				.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
				.map((name) => caches.delete(name))
		);
		await self.clients.claim();
	})());
});

const isStaticAsset = (request, url) => {
	const destination = request.destination;
	if (['script', 'style', 'font', 'image', 'worker', 'manifest'].includes(destination)) return true;
	if (url.pathname.includes('/assets/')) return true;
	return /\.(js|css|json|webmanifest|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$/i.test(url.pathname);
};

const networkFirst = async (event, cache) => {
	try {
		const networkResponse = await fetch(event.request);
		if (networkResponse && networkResponse.ok) {
			await cache.put(event.request, networkResponse.clone());
		}
		return networkResponse;
	} catch {
		const cached = await cache.match(event.request);
		if (cached) return cached;
		if (event.request.mode === 'navigate') {
			const appShell = await cache.match(new URL('./', self.registration.scope));
			if (appShell) return appShell;
		}
		throw new Error('Network unavailable and no cached response.');
	}
};

const staleWhileRevalidate = async (event, cache) => {
	const cached = await cache.match(event.request);
	const networkPromise = fetch(event.request)
		.then((networkResponse) => {
			if (networkResponse && networkResponse.ok) {
				void cache.put(event.request, networkResponse.clone());
			}
			return networkResponse;
		})
		.catch(() => null);

	if (cached) return cached;
	const networkResponse = await networkPromise;
	if (networkResponse) return networkResponse;
	throw new Error('Network unavailable and no cached response.');
};

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	if (!event.request.url.startsWith(self.location.origin)) return;

	const url = new URL(event.request.url);
	if (url.pathname.includes('/api/')) return;

	event.respondWith((async () => {
		const cache = await caches.open(CACHE_NAME);
		const isNavigation = event.request.mode === 'navigate' || event.request.destination === 'document';
		if (isNavigation) return networkFirst(event, cache);
		if (isStaticAsset(event.request, url)) return staleWhileRevalidate(event, cache);
		return networkFirst(event, cache);
	})());
});
