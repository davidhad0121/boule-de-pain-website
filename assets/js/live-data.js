/* Boule de Pain — brings in what was published in the admin panel before the page draws hours, the menu
   and the other live parts.
   - Live website: asks the admin panel (the address in site-config.js, "admin" -> "url") whether there's anything
     newer than what this page already has. When nothing changed the answer is tiny; the page never waits
     more than about a second and a half for it.
   - Preview: a link from the admin panel (?preview=...) shows unpublished changes in this tab only.
   - Opened from your computer: shows what you published in the admin panel's test mode (saved in this browser).
   If the admin panel can't be reached, the page uses the newest copy it has (this browser's, or its own files). */
(function () {
  'use strict';

  var SITE = window.SITE || (window.SITE = {});
  var DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var LOCAL = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var CACHE_KEY = 'bdp-live-v2';
  var TEST_KEY = 'bdp-admin-test-v1';
  var PREVIEW_KEY = 'bdp-preview';
  var LOCAL_PREVIEW_KEY = 'bdp-admin-preview';
  var WAIT_MS = 1500;
  var UPLOAD_ID = /^[A-Za-z0-9_-]{16,64}$/;
  var fileVersion = Number(SITE.dataVersion) || 0;

  // published: the data came from the admin panel (now, earlier in this browser, or copied into the website files)
  var live = { source: 'files', version: fileVersion, published: fileVersion > 0, menu: null, urls: {}, base: adminBase() };
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
  function read(store, key) {
    try { var v = store.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function write(store, key, value) {
    try { store.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full or blocked */ }
  }
  function forget(store, key) {
    try { store.removeItem(key); } catch (e) { /* ignore */ }
  }
  function todayLA() {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: SITE.timezone || 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  /* Every date from "from" to "to" (both included, at most about two months). */
  function eachDate(from, to, fn) {
    var p = String(from).split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    var end = to && to > from ? to : from;
    for (var i = 0; i < 70; i++) {
      var iso = d.toISOString().slice(0, 10);
      if (iso > end) break;
      fn(iso);
      d = new Date(d.getTime() + 864e5);
    }
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
    return data && typeof data === 'object' && data.site && data.menu &&
      Array.isArray(data.menu.categories) && Array.isArray(data.site.hours) && data.site.hours.length === 7;
  }

  /* Published business info -> what the pages use (window.SITE). */
  function applySite(s) {
    if (typeof s.announcement === 'string') SITE.announcement = s.announcement;
    SITE.announceLink = s.announceLink && s.announceLink.url ? s.announceLink : null;
    SITE.announceFrom = s.announceFrom || '';
    SITE.announceTo = s.announceTo || '';
    SITE.hours = s.hours.map(function (h) {
      return { day: h.day, name: DAY[h.day], short: DAY[h.day].slice(0, 3), open: h.open || '', close: h.close || '' };
    });
    if (Array.isArray(s.closures)) SITE.closures = s.closures;
    SITE.special = Array.isArray(s.special) ? s.special : [];
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
    if (s.wholesale && typeof s.wholesale === 'object') SITE.wholesale = s.wholesale;
  }

  /* Closed days and special hours, as lists the pages can look dates up in. Works for the website's own files
     too (older files only have "closedDates"). */
  function tidySite() {
    if (Array.isArray(SITE.closures)) {
      var dates = [], notes = {};
      SITE.closures.forEach(function (c) {
        if (!c || !c.date) return;
        eachDate(c.date, c.to, function (iso) { dates.push(iso); if (c.note) notes[iso] = c.note; });
      });
      SITE.closedDates = dates;
      SITE.closureNotes = notes;
    }
    var special = {};
    (SITE.special || []).forEach(function (x) {
      if (!x || !x.date || !x.open || !x.close) return;
      eachDate(x.date, x.to, function (iso) { special[iso] = { open: x.open, close: x.close, note: x.note || '' }; });
    });
    SITE.specialHours = special;
  }

  /* Hidden items are left out everywhere (menu, cart, home page). "Sold out today" counts as sold out only today. */
  function applyMenu(m) {
    var today = todayLA();
    var item = function (it) {
      if (!it || it.hidden) return null;
      if (!it.soldOut && it.soldToday && it.soldToday === today) {
        var copy = {};
        Object.keys(it).forEach(function (k) { copy[k] = it[k]; });
        copy.soldOut = true;
        copy.soldOutToday = true;
        return copy;
      }
      return it;
    };
    var list = function (items) { return (items || []).map(item).filter(Boolean); };
    window.MENU = {
      addonGroups: m.addonGroups || {},
      categories: m.categories.map(function (c) {
        var out = {};
        Object.keys(c).forEach(function (k) { out[k] = c[k]; });
        if (c.groups) out.groups = c.groups.map(function (g) { return { title: g.title, items: list(g.items) }; });
        else out.items = list(c.items);
        return out;
      })
    };
    live.menu = window.MENU;
  }

  function apply(data, source) {
    if (!looksValid(data)) return false;
    try {
      applySite(data.site);
      applyMenu(data.menu);
      live.source = source;
      live.published = true;
      live.version = data.version || 0;
      live.savedAt = data.savedAt || null;
      return true;
    } catch (e) { return false; /* keep the page's own data */ }
  }
  function useFiles() {
    if (window.MENU && Array.isArray(window.MENU.categories)) {
      try { applyMenu(window.MENU); } catch (e) { /* keep as is */ }
    }
  }

  function uploadIds(menu, site) {
    var ids = [];
    var add = function (ref) { if (ref && String(ref).indexOf('upload:') === 0) ids.push(String(ref).slice(7)); };
    var ws = site && site.wholesale;
    ((ws && ws.photos) || []).forEach(function (p) { if (p) add(p.img); });
    menu.categories.forEach(function (c) {
      (c.groups || [{ items: c.items || [] }]).forEach(function (g) {
        g.items.forEach(function (it) {
          add(it.img);
          (it.more || []).forEach(function (p) { if (p) add(p.img); });
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

  function fetchJson(url, ms) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms);
    return fetch(url, { mode: 'cors', credentials: 'omit', cache: 'no-cache', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        clearTimeout(timer);
        if (!r.ok) { var err = new Error('status ' + r.status); err.status = r.status; throw err; }
        return r.json();
      }, function (err) { clearTimeout(timer); throw err; });
  }

  /* ---- preview of unpublished changes (opened from the admin panel) ---- */
  function previewToken() {
    var m = /[?&]preview=([A-Za-z0-9_-]{5,80})/.exec(location.search);
    if (m) { try { sessionStorage.setItem(PREVIEW_KEY, m[1]); } catch (e) { /* ignore */ } return m[1]; }
    try { return sessionStorage.getItem(PREVIEW_KEY) || ''; } catch (e) { return ''; }
  }
  function previewBar(text) {
    var show = function () {
      if (document.querySelector('.preview-bar')) return;
      var bar = document.createElement('div');
      bar.className = 'preview-bar';
      bar.setAttribute('role', 'status');
      var span = document.createElement('span');
      span.innerHTML = '<strong>Preview</strong> · ';
      span.appendChild(document.createTextNode(text));
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Exit preview';
      btn.addEventListener('click', function () {
        forget(sessionStorage, PREVIEW_KEY);
        location.href = location.pathname + location.hash;
      });
      bar.appendChild(span);
      bar.appendChild(btn);
      document.body.appendChild(bar);
      document.documentElement.classList.add('is-preview');
    };
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
  }

  // The question to the panel goes out right away, but the answer is used only once every deferred script
  // (menu-data.js, main.js, order.js) has run, so it replaces the page's own copy instead of being overwritten by it.
  var domReady = new Promise(function (resolve) {
    if (document.readyState === 'complete') { resolve(); return; }
    document.addEventListener('DOMContentLoaded', function () { resolve(); });
    window.addEventListener('load', function () { resolve(); });
  });
  function whenReady(fn) { return domReady.then(fn); }

  function loadPreview(token) {
    if (token === 'local') {
      var p = read(localStorage, LOCAL_PREVIEW_KEY);
      if (!p || !looksValid(p.doc)) { previewBar('there’s nothing to preview. Make a new preview from the admin panel.'); return null; }
      live.source = 'test';
      var photos = loadTestPhotos(p.doc.menu, p.doc.site);
      return whenReady(function () { return photos; }).then(function () {
        apply({ version: 0, site: p.doc.site, menu: p.doc.menu }, 'test');
        previewBar('these changes are only in the admin panel’s test mode.');
      });
    }
    if (!live.base) return null;
    var net = fetchJson(live.base + '/api/preview/' + token, 6000);
    return whenReady(function () { return net; }).then(function (data) {
      if (apply(data, 'preview')) previewBar('these changes aren’t on the website yet.');
      else throw new Error('bad preview');
    }).catch(function () {
      previewBar('this preview has ended. Make a new one from the admin panel.');
      return loadLive();
    });
  }

  function loadLive() {
    if (!live.base) return whenReady(useFiles);
    var cached = read(localStorage, CACHE_KEY);
    var usable = !!(cached && cached.base === live.base && cached.data && looksValid(cached.data) && cached.data.version > fileVersion);
    var have = usable ? cached.data.version : fileVersion;
    var net = fetchJson(live.base + '/api/public?v=' + have, WAIT_MS);
    return whenReady(function () { return net; }).then(function (data) {
      if (!data || !data.version) {
        // Nothing published: the website's own files are the menu.
        forget(localStorage, CACHE_KEY);
        useFiles();
        return;
      }
      if (data.same) {
        if (usable) apply(cached.data, 'live'); else { live.source = 'files'; live.version = fileVersion; useFiles(); }
        return;
      }
      if (!looksValid(data)) throw new Error('unexpected data');
      write(localStorage, CACHE_KEY, { base: live.base, at: Date.now(), data: data });
      apply(data, 'live');
    }).catch(function () {
      // The panel is slow or down: use the newest copy we have.
      return whenReady(function () { if (!(usable && apply(cached.data, 'saved'))) useFiles(); });
    });
  }

  function load() {
    var token = previewToken();
    if (token) {
      var p = loadPreview(token);
      if (p) return p;
    }
    if (LOCAL) {
      var t = read(localStorage, TEST_KEY);
      if (t && t.doc && t.preview !== false && t.version > 0) {
        var data = { version: t.version, savedAt: t.savedAt, site: t.doc.site, menu: t.doc.menu };
        if (looksValid(data)) {
          live.source = 'test';
          var photos = loadTestPhotos(data.menu, data.site);
          return whenReady(function () { return photos; }).then(function () { apply(data, 'test'); });
        }
      }
    }
    return loadLive();
  }

  var started;
  try { started = Promise.resolve(load()); } catch (e) { started = Promise.reject(e); }
  live.ready = started.catch(function () { return whenReady(useFiles); }).then(function () { return domReady; }).then(function () {
    try { tidySite(); } catch (e) { /* keep the page's own data */ }
    return live;
  });
})();
