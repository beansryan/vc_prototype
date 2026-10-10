/* v15: one bounded navigation owner, opaque page-local layers, no document ViewTransitions. */
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
    function settle() { if (running) { const f = running; running = null; f(); } }
    function snapshot() {
      const sc = L.scroller, app = frame(); if (!sc || !app) return null;
      root.dataset.snapshotCount=String((+root.dataset.snapshotCount||0)+1);
      L.syncBand(sc);
      const layer = document.createElement('div');
      layer.dataset.vcLayer = '1'; layer.setAttribute('aria-hidden','true'); layer.inert = true;
      layer.style.cssText = app.style.cssText;
      Object.assign(layer.style,{position:'absolute',inset:'0',width:'auto',height:'auto',pointerEvents:'none',zIndex:'3',overflow:'hidden'});
      const band = app.querySelector('[data-band]'); if (band) layer.append(band.cloneNode(true));
      const viewport = document.createElement('div'); viewport.style.cssText = sc.style.cssText;
      viewport.style.overflow = 'hidden';
      const page = sc.firstElementChild.cloneNode(true); page.style.transform = 'translateY(-'+sc.scrollTop+'px)';
      viewport.append(page);layer.append(viewport);
      layer.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
      return layer;
    }
    function animate(layer, from, to, finish, duration=300) {
      if (!layer || reduced.matches) { layer?.remove(); finish(); return; }
      frame().append(layer);
      const a = layer.animate([{transform:'translate3d('+from+',0,0)'},{transform:'translate3d('+to+',0,0)'}],{duration,easing:'cubic-bezier(.2,.8,.25,1)',fill:'both'});
      let ended=false;
      const clean=()=>{if(ended)return;ended=true;a.cancel();layer.remove();if(running===clean)running=null;finish();};
      running=clean;a.finished.then(clean,clean);
    }
    const chrome=()=>{
      const bar=frame()?.querySelector('[data-tabbar]'),ind=bar?.querySelector('[data-tabind]'),btn=bar?.querySelector('button[data-on]');
      if(!ind||!btn)return;
      const x=btn.offsetLeft,w=btn.offsetWidth,old=parseFloat(ind.style.translate)||0;
      ind.getAnimations().forEach(a=>a.cancel());ind.style.translate=x+'px 0';ind.style.width=w+'px';
      if(!reduced.matches&&old!==x)ind.animate([{transform:'translateX('+(old-x)+'px)'},{transform:'translateX(0)'}],{duration:220,easing:'ease-out'});
    };
    L.setState=function(update,cb) {
      const patch=typeof update==='function'?update(this.state,this.props):update;if(!patch)return;
      const prev=this.state, nav=key({...prev,...patch})!==key(prev), ph=prev.history.length, nh=(patch.history||prev.history).length;
      const pop=nav&&(nh<ph||(receipt(prev)&&patch.rSel===''));
      const tab=patch.tab!==undefined&&roots.has(patch.tab)&&nh===0&&(!pop||this._rootNav);
      this._rootNav=false;
      let old=null,y=null,swipe=null;
      if(nav){settle();if(gesture?.locked){swipe=gesture;gesture=null;old=swipe.front;}else old=tab?null:snapshot();
        if(tab){ if(patch.tab!==selected){ const fromScan=prev.tab==='scan';tabs.set(selected,{stack:fromScan?stack.slice(0,-1):stack.slice(),tab:fromScan?(prev.history.at(-1)||selected):prev.tab,history:fromScan?prev.history.slice(0,-1):prev.history.slice(),rSel:prev.rSel,y:fromScan?(stack.at(-1)?.y||0):L.scroller.scrollTop}); selected=patch.tab;const saved=tabs.get(selected);stack=saved?.stack.slice()||[];if(saved){patch.tab=saved.tab;patch.history=saved.history.slice();patch.rSel=saved.rSel;y=saved.y;}else y=0; }else {y=stack[0]?.y||0;stack=[];} }
        else if(pop){const saved=stack.pop();y=saved?.y||0;}
        else{if(old)stack.push({layer:old,y:L.scroller.scrollTop,key:key(prev)});if(stack.length>8)stack.shift();y=0;}
      }
      const overlayBefore=new Map(Array.from(frame()?.querySelectorAll('[data-fx]')||[]).map(el=>[el,{parent:el.parentElement,kind:el.getAttribute('data-fx')} ]));
      if(patch.iam){if(iamShown||['scan','card','subscribe','otp'].includes(patch.tab||prev.tab)||prev.modal)patch.iam='';else iamShown=true;}
      if(patch.tier!==undefined&&patch.tier!==prev.tier){tabs.clear();stack=[];selected='home';}
      root.dataset.navKind=tab?'tab':pop?'pop':nav?'push':'state';
      if(nav)root.dataset.navCount=String((+root.dataset.navCount||0)+1);
      original.call(this,patch,()=>{
        if(!reduced.matches){
          for(const [el,meta] of overlayBefore){if(el.isConnected||!meta.parent?.isConnected)continue;el.inert=true;meta.parent.append(el);if(meta.kind==='scrim'&&el.firstElementChild){const box=el.firstElementChild;box.animate(getComputedStyle(box).bottom==='0px'?[{transform:'translateY(0)'},{transform:'translateY(100%)'}]:[{transform:'scale(1)'},{transform:'scale(.96)'}],{duration:160,easing:'ease-in'});}const a=el.animate([{opacity:1},{opacity:0}],{duration:160});a.finished.then(()=>el.remove(),()=>el.remove());}
          for(const el of frame()?.querySelectorAll('[data-fx]')||[]){if(overlayBefore.has(el))continue;el.animate([{opacity:0},{opacity:1}],{duration:180});if(el.getAttribute('data-fx')==='scrim'){const box=el.firstElementChild;if(box){const sheet=getComputedStyle(box).bottom==='0px';box.animate(sheet?[{transform:'translateY(100%)'},{transform:'translateY(0)'}]:[{transform:'scale(.96)'},{transform:'scale(1)'}],{duration:sheet?320:220,easing:'cubic-bezier(.2,.8,.25,1)'});}}}
          if(!nav&&(patch.checked||patch.spun||patch.scan==='done'||patch.sr==='got'))for(const el of frame()?.querySelectorAll('[data-in]')||[])el.animate([{opacity:.5,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'});
        }

        if(y!==null&&L.scroller){L.scroller.scrollTop=y;this._lastY=y;L.syncBand(L.scroller);scrollTime=-1000;}
        if(swipe){swipe.under.remove();swipe.show();}
        if(nav&&!tab&&!prev.splash){
          if(pop)animate(old,(swipe?.dx||0)+'px','100%',()=>{},swipe?180:280);
          else {const incoming=snapshot();if(old){old.style.zIndex='2';frame().append(old);}animate(incoming,'100%','0px',()=>old?.remove(),320);}
        }else old?.remove();
        chrome();if(cb)cb();
      });
    };
    // Root tab clicks always work once, and also discard detail history on reselect.
    const go=L.go.bind(L);
    L.go=function(tab,isRoot){if(tab==='rewards')tab='vouchers';if(['home','vouchers','account'].includes(tab))isRoot=true;if(isRoot&&roots.has(tab)&&selected===tab&&this.state.tab===tab&&!this.state.history.length){settle();this.scroller.scrollTo({top:0,behavior:reduced.matches?'auto':'smooth'});return;}this._rootNav=!!isRoot;go(tab,isRoot);};
    root.addEventListener('scroll',e=>{if(e.target===L.scroller)scrollTime=performance.now();},true);
    root.addEventListener('touchstart',e=>{
      if(e.touches.length!==1){end(true);return;}suppressUntil=0;const t=e.touches[0],sc=L.scroller,app=frame();
      const inContent=sc?.contains(e.target);
      touch={x:t.clientX,y:t.clientY,top:sc?.scrollTop||0,moved:false,stop:inContent&&performance.now()-scrollTime<100};
      if(!inContent||running||L.state.modal||L.state.iam||L.state.bdaySheet||!(L.state.history.length||receipt(L.state))||L.state.tab==='scan'||t.clientX-root.getBoundingClientRect().left>24||!stack.length)return;
      gesture={x:t.clientX,y:t.clientY,dx:0,time:performance.now(),locked:false,lastX:t.clientX,lastTime:performance.now(),velocity:0};
    },{passive:true});
    root.addEventListener('touchmove',e=>{
      if(e.touches.length!==1){end(true);return;}if(!touch)return;const t=e.touches[0];if(Math.hypot(t.clientX-touch.x,t.clientY-touch.y)>8)touch.moved=true;
      if(!gesture)return;const g=gesture,dx=t.clientX-g.x,dy=t.clientY-g.y;const now=performance.now();g.velocity=(t.clientX-g.lastX)/Math.max(1,now-g.lastTime);g.lastX=t.clientX;g.lastTime=now;
      if(!g.locked){if(Math.max(Math.abs(dx),Math.abs(dy))<8)return;if(dx<=0||Math.abs(dy)>Math.abs(dx)/1.3){gesture=null;return;}
        g.locked=true;g.front=snapshot();g.under=stack.at(-1).layer;g.under.style.zIndex='2';frame().append(g.under,g.front);
        const sc=L.scroller,band=frame().querySelector('[data-band]');sc.style.visibility='hidden';if(band)band.style.visibility='hidden';
        g.show=()=>{sc.style.visibility='';if(band)band.style.visibility='';};
      }
      if(e.cancelable)e.preventDefault();g.dx=Math.max(0,dx/(root.getBoundingClientRect().width/root.offsetWidth));g.front.style.transform='translate3d('+g.dx+'px,0,0)';
    },{passive:false});
    function end(cancelled){
      if(touch&&(touch.moved||touch.stop||L.scroller.scrollTop!==touch.top))suppressUntil=performance.now()+400;touch=null;
      if(!gesture)return;const g=gesture;if(!g.locked){gesture=null;return;}
      const commit=!cancelled&&(g.dx>L.scroller.clientWidth*.3||(g.dx>24&&g.velocity>.5&&performance.now()-g.lastTime<100));
      if(commit){if(receipt(L.state))L.setState({rSel:''});else L.back();}
      else{gesture=null;animate(g.front,g.dx+'px','0px',()=>{g.under.remove();g.show();},180);}
    }
    root.addEventListener('touchend',()=>end(false));root.addEventListener('touchcancel',()=>end(true));
    root.addEventListener('click',e=>{if(e.detail===0)return;const inContent=L.scroller?.contains(e.target);if(inContent&&((running&&!e.target.closest('[aria-label=Back]'))||performance.now()<suppressUntil)){e.preventDefault();e.stopImmediatePropagation();suppressUntil=0;}},true);
    addEventListener('resize',()=>{if(gesture?.locked)end(true);settle();chrome();});
    setTimeout(chrome,0);
  }};
})();
