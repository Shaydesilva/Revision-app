const CACHE='carioca-v1'
const ASSETS=['/','index.html','/src/main.jsx']

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE).then(cache=>
      fetch('/asset-manifest.json').then(r=>r.json()).then(manifest=>{
        const urls=Object.values(manifest.files||{}).filter(u=>!u.includes('map'))
        return cache.addAll([...new Set([...ASSETS,...urls])].filter(u=>!u.startsWith('http')))
      }).catch(()=>cache.addAll(ASSETS))
    )
  )
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
  if(url.hostname.includes('supabase.co')||url.pathname.startsWith('/.netlify')){
    e.respondWith(fetch(e.request).catch(()=>new Response(JSON.stringify({error:'offline'}),{headers:{'Content-Type':'application/json'}})))
    return
  }
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached)return cached
      return fetch(e.request).then(response=>{
        if(response.ok&&e.request.method==='GET'){
          const clone=response.clone()
          caches.open(CACHE).then(cache=>cache.put(e.request,clone))
        }
        return response
      }).catch(()=>caches.match('/'))
    })
  )
})
