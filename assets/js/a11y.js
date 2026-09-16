/* Boule de Pain — accessibility options (the blue button in the bottom-right corner).
   Each visitor can change text size and spacing, use a more readable font, switch colors,
   highlight links, stop motion, hide images, use a reading guide or a bigger cursor, and
   have text read aloud. Choices are saved on this device only.
   The website itself is built and tested for WCAG 2.1 AA; these options are extra help,
   not a replacement for it or for a visitor's own assistive technology. */
(function () {
  'use strict';

  var KEY = 'bdp-a11y-v1';
  var doc = document;
  var root = doc.documentElement;
  var TEXT_STEPS = [100, 115, 130, 150, 175];
  var FONT_URL = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap';
  var CAN_SPEAK = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  var DEFAULTS = { text: 0, font: false, spacing: false, left: false, contrast: '', links: false, focus: false, cursor: false, guide: '', still: false, noimg: false, speak: false };
  var TOGGLES = ['font', 'spacing', 'left', 'links', 'focus', 'cursor', 'still', 'noimg', 'speak'];
  var CHOICES = { contrast: ['', 'high', 'dark', 'mono'], guide: ['', 'line', 'mask'] };

  function $(sel, el) { return (el || doc).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); }

  function load() {
    var s = {};
    Object.keys(DEFAULTS).forEach(function (k) { s[k] = DEFAULTS[k]; });
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && typeof saved === 'object') {
        TOGGLES.forEach(function (k) { if (saved[k] === true) s[k] = true; });
        if (saved.text > 0 && saved.text < TEXT_STEPS.length) s.text = Math.floor(saved.text);
        Object.keys(CHOICES).forEach(function (k) { if (CHOICES[k].indexOf(saved[k]) > -1) s[k] = saved[k]; });
      }
    } catch (e) { /* storage blocked: start with defaults */ }
    if (!CAN_SPEAK) s.speak = false;
    return s;
  }
  var state = load();
  function save() {
    var out = {};
    Object.keys(state).forEach(function (k) { if (state[k] && state[k] !== DEFAULTS[k]) out[k] = state[k]; });
    try {
      if (Object.keys(out).length) localStorage.setItem(KEY, JSON.stringify(out));
      else localStorage.removeItem(KEY);
    } catch (e) { /* not saved, still applied for this page */ }
  }

  /* ---------- apply settings to the page ---------- */
  function apply() {
    var cls = root.classList;
    Array.prototype.slice.call(cls).forEach(function (c) { if (c.indexOf('a11y-') === 0 && c !== 'a11y-open') cls.remove(c); });
    if (state.text) cls.add('a11y-text-' + state.text);
    TOGGLES.forEach(function (k) { if (state[k]) cls.add('a11y-' + k); });
    if (state.contrast) cls.add('a11y-contrast-' + state.contrast);
    if (state.guide) cls.add('a11y-guide-' + state.guide);
    if (state.font && !$('link[data-a11y-font]')) {
      var l = doc.createElement('link');
      l.rel = 'stylesheet';
      l.href = FONT_URL;
      l.setAttribute('data-a11y-font', '');
      doc.head.appendChild(l);
    }
    if (state.still) $$('video').forEach(function (v) { try { v.pause(); } catch (e) { /* ignore */ } v.removeAttribute('autoplay'); });
    setupGuide();
    if (!state.speak) stopSpeaking();
    syncControls();
  }

  /* ---------- reading guide and mask ---------- */
  var guideEls = null, guideY = null;
  function onPointer(e) {
    var t = e.touches ? e.touches[0] : e;
    if (!t) return;
    guideY = t.clientY;
    placeGuide();
  }
  function placeGuide() {
    if (!guideEls || guideY == null) return;
    var y = guideY, band = 56;
    guideEls.line.style.top = y + 'px';
    guideEls.top.style.height = Math.max(0, y - band) + 'px';
    guideEls.bottom.style.top = (y + band) + 'px';
  }
  function setupGuide() {
    var on = !!state.guide;
    if (on && !guideEls) {
      guideEls = { line: doc.createElement('div'), top: doc.createElement('div'), bottom: doc.createElement('div') };
      guideEls.line.className = 'a11y-guide';
      guideEls.top.className = 'a11y-mask a11y-mask--top';
      guideEls.bottom.className = 'a11y-mask a11y-mask--bottom';
      Object.keys(guideEls).forEach(function (k) {
        guideEls[k].setAttribute('aria-hidden', 'true');
        doc.body.appendChild(guideEls[k]);
      });
      guideY = Math.round(window.innerHeight / 3);
      placeGuide();
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('touchmove', onPointer, { passive: true });
    }
    if (!on && guideEls) {
      Object.keys(guideEls).forEach(function (k) { guideEls[k].remove(); });
      guideEls = null;
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('touchmove', onPointer);
    }
  }

  /* ---------- read aloud ---------- */
  var reading = null; // { el }
  var player = null;
  function clean(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
  function nameOf(el) {
    if (!el || el === doc.body) return '';
    var label = el.getAttribute('aria-label');
    if (label) return clean(label);
    var by = el.getAttribute('aria-labelledby');
    if (by) return clean(by.split(' ').map(function (id) { var x = doc.getElementById(id); return x ? x.textContent : ''; }).join(' '));
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) {
      var lab = el.id ? doc.querySelector('label[for="' + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id) + '"]') : el.closest('label');
      var what = lab ? clean(lab.textContent) : clean(el.getAttribute('placeholder') || el.name);
      if (el.type === 'checkbox' || el.type === 'radio') return what + (el.checked ? ', selected' : ', not selected');
      var val = el.tagName === 'SELECT' ? (el.selectedOptions[0] ? el.selectedOptions[0].textContent : '') : (el.type === 'password' ? '' : el.value);
      return clean(what + (val ? ', ' + val : ''));
    }
    if (el.tagName === 'IMG') return clean(el.alt);
    return clean(el.innerText || el.textContent);
  }
  function chunks(text) {
    var parts = String(text).match(/[^.!?]+[.!?]*\s*/g) || [text];
    var out = [], cur = '';
    parts.forEach(function (p) {
      if ((cur + p).length > 180 && cur) { out.push(cur); cur = ''; }
      cur += p;
    });
    if (cur.trim()) out.push(cur);
    return out;
  }
  function mark(el) {
    $$('.a11y-reading').forEach(function (x) { x.classList.remove('a11y-reading'); });
    if (el && el.classList) el.classList.add('a11y-reading');
  }
  function stopSpeaking() {
    if (CAN_SPEAK) window.speechSynthesis.cancel();
    reading = null;
    mark(null);
    showPlayer(false);
  }
  function speakQueue(items) {
    if (!CAN_SPEAK) return;
    window.speechSynthesis.cancel();
    var token = {};
    reading = token;
    var i = 0;
    function next() {
      if (reading !== token) return;
      if (i >= items.length) { reading = null; mark(null); showPlayer(false); return; }
      var item = items[i++];
      mark(item.el);
      var parts = chunks(item.text), j = 0;
      (function say() {
        if (reading !== token) return;
        if (j >= parts.length) { next(); return; }
        var u = new SpeechSynthesisUtterance(parts[j++]);
        u.lang = root.lang || 'en-US';
        u.rate = 1;
        u.onend = say;
        u.onerror = function () { if (reading === token) say(); };
        window.speechSynthesis.speak(u);
      })();
    }
    next();
  }
  function speakOne(text, el) {
    text = clean(text);
    if (!text) return;
    showPlayer(false);
    speakQueue([{ text: text, el: el }]);
  }
  function readPage() {
    var main = $('main') || doc.body;
    var sel = 'h1, h2, h3, h4, p, li, figcaption, dt, dd, td, th, blockquote, address';
    var blocks = $$(sel, main).filter(function (el) {
      if (el.closest('[aria-hidden="true"], [hidden], .a11y-panel, .sr-only, form, nav')) return false;
      if (el.offsetParent === null) return false;
      if (el.querySelector(sel)) return false; // read the inner blocks instead
      return !!clean(el.innerText);
    }).map(function (el) { return { text: el.innerText, el: el }; });
    if (!blocks.length) return;
    closePanel();
    showPlayer(true);
    speakQueue(blocks);
  }
  function showPlayer(on) {
    if (!player && on) {
      player = doc.createElement('div');
      player.className = 'a11y-player';
      player.setAttribute('role', 'group');
      player.setAttribute('aria-label', 'Reading the page aloud');
      player.innerHTML = '<span class="a11y-player__label">Reading aloud</span>' +
        '<button type="button" data-a11y-pause>Pause</button><button type="button" data-a11y-stop>Stop</button>';
      doc.body.appendChild(player);
      player.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        if (b.hasAttribute('data-a11y-stop')) { stopSpeaking(); return; }
        var synth = window.speechSynthesis;
        if (synth.paused) { synth.resume(); b.textContent = 'Pause'; }
        else { synth.pause(); b.textContent = 'Resume'; }
      });
    }
    if (player) {
      player.hidden = !on;
      if (on) { var p = $('[data-a11y-pause]', player); if (p) p.textContent = 'Pause'; }
    }
  }
  var READABLE = 'p, h1, h2, h3, h4, h5, h6, li, td, th, dt, dd, figcaption, blockquote, label, legend, summary, a, button, address, output, .badge, .dish__price, .status';
  doc.addEventListener('click', function (e) {
    if (!state.speak || !e.target.closest) return;
    if (e.target.closest('.a11y-panel, .a11y-fab, .a11y-player, #bdp-chatbot')) return;
    var el = e.target.closest(READABLE);
    if (el) speakOne(nameOf(el), el);
  }, true);
  doc.addEventListener('focusin', function (e) {
    if (!state.speak || !e.target || e.target === doc.body || isOpen()) return;
    if (e.target.closest && e.target.closest('.a11y-player')) return;
    if (e.target.matches && e.target.matches('a, button, input, select, textarea, [tabindex]')) speakOne(nameOf(e.target), e.target);
  });
  window.addEventListener('pagehide', function () { if (CAN_SPEAK) window.speechSynthesis.cancel(); });

  /* ---------- the button and panel ---------- */
  var ICON = {
    person: '<circle cx="12" cy="4.2" r="2.2"/><path d="M4.5 8.2c2.4.8 4.9 1.2 7.5 1.2s5.1-.4 7.5-1.2"/><path d="M12 9.4v4.8M12 14.2l-3.2 6.3M12 14.2l3.2 6.3"/>',
    font: '<path d="M4 19l5.5-14h1L16 19M6.3 14h7.4"/><path d="M17 11.5c.6-.5 1.4-.8 2.2-.8 1.4 0 2.3.8 2.3 2.2V19M21.5 15.2c-3.8-.4-5.2.6-5.2 2 0 1.1.8 1.8 2 1.8 1.4 0 2.6-.8 3.2-2"/>',
    spacing: '<path d="M4 7h16M4 12h16M4 17h16"/><path d="M2 4v16M22 4v16"/>',
    left: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
    links: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
    focus: '<rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke-dasharray="3 2.5"/><rect x="8" y="8" width="8" height="8" rx="1.5"/>',
    cursor: '<path d="M5 3l13 6.5-5.6 1.6L9.8 17z"/><path d="M12.6 11.3l5.4 5.4"/>',
    still: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    noimg: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M4 17l5-4.5 3.5 3 3-2.5L20 17M3 3l18 18"/>',
    speak: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    contrast: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor"/>',
    none: '<circle cx="12" cy="12" r="8.5"/>',
    dark: '<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z"/>',
    mono: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M5 8h7M4 12h8M5 16h7"/>',
    guide: '<path d="M3 12h18"/><path d="M3 8h18M3 16h18" stroke-opacity=".4"/>',
    mask: '<rect x="3" y="3" width="18" height="5" fill="currentColor" fill-opacity=".35" stroke="none"/><rect x="3" y="16" width="18" height="5" fill="currentColor" fill-opacity=".35" stroke="none"/><path d="M3 10h18M3 14h18"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>'
  };
  function svg(name, cls) {
    return '<svg class="' + (cls || 'a11y-i') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICON[name] + '</svg>';
  }
  function toggle(key, label, hint) {
    return '<button type="button" class="a11y-tile" data-a11y-toggle="' + key + '" aria-pressed="false">' + svg(key) +
      '<span class="a11y-tile__text"><span>' + label + '</span>' + (hint ? '<small>' + hint + '</small>' : '') + '</span>' +
      '<span class="a11y-tile__state" aria-hidden="true"></span></button>';
  }
  function radio(group, value, label, iconName) {
    return '<label class="a11y-tile a11y-tile--radio"><input type="radio" name="a11y-' + group + '" value="' + value + '">' +
      svg(iconName) + '<span class="a11y-tile__text"><span>' + label + '</span></span></label>';
  }

  var fab, panel, lastFocus = null;
  function build() {
    fab = doc.createElement('button');
    fab.type = 'button';
    fab.className = 'a11y-fab';
    fab.setAttribute('aria-haspopup', 'dialog');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-controls', 'a11y-panel');
    fab.innerHTML = svg('person', 'a11y-fab__icon') + '<span class="a11y-sr">Accessibility options</span>';

    panel = doc.createElement('div');
    panel.className = 'a11y-panel';
    panel.id = 'a11y-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'a11y-title');
    panel.innerHTML =
      '<div class="a11y-panel__head">' +
        '<h2 id="a11y-title" tabindex="-1">' + svg('person') + 'Accessibility</h2>' +
        '<button type="button" class="a11y-icon-btn" data-a11y-close aria-label="Close accessibility options">' + svg('close') + '</button>' +
      '</div>' +
      '<div class="a11y-panel__body">' +
        '<p class="a11y-intro">Adjust this website to suit you. Your choices are saved on this device.</p>' +
        '<section class="a11y-section" aria-labelledby="a11y-h-text"><h3 id="a11y-h-text">Text</h3>' +
          '<div class="a11y-size" role="group" aria-labelledby="a11y-size-label">' +
            '<span id="a11y-size-label" class="a11y-size__label">Text size</span>' +
            '<button type="button" class="a11y-step" data-a11y-size="-1" aria-label="Make text smaller">A<span aria-hidden="true">−</span></button>' +
            '<output class="a11y-size__value" data-a11y-size-out aria-live="polite">100%</output>' +
            '<button type="button" class="a11y-step a11y-step--big" data-a11y-size="1" aria-label="Make text bigger">A<span aria-hidden="true">+</span></button>' +
          '</div>' +
          '<div class="a11y-grid">' +
            toggle('font', 'Readable font', 'Clearer letter shapes') +
            toggle('spacing', 'Text spacing', 'More room between lines and letters') +
            toggle('left', 'Align text left', 'No centered paragraphs') +
          '</div>' +
        '</section>' +
        '<section class="a11y-section" aria-labelledby="a11y-h-color"><h3 id="a11y-h-color">Color and contrast</h3>' +
          '<div class="a11y-grid a11y-grid--4" role="radiogroup" aria-labelledby="a11y-h-color">' +
            radio('contrast', '', 'Standard', 'none') +
            radio('contrast', 'high', 'High contrast', 'contrast') +
            radio('contrast', 'dark', 'Dark', 'dark') +
            radio('contrast', 'mono', 'Grayscale', 'mono') +
          '</div>' +
        '</section>' +
        '<section class="a11y-section" aria-labelledby="a11y-h-nav"><h3 id="a11y-h-nav">Reading and navigation</h3>' +
          '<div class="a11y-grid">' +
            toggle('links', 'Highlight links') +
            toggle('focus', 'Strong focus outline', 'Easier to follow with a keyboard') +
            toggle('cursor', 'Big cursor') +
            toggle('still', 'Stop animations', 'Pauses motion and video') +
            toggle('noimg', 'Hide images') +
            (CAN_SPEAK ? toggle('speak', 'Read aloud on click', 'Select any text to hear it') : '') +
          '</div>' +
          '<div class="a11y-grid a11y-grid--3" role="radiogroup" aria-label="Reading aid">' +
            radio('guide', '', 'No reading aid', 'none') +
            radio('guide', 'line', 'Reading guide', 'guide') +
            radio('guide', 'mask', 'Reading mask', 'mask') +
          '</div>' +
          (CAN_SPEAK ? '<button type="button" class="a11y-wide" data-a11y-read>' + svg('play') + 'Read this page aloud</button>' : '') +
        '</section>' +
        '<p class="a11y-note">These options work alongside your own settings, like browser zoom and screen readers.</p>' +
      '</div>' +
      '<div class="a11y-panel__foot">' +
        '<button type="button" class="a11y-reset" data-a11y-reset>' + svg('reset') + 'Reset all</button>' +
        '<a href="accessibility.html">Accessibility statement</a>' +
        '<a href="contact.html">Report a problem</a>' +
      '</div>';
    doc.body.appendChild(fab);
    doc.body.appendChild(panel);
    doc.body.classList.add('has-a11y');
    // With scripts on, the "Accessibility options" skip link opens this panel instead of the statement page
    $$('a.skip-link[data-a11y-open]').forEach(function (a) { a.setAttribute('href', '#a11y-panel'); });

    fab.addEventListener('click', function () { if (isOpen()) closePanel(); else openPanel(); });
    panel.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t) return;
      if (t.hasAttribute('data-a11y-close')) { closePanel(); return; }
      var key = t.getAttribute('data-a11y-toggle');
      if (key) { state[key] = !state[key]; changed(); return; }
      var step = t.getAttribute('data-a11y-size');
      if (step) {
        state.text = Math.max(0, Math.min(TEXT_STEPS.length - 1, state.text + Number(step)));
        changed();
        return;
      }
      if (t.hasAttribute('data-a11y-reset')) {
        Object.keys(DEFAULTS).forEach(function (k) { state[k] = DEFAULTS[k]; });
        changed();
        announce('All accessibility options are back to standard.');
        return;
      }
      if (t.hasAttribute('data-a11y-read')) readPage();
    });
    panel.addEventListener('change', function (e) {
      var m = /^a11y-(contrast|guide)$/.exec(e.target.name || '');
      if (!m) return;
      state[m[1]] = e.target.value;
      changed();
    });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closePanel(); return; }
      if (e.key !== 'Tab') return;
      // radio groups are one tab stop each: only their checked radio is included
      var f = $$('button:not([disabled]), a[href], input:checked', panel).filter(function (el) { return el.offsetParent !== null || el.type === 'radio'; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (doc.activeElement === first || f.indexOf(doc.activeElement) < 0)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    doc.addEventListener('click', function (e) {
      var opener = e.target.closest && e.target.closest('[data-a11y-open]');
      if (opener) { e.preventDefault(); openPanel(opener); return; }
      if (isOpen() && !panel.contains(e.target) && !fab.contains(e.target)) closePanel(false);
    });
  }
  function isOpen() { return panel && !panel.hidden; }
  function openPanel(opener) {
    lastFocus = opener && opener.focus ? opener : fab;
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    root.classList.add('a11y-open');
    syncControls();
    setTimeout(function () { $('#a11y-title', panel).focus(); }, 20);
  }
  function closePanel(restoreFocus) {
    if (!isOpen()) return;
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    root.classList.remove('a11y-open');
    if (restoreFocus !== false && lastFocus && lastFocus.focus) lastFocus.focus();
  }
  var liveRegion = null;
  function announce(msg) {
    if (!liveRegion) {
      liveRegion = doc.createElement('p');
      liveRegion.className = 'a11y-sr';
      liveRegion.setAttribute('role', 'status');
      panel.appendChild(liveRegion);
    }
    liveRegion.textContent = '';
    setTimeout(function () { liveRegion.textContent = msg; }, 60);
  }
  function changed() {
    save();
    apply();
  }
  function syncControls() {
    if (!panel) return;
    $$('[data-a11y-toggle]', panel).forEach(function (b) {
      b.setAttribute('aria-pressed', String(!!state[b.getAttribute('data-a11y-toggle')]));
    });
    Object.keys(CHOICES).forEach(function (k) {
      $$('input[name="a11y-' + k + '"]', panel).forEach(function (r) { r.checked = r.value === (state[k] || ''); });
    });
    var out = $('[data-a11y-size-out]', panel);
    if (out) out.textContent = TEXT_STEPS[state.text] + '%';
    var down = $('[data-a11y-size="-1"]', panel), up = $('[data-a11y-size="1"]', panel);
    if (down) down.disabled = state.text === 0;
    if (up) up.disabled = state.text === TEXT_STEPS.length - 1;
    var active = Object.keys(DEFAULTS).some(function (k) { return state[k] && state[k] !== DEFAULTS[k]; });
    fab.classList.toggle('is-active', active);
    fab.setAttribute('aria-label', active ? 'Accessibility options (some are on)' : 'Accessibility options');
  }

  function init() {
    build();
    apply();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
