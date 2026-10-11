/* v18: one bounded navigation owner, opaque page-local layers, no document ViewTransitions. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const roots = new Set(['home','vouchers','account','discover']);
  window.VCFx = { install(L, root) {
    const original = L.setState;
    let stack = [];
    const tabs = new Map();
    let selected = 'home';
    let iamShown = false;
    let running = null, gesture = null, scrollTime = -1000, touch = null, suppressUntil = 0;
    const receipt = s => s.tab === 'receipts' && s.rSel && L.props.size === 'compact';
    const key = s => s.tab + (receipt(s) ? ':' + s.rSel : '');
    const frame = () => L.scroller && L.scroller.parentElement;
    // Clip motion to Duo's content pane; the status/control rail stays live and stationary.
    const motionFrame=()=>{const app=frame();if(!(L.props.duo&&L.props.vbar))return app;let host=app.querySelector(':scope > [data-vc-motion-viewport]');if(!host){host=document.createElement('div');host.dataset.vcMotionViewport='1';host.style.cssText='position:absolute;left:0;top:0;right:84px;bottom:0;overflow:hidden;pointer-events:none;z-index:3;border-radius:0 30px 30px 0;';app.append(host);}return host;};
    const screenEdges=()=>Array.from(frame()?.querySelectorAll(':scope > [data-screen-edge]')||[]);
    const showEdges=()=>screenEdges().forEach(el=>el.style.visibility='');
    const hideEdges=()=>screenEdges().forEach(el=>el.style.visibility='hidden');
    const hideLive=()=>{const sc=L.scroller,band=frame()?.querySelector(':scope > [data-band]');if(sc)sc.style.visibility='hidden';if(band)band.style.visibility='hidden';root.dataset.vcMotion='1';};
    const showLive=()=>{const sc=L.scroller,band=frame()?.querySelector(':scope > [data-band]');if(sc)sc.style.visibility='';if(band)band.style.visibility='';delete root.dataset.vcMotion;};
    // Let accelerated animations follow the browser's display cadence. The frameRate
    // hint is an experimental API: request highest only when the browser exposes it.
    const motion=(el,frames,options)=>{const a=el.animate(frames,options);if('frameRate' in a){try{a.frameRate='highest';}catch(e){}}return a;};
    function settle() { if (running) { const f = running; running = null; f(); } }
    function snapshot() {
      const sc = L.scroller, app = frame(); if (!sc || !app) return null;
      root.dataset.snapshotCount=String((+root.dataset.snapshotCount||0)+1);
      L.syncBand(sc);
      const layer = document.createElement('div');
      layer.dataset.vcLayer = '1'; layer.dataset.text = app.dataset.text; layer.setAttribute('aria-hidden','true'); layer.inert = true;
      layer.style.cssText = app.style.cssText;
      Object.assign(layer.style,{position:'absolute',inset:'0',width:'auto',height:'auto',pointerEvents:'none',zIndex:'3',overflow:'hidden'});
      const band = app.querySelector(':scope > [data-band]'); if (band) {const copy=band.cloneNode(true),wave=band.querySelector('svg');if(wave)copy.querySelector('svg').style.transform=getComputedStyle(wave).transform;copy.style.visibility='';layer.append(copy);}
      const contentOnly=!!(L.props.duo&&L.props.vbar);if(contentOnly){layer.dataset.contentOnly='1';Object.assign(layer.style,{inset:'auto',left:sc.offsetLeft+'px',top:sc.offsetTop+'px',width:sc.clientWidth+'px',height:sc.clientHeight+'px',borderRadius:sc.style.borderRadius});}
      const viewport = document.createElement('div'); viewport.style.cssText = sc.style.cssText;if(contentOnly)Object.assign(viewport.style,{inset:'0',top:'0',right:'0',left:'0',bottom:'0'});
      viewport.style.overflow = 'hidden';viewport.style.visibility='';
      const page = sc.firstElementChild.cloneNode(true); page.style.transform = 'translateY(-'+sc.scrollTop+'px)';
      const originals=sc.querySelectorAll('[data-section-panel]'),copies=page.querySelectorAll('[data-section-panel]');
      originals.forEach((el,i)=>{if(el.scrollTop&&copies[i]?.firstElementChild){copies[i].style.overflow='hidden';copies[i].firstElementChild.style.transform='translateY(-'+el.scrollTop+'px)';}});
      viewport.append(page);layer.append(viewport);
      for(const edge of screenEdges()){const copy=edge.cloneNode(true);copy.style.visibility='';layer.append(copy);}
      layer.querySelectorAll('[style]').forEach(el=>{
        if(!/backdrop-filter/.test(el.style.cssText))return;
        el.style.backdropFilter='none';el.style.webkitBackdropFilter='none';
        // Preserve the existing tint; only the costly live backdrop sampling is removed.
      });
      layer.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
      return layer;
    }
    function animate(layer, from, to, finish, duration=300) {
      if (!layer || reduced.matches) { layer?.remove(); finish(); showLive(); showEdges(); return; }
      motionFrame().append(layer);
      const a = motion(layer,[{transform:'translate3d('+from+',0,0)'},{transform:'translate3d('+to+',0,0)'}],{duration,easing:'cubic-bezier(.2,.8,.25,1)',fill:'both'});
      let ended=false,watchdog;
      const clean=()=>{if(ended)return;ended=true;clearTimeout(watchdog);a.cancel();layer.remove();if(running===clean)running=null;finish();showLive();showEdges();};
      running=clean;watchdog=setTimeout(clean,duration+80);a.finished.then(clean,clean);
    }
    const chrome=()=>{
      const bar=frame()?.querySelector('[data-tabbar]'),ind=bar?.querySelector('[data-tabind]'),btn=bar?.querySelector('button[data-on]');
      if(!ind||!btn)return;
      const vertical=bar.dataset.tabAxis==='vertical',pos=vertical?btn.offsetTop:btn.offsetLeft,old=Number((ind.style.translate||'0 0').split(' ')[vertical?1:0]?.replace('px',''))||0;
      ind.getAnimations().forEach(a=>a.cancel());ind.style.translate=vertical?'0 '+pos+'px':pos+'px 0';ind.style.width=btn.offsetWidth+'px';ind.style.height=btn.offsetHeight+'px';
      if(!reduced.matches&&old!==pos)motion(ind,[{transform:vertical?'translateY('+(old-pos)+'px)':'translateX('+(old-pos)+'px)'},{transform:'translate(0,0)'}],{duration:220,easing:'ease-out'});
    };
    L.setState=function(update,cb) {
      const patch=typeof update==='function'?update(this.state,this.props):update;if(!patch)return;
      const prev=this.state, nav=key({...prev,...patch})!==key(prev), ph=prev.history.length, nh=(patch.history||prev.history).length;
      const pop=nav&&(nh<ph||(receipt(prev)&&patch.rSel===''));
      const tab=patch.tab!==undefined&&roots.has(patch.tab)&&nh===0&&(!pop||this._rootNav);
      const rootReturn=tab&&patch.tab===selected&&prev.tab!==selected;
      this._rootNav=false;
      const wave=frame()?.querySelector(':scope > [data-band] svg');const waveFrom=tab&&wave?getComputedStyle(wave).transform:null;
      let old=null,y=null,swipe=null;
      if(nav){settle();if(gesture?.locked){swipe=gesture;gesture=null;old=swipe.front;}else old=tab&&!rootReturn?null:snapshot();
        if(tab){ if(patch.tab!==selected){ const fromScan=prev.tab==='scan';tabs.set(selected,{stack:fromScan?stack.slice(0,-1):stack.slice(),tab:fromScan?(prev.history.at(-1)||selected):prev.tab,history:fromScan?prev.history.slice(0,-1):prev.history.slice(),rSel:prev.rSel,y:fromScan?(stack.at(-1)?.y||0):L.scroller.scrollTop}); selected=patch.tab;const saved=tabs.get(selected);stack=saved?.stack.slice()||[];if(saved){patch.tab=saved.tab;patch.history=saved.history.slice();patch.rSel=saved.rSel;y=saved.y;}else y=0; }else {y=stack[0]?.y||0;stack=[];} }
        else if(pop){const saved=stack.pop();y=saved?.y||0;}
        else{if(old)stack.push({layer:old,y:L.scroller.scrollTop,key:key(prev)});if(stack.length>8)stack.shift();y=0;}
      }
      const overlayBefore=new Map(Array.from(frame()?.querySelectorAll('[data-fx]')||[]).map(el=>[el,{parent:el.parentElement,kind:el.getAttribute('data-fx')} ]));
      if(patch.iam){if(iamShown||['scan','card','subscribe','otp'].includes(patch.tab||prev.tab)||prev.modal)patch.iam='';else iamShown=true;}
      if((patch.tier!==undefined&&patch.tier!==prev.tier)||(patch.acctKey!==undefined&&patch.acctKey!==prev.acctKey)){tabs.clear();stack=[];selected='home';}
      root.dataset.navKind=rootReturn?'pop':tab?'tab':pop?'pop':nav?'push':'state';
      if(nav)root.dataset.navCount=String((+root.dataset.navCount||0)+1);
      original.call(this,patch,()=>{
        if(!reduced.matches){
          // Animate the shade and card separately: avoid a full-screen opacity group
          // containing a scaling, shadowed promotion card on mobile GPUs.
          const shadeMotion = (el,enter) => {
            let shade=el.querySelector('[data-fx-shade]');
            if(!shade){
              shade=document.createElement('div');shade.dataset.fxShade='1';shade.setAttribute('aria-hidden','true');
              shade.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:0;background:'+getComputedStyle(el).backgroundColor+';will-change:opacity;';
              el.style.backgroundColor='transparent';
              if(el.firstElementChild){if(getComputedStyle(el.firstElementChild).position==='static')el.firstElementChild.style.position='relative';el.firstElementChild.style.zIndex='1';}
              el.append(shade);
            }
            const a=motion(shade,enter?[{opacity:0},{opacity:1}]:[{opacity:1},{opacity:0}],{duration:enter?200:180,easing:'ease-out',fill:enter?'none':'forwards'});
            a.finished.then(()=>shade.style.willChange='',()=>shade.style.willChange='');return a;
          };
          for(const [el,meta] of overlayBefore){
            if(el.isConnected||!meta.parent?.isConnected)continue;
            el.inert=true;meta.parent.append(el);
            let a;
            if(meta.kind==='scrim'&&el.firstElementChild){
              const box=el.firstElementChild;box.style.willChange='transform, opacity';
              const sheet=getComputedStyle(box).bottom==='0px';
              motion(box,[{transform:'translate3d(0,0,0)',opacity:1},{transform:sheet?'translate3d(0,100%,0)':'translate3d(0,8px,0)',opacity:sheet?1:0}],{duration:180,easing:'ease-in',fill:'forwards'});
              a=shadeMotion(el,false);
            }else a=motion(el,[{opacity:1},{opacity:0}],{duration:160});
            a.finished.then(()=>el.remove(),()=>el.remove());
          }
          for(const el of frame()?.querySelectorAll('[data-fx]')||[]){
            if(overlayBefore.has(el))continue;
            if(el.getAttribute('data-fx')==='scrim'&&el.firstElementChild){
              const box=el.firstElementChild,sheet=getComputedStyle(box).bottom==='0px';
              shadeMotion(el,true);box.style.willChange='transform, opacity';
              const a=motion(box,[{transform:sheet?'translate3d(0,100%,0)':'translate3d(0,12px,0)',opacity:sheet?1:0},{transform:'translate3d(0,0,0)',opacity:1}],{duration:sheet?320:260,easing:'cubic-bezier(.2,.8,.25,1)'});
              a.finished.then(()=>box.style.willChange='',()=>box.style.willChange='');
            }else motion(el,[{opacity:0},{opacity:1}],{duration:180});
          }
          if(!nav&&(patch.checked||patch.spun||patch.scan==='done'||patch.sr==='got'))for(const el of frame()?.querySelectorAll('[data-in]')||[])motion(el,[{opacity:.5,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'});
        }

        if(y!==null&&L.scroller){L.scroller.scrollTop=y;this._lastY=y;L.syncBand(L.scroller);scrollTime=-1000;}
        if(swipe)swipe.show();
        if(tab&&!reduced.matches&&waveFrom){const wave=frame()?.querySelector(':scope > [data-band] svg');if(wave){wave.getAnimations().forEach(a=>a.cancel());motion(wave,[{transform:waveFrom},{transform:wave.style.transform}],{duration:360,easing:'cubic-bezier(.2,.8,.25,1)'});}}
        if(nav&&(!tab||rootReturn)&&!prev.splash){
          if(pop||rootReturn){
            const under=swipe?.under||snapshot(), duration=swipe?180:280;
            let parallax=null;
            if(under&&!reduced.matches){under.style.zIndex='2';motionFrame().append(under);const start=swipe?(-L.scroller.clientWidth*.25+swipe.dx*.25)+'px':'-25%';under.style.transform='';parallax=motion(under,[{transform:'translate3d('+start+',0,0)'},{transform:'translate3d(0,0,0)'}],{duration,easing:'cubic-bezier(.2,.8,.25,1)',fill:'both'});}
            hideLive();hideEdges();animate(old,(swipe?.dx||0)+'px','100%',()=>{parallax?.cancel();under?.remove();},duration);
          }else {
            const incoming=snapshot();let parallax=null;
            if(old&&!reduced.matches){old.style.zIndex='2';motionFrame().append(old);parallax=motion(old,[{transform:'translate3d(0,0,0)'},{transform:'translate3d(-25%,0,0)'}],{duration:320,easing:'cubic-bezier(.2,.8,.25,1)',fill:'both'});}
            hideLive();hideEdges();animate(incoming,'100%','0px',()=>{parallax?.cancel();old?.remove();},320);
          }
        }else old?.remove();
        if(running){hideLive();hideEdges();}
        if(nav||patch.bigText!==undefined||patch.themePref!==undefined)chrome();prepareScratch();if(cb)cb();
      });
    };
    L.openReceipt=id=>L.setState({tab:'receipts',rSel:id,history:L.state.tab==='receipts'?L.state.history:L.state.history.concat(L.state.tab).slice(-8),fabHide:false});
    L.receiptBack=()=>{if(receipt(L.state)&&stack.at(-1)?.key==='receipts')L.setState({rSel:''});else L.back();};
    // Root tab clicks always work once, and also discard detail history on reselect.
    const go=L.go.bind(L);
    L.go=function(tab,isRoot){if(tab==='rewards')tab='vouchers';if(tab==='scan')isRoot=false;if(['home','vouchers','account'].includes(tab))isRoot=true;if(isRoot&&roots.has(tab)&&selected===tab&&this.state.tab===tab&&!this.state.history.length){settle();this.scroller.scrollTo({top:0,behavior:reduced.matches?'auto':'smooth'});return;}this._rootNav=!!isRoot;go(tab,isRoot);};
    root.addEventListener('scroll',e=>{if(e.target===L.scroller||e.target.matches?.('[data-section-panel]'))scrollTime=performance.now();},true);
    root.addEventListener('touchstart',e=>{
      if(e.touches.length!==1){end(true);return;}suppressUntil=0;const t=e.touches[0],sc=L.scroller,app=frame();
      const inContent=sc?.contains(e.target);
      const touchSource=e.target.closest('[data-section-panel]')||sc;
      touch={x:t.clientX,y:t.clientY,source:touchSource,top:touchSource?.scrollTop||0,moved:false,stop:inContent&&performance.now()-scrollTime<100};
      if(!inContent||running||L.state.modal||L.state.iam||L.state.bdaySheet||!(L.state.history.length||receipt(L.state))||L.state.tab==='scan'||t.clientX-root.getBoundingClientRect().left>24||!stack.length)return;
      gesture={x:t.clientX,y:t.clientY,dx:0,time:performance.now(),locked:false,lastX:t.clientX,lastTime:performance.now(),velocity:0,scale:root.getBoundingClientRect().width/root.offsetWidth||1,width:sc.clientWidth};
    },{passive:true});
    root.addEventListener('touchmove',e=>{
      if(e.touches.length!==1){end(true);return;}if(!touch)return;const t=e.touches[0];if(Math.hypot(t.clientX-touch.x,t.clientY-touch.y)>8)touch.moved=true;
      if(!gesture)return;const g=gesture,dx=t.clientX-g.x,dy=t.clientY-g.y;const now=performance.now();g.velocity=(t.clientX-g.lastX)/Math.max(1,now-g.lastTime);g.lastX=t.clientX;g.lastTime=now;
      if(!g.locked){if(Math.max(Math.abs(dx),Math.abs(dy))<8)return;if(dx<=0||Math.abs(dy)>Math.abs(dx)/1.3){gesture=null;return;}
        g.locked=true;g.front=snapshot();g.under=stack.at(-1).layer;g.under.style.zIndex='2';motionFrame().append(g.under,g.front);hideEdges();
        const sc=L.scroller,band=frame().querySelector(':scope > [data-band]');sc.style.visibility='hidden';if(band)band.style.visibility='hidden';
        g.show=()=>{sc.style.visibility='';if(band)band.style.visibility='';};
      }
      if(e.cancelable)e.preventDefault();g.dx=Math.max(0,dx/g.scale);g.front.style.transform='translate3d('+g.dx+'px,0,0)';g.under.style.transform='translate3d('+(-g.width*.25+g.dx*.25)+'px,0,0)';
    },{passive:false});
    function end(cancelled){
      if(touch&&(touch.moved||touch.stop||touch.source?.scrollTop!==touch.top))suppressUntil=performance.now()+400;touch=null;
      if(!gesture)return;const g=gesture;if(!g.locked){gesture=null;return;}
      const commit=!cancelled&&(g.dx>L.scroller.clientWidth*.3||(g.dx>24&&g.velocity>.5&&performance.now()-g.lastTime<100));
      if(commit){L.receiptBack();}
      else{gesture=null;let a=null;if(!reduced.matches)a=motion(g.under,[{transform:g.under.style.transform},{transform:'translate3d(-25%,0,0)'}],{duration:180,easing:'cubic-bezier(.2,.8,.25,1)'});animate(g.front,g.dx+'px','0px',()=>{a?.cancel();g.under.style.transform='';g.under.remove();g.show();},180);}
    }
    root.addEventListener('touchend',()=>end(false));root.addEventListener('touchcancel',()=>end(true));
    root.addEventListener('click',e=>{if(e.detail===0||e.target.closest('[role=tab]'))return;const inContent=L.scroller?.contains(e.target);if(inContent&&((running&&!e.target.closest('[aria-label=Back]'))||performance.now()<suppressUntil)){e.preventDefault();e.stopImmediatePropagation();suppressUntil=0;}},true);
    let scratchStroke=null,scratchReveal=0,scratchRevision=0;
    L.revealScratch=function(){
      if(scratchReveal||!this.state.scratch||this.state.scratch==='done')return;const token=++scratchRevision;scratchReveal=token;scratchStroke=null;
      const card=frame()?.querySelector('[data-scratch-card]'),face=card?.querySelector('[data-fx=peel]');
      const owner=this.state.acctKey;const done=()=>{if(scratchReveal!==token)return;scratchReveal=0;if(card?.isConnected&&this.state.acctKey===owner&&this.state.scratch&&this.state.scratch!=='done')this.setState({scratch:'done',checked:true},()=>{
        if(reduced.matches)return;const card=frame()?.querySelector('[data-scratch-card]');if(card)motion(card,[{transform:'rotate(-3deg) scale(.97)'},{transform:'rotate(0deg) scale(1.03)'},{transform:'rotate(-3deg) scale(1)'}],{duration:420,easing:'ease-out'});
        frame()?.querySelectorAll('[data-in=coin]').forEach((coin,i)=>motion(coin,[{opacity:0,translate:'0 24px'},{opacity:1,translate:'0 -12px',offset:.45},{opacity:0,translate:'0 -60px'}],{duration:700,delay:i*40,easing:'ease-out',fill:'forwards'}));
      });};
      if(!face||reduced.matches){done();return;}const a=motion(face,[{opacity:1},{opacity:0}],{duration:260,easing:'ease-out',fill:'forwards'});a.finished.then(done,done);
    };
    function prepareScratch(){
      const card=frame()?.querySelector('[data-scratch-card]');if(!card||card._scratchReady||L.state.scratch==='done')return;card._scratchReady=true;++scratchRevision;scratchReveal=0;card.style.touchAction='none';
      const face=card.querySelector('[data-fx=peel]');if(!face)return;
      const canvas=document.createElement('canvas');canvas.dataset.scratchCoating='1';canvas.setAttribute('aria-hidden','true');canvas.width=canvas.height=540;canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.scale(2,2);const colour=getComputedStyle(face).backgroundColor;ctx.fillStyle=colour;ctx.fillRect(0,0,270,270);
      ctx.fillStyle=L.state.day7?'#F7914A':'#2E3A8C';ctx.font='800 270px system-ui';ctx.fillText(L.state.day7?'7':'3',112,286);
      ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.roundRect(20,20,56,24,12);ctx.fill();ctx.fillStyle='#fff';ctx.font='700 12px system-ui';ctx.fillText(L.state.day7?'Day 7':'Day 3',29,36);
      ctx.font='700 28px system-ui';ctx.fillText('ValueClub›',20,148);ctx.font='14px system-ui';ctx.fillText('Scratch to reveal',20,247);
      for(const child of face.children)child.style.visibility='hidden';face.style.background='transparent';face.style.contain='paint';face.append(canvas);
      ctx.globalCompositeOperation='destination-out';ctx.lineWidth=26;ctx.lineCap=ctx.lineJoin='round';
      const position=(e,g)=>{const dx=(e.clientX-g.cx)/g.scale,dy=(e.clientY-g.cy)/g.scale,a=3*Math.PI/180;return {x:(dx*Math.cos(a)-dy*Math.sin(a)+g.w/2)*270/g.w,y:(dx*Math.sin(a)+dy*Math.cos(a)+g.h/2)*270/g.h};};
      const coverage=()=>{const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let erased=0;for(let i=3;i<data.length;i+=4)if(data[i]<128)erased++;const value=erased/(canvas.width*canvas.height);card.dataset.scratchCoverage=String(value);return value;};
      card.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0||scratchReveal||L.state.scratch==='done')return;e.preventDefault();const r=card.getBoundingClientRect();scratchStroke={id:e.pointerId,cx:r.left+r.width/2,cy:r.top+r.height/2,scale:root.getBoundingClientRect().width/root.offsetWidth||1,w:card.offsetWidth,h:card.offsetHeight};scratchStroke.last=position(e,scratchStroke);try{card.setPointerCapture?.(e.pointerId);}catch(_){}});
      card.addEventListener('pointermove',e=>{const g=scratchStroke;if(g?.id!==e.pointerId)return;e.preventDefault();const p=position(e,g);ctx.beginPath();ctx.moveTo(g.last.x,g.last.y);ctx.lineTo(p.x,p.y);ctx.stroke();g.last=p;});
      const stop=e=>{if(scratchStroke?.id!==e.pointerId)return;scratchStroke=null;if(card.hasPointerCapture?.(e.pointerId))card.releasePointerCapture(e.pointerId);if(e.type==='pointerup'&&canvas.isConnected&&coverage()>=.70)L.revealScratch();};card.addEventListener('pointerup',stop);card.addEventListener('pointercancel',stop);
      if(!reduced.matches)motion(card,[{transform:'rotate(-6deg) translateY(24px)',opacity:0},{transform:'rotate(-3deg) translateY(0)',opacity:1}],{duration:340,easing:'cubic-bezier(.2,.8,.25,1)'});
    }
    let heroDrag=null;
    function heroPage(control,index,smooth){const row=control.parentElement.querySelector('[data-banners]'),items=Array.from(row?.children||[]);if(!items.length)return;index=Math.max(0,Math.min(items.length-1,index));row.scrollTo({left:items[index].offsetLeft-row.offsetLeft,behavior:smooth&&!reduced.matches?'smooth':'auto'});L._bannerIndex=index;control.setAttribute('aria-valuenow',String(index+1));control.querySelectorAll('[data-banner-dot]').forEach((dot,n)=>dot.style.background=n===index?'#202958':'rgba(32,41,88,.2)');}
    const heroIndex=(c,x)=>Array.from(c.querySelectorAll('[data-banner-dot]')).reduce((best,d,i,ds)=>Math.abs(d.getBoundingClientRect().left+d.getBoundingClientRect().width/2-x)<Math.abs(ds[best].getBoundingClientRect().left+ds[best].getBoundingClientRect().width/2-x)?i:best,0);
    root.addEventListener('pointerdown',e=>{const c=e.target.closest('[data-banner-dots]');if(!c||!e.isPrimary)return;heroDrag={id:e.pointerId,control:c};try{root.setPointerCapture(e.pointerId);}catch(_){}heroPage(c,heroIndex(c,e.clientX),false);});
    root.addEventListener('pointermove',e=>{if(heroDrag?.id!==e.pointerId)return;if(e.cancelable)e.preventDefault();heroPage(heroDrag.control,heroIndex(heroDrag.control,e.clientX),false);},{passive:false});
    const endHero=e=>{if(heroDrag?.id!==e.pointerId)return;heroDrag=null;if(root.hasPointerCapture?.(e.pointerId))root.releasePointerCapture(e.pointerId);};root.addEventListener('pointerup',endHero);root.addEventListener('pointercancel',endHero);
    root.addEventListener('keydown',e=>{const c=e.target.closest('[data-banner-dots]');if(!c||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();heroPage(c,e.key==='Home'?0:e.key==='End'?c.querySelectorAll('[data-banner-dot]').length-1:(L._bannerIndex||0)+(e.key==='ArrowRight'?1:-1),true);});
    // Scrub the floating tab indicator without rerendering pages under the finger.
    let tabDrag=null,tabClickUntil=0;
    const tabButtons=bar=>Array.from(bar.querySelectorAll('button')).filter(b=>['Home','Rewards','Account'].includes(b.getAttribute('aria-label')||b.textContent.trim()));
    function finishTabDrag(cancel){
      const g=tabDrag;if(!g)return;tabDrag=null;
      if(g.locked){tabClickUntil=performance.now()+450;const target=g.buttons[g.index];
        if(!cancel&&target&&g.index!==g.start){L.go(['home','vouchers','account'][g.index],true);}else chrome();
      }
      if(root.hasPointerCapture?.(g.id))root.releasePointerCapture(g.id);
    }
    root.addEventListener('pointerdown',e=>{
      const bar=e.target.closest('[data-tabbar]');if(!bar||!e.isPrimary||e.button!==0||tabDrag||L.state.modal||L.state.iam||L.state.scratch||L.state.bdaySheet)return;tabClickUntil=0;
      const ind=bar.querySelector('[data-tabind]'),buttons=tabButtons(bar),start=buttons.findIndex(b=>b.hasAttribute('data-on'));if(!ind||buttons.length!==3||start<0)return;
      tabDrag={bar,ind,buttons,start,index:start,id:e.pointerId,x:e.clientX,y:e.clientY,vertical:bar.dataset.tabAxis==='vertical',top:bar.getBoundingClientRect().top,left:bar.getBoundingClientRect().left,scale:bar.getBoundingClientRect().width/bar.offsetWidth||1,locked:false};
    });
    root.addEventListener('pointermove',e=>{
      const g=tabDrag;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;
      const delta=g.vertical?dy:dx,cross=g.vertical?dx:dy;
      if(!g.locked){if(Math.max(Math.abs(delta),Math.abs(cross))<8)return;if(Math.abs(cross)>Math.abs(delta)){finishTabDrag(true);return;}g.locked=true;g.ind.getAnimations().forEach(a=>a.cancel());try{root.setPointerCapture?.(g.id);}catch(_){}}
      if(e.cancelable)e.preventDefault();const first=g.buttons[0],last=g.buttons.at(-1),extent=b=>g.vertical?b.offsetHeight:b.offsetWidth,offset=b=>g.vertical?b.offsetTop:b.offsetLeft,w=extent(g.buttons[g.start]);
      const x=Math.max(offset(first),Math.min(offset(last),((g.vertical?e.clientY-g.top:e.clientX-g.left)/g.scale)-w/2));
      g.ind.style.translate=g.vertical?'0 '+x+'px':x+'px 0';g.ind.style.width=g.buttons[g.start].offsetWidth+'px';g.ind.style.height=g.buttons[g.start].offsetHeight+'px';
      const centre=x+w/2;g.index=g.buttons.reduce((best,b,i)=>Math.abs(offset(b)+extent(b)/2-centre)<Math.abs(offset(g.buttons[best])+extent(g.buttons[best])/2-centre)?i:best,0);
    },{passive:false});
    root.addEventListener('pointerup',e=>{if(tabDrag?.id===e.pointerId)finishTabDrag(false);});
    root.addEventListener('pointercancel',e=>{if(tabDrag?.id===e.pointerId)finishTabDrag(true);});
    root.addEventListener('lostpointercapture',e=>{if(e.target===root&&tabDrag?.id===e.pointerId)finishTabDrag(true);});
    root.addEventListener('click',e=>{if(e.detail&&e.target.closest('[data-tabbar]')&&performance.now()<tabClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
    addEventListener('blur',()=>finishTabDrag(true));addEventListener('resize',()=>finishTabDrag(true));
    let layoutWidth=root.clientWidth,layoutHeight=root.clientHeight;
    addEventListener('resize',()=>{const w=root.clientWidth,h=root.clientHeight;if(w===layoutWidth&&h===layoutHeight)return;layoutWidth=w;layoutHeight=h;if(gesture?.locked)end(true);settle();chrome();});
    setTimeout(chrome,0);
  }};
})();
