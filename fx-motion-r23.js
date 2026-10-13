/* v18: one bounded navigation owner, opaque page-local layers, no document ViewTransitions. */
(() => {
  document.documentElement.dataset.vcMotionRevision='23';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const roots = new Set(['home','vouchers','account','discover']);
  window.VCFx = { install(L, root) {
    const original = L.setState;
    let stack = [];
    let selected = roots.has(L.state.tab)?L.state.tab:'home';
    const sessions=new Map();
    // Preview messages are manually invoked; production frequency belongs to Braze.
    let menuCleanup=null;
    const settleMenu=()=>{if(menuCleanup){const clean=menuCleanup;menuCleanup=null;clean();}};
    
    let blendLayer=null;
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
    const complete=(a,ms,fn)=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);fn();};const timer=setTimeout(finish,ms+100);a.finished.then(finish,finish);};
    function settle() { if (running) { const f = running; running = null; f(); } }
    function snapshot(includeBlend=true) {
      const sc = L.scroller, app = frame(); if (!sc || !app) return null;
      root.dataset.snapshotCount=String((+root.dataset.snapshotCount||0)+1);
      L.syncBand(sc);
      const layer = document.createElement('div');
      layer.dataset.vcLayer = '1'; layer.dataset.text = app.dataset.text; layer.setAttribute('aria-hidden','true'); layer.inert = true;
      layer.style.cssText = app.style.cssText;
      Object.assign(layer.style,{position:'absolute',inset:'0',width:'auto',height:'auto',pointerEvents:'none',zIndex:'3',overflow:'hidden'});
      const band = app.querySelector(':scope > [data-band]'); if (band) {const copy=band.cloneNode(true),wave=band.querySelector('svg');if(wave)copy.querySelector('svg').style.transform=getComputedStyle(wave).transform;copy.style.visibility='';layer.append(copy);}
      const contentOnly=!!(L.props.duo&&L.props.vbar);if(contentOnly){layer.dataset.contentOnly='1';Object.assign(layer.style,{inset:'auto',left:sc.offsetLeft+'px',top:sc.offsetTop+'px',width:sc.clientWidth+'px',height:sc.clientHeight+'px',borderRadius:sc.style.borderRadius});}
      const viewport = document.createElement('div'); viewport.dataset.vcSnapshotViewport='1'; viewport.style.cssText = sc.style.cssText;if(contentOnly)Object.assign(viewport.style,{inset:'0',top:'0',right:'0',left:'0',bottom:'0'});
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
      if(includeBlend&&blendLayer?.isConnected){
        // Retain the currently displayed blend during rapid redirection, bounded
        // to one history surface rather than accumulating old screens.
        const copy=blendLayer.cloneNode(true);copy.removeAttribute('data-vc-layer');copy.dataset.vcBlendHistory='1';
        copy.querySelectorAll('[data-vc-blend-history]').forEach(n=>n.remove());
        copy.style.opacity=getComputedStyle(blendLayer).opacity;copy.style.zIndex='4';layer.append(copy);
      }
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
    let indicatorPosition=null;
    const chrome=()=>{
      const bar=frame()?.querySelector('[data-tabbar]'),ind=bar?.querySelector('[data-tabind]'),btn=bar?.querySelector('button[data-on]');
      if(!ind||!btn){indicatorPosition=null;return;}
      const x=btn.offsetLeft,y=btn.offsetTop,prior=indicatorPosition;
      const matrix=getComputedStyle(ind).transform;
      const m=matrix==='none'?null:new DOMMatrixReadOnly(matrix);
      const oldX=(prior?.bar===bar?prior.x:x)+(m?.m41||0),oldY=(prior?.bar===bar?prior.y:y)+(m?.m42||0);
      ind.getAnimations().forEach(a=>a.cancel());
      ind.style.left='0';ind.style.top='0';ind.style.translate=x+'px '+y+'px';
      ind.style.width=btn.offsetWidth+'px';ind.style.height=btn.offsetHeight+'px';
      indicatorPosition={bar,x,y};
      if(!reduced.matches&&(oldX!==x||oldY!==y))motion(ind,[{transform:'translate('+(oldX-x)+'px,'+(oldY-y)+'px)'},{transform:'translate(0,0)'}],{duration:260,easing:'cubic-bezier(.22,.8,.22,1)'});
    };
    const menuNode=()=>frame()?.querySelector('nav[aria-label="Main"]');
    const menuLabel=b=>b.getAttribute('aria-label')||b.textContent.trim();
    function animateMenu(before,oldNav,oldGeometry){
      const sc=L.scroller,nav=menuNode(),app=frame(),animations=[];
      if(!sc||!nav||!oldGeometry){oldNav?.remove();return;}
      const after=sc.getBoundingClientRect(),rootRect=app.getBoundingClientRect(),scale=rootRect.width/app.offsetWidth||1;
      const rect=nav.getBoundingClientRect(),to={left:(rect.left-rootRect.left)/scale,top:(rect.top-rootRect.top)/scale,width:rect.width/scale,height:rect.height/scale};
      const glass=document.createElement('div');glass.dataset.vcMenuMorph='1';glass.inert=true;glass.setAttribute('aria-hidden','true');
      const style=getComputedStyle(nav),background=nav.style.background,shadow=nav.style.boxShadow,blur=nav.style.backdropFilter,webkitBlur=nav.style.webkitBackdropFilter;
      glass.style.cssText='position:absolute;z-index:5;pointer-events:none;box-sizing:border-box;background:'+style.background+';box-shadow:'+style.boxShadow+';backdrop-filter:none;-webkit-backdrop-filter:none;';
      Object.assign(glass.style,{left:to.left+'px',top:to.top+'px',width:to.width+'px',height:to.height+'px',borderRadius:style.borderRadius});
      app.append(glass);nav.style.background='transparent';nav.style.boxShadow='none';nav.style.backdropFilter='none';nav.style.webkitBackdropFilter='none';nav.style.zIndex='7';
      const easing='cubic-bezier(.22,.8,.22,1)',duration=360;
      // One settled layout: animate only transforms and a small glass mask.
      // No per-frame content width/padding changes or live backdrop sampling.
      const from=Object.fromEntries(Object.entries(oldGeometry.box).map(([k,v])=>[k,parseFloat(v)]));
      const width=Math.max(from.width,to.width),height=Math.max(from.height,to.height);
      Object.assign(glass.style,{width:width+'px',height:height+'px',borderRadius:'0',clipPath:'inset(0 '+(width-to.width)+'px '+(height-to.height)+'px 0 round '+style.borderRadius+')'});
      animations.push(motion(glass,[{transform:'translate('+(from.left-to.left)+'px,'+(from.top-to.top)+'px)',clipPath:'inset(0 '+(width-from.width)+'px '+(height-from.height)+'px 0 round '+oldGeometry.radius+')'},{transform:'translate(0,0)',clipPath:glass.style.clipPath}],{duration,easing}));
      const inner=sc.firstElementChild?.firstElementChild,innerRect=inner?.getBoundingClientRect();
      if(inner&&oldGeometry.inner&&innerRect)animations.push(motion(inner,[{transform:'translate('+((oldGeometry.inner.left-innerRect.left)/scale)+'px,'+((oldGeometry.inner.top-innerRect.top)/scale)+'px)'},{transform:'translate(0,0)'}],{duration,easing}));
      for(const b of nav.querySelectorAll('button')){
        const label=menuLabel(b),source=oldGeometry.buttons.get(label),r=b.getBoundingClientRect();
        if(source)animations.push(motion(b,[{transform:'translate('+((source.left+source.width/2-r.left-r.width/2)/scale)+'px,'+((source.top+source.height/2-r.top-r.height/2)/scale)+'px)'},{transform:'translate(0,0)'}],{duration,easing}));
        else animations.push(motion(b,[{opacity:0},{opacity:1}],{duration:180,delay:120,easing:'ease-out'}));
      }
      if(oldNav){Object.assign(oldNav.style,oldGeometry.box,{position:'absolute',right:'auto',bottom:'auto',zIndex:'7',transform:'none'});oldNav.style.background='transparent';oldNav.style.boxShadow='none';oldNav.style.backdropFilter='none';oldNav.style.webkitBackdropFilter='none';for(const b of oldNav.querySelectorAll('button'))if(Array.from(nav.querySelectorAll('button')).some(n=>menuLabel(n)===menuLabel(b)))b.style.visibility='hidden';app.append(oldNav);animations.push(motion(oldNav,[{opacity:1},{opacity:0}],{duration:120,fill:'forwards'}));}
      const clean=()=>{animations.forEach(a=>a.cancel());glass.remove();oldNav?.remove();if(nav.isConnected){nav.style.background=background;nav.style.boxShadow=shadow;nav.style.backdropFilter=blur;nav.style.webkitBackdropFilter=webkitBlur;nav.style.zIndex='6';}if(menuCleanup===clean)menuCleanup=null;};
      menuCleanup=clean;complete(animations[0],duration,clean);
    }

    // Context controls share one persistent capsule; timing is a prototype choice,
    // approximating native Liquid Glass materialization and matched geometry.
    let contextCleanup=null;
    const captureContext=()=>{if(!(L.props.duo&&L.props.vbar))return null;const group=frame()?.querySelector('[data-duo-context]');if(!group)return null;const r=group.getBoundingClientRect(),fr=frame().getBoundingClientRect(),scale=fr.width/frame().offsetWidth||1;return {group,height:r.height/scale,left:(r.left-fr.left)/scale,top:(r.top-fr.top)/scale,buttons:new Map(Array.from(group.querySelectorAll('button')).map(b=>[b.getAttribute('aria-label'),{top:(b.getBoundingClientRect().top-r.top)/scale,clone:b.cloneNode(true)}]))};};
    const animateContext=before=>{
      const group=frame()?.querySelector('[data-duo-context]');if(reduced.matches||!(L.props.duo&&L.props.vbar)||(!before&&!group))return;
      const animations=[],ghosts=[],restore=[];const duration=260,easing='cubic-bezier(.2,.8,.25,1)';
      const run=(el,keys)=>{const a=motion(el,keys,{duration,easing,fill:'both'});if(a)animations.push(a);return a;};
      let cleaned=false;const clean=()=>{if(cleaned)return;cleaned=true;animations.forEach(a=>a.cancel());ghosts.forEach(g=>g.remove());restore.forEach(f=>f());if(contextCleanup===clean)contextCleanup=null;};contextCleanup=clean;
      if(!group){const ghost=before.group.cloneNode(true);ghost.inert=true;ghost.setAttribute('aria-hidden','true');ghost.dataset.duoContextGhost='1';ghost.removeAttribute('data-duo-context');Object.assign(ghost.style,{position:'absolute',left:before.left+'px',top:before.top+'px',height:before.height+'px',overflow:'hidden',pointerEvents:'none',zIndex:'7'});frame().append(ghost);ghosts.push(ghost);run(ghost,[{clipPath:'inset(0% 0% 0% 0% round 24px)',opacity:1},{clipPath:'inset(0% 0% 100% 0% round 24px)',opacity:0}]);}
      else{
        const targetHeight=group.offsetHeight,oldHeight=before?.height||0,oldOverflow=group.style.overflow;group.style.overflow='visible';restore.push(()=>group.style.overflow=oldOverflow);
        if(oldHeight!==targetHeight)run(group,[{height:oldHeight+'px'},{height:targetHeight+'px'}]);
        const live=new Map(Array.from(group.querySelectorAll('button')).map(b=>[b.getAttribute('aria-label'),b]));
        for(const [name,button]of live){const old=before?.buttons.get(name);if(old){const gr=group.getBoundingClientRect(),scale=gr.width/group.offsetWidth||1,dy=old.top-(button.getBoundingClientRect().top-gr.top)/scale;if(Math.abs(dy)>.1)run(button,[{transform:'translateY('+dy+'px)'},{transform:'translateY(0)'}]);}else run(button,[{opacity:0,transform:'translateY(4px) scale(.94)'},{opacity:1,transform:'translateY(0) scale(1)'}]);}
        for(const [name,old]of before?.buttons||[])if(!live.has(name)){const ghost=old.clone;ghost.inert=true;ghost.setAttribute('aria-hidden','true');ghost.dataset.duoContextGhost='1';Object.assign(ghost.style,{position:'absolute',left:'0',top:old.top+'px',pointerEvents:'none'});group.append(ghost);ghosts.push(ghost);run(ghost,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.94)'}]);}
      }
      const last=animations.at(-1);if(last)complete(last,duration,clean);else clean();
    };
    L.setState=function(update,cb) {
      const patch=typeof update==='function'?update(this.state,this.props):update;if(!patch)return;
      const prev=this.state, nav=key({...prev,...patch})!==key(prev), ph=prev.history.length, nh=(patch.history||prev.history).length;
      const contextBefore=captureContext();if(contextCleanup)contextCleanup();
      const menuChange=patch.side!==undefined&&patch.side!==prev.side;
      if(nav||menuChange)settleMenu();
      const menuBefore=menuChange&&!reduced.matches?L.scroller?.getBoundingClientRect():null;
      const sourceMenu=menuBefore?menuNode():null;
      const appRect=frame()?.getBoundingClientRect(),menuRect=sourceMenu?.getBoundingClientRect(),menuScale=appRect?.width/frame()?.offsetWidth||1;
      const oldGeometry=sourceMenu?{inner:L.scroller.firstElementChild?.firstElementChild?.getBoundingClientRect(),page: (()=>{const st=getComputedStyle(L.scroller.firstElementChild);return Object.fromEntries(['paddingTop','paddingRight','paddingBottom','paddingLeft'].map(k=>[k,st[k]]));})(),box:Object.fromEntries(Object.entries({left:(menuRect.left-appRect.left)/menuScale,top:(menuRect.top-appRect.top)/menuScale,width:menuRect.width/menuScale,height:menuRect.height/menuScale}).map(([k,v])=>[k,v+'px'])),radius:getComputedStyle(sourceMenu).borderRadius,buttons:new Map(Array.from(sourceMenu.querySelectorAll('button')).map(b=>[menuLabel(b),b.getBoundingClientRect()]))}:null;
      let oldMenu=sourceMenu?.cloneNode(true);
      if(oldMenu){oldMenu.inert=true;oldMenu.setAttribute('aria-hidden','true');oldMenu.style.pointerEvents='none';oldMenu.dataset.vcMenuGhost='1';oldMenu.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));}
      const pop=nav&&(nh<ph||(receipt(prev)&&patch.rSel===''));
      const restore=this._tabRestore;this._tabRestore=null;
      const tab=!!restore||(patch.tab!==undefined&&roots.has(patch.tab)&&nh===0&&(!pop||this._rootNav));
      const rootReturn=tab&&!['home','vouchers','account'].includes(prev.tab);
      this._rootNav=false;
      const wave=frame()?.querySelector(':scope > [data-band] svg');const waveFrom=tab&&wave?getComputedStyle(wave).transform:null;
      let old=null,y=null,swipe=null;
      if(nav){const displayed=blendLayer?snapshot():null;settle();if(gesture?.locked){swipe=gesture;gesture=null;old=swipe.front;}else old=displayed||(tab&&!rootReturn&&reduced.matches?null:snapshot());
        if(tab){selected=restore?.root||patch.tab;stack=restore?.stack||[];if(!restore){patch.history=[];patch.rSel="";}y=restore?.y||0;}
        else if(pop){const saved=stack.pop();y=saved?.y||0;}
        else{if(old)stack.push({layer:old.querySelector('[data-vc-blend-history]')?snapshot(false):old,y:L.scroller.scrollTop,key:key(prev)});if(stack.length>8)stack.shift();y=0;}
      }
      const revealsBefore=new Set(frame()?.querySelectorAll('[data-in="reveal"]')||[]);
      const overlayBefore=new Map(Array.from(frame()?.querySelectorAll('[data-fx]')||[]).map(el=>[el,{parent:el.parentElement,kind:el.getAttribute('data-fx')} ]));
      if(patch.iam&&(['scan','card','subscribe','otp'].includes(patch.tab||prev.tab)||prev.modal||prev.scratch||prev.bdaySheet))patch.iam='';
      if((patch.tier!==undefined&&patch.tier!==prev.tier)||(patch.acctKey!==undefined&&patch.acctKey!==prev.acctKey)){stack=[];sessions.clear();selected='home';}
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
            complete(a,200,()=>shade.style.willChange='');return a;
          };
          for(const [el,meta] of overlayBefore){
            if(el.isConnected||!meta.parent?.isConnected)continue;
            el.inert=true;el.removeAttribute('data-fx');el.style.pointerEvents='none';meta.parent.append(el);
            let a;
            if(meta.kind==='scrim'&&el.firstElementChild){
              const box=el.firstElementChild;box.style.willChange='transform, opacity';
              const sheet=getComputedStyle(box).bottom==='0px';
              motion(box,[{transform:'translate3d(0,0,0)',opacity:1},{transform:sheet?'translate3d(0,100%,0)':'translate3d(0,8px,0)',opacity:sheet?1:0}],{duration:180,easing:'ease-in',fill:'forwards'});
              a=shadeMotion(el,false);
            }else a=motion(el,[{opacity:1},{opacity:0}],{duration:160});
            complete(a,180,()=>el.remove());
          }
          for(const el of frame()?.querySelectorAll('[data-fx]')||[]){
            if(overlayBefore.has(el))continue;
            if(el.getAttribute('data-fx')==='scrim'&&el.firstElementChild){
              const box=el.firstElementChild,sheet=getComputedStyle(box).bottom==='0px';
              shadeMotion(el,true);box.style.willChange='transform, opacity';
              const a=motion(box,[{transform:sheet?'translate3d(0,100%,0)':'translate3d(0,12px,0)',opacity:sheet?1:0},{transform:'translate3d(0,0,0)',opacity:1}],{duration:sheet?320:260,easing:'cubic-bezier(.2,.8,.25,1)'});
              complete(a,sheet?320:260,()=>box.style.willChange='');
            }else motion(el,[{opacity:0},{opacity:1}],{duration:180});
          }
          for(const el of frame()?.querySelectorAll('[data-in="reveal"]')||[])if(!revealsBefore.has(el))motion(el,[{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'ease-out'});
          if(!nav&&(patch.checked||patch.spun||patch.scan==='done'||patch.sr==='got'))for(const el of frame()?.querySelectorAll('[data-in]')||[])motion(el,[{opacity:.5,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'});
        }

        if(L.scroller)L.scroller.style.overflowAnchor='none';
        if(y!==null&&L.scroller){L.scroller.scrollTop=y;this._lastY=y;L.syncBand(L.scroller);scrollTime=-1000;
          // Section sizing settles in the same frame; restore after that sizing,
          // otherwise short tablet lists clamp the offset before their min-height exists.
          const routeKey=key(this.state),revision=root.dataset.navCount;
          requestAnimationFrame(()=>{if(key(this.state)!==routeKey||root.dataset.navCount!==revision)return;L.scroller.scrollTop=y;this._lastY=L.scroller.scrollTop;L.syncBand(L.scroller);});
        }
        const liveWave=frame()?.querySelector(':scope > [data-band] svg'),waveTo=liveWave?.style.transform;
        const animateBand=node=>{if(!tab||reduced.matches||!waveFrom||!waveTo||!node)return;node.getAnimations().forEach(a=>a.cancel());node.style.transform=waveTo;const a=motion(node,[{transform:waveFrom},{transform:waveTo}],{duration:360,easing:'cubic-bezier(.2,.8,.25,1)',fill:'both'});complete(a,360,()=>a.cancel());};
        animateBand(liveWave);
        if(swipe)swipe.show();
        if(nav&&(!tab||rootReturn)&&!prev.splash){
          if(pop||rootReturn){
            const under=swipe?.under||snapshot(), duration=swipe?180:280;animateBand(under?.querySelector(':scope > [data-band] svg'));
            let parallax=null;
            if(under&&!reduced.matches){under.style.zIndex='2';motionFrame().append(under);const start=swipe?(-L.scroller.clientWidth*.25+swipe.dx*.25)+'px':'-25%';under.style.transform='';parallax=motion(under,[{transform:'translate3d('+start+',0,0)'},{transform:'translate3d(0,0,0)'}],{duration,easing:'cubic-bezier(.2,.8,.25,1)',fill:'both'});}
            hideLive();hideEdges();animate(old,(swipe?.dx||0)+'px','100%',()=>{parallax?.cancel();under?.remove();},duration);
          }else {
            const incoming=snapshot();let parallax=null;
            if(old&&!reduced.matches){old.style.zIndex='2';motionFrame().append(old);parallax=motion(old,[{transform:'translate3d(0,0,0)'},{transform:'translate3d(-25%,0,0)'}],{duration:320,easing:'cubic-bezier(.2,.8,.25,1)',fill:'both'});}
            hideLive();hideEdges();animate(incoming,'100%','0px',()=>{parallax?.cancel();old?.remove();},320);
          }
        }else if(nav&&tab&&old&&!prev.splash&&!reduced.matches){
          // Opaque live destination beneath one fading outgoing surface. No blank
          // interval, viewport movement, incoming glass clone or scroll-size change.
          old.querySelector(':scope > [data-band]')?.remove();old.style.background='transparent';blendLayer=old;motionFrame().append(old);
          const a=motion(old,[{opacity:1},{opacity:0}],{duration:200,easing:'cubic-bezier(.2,0,0,1)',fill:'both'});
          let done=false;const clean=()=>{if(done)return;done=true;a.cancel();old.remove();if(blendLayer===old)blendLayer=null;if(running===clean)running=null;showLive();showEdges();};
          running=clean;complete(a,200,clean);
        }else old?.remove();
        if(running&&!blendLayer){hideLive();hideEdges();}
        if(menuBefore)animateMenu(menuBefore,oldMenu,oldGeometry);else oldMenu?.remove();
        animateContext(contextBefore);
        chrome();prepareScratch();if(cb)cb();
      });
    };
    L.openReceipt=id=>L.setState({tab:'receipts',rSel:id,history:L.state.tab==='receipts'?L.state.history:L.state.history.concat(L.state.tab).slice(-8),fabHide:false});
    L.receiptBack=()=>{if(receipt(L.state)&&stack.at(-1)?.key==='receipts')L.setState({rSel:''});else L.back();};
    // Main-menu buttons always return to their named main page and retain its own scroll.
    const go=L.go.bind(L);
    L.go=function(tab,isRoot){
      if(tab==='rewards')tab='vouchers';if(tab==='scan')isRoot=false;
      if(['home','vouchers','account'].includes(tab))isRoot=true;
      if(isRoot&&roots.has(tab)){
        if(tab===selected){
          if(this.state.tab===tab&&!this.state.history.length){settle();return;}
          const origin=stack.find(entry=>entry.key===tab);
          const saved={root:tab,tab,history:[],rSel:'',stack:[],y:origin?.y||0};
          sessions.set(tab,saved);this._tabRestore=saved;this._rootNav=true;
          this.setState({tab,history:[],rSel:'',fabHide:false});return;
        }
        sessions.set(selected,{root:selected,tab:selected,history:[],rSel:'',stack:[],y:this.state.tab===selected?(this.scroller?.scrollTop||0):(stack.find(entry=>entry.key===selected)?.y??sessions.get(selected)?.y??0)});
        const saved=sessions.get(tab)||{root:tab,tab,history:[],rSel:'',stack:[],y:0};
        this._tabRestore=saved;this._rootNav=true;
        this.setState({tab:saved.tab,history:saved.history.slice(),rSel:saved.rSel,fabHide:false});return;
      }
      this._rootNav=false;go(tab,isRoot);
    };
    root.addEventListener('scroll',e=>{if(e.target===L.scroller||e.target.matches?.('[data-section-panel]'))scrollTime=performance.now();},true);
    root.addEventListener('touchstart',e=>{
      if(e.touches.length!==1){end(true);return;}suppressUntil=0;const t=e.touches[0],sc=L.scroller,app=frame();
      const inContent=sc?.contains(e.target);
      const touchSource=e.target.closest('[data-section-panel]')||sc;
      touch={x:t.clientX,y:t.clientY,source:touchSource,top:touchSource?.scrollTop||0,moved:false,stop:inContent&&performance.now()-scrollTime<100};
      if(!inContent||running||L.state.modal||L.state.iam||L.state.bdaySheet||!(L.state.history.length||receipt(L.state))||t.clientX-root.getBoundingClientRect().left>24||!stack.length)return;
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
    root.addEventListener('click',e=>{if(e.detail===0||e.target.closest('[role=tab]'))return;const inContent=L.scroller?.contains(e.target);if(inContent&&((running&&!blendLayer&&!e.target.closest('[aria-label=Back]'))||performance.now()<suppressUntil)){e.preventDefault();e.stopImmediatePropagation();suppressUntil=0;}},true);
    let scratchStroke=null,scratchReveal=0,scratchRevision=0;
    L.revealScratch=function(){
      if(scratchReveal||!this.state.scratch||this.state.scratch==='done')return;const token=++scratchRevision;scratchReveal=token;scratchStroke=null;
      const card=frame()?.querySelector('[data-scratch-card]'),face=card?.querySelector('[data-fx=peel]');
      const owner=this.state.acctKey;const done=()=>{if(scratchReveal!==token)return;scratchReveal=0;if(card?.isConnected&&this.state.acctKey===owner&&this.state.scratch&&this.state.scratch!=='done')this.setState({scratch:'done',checked:true},()=>{
        if(reduced.matches)return;const card=frame()?.querySelector('[data-scratch-card]');if(card)motion(card,[{transform:'rotate(-3deg) scale(.97)'},{transform:'rotate(0deg) scale(1.03)'},{transform:'rotate(-3deg) scale(1)'}],{duration:420,easing:'ease-out'});
        frame()?.querySelectorAll('[data-in=coin]').forEach((coin,i)=>motion(coin,[{opacity:0,translate:'0 24px'},{opacity:1,translate:'0 -12px',offset:.45},{opacity:0,translate:'0 -60px'}],{duration:700,delay:i*40,easing:'ease-out',fill:'forwards'}));
      });};
      if(!face||reduced.matches){done();return;}const a=motion(face,[{opacity:1},{opacity:0}],{duration:260,easing:'ease-out',fill:'forwards'});complete(a,260,done);
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
      g.ind.style.left='0';g.ind.style.top='0';g.ind.style.translate=g.vertical?g.buttons[g.start].offsetLeft+'px '+x+'px':x+'px '+g.buttons[g.start].offsetTop+'px';indicatorPosition={bar:g.bar,x:g.vertical?g.buttons[g.start].offsetLeft:x,y:g.vertical?x:g.buttons[g.start].offsetTop};g.ind.style.width=g.buttons[g.start].offsetWidth+'px';g.ind.style.height=g.buttons[g.start].offsetHeight+'px';
      const centre=x+w/2;g.index=g.buttons.reduce((best,b,i)=>Math.abs(offset(b)+extent(b)/2-centre)<Math.abs(offset(g.buttons[best])+extent(g.buttons[best])/2-centre)?i:best,0);
    },{passive:false});
    root.addEventListener('pointerup',e=>{if(tabDrag?.id===e.pointerId)finishTabDrag(false);});
    root.addEventListener('pointercancel',e=>{if(tabDrag?.id===e.pointerId)finishTabDrag(true);});
    root.addEventListener('lostpointercapture',e=>{if(e.target===root&&tabDrag?.id===e.pointerId)finishTabDrag(true);});
    root.addEventListener('click',e=>{if(e.detail&&e.target.closest('[data-tabbar]')&&performance.now()<tabClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
    addEventListener('blur',()=>finishTabDrag(true));addEventListener('resize',()=>finishTabDrag(true));
    let layoutWidth=root.clientWidth,layoutHeight=root.clientHeight;
    addEventListener('resize',()=>{const w=root.clientWidth,h=root.clientHeight;if(w===layoutWidth&&h===layoutHeight)return;layoutWidth=w;layoutHeight=h;if(gesture?.locked)end(true);settle();settleMenu();chrome();});
    setTimeout(chrome,0);
  }};
})();
