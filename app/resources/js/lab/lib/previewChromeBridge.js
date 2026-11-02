/**
 * Injected into DeepThought preview HTML (setPreviewScript).
 * Chrome navigation bridge, DOM inspect picker, and right-click context menu.
 */
export const PREVIEW_CHROME_SOURCE = 'krikkit-preview-chrome'

export const PREVIEW_CHROME_REV = 47

export const PREVIEW_CHROME_SCRIPT = `(function(){
  if (window.__krikkitPreviewChrome) return;
  window.__krikkitPreviewChrome = true;
  var SRC = ${JSON.stringify(PREVIEW_CHROME_SOURCE)};
  var REV = ${PREVIEW_CHROME_REV};

  function browserPath() {
    return (location.pathname || '/') + (location.search || '') + (location.hash || '');
  }

  /* MemoryRouter never touches window.location — keep a guest path for chrome. */
  var guestPath = browserPath();

  function currentPath() {
    return guestPath || browserPath();
  }

  function setGuestPath(path) {
    if (typeof path === 'string' && path) guestPath = path;
  }

  function report(kind, path) {
    if (path) setGuestPath(path);
    try {
      parent.postMessage({
        source: SRC,
        type: 'location',
        path: currentPath(),
        kind: kind || 'sync'
      }, '*');
    } catch (e) {}
  }

  var push = history.pushState;
  var repl = history.replaceState;
  history.pushState = function() {
    var r = push.apply(this, arguments);
    setGuestPath(browserPath());
    report('push');
    return r;
  };
  history.replaceState = function() {
    var r = repl.apply(this, arguments);
    setGuestPath(browserPath());
    report('replace');
    return r;
  };
  window.addEventListener('popstate', function() {
    setGuestPath(browserPath());
    report('pop');
  });
  window.addEventListener('hashchange', function() {
    setGuestPath(browserPath());
    report('hash');
  });

  function pathFromHref(href) {
    try {
      var url = new URL(href, location.href);
      if (url.origin !== location.origin) return null;
      return (url.pathname || '/') + (url.search || '') + (url.hash || '');
    } catch (e) {
      return null;
    }
  }

  document.addEventListener('click', function(ev) {
    var node = ev.target;
    while (node && node !== document && (!node.nodeName || node.nodeName !== 'A')) {
      node = node.parentNode;
    }
    if (!node || node.nodeName !== 'A') return;
    if (node.hasAttribute('download')) return;
    var tgt = node.getAttribute('target');
    if (tgt && tgt !== '_self') return;
    var raw = node.getAttribute('href');
    if (raw == null || raw === '') return;
    if (/^(mailto:|tel:|javascript:)/i.test(raw)) return;
    var next = pathFromHref(node.href);
    if (!next) return;
    setTimeout(function() {
      var active = document.querySelector('a[aria-current="page"]');
      if (active && active.href) {
        var fromNav = pathFromHref(active.href);
        if (fromNav) next = fromNav;
      }
      report('push', next);
    }, 0);
  }, true);

  /* ── Inspect picker + context menu ── */
  var inspecting = false;
  var contextPinned = false;
  var contextMenuOpen = false;
  var hoverEl = null;
  var selectedEl = null;
  var textEditing = false;
  var textEditEl = null;
  var textEditOriginal = '';
  var textEditRestore = null;
  var textEditLock = false;
  var box = null;
  var label = null;
  var raf = 0;
  var nextId = 1;
  var visible = false;
  var paintMode = 'morph';
  var EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  var MORPH_MS = 200;
  var theme = {
    accent: '#14b8a6',
    surface: '#0a0a0a',
    fg: '#fafafa',
    line: 'rgba(255,255,255,0.12)'
  };

  function applyTheme(next) {
    if (!next || typeof next !== 'object') return;
    if (next.accent) theme.accent = String(next.accent);
    if (next.surface) theme.surface = String(next.surface);
    if (next.fg) theme.fg = String(next.fg);
    if (next.line) theme.line = String(next.line);
    if (box) {
      box.style.borderColor = theme.accent;
      box.style.background = 'color-mix(in oklab, ' + theme.accent + ' 12%, transparent)';
    }
    if (label) {
      label.style.background = theme.surface;
      label.style.color = theme.fg;
      label.style.borderColor = theme.line;
    }
  }

  function ensureOverlay() {
    if (box && label) return;
    var root = document.documentElement || document.body;
    box = document.createElement('div');
    box.setAttribute('data-krikkit-inspect', 'box');
    box.style.cssText = [
      'position:fixed',
      'inset:auto',
      'pointer-events:none',
      'z-index:2147483646',
      'box-sizing:border-box',
      'border:2px solid ' + theme.accent,
      'background:color-mix(in oklab, ' + theme.accent + ' 12%, transparent)',
      'border-radius:2px',
      'opacity:0',
      'transition:opacity 140ms ease'
    ].join(';');
    label = document.createElement('div');
    label.setAttribute('data-krikkit-inspect', 'label');
    label.style.cssText = [
      'position:fixed',
      'inset:auto',
      'pointer-events:none',
      'z-index:2147483647',
      'box-sizing:border-box',
      'max-width:min(70vw,28rem)',
      'padding:2px 6px',
      'border:1px solid ' + theme.line,
      'border-radius:2px',
      'background:' + theme.surface,
      'color:' + theme.fg,
      'font:11px/1.25 ui-sans-serif,system-ui,sans-serif',
      'white-space:nowrap',
      'overflow:hidden',
      'text-overflow:ellipsis',
      'opacity:0',
      'transition:opacity 140ms ease'
    ].join(';');
    root.appendChild(box);
    root.appendChild(label);
  }

  function isInspectChrome(el) {
    return !!(el && el.getAttribute && el.getAttribute('data-krikkit-inspect'));
  }

  function tagName(el) {
    return (el && el.tagName) ? el.tagName.toLowerCase() : '';
  }

  function hasOwnText(el) {
    if (!el) return false;
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && String(n.textContent).replace(/\\s+/g, ' ').trim()) return true;
    }
    return false;
  }

  function ownText(el) {
    if (!el) return '';
    var parts = [];
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) {
        var t = String(n.textContent).replace(/\\s+/g, ' ').trim();
        if (t) parts.push(t);
      }
    }
    return parts.join(' ').trim();
  }

  function isWidget(el) {
    var t = tagName(el);
    if (t === 'img' || t === 'picture' || t === 'svg' || t === 'video' || t === 'audio' || t === 'canvas') return true;
    if (t === 'input' || t === 'textarea' || t === 'select' || t === 'button') return true;
    if (t === 'a') return true;
    var role = (el.getAttribute && el.getAttribute('role')) || '';
    return role === 'button' || role === 'link';
  }

  function isTextish(el) {
    return /^(h[1-6]|p|span|em|strong|small|label|li|figcaption|blockquote|td|th|a|button|legend)$/.test(tagName(el));
  }

  function isField(el) {
    var t = tagName(el);
    if (t === 'input' || t === 'textarea' || t === 'select') return true;
    return !!(el && el.isContentEditable);
  }

  function liftToWidget(el) {
    if (!el || isWidget(el)) return el;
    var p = el.parentElement;
    if (p && isWidget(p) && p !== document.body) {
      var t = tagName(el);
      if (t === 'span' || t === 'svg' || t === 'i' || t === 'path' || t === 'strong' || t === 'em') return p;
    }
    return el;
  }

  function hit(x, y) {
    var stack = [];
    try { stack = document.elementsFromPoint(x, y) || []; } catch (e) {
      var one = document.elementFromPoint(x, y);
      if (one) stack = [one];
    }
    var fallback = null;
    var textHit = null;
    for (var i = 0; i < stack.length; i++) {
      var el = stack[i];
      if (!el || el === document.documentElement || el === document.body) continue;
      if (isInspectChrome(el)) continue;
      if (el.nodeType !== 1) continue;
      if (!fallback) fallback = el;
      if (isWidget(el) || isField(el)) return liftToWidget(el);
      if (isTextish(el) && hasOwnText(el)) return liftToWidget(el);
      if (!textHit && hasOwnText(el)) textHit = el;
    }
    return liftToWidget(textHit || fallback);
  }

  function uidOf(el) {
    if (!el) return 0;
    if (!el.__krikkitInspectId) el.__krikkitInspectId = nextId++;
    return el.__krikkitInspectId;
  }

  function cssPath(el) {
    if (!el || el.nodeType !== 1) return '';
    var parts = [el.tagName.toLowerCase()];
    if (el.id) parts.push('#' + el.id);
    var cls = typeof el.className === 'string' ? el.className.trim() : '';
    if (cls) {
      var bits = cls.split(/\\s+/).filter(Boolean).slice(0, 3);
      if (bits.length) parts.push('.' + bits.join('.'));
    }
    return parts.join('');
  }

  function setMotion(morph) {
    if (!box || !label) return;
    if (morph) {
      var geo = 'left ' + MORPH_MS + 'ms ' + EASE +
        ', top ' + MORPH_MS + 'ms ' + EASE +
        ', width ' + MORPH_MS + 'ms ' + EASE +
        ', height ' + MORPH_MS + 'ms ' + EASE;
      box.style.transition = geo + ', opacity 140ms ease, background 140ms ease, border-color 140ms ease';
      label.style.transition = 'left ' + MORPH_MS + 'ms ' + EASE +
        ', top ' + MORPH_MS + 'ms ' + EASE +
        ', opacity 140ms ease';
    } else {
      box.style.transition = 'opacity 140ms ease, background 140ms ease, border-color 140ms ease';
      label.style.transition = 'opacity 140ms ease';
    }
  }

  function hideOverlay() {
    setMotion(false);
    if (box) box.style.opacity = '0';
    if (label) label.style.opacity = '0';
    visible = false;
  }

  function paintNow() {
    raf = 0;
    if (textEditing) {
      hideOverlay();
      return;
    }
    var mode = paintMode;
    paintMode = 'morph';
    var el = hoverEl || selectedEl;
    if (!el || !el.isConnected || el === document.documentElement || el === document.body) {
      hideOverlay();
      return;
    }
    ensureOverlay();
    var r = el.getBoundingClientRect();
    if (r.width <= 0 && r.height <= 0) {
      hideOverlay();
      return;
    }
    var morph = mode === 'morph' && visible;
    setMotion(morph);
    if (morph) void box.offsetWidth;

    var selected = el === selectedEl;
    box.style.left = r.left + 'px';
    box.style.top = r.top + 'px';
    box.style.width = r.width + 'px';
    box.style.height = r.height + 'px';
    box.style.borderColor = theme.accent;
    box.style.background = selected
      ? 'color-mix(in oklab, ' + theme.accent + ' 18%, transparent)'
      : 'color-mix(in oklab, ' + theme.accent + ' 10%, transparent)';
    box.style.opacity = '1';

    var text = cssPath(el) + '  ' + Math.round(r.width) + '\u00d7' + Math.round(r.height);
    var ly = r.top > 22 ? r.top - 20 : r.top + r.height + 4;
    var lx = Math.min(Math.max(4, r.left), Math.max(4, window.innerWidth - 168));
    label.textContent = text;
    label.style.left = lx + 'px';
    label.style.top = Math.max(4, ly) + 'px';
    label.style.opacity = '1';
    visible = true;
  }

  function schedulePaint(mode) {
    if (mode === 'instant') paintMode = 'instant';
    else if (!raf) paintMode = mode || 'morph';
    if (raf) return;
    raf = window.requestAnimationFrame(paintNow);
  }

  function numPx(v) {
    if (v == null || v === '' || v === 'auto') return '';
    var n = parseFloat(v);
    return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : String(v);
  }

  function visualRadius(cs, rect) {
    var raw = String((cs && cs.borderTopLeftRadius) || '0').trim().split(/\\s+/)[0] || '0';
    var n = parseFloat(raw);
    if (!Number.isFinite(n) || n < 0) n = 0;
    var w = Math.max(0, rect && rect.width || 0);
    var h = Math.max(0, rect && rect.height || 0);
    var cap = Math.min(w, h) / 2;
    if (raw.indexOf('%') !== -1) n = (n / 100) * (w || h);
    if (!Number.isFinite(cap)) cap = 0;
    if (n > cap) n = cap;
    return String(Math.round(n * 100) / 100);
  }

  function cssToHex(input) {
    var s = String(input || '').trim();
    if (!s || s === 'transparent' || s === 'none') return 'transparent';
    if (/^rgba?\\(\\s*0\\s*[,\\s]\\s*0\\s*[,\\s]\\s*0(?:\\s*[,/]\\s*0(?:\\.0+)?)?\\s*\\)$/i.test(s)) return 'transparent';
    if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase();
    if (/^#[0-9a-f]{8}$/i.test(s)) {
      return s.slice(7).toLowerCase() === '00' ? 'transparent' : s.slice(0, 7).toLowerCase();
    }
    if (/^#[0-9a-f]{3}$/i.test(s)) {
      var t = s.slice(1);
      return ('#' + t[0] + t[0] + t[1] + t[1] + t[2] + t[2]).toLowerCase();
    }
    try {
      var canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return s;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = s;
      ctx.fillRect(0, 0, 1, 1);
      var d = ctx.getImageData(0, 0, 1, 1).data;
      if (!d[3]) return 'transparent';
      var hex = function(n) { return n.toString(16).padStart(2, '0'); };
      var out = '#' + hex(d[0]) + hex(d[1]) + hex(d[2]);
      if (d[3] < 255) {
        return 'rgba(' + d[0] + ', ' + d[1] + ', ' + d[2] + ', ' + (Math.round((d[3] / 255) * 100) / 100) + ')';
      }
      return out;
    } catch (e) {
      return s;
    }
  }

  function describe(el) {
    if (!el || el.nodeType !== 1) return null;
    var attrs = {};
    try {
      Array.prototype.forEach.call(el.attributes || [], function(a) {
        if (a && a.name) attrs[a.name] = String(a.value || '').slice(0, 200);
      });
    } catch (e) {}
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    var text = ownText(el);
    if (!text && isWidget(el)) {
      try {
        var inner = String(el.innerText || '').replace(/\\s+/g, ' ').trim();
        if (inner && inner.length <= 80 && el.children.length <= 3) text = inner.slice(0, 120);
      } catch (e2) {}
    }
    var opacityPct = Math.round((parseFloat(cs.opacity) || 1) * 100);
    return {
      uid: uidOf(el),
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      className: typeof el.className === 'string' ? el.className : '',
      path: cssPath(el),
      text: text,
      attributes: attrs,
      rect: {
        x: r.x, y: r.y, width: r.width, height: r.height,
        top: r.top, left: r.left, right: r.right, bottom: r.bottom
      },
      styles: {
        display: cs.display,
        position: cs.position,
        x: String(Math.round(el.offsetLeft || 0)),
        y: String(Math.round(el.offsetTop || 0)),
        w: String(Math.round(r.width)),
        h: String(Math.round(r.height)),
        opacity: String(opacityPct),
        borderRadius: visualRadius(cs, r),
        backgroundColor: cssToHex(cs.backgroundColor),
        color: cssToHex(cs.color),
        borderWidth: numPx(cs.borderTopWidth) || '0',
        borderColor: cssToHex(cs.borderTopColor),
        borderStyle: cs.borderTopStyle || 'none',
        fontSize: numPx(cs.fontSize),
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight === 'normal' ? 'normal' : numPx(cs.lineHeight),
        letterSpacing: cs.letterSpacing === 'normal' ? '0' : numPx(cs.letterSpacing),
        textAlign: cs.textAlign,
        paddingT: numPx(cs.paddingTop) || '0',
        paddingR: numPx(cs.paddingRight) || '0',
        paddingB: numPx(cs.paddingBottom) || '0',
        paddingL: numPx(cs.paddingLeft) || '0',
        marginT: numPx(cs.marginTop) || '0',
        marginR: numPx(cs.marginRight) || '0',
        marginB: numPx(cs.marginBottom) || '0',
        marginL: numPx(cs.marginLeft) || '0',
        flexDirection: cs.flexDirection,
        justifyContent: cs.justifyContent,
        alignItems: cs.alignItems,
        gap: numPx(cs.gap) || '0',
        overflow: cs.overflow
      }
    };
  }

  function emitSelect(el) {
    var data = describe(el);
    if (!data) return;
    try {
      parent.postMessage({ source: SRC, type: 'inspect-select', element: data }, '*');
    } catch (e) {}
  }

  function asPx(v) {
    if (v == null || v === '') return '';
    var s = String(v).trim();
    if (!s) return '';
    if (/[a-z%]/i.test(s)) return s;
    return s + 'px';
  }

  function applyText(el, text) {
    if (!el) return;
    var next = String(text == null ? '' : text);
    if (el.childElementCount === 0) {
      el.textContent = next;
      return;
    }
    var texts = [];
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && String(n.textContent).trim()) texts.push(n);
    }
    if (texts.length === 1) {
      texts[0].textContent = next;
      return;
    }
    el.textContent = next;
  }

  function textEditTarget(el) {
    if (!el) return null;
    if (el.childElementCount === 0) return el;
    if (hasOwnText(el)) return el;
    var nodes = el.querySelectorAll('*');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (hasOwnText(n) && n.childElementCount === 0) return n;
    }
    return el;
  }

  function readEditText(el) {
    if (!el) return '';
    var own = ownText(el);
    if (own) return own;
    try {
      return String(el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim();
    } catch (e) {
      return '';
    }
  }

  function restoreTextEditEl() {
    var el = textEditEl;
    var prev = textEditRestore;
    if (!el || !prev) return;
    try {
      el.removeEventListener('keydown', onTextEditKey, true);
      el.removeEventListener('blur', onTextEditBlur, true);
    } catch (e) {}
    try {
      if (prev.editable == null) el.removeAttribute('contenteditable');
      else el.setAttribute('contenteditable', prev.editable);
      el.style.outline = prev.outline;
      el.style.outlineOffset = prev.outlineOffset;
      el.style.cursor = prev.cursor;
      el.style.userSelect = prev.userSelect;
      el.style.minWidth = prev.minWidth;
      el.style.caretColor = prev.caretColor;
      el.style.padding = prev.padding;
      el.style.borderRadius = prev.borderRadius;
      el.style.boxShadow = prev.boxShadow;
      el.style.boxSizing = prev.boxSizing;
    } catch (e2) {}
  }

  function stopTextEditListeners() {
    document.removeEventListener('mousedown', onTextEditOutside, true);
    document.removeEventListener('click', onTextEditClick, true);
  }

  function onTextEditKey(ev) {
    if (!textEditing) return;
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      commitTextEdit();
      return;
    }
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      ev.stopPropagation();
      commitTextEdit();
    }
  }

  function onTextEditBlur() {
    if (!textEditing) return;
    window.setTimeout(function() {
      if (textEditing) commitTextEdit();
    }, 0);
  }

  function onTextEditOutside(ev) {
    if (!textEditing || !textEditEl) return;
    if (textEditEl.contains(ev.target)) return;
    commitTextEdit();
  }

  function onTextEditClick(ev) {
    if (!textEditing || !textEditEl) return;
    if (!textEditEl.contains(ev.target)) return;
    var t = tagName(textEditEl);
    if (t === 'a' || t === 'button') {
      ev.preventDefault();
      ev.stopPropagation();
    }
  }

  function startTextEdit() {
    var host = selectedEl;
    if (!host || !host.isConnected) return;
    if (textEditing) commitTextEdit();
    var el = textEditTarget(host);
    if (!el || !el.isConnected) return;
    textEditing = true;
    textEditLock = false;
    textEditEl = el;
    selectedEl = host;
    textEditOriginal = readEditText(el);
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    var padT = (parseFloat(cs.paddingTop) || 0) + 3;
    var padR = (parseFloat(cs.paddingRight) || 0) + 6;
    var padB = (parseFloat(cs.paddingBottom) || 0) + 3;
    var padL = (parseFloat(cs.paddingLeft) || 0) + 6;
    textEditRestore = {
      editable: el.getAttribute('contenteditable'),
      outline: el.style.outline,
      outlineOffset: el.style.outlineOffset,
      cursor: el.style.cursor,
      userSelect: el.style.userSelect,
      minWidth: el.style.minWidth,
      caretColor: el.style.caretColor,
      padding: el.style.padding,
      borderRadius: el.style.borderRadius,
      boxShadow: el.style.boxShadow,
      boxSizing: el.style.boxSizing
    };
    hideOverlay();
    try {
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');
      el.style.outline = 'none';
      el.style.outlineOffset = '0';
      el.style.cursor = 'text';
      el.style.userSelect = 'text';
      el.style.caretColor = theme.accent;
      el.style.boxSizing = 'content-box';
      el.style.padding = padT + 'px ' + padR + 'px ' + padB + 'px ' + padL + 'px';
      el.style.borderRadius = '8px';
      el.style.boxShadow = '0 0 0 1px ' + theme.accent;
      if (r.width > 0) el.style.minWidth = Math.ceil(r.width) + 'px';
      el.focus();
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) {}
    el.addEventListener('keydown', onTextEditKey, true);
    el.addEventListener('blur', onTextEditBlur, true);
    document.addEventListener('mousedown', onTextEditOutside, true);
    document.addEventListener('click', onTextEditClick, true);
  }

  function commitTextEdit() {
    if (!textEditing || textEditLock) return;
    textEditLock = true;
    var el = textEditEl;
    var host = selectedEl || el;
    var next = readEditText(el);
    var original = textEditOriginal;
    restoreTextEditEl();
    stopTextEditListeners();
    textEditing = false;
    textEditEl = null;
    textEditRestore = null;
    textEditOriginal = '';
    var data = describe(host);
    try {
      parent.postMessage({
        source: SRC,
        type: 'text-edit-commit',
        element: data,
        text: next,
        original: original
      }, '*');
    } catch (e) {}
    textEditLock = false;
  }

  function applyInspect(payload) {
    if (!selectedEl || !selectedEl.isConnected) return;
    var el = selectedEl;
    var st = payload && payload.styles ? payload.styles : {};
    try {
      if (st.w != null) el.style.width = asPx(st.w);
      if (st.h != null) el.style.height = asPx(st.h);
      if (st.x != null || st.y != null) {
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        if (st.x != null) el.style.left = asPx(st.x);
        if (st.y != null) el.style.top = asPx(st.y);
      }
      if (st.opacity != null) {
        var op = parseFloat(st.opacity);
        el.style.opacity = Number.isFinite(op)
          ? String(Math.max(0, Math.min(100, op)) / 100)
          : String(st.opacity);
      }
      if (st.borderRadius != null) el.style.borderRadius = asPx(st.borderRadius);
      if (st.backgroundColor != null) el.style.backgroundColor = String(st.backgroundColor);
      if (st.color != null) el.style.color = String(st.color);
      if (st.borderWidth != null) el.style.borderWidth = asPx(st.borderWidth);
      if (st.borderColor != null) el.style.borderColor = String(st.borderColor);
      if (st.borderStyle != null) el.style.borderStyle = String(st.borderStyle);
      if (st.fontSize != null) el.style.fontSize = asPx(st.fontSize);
      if (st.fontWeight != null) el.style.fontWeight = String(st.fontWeight);
      if (st.lineHeight != null) {
        el.style.lineHeight = String(st.lineHeight) === 'normal' ? 'normal' : asPx(st.lineHeight);
      }
      if (st.letterSpacing != null) el.style.letterSpacing = asPx(st.letterSpacing);
      if (st.textAlign != null) el.style.textAlign = String(st.textAlign);
      if (st.display != null) el.style.display = String(st.display);
      if (st.position != null) el.style.position = String(st.position);
      if (st.flexDirection != null) el.style.flexDirection = String(st.flexDirection);
      if (st.justifyContent != null) el.style.justifyContent = String(st.justifyContent);
      if (st.alignItems != null) el.style.alignItems = String(st.alignItems);
      if (st.gap != null) el.style.gap = asPx(st.gap);
      if (st.overflow != null) el.style.overflow = String(st.overflow);
      if (st.paddingT != null) el.style.paddingTop = asPx(st.paddingT);
      if (st.paddingR != null) el.style.paddingRight = asPx(st.paddingR);
      if (st.paddingB != null) el.style.paddingBottom = asPx(st.paddingB);
      if (st.paddingL != null) el.style.paddingLeft = asPx(st.paddingL);
      if (st.marginT != null) el.style.marginTop = asPx(st.marginT);
      if (st.marginR != null) el.style.marginRight = asPx(st.marginR);
      if (st.marginB != null) el.style.marginBottom = asPx(st.marginB);
      if (st.marginL != null) el.style.marginLeft = asPx(st.marginL);
      if (payload && payload.attrs && typeof payload.attrs === 'object') {
        Object.keys(payload.attrs).forEach(function(key) {
          var val = payload.attrs[key];
          if (val == null || val === false) el.removeAttribute(key);
          else el.setAttribute(key, String(val));
          if (key === 'value' && 'value' in el) el.value = String(val == null ? '' : val);
        });
      }
      if (payload && typeof payload.text === 'string') {
        applyText(el, payload.text);
      }
    } catch (e) {}
    schedulePaint('morph');
  }

  function onContext(ev) {
    if (ev.shiftKey) return;
    if (textEditing) {
      ev.preventDefault();
      commitTextEdit();
      return;
    }
    var raw = ev.target;
    var el = hit(ev.clientX, ev.clientY);
    if (isField(el) || isField(raw)) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
    if (!el) return;
    selectedEl = el;
    var data = describe(el);
    if (!data) return;
    try {
      parent.postMessage({
        source: SRC,
        type: 'contextmenu',
        element: data,
        x: ev.clientX,
        y: ev.clientY
      }, '*');
    } catch (e) {}
    armContextDismiss();
  }

  function requestContextClose() {
    if (!contextMenuOpen) return;
    disarmContextDismiss();
    try {
      parent.postMessage({ source: SRC, type: 'context-close' }, '*');
    } catch (e) {}
  }

  function onContextOutside(ev) {
    if (!contextMenuOpen) return;
    if (ev.type === 'mousedown' && ev.button === 2) return;
    requestContextClose();
  }

  function onContextEscape(ev) {
    if (!contextMenuOpen || ev.key !== 'Escape') return;
    ev.preventDefault();
    requestContextClose();
  }

  function armContextDismiss() {
    if (contextMenuOpen) return;
    contextMenuOpen = true;
    document.addEventListener('mousedown', onContextOutside, true);
    document.addEventListener('click', onContextOutside, true);
    window.addEventListener('scroll', onContextOutside, true);
    window.addEventListener('keydown', onContextEscape, true);
  }

  function disarmContextDismiss() {
    if (!contextMenuOpen) return;
    contextMenuOpen = false;
    document.removeEventListener('mousedown', onContextOutside, true);
    document.removeEventListener('click', onContextOutside, true);
    window.removeEventListener('scroll', onContextOutside, true);
    window.removeEventListener('keydown', onContextEscape, true);
  }

  function onMove(ev) {
    if (textEditing || !inspecting) return;
    var el = hit(ev.clientX, ev.clientY);
    if (el === hoverEl) return;
    hoverEl = el;
    schedulePaint('morph');
  }

  function onClick(ev) {
    if (textEditing) return;
    if (!inspecting) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
    var el = hit(ev.clientX, ev.clientY);
    if (!el) return;
    selectedEl = el;
    hoverEl = el;
    schedulePaint('morph');
    emitSelect(el);
  }

  function onScroll() {
    if (!inspecting) return;
    schedulePaint('instant');
  }

  function onKey(ev) {
    if (textEditing || !inspecting || ev.key !== 'Escape') return;
    ev.preventDefault();
    stopInspect();
    try {
      parent.postMessage({ source: SRC, type: 'inspect-cancel' }, '*');
    } catch (e) {}
  }

  function onLeave() {
    if (!inspecting || contextPinned) return;
    hoverEl = null;
    schedulePaint('morph');
  }

  function startInspect(nextTheme) {
    applyTheme(nextTheme);
    ensureOverlay();
    applyTheme(nextTheme);
    if (inspecting) {
      hoverEl = hoverEl || selectedEl;
      schedulePaint('instant');
      try { parent.postMessage({ source: SRC, type: 'inspect-state', active: true }, '*'); } catch (e) {}
      return;
    }
    inspecting = true;
    hoverEl = hoverEl || selectedEl;
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    document.documentElement.addEventListener('mouseleave', onLeave);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    try {
      document.documentElement.style.cursor = 'crosshair';
    } catch (e) {}
    try { parent.postMessage({ source: SRC, type: 'inspect-state', active: true }, '*'); } catch (e) {}
    schedulePaint('instant');
  }

  function dismissContext() {
    contextPinned = false;
    disarmContextDismiss();
    if (!inspecting) {
      hoverEl = null;
      hideOverlay();
    }
  }

  function stopInspect() {
    if (!inspecting && !box) return;
    inspecting = false;
    hoverEl = null;
    selectedEl = null;
    if (raf) {
      window.cancelAnimationFrame(raf);
      raf = 0;
    }
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
    document.documentElement.removeEventListener('mouseleave', onLeave);
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', onScroll);
    try {
      document.documentElement.style.cursor = '';
    } catch (e) {}
    hideOverlay();
    try { parent.postMessage({ source: SRC, type: 'inspect-state', active: false }, '*'); } catch (e) {}
  }

  var COVER_SKIP = { SCRIPT:1, NOSCRIPT:1, IFRAME:1, LINK:1, STYLE:1, META:1, TITLE:1, HEAD:1 };

  function coverAppRoot() {
    return document.getElementById('root') || document.getElementById('app') || document.body;
  }

  function coverPainted() {
    if (document.documentElement.getAttribute('data-krikkit-preview-boot') === '1') return false;
    if (document.body && document.body.getAttribute('data-krikkit-preview-boot') === '1') return false;
    if (document.querySelector('vite-error-overlay')) return true;
    var scripts = document.querySelectorAll('script[src]');
    var i;
    for (i = 0; i < scripts.length; i++) {
      var src = String(scripts[i].getAttribute('src') || scripts[i].src || '');
      if (src.indexOf('@vite/client') !== -1) return true;
    }
    var root = coverAppRoot();
    if (!root) return false;
    var text = String(root.innerText || '').replace(/\\s+/g, ' ').trim();
    var els = root.querySelectorAll ? root.querySelectorAll('*').length : 0;
    if ((root.id === 'root' || root.id === 'app') && root.childElementCount === 0) return false;
    if (text.length < 24 && els < 8) return false;
    return true;
  }

  function coverClassName(el) {
    var cls = el && el.className;
    if (!cls) return String((el && el.getAttribute && el.getAttribute('class')) || '');
    if (typeof cls === 'string') return cls;
    return String(cls.baseVal || el.getAttribute('class') || '');
  }

  function coverBoxVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var st;
    try { st = getComputedStyle(el); } catch (e) { return false; }
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
    var r = el.getBoundingClientRect();
    var vw = innerWidth || 0;
    var vh = innerHeight || 0;
    if (r.width < 6 || r.height < 6) return false;
    if (r.bottom < 0 || r.right < 0 || r.top > vh || r.left > vw) return false;
    return true;
  }

  function coverIsLoader(el) {
    if (!el || el.nodeType !== 1) return false;
    try {
      if (el.getAttribute('aria-busy') === 'true') return true;
      var role = String(el.getAttribute('role') || '').toLowerCase();
      if (role === 'progressbar') return true;
      var cls = coverClassName(el).toLowerCase();
      var id = String(el.id || '').toLowerCase();
      var label = String(el.getAttribute('aria-label') || '').toLowerCase();
      var hay = cls + ' ' + id + ' ' + label + ' ' + String(el.getAttribute('data-state') || '');
      if (/\\b(spinner|loader|loading|splash|skeleton|shimmer|preload|preloader)\\b/.test(hay)) return true;
      if (/\\banimate-spin\\b|\\banimate-pulse\\b/.test(cls)) return true;
      if (el.getAttribute('data-loading') != null || el.getAttribute('data-pending') != null) return true;
      var anim = '';
      try {
        var st = getComputedStyle(el);
        anim = String(st.animationName || '') + ' ' + String(st.webkitAnimationName || '');
      } catch (e2) {}
      if (/spin|loader|dash|skeleton|shimmer/i.test(anim) && anim.indexOf('none') === -1) return true;
    } catch (e) {}
    return false;
  }

  function coverIsCentered(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    var vw = innerWidth || 1;
    var vh = innerHeight || 1;
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    return Math.abs(cx - vw / 2) < vw * 0.28 && Math.abs(cy - vh / 2) < vh * 0.34;
  }

  function coverEachAnim(fn) {
    if (typeof document.getAnimations !== 'function') return;
    var list = document.getAnimations();
    var i;
    for (i = 0; i < list.length; i++) fn(list[i]);
  }

  function coverAnimTarget(a) {
    try { return a.effect && a.effect.target; } catch (e) { return null; }
  }

  function coverAnimInfinite(a) {
    try {
      var t = a.effect.getComputedTiming();
      return t.iterations === Infinity;
    } catch (e) { return false; }
  }

  function coverMotionPending() {
    var pending = false;
    coverEachAnim(function(a) {
      if (pending) return;
      if (a.playState !== 'running' && a.playState !== 'pending') return;
      var el = coverAnimTarget(a);
      if (el && !coverBoxVisible(el)) return;
      if (coverAnimInfinite(a)) {
        if (el && (coverIsLoader(el) || coverIsCentered(el))) pending = true;
        return;
      }
      if (!el) { pending = true; return; }
      var r = el.getBoundingClientRect();
      if (r.width * r.height > 6400 || coverIsCentered(el)) pending = true;
    });
    return pending;
  }

  function coverFreezeMotion() {
    var frozen = [];
    coverEachAnim(function(a) {
      try {
        if (!coverAnimInfinite(a)) {
          var t = a.effect.getComputedTiming();
          if (t && typeof t.endTime === 'number' && isFinite(t.endTime)) a.currentTime = t.endTime;
          else if (t && typeof t.duration === 'number' && isFinite(t.duration)) {
            a.currentTime = (t.delay || 0) + t.duration * (t.iterations || 1);
          }
        }
        a.pause();
        frozen.push(a);
      } catch (e) {}
    });
    return frozen;
  }

  function coverThawMotion(frozen) {
    var i;
    for (i = 0; i < frozen.length; i++) {
      try { frozen[i].play(); } catch (e) {}
    }
  }

  function coverStampForCapture() {
    var stamps = [];
    var root = coverAppRoot() || document.body;
    if (!root || !root.querySelectorAll) return stamps;
    var nodes = root.querySelectorAll('*');
    var limit = Math.min(nodes.length, 900);
    var i;
    for (i = 0; i < limit; i++) {
      var el = nodes[i];
      if (el.nodeType !== 1 || !coverBoxVisible(el)) continue;
      var st;
      try { st = getComputedStyle(el); } catch (e) { continue; }
      var anim = String(st.animationName || '');
      var trans = String(st.transitionDuration || '');
      var moving = (anim && anim !== 'none') || (trans && trans !== '0s' && trans.indexOf('0s') !== 0 && trans !== '0s, 0s');
      if (!moving && st.transform === 'none' && Number(st.opacity) === 1) continue;
      stamps.push({ el: el, css: el.getAttribute('style') });
      try {
        el.style.setProperty('animation', 'none', 'important');
        el.style.setProperty('transition', 'none', 'important');
        el.style.setProperty('opacity', st.opacity, 'important');
        el.style.setProperty('transform', st.transform, 'important');
        el.style.setProperty('filter', st.filter, 'important');
      } catch (e2) {}
    }
    return stamps;
  }

  function coverRestoreStamps(stamps) {
    var i;
    for (i = 0; i < stamps.length; i++) {
      try {
        if (stamps[i].css == null) stamps[i].el.removeAttribute('style');
        else stamps[i].el.setAttribute('style', stamps[i].css);
      } catch (e) {}
    }
  }

  function coverBusy() {
    if (document.readyState === 'loading') return true;
    try {
      if (document.fonts && document.fonts.status === 'loading') return true;
    } catch (e) {}
    var root = coverAppRoot() || document.body;
    if (!root) return true;
    try {
      if (document.documentElement.getAttribute('aria-busy') === 'true') return true;
      if (document.body && document.body.getAttribute('aria-busy') === 'true') return true;
    } catch (e2) {}
    var text = String(root.innerText || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    if (text && text.length < 96 && /^(loading|please wait|starting)/.test(text)) return true;
    if (text && text.length < 56 && /(^|\\b)(loading|please wait)(\\b|$)/.test(text)) return true;
    var vw = innerWidth || 1;
    var vh = innerHeight || 1;
    var nodes = root.querySelectorAll('*');
    var limit = Math.min(nodes.length, 500);
    var i;
    for (i = 0; i < limit; i++) {
      var el = nodes[i];
      if (!coverIsLoader(el) || !coverBoxVisible(el)) continue;
      if (coverIsCentered(el)) return true;
      var r = el.getBoundingClientRect();
      if ((r.width * r.height) / (vw * vh) > 0.1) return true;
    }
    try {
      var imgs = document.images;
      for (i = 0; i < Math.min(imgs.length, 24); i++) {
        if (!imgs[i].complete && coverBoxVisible(imgs[i])) return true;
      }
    } catch (e3) {}
    return false;
  }

  function coverWaitReady(done) {
    done(coverPainted());
  }

  var coverPaintedSent = false;
  function coverNotifyPainted() {
    if (coverPaintedSent || !coverPainted()) return;
    coverPaintedSent = true;
    try { parent.postMessage({ source: SRC, type: 'cover-painted' }, '*'); } catch (e) {}
  }

  function coverColor(ctx, value, fallback) {
    var raw = String(value || '').trim();
    if (!raw || raw === 'transparent' || raw === 'none') return fallback;
    try {
      ctx.fillStyle = fallback || '#000';
      ctx.fillStyle = raw;
      return ctx.fillStyle || fallback;
    } catch (e) {
      return fallback;
    }
  }

  function coverTransparent(value) {
    var raw = String(value || '').trim().toLowerCase();
    if (!raw || raw === 'transparent' || raw === 'none') return true;
    return /rgba?\\(\\s*0\\s*,\\s*0\\s*,\\s*0\\s*,\\s*0/.test(raw) || raw.slice(-3) === ', 0)' || raw.slice(-2) === ',0)';
  }

  function coverSkipEl(el) {
    if (!el || !el.tagName) return true;
    if (COVER_SKIP[el.tagName]) return true;
    try {
      if (el.getAttribute && el.getAttribute('data-krikkit-inspect')) return true;
    } catch (e) {}
    return false;
  }

  function coverRadii(st, w, h, scale) {
    function px(raw) {
      var token = String(raw || '0').trim().split(' ')[0] || '0';
      var n = parseFloat(token) || 0;
      if (token.indexOf('%') !== -1) n = (n / 100) * Math.min(w / scale, h / scale);
      n = Math.max(0, n * scale);
      var cap = Math.min(w, h) / 2;
      return n > cap ? cap : n;
    }
    return [
      px(st.borderTopLeftRadius),
      px(st.borderTopRightRadius),
      px(st.borderBottomRightRadius),
      px(st.borderBottomLeftRadius)
    ];
  }

  function coverFillRound(ctx, x, y, w, h, radii) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, radii);
    else ctx.rect(x, y, w, h);
    ctx.fill();
  }

  function coverStrokeRound(ctx, x, y, w, h, radii) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, radii);
    else ctx.rect(x, y, w, h);
    ctx.stroke();
  }

  function coverIsSvgRoot(el) {
    if (!el || !el.tagName) return false;
    return String(el.tagName).toLowerCase() === 'svg';
  }

  function coverInSvg(el) {
    var node = el;
    while (node) {
      if (coverIsSvgRoot(node) && node !== el) return true;
      node = node.parentElement;
    }
    return false;
  }

  function coverCssFilter(st) {
    var f = String(st.filter || '');
    if (!f || f === 'none') f = String(st.webkitFilter || '');
    if (!f || f === 'none') return '';
    if (!/blur\\s*\\(\\s*(?:[1-9]\\d*(?:\\.\\d+)?|\\d*\\.[1-9]\\d*)px/i.test(f)) return '';
    return f;
  }

  function coverClipOverflow(ctx, el, scale) {
    var clips = [];
    var node = el && el.parentElement;
    while (node && node !== document.documentElement) {
      var st;
      try { st = getComputedStyle(node); } catch (e) { break; }
      var ox = String(st.overflowX || st.overflow || '');
      var oy = String(st.overflowY || st.overflow || '');
      if (ox === 'hidden' || oy === 'hidden' || ox === 'clip' || oy === 'clip') {
        clips.push({ node: node, st: st });
      }
      node = node.parentElement;
    }
    var i, r, x, y, w, h;
    for (i = clips.length - 1; i >= 0; i--) {
      r = clips[i].node.getBoundingClientRect();
      x = r.left * scale;
      y = r.top * scale;
      w = r.width * scale;
      h = r.height * scale;
      if (w < 1 || h < 1) continue;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, coverRadii(clips[i].st, w, h, scale));
      else ctx.rect(x, y, w, h);
      ctx.clip();
    }
  }

  function coverBeginPaint(ctx, el, st, scale, withFilter) {
    ctx.save();
    coverClipOverflow(ctx, el, scale);
    if (withFilter) {
      var filt = coverCssFilter(st);
      if (filt) ctx.filter = filt;
    }
    var op = Number(st.opacity);
    if (!isNaN(op) && op < 1) ctx.globalAlpha = op;
  }

  function coverSkipTextParent(el) {
    if (!el || coverSkipEl(el) || coverInSvg(el) || coverIsSvgRoot(el)) return true;
    var tag = String(el.tagName || '').toUpperCase();
    return tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA' || tag === 'OPTION';
  }

  function coverTextVisuallyHidden(el, st) {
    if (st.visibility === 'hidden' || Number(st.opacity) === 0) return true;
    var indent = parseFloat(st.textIndent);
    if (!isNaN(indent) && indent <= -900) return true;
    var clip = String(st.clip || '');
    if (/rect\\s*\\(\\s*0px/i.test(clip)) return true;
    var clipPath = String(st.clipPath || st.webkitClipPath || '');
    if (clipPath.indexOf('inset(50%)') !== -1 || clipPath.indexOf('inset(100%)') !== -1) return true;
    var r = el.getBoundingClientRect();
    if ((st.overflow === 'hidden' || st.overflow === 'clip') && r.width <= 1 && r.height <= 1) return true;
    return false;
  }

  function coverUnionRect(a, b) {
    var left = Math.min(a.left, b.left);
    var top = Math.min(a.top, b.top);
    var right = Math.max(a.right, b.right);
    var bottom = Math.max(a.bottom, b.bottom);
    return { left: left, top: top, right: right, bottom: bottom, width: right - left, height: bottom - top };
  }

  function coverTextLines(node) {
    var text = String(node.textContent || '');
    if (!text || !text.replace(/\\s+/g, '').length) return [];
    var range = document.createRange();
    var lines = [];
    var current = null;
    var i, ch, r, top;
    for (i = 0; i < text.length; i++) {
      ch = text.charAt(i);
      if (ch === '\\n') {
        if (current) { lines.push(current); current = null; }
        continue;
      }
      try {
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        r = range.getBoundingClientRect();
      } catch (e) {
        continue;
      }
      if (!r || (r.width <= 0 && r.height <= 0)) continue;
      top = Math.round(r.top);
      if (!current || Math.abs(current.top - top) > 3) {
        if (current) lines.push(current);
        current = { text: ch, rect: r, top: top };
      } else {
        current.text += ch;
        current.rect = coverUnionRect(current.rect, r);
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function coverPaintTexts(ctx, scale, vw, vh) {
    var walker;
    try {
      walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    } catch (e) {
      return 0;
    }
    var hits = 0;
    var node, el, st, lines, li, line, r, fontSize, top, rh, spacing;
    while ((node = walker.nextNode())) {
      el = node.parentElement;
      if (coverSkipTextParent(el)) continue;
      try { st = getComputedStyle(el); } catch (e2) { continue; }
      if (st.display === 'none' || coverTextVisuallyHidden(el, st)) continue;
      lines = coverTextLines(node);
      if (!lines.length) continue;
      ctx.save();
      coverClipOverflow(ctx, el, scale);
      fontSize = Math.max(7, (parseFloat(st.fontSize) || 14) * scale);
      ctx.font = (st.fontStyle && st.fontStyle !== 'normal' ? st.fontStyle + ' ' : '') + (st.fontWeight || 400) + ' ' + fontSize + 'px ' + (st.fontFamily || 'sans-serif');
      ctx.fillStyle = coverColor(ctx, st.color, '#111111');
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      spacing = parseFloat(st.letterSpacing);
      if (ctx.letterSpacing !== undefined) {
        ctx.letterSpacing = (!isNaN(spacing) ? (spacing * scale) : 0) + 'px';
      }
      for (li = 0; li < lines.length; li++) {
        line = lines[li];
        r = line.rect;
        if (!r || r.width < 0.5 || r.height < 0.5) continue;
        if (r.bottom < 0 || r.right < 0 || r.top > vh || r.left > vw) continue;
        top = r.top * scale;
        rh = r.height * scale;
        ctx.fillText(line.text.replace(/\\n/g, ''), r.left * scale, top + Math.max(0, (rh - fontSize) / 2));
        hits++;
      }
      ctx.restore();
    }
    return hits;
  }

  function coverSvgImage(svg) {
    return new Promise(function(resolve) {
      try {
        var clone = svg.cloneNode(true);
        if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        var st = getComputedStyle(svg);
        var color = st.color || '#111111';
        var rect = svg.getBoundingClientRect();
        var w = Math.max(1, Math.round(rect.width));
        var h = Math.max(1, Math.round(rect.height));
        clone.setAttribute('width', String(w));
        clone.setAttribute('height', String(h));
        if (!clone.getAttribute('viewBox')) {
          var vb = svg.getAttribute('viewBox');
          if (vb) clone.setAttribute('viewBox', vb);
          else clone.setAttribute('viewBox', '0 0 24 24');
        }
        var xml = new XMLSerializer().serializeToString(clone);
        xml = xml.replace(/currentColor/g, color);
        var img = new Image();
        var timer = setTimeout(function() { img.src = ''; resolve(null); }, 1500);
        img.onload = function() { clearTimeout(timer); resolve(img); };
        img.onerror = function() { clearTimeout(timer); resolve(null); };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
      } catch (e) {
        resolve(null);
      }
    });
  }

  function coverPaintPage() {
    var body = document.body;
    var root = document.documentElement;
    if (!body) return Promise.resolve(null);
    var vw = Math.max(1, Math.round(innerWidth || root.clientWidth || 0));
    var vh = Math.max(1, Math.round(innerHeight || root.clientHeight || 0));
    if (vw < 160 || vh < 90) return Promise.resolve(null);
    var scale = Math.min(1, 960 / vw);
    var canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(vw * scale));
    canvas.height = Math.max(1, Math.round(vh * scale));
    var ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(null);
    var bodyBg = getComputedStyle(body).backgroundColor;
    var htmlBg = getComputedStyle(root).backgroundColor;
    ctx.fillStyle = coverColor(ctx, bodyBg, coverColor(ctx, htmlBg, '#ffffff'));
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var nodes = body.querySelectorAll('*');
    var limit = Math.min(nodes.length, 1400);
    var hits = 0;
    var svgTasks = [];
    var i, el, st, r, x, y, w, h, bw;
    for (i = 0; i < limit; i++) {
      el = nodes[i];
      if (coverSkipEl(el) || coverInSvg(el) || coverIsSvgRoot(el)) continue;
      st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) continue;
      r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.right < 0 || r.top > vh || r.left > vw) continue;
      x = r.left * scale;
      y = r.top * scale;
      w = r.width * scale;
      h = r.height * scale;
      coverBeginPaint(ctx, el, st, scale, true);
      if (!coverTransparent(st.backgroundColor)) {
        ctx.fillStyle = coverColor(ctx, st.backgroundColor, 'transparent');
        if (ctx.fillStyle && ctx.fillStyle !== 'transparent') {
          coverFillRound(ctx, x, y, w, h, coverRadii(st, w, h, scale));
          hits++;
        }
      }
      bw = parseFloat(st.borderTopWidth) || 0;
      if (bw > 0 && !coverTransparent(st.borderTopColor)) {
        ctx.strokeStyle = coverColor(ctx, st.borderTopColor, '#000');
        ctx.lineWidth = Math.max(1, bw * scale);
        coverStrokeRound(ctx, x, y, w, h, coverRadii(st, w, h, scale));
        hits++;
      }
      ctx.restore();
    }
    for (i = 0; i < limit; i++) {
      el = nodes[i];
      if (coverSkipEl(el) || coverInSvg(el)) continue;
      st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) continue;
      r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.right < 0 || r.top > vh || r.left > vw) continue;
      x = r.left * scale;
      y = r.top * scale;
      w = r.width * scale;
      h = r.height * scale;
      if (coverIsSvgRoot(el)) {
        svgTasks.push({ el: el, x: x, y: y, w: w, h: h, st: st });
        continue;
      }
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth > 0) {
        coverBeginPaint(ctx, el, st, scale, false);
        try { ctx.drawImage(el, x, y, w, h); hits++; } catch (e) {}
        ctx.restore();
      }
    }
    hits += coverPaintTexts(ctx, scale, vw, vh);
    if (!svgTasks.length) return Promise.resolve({ canvas: canvas, hits: hits });
    return Promise.all(svgTasks.map(function(task) {
      return coverSvgImage(task.el).then(function(img) {
        if (!img) return 0;
        coverBeginPaint(ctx, task.el, task.st, scale, false);
        try { ctx.drawImage(img, task.x, task.y, task.w, task.h); } catch (e) { ctx.restore(); return 0; }
        ctx.restore();
        return 1;
      });
    })).then(function(drawn) {
      var n = 0;
      var j;
      for (j = 0; j < drawn.length; j++) n += drawn[j];
      return { canvas: canvas, hits: hits + n };
    });
  }

  function coverInstallLib(source) {
    if (typeof window.html2canvas === 'function' || !source) return;
    try {
      var s = document.createElement('script');
      s.textContent = String(source);
      (document.head || document.documentElement).appendChild(s);
      s.remove();
    } catch (e) {}
    try {
      if (window.html2canvas && window.html2canvas.default) window.html2canvas = window.html2canvas.default;
    } catch (e2) {}
  }

  function coverFromCanvas(canvas) {
    if (!canvas || canvas.width < 32 || canvas.height < 32) return '';
    try { return canvas.toDataURL('image/jpeg', 0.84); } catch (e1) {
      try { return canvas.toDataURL('image/png'); } catch (e2) { return ''; }
    }
  }

  function coverSend(id, dataUrl) {
    try {
      parent.postMessage({ source: SRC, type: 'cover-result', id: id, ok: Boolean(dataUrl), dataUrl: dataUrl || '' }, '*');
    } catch (e) {}
  }

  function coverPaintFallback(id) {
    Promise.resolve()
      .then(function() { return coverPaintPage(); })
      .then(function(painted) {
        var canvas = painted && painted.canvas;
        if (!canvas || !painted.hits) {
          coverSend(id, '');
          return;
        }
        coverSend(id, coverFromCanvas(canvas));
      })
      .catch(function() {
        coverSend(id, '');
      });
  }

  function coverHtml2Canvas() {
    var fn = window.html2canvas;
    if (typeof fn !== 'function') return Promise.reject(new Error('missing'));
    var w = Math.max(1, Math.round(innerWidth || 0));
    var h = Math.max(1, Math.round(innerHeight || 0));
    if (w < 160 || h < 90) return Promise.reject(new Error('small'));
    return fn(document.documentElement, {
      width: w,
      height: h,
      windowWidth: w,
      windowHeight: h,
      x: Math.round(pageXOffset || 0),
      y: Math.round(pageYOffset || 0),
      scrollX: -(pageXOffset || 0),
      scrollY: -(pageYOffset || 0),
      scale: Math.min(1, 960 / w),
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      foreignObjectRendering: false,
      imageTimeout: 2500,
      ignoreElements: function(el) {
        try { return !!(el && el.getAttribute && el.getAttribute('data-krikkit-inspect')); } catch (e) { return false; }
      }
    });
  }

  function coverWhenFontsReady() {
    try {
      if (document.fonts && document.fonts.ready) {
        return Promise.race([
          document.fonts.ready,
          new Promise(function(resolve) { setTimeout(resolve, 500); })
        ]);
      }
    } catch (e) {}
    return Promise.resolve();
  }

  function coverCapture(id) {
    coverWhenFontsReady()
      .then(function() { return coverPaintPage(); })
      .then(function(painted) {
        var canvas = painted && painted.canvas;
        if (!canvas) {
          coverSend(id, '');
          return;
        }
        coverSend(id, coverFromCanvas(canvas));
      })
      .catch(function() {
        coverSend(id, '');
      });
  }

  window.addEventListener('message', function(ev) {
    var d = ev && ev.data;
    if (!d || d.source !== SRC) return;
    try {
      if (d.type === 'cover-capture') {
        coverCapture(d.id);
        return;
      }
      if (d.type === 'navigate') {
        var next = d.path || '/';
        if (!next.startsWith('/')) next = '/' + next;
        var browser = location.pathname || '/';
        if (browser.length > 1 && browser.endsWith('/')) browser = browser.slice(0, -1);
        var logical = currentPath().split('?')[0].split('#')[0] || '/';
        if (logical.length > 1 && logical.endsWith('/')) logical = logical.slice(0, -1);
        if (browser !== next || logical !== next) {
          location.assign(next);
          return;
        }
        if (d.replace) history.replaceState(history.state, '', next);
        else history.pushState(history.state, '', next);
        dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
        return;
      }
      if (d.type === 'back') { history.back(); return; }
      if (d.type === 'forward') { history.forward(); return; }
      if (d.type === 'reload') {
        parent.postMessage({ source: SRC, type: 'need-reload', path: currentPath() }, '*');
        return;
      }
      if (d.type === 'inspect-start') { startInspect(d.theme || null); return; }
      if (d.type === 'inspect-stop') { stopInspect(); return; }
      if (d.type === 'inspect-apply') applyInspect(d);
      if (d.type === 'context-dismiss') dismissContext();
      if (d.type === 'text-edit-start') {
        if (d.theme) applyTheme(d.theme);
        startTextEdit();
        return;
      }
    } catch (e) {}
  });

  document.addEventListener('contextmenu', onContext, true);

  try {
    var coverObs = new MutationObserver(coverNotifyPainted);
    coverObs.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  } catch (e) {}
  coverNotifyPainted();
  setTimeout(coverNotifyPainted, 600);
  setTimeout(coverNotifyPainted, 1600);
  setTimeout(coverNotifyPainted, 4000);

  /* ── Guest runtime / console errors → Lab auto-fix ── */
  var guestErrorSent = Object.create(null);
  var GUEST_ERROR_DEDUPE_MS = 5000;
  var guestBootUntil = Date.now() + 3500;

  function guestArgText(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (value instanceof Error) {
      return (value.message || 'Error') + (value.stack ? '\\n' + value.stack : '');
    }
    try { return JSON.stringify(value); } catch (e) { return String(value); }
  }

  function guestNoise(text) {
    var hay = String(text || '');
    if (!hay) return true;
    if (/websocket connection|hmr update|hmr connected|direct websocket connection fallback/i.test(hay)) return true;
    /* Vite chatter is noise — but vite ERRORS (internal server error, failed
       to reload, pre-transform) must reach the Fix card. */
    if (/\\[vite\\]/i.test(hay) && !/error|failed/i.test(hay)) return true;
    if (/failed to load resource/i.test(hay)) return true;
    if (/download the react devtools/i.test(hay)) return true;
    if (/^script error\.?$/i.test(hay.trim())) return true;
    if (/^warning:/i.test(hay) && !/uncaught|typeerror|referenceerror|syntaxerror/i.test(hay)) return true;
    return false;
  }

  function guestComponentFromStack(text) {
    var m = String(text || '').match(/\\bat\\s+([A-Z][A-Za-z0-9_$]*)\\s*(?:\\(|$)/m);
    return m ? m[1] : null;
  }

  function guestFileFromStack(text) {
    var m = String(text || '').match(/((?:src|app|pages|components|lib|hooks)\\/[\\w./+-]+\\.[a-zA-Z0-9]+|[A-Za-z][\\w.-]*\\.(?:jsx|tsx|vue|svelte))(?::(\\d+))?/);
    if (!m) return { file: null, line: null };
    return { file: m[1] || null, line: m[2] ? Number(m[2]) : null };
  }

  function reportGuestError(payload) {
    var message = String(payload && payload.message || '').trim();
    var stack = String(payload && payload.stack || message || '').trim();
    if (!message || guestNoise(message) || guestNoise(stack)) return;
    if (Date.now() < guestBootUntil && (payload.category || 'RUNTIME_ERROR') !== 'BUILD_ERROR') return;
    var key = message.slice(0, 140);
    var now = Date.now();
    if (guestErrorSent[key] && now - guestErrorSent[key] < GUEST_ERROR_DEDUPE_MS) return;
    guestErrorSent[key] = now;
    var origin = guestFileFromStack(stack || message);
    try {
      parent.postMessage({
        source: SRC,
        type: 'guest-console-error',
        category: payload.category || 'RUNTIME_ERROR',
        message: message,
        stack: stack,
        file: payload.file || origin.file || null,
        line: payload.line != null ? payload.line : origin.line,
        component: payload.component || guestComponentFromStack(stack || message) || null
      }, '*');
    } catch (e) {}
  }

  /* Vite's build-error overlay renders inside a shadow root — surface it to
     the host so the Fix card appears without any manual reload. */
  var lastOverlayMsg = '';
  function checkViteOverlay() {
    try {
      var overlay = document.querySelector('vite-error-overlay');
      if (!overlay) { lastOverlayMsg = ''; return; }
      var root = overlay.shadowRoot;
      if (!root) return;
      var msgEl = root.querySelector('.message') || root.querySelector('.message-body');
      var fileEl = root.querySelector('.file');
      var msg = msgEl && msgEl.textContent ? msgEl.textContent.trim() : '';
      if (!msg || msg === lastOverlayMsg) return;
      lastOverlayMsg = msg;
      reportGuestError({
        category: 'BUILD_ERROR',
        message: msg,
        stack: msg,
        file: fileEl && fileEl.textContent ? fileEl.textContent.trim() : null
      });
    } catch (e) {}
  }
  setInterval(checkViteOverlay, 1200);

  window.addEventListener('error', function(ev) {
    if (!ev) return;
    var msg = String(ev.message || 'Script error');
    var stack = ev.error && ev.error.stack
      ? String(ev.error.stack)
      : msg + (ev.filename ? '\\n    at ' + ev.filename + (ev.lineno ? ':' + ev.lineno : '') : '');
    reportGuestError({
      message: msg,
      stack: stack,
      file: ev.filename || null,
      line: ev.lineno != null ? Number(ev.lineno) : null
    });
  }, true);

  window.addEventListener('unhandledrejection', function(ev) {
    var reason = ev && ev.reason;
    if (reason instanceof Error) {
      reportGuestError({ message: reason.message || 'Unhandled promise rejection', stack: reason.stack || reason.message || '' });
      return;
    }
    reportGuestError({ message: String(reason || 'Unhandled promise rejection'), stack: String(reason || '') });
  });

  var nativeConsoleError = console.error;
  console.error = function() {
    nativeConsoleError.apply(console, arguments);
    var parts = [];
    var i;
    for (i = 0; i < arguments.length; i++) parts.push(guestArgText(arguments[i]));
    var joined = parts.join('\\n').trim();
    if (!joined || guestNoise(joined)) return;
    var stack = joined;
    for (i = 0; i < arguments.length; i++) {
      if (arguments[i] instanceof Error && arguments[i].stack) {
        stack = String(arguments[i].stack);
        break;
      }
    }
    reportGuestError({ message: joined.split('\\n')[0], stack: stack });
  };

  report('init');
})();`

export function postToPreview(iframe, payload) {
    const win = iframe?.contentWindow
    if (! win) return false
    try {
        win.postMessage({ source: PREVIEW_CHROME_SOURCE, ...payload }, '*')
        return true
    } catch {
        return false
    }
}

/** Theme Customizer tokens for the inspect overlay (host → iframe). */
export function readInspectTheme() {
    if (typeof document === 'undefined') {
        return {
            accent: '#14b8a6',
            surface: '#0a0a0a',
            fg: '#fafafa',
            line: 'rgba(255,255,255,0.12)',
        }
    }
    const cs = getComputedStyle(document.documentElement)
    const read = (name, fallback) => {
        const value = cs.getPropertyValue(name).trim()
        return value || fallback
    }
    return {
        accent: read('--color-accent', '#14b8a6'),
        surface: read('--color-krikkit-surface', '#0a0a0a'),
        fg: read('--color-krikkit-fg', '#fafafa'),
        line: read('--color-krikkit-line', 'rgba(255,255,255,0.12)'),
    }
}

export function isPreviewChromeMessage(data) {
    return Boolean(data && data.source === PREVIEW_CHROME_SOURCE)
}
