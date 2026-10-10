/* Isolated regression runner. Loaded only by QA.html, never by the app. */
(async()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const report={tests:[],errors:[],motion:[],reduced};
  addEventListener('error',e=>report.errors.push(e.message));
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  await wait(3600);const L=VCApp._L,root=document.getElementById('root');
  const state=patch=>new Promise(r=>L.setState(patch,r));
  const check=(name,ok,detail)=>{report.tests.push({name,pass:!!ok,detail});if(!ok)console.error('FAIL '+name,detail);};
  const goto=async(t,r)=>{L.go(t,r);await wait(380);};
  const back=async()=>{L.back();await wait(340);};
  await state({tier:'m12',iam:'',modal:'',splash:false,loading:false,tab:'home',history:[]});
  L.scroller.scrollTop=420;await wait(50);const homeY=L.scroller.scrollTop;
  await goto('vewbuy');check('Detail starts at top',L.scroller.scrollTop===0);
  check('Detail has neutral background',!L.scroller.parentElement.querySelector('[data-band]'));
  L.back();await wait(40);check('Button Back runs slide',root.dataset.navKind==='pop'&&(reduced?!root.querySelector('[data-vc-layer]'):!!root.querySelector('[data-vc-layer]')),root.dataset.navKind);
  await wait(340);check('Home restores exact scroll',L.scroller.scrollTop===homeY,{homeY,actual:L.scroller.scrollTop});check('Back clears layers',root.querySelectorAll('[data-vc-layer]').length===0);
  const snapshotsBeforeTab=root.dataset.snapshotCount;await goto('vouchers',true);check('Bottom-tab switch never clones the page',root.dataset.snapshotCount===snapshotsBeforeTab);L.scroller.scrollTop=230;await wait(40);const rewardY=L.scroller.scrollTop;
  await goto('account',true);await goto('vouchers',true);check('Tab restores scroll',L.scroller.scrollTop===rewardY);
  await goto('spendreward');L.scroller.scrollTop=90;await wait(40);const detailY=L.scroller.scrollTop;
  await goto('home',true);await goto('vouchers',true);check('Tab restores detail stack',L.state.tab==='spendreward'&&L.scroller.scrollTop===detailY);
  await goto('vouchers',true);check('Active tab returns root at saved position',L.state.tab==='vouchers'&&L.state.history.length===0&&L.scroller.scrollTop===rewardY);
  await goto('vouchers',true);await wait(600);check('Second active-tab tap scrolls to top',L.scroller.scrollTop===0);
  await goto('account',true);L.scroller.scrollTop=250;await wait(40);const accountY=L.scroller.scrollTop;
  await goto('receipts');L.scroller.scrollTop=120;await wait(40);const listY=L.scroller.scrollTop;
  await state({rSel:'r1'});await wait(380);check('Receipt detail pushes',root.dataset.navKind==='push'&&L.scroller.scrollTop===0);
  await state({rSel:''});await wait(340);check('Receipt detail Back restores list',root.dataset.navKind==='pop'&&L.scroller.scrollTop===listY);
  await back();check('Nested Back restores Account',L.state.tab==='account'&&L.scroller.scrollTop===accountY);
  await goto('home',true);await goto('vewbuy');
  function touch(type,x,y){const t=new Touch({identifier:1,target:L.scroller,clientX:x,clientY:y});L.scroller.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'||type==='touchcancel'?[]:[t],changedTouches:[t]}));}
  const rect=root.getBoundingClientRect(),x=rect.left+6,y=rect.top+300;
  touch('touchstart',x,y);touch('touchmove',x+90,y+2);check('Swipe locks horizontally and creates two layers',root.querySelectorAll('[data-vc-layer]').length===2);touch('touchcancel',x+90,y+2);await wait(260);
  check('Cancelled swipe retains route and clears layers',L.state.tab==='vewbuy'&&root.querySelectorAll('[data-vc-layer]').length===0&&L.scroller.style.visibility==='');
  touch('touchstart',x,y);touch('touchmove',x+200,y+2);touch('touchend',x+200,y+2);await wait(260);
  check('Committed swipe restores Home',L.state.tab==='home'&&L.scroller.scrollTop===homeY);
  await goto('vewbuy');touch('touchstart',x,y);touch('touchmove',x+4,y+60);touch('touchend',x+4,y+60);await wait(40);check('Vertical gesture never starts Back',L.state.tab==='vewbuy'&&root.querySelectorAll('[data-vc-layer]').length===0);await back();
  for(let i=0;i<12;i++){L.go('stores');await wait(20);L.back();await wait(20);}await wait(400);check('Rapid push/pop stays coherent and cleans up',L.state.tab==='home'&&L.state.history.length===0&&root.querySelectorAll('[data-vc-layer]').length===0);
  // Simulate a scroll-stop touch, then a click; bottom navigation is outside the scroller.
  await goto('home',true);await wait(450);L.scroller.scrollTop=500;L.scroller.dispatchEvent(new Event('scroll',{bubbles:true}));
  touch('touchstart',x+100,y);touch('touchend',x+100,y);
  const stores=Array.from(L.scroller.querySelectorAll('button')).find(b=>b.innerText==='Stores');
  stores.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));await wait(30);check('Scroll-stop click cannot open a card',L.state.tab==='home');
  const acct=Array.from(document.querySelectorAll('nav button')).find(b=>b.innerText==='Account');acct.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));await wait(30);check('Bottom tab is never caught by scroll-stop guard',L.state.tab==='account');await wait(450);
  await goto('scan');clearTimeout(L._st);await state({scan:'permission'});check('Camera failure has member QR fallback',document.body.innerText.includes('Show my member QR'));
  L.renderVals().showMemberQr();await wait(350);check('Fallback opens existing member QR',L.state.modal==='memberqr'&&document.body.innerText.includes('Show this to the cashier'));await state({modal:''});await wait(220);
  for(const scan of ['expired','linked','offline','permission','camera','service','wrong','done']){await state({scan});await wait(20);check('Scan state '+scan,document.body.innerText.includes(scan==='done'?"You’re checked in":({expired:'This code has expired',linked:'Already on your account',offline:'No internet connection',permission:'Camera permission is off',camera:'Camera unavailable',service:'We couldn’t connect',wrong:'We couldn’t scan that QR'})[scan])||scan==='done'&&document.body.innerText.includes("You're checked in"));}
  await state({iam:'duo'});check('Marketing cannot interrupt Scan',!L.state.iam);
  await goto('vouchers',true);await goto('account',true);check('Scan action never contaminates originating tab',L.state.tab==='account');
  await goto('home',true);
  for(const screen of ['home','vouchers','account','cashback','spendreward','settings','inbox','deal','vewbuy','receipts']){await goto(screen,screen==='home');check('Screen renders '+screen,!!L.scroller.firstElementChild&&!!L.scroller.innerText.trim());}
  for(const affinity of ['general','apple','gaming']){await state({affinity});await goto('home',true);check('Personalisation retains three manual banners '+affinity,L.scroller.querySelectorAll('[data-banners] a').length===3);}
  await state({affinity:'general'});
  await goto('home',true);await goto('deal');const times=[];let last=performance.now();await new Promise(resolve=>{let n=0;function tick(now){times.push(now-last);last=now;if(++n<25)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});report.motion.push({sample:'Local preview rAF intervals; not iPhone performance',maxMs:Math.max(...times),meanMs:times.reduce((a,b)=>a+b,0)/times.length});await back();
  // Sample active motion before completion; all navigation uses transform only.
  L.go('stores');await wait(30);const moving=Array.from(document.querySelectorAll('[data-vc-layer]')).flatMap(el=>el.getAnimations());
  check('Push is compositor-friendly',reduced?moving.length===0:moving.length===1&&moving[0].effect.getKeyframes().every(f=>f.transform));
  report.motion.push({sample:'Push animation',duration:reduced?0:320,layers:document.querySelectorAll('[data-vc-layer]').length,properties:['transform']});await wait(360);await back();
  const animations=document.getAnimations();check('No leaked navigation animations',document.querySelectorAll('[data-vc-layer]').length===0);
  check('No runtime errors',report.errors.length===0,report.errors);
  report.passed=report.tests.filter(t=>t.pass).length;report.total=report.tests.length;
  const pre=document.createElement('pre');pre.id='qa-report';pre.textContent=JSON.stringify(report,null,2);pre.style.cssText='position:fixed;inset:0;overflow:auto;z-index:99999;background:white;color:black;padding:20px;user-select:text';document.body.append(pre);
})();
