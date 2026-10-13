(()=>{
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],cache=new Map();
const offset=L=>Math.max(-365,Math.min(365,Number(L.state.dateOffsetDays??3)||0));
const shift=(iso,days)=>{const d=new Date(iso+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
const warrantyOffset=L=>{const mode=L.state.warrantyDemoState||'auto';if(mode==='auto')return offset(L);const now=new Date(Date.now()+8*3600000),today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());return Math.round((today-Date.UTC(2026,9,10))/86400000)+(mode==='available'?3:-1);};
const text=(s,days)=>{if(typeof s!=='string'||!days||!(/\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/.test(s)))return s;const key=days+'|'+s;if(cache.has(key))return cache.get(key);const out=s.replace(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:([ ,]+)(\d{4}))?\b/g,(full,day,month,sep,year)=>{if(year==='2027'&&((day==='7'&&['Jan','Apr'].includes(month))||(day==='14'&&month==='Jan')))return full;const d=new Date(Date.UTC(Number(year||new Date().getFullYear()),months.indexOf(month),Number(day)));d.setUTCDate(d.getUTCDate()+days);return d.getUTCDate()+' '+months[d.getUTCMonth()]+(year?(sep||' ')+d.getUTCFullYear():'');});if(cache.size>2000)cache.clear();cache.set(key,out);return out;};
const scopeCache=new WeakMap();
const scopeOffset=scope=>{if(!scope)return 3;if(scopeCache.has(scope))return scopeCache.get(scope);let result;if(scope.vars.dateOffsetDays!==undefined)result=scope.vars.dateOffsetDays;else {const local=Object.values(scope.vars).find(v=>v&&typeof v==='object'&&v._dateOffset!==undefined);result=local?local._dateOffset:scopeOffset(scope.parent);}scopeCache.set(scope,result);return result;};
window.VCDates={offset,shift,warrantyOffset,text,scopeOffset,values:(vals,L)=>({...vals,dateOffsetDays:vals.dateOffsetDays??offset(L)})};
})();
