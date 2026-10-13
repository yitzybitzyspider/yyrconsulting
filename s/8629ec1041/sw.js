var C='mba202-v1';var F=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-512.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(F);}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k.indexOf('mba202-')===0&&k!==C;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(e){var r=e.request;if(r.method!=='GET')return;
 if(r.mode==='navigate'){e.respondWith(fetch(r).then(function(res){var cp=res.clone();caches.open(C).then(function(c){c.put('./index.html',cp);});return res;}).catch(function(){return caches.match('./index.html',{ignoreSearch:true});}));return;}
 e.respondWith(caches.match(r,{ignoreSearch:true}).then(function(m){return m||fetch(r);}));});