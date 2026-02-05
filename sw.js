/**
 * MK步骤图 PWA服务工作线程
 * 功能：主动缓存脚本/页面/图片、缓存自动更新、离线请求兜底
 * 部署：直接放到GitHub Pages仓库根目录，和index.html同级
 * 兼容：所有支持PWA的现代浏览器（Chrome/Firefox/Edge/Safari 14+）
 */
const CACHE_NAME = 'mk-step-parser-v1.0.0'; // 缓存版本号，更新代码时修改版本号即可触发缓存更新
const CACHE_FILES = [ // 需要离线缓存的核心文件，按实际项目补充
  '/',
  '/index.html',
  '/mk-step-parser.js', // 核心解析脚本
  // 可补充本地常用图片/资源，示例：
  // '/img/step1.png',
  // '/img/step2.png',
  // '/img/icon-192x192.png'
];

// 第一步：安装服务工作线程，缓存核心文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_FILES))
      .then(() => self.skipWaiting()) // 立即激活新的SW，无需等待旧SW关闭
  );
});

// 第二步：激活新SW，删除旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name)) // 删除非当前版本的旧缓存
      );
    }).then(() => self.clients.claim()) // 让新SW立即控制所有页面
  );
});

// 第三步：拦截网络请求，优先使用缓存，无缓存则请求网络，离线时兜底
self.addEventListener('fetch', (event) => {
  // 只缓存GET请求，忽略POST/其他请求
  if (event.request.method !== 'GET') return;
  // 忽略跨域请求（如远程图片/CDN资源），由浏览器自身缓存处理
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 缓存优先：有缓存直接返回，同时后台更新缓存
        if (cachedResponse) {
          // 后台异步请求最新资源，更新缓存
          fetch(event.request).then(fetchResponse => {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, fetchResponse);
            });
          });
          return cachedResponse;
        }

        // 无缓存则请求网络，请求失败时返回离线兜底（可选）
        return fetch(event.request).catch(() => {
          // 可自定义离线兜底页面/图片，示例：返回404提示
          return new Response('<h1>离线状态下，该资源未缓存</h1>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        });
      })
  );
});
