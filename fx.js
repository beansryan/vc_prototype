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

  window.VCFx = {
    install(logic, rootEl) {
      L = logic;
      const orig = L.setState;
      L.setState = function (u, cb) {
        const patch = typeof u === 'function' ? u(this.state, this.props) : u;
        if (!patch) return;
        let plan = null;
        try { plan = before(this.state, patch); } catch (e) { plan = null; }
        orig.call(this, patch, plan ? () => { try { after(plan); } catch (e) { if (plan.ghost) plan.ghost.remove(); } if (cb) cb(); } : cb);
      };
      edgeSwipe(rootEl);
    }
  };
})();
