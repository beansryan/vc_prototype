/* Page-local sibling sections. Separate from root navigation and filter controls. */
(()=>{
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const defs={vew:{key:'vewSeg',values:['mine','plans']},vouchers:{key:'vSeg',values:['available','mine']}};
const selected=(L,type)=>defs[type].values.indexOf(L.state[defs[type].key]||defs[type].values[0]);
const panels=L=>L.scroller?.querySelectorAll('[data-section-panel]')||[];
const panel=L=>Array.from(panels(L)).find(e=>e.dataset.sectionPanel===L.state.tab);
const restore=(L,p)=>{const type=p.dataset.sectionPanel,i=selected(L,type);p.scrollTop=L._sectionPositions?.[type]?.[i]||0;};
function decorate(L,p){
 const type=p.dataset.sectionPanel,i=selected(L,type),wrap=p.parentElement,bar=wrap.previousElementSibling;
 if(!bar?.matches('[data-seg]'))return;
 bar.setAttribute('role','tablist');bar.setAttribute('aria-label',type==='vew'?'Warranty sections':'Voucher sections');bar.style.position='relative';bar.style.isolation='isolate';
 const bs=Array.from(bar.querySelectorAll('button'));let pill=bar.querySelector('[data-section-pill]');
 if(!pill){pill=document.createElement('span');pill.dataset.sectionPill='1';pill.setAttribute('aria-hidden','true');pill.style.cssText='position:absolute;pointer-events:none;border-radius:999px;top:4px;bottom:4px;background:var(--section-pill,#fff);box-shadow:0 1px 4px rgba(18,23,53,.12);z-index:-1;';bar.append(pill);}
 const b=bs[i];if(b){const old=parseFloat(pill.style.left)||b.offsetLeft;pill.style.width=b.offsetWidth+'px';pill.style.left=b.offsetLeft+'px';if(!reduced.matches&&old!==b.offsetLeft)pill.animate([{transform:'translateX('+(old-b.offsetLeft)+'px)'},{transform:'translateX(0)'}],{duration:240,easing:'cubic-bezier(.2,.8,.25,1)'});}
 bs.forEach((b,n)=>{b.style.position='relative';b.style.background='transparent';b.style.boxShadow='none';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(n===i));b.tabIndex=n===i?0:-1;b.id='vc-section-'+type+'-'+n;b.setAttribute('aria-controls','vc-panel-'+type);});
 p.id='vc-panel-'+type;p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby',b?.id||'');
}
window.VCSections={
 prepare(L,p){
  requestAnimationFrame(()=>{if(!p.isConnected)return;const type=p.dataset.sectionPanel;if(!defs[type])return;
   const sc=L.scroller;const top=p.parentElement.getBoundingClientRect().top-sc.getBoundingClientRect().top;
   const bottom=parseFloat(getComputedStyle(sc.firstElementChild).paddingBottom)||100;
   const height=Math.max(240,sc.clientHeight-top-Math.min(bottom,120));
   p.style.height=height+'px';p.parentElement.style.height=height+'px';
   if(!p._vcSectionReady){p._vcSectionReady=true;restore(L,p);p.addEventListener('scroll',()=>{const i=selected(L,type);if(i>=0)(L._sectionPositions[type]||(L._sectionPositions[type]={}))[i]=p.scrollTop;},{passive:true});}
   decorate(L,p);
  });
 },
 install(L,root){
  L._sectionPositions={};const original=L.setState;let active=null,drag=null,revision=0;
  const clean=()=>{if(!active)return;const a=active;active=null;a.animations.forEach(x=>x.cancel());a.old.remove();a.current.style.transform='';a.current.style.willChange='';a.current.style.pointerEvents='';delete root.dataset.sectionMotion;};
  function transition(old,p,direction,interactive){
   const wrap=p.parentElement;old.removeAttribute('id');old.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));old.setAttribute('aria-hidden','true');old.inert=true;
   old.style.position='absolute';old.style.inset='0';old.style.width='100%';old.style.pointerEvents='none';old.style.zIndex='2';old.style.willChange='transform';wrap.append(old);
   p.style.willChange='transform';p.style.pointerEvents='none';active={old,current:p,direction,animations:[]};root.dataset.sectionMotion=interactive?'drag':'slide';
   if(interactive){draw(drag?.dx||0);return;}
   if(reduced.matches){clean();return;}
   active.animations=[old.animate([{transform:'translate3d(0,0,0)'},{transform:'translate3d('+(-direction*100)+'%,0,0)'}],{duration:250,easing:'cubic-bezier(.2,.8,.25,1)',fill:'both'}),p.animate([{transform:'translate3d('+(direction*100)+'%,0,0)'},{transform:'translate3d(0,0,0)'}],{duration:250,easing:'cubic-bezier(.2,.8,.25,1)',fill:'both'})];
   const bound=active;active.animations[1].finished.then(()=>{if(active===bound)clean();},()=>{if(active===bound)clean();});
  }
  L.setState=function(update,cb){
   const patch=typeof update==='function'?update(this.state,this.props):update;if(!patch)return;
   const type=this.state.tab,d=defs[type],p=panel(this),before=d?selected(this,type):-1,next=d&&patch[d.key]!==undefined?d.values.indexOf(patch[d.key]):before;
   const change=p&&next>=0&&before>=0&&next!==before;
   const version=change?++revision:revision;
   let old=null;if(change&&!this._cancelSection){clean();(this._sectionPositions[type]||(this._sectionPositions[type]={}))[before]=p.scrollTop;old=p.cloneNode(true);old.scrollTop=p.scrollTop;}
   if(patch.tab&&patch.tab!==type){clean();drag=null;}
   const cancelling=this._cancelSection;this._cancelSection=false;
   original.call(this,patch,()=>{const current=panel(this);if(change&&version===revision&&current){restore(this,current);if(old){transition(old,current,next-before,!!drag?.locked);old.scrollTop=this._sectionPositions[type][before]||0;}decorate(this,current);}else if(cancelling&&current)restore(this,current);if(cb)cb();});
  };
  function draw(dx){if(!active)return;const a=active,w=a.current.clientWidth,clamped=a.direction>0?Math.max(-w,Math.min(0,dx)):Math.min(w,Math.max(0,dx));a.old.style.transform='translate3d('+clamped+'px,0,0)';a.current.style.transform='translate3d('+(clamped+a.direction*w)+'px,0,0)';}
  root.addEventListener('touchstart',e=>{const p=e.target.closest('[data-section-panel]');if(!p||e.touches.length!==1||L.state.modal||L.state.iam)return;const t=e.touches[0];if(t.clientX-root.getBoundingClientRect().left<=24)return;for(let n=e.target;n&&n!==p;n=n.parentElement){if(n.scrollWidth>n.clientWidth+2&&/auto|scroll/.test(getComputedStyle(n).overflowX))return;}clean();drag={x:t.clientX,y:t.clientY,scale:root.getBoundingClientRect().width/root.offsetWidth||1,dx:0,type:p.dataset.sectionPanel,index:selected(L,p.dataset.sectionPanel),locked:false};},{passive:true});
  root.addEventListener('touchmove',e=>{if(!drag||e.touches.length!==1)return;const t=e.touches[0],dx=t.clientX-drag.x,dy=t.clientY-drag.y;
   if(!drag.locked){if(Math.max(Math.abs(dx),Math.abs(dy))<10)return;if(Math.abs(dy)>Math.abs(dx)/1.3){drag=null;return;}const target=drag.index+(dx<0?1:-1),d=defs[drag.type];if(target<0||target>=d.values.length){drag=null;return;}drag.locked=true;drag.target=target;drag.dx=dx/drag.scale;L.setState({[d.key]:d.values[target]});}
   drag.dx=dx/drag.scale;if(e.cancelable)e.preventDefault();draw(drag.dx);
  },{passive:false});
  function end(cancel){if(!drag)return;const g=drag;drag=null;if(!g.locked||!active)return;const a=active,w=a.current.clientWidth,commit=!cancel&&Math.abs(g.dx)>w*.25;
   if(!commit){
    const revert=()=>{if(active!==a||L.state.tab!==g.type)return;clean();L._cancelSection=true;L.setState({[defs[g.type].key]:defs[g.type].values[g.index]},()=>{const p=panel(L);if(p)decorate(L,p);});};
    if(reduced.matches){revert();return;}
    root.dataset.sectionMotion='cancel';
    a.animations=[a.old.animate([{transform:a.old.style.transform},{transform:'translate3d(0,0,0)'}],{duration:180,easing:'ease-out',fill:'both'}),a.current.animate([{transform:a.current.style.transform},{transform:'translate3d('+(a.direction*100)+'%,0,0)'}],{duration:180,easing:'ease-out',fill:'both'})];a.animations[1].finished.then(revert,revert);return;
   }
   if(reduced.matches){clean();return;}
   root.dataset.sectionMotion='settle';const fromOld=a.old.style.transform,fromNew=a.current.style.transform;
   a.animations=[a.old.animate([{transform:fromOld},{transform:'translate3d('+(-a.direction*100)+'%,0,0)'}],{duration:180,easing:'ease-out',fill:'both'}),a.current.animate([{transform:fromNew},{transform:'translate3d(0,0,0)'}],{duration:180,easing:'ease-out',fill:'both'})];a.animations[1].finished.then(clean,clean);
  }
  root.addEventListener('touchend',()=>end(false));root.addEventListener('touchcancel',()=>end(true));
  root.addEventListener('keydown',e=>{const b=e.target.closest('[role=tab]'),bar=b?.closest('[role=tablist]');if(!bar||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const bs=Array.from(bar.querySelectorAll('button')),i=bs.indexOf(b),n=e.key==='Home'?0:e.key==='End'?bs.length-1:e.key==='ArrowRight'?Math.min(i+1,bs.length-1):Math.max(0,i-1);e.preventDefault();bs[n].click();bs[n].focus();});
  addEventListener('resize',()=>{if(drag)end(true);for(const p of panels(L))VCSections.prepare(L,p);});
 }
};
})();
