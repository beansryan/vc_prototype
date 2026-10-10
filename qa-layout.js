/* Page matrix: actual App props, typography, clipping, sheets and active-motion samples. */
(async()=>{
 const wait=ms=>new Promise(r=>setTimeout(r,ms)); const report={tests:[],errors:[],motion:[]};
 addEventListener('error',e=>report.errors.push(e.message));await wait(3600);const L=VCApp._L;
 const state=p=>new Promise(r=>L.setState(p,r));
 const check=(name,pass,detail)=>report.tests.push({name,pass:!!pass,detail});
 await state({tier:'m12',splash:false,loading:false,iam:'',modal:''});
 for(const [w,h,platform,large] of [[402,874,'ios',false],[520,760,'ios',false],[760,820,'ios',false],[402,874,'ios',true],[412,915,'android',true]]) {
  VCApp.testLayout(w,h,{platform,textSize:large?'large':'default'});await wait(120);await state({bigText:false});
  const prefix=`${platform} ${w}×${h} ${large?'200%':'default'}`;
  check(prefix+' typography scale',getComputedStyle(L.scroller.parentElement).getPropertyValue('--vc-type-scale').trim()===(large?'2':''));
  check(prefix+' dimensions',L.props.w===w&&L.props.h===h&&L.scroller.parentElement.clientWidth===w);
  for(const tab of ['home','vouchers','account','cashback','spendreward','scan','receipts','inbox','settings','profile','plans','signup','login','otp','faq','stores','vew','vewbuy','deal','ecredits','voucher','contact','terms','subscribe','card','manage','guide','forgot','recap','challenges','spin','puzzle','tiles']){
   L.go(tab,true);await wait(380);clearTimeout(L._st);if(tab==='scan')await state({scan:'done'});
   const sc=L.scroller;const missing=Array.from(sc.querySelectorAll('[data-missing-action]:not(:disabled)')).map(el=>({text:el.innerText.slice(0,70),action:el.getAttribute('data-missing-action')}));check(prefix+' '+tab+' actions are wired',!missing.length,missing);check(prefix+' '+tab+' renders',!!sc.innerText.trim());check(prefix+' '+tab+' page width',sc.scrollWidth<=sc.clientWidth+1,{width:sc.clientWidth,content:sc.scrollWidth});
   const bad=Array.from(sc.querySelectorAll('button,span,h1,h2,p,input')).filter(el=>{
     const cs=getComputedStyle(el);if(!el.innerText?.trim()||cs.display==='none'||el.closest('[data-banners]')||el.querySelector('button,span,h1,h2,p,input')||cs.overflow==='hidden'||cs.display.includes('inline')&&!el.clientWidth)return false;
     return el.clientWidth>0&&el.scrollWidth>el.clientWidth+2;
   }).map(el=>({text:el.innerText.slice(0,65),width:el.clientWidth,content:el.scrollWidth}));
   check(prefix+' '+tab+' text fits',!bad.length,bad.slice(0,8));
  }
 }
 VCApp.testLayout(402,874,{platform:'ios'});await wait(120);await state({bigText:false,modal:'',scan:'idle'});L.go('home',true);await wait(400);
 // Sample the transition itself, unlike the earlier idle rAF sample.
 L.go('stores');let previous=performance.now();const intervals=[];await new Promise(resolve=>{const start=previous;function tick(now){intervals.push(now-previous);previous=now;if(now-start<330)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});
 report.motion.push({sample:'Active push in local browser; not hardware certification',frames:intervals.length,meanMs:intervals.reduce((a,b)=>a+b,0)/intervals.length,maxMs:Math.max(...intervals)});
 await wait(100);L.back();await wait(340);
 await state({modal:'memberqr'});await wait(40);check('Modal animates on entry',document.getAnimations().length>0);await wait(350);await state({modal:''});await wait(250);check('Modal exit cleans up',!document.querySelector('[data-fx]'));
 check('No runtime errors',report.errors.length===0,report.errors);report.passed=report.tests.filter(t=>t.pass).length;report.total=report.tests.length;
 const pre=document.createElement('pre');pre.id='qa-report';pre.textContent=JSON.stringify(report,null,2);pre.style.cssText='position:fixed;inset:0;overflow:auto;z-index:99999;background:white;color:black;padding:20px';document.body.append(pre);
})();
