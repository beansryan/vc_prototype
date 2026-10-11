/* Keep modal keyboard interaction inside the active dialog and restore its trigger. */
(()=>{window.VCAccessibility={install(L,root){
 const original=L.setState;let current=null,trigger=null;const muted=new Map();
 const controls=d=>Array.from(d.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(e=>!e.closest('[inert]')&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
 function sync(){
  for(const [el,value] of muted)el.inert=value;muted.clear();
  const app=L.scroller?.parentElement,dialogs=Array.from(app?.querySelectorAll('[role=dialog][aria-modal=true]')||[]).filter(d=>!d.closest('[inert]'));
  const dialog=dialogs.at(-1)||null;
  if(dialog){let branch=dialog;while(branch.parentElement&&branch.parentElement!==app)branch=branch.parentElement;
   for(const el of app.children)if(el!==branch){muted.set(el,el.inert);el.inert=true;}
   if(dialog!==current){if(!current)trigger=document.activeElement;current=dialog;const first=controls(dialog)[0];if(first)first.focus({preventScroll:true});else{dialog.tabIndex=-1;dialog.focus({preventScroll:true});}}
  }else if(current){current=null;const back=trigger?.isConnected&&!trigger.closest('[inert]')?trigger:app?.querySelector('[data-tabbar] button[data-on]');trigger=null;back?.focus({preventScroll:true});}
 }
 L.setState=function(update,cb){original.call(this,update,()=>{sync();if(cb)cb();});};
 root.addEventListener('keydown',e=>{if(!current)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(L.state.scratch)L.setState({scratch:''});else if(L.state.bdaySheet)L.setState({bdaySheet:false});else if(L.state.iam)L.setState({iam:''});else if(L.state.modal)L.setState({modal:''});return;}if(e.key!=='Tab')return;const bs=controls(current),i=bs.indexOf(document.activeElement);if(!bs.length){e.preventDefault();current.focus();return;}if(e.shiftKey&&i<=0){e.preventDefault();bs.at(-1).focus();}else if(!e.shiftKey&&(i<0||i===bs.length-1)){e.preventDefault();bs[0].focus();}},true);
}};})();
