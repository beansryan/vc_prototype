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

  function bgOf(el) {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const c = getComputedStyle(e).backgroundColor;
      if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) return c;
    }
    return getComputedStyle(document.body).backgroundColor || '#fff';
  }

  function classify(prev, patch) {
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
    app.querySelectorAll('[data-fx]').forEach((el) => plan.layers.push({ el, parent: el.parentElement }));
    if (plan.nav === 'push' || plan.nav === 'pop' || plan.nav === 'down' || plan.nav === 'tab' || plan.nav === 'fade') {
      const page = sc.firstElementChild;
      if (page) {
        const ghost = document.createElement('div');
        ghost.setAttribute('aria-hidden', 'true');
        ghost.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;background:' + bgOf(sc) + ';';
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
    if (kind === 'push') {
      if (g) sc.before(g);
      sc.style.background = bg; sc.style.boxShadow = '-8px 0 24px rgba(0,0,0,.10)';
      const a = anim(sc, [{ translate: '100% 0' }, { translate: '0 0' }], { duration: 420, easing: EASE_PUSH, fill: 'none' });
      if (g) anim(g.firstElementChild, [{ translate: '0 ' + g.firstElementChild.style.translate.split(' ')[1] }, { translate: '-28% ' + g.firstElementChild.style.translate.split(' ')[1] }], { duration: 420, easing: EASE_PUSH });
      if (g) anim(g, [{ filter: 'brightness(1)' }, { filter: 'brightness(.92)' }], { duration: 420, easing: EASE_PUSH });
      done(a, () => { if (g) stash(g); sc.style.background = ''; sc.style.boxShadow = ''; });
    } else if (kind === 'pop') {
      const from = pendingPopFrom; pendingPopFrom = 0;
      stack.pop(); if (under) { under.remove(); under = null; }
      if (g) { sc.after(g); g.style.boxShadow = '-8px 0 24px rgba(0,0,0,.10)'; }
      const a = anim(sc, [{ translate: (-28 + 28 * Math.min(1, from / sc.clientWidth)) + '% 0', filter: 'brightness(.92)' }, { translate: '0 0', filter: 'brightness(1)' }], { duration: 380, easing: EASE_PUSH, fill: 'none' });
      if (g) anim(g, [{ translate: from + 'px 0' }, { translate: '100% 0' }], { duration: 380, easing: EASE_PUSH });
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
      // tab switch or a reset to home: quick cross-fade
      if (g) sc.after(g);
      const a = g ? anim(g, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease' }) : null;
      anim(sc.firstElementChild, [{ opacity: 0.4, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { duration: 240, easing: EASE_PUSH, fill: 'none' });
      done(a, finish);
    }
  }

  function isSheet(box) {
    const cs = getComputedStyle(box);
    return cs.position === 'absolute' && cs.bottom === '0px';
  }

  // ---------- iOS edge swipe back ----------
  function edgeSwipe(rootEl) {
    let sx = 0, sy = 0, on = false, dx = 0;
    rootEl.addEventListener('touchstart', (e) => {
      const t = e.touches[0]; const r = rootEl.getBoundingClientRect();
      const s = L && L.state;
      on = !!(s && (s.history || []).length && !s.modal && !s.iam && !s.bdaySheet && s.tab !== 'scan' && t.clientX - r.left < 24);
      sx = t.clientX; sy = t.clientY; dx = 0;
      if (on && stack.length && L.scroller) {
        under = stack[stack.length - 1];
        under.style.translate = '-28% 0'; under.style.filter = 'brightness(.92)';
        L.scroller.before(under);
        L.scroller.style.background = bgOf(L.scroller);
      }
    }, { passive: true });
    rootEl.addEventListener('touchmove', (e) => {
      if (!on) return;
      const t = e.touches[0]; dx = Math.max(0, t.clientX - sx);
      if (Math.abs(t.clientY - sy) > 40 && dx < 30) { on = false; L.scroller.style.translate = ''; L.scroller.style.background = ''; if (under) { under.remove(); under = null; } return; }
      L.scroller.style.translate = dx + 'px 0';
      if (under) { const k = Math.min(1, dx / L.scroller.clientWidth); under.style.translate = (-28 + 28 * k) + '% 0'; under.style.filter = 'brightness(' + (0.92 + 0.08 * k) + ')'; }
      L.scroller.style.boxShadow = '-8px 0 24px rgba(0,0,0,.10)';
    }, { passive: true });
    rootEl.addEventListener('touchend', () => {
      if (!on) return; on = false;
      const sc = L.scroller;
      if (dx > Math.min(110, sc.clientWidth * 0.3)) {
        sc.style.translate = ''; sc.style.boxShadow = '';
        pendingPopFrom = dx; L.back();
      } else {
        const a = anim(sc, [{ translate: dx + 'px 0' }, { translate: '0 0' }], { duration: 250, easing: EASE_PUSH, fill: 'none' });
        const u = under; under = null;
        if (u) anim(u, [{ translate: u.style.translate }, { translate: '-28% 0' }], { duration: 250, easing: EASE_PUSH, fill: 'none' });
        sc.style.translate = ''; done(a, () => { sc.style.boxShadow = ''; sc.style.background = ''; if (u) u.remove(); });
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
    wrap.setAttribute('data-tbwrap', '1');
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

  window.VCFx = {
    install(logic, rootEl) {
      L = logic;
      const orig = L.setState;
      L.setState = function (u, cb) {
        const patch = typeof u === 'function' ? u(this.state, this.props) : u;
        if (!patch) return;
        let plan = null;
        try { plan = before(this.state, patch); } catch (e) { plan = null; }
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
