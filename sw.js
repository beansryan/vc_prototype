const CACHE = 'vc-prototype20-diagnostic-v1';
const FILES = ["./", ".nojekyll", "PREACT-LICENSE", "app.v20.js", "assets/02497ad60ef8868f1f054f4931d74ced.svg", "assets/45fa7290869b5e4143ac98d29a13cc15.jpg", "assets/6fe05eb34630aab2d666ccdbe015499d.svg", "assets/756b2a9aa853d0e4aa0b55ee8f8967cf.jpg", "assets/7ee051c627c52b393a4afacbc93f2a61.jpg", "assets/82742be729685586a8cb9b4ff6ea9b79.jpg", "assets/82fa59553c24917cdac0e232c4cba025.jpg", "assets/9301a8af468b613aff138c7fcdbdb4c4.svg", "assets/9f6fb2129ee9a4e86a9db06c4a68b1aa.svg", "assets/a40e3b905636fdec38f3a1c19ed8256d.jpg", "assets/b5ef8f8a7ae1d1dffe0456083ba922a6.jpg", "assets/c372f21227c6f23fb77171af49c8d153.jpg", "assets/d140cb8800b18fcadd308cd279ed04f7.jpg", "assets/d7a43e7de2202787a029cc8d42735af5.jpg", "assets/e00cc3079f606a4b66bbb23a224b85e6.jpg", "assets/eb79d24a3a3b837fc614d883978ea6f6.jpg", "assets/ebf36c811a2f1ed2b15bd6c09e81001d.svg", "assets/f4f1fe1c497a6645f7a23a31777d8539.jpg", "assets/f7b5ee2a9a440913f685e18f56a1b0d4.jpg", "fx.v20.js", "icons/icon-1024.png", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "index.html", "main.v20.js", "manifest.webmanifest", "preact.min.v20.js", "runtime.v20.js"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('vc-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (e.request.mode === 'navigate') {
      try {
        const response = await fetch(e.request, { cache: 'no-store' });
        if (!response.ok) throw new Error('Navigation unavailable');
        await cache.put('./', response.clone());
        return response;
      } catch (error) {
        const offline = await cache.match('./');
        return offline || Response.error();
      }
    }
    return (await cache.match(e.request)) || fetch(e.request);
  })());
});
