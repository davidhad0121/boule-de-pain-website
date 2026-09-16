/* Boule de Pain — brings in changes published from the admin panel before the page draws
   hours, the menu and the other live parts.
   - Live website: reads them from the admin panel address in site-config.js ("admin" -> "url").
   - Opened from your computer: shows what you published in the admin panel's test mode
     (saved in this browser only).
   If nothing was published, or the admin panel can't be reached, the page uses its own files. */
(function () {
  'use strict';

  var SITE = window.SITE || (window.SITE = {});
  var DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var LOCAL = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var CACHE_KEY = 'bdp-live-v1';
  var TEST_KEY = 'bdp-admin-test-v1';
  var FRESH_MS = 60 * 1000;
  var UPLOAD_ID = /^[A-Za-z0-9_-]{16,64}$/;

  var live = { source: 'files', version: 0, menu: null, urls: {}, base: adminBase() };
  window.BDP_LIVE = live;

  function adminBase() {
    var raw = String((SITE.admin && SITE.admin.url) || '').trim();
    if (!raw) return '';
    try {
      var u = new URL(raw);
      var ok = u.protocol === 'https:' || (u.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/.test(u.hostname));
      return ok ? u.origin : '';
    } catch (e) { return ''; }
  }
  function read(key) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full or blocked */ }
  }

  /* Photo address for an uploaded photo ("upload:<id>"); other photos come from the Wix library. */
  live.imgUrl = function (ref, variant) {
    if (!ref || String(ref).indexOf('upload:') !== 0) return '';
    var id = String(ref).slice(7);
    var key = id + ':' + (variant === 'thumb' ? 'thumb' : 'full');
    if (live.urls[key]) return live.urls[key];
    if (live.source !== 'test' && live.base && UPLOAD_ID.test(id)) {
      return live.base + '/img/' + id + (variant === 'thumb' ? '?v=thumb' : '');
    }
    return '';
  };

  function looksValid(data) {
    return data && typeof data === 'object' && data.version > 0 && data.site && data.menu &&
      Array.isArray(data.menu.categories) && Array.isArray(data.site.hours) && data.site.hours.length === 7;
  }

  function applySite(s) {
    if (typeof s.announcement === 'string') SITE.announcement = s.announcement;
    SITE.hours = s.hours.map(function (h) {
      return { day: h.day, name: DAY[h.day], short: DAY[h.day].slice(0, 3), open: h.open || '', close: h.close || '' };
    });
    if (Array.isArray(s.closures)) {
      SITE.closedDates = s.closures.map(function (c) { return c.date; });
      SITE.closureNotes = {};
      s.closures.forEach(function (c) { if (c.note) SITE.closureNotes[c.date] = c.note; });
    }
    if (s.ordering) {
      SITE.ordering = SITE.ordering || {};
      ['cutoff', 'leadDays', 'deliveryDays', 'maxDaysAhead', 'windowMinutes'].forEach(function (k) {
        if (s.ordering[k] != null) SITE.ordering[k] = s.ordering[k];
      });
    }
    if (Array.isArray(s.markets)) {
      var old = SITE.markets || [];
      SITE.markets = s.markets.map(function (m) {
        var prev = old.filter(function (x) { return x.day === m.day; })[0];
        return { day: m.day, name: DAY[m.day], photo: prev ? prev.photo : '', locations: m.locations.slice() };
      });
    }
    if (s.wholesale && typeof s.wholesale === 'object') {
      SITE.wholesale = s.wholesale;
      live.wholesale = s.wholesale;
    }
  }

  /* Hidden items are left out everywhere (menu, cart, home page, chatbot). */
  function applyMenu(m) {
    var visible = function (it) { return it && !it.hidden; };
    window.MENU = {
      addonGroups: m.addonGroups || {},
      categories: m.categories.map(function (c) {
        var out = {};
        Object.keys(c).forEach(function (k) { out[k] = c[k]; });
        if (c.groups) out.groups = c.groups.map(function (g) { return { title: g.title, items: g.items.filter(visible) }; });
        else out.items = (c.items || []).filter(visible);
        return out;
      })
    };
    live.menu = window.MENU;
  }

  function apply(data, source) {
    if (!looksValid(data)) return;
    try {
      applySite(data.site);
      applyMenu(data.menu);
      live.source = source;
      live.version = data.version;
      live.savedAt = data.savedAt || null;
    } catch (e) { /* keep the page's own data */ }
  }

  function uploadIds(menu, site) {
    var ids = [];
    var ws = site && site.wholesale;
    ((ws && ws.photos) || []).forEach(function (p) {
      if (p && p.img && String(p.img).indexOf('upload:') === 0) ids.push(String(p.img).slice(7));
    });
    menu.categories.forEach(function (c) {
      (c.groups || [{ items: c.items || [] }]).forEach(function (g) {
        g.items.forEach(function (it) {
          if (it.img && it.img.indexOf('upload:') === 0) ids.push(it.img.slice(7));
        });
      });
    });
    return ids;
  }

  /* Test mode photos live in this browser's IndexedDB (saved by admin.html). */
  function loadTestPhotos(menu, site) {
    var ids = uploadIds(menu, site);
    if (!ids.length || !window.indexedDB) return Promise.resolve();
    return new Promise(function (resolve) {
      var req;
      try { req = indexedDB.open('bdp-admin-test', 1); } catch (e) { resolve(); return; }
      req.onupgradeneeded = function () { req.result.createObjectStore('images'); };
      req.onerror = function () { resolve(); };
      req.onsuccess = function () {
        var db = req.result, left = ids.length;
        var done = function () { if (--left <= 0) { db.close(); resolve(); } };
        try {
          var st = db.transaction('images', 'readonly').objectStore('images');
          ids.forEach(function (id) {
            var g = st.get(id);
            g.onsuccess = function () {
              var rec = g.result;
              if (rec && rec.full && rec.thumb) {
                live.urls[id + ':full'] = URL.createObjectURL(rec.full);
                live.urls[id + ':thumb'] = URL.createObjectURL(rec.thumb);
              }
              done();
            };
            g.onerror = done;
          });
        } catch (e) { db.close(); resolve(); }
      };
    });
  }

  function fetchLive() {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 3000);
    return fetch(live.base + '/api/public', { mode: 'cors', credentials: 'omit', cache: 'no-cache', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('status ' + r.status); return r.json(); })
      .then(function (data) { clearTimeout(timer); return data; },
        function (err) { clearTimeout(timer); throw err; });
  }

  // Wait until every deferred script (menu-data.js, main.js, order.js) has run, so the published
  // data replaces the page's own copy instead of being overwritten by it.
  function domReady() {
    return new Promise(function (resolve) {
      if (document.readyState === 'complete') { resolve(); return; }
      document.addEventListener('DOMContentLoaded', function () { resolve(); });
      window.addEventListener('load', function () { resolve(); });
    });
  }

  function load() {
    if (LOCAL) {
      var t = read(TEST_KEY);
      if (t && t.doc && t.preview !== false && t.version > 0) {
        var data = { version: t.version, savedAt: t.savedAt, site: t.doc.site, menu: t.doc.menu };
        if (looksValid(data)) {
          live.source = 'test';
          return loadTestPhotos(data.menu, data.site).then(function () { apply(data, 'test'); });
        }
      }
    }
    if (!live.base) return Promise.resolve();
    var cached = read(CACHE_KEY);
    var usable = cached && cached.base === live.base && cached.data;
    if (usable && Date.now() - cached.at < FRESH_MS) { apply(cached.data, 'live'); return Promise.resolve(); }
    return fetchLive().then(function (data) {
      if (data && data.version === 0) { write(CACHE_KEY, { base: live.base, at: Date.now(), data: data }); return; }
      if (!looksValid(data)) throw new Error('unexpected data');
      write(CACHE_KEY, { base: live.base, at: Date.now(), data: data });
      apply(data, 'live');
    }).catch(function () {
      if (usable) apply(cached.data, 'saved');
    });
  }

  live.ready = domReady().then(load).catch(function () { /* use the page's own data */ }).then(function () { return live; });
})();
