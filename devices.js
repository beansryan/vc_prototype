/* Device names are manual design previews; automatic layout uses actual space. */
(function(g){
 const presets={iphone:{platform:'ios',w:402,h:874,frame:'iphone',label:'iPhone'},'iphone-duo':{platform:'ios',duo:true,vbar:true,w:669,h:951,frame:'duo',label:'iPhone Duo'},ipad:{platform:'ios',w:834,h:1210,frame:'ipad',label:'iPad Pro 11-inch'},android:{platform:'android',w:412,h:915,frame:'galaxy',label:'Galaxy S26 Ultra'},'android-foldable':{platform:'android',w:960,h:720,frame:'fold',label:'Galaxy Z Fold8'},'android-foldable-ultra':{platform:'android',w:720,h:800,frame:'fold-ultra',label:'Galaxy Z Fold8 Ultra'},'android-tablet':{platform:'android',w:1480,h:924,frame:'tab',label:'Galaxy Tab S12 Ultra'}};
 function platform(n){const ua=n.userAgent||'';if(/Android/i.test(ua))return 'android';if(/iPhone|iPad|iPod/i.test(ua)||(n.platform==='MacIntel'&&n.maxTouchPoints>1))return 'ios';return 'ios';}
 function resolve(n,w,h,override='auto',desktop=false){const p=presets[override];if(desktop&&p){w=p.w;h=p.h;}return {platform:p?p.platform:platform(n),duo:!!(p&&p.duo),vbar:!!(p&&p.vbar),w,h,size:w<600?'compact':w<840?'medium':'expanded'};}
 function preview(device,posture='open',orientation){
  const p={...(presets[device]||presets.iphone)};
  if(device==='iphone-duo'&&posture==='closed'){p.w=466;p.h=678;p.frame='duo-closed';p.label+=' · closed';return p;}
  else if(device==='iphone-duo')p.label+=' · open';
  orientation=orientation||(p.w>p.h?'landscape':'portrait');
  const rotatable=['iphone-duo','ipad','android-foldable','android-foldable-ultra','android-tablet'].includes(device);
  if(rotatable){const short=Math.min(p.w,p.h),long=Math.max(p.w,p.h);p.w=orientation==='landscape'?long:short;p.h=orientation==='landscape'?short:long;p.label+=' · '+orientation;}
  return p;
 }
 g.VCDevices={presets,platform,resolve,preview};
})(window);
