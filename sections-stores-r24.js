/* Page-local sibling sections. Separate from root navigation and filter controls. */
(()=>{
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const defs={stores:{key:'sFilter',values:['all','vew']},vewbuy:{key:'vewOpt',values:['24','12']},vew:{key:'vewSeg',values:['mine','plans']},vouchers:{key:'vSeg',values:['available','mine']}};
const selected=(L,type)=>defs[type].values.indexOf(L.state[defs[type].key]||defs[type].values[0]);
const panels=L=>L.scroller?.querySelectorAll('[data-section-panel]')||[];
const panel=L=>Array.from(panels(L)).find(e=>e.dataset.sectionPanel===L.state.tab);
const restore=(L,p)=>{const type=p.dataset.sectionPanel,i=selected(L,type);p._sectionIndex=i;p.scrollTop=L._sectionPositions?.[type]?.[i]||0;};
function decorate(L,p){
 const type=p.dataset.sectionPanel,i=selected(L,type),wrap=p.parentElement,bar=wrap.previousElementSibling;
 if(!bar?.matches('[data-seg]'))return;
 bar.setAttribute('role','tablist');bar.setAttribute('aria-label',type==='vewbuy'?'Eligible warranty plans':type==='vew'?'Warranty sections':type==='stores'?'Store lists':'Voucher sections');bar.style.position='relative';bar.style.isolation='isolate';
 const bs=Array.from(bar.querySelectorAll('button'));let pill=bar.querySelector('[data-section-pill]');
 if(!pill){pill=document.createElement('span');pill.dataset.sectionPill='1';pill.setAttribute('aria-hidden','true');pill.style.cssText='position:absolute;pointer-events:none;border-radius:999px;top:4px;bottom:4px;background:var(--section-pill,#fff);box-shadow:0 1px 4px rgba(18,23,53,.12);z-index:-1;';bar.append(pill);}
 pill.style.borderRadius='999px';pill.style.background=L.props.platform==='android'?'#DFE1F9':'var(--section-pill,#fff)';
 const b=bs[i];if(b){const matrix=getComputedStyle(pill).transform;const old=(parseFloat(pill.style.left)||0)+(matrix==='none'?0:new DOMMatrixReadOnly(matrix).m41);pill.getAnimations().forEach(a=>a.cancel());pill.style.width=b.offsetWidth+'px';pill.style.left=b.offsetLeft+'px';if(!reduced.matches&&old!==b.offsetLeft)pill.animate([{transform:'translateX('+(old-b.offsetLeft)+'px)'},{transform:'translateX(0)'}],{duration:240,easing:'cubic-bezier(.2,.8,.25,1)'});}
 bs.forEach((b,n)=>{b.style.position='relative';b.style.background='transparent';b.style.boxShadow='none';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(n===i));b.tabIndex=n===i?0:-1;b.id='vc-section-'+type+'-'+n;b.setAttribute('aria-controls','vc-panel-'+type);});
 p.id='vc-panel-'+type;p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby',b?.id||'');
}
window.VCSections={
 prepare(L,p){
  requestAnimationFrame(()=>{if(!p.isConnected)return;const type=p.dataset.sectionPanel;if(!defs[type])return;
   const sc=L.scroller;const top=p.parentElement.getBoundingClientRect().top-sc.getBoundingClientRect().top;
   const bottom=parseFloat(getComputedStyle(sc.firstElementChild).paddingBottom)||100;
   const height=Math.max(120,sc.clientHeight-top-Math.min(bottom,120));
   p.style.touchAction='pan-y';if(type==='stores'||type==='vewbuy'){p.style.height='auto';p.style.overflow='visible';p.parentElement.style.height='auto';}else if(type==='vouchers'){p.style.height='auto';p.style.overflow='visible';p.parentElement.style.height='auto';p.parentElement.style.overflow='clip';L._voucherHeight=Math.max(L._voucherHeight||0,p.scrollHeight);p.style.minHeight=L._voucherHeight+'px';}else{p.style.height=height+'px';p.parentElement.style.height=height+'px';}
   if(!p._vcSectionReady){p._vcSectionReady=true;restore(L,p);p.addEventListener('scroll',()=>{const i=p._sectionIndex;if(i>=0)(L._sectionPositions[type]||(L._sectionPositions[type]={}))[i]=p.scrollTop;},{passive:true});}
   decorate(L,p);
  });
 },
 install(L,root){
  L._sectionPositions={};const original=L.setState;let active=null,drag=null;
  const clean=()=>{if(!active)return;const a=active;active=null;clearTimeout(a.timer);a.animation?.cancel();a.panel.style.transform='';a.panel.style.opacity='';a.panel.style.willChange='';a.ghost?.remove();delete root.dataset.sectionMotion;};
  const lockScroll=()=>{const sc=L.scroller;if(sc?._voucherOverflow!==undefined){sc.style.overflow=sc._voucherOverflow;delete sc._voucherOverflow;}};
  L.setState=function(update,cb){const patch=typeof update==='function'?update(this.state,this.props):update;if(!patch)return;const type=this.state.tab,d=defs[type],p=panel(this),before=d?selected(this,type):-1,next=d&&patch[d.key]!==undefined?d.values.indexOf(patch[d.key]):before,change=p&&next!==before&&next>=0;
   const outgoing=change&&!reduced.matches?p.cloneNode(true):null;const dragOffset=change&&drag?.locked?drag.dx:0;const pageTop=change&&(type==='vouchers'||type==='stores')?this.scroller.scrollTop:null;if(change){clean();if(type==='vouchers')this._voucherHeight=Math.max(this._voucherHeight||0,p.scrollHeight);if(type!=='vouchers'&&type!=='stores')(this._sectionPositions[type]||(this._sectionPositions[type]={}))[before]=p.scrollTop;}
   if(patch.tab&&patch.tab!==type||patch.acctKey!==undefined){clean();drag=null;}
   original.call(this,patch,()=>{lockScroll();const current=panel(this);if(change&&current&&this.state.tab===type&&selected(this,type)===next){clean();current.style.transform='';current.style.willChange='';delete root.dataset.sectionMotion;if(type==='vouchers'){current.style.minHeight=(this._voucherHeight||0)+'px';this.scroller.scrollTop=pageTop;}if(type==='stores')this.scroller.scrollTop=pageTop;restore(this,current);decorate(this,current);if(!reduced.matches){
 const width=current.clientWidth,direction=next>before?1:-1,wrap=current.parentElement;
 wrap.style.position='relative';wrap.style.overflow='clip';
 outgoing.removeAttribute('id');outgoing.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));outgoing.inert=true;outgoing.setAttribute('aria-hidden','true');outgoing.dataset.sectionGhost='1';outgoing.style.cssText=current.style.cssText+';position:absolute;left:0;top:0;width:100%;pointer-events:none;';outgoing.scrollTop=p.scrollTop;wrap.append(outgoing);
 current.style.willChange='transform';const duration=240,opts={duration,easing:'cubic-bezier(.2,.8,.25,1)'};
 outgoing.animate([{transform:'translate3d('+dragOffset+'px,0,0)'},{transform:'translate3d('+(-direction*width)+'px,0,0)'}],opts);
 const animation=current.animate([{transform:'translate3d('+(direction*width+dragOffset)+'px,0,0)'},{transform:'translate3d(0,0,0)'}],opts);
 const a=active={panel:current,animation,ghost:outgoing};root.dataset.sectionMotion='slide';a.timer=setTimeout(()=>{if(active===a)clean();},duration+100);animation.finished.then(()=>{if(active===a)clean();},()=>{if(active===a)clean();});
 }}if(cb)cb();});
  };
  root.addEventListener('pointerdown',e=>{const p=e.target.closest('[data-section-panel]');if(!e.isPrimary){end(true);return;}if(e.target.closest('[data-banners],canvas,[data-tabbar],input,textarea,select'))return;let ancestor=e.target;while(ancestor&&ancestor!==p){const style=getComputedStyle(ancestor);if(/auto|scroll/.test(style.overflowX)&&ancestor.scrollWidth>ancestor.clientWidth+1)return;ancestor=ancestor.parentElement;}if(!p||e.button!==0||L.state.modal||L.state.iam||drag||e.clientX-root.getBoundingClientRect().left<=24)return;clean();const r=root.getBoundingClientRect();drag={id:e.pointerId,panel:p,type:p.dataset.sectionPanel,index:selected(L,p.dataset.sectionPanel),x:e.clientX,y:e.clientY,scale:r.width/root.offsetWidth||1,width:p.clientWidth,dx:0,locked:false,lastX:e.clientX,lastTime:performance.now(),velocity:0};},{passive:true});
  root.addEventListener('pointermove',e=>{const g=drag;if(g?.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y,now=performance.now();g.velocity=(e.clientX-g.lastX)/Math.max(1,now-g.lastTime);g.lastX=e.clientX;g.lastTime=now;if(!g.locked){if(Math.max(Math.abs(dx),Math.abs(dy))<10)return;if(Math.abs(dy)>Math.abs(dx)/1.3){drag=null;return;}const target=g.index+(dx<0?1:-1);if(target<0||target>=defs[g.type].values.length){drag=null;return;}g.target=target;g.locked=true;g.panel.style.willChange='transform';try{root.setPointerCapture(e.pointerId);}catch(_){}}if(e.cancelable)e.preventDefault();g.dx=Math.max(-g.width,Math.min(g.width,dx/g.scale));g.panel.style.transform='translate3d('+Math.max(-g.width,Math.min(g.width,g.dx))+'px,0,0)';root.dataset.sectionMotion='drag';},{passive:false});
  function end(cancel){const g=drag;if(!g)return;if(!g.locked){drag=null;return;}const forward=g.target>g.index?g.velocity<-.45:g.velocity>.45,commit=!cancel&&(g.target>g.index?g.dx<0:g.dx>0)&&(Math.abs(g.dx)>g.width*.25||(Math.abs(g.dx)>24&&forward&&performance.now()-g.lastTime<100));
 if(commit){L.setState({[defs[g.type].key]:defs[g.type].values[g.target]});drag=null;}else{drag=null;g.panel.style.transform='';g.panel.style.willChange='';delete root.dataset.sectionMotion;if(!reduced.matches){const animation=g.panel.animate([{transform:'translate3d('+g.dx+'px,0,0)'},{transform:'translate3d(0,0,0)'}],{duration:180,easing:'ease-out'});active={panel:g.panel,animation};const a=active;a.timer=setTimeout(()=>{if(active===a)clean();},280);animation.finished.then(()=>{if(active===a)clean();},()=>{if(active===a)clean();});}}
 if(root.hasPointerCapture?.(g.id))root.releasePointerCapture(g.id);
 }
  root.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId)end(false);});root.addEventListener('pointercancel',e=>{if(drag?.id===e.pointerId)end(true);});root.addEventListener('lostpointercapture',e=>{if(e.target===root&&drag?.id===e.pointerId)end(true);});
  root.addEventListener('keydown',e=>{const b=e.target.closest('[role=tab]'),bar=b?.closest('[role=tablist]');if(!bar||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const bs=Array.from(bar.querySelectorAll('button')),i=bs.indexOf(b),n=e.key==='Home'?0:e.key==='End'?bs.length-1:e.key==='ArrowRight'?Math.min(i+1,bs.length-1):Math.max(0,i-1);e.preventDefault();bs[n].click();bs[n].focus();});
  addEventListener('resize',()=>{end(true);for(const p of panels(L))VCSections.prepare(L,p);});lockScroll();
 }
};
})();
