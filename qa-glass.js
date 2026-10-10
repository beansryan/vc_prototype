(async()=>{
 const wait=ms=>new Promise(r=>setTimeout(r,ms)),report={tests:[],errors:[]};addEventListener('error',e=>report.errors.push(e.message));await wait(3600);const L=VCApp._L;
 const state=p=>new Promise(r=>L.setState(p,r));const check=(name,pass,detail)=>report.tests.push({name,pass:!!pass,detail});
 await state({tier:'m12',splash:false,loading:false,iam:'',modal:'',bigText:false});VCApp.testLayout(402,874,{platform:'ios'});await wait(120);
 const rgb=s=>(s.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
 const lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
 const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 for(const themePref of ['light','dark']){
  await state({themePref});L.go('home',true);await wait(400);const app=L.scroller.parentElement;
  const bar=app.querySelector('[data-tabbar]'),scan=app.querySelector('button[aria-label="Scan the QR at checkout"]'),bell=app.querySelector('button[aria-label="Inbox"]');
  check(themePref+' single consistent blur',getComputedStyle(bar).backdropFilter==='blur(12px) saturate(1.4)',getComputedStyle(bar).backdropFilter);
  check(themePref+' no SVG lens maps',!app.querySelector('#vcLgPill')&&!getComputedStyle(bar).backdropFilter.includes('url('));
  check(themePref+' pill never blurs its parent',getComputedStyle(bar.querySelector('[data-tabind]')).backdropFilter==='none');
  for(const [name,el] of [['Scan',scan],['Inbox',bell],...Array.from(bar.querySelectorAll('button')).map(el=>[el.innerText,el])]){
   check(themePref+' '+name+' touch area',el.offsetWidth>=44&&el.offsetHeight>=44,{width:el.offsetWidth,height:el.offsetHeight});
   const fg=rgb(getComputedStyle(el).color), worst=themePref==='light'?[178.5,178.5,178.5]:[81,81,85],ratio=contrast(fg,worst);check(themePref+' '+name+' worst-case tint contrast',ratio>=4.5,{ratio});
  }
  for(const tab of ['Rewards','Account','Home']){
   const b=Array.from(bar.querySelectorAll('button')).find(b=>b.innerText===tab);b.click();await wait(300);const selected=app.querySelector('[data-tabbar] button[data-on]'),pill=app.querySelector('[data-tabind]');
   check(themePref+' '+tab+' pill aligns after one click',selected===b&&Math.abs(parseFloat(pill.style.translate)-b.offsetLeft)<1);
   check(themePref+' '+tab+' exposes selected state',b.getAttribute('aria-current')==='page'&&app.querySelectorAll('[data-tabbar] button[aria-current="page"]').length===1);
  }
  app.dataset.transparency='solid';check(themePref+' solid alternative has no blur',getComputedStyle(app.querySelector('[data-tabbar]')).backdropFilter==='none');delete app.dataset.transparency;
  L.go('account',true);await wait(350);app.querySelector('button[aria-label="Scan the QR at checkout"]').click();await wait(350);clearTimeout(L._st);L.back();await wait(350);check(themePref+' Scan returns to originating tab',L.state.tab==='account');
  L.go('cashback');await wait(350);const headerBack=L.scroller.querySelector('button[aria-label=Back]');check(themePref+' Back on navy header contrast',contrast(rgb(getComputedStyle(headerBack).color),themePref==='light'?[178.5,178.5,178.5]:[81,81,85])>=4.5);L.back();await wait(350);L.go('profile');await wait(350);const back=Array.from(L.scroller.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')==='Back');check(themePref+' Back remains 44px',back&&back.offsetWidth>=44&&back.offsetHeight>=44);
  L.back();await wait(350);
 }
 check('No runtime errors',!report.errors.length,report.errors);report.passed=report.tests.filter(t=>t.pass).length;report.total=report.tests.length;const pre=document.createElement('pre');pre.id='qa-report';pre.textContent=JSON.stringify(report,null,2);pre.style.cssText='position:fixed;inset:0;overflow:auto;z-index:99999;background:white;color:black;padding:20px';document.body.append(pre);
})();
