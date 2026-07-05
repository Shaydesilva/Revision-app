// carioca service worker — v5
// WHITE-SCREEN POSTMORTEM (v4): navigations were cache-first, and the fetch
// fallback answered FAILED JS REQUESTS WITH index.html — so after iOS evicted
// part of the cache, the module loader received HTML and the app died white.
// Laws now:
//  1. NAVIGATIONS ARE NETWORK-FIRST (cache only as offline fallback) — a fresh
//     deploy is picked up on next launch, always.
//  2. Hashed assets stay cache-first (immutable), but a miss NEVER falls back
//     to HTML — fail honestly instead of poisoning the module loader.
const CACHE='carioca-v5'
const ASSETS=['/']

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}))
  self.skipWaiting()
})

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url)
  if(e.request.method!=='GET')return

  // API calls pass through untouched
  if(url.hostname.includes('supabase.co')||url.pathname.startsWith('/.netlify')){
    e.respondWith(fetch(e.request).catch(()=>new Response(JSON.stringify({error:'offline'}),{headers:{'Content-Type':'application/json'}})))
    return
  }

  // NAVIGATIONS: network-first — the deploy always wins; cache = offline net
  if(e.request.mode==='navigate'){
    e.respondWith(
      fetch(e.request).then(res=>{
        if(res.ok){const cl=res.clone();caches.open(CACHE).then(c=>c.put('/',cl))}
        return res
      }).catch(()=>caches.match('/'))
    )
    return
  }

  // ASSETS: cache-first (hashed = immutable), network fill, NO html fallback
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached)return cached
      return fetch(e.request).then(res=>{
        if(res.ok){const cl=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cl))}
        return res
      })
    })
  )
})
