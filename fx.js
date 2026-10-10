/* ValueClub MVP motion: native-style page pushes, sheets, messages, toasts and the edge swipe back.
   Hooks into the App's setState, so the canvas App code stays as it is. */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const EASE_PUSH = 'cubic-bezier(.2,.85,.25,1)';
  const EASE_OUT = 'cubic-bezier(.3,0,.8,.15)';
  const MAIN_TABS = { home: 1, vouchers: 1, account: 1, discover: 1 };
  let L, pendingPopFrom = 0, under = null;
  const stack = []; // snapshots of the pages underneath, for the swipe back
  const stash = (g) => { g.getAnimations({ subtree: true }).forEach((a) => a.cancel()); g.remove(); g.style.boxShadow = ''; stack.push(g); if (stack.length > 8) stack.shift(); };

  const anim = (el, frames, opts) => (el && el.animate ? el.animate(frames, Object.assign({ fill: 'both' }, opts)) : null);
  const done = (a, fn) => { if (a) a.onfinish = a.oncancel = fn; else fn(); };

  // pages with the navy band: the band is fixed behind the scroller, so a moving page carries a copy of it
  function bandBg(app, bg) {
    const b = app && app.querySelector('[data-band]');
    if (!b) return bg;
    return getComputedStyle(b).backgroundImage + ' 0 0 / 100% ' + b.offsetHeight + 'px no-repeat, ' + bg;
  }
  function withBand(sc, app) {
    const b = app && app.querySelector('[data-band]');
    if (!b) return null;
    const c = b.cloneNode(true); c.style.position = 'absolute'; c.removeAttribute('data-band'); sc.prepend(c); return c;
  }
  function bgOf(el) {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const c = getComputedStyle(e).backgroundColor;
      if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) return c;
    }
    return getComputedStyle(document.body).backgroundColor || '#fff';
  }

  // Purchases on a phone: the list and the order detail are the same tab, switched by rSel
  const inReceiptDetail = (st) => st.tab === 'receipts' && !!st.rSel && L.props.size === 'compact';
  function classify(prev, patch) {
    if (patch.tab === undefined && prev.tab === 'receipts' && patch.rSel !== undefined && L.props.size === 'compact' && !prev.splash) {
      if (patch.rSel && !prev.rSel) return 'push';
      if (!patch.rSel && prev.rSel) return 'pop';
      return '';
    }
    if (patch.tab === undefined || patch.tab === prev.tab || prev.splash) return '';
    const to = patch.tab, from = prev.tab;
    if (patch.tier !== undefined) return 'fade';
    if (to === 'scan') return 'up';
    if (from === 'scan') return 'down';
    const ph = (prev.history || []).length;
    const nh = patch.history ? patch.history.length : ph;
    if (nh === 0 && MAIN_TABS[to] && MAIN_TABS[from]) return 'tab';
    if (nh === 0 && ph > 0) return 'pop';
    if (nh > ph) return 'push';
    if (nh < ph) return 'pop';
    return 'fade';
  }

  // ---------- before a state change: remember what is on screen ----------
  function before(prev, patch) {
    if (reduce.matches) return null;
    const sc = L.scroller;
    const app = sc && sc.parentElement;
    if (!app) return null;
    const plan = { layers: [], nav: classify(prev, patch), sc, app, loadingEnd: prev.loading && patch.loading === false };
    plan.hadBand = !!app.querySelector('[data-band]');
    // a new page starts with its header in place and the sheet's corners round (the scroll position is reset)
    if (plan.nav === 'tab') { const ord = ['home', 'discover', 'vouchers', 'account']; plan.dir = Math.sign(ord.indexOf(patch.tab) - ord.indexOf(prev.tab)) || 1; }
    app.querySelectorAll('[data-fx]').forEach((el) => plan.layers.push({ el, parent: el.parentElement }));
    const vtSkip = useVT && plan.nav === 'pop' && !pendingPopFrom;
    if (!vtSkip && (plan.nav === 'push' || plan.nav === 'pop' || plan.nav === 'down' || plan.nav === 'tab' || plan.nav === 'fade')) {
      const page = sc.firstElementChild;
      if (page) {
        const ghost = document.createElement('div');
        ghost.setAttribute('aria-hidden', 'true');
        ghost.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;background:' + bgOf(sc) + ';';
        // the snapshot carries its own navy and waves, so it can move or fade as one layer
        const band0 = app.querySelector('[data-band]');
        // a tab switch leaves the live navy in place so its waves can glide; a page push carries its own copy
        if (band0 && plan.nav === 'tab') ghost.style.background = 'transparent';
        else if (band0) ghost.appendChild(band0.cloneNode(true));
        const clone = page.cloneNode(true);
        clone.style.translate = '0 ' + (-sc.scrollTop) + 'px';
        clone.querySelectorAll('[data-in],[data-seg],[data-tabind],[data-fx],[data-tabbar]').forEach((e) => ['data-in', 'data-seg', 'data-tabind', 'data-fx', 'data-tabbar'].forEach((k) => e.removeAttribute(k)));
        ghost.appendChild(clone);
        plan.ghost = ghost;
      }
    }
    return plan;
  }

  // ---------- after the new screen is drawn: animate the difference ----------
  function after(plan) {
    const { sc, app } = plan;
    // layers that went away (sheets, messages, toasts, launch screen): put the old node back and animate it out
    const had = new Set();
    plan.layers.forEach(({ el, parent }) => {
      had.add(el);
      if (el.isConnected || !parent || !parent.isConnected) return;
      el.style.pointerEvents = 'none';
      parent.appendChild(el);
      const kind = el.getAttribute('data-fx');
      let a;
      if (kind === 'scrim') {
        const box = el.firstElementChild;
        a = anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease' });
        if (box) anim(box, isSheet(box) ? [{ translate: '0 0' }, { translate: '0 100%' }] : [{ scale: '1', opacity: 1 }, { scale: '.94', opacity: 0 }], { duration: 240, easing: EASE_OUT });
      } else if (kind === 'toast') {
        a = anim(el, [{ opacity: 1, scale: '1' }, { opacity: 0, scale: '.92' }], { duration: 200, easing: 'ease-in' });
      } else if (kind === 'peel') {
        a = anim(el, [{ opacity: 1, scale: '1', rotate: '0deg', translate: '0 0' }, { opacity: 0, scale: '1.15', rotate: '-8deg', translate: '-30px -40px' }], { duration: 480, easing: 'cubic-bezier(.3,.6,.4,1)' });
      } else if (kind === 'screen') {
        a = anim(el, [{ opacity: 1, scale: '1' }, { opacity: 0, scale: '1.03' }], { duration: 260, easing: 'ease' });
      } else if (kind === 'splash') {
        const logo = el.querySelector('img,span');
        if (logo) anim(logo, [{ scale: '1' }, { scale: '1.08' }], { duration: 420, easing: EASE_OUT });
        a = anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease' });
      } else {
        a = anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
      }
      done(a, () => el.remove());
    });
    // layers that are new: animate in
    app.querySelectorAll('[data-fx]').forEach((el) => {
      if (had.has(el)) return;
      const kind = el.getAttribute('data-fx');
      if (kind === 'scrim') {
        anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease', fill: 'none' });
        const box = el.firstElementChild;
        if (box) {
          if (isSheet(box)) anim(box, [{ translate: '0 100%' }, { translate: '0 0' }], { duration: 420, easing: EASE_PUSH, fill: 'none' });
          else anim(box, [{ scale: '.88', opacity: 0 }, { scale: '1.015', opacity: 1, offset: 0.7 }, { scale: '1', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'none' });
        }
      } else if (kind === 'toast') {
        anim(el, [{ opacity: 0, translate: '0 14px', scale: '.94' }, { opacity: 1, translate: '0 0', scale: '1' }], { duration: 320, easing: EASE_PUSH, fill: 'none' });
      } else if (kind === 'screen') {
        anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease', fill: 'none' });
        const card = el.querySelector('[data-wiggle]');
        if (card) anim(card, [{ scale: '.7', opacity: 0, rotate: '-12deg' }, { scale: '1.04', opacity: 1, rotate: '1deg', offset: 0.7 }, { scale: '1', opacity: 1, rotate: '0deg' }], { duration: 560, delay: 80, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
      }
    });
    // skeleton to content
    if (plan.loadingEnd && sc.firstElementChild) anim(sc.firstElementChild, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease', fill: 'none' });
    // page transitions
    const g = plan.ghost;
    const kind = plan.nav;
    if (!kind) return;
    const bg = bgOf(sc);
    const finish = () => { if (g) g.remove(); sc.style.background = ''; sc.style.boxShadow = ''; };
    const bandToBand = false;
    if (bandToBand) {
      // every navy page puts the sheet at the same height: the navy and the sheet stay still, only what is on them changes
      if (kind === 'tab') stack.length = 0;
      if (kind === 'pop') { stack.pop(); if (under) { under.remove(); under = null; } pendingPopFrom = 0; }
      const d = kind === 'tab' ? (plan.dir || 1) : kind === 'push' ? 1 : -1;
      g.style.background = 'transparent'; g.style.zIndex = '3';
      const gs = g.querySelector('[data-sheet]'); if (gs) { gs.style.background = 'transparent'; gs.style.boxShadow = 'none'; }
      sc.after(g);
      const gp = g.firstElementChild; const gy = gp.style.translate.split(' ')[1] || '0px';
      const a = anim(gp, [{ opacity: 1, translate: '0 ' + gy }, { opacity: 0, translate: (-d * 36) + 'px ' + gy }], { duration: 120, easing: 'cubic-bezier(.4,0,1,1)' });
      const page = sc.firstElementChild, inner = page && page.querySelector(':scope > div');
      const parts = [];
      const add = (el) => { if (getComputedStyle(el).display === 'contents') [...el.children].forEach(add); else parts.push(el); };
      if (inner) [...inner.children].forEach((c) => { if (c.hasAttribute('data-sheet')) [...c.children].forEach(add); else add(c); });
      parts.forEach((el) => anim(el, [{ opacity: 0, translate: (d * 48) + 'px 0' }, { opacity: 1, translate: '0 0' }], { duration: 380, delay: 110, easing: 'cubic-bezier(.2,.85,.25,1)', fill: 'backwards' }));
      done(a, () => {
        if (kind !== 'push') { g.remove(); return; }
        // keep a snapshot for the edge swipe back, with its own navy and sheet
        g.getAnimations({ subtree: true }).forEach((x) => x.cancel()); gp.style.opacity = '';
        if (gs) { gs.style.background = ''; gs.style.boxShadow = ''; } g.style.background = bandBg(app, bgOf(sc)); stash(g);
      });
      return;
    }
    if (kind === 'push') {
      if (g) sc.before(g);
      // the new page slides in on top as a full layer, carrying its own navy; the page underneath stays put
      const nb = withBand(sc, app);
      sc.style.background = bg; sc.style.boxShadow = '-10px 0 30px rgba(0,0,0,.14)';
      const a = anim(sc, [{ translate: '100% 0' }, { translate: '0 0' }], { duration: 420, easing: EASE_PUSH, fill: 'none' });
      done(a, () => { if (nb) nb.remove(); if (g) stash(g); sc.style.background = ''; sc.style.boxShadow = ''; });
    } else if (kind === 'pop') {
      const from = pendingPopFrom; pendingPopFrom = 0;
      stack.pop(); if (under) { under.remove(); under = null; }
      // the top layer slides off to the right and uncovers the page underneath, which does not move
      if (g) { sc.after(g); g.style.zIndex = '3'; g.style.boxShadow = '-10px 0 30px rgba(0,0,0,.14)'; }
      const a = g ? anim(g, [{ translate: from + 'px 0' }, { translate: '100% 0' }], { duration: 360, easing: EASE_PUSH }) : null;
      done(a, finish);
    } else if (kind === 'up') {
      sc.style.background = bg;
      const a = anim(sc, [{ translate: '0 100%' }, { translate: '0 0' }], { duration: 460, easing: EASE_PUSH, fill: 'none' });
      done(a, finish);
    } else if (kind === 'down') {
      if (g) sc.after(g);
      const a = anim(g, [{ translate: '0 0' }, { translate: '0 100%' }], { duration: 380, easing: EASE_PUSH });
      done(a, finish);
    } else {
      stack.length = 0;
      const page = sc.firstElementChild;
      const band = app.querySelector('[data-band]');
      // tab switch: the whole screen, navy included, cross-fades
      if (g) { sc.after(g); g.style.zIndex = '3'; }
      const a = g ? anim(g, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease' }) : null;
      const pg = sc.firstElementChild; if (pg) anim(pg, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease', fill: 'none' });
      done(a, finish);
    }
  }

  function isSheet(box) {
    const cs = getComputedStyle(box);
    return cs.position === 'absolute' && cs.bottom === '0px';
  }

  // ---------- iOS edge swipe back ----------
  function edgeSwipe(rootEl) {
    let sx = 0, sy = 0, on = false, dx = 0, sb = null;
    const dropSb = () => { if (sb) { sb.remove(); sb = null; } };
    rootEl.addEventListener('touchstart', (e) => {
      const t = e.touches[0]; const r = rootEl.getBoundingClientRect();
      const s = L && L.state;
      on = !!(s && ((s.history || []).length || inReceiptDetail(s)) && !s.modal && !s.iam && !s.bdaySheet && s.tab !== 'scan' && t.clientX - r.left < 24);
      sx = t.clientX; sy = t.clientY; dx = 0;
      if (on && stack.length && L.scroller) {
        under = stack[stack.length - 1];
        under.style.translate = '0 0';
        L.scroller.before(under);
        dropSb(); sb = withBand(L.scroller, L.scroller.parentElement);
        L.scroller.style.background = bgOf(L.scroller);
      }
    }, { passive: true });
    rootEl.addEventListener('touchmove', (e) => {
      if (!on) return;
      const t = e.touches[0]; dx = Math.max(0, t.clientX - sx);
      if (Math.abs(t.clientY - sy) > 40 && dx < 30) { on = false; dropSb(); L.scroller.style.translate = ''; L.scroller.style.background = ''; if (under) { under.remove(); under = null; } return; }
      L.scroller.style.translate = dx + 'px 0';
      L.scroller.style.boxShadow = '-10px 0 30px rgba(0,0,0,.14)';
    }, { passive: true });
    rootEl.addEventListener('touchend', () => {
      if (!on) return; on = false;
      const sc = L.scroller;
      if (dx > Math.min(110, sc.clientWidth * 0.3)) {
        sc.style.translate = ''; sc.style.boxShadow = ''; dropSb();
        pendingPopFrom = dx; if (inReceiptDetail(L.state)) L.setState({ rSel: '' }); else L.back();
      } else {
        const a = anim(sc, [{ translate: dx + 'px 0' }, { translate: '0 0' }], { duration: 250, easing: EASE_PUSH, fill: 'none' });
        const u = under; under = null;
        sc.style.translate = ''; done(a, () => { dropSb(); sc.style.boxShadow = ''; sc.style.background = ''; if (u) u.remove(); });
      }
    });
  }

  // ======================================================================
  // After every render: tab bar, segmented controls, entrance animations
  // ======================================================================
  const seen = new WeakSet();
  const segLast = new WeakMap();
  const SPRING = 'cubic-bezier(.25,1.25,.45,1)';   // light overshoot, like a UIKit spring
  const tb = { ind: null, x: null, w: null, min: false, pressing: false, dragged: false, suppress: false, raf: 0 };

  function postRender() {
    if (!L || !L.scroller) return;
    const app = L.scroller.parentElement;
    syncTabBar(app, false);
    syncSegments(app);
    entrances(app);
  }

  // ---------- iOS tab bar: sliding glass selection, press-and-drag lens, minimise on scroll ----------
  function tabTarget(bar) {
    const btn = bar.querySelector(':scope > button[data-on]');
    return btn ? { btn, x: btn.offsetLeft, w: btn.offsetWidth } : null;
  }
  function placeInd(ind, x, w) { ind.style.translate = x + 'px 0'; ind.style.width = w + 'px'; tb.x = x; tb.w = w; }

  function syncTabBar(app, force) {
    const bar = app.querySelector('[data-tabbar]');
    if (!bar) { tb.ind = null; return; }
    const wrap = bar.parentElement;
    wrap.setAttribute('data-tbwrap', '1'); if (!wrap.style.viewTransitionName) wrap.style.viewTransitionName = 'vc-tabs';
    const ind = bar.querySelector('[data-tabind]');
    const s = L.state;
    // minimise while scrolling down a main tab, like tabBarMinimizeBehavior(.onScrollDown)
    // iOS 27: the tab bar stays full size while scrolling (no minimise)
    const min = false;
    if (min !== tb.min) {
      tb.min = min;
      if (min) wrap.setAttribute('data-tbmin', '1'); else wrap.removeAttribute('data-tbmin');
      if (!min) {
        // expanding: wait for the bar to grow back, then bring the selection pill in
        ind.style.opacity = '0';
        setTimeout(() => { const t = tabTarget(bar); if (t) placeInd(ind, t.x, t.w); anim(ind, [{ opacity: 0, scale: '.6' }, { opacity: 1, scale: '1' }], { duration: 320, easing: SPRING, fill: 'none' }); ind.style.opacity = ''; }, 430);
      }
      tb.ind = ind;
      return;
    }
    if (tb.min || tb.pressing) { tb.ind = ind; return; }
    const t = tabTarget(bar);
    if (!t) return;
    const fresh = tb.ind !== ind || !ind.style.width;
    tb.ind = ind;
    if (fresh || force || reduce.matches || tb.x === null) { placeInd(ind, t.x, t.w); return; }
    if (Math.abs(t.x - tb.x) < 1 && Math.abs(t.w - tb.w) < 1) return;
    // liquid morph: the pill stretches to cover both tabs, then settles on the new one
    const x0 = tb.x, w0 = tb.w;
    const lo = Math.min(x0, t.x), hi = Math.max(x0 + w0, t.x + t.w);
    placeInd(ind, t.x, t.w);
    anim(ind, [
      { translate: x0 + 'px 0', width: w0 + 'px', scale: '1 1' },
      { translate: lo + 'px 0', width: (hi - lo) + 'px', scale: '1 .86', offset: 0.45 },
      { translate: t.x + 'px 0', width: t.w + 'px', scale: '1 1' }
    ], { duration: 520, easing: 'cubic-bezier(.3,.9,.3,1.05)', fill: 'none' });
    const icon = t.btn.querySelector('svg');
    if (icon) anim(icon, [{ scale: '1' }, { scale: '1.22', offset: 0.35 }, { scale: '.94', offset: 0.7 }, { scale: '1' }], { duration: 480, easing: 'ease-out', fill: 'none' });
  }

  function tabBarGestures(rootEl) {
    let bar = null, startX = 0;
    const btnAt = (x) => {
      let best = null, bd = 1e9;
      bar.querySelectorAll(':scope > button').forEach((b) => { const r = b.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - x); if (d < bd) { bd = d; best = b; } });
      return best;
    };
    const moveLens = (clientX) => {
      const r = bar.getBoundingClientRect(); const k = r.width / bar.offsetWidth || 1;
      const w = tb.w || 80; let x = (clientX - r.left) / k - w / 2;
      x = Math.max(2, Math.min(bar.offsetWidth - w - 2, x));
      tb.ind.style.translate = x + 'px 0';
      bar.querySelectorAll(':scope > button').forEach((b) => b.classList.toggle('tb-hot', b === btnAt(clientX)));
    };
    rootEl.addEventListener('pointerdown', (e) => {
      const b = e.target.closest && e.target.closest('[data-tabbar]');
      if (!b || reduce.matches || tb.min || !tb.ind) return;
      bar = b; startX = e.clientX; tb.pressing = true; tb.dragged = false;
      bar.classList.add('tb-press'); tb.ind.classList.add('tb-lens');
      moveLens(e.clientX);
    });
    rootEl.addEventListener('pointermove', (e) => {
      if (!tb.pressing || !bar) return;
      if (Math.abs(e.clientX - startX) > 8) tb.dragged = true;
      moveLens(e.clientX);
    });
    const end = (e, cancelled) => {
      if (!tb.pressing || !bar) return;
      const target = !cancelled && tb.dragged ? btnAt(e.clientX) : null;
      tb.pressing = false;
      bar.classList.remove('tb-press'); tb.ind.classList.remove('tb-lens');
      bar.querySelectorAll('.tb-hot').forEach((b) => b.classList.remove('tb-hot'));
      // let the lens settle back onto a tab
      const from = tb.ind.style.translate;
      const b0 = bar;
      bar = null;
      if (target) {
        tb.suppress = true; setTimeout(() => { tb.suppress = false; }, 400);
        if (target.hasAttribute('data-on')) { const t = tabTarget(b0); anim(tb.ind, [{ translate: from }, { translate: t.x + 'px 0' }], { duration: 380, easing: SPRING, fill: 'none' }); tb.ind.style.translate = t.x + 'px 0'; }
        else { tb.x = parseFloat(from) || tb.x; target.click(); }
      } else if (!cancelled) {
        // a plain tap: the button's own click selects the tab; start the morph from where the lens is
        tb.x = parseFloat(from) || tb.x;
        setTimeout(() => { if (b0.isConnected) syncTabBar(L.scroller.parentElement, false); const t = tabTarget(b0); if (t && Math.abs(parseFloat(tb.ind.style.translate) - t.x) > 1) { anim(tb.ind, [{ translate: from }, { translate: t.x + 'px 0' }], { duration: 380, easing: SPRING, fill: 'none' }); placeInd(tb.ind, t.x, t.w); } }, 0);
      } else {
        const t = tabTarget(b0); if (t) placeInd(tb.ind, t.x, t.w);
      }
    };
    rootEl.addEventListener('pointerup', (e) => end(e, false));
    rootEl.addEventListener('pointercancel', (e) => end(e, true));
    // after a drag, the browser still fires a click on the button the finger started on: swallow it
    document.addEventListener('click', (e) => { if (tb.suppress && e.isTrusted && e.target.closest && e.target.closest('[data-tabbar]')) { e.stopPropagation(); e.preventDefault(); tb.suppress = false; } }, true);
  }

  // ---------- segmented controls: the selected thumb slides ----------
  function syncSegments(app) {
    app.querySelectorAll('[data-seg]').forEach((wrap) => {
      const btns = Array.from(wrap.querySelectorAll(':scope > button'));
      const i = btns.findIndex((b) => { const c = getComputedStyle(b).backgroundColor; return c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c); });
      if (i < 0) return;
      const b = btns[i];
      const rect = { x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight };
      const last = segLast.get(wrap);
      segLast.set(wrap, { i, rect });
      if (!last || last.i === i || reduce.matches) return;
      const cs = getComputedStyle(b);
      const thumb = document.createElement('span');
      thumb.setAttribute('aria-hidden', 'true');
      thumb.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:0;background:' + cs.backgroundColor + ';border-radius:' + cs.borderRadius + ';box-shadow:' + cs.boxShadow + ';height:' + rect.h + 'px;';
      wrap.insertBefore(thumb, wrap.firstChild);
      const bg = b.style.getPropertyValue('background'), sh = b.style.getPropertyValue('box-shadow');
      b.style.setProperty('background', 'transparent', 'important'); b.style.setProperty('box-shadow', 'none', 'important');
      const a = anim(thumb, [
        { translate: last.rect.x + 'px ' + last.rect.y + 'px', width: last.rect.w + 'px' },
        { translate: rect.x + 'px ' + rect.y + 'px', width: rect.w + 'px' }
      ], { duration: 360, easing: SPRING });
      done(a, () => { thumb.remove(); b.style.removeProperty('background'); b.style.removeProperty('box-shadow'); if (bg) b.style.setProperty('background', bg); if (sh) b.style.setProperty('box-shadow', sh); });
    });
  }

  // ---------- one-off entrance animations for things that appear ----------
  function entrances(app) {
    let coin = 0;
    app.querySelectorAll('[data-in]').forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      if (reduce.matches) return;
      const k = el.getAttribute('data-in');
      if (k === 'rise') anim(el, [{ opacity: 0, translate: '0 24px', scale: '.97' }, { opacity: 1, translate: '0 0', scale: '1' }], { duration: 480, easing: EASE_PUSH, fill: 'backwards' });
      else if (k === 'pop') anim(el, [{ scale: '0', opacity: 0 }, { scale: '1.18', opacity: 1, offset: 0.6 }, { scale: '1', opacity: 1 }], { duration: 460, delay: 120, easing: 'ease-out', fill: 'backwards' });
      else if (k === 'reveal') anim(el, [{ opacity: 0, translate: '0 -6px', clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, translate: '0 0', clipPath: 'inset(0 0 0 0)' }], { duration: 300, easing: EASE_PUSH, fill: 'none' });
      else if (k === 'coin') {
        const n = coin++;
        anim(el, [{ translate: '0 80px', scale: '0', opacity: 0 }, { translate: '0 -14px', scale: '1.2', opacity: 1, offset: 0.55 }, { translate: '0 0', scale: '1', opacity: 1 }], { duration: 620, delay: 60 + n * 55, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards', composite: 'add' });
      }
    });
  }

  // ---------- small touches ----------
  function extras(rootEl) {
    // scratch card wiggles when scratched
    rootEl.addEventListener('click', (e) => {
      const c = e.target.closest && e.target.closest('[data-wiggle]');
      if (c && !reduce.matches) anim(c, [{ rotate: '0deg' }, { rotate: '-4deg' }, { rotate: '3deg' }, { rotate: '-1.5deg' }, { rotate: '0deg' }], { duration: 420, easing: 'ease-out', fill: 'none', composite: 'add' });
    }, true);
    // banners never auto-advance (canvas principle): members swipe them
  }

  const useVT = !!document.startViewTransition && !reduce.matches;
  const app0 = () => L.scroller.parentElement;
  if (useVT) {
    const st = document.createElement('style');
    st.textContent = [
      '::view-transition-group(*){animation-duration:.42s;animation-timing-function:cubic-bezier(.2,.85,.25,1)}',
      'html[data-vcnav=push]::view-transition-old(root){animation:none}',
      'html[data-vcnav=push]::view-transition-new(root){animation:vcIn .42s cubic-bezier(.2,.85,.25,1) both;box-shadow:-10px 0 30px rgba(0,0,0,.14)}',
      'html[data-vcnav=pop]::view-transition-new(root){animation:none}',
      'html[data-vcnav=pop]::view-transition-old(root){animation:vcOut .36s cubic-bezier(.2,.85,.25,1) both;z-index:2;box-shadow:-10px 0 30px rgba(0,0,0,.14)}',
      'html[data-vcnav=tab]::view-transition-old(root),html[data-vcnav=tab]::view-transition-new(root){animation-duration:.26s}',
      '@keyframes vcIn{from{transform:translateX(100%)}}',
      '@keyframes vcOut{to{transform:translateX(100%)}}',
      // the tab bar is its own layer, so it stays put while pages move under it
      '::view-transition-old(vc-tabs),::view-transition-new(vc-tabs){animation:none}',
      'html[data-vcnav]::view-transition-old(vc-tabs){display:none}'
    ].join('');
    document.head.appendChild(st);
  }

  window.VCFx = {
    install(logic, rootEl) {
      L = logic;
      const orig = L.setState;
      L.setState = function (u, cb) {
        const patch = typeof u === 'function' ? u(this.state, this.props) : u;
        if (!patch) return;
        let plan = null;
        try { plan = before(this.state, patch); } catch (e) { plan = null; }
        // page moves use the browser's own view transitions where available: it animates flat snapshots on the GPU,
        // so nothing is rebuilt, re-decoded or re-laid out mid-animation
        const kind = plan && plan.nav;
        if (useVT && (kind === 'push' || (kind === 'pop' && !pendingPopFrom))) {
          const g = plan.ghost; plan.ghost = null; plan.nav = '';
          if (kind === 'pop') { stack.pop(); if (under) { under.remove(); under = null; } }
          if (kind === 'tab') stack.length = 0;
          const self = this; document.documentElement.dataset.vcnav = kind;
          const vt = document.startViewTransition(() => new Promise((res) => orig.call(self, patch, () => {
            try { after(plan); } catch (e) {}
            try { postRender(); } catch (e) {}
            // settle the header and sheet before the new screen is captured, so nothing moves after the fade
            try { const sh = L.scroller && L.scroller.querySelector('[data-sheet]'); if (sh) sh._vcStart = undefined; if (L.syncBand) L.syncBand(L.scroller); } catch (e) {}
            if (kind === 'push' && g) { try { const b = app0().querySelector('[data-band]'); g.style.background = bandBg(app0(), bgOf(L.scroller)); stash(g); } catch (e) {} }
            if (cb) cb(); res();
          })));
          vt.finished.finally(() => { delete document.documentElement.dataset.vcnav; });
          return;
        }
        orig.call(this, patch, () => {
          if (plan) { try { after(plan); } catch (e) { if (plan.ghost) plan.ghost.remove(); } }
          try { postRender(); } catch (e) {}
          if (cb) cb();
        });
      };
      edgeSwipe(rootEl);
      tabBarGestures(rootEl);
      extras(rootEl);
      addEventListener('resize', () => setTimeout(() => { try { if (L.scroller) syncTabBar(L.scroller.parentElement, true); } catch (e) {} }, 60));
      setTimeout(postRender, 0);
    }
  };
})();
