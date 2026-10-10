/* ValueClub MVP runtime: renders the design-canvas component templates ({{ }}, sc-if, sc-for, dc-import)
   with Preact, so the same App code from the canvas runs as a real web app. */
(function () {
  const { h, Component, Fragment, render } = window.preact;

  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(u, cb) {
      const patch = typeof u === 'function' ? u(this.state, this.props) : u;
      if (!patch) return;
      this.state = Object.assign({}, this.state, patch);
      if (this._onState) this._onState(this.state, patch);
      if (this._host) this._host.forceUpdate(cb);
    }
  }
  window.DCLogic = DCLogic;

  const BOOL = { disabled: 1, checked: 1, selected: 1, readonly: 1, hidden: 1, autofocus: 1, multiple: 1, required: 1 };
  const ONLY = /^\s*\{\{\s*([^}]*?)\s*\}\}\s*$/;
  const ANY = /\{\{\s*([^}]*?)\s*\}\}/g;

  function lookup(expr, scope) {
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
    if (/^'.*'$|^".*"$/.test(expr)) return expr.slice(1, -1);
    const parts = expr.split('.');
    let v;
    for (let s = scope; s; s = s.parent) {
      if (parts[0] in s.vars) { v = s.vars[parts[0]]; break; }
    }
    for (let i = 1; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function interp(str, scope) {
    const m = ONLY.exec(str);
    if (m) return lookup(m[1], scope);
    if (str.indexOf('{{') < 0) return str;
    return str.replace(ANY, (_, e) => { const v = lookup(e, scope); return v == null ? '' : String(v); });
  }

  // compile a DOM node into a function (scope) => vnode
  function compileNode(node, comps) {
    if (node.nodeType === 3) {
      const txt = node.nodeValue;
      if (/^\s*$/.test(txt) && txt.indexOf('\n') >= 0) return null;
      if (txt.indexOf('{{') < 0) return () => txt;
      return (sc) => { const v = interp(txt, sc); return v == null ? '' : String(v); };
    }
    if (node.nodeType !== 1) return null;
    const tag = node.localName;
    const kids = compileChildren(node, comps);
    const renderKids = (sc) => kids.map((k) => k(sc));

    if (tag === 'sc-if') {
      const cond = node.getAttribute('value') || '';
      return (sc) => (interp(cond, sc) ? h(Fragment, null, renderKids(sc)) : null);
    }
    if (tag === 'sc-for') {
      const list = node.getAttribute('list') || '';
      const as = node.getAttribute('as') || 'item';
      return (sc) => {
        const arr = interp(list, sc) || [];
        return h(Fragment, null, (Array.isArray(arr) ? arr : []).map((item, i) => h(Fragment, { key: i }, renderKids({ vars: { [as]: item, index: i }, parent: sc }))));
      };
    }
    if (tag === 'dc-import') {
      const name = node.getAttribute('name');
      const attrs = [];
      for (const a of node.attributes) if (a.name !== 'name' && a.name.indexOf('hint-') !== 0) attrs.push([a.name, a.value]);
      return (sc) => {
        const p = {};
        attrs.forEach(([k, v]) => { p[k] = interp(v, sc); });
        return h(comps[name], { p });
      };
    }
    const attrs = [];
    for (const a of node.attributes) {
      let n = a.name;
      if (n.indexOf('hint-') === 0) continue;
      if (n === 'onclick') n = 'onClick';
      else if (n === 'onscroll') n = 'onScroll';
      else if (n === 'oninput') n = 'onInput';
      else if (n === 'onchange') n = 'onChange';
      else if (n === 'onkeydown') n = 'onKeyDown';
      attrs.push([n, a.value]);
    }
    return (sc) => {
      const p = {};
      for (let i = 0; i < attrs.length; i++) {
        const [k, v] = attrs[i];
        let val = interp(v, sc);
        if (BOOL[k] && val === '') val = true;
        if (k.slice(0, 2) === 'on' && typeof val !== 'function') continue;
        p[k] = val;
      }
      return h(tag, p, renderKids(sc));
    };
  }
  function compileChildren(node, comps) {
    const src = node.localName === 'template' ? node.content : node;
    const out = [];
    src.childNodes.forEach((c) => { const f = compileNode(c, comps); if (f) out.push(f); });
    return out;
  }

  // a canvas component: template + logic class, wrapped as a Preact component
  function defineDC(name, tplHtml, Logic, comps) {
    const tpl = document.createElement('template');
    tpl.innerHTML = tplHtml;
    const kids = compileChildren(tpl, comps);
    class Host extends Component {
      constructor(props) {
        super(props);
        this.L = new Logic(Object.assign({}, props.p));
        this.L._host = this;
        if (props.onLogic) props.onLogic(this.L);
      }
      componentDidUpdate(prev) {
        if (this.L.componentDidUpdate) {
          const changed = Object.keys(Object.assign({}, prev.p, this.props.p)).some((k) => prev.p[k] !== this.props.p[k]);
          if (changed) this.L.componentDidUpdate(prev.p);
        }
      }
      componentWillUnmount() { if (this.L.componentWillUnmount) this.L.componentWillUnmount(); }
      render() {
        this.L.props = Object.assign({}, this.props.p);
        const vals = this.L.renderVals ? this.L.renderVals() : {};
        const sc = { vars: vals, parent: null };
        return h(Fragment, null, kids.map((k) => k(sc)));
      }
    }
    Host.displayName = name;
    comps[name] = Host;
    return Host;
  }

  window.VCRuntime = { defineDC, h, render, Component };
})();
