/* ValueClub MVP shell: mounts the App, saves state, fake accounts, real links, hidden reset. */
(function () {
  const WEB = 'https://online.challenger.sg';
  const KEY_STATE = 'vc_state_v1';
  const KEY_ACCTS = 'vc_accounts_v1';
  const KEY_A2HS = 'vc_a2hs_seen';
  const KEY_DEV = 'vc_dev_v1';
  const { defineDC, h, render } = window.VCRuntime;

  // ---------- storage (never fatal) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    clear() { try { [KEY_STATE, KEY_ACCTS, KEY_A2HS, KEY_DEV].forEach((k) => localStorage.removeItem(k)); } catch (e) {} }
  };
  const today = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); };

  // state that survives a relaunch (everything else starts fresh, like a cold app start)
  const KEEP = ['tier', 'uFirst', 'uLast', 'uEmail', 'uMobile', 'acctKey', 'claimed', 'read', 'dismissed', 'bday', 'themePref', 'bigText',
    'push', 'notif', 'subCancelled', 'lapsed', 'renewals', 'checked', 'spun', 'saver', 'mktOn', 'remember', 'reminded', 'chJoined', 'sr', 'earned', 'day',
    'attn', 'attnSet', 'campaign', 'game', 'games', 'loc', 'cardLead'];

  // ---------- accounts (prototype only: any details work) ----------
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');
  function nameFromId(id) {
    if (id.indexOf('@') > 0) {
      const parts = id.split('@')[0].split(/[._\-+0-9]+/).filter(Boolean);
      if (parts.length) return { first: cap(parts[0]), last: cap(parts[1] || '') };
    }
    return { first: 'Alex', last: 'Tan' };
  }
  function signIn(L, acc, msg) {
    L.setState({ uFirst: acc.first, uLast: acc.last, uEmail: acc.email || L.state.uEmail, uMobile: acc.mobile || L.state.uMobile, acctKey: acc.key, scan: 'idle' });
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
  function wireLinks(L) {
    const toast = L.toastMsg.bind(L);
    L.toastMsg = (m) => {
      const msg = String(m || '');
      if (/challenger\.sg/i.test(msg)) { toast(msg.indexOf('Code copied') === 0 ? msg : 'Opening challenger.sg'); setTimeout(() => openUrl(WEB), 250); return; }
      if (/^Opens Maps/.test(msg)) { openUrl('https://maps.apple.com/?q=' + encodeURIComponent(msg.split('|')[1] || 'Challenger Singapore')); return; }
      if (/^Calling/.test(msg)) { const d = msg.replace(/\D/g, ''); openUrl('tel:+65' + (d.length === 8 ? d : '63335858')); return; }
      if (msg === 'You have logged out' || msg === 'Account deleted') {
        if (msg === 'Account deleted') { const a = store.get(KEY_ACCTS, {}); Object.keys(a).forEach((k) => { if (a[k].key === L.state.acctKey) delete a[k]; }); store.set(KEY_ACCTS, a); }
        L.setState({ acctKey: '', uFirst: '', uLast: '', uEmail: '', uMobile: '' });
      }
      if (/^Share sheet/.test(msg)) {
        if (navigator.share) { navigator.share({ title: 'My ValueClub savings', text: 'I saved with ValueClub this year.', url: WEB }).catch(() => {}); return; }
        if (navigator.clipboard) navigator.clipboard.writeText(WEB).then(() => toast('Link copied'), () => toast('Could not copy the link'));
        else toast('Sharing is unavailable in this browser'); return;
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
      store.set(KEY_STATE, snapshot(L.state));
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
  const isTouchPhone = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
  const desk = !isTouchPhone;
  if (desk) document.body.classList.add('desk');
  document.documentElement.classList.toggle('vc-standalone', isStandalone && !desk);
  const darkMq = matchMedia('(prefers-color-scheme: dark)');

  function size() {
    if (desk) {
      const sc = Math.min(1, (innerHeight - 48) / 874, (innerWidth - 48) / 402);
      const root = document.getElementById('root');
      root.style.transform = 'translate(-50%, -50%) scale(' + sc + ')';
      document.getElementById('devLayer').style.transform = root.style.transform;
      const isl = document.getElementById('island');
      isl.style.transform = 'translate(-50%, ' + (-437 * sc + 11 * sc) + 'px) scale(' + sc + ')';
      isl.style.transformOrigin = 'top center';
      return { w: 402, h: 874 };
    }
    const root = document.getElementById('root');
    // The shell starts below the safe area; remove the canvas's simulated status space.
    const safeTop = parseFloat(getComputedStyle(root).top) || 0;
    const vv = window.visualViewport;
    if (vv && Math.abs(vv.scale - 1) < 0.01) root.style.height = Math.max(1, Math.round(vv.height - safeTop)) + 'px';
    return { w: Math.round(root.clientWidth), h: Math.round(root.clientHeight),
      topAdjust: isStandalone ? 54 : Math.max(0, 54 - safeTop) };

  }

  // ---------- mount ----------
  let devProps = store.get(KEY_DEV, {});
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
    L._onState = () => { persist(L); queueTheme(); };
    wireLinks(L);
    window.VCFx.install(L, document.getElementById('root'));
  }

  let lastMount = "";
  function mount() {
    const sz = size();
    const signature = JSON.stringify([sz, darkMq.matches, devProps]);
    if (signature === lastMount) return;
    lastMount = signature;
    render(h(App, { p: { platform: 'ios', size: 'compact', tier: 'guest', w: sz.w, h: sz.h, theme: darkMq.matches ? 'dark' : 'light', intro: 'none', topAdjust: sz.topAdjust || 0, ...devProps }, onLogic }), document.getElementById('root'));
  }
  mount();
  let mT;
  const remount = () => { clearTimeout(mT); mT = setTimeout(mount, 60); };
  addEventListener('resize', remount);
  addEventListener('orientationchange', remount);
  addEventListener('pageshow', remount);
  if (window.visualViewport) visualViewport.addEventListener('resize', remount);
  if (window.ResizeObserver) new ResizeObserver(remount).observe(document.getElementById('root'));

  // A stable status background avoids top-edge sampling and layout reads during scrolling.
  const tcMeta = document.getElementById('vcTheme');
  let tcRaf = 0;
  function syncTheme() {
    tcRaf = 0;
    if (desk) return;
    const pref = L && L.state.themePref;
    const dark = pref === 'dark' || (pref !== 'light' && darkMq.matches);
    const col = dark ? '#222E73' : '#3348AD';
    document.documentElement.style.setProperty('--vc-status', col);
    document.documentElement.style.backgroundColor = col;
    document.body.style.backgroundColor = col;
    if (tcMeta) tcMeta.content = col;
  }
  function queueTheme() { if (!tcRaf) tcRaf = requestAnimationFrame(syncTheme); }
  if (darkMq.addEventListener) darkMq.addEventListener('change', queueTheme);
  queueTheme();
  if (darkMq.addEventListener) darkMq.addEventListener('change', remount);
  const flush = () => { if (L) { clearTimeout(saveT); store.set(KEY_STATE, snapshot(L.state)); } };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  addEventListener('pagehide', flush);

  // cold start: launch screen, then a short skeleton while "Braze and member data load"
  setTimeout(() => {
    L.setState({ splash: false, loading: true });
    setTimeout(() => {
      L.setState({ loading: false });
      if (firstRun) setTimeout(() => L.setState({ iam: 'duo' }), 500);
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
      ['Home', [
        { label: 'Banners', type: 'seg', opts: [['3', '3'], ['1', '1'], ['0', 'None'], ['loading', 'Loading']], get: () => String(devProps.hero || '3'), set: (v) => setProp('hero', v) },
        { label: 'Coming up', type: 'seg', opts: [['off', 'Off'], ['vew,ship', 'Default'], ['collect', 'Collect'], ['voucher', 'Voucher'], ['vew,ship,collect,voucher', 'All']],
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
      ['Display', [
        { label: 'Appearance', type: 'seg', opts: [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], get: () => st().themePref || 'system', set: (v) => set({ themePref: v }) },
        { label: 'Text size', type: 'seg', opts: [[false, 'Default'], [true, 'Large']], get: () => st().bigText === true, set: (v) => set({ bigText: v }) }
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
          const i = flat.push(r) - 1;
          const lab = '<div class="dv-lab"><span>' + esc(r.label) + '</span>' + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</div>';
          if (r.type === 'toggle') {
            const on = r.get();
            html += '<button type="button" class="dv-row" data-i="' + i + '" data-v="' + (!on) + '" role="switch" aria-checked="' + on + '">' + lab + '<span class="dv-sw' + (on ? ' on' : '') + '"><i></i></span></button>';
          } else if (r.type === 'action') {
            html += '<button type="button" class="dv-row dv-act' + (r.danger ? ' danger' : '') + '" data-i="' + i + '">' + lab + '</button>';
          } else {
            const cur = r.get ? r.get() : undefined;
            html += '<div class="dv-row dv-col">' + lab + '<div class="' + (r.type === 'seg' ? 'dv-seg' : 'dv-btns') + '">';
            r.opts.forEach(([v, t], j) => {
              html += '<button type="button" data-i="' + i + '" data-j="' + j + '"' + (r.type === 'seg' && String(v) === String(cur) ? ' class="on" aria-pressed="true"' : '') + '>' + esc(t) + '</button>';
            });
            html += '</div></div>';
          }
        });
        html += '</div>';
      });
      html += '<p class="dv-foot">3 taps on the ValueClub logo opens this menu. 5 taps resets the app.<br>Build: status bar v3</p></div></div>';
      const keep = layer.querySelector('.dv-body'); const top = keep ? keep.scrollTop : 0;
      layer.innerHTML = html;
      const body = layer.querySelector('.dv-body'); if (body) body.scrollTop = top;
    }
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
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
  }
})();
