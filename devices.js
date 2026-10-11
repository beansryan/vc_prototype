/* Device names are manual design previews; automatic layout uses actual space. */
(function(g){
 const presets={iphone:{platform:'ios',w:402,h:874},'iphone-duo':{platform:'ios',duo:true,vbar:true,w:720,h:874},ipad:{platform:'ios',w:834,h:1194},android:{platform:'android',w:412,h:915},'android-foldable':{platform:'android',w:720,h:874},'android-tablet':{platform:'android',w:900,h:1200}};
 function platform(n){const ua=n.userAgent||'';if(/Android/i.test(ua))return 'android';if(/iPhone|iPad|iPod/i.test(ua)||(n.platform==='MacIntel'&&n.maxTouchPoints>1))return 'ios';return 'ios';}
 function resolve(n,w,h,override='auto',desktop=false){const p=presets[override];if(desktop&&p){w=p.w;h=p.h;}return {platform:p?p.platform:platform(n),duo:!!(p&&p.duo),vbar:!!(p&&p.vbar),w,h,size:w<600?'compact':w<840?'medium':'expanded'};}
 g.VCDevices={presets,platform,resolve};
})(window);
