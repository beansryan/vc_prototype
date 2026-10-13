/* ValueClub MVP shell: mounts the App, saves state, fake accounts, real links, hidden reset. */
(function () {
  document.documentElement.dataset.vcBuild='61';
  const WEB = 'https://online.challenger.sg';
  const KEY_STATE = 'vc_state_v1';
  const KEY_ACCTS = 'vc_accounts_v1';
  const KEY_A2HS = 'vc_a2hs_seen';
  const KEY_DEV = 'vc_dev_v1';
  const KEY_UI = 'vc_preview_ui_v1';
  const { defineDC, h, render } = window.VCRuntime;

  // ---------- storage (never fatal) ----------
  const isQA = /\/QA(?:-motion|-review|-shop|-sections|-audit|-regressions|-PWA|-focused|-campaigns|-android-campaigns|-tablet|-campaign-layout|-prices|-nav|-frames|-guide|-rail|-stores|-alignment)?\.html$/.test(location.pathname);
  const store = {
    get(k, d) { if(isQA&&k!==KEY_UI)return d; try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { if(isQA&&k!==KEY_UI)return; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    clear() { if(isQA)return; try { localStorage.clear(); } catch (e) {} }
  };
  let previewUI = store.get(KEY_UI, {});
  function applyPreviewControls() {
    const button = document.getElementById('devicePickerButton');
    if (!button) return;
    const hide = !!previewUI.hideDeviceButton;
    button.hidden = hide;
    button.style.display = hide ? 'none' : '';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyPreviewControls, { once: true });
  else applyPreviewControls();

  const today = () => {const parts=new Intl.DateTimeFormat('en',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=t=>parts.find(p=>p.type===t).value;return get('year')+'-'+get('month')+'-'+get('day');};

  // state that survives a relaunch (everything else starts fresh, like a cold app start)
  const KEEP = ['tier', 'uFirst', 'uLast', 'uEmail', 'uMobile', 'acctKey', 'claimed', 'read', 'dismissed', 'bday', 'themePref', 'bigText',
    'affinity', 'push', 'notif', 'subCancelled', 'lapsed', 'renewals', 'checked', 'spun', 'saver', 'mktOn', 'remember', 'reminded', 'chJoined', 'sr', 'earned', 'day', 'nextPaymentDate', 'paymentRecovered', 'paymentFail',
    'dateOffsetDays','warrantyDemoState','attn', 'attnSet', 'campaign', 'game', 'games', 'loc', 'cardLead'];

  // ---------- accounts (prototype only: any details work) ----------
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');
  function nameFromId(id) {
    if (id.indexOf('@') > 0) {
      const parts = id.split('@')[0].split(/[._\-+0-9]+/).filter(Boolean);
      if (parts.length) return { first: cap(parts[0]), last: cap(parts[1] || '') };
    }
    return { first: 'Alex', last: 'Tan' };
  }
  const accountDemos=new Map();
  const demoDefaults={claimed:{},read:{},dismissed:{},bday:false,checked:false,spun:false,saver:false,chJoined:false,sr:'open',earned:false,subCancelled:false,lapsed:false,renewals:0};
  function accountDemo(s){const demo={day:today()};for(const k of Object.keys(demoDefaults))demo[k]=s[k]??demoDefaults[k];return demo;}
  function rememberAccount(s){
    if(!s.acctKey||s.tier==='guest')return;const demo=accountDemo(s);accountDemos.set(s.acctKey,demo);
    const accounts=store.get(KEY_ACCTS,{});let changed=false;for(const acc of Object.values(accounts))if(acc.key===s.acctKey){acc.demoState=demo;acc.tier=s.tier;changed=true;}if(changed)store.set(KEY_ACCTS,accounts);
  }
  function signIn(L, acc, msg) {
    rememberAccount(L.state);const savedDemo=accountDemos.get(acc.key)||acc.demoState||{};const demo={...demoDefaults,...savedDemo};if(savedDemo.day!==today()){demo.checked=false;demo.spun=false;demo.sr='open';demo.earned=false;}L.setState({ ...demo,spinning:false,scratch:'',mtUp:[],mtDone:[],uFirst: acc.first, uLast: acc.last, uEmail: acc.email || L.state.uEmail, uMobile: acc.mobile || L.state.uMobile, acctKey: acc.key, scan: 'idle' });
    L.setTier(acc.tier, msg, acc.tier === 'free' && acc.isNew ? 'push' : '');
  }
  const VCApp = {
    mask(id) { id = String(id); return id.indexOf('@') > 0 ? id.replace(/^(.{1,4}).*@/, '$1****@') : id.slice(0, 4) + ' ****'; },
    login(L, withCode) {
      const id = String(L._lid || '').trim(), pw = String(L._lpw || '');
      if (!id) { L.toastMsg('Enter your email or mobile number'); return; }
      if (!withCode && !pw) { L.toastMsg('Enter your password'); return; }
      const accts = store.get(KEY_ACCTS, {});
      const key = id.toLowerCase();
      let acc = accts[key];
      if (!acc) {
        const n = nameFromId(id);
        acc = { key, first: n.first, last: n.last, email: id.indexOf('@') > 0 ? id : '', mobile: id.indexOf('@') > 0 ? '' : id, tier: 'm12' };
        accts[key] = acc; store.set(KEY_ACCTS, accts);
      }
      if (withCode) { L.setState({ otpMode: 'login', loginIdV: id, pendingKey: key, otpV: '' }); L.go('otp'); return; }
      signIn(L, acc, 'Welcome back, ' + acc.first);
    },
    signupNext(L) {
      const su = L._su || {};
      if (!String(su.first || '').trim()) { L.toastMsg('Enter your first name'); return; }
      if (String(su.mobile || '').replace(/\D/g, '').length < 8) { L.toastMsg('Enter your 8-digit mobile number'); return; }
      if (String(su.pw || '').length < 8) { L.toastMsg('Use at least 8 characters for your password'); return; }
      L.setState({ otpMode: 'signup', suMobileV: su.mobile, otpV: '' });
      L.go('otp');
    },
    verify(L) {
      if (String(L.state.otpV || '').length < 6) { L.toastMsg('Enter the 6-digit code. Any 6 digits work here.'); return; }
      if (L._verifying) return; L._verifying = true; setTimeout(() => { L._verifying = false; }, 800);
      L.setState({ otpV: '' });
      const accts = store.get(KEY_ACCTS, {});
      if (L.state.otpMode === 'signup') {
        const su = L._su || {};
        const key = String(su.email || su.mobile).trim().toLowerCase();
        const acc = { key, first: cap(String(su.first).trim()), last: cap(String(su.last || '').trim()), email: su.email || '', mobile: su.mobile || '', tier: 'free', isNew: true };
        accts[key] = acc;
        if (su.mobile) accts[String(su.mobile).trim().toLowerCase()] = acc;
        store.set(KEY_ACCTS, accts);
        signIn(L, acc, '');
        acc.isNew = false; store.set(KEY_ACCTS, accts);
      } else {
        const acc = accts[L.state.pendingKey] || { key: 'demo', first: 'Alex', last: 'Tan', tier: 'm12' };
        signIn(L, acc, 'Welcome back, ' + acc.first);
      }
    }
  };
  window.VCApp = VCApp;

  // ---------- links: anything that pointed at the website now opens it ----------
  function openUrl(u) {
    const a = document.createElement('a');
    a.href = u; a.target = u.indexOf('http') === 0 ? '_blank' : '_self'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  }
  VCApp.openShop = (url) => { if (typeof url === 'string' && url.startsWith(WEB + '/')) openUrl(url); else if (url === WEB) openUrl(url); };
  function wireLinks(L) {
    const toast = L.toastMsg.bind(L);
    L.toastMsg = (m) => {
      const msg = String(m || '');

      if (/^Opens Maps/.test(msg)) { openUrl('https://maps.apple.com/?q=' + encodeURIComponent(msg.split('|')[1] || 'Challenger Singapore')); return; }
      if (/^Calling/.test(msg)) { const d = msg.replace(/\D/g, ''); openUrl('tel:+65' + (d.length === 8 ? d : '63335858')); return; }
      if (msg === 'You have logged out' || msg === 'Account deleted') {
        if (msg === 'Account deleted') { accountDemos.delete(L.state.acctKey);const a = store.get(KEY_ACCTS, {}); Object.keys(a).forEach((k) => { if (a[k].key === L.state.acctKey) delete a[k]; }); store.set(KEY_ACCTS, a); }
        L.setState({ acctKey: '', uFirst: '', uLast: '', uEmail: '', uMobile: '' });
      }
      if (/^Share sheet/.test(msg)) {
        if (navigator.share) { navigator.share({ title: 'My ValueClub savings', text: 'I saved with ValueClub this year.', url: WEB }).catch(() => {}); return; }
        if(navigator.clipboard?.writeText){navigator.clipboard.writeText(WEB).then(()=>toast('Link copied'),()=>toast('Unable to copy. Visit online.challenger.sg.'));}else toast('Sharing unavailable. Visit online.challenger.sg.');return;
      }
      toast(msg);
    };
  }

  // ---------- persistence ----------
  function snapshot(s) {
    const o = {};
    KEEP.forEach((k) => { if (s[k] !== undefined) o[k] = s[k]; });
    o.day = today();
    return o;
  }
  let saveT;
  function persist(L) {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      store.set(KEY_STATE, snapshot(L.state));rememberAccount(L.state);
      const k = L.state.acctKey;
      if (k && L.state.tier !== 'guest') {
        const accts = store.get(KEY_ACCTS, {});
        if (accts[k] && accts[k].tier !== L.state.tier) { accts[k].tier = L.state.tier; store.set(KEY_ACCTS, accts); }
      }
    }, 120);
  }

  // ---------- hidden gestures on the ValueClub logo: 3 taps opens the dev menu, 5 taps resets ----------
  let taps = [], tapT;
  function hardReset() {
    store.clear();
    document.getElementById('resetFlash').classList.add('on');
    setTimeout(() => location.reload(), 380);
  }
  document.addEventListener('pointerdown', (e) => {
    const logo = e.target && e.target.closest && e.target.closest('#root img[alt="ValueClub"]');
    if (!logo) return;
    const now = Date.now();
    if (taps.length && now - taps[taps.length - 1] > 700) taps = [];
    taps.push(now);
    clearTimeout(tapT);
    // decide once the taps stop: 3 or 4 taps open the dev menu, 5 or more reset
    tapT = setTimeout(() => { const n = taps.length; taps = []; if (n >= 5) hardReset(); else if (n >= 3) Dev.open(); }, 600);
  }, true);

  // ---------- layout: full screen on a phone, iPhone 17 frame on a computer ----------
  const isStandalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const touchMq = matchMedia('(any-pointer: coarse)');
  const isTouchPhone = touchMq.matches && Math.min(screen.width, screen.height) < 600;
  const preview = new URLSearchParams(location.search);
  const fullViewport = preview.has('viewport') || (matchMedia('(pointer: coarse)').matches && !isTouchPhone);
  const desk = !touchMq.matches && !isStandalone && !fullViewport;
  if (desk) document.body.classList.add('desk');
  const darkMq = matchMedia('(prefers-color-scheme: dark)');

  function size() {
    if (desk) {
      const preset=VCDevices.preview(devProps.deviceOverride,devProps.previewPosture,devProps.previewOrientation);
      const w=Number(devProps.w || (preset&&preset.w) || 402), h=Number(devProps.h || (preset&&preset.h) || 874);
      const sc = Math.min(1, (innerHeight - 48) / h, (innerWidth - 48) / w);
      const root = document.getElementById('root');
      document.body.dataset.previewFrame=preset.frame;
      document.body.dataset.previewOrientation=devProps.previewOrientation||(preset.w>preset.h?'landscape':'portrait');
      document.getElementById('deskNote').textContent=preset.label+' · Desktop preview';
      root.style.width=w+'px';root.style.height=h+'px';
      root.style.transform = 'translate(-50%, -50%) scale(' + sc + ')';
      const devLayer=document.getElementById('devLayer');devLayer.style.transform=root.style.transform;devLayer.style.width=w+'px';devLayer.style.height=h+'px';
      const isl = document.getElementById('island');isl.style.display=preset.frame==='duo'?'none':'';
      let cameraX=w/2,cameraY=['ipad','tab'].includes(preset.frame)?-8:11;
      if(preset.frame==='duo-closed'){
        // Apple kit: Outer Display Lens at (370,0), 95.67 square, 37px lens inset 29.333.
        cameraX=417.833;cameraY=29.333;
        
      }
      if(preset.frame==='fold-ultra'){
        cameraX=540;cameraY=11;
        if(w>h){cameraX=800-16.5;cameraY=540-5.5;}
      }
      if(preset.frame==='fold'&&w<h){cameraX=720-16.5;cameraY=480-5.5;}
      const hinge=document.getElementById('hinge');if(hinge){hinge.style.transform=root.style.transform;hinge.style.width=w+'px';hinge.style.height=h+'px';}
      if(['ipad','tab'].includes(preset.frame)&&w<h){cameraX=w+8;cameraY=h/2-4;}
      isl.style.transform='translate(calc(-50% + '+((cameraX-w/2)*sc)+'px), '+((-h/2+cameraY)*sc)+'px) scale('+sc+')';
      isl.style.transformOrigin = 'top center';
      return { w, h };
    }
    // how much of the 54px status bar area the page actually sits under (0 in Safari or a light standalone bar)
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;height:0;padding-top:env(safe-area-inset-top);visibility:hidden';
    document.body.appendChild(probe); const safeTop = parseFloat(getComputedStyle(probe).paddingTop) || 0; probe.remove();
    return { w: Math.round(innerWidth), h: Math.round(innerHeight), topAdjust: Math.max(0, 54 - safeTop) };
  }

  // ---------- mount ----------
  let devProps = store.get(KEY_DEV, {});
  if(desk&&VCDevices.presets[preview.get('device')])devProps={...devProps,deviceOverride:preview.get('device')};
  if(desk&&['open','closed'].includes(preview.get('posture')))devProps.previewPosture=preview.get('posture');
  if(desk&&['portrait','landscape'].includes(preview.get('orientation')))devProps.previewOrientation=preview.get('orientation');
  function setPreview(key,value){devProps={...devProps,[key]:value};delete devProps.w;delete devProps.h;store.set(KEY_DEV,devProps);mount();}
  const comps = {};
  defineDC('Icon', window.VC_TPL.Icon, window.IconLogic, comps);
  const App = defineDC('App', window.VC_TPL.App, window.AppLogic, comps);
  const saved = store.get(KEY_STATE, null);
  const firstRun = !saved;
  let L;

  function onLogic(logic) {
    L = logic; VCApp._L = logic;
    const s = L.state;
    if (saved) {
      Object.assign(s, saved);
      if (saved.day !== today()) { s.checked = false; s.spun = false; s.sr = 'open'; s.earned = false; }
    } else {
      s.tier = 'guest';
    }
    s.tab = 'home'; s.history = []; s.splash = true; s.iam = '';
    let previousAccountState={...s};L._onState=()=>{if(previousAccountState.acctKey&&(previousAccountState.acctKey!==L.state.acctKey||L.state.tier==='guest'))rememberAccount(previousAccountState);previousAccountState={...L.state};persist(L);};
    wireLinks(L);
    window.VCFx.install(L, document.getElementById('root'));
    window.VCSections.install(L, document.getElementById('root'));
    window.VCAccessibility.install(L, document.getElementById('root'));
  }

  let mountedLayout = '';
  function mount() {
    const sz = size();
    const layoutKey=JSON.stringify([sz,devProps,darkMq.matches]);
    // Safari URL-bar / keyboard notifications may repeat without changing layout.
    // Desktop frame scaling already happens in size(); it does not need a page render.
    if(layoutKey===mountedLayout)return;
    mountedLayout=layoutKey;
    render(h(App, { p: { platform: VCDevices.platform(navigator), size: sz.w < 600 ? 'compact' : sz.w < 840 ? 'medium' : 'expanded', tier: 'guest', w: sz.w, h: sz.h, theme: darkMq.matches ? 'dark' : 'light', intro: 'none', topAdjust: sz.topAdjust || 0, ...devProps, ...VCDevices.resolve(navigator,sz.w,sz.h,devProps.deviceOverride||'auto'), ...(preview.get('platform') === 'android' ? {platform:'android'} : {}), ...(preview.get('text') === '200' ? {textSize:'large'} : {}) }, onLogic }), document.getElementById('root'));
  }
  if (isQA) VCApp.testLayout = (w,h,p={}) => {devProps={...p,deviceOverride:p.deviceOverride||(p.duo?'iphone-duo':p.platform==='android'?'android':'iphone'),previewPosture:p.duo&&w===466?'closed':'open',previewOrientation:w>h?'landscape':'portrait',w,h,size:w<600?'compact':w<840?'medium':'expanded'};mount();};
  mount();
  const warmImages = () => ['assets/f4f1fe1c497a6645f7a23a31777d8539.jpg','assets/45fa7290869b5e4143ac98d29a13cc15.jpg','assets/hero-instax.png','assets/hero-huawei.jpg','assets/zenbook.png','assets/756b2a9aa853d0e4aa0b55ee8f8967cf.jpg','assets/7ee051c627c52b393a4afacbc93f2a61.jpg','assets/eb79d24a3a3b837fc614d883978ea6f6.jpg','assets/b5ef8f8a7ae1d1dffe0456083ba922a6.jpg','assets/f7b5ee2a9a440913f685e18f56a1b0d4.jpg'].forEach(src=>{const img=new Image();img.src=src;if(img.decode)img.decode().catch(()=>{});});
  if(window.requestIdleCallback)requestIdleCallback(warmImages,{timeout:3000});else setTimeout(warmImages,3000);
  let mT;
  const remount = () => { clearTimeout(mT); mT = setTimeout(mount, 180); };
  addEventListener('resize', remount);
  addEventListener('orientationchange', remount);
  addEventListener('pageshow', remount);
  if (window.visualViewport) visualViewport.addEventListener('resize', remount);


  // Keep system chrome stable; never sample pixels or recolour the canvas during motion.
  const tcMeta = document.getElementById('vcTheme');
  const setSystemChrome = () => { if (tcMeta) tcMeta.setAttribute('content', darkMq.matches ? '#000000' : '#F2F3F8'); };
  setSystemChrome();
  if (darkMq.addEventListener) darkMq.addEventListener('change', setSystemChrome);
  if (darkMq.addEventListener) darkMq.addEventListener('change', remount);

  // cold start: launch screen, then a short skeleton while "Braze and member data load"
  setTimeout(() => {
    L.setState({ splash: false, loading: true });
    setTimeout(() => {
      L.setState({ loading: false });
      // Campaigns are user-invoked in this prototype; never interrupt POS or payment.
      persist(L);
    }, firstRun ? 900 : 500);
  }, firstRun ? 1400 : 700);

  // iPhone Safari (not yet on the Home Screen): one-time tip
  const isIOS = /iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && isTouchPhone);
  if (isIOS && !isStandalone && !store.get(KEY_A2HS, false)) {
    // wait until no in-app message or sheet is open, so the tip never sits on top of one
    const tryShow = () => { const st = L && L.state; if (st && !st.splash && !st.loading && !st.iam && !st.modal) document.getElementById('a2hs').classList.add('on'); else setTimeout(tryShow, 800); };
    setTimeout(tryShow, 3200);
    document.getElementById('a2hsOk').onclick = () => { document.getElementById('a2hs').classList.remove('on'); store.set(KEY_A2HS, true); };
  }

  // ---------- dev menu (3 taps on the logo) ----------
  const Dev = (function () {
    const layer = document.getElementById('devLayer');
    const st = () => L.state;
    const set = (patch) => { L.setState(patch); };
    const setProp = (k, v) => { devProps = Object.assign({}, devProps, { [k]: v }); store.set(KEY_DEV, devProps); mount(); };
    const named = () => (st().uFirst ? {} : { uFirst: 'Alex', uLast: 'Tan' });
    const sections = [
      ['Preview controls', [{ label: 'Show Devices & states button', sub: 'Hide for a clean preview. Tap the ValueClub logo three times to reopen this menu.', type: 'toggle', get: () => !previewUI.hideDeviceButton, set: (v) => { previewUI = { ...previewUI, hideDeviceButton: !v }; store.set(KEY_UI, previewUI); applyPreviewControls(); } }]],
      ['Device', [{label:'Device version',sub:'Automatic uses your operating system, available space and touch support. Overrides keep actual screen size on mobile; desktop previews use sample dimensions.',type:'seg',opts:[['auto','Automatic'],['iphone','iPhone'],['iphone-duo','iPhone Duo'],['ipad','iPad Pro 11-inch'],['android','Galaxy S26 Ultra'],['android-foldable','Galaxy Z Fold8'],['android-foldable-ultra','Galaxy Z Fold8 Ultra'],['android-tablet','Galaxy Tab S12 Ultra']],get:()=>devProps.deviceOverride||'auto',set:v=>{devProps={...devProps,deviceOverride:v};for(const k of ['w','h','size','platform','duo','vbar'])delete devProps[k];store.set(KEY_DEV,devProps);mount();}},
      {label:'Duo display',when:()=>desk&&devProps.deviceOverride==='iphone-duo',type:'seg',opts:[['open','Open'],['closed','Closed']],get:()=>devProps.previewPosture||'open',set:v=>setPreview('previewPosture',v)},
      {label:'Preview orientation',when:()=>desk&&['iphone-duo','ipad','android-foldable','android-foldable-ultra','android-tablet'].includes(devProps.deviceOverride)&&!(devProps.deviceOverride==='iphone-duo'&&devProps.previewPosture==='closed'),type:'seg',opts:[['portrait','Portrait'],['landscape','Landscape']],get:()=>devProps.previewOrientation||(VCDevices.presets[devProps.deviceOverride]?.w>VCDevices.presets[devProps.deviceOverride]?.h?'landscape':'portrait'),set:v=>setPreview('previewOrientation',v)}]],
      ['Demo dates · Build 52', [{label:'Shift original dates',sub:'Shifts marketing demo dates and warranty eligibility; preserves membership/payment dates',type:'seg',opts:[[0,'Original'],[3,'+3 days'],[7,'+7 days'],[14,'+14 days']],get:()=>st().dateOffsetDays??3,set:v=>set({dateOffsetDays:Number(v)})},{label:'Custom offset in days',type:'number',get:()=>st().dateOffsetDays??3},{label:'Warranty purchase window',type:'seg',opts:[['auto','Use shifted dates'],['available','Available'],['expired','Expired']],get:()=>st().warrantyDemoState||'auto',set:v=>set({warrantyDemoState:v})}]],
      ['Account', [
        { label: 'Tier', type: 'seg', opts: [['guest', 'Guest'], ['free', 'Free'], ['m3', '3-month'], ['m12', '12-month']], get: () => st().tier,
          set: (v) => set(Object.assign(v === 'guest' ? {} : named(), { tier: v, tab: 'home', history: [], modal: '', iam: '' })) },
        { label: '3-month plan', sub: 'Shows on Membership when on 3-month', type: 'seg', opts: [['active', 'Active'], ['off', 'Auto-renew off'], ['ended', 'Ended']],
          get: () => (st().lapsed ? 'ended' : st().subCancelled ? 'off' : 'active'),
          set: (v) => set({ subCancelled: v !== 'active', lapsed: v === 'ended' }) },
        { label: 'Renewals so far', sub: 'The 12-month nudge shows from 2', type: 'seg', opts: [[0, '0'], [1, '1'], [2, '2'], [3, '3']],
          get: () => (st().renewals === undefined ? 2 : st().renewals), set: (v) => set({ renewals: v }) },
        { label: 'Birthday added', type: 'toggle', get: () => !!st().bday, set: (v) => set({ bday: v }) }
      ]],
      ['Home', [{label:'Campaign audience',type:'seg',opts:[['general','General'],['apple','Apple'],['gaming','Gaming']],get:()=>st().affinity||'general',set:(v)=>set({affinity:v})},
        { label: 'Banners', type: 'seg', opts: [['all', 'All'], ['3', '3'], ['1', '1'], ['0', 'None'], ['loading', 'Loading']], get: () => String(devProps.hero || 'all'), set: (v) => setProp('hero', v) },
        { label: 'Coming up', type: 'seg', opts: [['off', 'Off'], ['vew,ship', 'Default'], ['collect', 'Collect'], ['voucher', 'Voucher'], ['expiry,renewal', 'Expiry / renewal'], ['launch,streak', 'Launch / streak'], ['vew,ship,collect,voucher', 'All']],
          get: () => (st().attn === 'off' ? 'off' : (st().attnSet || 'vew,ship')),
          set: (v) => set(v === 'off' ? { attn: 'off' } : { attn: 'on', attnSet: v }) },
        { label: 'Cashback added today', type: 'toggle', get: () => !!st().earned, set: (v) => set({ earned: v }) },
        { label: 'Location allowed', sub: 'Nearest store shows first in Stores', type: 'toggle', get: () => String(st().loc ?? 'on') === 'on', set: (v) => set({ loc: v ? 'on' : 'off' }) }
      ]],
      ['Rewards', [
        { label: 'Checked in today', type: 'toggle', get: () => !!st().checked, set: (v) => set({ checked: v }) },
        { label: 'Spun today', type: 'toggle', get: () => !!st().spun, set: (v) => set({ spun: v }) },
        { label: 'Spend reward', type: 'seg', opts: [['open', 'Not yet'], ['got', 'Earned today']], get: () => String(st().sr || 'open'), set: (v) => set({ sr: v }) },
        { label: 'Streak saver', type: 'seg', opts: [['ready', 'Ready'], ['used', 'Used'], ['none', 'None']], get: () => String(st().saver || 'ready'), set: (v) => set({ saver: v }) },
        { label: 'Featured game', type: 'seg', opts: [['spin', 'Spin'], ['puzzle', 'Puzzle'], ['tiles', 'Tiles'], ['off', 'Off']], get: () => String(st().game || 'spin'), set: (v) => set({ game: v }) },
        { label: '11.11 campaign', type: 'toggle', get: () => String(st().campaign ?? 'on') !== 'off', set: (v) => set({ campaign: v ? 'on' : 'off' }) },
        { label: 'Games', type: 'toggle', get: () => String(st().games ?? 'on') !== 'off', set: (v) => set({ games: v ? 'on' : 'off' }) }
      ]],
      ['Messages', [
        { label: 'Inbox', type: 'seg', opts: [['cards', 'Messages'], ['empty', 'Empty']], get: () => String(devProps.inbox || 'cards'), set: (v) => setProp('inbox', v) },
        { label: 'Notifications on', type: 'toggle', get: () => st().push !== false, set: (v) => set({ push: v }) },
        { label: 'Show a message', type: 'buttons', opts: [['duo', 'iPhone Duo'], ['welcome', 'Welcome'], ['push', 'Notifications']],
          set: (v) => { close(); setTimeout(() => set({ modal: '', iam: v }), 280); } }
      ]],
      ['Scan QA', [{ label: 'Simulate result', type: 'buttons', opts: [['done','Success'],['expired','Expired'],['linked','Linked'],['offline','Offline'],['permission','Permission'],['camera','Camera'],['service','Service'],['wrong','Wrong QR']], set: (v) => { close(); L.go('scan'); clearTimeout(L._st); set({scan:v}); } }]],
      ['Display', [
        { label: 'Appearance', type: 'seg', opts: [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], get: () => st().themePref || 'system', set: (v) => set({ themePref: v }) },
        { label: 'Text size', type: 'seg', opts: [[false, 'Default'], [true, '200%']], get: () => st().bigText === true, set: (v) => set({ bigText: v }) }
      ]],
      ['App', [
        { label: 'Restart app', sub: 'Plays the launch screen again. Keeps everything.', type: 'action', run: () => { close(); setTimeout(() => location.reload(), 250); } },
        { label: 'Reset everything', sub: 'Back to first open. Same as 5 taps on the logo.', type: 'action', danger: true, run: () => { close(); hardReset(); } }
      ]]
    ];
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    let flat = [];
    function draw() {
      const s = st();
      const dark = s.themePref === 'dark' || (s.themePref !== 'light' && darkMq.matches);
      layer.dataset.theme = dark ? 'dark' : 'light';
      flat = [];
      let html = '<div class="dv-scrim" data-close></div><div class="dv-sheet" role="dialog" aria-modal="true" aria-label="Dev menu"><div class="dv-grab"></div>'
        + '<div class="dv-head"><div><b>Dev menu</b><span>Change tiers and states. Changes apply right away.</span></div><button type="button" class="dv-done" data-close>Done</button></div><div class="dv-body">';
      sections.forEach(([title, rows]) => {
        html += '<div class="dv-sec">' + esc(title) + '</div><div class="dv-group">';
        rows.forEach((r) => {
          if(r.when&&!r.when())return;
          const i = flat.push(r) - 1;
          const lab = '<div class="dv-lab"><span>' + esc(r.label) + '</span>' + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</div>';
          if (r.type === 'toggle') {
            const on = r.get();
            html += '<button type="button" class="dv-row" data-i="' + i + '" data-v="' + (!on) + '" role="switch" aria-checked="' + on + '">' + lab + '<span class="dv-sw' + (on ? ' on' : '') + '"><i></i></span></button>';
          } else if(r.type==='number'){html+='<label class="dv-row">'+lab+'<input data-date-offset type="number" min="-365" max="365" step="1" value="'+r.get()+'" style="width:80px;padding:8px;border-radius:8px"></label>';
          } else if (r.type === 'action') {
            html += '<button type="button" class="dv-row dv-act' + (r.danger ? ' danger' : '') + '" data-i="' + i + '">' + lab + '</button>';
          } else {
            const cur = r.get ? r.get() : undefined;
            html += '<div class="dv-row dv-col">' + lab + '<div class="' + (r.type === 'seg' ? 'dv-seg' + (r.label === 'Device version' ? ' dv-devices' : '') : 'dv-btns') + '">';
            r.opts.forEach(([v, t], j) => {
              html += '<button type="button" data-i="' + i + '" data-j="' + j + '"' + (r.type === 'seg' && String(v) === String(cur) ? ' class="on" aria-pressed="true"' : '') + '>' + esc(t) + '</button>';
            });
            html += '</div></div>';
          }
        });
        html += '</div>';
      });
      html += '<p class="dv-foot">3 taps on the ValueClub logo opens this menu. 5 taps resets the app.<br>Build: Device previews v52 · handoff revision 6</p></div></div>';
      const keep = layer.querySelector('.dv-body'); const top = keep ? keep.scrollTop : 0;
      layer.innerHTML = html;
      const body = layer.querySelector('.dv-body'); if (body) body.scrollTop = top;
    }
    layer.addEventListener('change',e=>{if(e.target.matches('[data-date-offset]')){set({dateOffsetDays:Math.max(-365,Math.min(365,Number(e.target.value)||0))});draw();}});
    layer.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) { close(); return; }
      const b = e.target.closest('[data-i]'); if (!b) return;
      const r = flat[+b.dataset.i];
      if (r.type === 'toggle') r.set(b.dataset.v === 'true');
      else if (r.type === 'action') r.run();
      else r.set(r.opts[+b.dataset.j][0]);
      if (r.type !== 'action' && r.type !== 'buttons') setTimeout(draw, 30);
    });
    function open() { if (!L) return; draw(); layer.classList.add('show'); requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('on'))); }
    function close() { layer.classList.remove('on'); setTimeout(() => { if (!layer.classList.contains('on')) layer.classList.remove('show'); }, 320); }
    return { open, close };
  })();
  VCApp.dev = Dev;

  // offline support once installed
  if(!isQA&&'serviceWorker' in navigator&&(location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname))) {
    // Apply the new offline cache on the next launch; never reload an active interaction.
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
  }
})();

VCCampaigns.mount();
