/* Boule de Pain — admin panel
   Edit the menu (prices, sizes, extras, photos, sold out / hidden), store hours and closed dates,
   the announcement bar, ordering rules, farmers markets and the wholesale page, then publish. Every publish is kept
   in a history you can restore.

   It runs in two places:
   - On the Cloudflare worker (data-mode="server"): real logins, changes go live on the website.
   - As admin.html in the website folder (data-mode="site"): on your own computer it is a test mode
     (log in with admin / 1234) that saves only in this browser. On a web server it links to the live panel. */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const IS_SERVER = root.getAttribute('data-mode') === 'server';
  const IS_LOCAL = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const TEST_USER = 'admin';
  const TEST_PASS = '1234';
  const WIX = 'https://static.wixstatic.com/media/';
  const LOGO = '37ffc0_f74025ac4b024bfe8b029d1934f61fe7~mv2.png';
  const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const WEEK = [1, 2, 3, 4, 5, 6, 0];
  const SIZE_TYPES = [['', 'Any size'], ['8in', '8" cakes'], ['10in', '10" cakes'], ['quarter', '1/4 sheet'], ['half', '1/2 sheet'], ['full', 'Full sheet']];
  const SPICE = ['', 'Mild', 'Medium', 'Hot'];
  // Wholesale page defaults (filled in from the site data when the panel is built)
  const WS_DEFAULT = {"intro":"We supply artisan bread and pastries to caf\u00e9s, restaurants, hotels and retailers. Everything is baked in-house with premium ingredients, and wholesale pricing is tailored to your volume and business needs.","accepting":true,"closedMessage":"We\u2019re not taking new wholesale accounts right now. Please check back soon, or call us to join the waiting list.","categories":[{"title":"Breads","text":"Baguettes, sourdough, whole wheat, rye, olive, olive & za\u2019atar, fig & walnut, cranberry & walnut and multigrain."},{"title":"Viennoiseries","text":"Plain, chocolate and almond croissants, danishes, turnovers, palmiers, kouign amann, cannel\u00e9s, scones and donuts."},{"title":"Cakes & pastries","text":"Whole cakes, gluten-free cakes, coffee cakes and individual mousse pastries."}],"products":[],"showPrices":false,"priceNote":"Prices are per unit before tax. Volume discounts available.","terms":[],"photos":[]};
  const WS_LIMIT = { categories: 12, products: 200, terms: 15, photos: 24 };

  /* ------------------------------------------------------------------ small helpers */
  const $ = (sel, el) => (el || doc).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || doc).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const moneyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const money = (n) => moneyFmt.format(Number(n) || 0);
  const round2 = (n) => Math.round(Number(n) * 100) / 100;
  let uidCounter = 0;
  const uid = (p) => `${p || 'x'}-${++uidCounter}`;
  const plural = (n, word, many) => `${n} ${n === 1 ? word : (many || `${word}s`)}`;
  const MARKS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
  const fold = (s) => String(s || '').normalize('NFD').replace(MARKS, '').toLowerCase();
  const slugify = (s) => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';

  function randomId(bytes) {
    const a = crypto.getRandomValues(new Uint8Array(bytes || 18));
    return btoa(String.fromCharCode.apply(null, a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function parsePrice(v) {
    const s = String(v == null ? '' : v).replace(/[$,\s]/g, '');
    if (s === '' || !/^\d+(\.\d{0,2})?$|^\.\d{1,2}$/.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) && n <= 100000 ? round2(n) : null;
  }
  function priceInput(n) { return n == null || n === '' ? '' : Number(n).toFixed(2); }
  function sizeKey(name) {
    const s = String(name || '').toLowerCase();
    if (s.includes('1/4') || s.includes('quarter')) return 'quarter';
    if (s.includes('1/2') || s.includes('half')) return 'half';
    if (s.includes('full')) return 'full';
    if (/(^|\D)10\s*("|”|''|in\b|inch)/.test(s)) return '10in';
    if (/(^|\D)8\s*("|”|''|in\b|inch)/.test(s)) return '8in';
    return null;
  }
  function fmtTime(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return m ? `${h12}:${String(m).padStart(2, '0')} ${ap}` : `${h12} ${ap}`;
  }
  function fmtStamp(ms) {
    if (!ms) return '';
    return new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function fmtDay(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
  function todayLA() {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return p; // YYYY-MM-DD
  }
  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    trash: '<path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l.8 12.5h9.4L17.5 7M9.5 7V4.5h5V7"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    photo: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4.5 3.5 3 3-2.5L20 17"/>',
    external: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    menu: '<path d="M5 6h14M5 12h14M5 18h14"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    megaphone: '<path d="M4 10v4h3l7 4V6L7 10z"/><path d="M17.5 9a4 4 0 0 1 0 6"/>',
    market: '<path d="M3 10l2.5-5.5h13L21 10M3 10h18M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 13v7.5h14V13"/>',
    history: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4M12 8v4l3 2"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    tag: '<path d="M3.5 12.5V4.5h8l9 9-8 8z"/><circle cx="8" cy="9" r="1.5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    logout: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
    truck: '<path d="M3 6.5h11v10H3zM14 10h4l3 3.5v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
    left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  };
  const icon = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
    trySet(key, value) { try { store.set(key, value); return true; } catch (e) { return false; } },
    del(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } },
  };

  /* ------------------------------------------------------------------ data helpers */
  function sectionsOf(cat) { return cat.groups ? cat.groups : [{ title: '', items: cat.items || (cat.items = []) }]; }
  function eachItem(d, fn) {
    d.menu.categories.forEach((cat, ci) => sectionsOf(cat).forEach((g, gi) => g.items.forEach((it, ii) => fn(it, cat, g, ci, gi, ii))));
  }
  function itemAt(d, p) { return sectionsOf(d.menu.categories[p.ci])[p.gi].items[p.ii]; }
  function listAt(d, ci, gi) { return sectionsOf(d.menu.categories[ci])[gi].items; }
  function countItems(d) {
    const c = { items: 0, hidden: 0, soldOut: 0 };
    eachItem(d, (it) => { c.items++; if (it.hidden) c.hidden++; if (it.soldOut) c.soldOut++; });
    return c;
  }
  function groupUsage(d, gid) {
    const names = [];
    eachItem(d, (it) => { if ((it.addons || []).includes(gid)) names.push(it.name); });
    return names;
  }
  function uniqueSlug(cat, name, except) {
    const used = new Set();
    sectionsOf(cat).forEach((g) => g.items.forEach((it) => { if (it !== except) used.add(it.slug); }));
    const base = slugify(name);
    let s = base, n = 2;
    while (used.has(s)) s = `${base}-${n++}`;
    return s;
  }
  function nextGroupId(d) {
    const ids = Object.keys(d.menu.addonGroups);
    let n = ids.length + 1;
    while (ids.includes(`g${n}`)) n++;
    return `g${n}`;
  }

  function seedFromSite() {
    const S = window.SITE || {};
    const M = window.MENU || { addonGroups: {}, categories: [] };
    const o = S.ordering || {};
    return clone({
      schema: 1,
      site: {
        announcement: S.announcement || '',
        hours: [0, 1, 2, 3, 4, 5, 6].map((d) => {
          const h = (S.hours || []).find((x) => x.day === d) || {};
          return { day: d, open: h.open || '', close: h.close || '' };
        }),
        closures: (S.closedDates || []).map((date) => ({ date, note: '' })),
        ordering: {
          cutoff: o.cutoff || '15:00', leadDays: o.leadDays == null ? 1 : o.leadDays, deliveryDays: o.deliveryDays || [1, 2, 3, 4, 5],
          maxDaysAhead: o.maxDaysAhead || 42, windowMinutes: o.windowMinutes || 180,
        },
        markets: (S.markets || []).map((m) => ({ day: m.day, locations: m.locations.slice() })),
        wholesale: S.wholesale && typeof S.wholesale === 'object' ? S.wholesale : WS_DEFAULT,
      },
      menu: { addonGroups: M.addonGroups || {}, categories: M.categories || [] },
    });
  }

  /* Tidy the draft the same way the server does, so what you see is what gets saved. */
  function normalize(d) {
    const trim = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    d.site.announcement = trim(d.site.announcement);
    d.site.closures = (d.site.closures || []).filter((c) => c.date).map((c) => ({ date: c.date, note: trim(c.note) }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    d.site.markets.forEach((m) => { m.locations = m.locations.map(trim).filter(Boolean); });
    d.site.wholesale = normalizeWholesale(d.site.wholesale, trim);
    Object.values(d.menu.addonGroups).forEach((g) => {
      g.name = trim(g.name);
      g.options.forEach((o) => { o.name = trim(o.name); o.price = round2(o.price); });
      if (g.required && g.min < 1) g.min = 1;
      g.forSize = g.forSize || null;
    });
    d.menu.categories.forEach((cat) => {
      cat.name = trim(cat.name);
      ['short', 'note'].forEach((k) => { if (cat[k] != null) { cat[k] = trim(cat[k]); if (!cat[k]) delete cat[k]; } });
      if (!cat.notice) delete cat.notice;
      sectionsOf(cat).forEach((g) => {
        if (cat.groups) g.title = trim(g.title);
        g.items.forEach((it) => {
          it.name = trim(it.name);
          if (it.desc != null) { it.desc = String(it.desc).replace(/[ \t]+/g, ' ').trim(); if (!it.desc) delete it.desc; }
          if (it.sizes && it.sizes.length) {
            it.sizes.forEach((s) => { s.name = trim(s.name); s.price = round2(s.price); s.key = sizeKey(s.name) || s.key || null; });
            it.price = Math.min.apply(null, it.sizes.map((s) => s.price));
          } else {
            delete it.sizes;
            it.price = round2(it.price);
          }
          if (it.labels && it.labels.length) it.spice = it.labels[0]; else { delete it.labels; delete it.spice; }
          ['popular', 'hidden', 'soldOut'].forEach((k) => { if (!it[k]) delete it[k]; });
          if (!it.notice) delete it.notice;
          if (!it.img) delete it.img;
          if (it.addons && !it.addons.length) delete it.addons;
        });
      });
    });
    return d;
  }

  function withWholesale(d) {
    if (d && d.site && (!d.site.wholesale || typeof d.site.wholesale !== 'object')) d.site.wholesale = clone(WS_DEFAULT);
    return d;
  }
  // Tidies the wholesale info in place (the open Wholesale view keeps a reference to it).
  function normalizeWholesale(w, trim) {
    if (!w || typeof w !== 'object') w = clone(WS_DEFAULT);
    const tidy = tidyWholesale(w, trim);
    Object.keys(w).forEach((k) => { delete w[k]; });
    return Object.assign(w, tidy);
  }
  function tidyWholesale(w, trim) {
    const lines = (v) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
    const arr = (v) => (Array.isArray(v) ? v : []);
    return {
      intro: lines(w.intro),
      accepting: w.accepting !== false,
      closedMessage: trim(w.closedMessage),
      categories: arr(w.categories).map((c) => ({ title: trim(c && c.title), text: trim(c && c.text) }))
        .filter((c) => c.title || c.text),
      products: arr(w.products).map((p) => {
        p = p || {};
        const price = p.price == null || p.price === '' ? null : (typeof p.price === 'number' ? round2(p.price) : parsePrice(p.price));
        return { name: trim(p.name), pack: trim(p.pack), price: price == null && p.price != null && p.price !== '' ? p.price : price, minQty: trim(p.minQty), note: trim(p.note) };
      }).filter((p) => p.name || p.pack || p.minQty || p.note || p.price != null),
      showPrices: w.showPrices === true,
      priceNote: trim(w.priceNote),
      terms: arr(w.terms).map(trim).filter(Boolean),
      photos: arr(w.photos).filter((ph) => ph && /^upload:/.test(ph.img || '')).map((ph) => ({ img: ph.img, alt: trim(ph.alt) })),
    };
  }

  /* Friendly checks before publishing. Each problem says where to look. */
  function problemsIn(d) {
    const out = [];
    const add = (message, go) => out.push({ message, go });
    d.menu.categories.forEach((cat, ci) => {
      if (!String(cat.name || '').trim()) add(`Category ${ci + 1} needs a name.`, { tab: 'menu', ci });
      const seen = new Set();
      sectionsOf(cat).forEach((g, gi) => {
        if (cat.groups && !String(g.title || '').trim()) add(`A section in “${cat.name}” needs a name.`, { tab: 'menu', ci });
        g.items.forEach((it, ii) => {
          const where = { tab: 'menu', ci, gi, ii };
          const name = String(it.name || '').trim();
          if (!name) add(`An item in “${cat.name}” needs a name.`, where);
          const label = name || 'an unnamed item';
          if (seen.has(it.slug)) add(`“${label}” appears twice in “${cat.name}”.`, where);
          seen.add(it.slug);
          if (it.sizes && it.sizes.length) {
            const names = new Set();
            it.sizes.forEach((s) => {
              if (!String(s.name || '').trim()) add(`A size of “${label}” needs a name.`, where);
              if (names.has(String(s.name).trim().toLowerCase())) add(`“${label}” lists the size “${s.name}” twice.`, where);
              names.add(String(s.name).trim().toLowerCase());
              if (!(Number(s.price) >= 0)) add(`A size of “${label}” needs a price.`, where);
            });
          } else if (!(Number(it.price) >= 0) || it.price === '' || it.price == null) {
            add(`“${label}” needs a price.`, where);
          }
          (it.addons || []).forEach((gid) => { if (!d.menu.addonGroups[gid]) add(`“${label}” uses extras that were deleted.`, where); });
        });
      });
    });
    Object.entries(d.menu.addonGroups).forEach(([gid, g]) => {
      const where = { tab: 'extras', gid };
      const name = String(g.name || '').trim() || 'An extras group';
      if (!String(g.name || '').trim()) add('An extras group needs a name.', where);
      if (!g.options.length) add(`“${name}” needs at least one option.`, where);
      g.options.forEach((o) => {
        if (!String(o.name || '').trim()) add(`An option in “${name}” needs a name.`, where);
        if (!(Number(o.price) >= 0)) add(`An option in “${name}” needs a price (use 0 for free).`, where);
      });
      if (g.min > g.max) add(`In “${name}”, the minimum is more than the maximum.`, where);
      if (g.min > g.options.length) add(`In “${name}”, customers must choose more options than there are.`, where);
    });
    d.site.hours.forEach((h) => {
      if ((h.open || h.close) && !(h.open && h.close)) add(`${DAY[h.day]} needs both an opening and a closing time.`, { tab: 'hours' });
      else if (h.open && h.close <= h.open) add(`On ${DAY[h.day]}, closing time must be after opening time.`, { tab: 'hours' });
    });
    d.site.markets.forEach((m) => {
      if (!m.locations.some((l) => String(l).trim())) add(`${DAY[m.day]} markets need at least one market name.`, { tab: 'markets' });
    });
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.site.ordering.cutoff || '')) add('The order cutoff needs a time.', { tab: 'ordering' });
    const ws = d.site.wholesale;
    if (ws) {
      const go = (sel) => ({ tab: 'wholesale', sel });
      const long = (v, max) => String(v || '').length > max;
      if (long(ws.intro, 600)) add('The wholesale introduction is over 600 characters.', go('#ws-intro'));
      if (long(ws.closedMessage, 300)) add('The “not taking new accounts” message is over 300 characters.', go('#ws-closed'));
      if (long(ws.priceNote, 200)) add('The price list note is over 200 characters.', go('#ws-note'));
      (ws.categories || []).forEach((c, i) => {
        if (!String(c.title || '').trim() && String(c.text || '').trim()) add(`Wholesale category ${i + 1} needs a name.`, go(`#ws-cat-${i}-t`));
      });
      (ws.products || []).forEach((p, i) => {
        const name = String(p.name || '').trim();
        const blank = !name && !String(p.pack || '').trim() && !String(p.minQty || '').trim() && !String(p.note || '').trim() && (p.price == null || p.price === '');
        if (blank) return;
        if (!name) add(`Wholesale product ${i + 1} needs a name.`, go(`#ws-pr-${i}-name`));
        if (p.price != null && p.price !== '' && parsePrice(p.price) == null) add(`The wholesale price of “${name || `product ${i + 1}`}” isn’t a valid price.`, go(`#ws-pr-${i}-price`));
      });
      (ws.photos || []).forEach((ph, i) => {
        if (!String(ph.alt || '').trim()) add(`Wholesale photo ${i + 1} needs a short description (for people using screen readers).`, go(`#ws-ph-${i}-alt`));
      });
    }
    return out;
  }

  /* Human summary of what changed between two versions (used before publishing). */
  function describeChanges(before, after) {
    const lines = [];
    const index = (d) => {
      const m = new Map();
      eachItem(d, (it, cat) => m.set(`${cat.id}.${it.slug}`, { it, cat }));
      return m;
    };
    const a = index(before), b = index(after);
    const priceText = (it) => (it.sizes && it.sizes.length ? it.sizes.map((s) => `${s.name} ${money(s.price)}`).join(', ') : money(it.price));
    b.forEach((v, k) => {
      if (!a.has(k)) { lines.push(`Added “${v.it.name}” to ${v.cat.name}`); return; }
      const o = a.get(k).it, n = v.it;
      if (priceText(o) !== priceText(n)) lines.push(`${n.name}: ${priceText(o)} → ${priceText(n)}`);
      if (o.name !== n.name) lines.push(`Renamed “${o.name}” to “${n.name}”`);
      if (!!o.soldOut !== !!n.soldOut) lines.push(`${n.name}: ${n.soldOut ? 'sold out' : 'available again'}`);
      if (!!o.hidden !== !!n.hidden) lines.push(`${n.name}: ${n.hidden ? 'hidden from the menu' : 'back on the menu'}`);
      if ((o.img || '') !== (n.img || '')) lines.push(`${n.name}: ${n.img ? 'new photo' : 'photo removed'}`);
      const rest = (x) => JSON.stringify([x.desc || '', x.addons || [], x.labels || [], !!x.popular, x.notice || 0]);
      if (rest(o) !== rest(n)) lines.push(`${n.name}: details updated`);
      if (a.get(k).cat.id !== v.cat.id) lines.push(`Moved “${n.name}” to ${v.cat.name}`);
    });
    a.forEach((v, k) => { if (!b.has(k)) lines.push(`Removed “${v.it.name}” from ${v.cat.name}`); });
    if (JSON.stringify(before.menu.categories.map((c) => [c.id, c.name, c.short, c.note, c.notice, (c.groups || []).map((g) => g.title)])) !==
        JSON.stringify(after.menu.categories.map((c) => [c.id, c.name, c.short, c.note, c.notice, (c.groups || []).map((g) => g.title)]))) {
      lines.push('Categories or sections changed');
    }
    if (!same(before.menu.addonGroups, after.menu.addonGroups)) lines.push('Extras changed');
    if (!same(before.site.hours, after.site.hours)) lines.push('Store hours changed');
    if (!same(before.site.closures, after.site.closures)) lines.push('Closed dates changed');
    if (before.site.announcement !== after.site.announcement) lines.push(after.site.announcement ? 'Announcement updated' : 'Announcement bar turned off');
    if (!same(before.site.ordering, after.site.ordering)) lines.push('Ordering rules changed');
    if (!same(before.site.markets, after.site.markets)) lines.push('Farmers markets changed');
    const wb = before.site.wholesale || {}, wa = after.site.wholesale || {};
    if (!same(wb, wa)) {
      if (!!wb.accepting !== !!wa.accepting && wb.accepting != null) lines.push(wa.accepting ? 'Wholesale: taking new accounts again' : 'Wholesale: not taking new accounts');
      const len = (x, k) => (x[k] || []).length;
      if (!same(wb.products, wa.products)) lines.push(`Wholesale price list changed (${plural(len(wa, 'products'), 'product')})`);
      if (!!wb.showPrices !== !!wa.showPrices) lines.push(wa.showPrices ? 'Wholesale prices shown on the website' : 'Wholesale prices hidden on the website');
      if (!same(wb.photos, wa.photos)) lines.push('Wholesale photos changed');
      if (wb.intro !== wa.intro || !same(wb.categories, wa.categories) || !same(wb.terms, wa.terms) ||
          wb.closedMessage !== wa.closedMessage || wb.priceNote !== wa.priceNote) lines.push('Wholesale page text changed');
    }
    return lines;
  }

  /* ------------------------------------------------------------------ backends */
  class ApiError extends Error {
    constructor(status, code, message, extra) {
      super(message);
      this.status = status;
      this.code = code;
      this.extra = extra || {};
    }
  }

  async function request(method, path, body, isForm) {
    const opts = { method, credentials: 'same-origin', cache: 'no-store', headers: { 'X-BDP-Admin': '1' } };
    if (body !== undefined) {
      if (isForm) opts.body = body;
      else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    }
    let res;
    try { res = await fetch(path, opts); } catch (e) {
      throw new ApiError(0, 'offline', 'Can’t reach the server. Check your internet connection and try again.');
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* not JSON */ }
    if (!res.ok) {
      const d = data || {};
      throw new ApiError(res.status, d.error || 'error', d.message || `The server answered with an error (${res.status}).`, d);
    }
    return data;
  }

  const serverBackend = {
    kind: 'server',
    session: () => request('GET', '/api/session'),
    login: (username, password) => request('POST', '/api/login', { username, password }),
    logout: () => request('POST', '/api/logout', {}),
    logoutAll: () => request('POST', '/api/logout-all', {}),
    load: () => request('GET', '/api/data'),
    save: (d, baseVersion, note, force) => request('PUT', '/api/data', { doc: d, baseVersion, note, force: !!force }),
    history: async () => (await request('GET', '/api/history')).versions,
    getVersion: (v) => request('GET', `/api/history/${encodeURIComponent(v)}`),
    restore: (v) => request('POST', '/api/restore', { version: v }),
    activity: () => request('GET', '/api/activity'),
    upload(full, thumb) {
      const fd = new FormData();
      fd.append('full', full, 'photo');
      fd.append('thumb', thumb, 'thumb');
      return request('POST', '/api/images', fd, true);
    },
    imageUrl: (ref, variant) => `/img/${encodeURIComponent(ref.slice(7))}${variant === 'thumb' ? '?v=thumb' : ''}`,
    preload: async () => {},
  };

  /* Test mode keeps everything in this browser: data in localStorage, photos in IndexedDB. */
  const TEST_KEY = 'bdp-admin-test-v1';
  const TEST_SESSION = 'bdp-admin-test-session';
  const TEST_LOCK = 'bdp-admin-test-lock';
  const idb = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((resolve, reject) => {
        let req;
        try { req = indexedDB.open('bdp-admin-test', 1); } catch (e) { reject(e); return; }
        req.onupgradeneeded = () => req.result.createObjectStore('images');
        req.onsuccess = () => { this.db = req.result; resolve(this.db); };
        req.onerror = () => reject(req.error);
      });
    },
    async run(mode, fn) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('images', mode);
        const r = fn(tx.objectStore('images'));
        tx.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    },
    put(id, value) { return this.run('readwrite', (s) => s.put(value, id)); },
    get(id) { return this.run('readonly', (s) => s.get(id)); },
    clear() { return this.run('readwrite', (s) => s.clear()); },
  };

  const localBackend = {
    kind: 'local',
    urls: new Map(),
    data() { return store.get(TEST_KEY, null); },
    async session() {
      let ok = false;
      try { ok = sessionStorage.getItem(TEST_SESSION) === '1'; } catch (e) { /* ignore */ }
      return { authenticated: ok, user: ok ? TEST_USER : null, siteUrl: 'index.html', setup: null };
    },
    async login(username, password) {
      const now = Date.now();
      const lock = store.get(TEST_LOCK, { fails: 0, until: 0 });
      if (lock.until > now) {
        throw new ApiError(429, 'locked', 'Too many wrong tries. Please wait and try again.', { retryAfter: Math.ceil((lock.until - now) / 1000) });
      }
      if (String(username).trim().toLowerCase() === TEST_USER && password === TEST_PASS) {
        store.del(TEST_LOCK);
        try { sessionStorage.setItem(TEST_SESSION, '1'); } catch (e) { /* ignore */ }
        return { ok: true };
      }
      lock.fails = (lock.fails || 0) + 1;
      if (lock.fails >= 5) { lock.until = now + 30e3; lock.fails = 0; }
      store.trySet(TEST_LOCK, lock);
      if (lock.until > now) throw new ApiError(429, 'locked', 'Too many wrong tries. Please wait and try again.', { retryAfter: 30 });
      throw new ApiError(401, 'invalid', 'That username or passcode isn’t right.', { remaining: 5 - lock.fails });
    },
    async logout() {
      try { sessionStorage.removeItem(TEST_SESSION); } catch (e) { /* ignore */ }
      return { ok: true };
    },
    logoutAll() { return this.logout(); },
    async load() {
      const d = this.data();
      const original = seedFromSite();
      if (!d || !d.doc) return { version: 0, savedAt: null, doc: original, original };
      return { version: d.version, savedAt: d.savedAt, doc: d.doc, original };
    },
    async save(docIn, base, note, force) {
      const d = this.data() || { version: 0, history: [] };
      if (d.version !== base && !force) {
        throw new ApiError(409, 'conflict', 'Changes were published in another tab after you opened this one.', { currentVersion: d.version });
      }
      const problems = problemsIn(docIn);
      if (problems.length) throw new ApiError(400, 'invalid', problems[0].message);
      const now = Date.now();
      const version = (d.version || 0) + 1;
      const saved = normalize(clone(docIn));
      const history = [{ version, savedAt: now, note: note || '', doc: saved }].concat(d.history || []).slice(0, 8);
      const next = { version, savedAt: now, doc: saved, history, preview: d.preview !== false };
      try { store.set(TEST_KEY, next); } catch (e) {
        try { next.history = next.history.slice(0, 2); store.set(TEST_KEY, next); } catch (e2) {
          throw new ApiError(507, 'full', 'This browser’s storage for test mode is full. Reset the test data (Login & security) and try again.');
        }
      }
      return { ok: true, version, savedAt: now, doc: saved };
    },
    async history() {
      const d = this.data();
      return d ? (d.history || []).map((h) => ({ version: h.version, savedAt: h.savedAt, note: h.note })) : [];
    },
    async getVersion(v) {
      const d = this.data();
      const h = d && (d.history || []).find((x) => x.version === Number(v));
      if (!h) throw new ApiError(404, 'not_found', 'That version isn’t in the history any more.');
      return clone(h);
    },
    async restore(v) {
      const h = await this.getVersion(v);
      const d = this.data();
      return this.save(h.doc, d ? d.version : 0, `Restored version ${v}`);
    },
    async activity() { return { events: [], sessions: [] }; },
    async upload(full, thumb) {
      const id = randomId(18);
      try { await idb.put(id, { full, thumb, at: Date.now() }); } catch (e) {
        throw new ApiError(0, 'storage', 'This browser won’t store photos for test mode (try Chrome). The live panel isn’t affected.');
      }
      this.urls.set(`${id}:full`, URL.createObjectURL(full));
      this.urls.set(`${id}:thumb`, URL.createObjectURL(thumb));
      return { ok: true, ref: `upload:${id}` };
    },
    imageUrl(ref, variant) { return this.urls.get(`${ref.slice(7)}:${variant === 'thumb' ? 'thumb' : 'full'}`) || ''; },
    async preload(docs) {
      const ids = new Set();
      docs.filter(Boolean).forEach((d) => {
        eachItem(d, (it) => { if (it.img && it.img.startsWith('upload:')) ids.add(it.img.slice(7)); });
        ((d.site && d.site.wholesale && d.site.wholesale.photos) || []).forEach((ph) => {
          if (ph && String(ph.img || '').startsWith('upload:')) ids.add(ph.img.slice(7));
        });
      });
      for (const id of ids) {
        if (this.urls.has(`${id}:full`)) continue;
        try {
          const rec = await idb.get(id);
          if (rec) {
            this.urls.set(`${id}:full`, URL.createObjectURL(rec.full));
            this.urls.set(`${id}:thumb`, URL.createObjectURL(rec.thumb));
          }
        } catch (e) { /* photos unavailable */ }
      }
    },
    async reset() {
      store.del(TEST_KEY);
      try { await idb.clear(); } catch (e) { /* ignore */ }
    },
    previewOn() { const d = this.data(); return !d || d.preview !== false; },
    setPreview(on) {
      const d = this.data();
      if (d) { d.preview = !!on; store.trySet(TEST_KEY, d); }
    },
  };

  /* ------------------------------------------------------------------ photos */
  async function decodeImage(file) {
    if ('createImageBitmap' in window) {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* try the plain way */ }
      try { return await createImageBitmap(file); } catch (e) { /* fall back to <img> */ }
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }
  function drawScaled(src, maxSide, flat) {
    const w0 = src.naturalWidth || src.width, h0 = src.naturalHeight || src.height;
    const scale = Math.min(1, maxSide / Math.max(w0, h0));
    const c = doc.createElement('canvas');
    c.width = Math.max(1, Math.round(w0 * scale));
    c.height = Math.max(1, Math.round(h0 * scale));
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    if (flat) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  const toBlob = (canvas, type, q) => new Promise((resolve) => canvas.toBlob(resolve, type, q));
  async function encodePhoto(src, maxSide, maxBytes) {
    for (const side of [maxSide, Math.round(maxSide * 0.75), Math.round(maxSide * 0.55)]) {
      const canvas = drawScaled(src, side, false);
      for (const q of [0.84, 0.74, 0.62]) {
        let b = await toBlob(canvas, 'image/webp', q);
        if (!b || b.type !== 'image/webp') b = await toBlob(drawScaled(src, side, true), 'image/jpeg', q);
        if (b && b.size <= maxBytes) return b;
      }
    }
    return null;
  }
  async function preparePhoto(file) {
    if (!file) throw new Error('Choose a photo first.');
    if (file.size > 40 * 1024 * 1024) throw new Error('That photo is over 40 MB. Please choose a smaller one.');
    let src;
    try { src = await decodeImage(file); } catch (e) {
      throw new Error('This photo couldn’t be opened. Use a JPG, PNG or WebP photo.');
    }
    const full = await encodePhoto(src, 1400, 1500000);
    const thumb = await encodePhoto(src, 480, 350000);
    if (src.close) src.close();
    if (!full || !thumb) throw new Error('This photo couldn’t be made small enough. Try another one.');
    return { full, thumb };
  }
  function photoUrl(ref, variant) {
    if (!ref) return '';
    if (ref.startsWith('upload:')) return state.backend.imageUrl(ref, variant);
    const w = variant === 'thumb' ? 160 : 720, h = variant === 'thumb' ? 160 : 450;
    return `${WIX}${ref}/v1/fill/w_${w},h_${h},al_c,q_80,enc_auto/${ref.replace(/~/g, '_')}`;
  }

  /* ------------------------------------------------------------------ state */
  const state = {
    backend: null,
    user: '',
    siteUrl: '',
    published: null, // { version, savedAt, doc }
    original: null,
    draft: null,
    tab: 'menu',
    search: '',
    filter: 'all',
    collapsed: {},
    lastActivity: Date.now(),
  };
  const DRAFT_KEY = `bdp-admin-draft-v1:${IS_SERVER ? location.host : 'test'}`;
  const TABS = [
    ['menu', 'Menu', 'menu'],
    ['extras', 'Extras', 'tag'],
    ['hours', 'Hours & closed days', 'clock'],
    ['ordering', 'Announcement & ordering', 'megaphone'],
    ['markets', 'Farmers markets', 'market'],
    ['wholesale', 'Wholesale', 'truck'],
    ['history', 'History & backup', 'history'],
    ['security', 'Login & security', 'lock'],
  ];

  function canon(v) {
    if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
    if (v && typeof v === 'object') {
      return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
    }
    return JSON.stringify(v);
  }
  const normalized = (d) => normalize(clone(d));
  function isDirty() { return !!state.draft && canon(normalized(state.draft)) !== canon(normalized(state.published.doc)); }

  /* ------------------------------------------------------------------ toasts and dialogs */
  function toast(message, kind) {
    const region = $('.toasts');
    if (!region) return;
    const t = doc.createElement('div');
    t.className = `toast${kind ? ` toast--${kind}` : ''}`;
    t.textContent = message;
    region.appendChild(t);
    setTimeout(() => { t.classList.add('is-leaving'); setTimeout(() => t.remove(), 300); }, kind === 'error' ? 7000 : 4200);
  }

  const dialogs = [];
  function setBackgroundInert() {
    const app = $('#app');
    const top = dialogs[dialogs.length - 1];
    [app].concat(dialogs.map((d) => d.box)).forEach((el) => {
      const off = !!top && el !== top.box;
      if ('inert' in el) el.inert = off;
      if (off) el.setAttribute('aria-hidden', 'true'); else el.removeAttribute('aria-hidden');
    });
    doc.body.classList.toggle('has-dialog', dialogs.length > 0);
  }
  function openDialog(opts) {
    const id = uid('dlg');
    const box = doc.createElement('div');
    box.className = 'dlg-backdrop';
    box.innerHTML =
      `<div class="dlg${opts.size ? ` dlg--${opts.size}` : ''}" role="${opts.alert ? 'alertdialog' : 'dialog'}" aria-modal="true" aria-labelledby="${id}-title">` +
        `<form class="dlg__form" novalidate>` +
          `<header class="dlg__head"><h2 id="${id}-title" tabindex="-1">${esc(opts.title)}</h2>` +
          `<button type="button" class="icon-btn" data-dlg-close aria-label="Close">${icon('close')}</button></header>` +
          `<div class="dlg__body">${opts.body || ''}</div>` +
          `<footer class="dlg__foot">${opts.foot || ''}</footer>` +
        `</form></div>`;
    doc.body.appendChild(box);
    const opener = doc.activeElement;
    let settled = false;
    const dlg = {
      box, id,
      form: $('form', box),
      body: $('.dlg__body', box),
      close(result) {
        if (settled) return;
        settled = true;
        const i = dialogs.indexOf(dlg);
        if (i > -1) dialogs.splice(i, 1);
        box.remove();
        setBackgroundInert();
        if (opts.onClose) opts.onClose(result);
        const back = opts.returnFocus || opener;
        if (back && back.isConnected && back.focus) back.focus();
      },
      async tryClose() {
        if (opts.confirmClose && opts.confirmClose()) {
          const ok = await ask({ title: 'Close without saving?', text: 'Your changes in this window will be lost.', ok: 'Close without saving', danger: true });
          if (!ok) return;
        }
        dlg.close(null);
      },
    };
    dialogs.push(dlg);
    setBackgroundInert();
    box.addEventListener('click', (e) => {
      if (e.target.closest('[data-dlg-close]')) { e.preventDefault(); dlg.tryClose(); }
      else if (e.target === box && opts.closeOnBackdrop) dlg.tryClose();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); dlg.tryClose(); return; }
      if (e.key !== 'Tab') return;
      const f = $$('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]', box)
        .filter((el) => el.offsetParent !== null || el === doc.activeElement);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (doc.activeElement === first || !box.contains(doc.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    dlg.form.addEventListener('submit', (e) => { e.preventDefault(); if (opts.onSubmit) opts.onSubmit(dlg, e); });
    requestAnimationFrame(() => {
      const target = (opts.focus && $(opts.focus, box)) || $(`#${id}-title`, box);
      if (target) target.focus();
    });
    return dlg;
  }
  function ask(o) {
    return new Promise((resolve) => {
      openDialog({
        title: o.title, alert: true, size: 'sm', closeOnBackdrop: true,
        body: `<p>${esc(o.text || '')}</p>${o.html || ''}`,
        foot: `<button type="button" class="btn btn--quiet" data-dlg-close>${esc(o.cancel || 'Cancel')}</button>` +
          `<button type="submit" class="btn ${o.danger ? 'btn--danger' : 'btn--primary'}" data-ok>${esc(o.ok || 'OK')}</button>`,
        focus: '[data-ok]',
        onSubmit: (d) => d.close(true),
        onClose: (r) => resolve(r === true),
      });
    });
  }
  function fieldError(input, message) {
    const field = input.closest('.field') || input.parentElement;
    let err = field.querySelector(':scope > .field__error');
    if (!message) {
      if (err) err.remove();
      input.removeAttribute('aria-invalid');
      const ids = (input.getAttribute('aria-describedby') || '').split(' ').filter((x) => x && !x.endsWith('-err'));
      if (ids.length) input.setAttribute('aria-describedby', ids.join(' ')); else input.removeAttribute('aria-describedby');
      return;
    }
    if (!input.id) input.id = uid('in');
    if (!err) {
      err = doc.createElement('p');
      err.className = 'field__error';
      err.id = `${input.id}-err`;
      field.appendChild(err);
    }
    err.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    const ids = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
    if (!ids.includes(err.id)) ids.push(err.id);
    input.setAttribute('aria-describedby', ids.join(' '));
  }

  /* ------------------------------------------------------------------ draft bookkeeping */
  let saveTimer = null;
  function changed(opts) {
    state.lastActivity = Date.now();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (isDirty()) store.trySet(DRAFT_KEY, { base: state.published.version, savedAt: Date.now(), doc: state.draft });
      else store.del(DRAFT_KEY);
    }, 350);
    if (opts && opts.rerender) renderTab(opts.focus);
    refreshStatus();
  }
  let statusFrame = 0;
  function refreshStatus() {
    cancelAnimationFrame(statusFrame);
    statusFrame = requestAnimationFrame(() => {
      const el = $('[data-status]');
      if (!el || !state.published) return;
      const dirty = isDirty();
      const pub = $('[data-act="publish"]'), disc = $('[data-act="discard"]');
      if (pub) { pub.disabled = !dirty; pub.classList.toggle('is-ready', dirty); }
      if (disc) disc.hidden = !dirty;
      root.classList.toggle('is-dirty', dirty);
      if (dirty) {
        const n = describeChanges(normalized(state.published.doc), normalized(state.draft)).length || 1;
        el.innerHTML = `<span class="dot dot--warn" aria-hidden="true"></span>${plural(n, 'change')} not published yet`;
      } else if (state.published.version) {
        el.innerHTML = `<span class="dot dot--ok" aria-hidden="true"></span>Published · ${esc(fmtStamp(state.published.savedAt))}`;
      } else {
        el.innerHTML = '<span class="dot" aria-hidden="true"></span>No changes published yet';
      }
    });
  }
  window.addEventListener('beforeunload', (e) => {
    if (state.draft && isDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ------------------------------------------------------------------ screens */
  const app = () => $('#app');
  const logoImg = (size) => `<img class="logo" src="${WIX}${LOGO}/v1/fill/w_${size * 2},h_${size * 2},al_c,q_85,enc_auto/${LOGO.replace(/~/g, '_')}" width="${size}" height="${size}" alt="">`;

  function adminUrlFromSite() {
    const raw = String(((window.SITE || {}).admin || {}).url || '').trim();
    if (!raw) return '';
    try {
      const u = new URL(raw);
      if (u.protocol !== 'https:' && !/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) return '';
      return new URL('/admin', u.origin).href;
    } catch (e) { return ''; }
  }

  function renderLinkPage(liveUrl) {
    doc.title = 'Admin · Boule de Pain';
    app().innerHTML =
      `<main class="login" id="admin-main" tabindex="-1"><div class="card login__card">${logoImg(64)}` +
      '<h1>Boule de Pain admin</h1>' +
      (liveUrl
        ? '<p>The admin panel runs on its own secure address.</p>' +
          `<p><a class="btn btn--primary btn--block" href="${esc(liveUrl)}" rel="noopener">Open the admin panel</a></p>`
        : '<p>The admin panel isn’t connected to this website yet.</p>' +
          '<p class="muted">To connect it, follow the setup guide in the <strong>boule-de-pain-admin</strong> folder, then put the panel’s address in <code>assets/js/site-config.js</code> under <code>"admin"</code>.</p>') +
      '<p class="muted small"><a href="index.html">Back to the website</a></p></div></main>';
  }

  function renderChooser(liveUrl) {
    app().innerHTML =
      `<main class="login" id="admin-main" tabindex="-1"><div class="card login__card">${logoImg(64)}` +
      '<h1>Boule de Pain admin</h1>' +
      '<p>This copy of the website is connected to your live admin panel.</p>' +
      `<p><a class="btn btn--primary btn--block" href="${esc(liveUrl)}" rel="noopener">Open the live admin panel</a></p>` +
      '<p><button type="button" class="btn btn--quiet btn--block" data-act="test-mode">Try test mode on this computer</button></p>' +
      '<p class="muted small">Test mode saves only in this browser and never changes the live website.</p></div></main>';
    $('[data-act="test-mode"]').addEventListener('click', () => startTestMode());
  }

  function renderLogin(info) {
    info = info || {};
    const test = state.backend.kind === 'local';
    doc.title = 'Log in · Boule de Pain admin';
    const setupMsg = info.setup === 'weak'
      ? 'The passcode set in Cloudflare is too weak, so logins are turned off. Set a passcode with at least 12 characters (mix words, numbers and symbols), then reload this page.'
      : info.setup === 'missing'
        ? 'No passcode has been set yet, so logins are turned off. Double-click “Set admin passcode” in the boule-de-pain-admin folder, then reload this page.'
        : '';
    app().innerHTML =
      '<main class="login" id="admin-main" tabindex="-1">' +
      `<form class="card login__card" novalidate autocomplete="on">${logoImg(64)}` +
      '<h1 tabindex="-1">Boule de Pain admin</h1>' +
      (test ? `<div class="note note--test"><strong>Test mode.</strong> Log in with username <code>${TEST_USER}</code> and passcode <code>${TEST_PASS}</code>. Changes are saved only in this browser and show on this copy of the website.</div>` : '') +
      (setupMsg ? `<div class="note note--warn" role="alert">${esc(setupMsg)}</div>` : '') +
      '<div class="field"><label for="lg-user">Username</label>' +
        '<input class="input" id="lg-user" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required maxlength="100"></div>' +
      '<div class="field"><label for="lg-pass">Passcode</label><div class="pass">' +
        '<input class="input" id="lg-pass" name="password" type="password" autocomplete="current-password" required maxlength="200">' +
        '<button type="button" class="btn btn--quiet btn--sm" data-act="toggle-pass" aria-pressed="false" aria-controls="lg-pass">Show</button></div></div>' +
      '<p class="form-error" data-login-error role="alert" hidden></p>' +
      `<button class="btn btn--primary btn--block" type="submit"${setupMsg ? ' disabled' : ''}>Log in</button>` +
      (test ? '' : '<p class="muted small">Too many wrong tries lock the login for a while. Forgot the passcode? Double-click “Set admin passcode” to set a new one.</p>') +
      (info.message ? `<p class="note">${esc(info.message)}</p>` : '') +
      '</form></main>';
    const form = $('form', app());
    const user = $('#lg-user'), pass = $('#lg-pass'), err = $('[data-login-error]');
    $('[data-act="toggle-pass"]').addEventListener('click', (e) => {
      const show = pass.type === 'password';
      pass.type = show ? 'text' : 'password';
      e.currentTarget.textContent = show ? 'Hide' : 'Show';
      e.currentTarget.setAttribute('aria-pressed', String(show));
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.hidden = true;
      fieldError(user, user.value.trim() ? '' : 'Enter your username.');
      fieldError(pass, pass.value ? '' : 'Enter your passcode.');
      if (!user.value.trim()) { user.focus(); return; }
      if (!pass.value) { pass.focus(); return; }
      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      btn.textContent = 'Logging in…';
      try {
        await state.backend.login(user.value, pass.value);
        pass.value = '';
        await startApp();
      } catch (ex) {
        let msg = ex.message;
        if (ex.code === 'locked' && ex.extra.retryAfter) {
          const mins = Math.ceil(ex.extra.retryAfter / 60);
          msg = ex.extra.retryAfter < 60 ? `Too many wrong tries. Try again in ${ex.extra.retryAfter} seconds.` : `Too many wrong tries. Try again in ${plural(mins, 'minute')}.`;
        } else if (ex.code === 'invalid' && ex.extra.remaining != null && ex.extra.remaining <= 2) {
          msg += ` ${plural(ex.extra.remaining, 'try', 'tries')} left before the login locks for a while.`;
        }
        err.textContent = msg;
        err.hidden = false;
        btn.disabled = false;
        btn.textContent = 'Log in';
        pass.select();
        pass.focus();
      }
    });
    (info.setup ? $('h1', form) : user).focus();
  }

  async function startApp() {
    const loaded = await state.backend.load();
    withWholesale(loaded.doc);
    state.published = { version: loaded.version, savedAt: loaded.savedAt, doc: loaded.doc };
    state.original = loaded.original || loaded.doc;
    state.draft = clone(loaded.doc);
    await state.backend.preload([loaded.doc]);
    let restoredNote = '';
    const saved = store.get(DRAFT_KEY, null);
    if (saved && saved.doc) {
      if (canon(normalized(saved.doc)) !== canon(normalized(loaded.doc))) {
        state.draft = withWholesale(saved.doc);
        await state.backend.preload([saved.doc]);
        restoredNote = saved.base === loaded.version
          ? 'We brought back changes you hadn’t published yet.'
          : 'We brought back changes you hadn’t published. The website was updated since then, so check them before publishing.';
      } else {
        store.del(DRAFT_KEY);
      }
    }
    renderShell();
    if (restoredNote) {
      const n = $('[data-restored]');
      n.hidden = false;
      $('[data-restored-text]', n).textContent = restoredNote;
    }
    keepAlive();
  }

  function renderShell() {
    const test = state.backend.kind === 'local';
    doc.title = 'Boule de Pain admin';
    const site = state.siteUrl || (test ? 'index.html' : '');
    app().innerHTML =
      '<div class="shell">' +
      '<header class="topbar">' +
        `<div class="topbar__brand">${logoImg(36)}<span><strong>Boule de Pain</strong><small>${test ? 'Admin · test mode' : 'Admin'}</small></span></div>` +
        '<p class="topbar__status" data-status role="status" aria-live="polite"></p>' +
        '<div class="topbar__actions">' +
          '<button type="button" class="btn btn--quiet" data-act="discard" hidden>Discard changes</button>' +
          '<button type="button" class="btn btn--primary" data-act="publish" disabled>Publish changes</button>' +
          (site ? `<a class="btn btn--quiet" href="${esc(site)}" target="_blank" rel="noopener">View website${icon('external')}<span class="sr-only"> (opens in a new tab)</span></a>` : '') +
          `<button type="button" class="btn btn--quiet" data-act="logout">${icon('logout')}Log out</button>` +
        '</div>' +
      '</header>' +
      (test ? '<div class="banner banner--test"><strong>Test mode:</strong> changes are saved in this browser only and show on this copy of the website (open <a href="order.html" target="_blank" rel="noopener">the order page</a> after publishing). The live website isn’t affected.</div>' : '') +
      '<div class="banner banner--info" data-restored hidden><span data-restored-text></span> <button type="button" class="btn btn--quiet btn--sm" data-act="drop-restored">Discard them</button></div>' +
      '<div class="layout">' +
        '<nav class="sidenav" aria-label="Admin sections"><ul>' +
          TABS.map(([key, label, ic]) => `<li><button type="button" data-tab="${key}">${icon(ic)}<span>${esc(label)}</span></button></li>`).join('') +
        '</ul></nav>' +
        '<main class="main" id="admin-main" tabindex="-1"></main>' +
      '</div></div>';
    const shell = $('.shell');
    shell.addEventListener('click', onShellClick);
    renderTab();
    refreshStatus();
  }

  async function onShellClick(e) {
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) {
      state.tab = tabBtn.getAttribute('data-tab');
      renderTab();
      $('#admin-main').focus();
      return;
    }
    const act = e.target.closest('[data-act]');
    if (!act || !$('.topbar, .banner', app()) || !(act.closest('.topbar') || act.closest('.banner'))) return;
    const name = act.getAttribute('data-act');
    if (name === 'publish') publish();
    else if (name === 'discard') {
      const ok = await ask({ title: 'Discard your changes?', text: 'Everything you changed since the last publish will be undone.', ok: 'Discard changes', danger: true });
      if (!ok) return;
      state.draft = clone(state.published.doc);
      store.del(DRAFT_KEY);
      $('[data-restored]').hidden = true;
      changed({ rerender: true });
      toast('Changes discarded.');
    } else if (name === 'drop-restored') {
      state.draft = clone(state.published.doc);
      store.del(DRAFT_KEY);
      $('[data-restored]').hidden = true;
      changed({ rerender: true });
      toast('Changes discarded.');
    } else if (name === 'logout') {
      if (isDirty()) {
        const ok = await ask({ title: 'Log out?', text: 'Your unpublished changes stay saved in this browser, and come back when you log in here again.', ok: 'Log out' });
        if (!ok) return;
      }
      try { await state.backend.logout(); } catch (ex) { /* ignore */ }
      state.draft = null;
      renderLogin({ message: 'You’re logged out.' });
    }
  }

  function renderTab(focusSel) {
    const main = $('#admin-main');
    if (!main) return;
    $$('[data-tab]').forEach((b) => {
      if (b.getAttribute('data-tab') === state.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    const views = { menu: viewMenu, extras: viewExtras, hours: viewHours, ordering: viewOrdering, markets: viewMarkets, wholesale: viewWholesale, history: viewHistory, security: viewSecurity };
    const scrollY = window.scrollY;
    main.innerHTML = '';
    (views[state.tab] || viewMenu)(main);
    if (focusSel) {
      window.scrollTo(0, scrollY);
      const el = typeof focusSel === 'string' ? $(focusSel, main) : null;
      if (el) el.focus({ preventScroll: false });
    }
  }

  function goTo(go) {
    if (!go) return;
    state.tab = go.tab;
    if (go.tab === 'menu') {
      state.search = '';
      state.filter = 'all';
      const cat = state.draft.menu.categories[go.ci];
      if (cat) state.collapsed[cat.id] = false;
    }
    renderTab();
    requestAnimationFrame(() => {
      let el = null;
      if (go.tab === 'menu' && go.ii != null) el = $(`[data-path="${go.ci}.${go.gi}.${go.ii}"] [data-act="edit-item"]`);
      else if (go.tab === 'menu' && go.ci != null) el = $(`[data-cat="${go.ci}"] h2`);
      else if (go.tab === 'extras' && go.gid) el = $(`[data-gid="${go.gid}"] input`);
      else if (go.sel) el = $(`#admin-main ${go.sel}`);
      el = el || $('#admin-main h1');
      if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); }
    });
  }

  /* ------------------------------------------------------------------ publishing */
  async function publish(force) {
    normalize(state.draft);
    if (state.tab === 'wholesale') renderTab();
    const problems = problemsIn(state.draft);
    if (problems.length) {
      const dlg = openDialog({
        title: 'Fix these before publishing', size: 'md', alert: true,
        body: `<p>${plural(problems.length, 'thing needs', 'things need')} a quick fix:</p><ul class="problems">` +
          problems.slice(0, 12).map((p, i) => `<li><span>${esc(p.message)}</span> <button type="button" class="btn btn--quiet btn--sm" data-problem="${i}">Show</button></li>`).join('') +
          '</ul>',
        foot: '<button type="button" class="btn btn--primary" data-dlg-close>OK</button>',
      });
      dlg.body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-problem]');
        if (!b) return;
        dlg.close();
        goTo(problems[Number(b.getAttribute('data-problem'))].go);
      });
      return;
    }
    const lines = describeChanges(normalized(state.published.doc), state.draft);
    const dlg = openDialog({
      title: force ? 'Publish your version?' : 'Publish these changes?', size: 'md',
      body: (lines.length
        ? `<ul class="change-list">${lines.slice(0, 14).map((l) => `<li>${esc(l)}</li>`).join('')}${lines.length > 14 ? `<li>…and ${lines.length - 14} more</li>` : ''}</ul>`
        : '<p>Save the current version.</p>') +
        '<div class="field"><label for="pub-note">Note for the history <span class="muted">(optional)</span></label>' +
        '<input class="input" id="pub-note" maxlength="140" placeholder="For example: new fall prices"></div>' +
        `<p class="muted small">${state.backend.kind === 'local' ? 'Your copy of the website shows the changes when you reload it.' : 'The website shows the changes within about a minute.'}</p>`,
      foot: '<button type="button" class="btn btn--quiet" data-dlg-close>Cancel</button><button type="submit" class="btn btn--primary" data-ok>Publish</button>',
      focus: '#pub-note',
      onSubmit: async (d) => {
        const btn = $('[data-ok]', d.box);
        btn.disabled = true;
        btn.textContent = 'Publishing…';
        try {
          const res = await state.backend.save(state.draft, state.published.version, $('#pub-note', d.box).value.trim(), force);
          state.published = { version: res.version, savedAt: res.savedAt, doc: res.doc };
          state.draft = clone(res.doc);
          store.del(DRAFT_KEY);
          const r = $('[data-restored]');
          if (r) r.hidden = true;
          d.close(true);
          changed({ rerender: true });
          toast(state.backend.kind === 'local' ? 'Published to your test copy.' : 'Published! The website updates within a minute.', 'ok');
        } catch (ex) {
          d.close(false);
          handleSaveError(ex);
        }
      },
    });
    return dlg;
  }

  async function handleSaveError(ex) {
    if (ex.code === 'signed_out') {
      toast('Your login ended. Log in again; your changes are kept.', 'error');
      store.trySet(DRAFT_KEY, { base: state.published.version, savedAt: Date.now(), doc: state.draft });
      renderLogin({ message: 'Your login ended. Log in again to publish. Your changes are kept in this browser.' });
      return;
    }
    if (ex.code === 'conflict') {
      const choice = await new Promise((resolve) => {
        const d = openDialog({
          title: 'The website changed while you were editing', size: 'md', alert: true,
          body: '<p>Someone published other changes after you opened the panel.</p>' +
            '<p><strong>Publish mine</strong> replaces their changes with your version. <strong>Load theirs</strong> discards your unpublished changes.</p>',
          foot: '<button type="button" class="btn btn--quiet" data-dlg-close>Cancel</button>' +
            '<button type="button" class="btn btn--quiet" data-choice="theirs">Load theirs</button>' +
            '<button type="button" class="btn btn--primary" data-choice="mine">Publish mine</button>',
          onClose: (r) => resolve(r),
        });
        d.box.addEventListener('click', (e) => {
          const b = e.target.closest('[data-choice]');
          if (b) d.close(b.getAttribute('data-choice'));
        });
      });
      if (choice === 'mine') publish(true);
      else if (choice === 'theirs') {
        const loaded = await state.backend.load();
        withWholesale(loaded.doc);
        state.published = { version: loaded.version, savedAt: loaded.savedAt, doc: loaded.doc };
        state.draft = clone(loaded.doc);
        await state.backend.preload([loaded.doc]);
        store.del(DRAFT_KEY);
        changed({ rerender: true });
        toast('Loaded the latest published version.');
      }
      return;
    }
    toast(`Not published: ${ex.message}`, 'error');
  }

  /* Keep the login alive while someone is actively editing (the server ends idle logins after an hour). */
  let aliveTimer = null;
  function keepAlive() {
    clearInterval(aliveTimer);
    if (state.backend.kind !== 'server') return;
    aliveTimer = setInterval(async () => {
      if (Date.now() - state.lastActivity > 10 * 60e3) return;
      try {
        const s = await state.backend.session();
        if (!s.authenticated && state.draft) {
          store.trySet(DRAFT_KEY, { base: state.published.version, savedAt: Date.now(), doc: state.draft });
          clearInterval(aliveTimer);
          renderLogin({ message: 'Your login ended. Log in again to keep going. Your changes are kept in this browser.' });
        }
      } catch (e) { /* offline: try again later */ }
    }, 4 * 60e3);
  }
  ['input', 'change', 'click', 'keydown'].forEach((t) => doc.addEventListener(t, () => { state.lastActivity = Date.now(); }, { passive: true, capture: true }));

  /* ------------------------------------------------------------------ menu */
  function toastUndo(message, snapshot) {
    const region = $('.toasts');
    if (!region) return;
    const t = doc.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span>${esc(message)}</span><button type="button" class="btn btn--sm btn--light">Undo</button>`;
    $('button', t).addEventListener('click', () => {
      state.draft = snapshot;
      changed({ rerender: true });
      t.remove();
      toast('Undone.');
    });
    region.appendChild(t);
    setTimeout(() => { t.classList.add('is-leaving'); setTimeout(() => t.remove(), 300); }, 8000);
  }

  function rowHTML(it, ci, gi, ii, len) {
    const id = `r-${ci}-${gi}-${ii}`;
    const name = it.name || 'Untitled item';
    const thumb = it.img ? photoUrl(it.img, 'thumb') : '';
    const badges = [];
    if (it.soldOut) badges.push(['warn', 'Sold out']);
    if (it.hidden) badges.push(['muted', 'Hidden']);
    if (it.popular) badges.push(['pink', 'Bestseller']);
    if (it.sizes && it.sizes.length) badges.push(['', plural(it.sizes.length, 'size')]);
    if ((it.addons || []).length) badges.push(['', 'Extras']);
    if (it.notice) badges.push(['', `${it.notice} days’ notice`]);
    if (it.labels && it.labels.length) badges.push(['', `${it.labels[0]} spice`]);
    const search = fold([it.name, it.desc, (it.sizes || []).map((s) => s.name).join(' ')].join(' '));
    const flags = [it.soldOut ? 'soldout' : '', it.hidden ? 'hidden' : '', it.img ? '' : 'nophoto'].join(' ');
    const sr = `<span class="sr-only">: ${esc(name)}</span>`;
    return `<li class="row${it.hidden ? ' is-hidden' : ''}${it.soldOut ? ' is-soldout' : ''}" data-path="${ci}.${gi}.${ii}" data-search="${esc(search)}" data-flags="${flags}">` +
      `<span class="row__img">${thumb ? `<img src="${esc(thumb)}" alt="" width="56" height="56" loading="lazy">` : icon('photo')}</span>` +
      '<div class="row__main">' +
        `<button type="button" class="row__name" data-act="edit-item" id="${id}-name">${esc(name)}<span class="sr-only"> (edit)</span></button>` +
        (badges.length ? `<ul class="badges">${badges.map(([k, t]) => `<li class="badge${k ? ` badge--${k}` : ''}">${esc(t)}</li>`).join('')}</ul>` : '') +
      '</div>' +
      '<div class="row__price">' +
        (it.sizes && it.sizes.length
          ? `<button type="button" class="link-btn" data-act="edit-item">From ${money(it.price)}<span class="sr-only">, edit sizes of ${esc(name)}</span></button>`
          : `<label class="sr-only" for="${id}-price">Price of ${esc(name)}</label><span class="money"><span aria-hidden="true">$</span>` +
            `<input class="input input--price" id="${id}-price" data-field="price" inputmode="decimal" autocomplete="off" value="${priceInput(it.price)}"></span>`) +
      '</div>' +
      '<div class="row__toggles">' +
        `<label class="switch"><input type="checkbox" data-field="soldOut"${it.soldOut ? ' checked' : ''}><span>Sold out${sr}</span></label>` +
        `<label class="switch"><input type="checkbox" data-field="shown"${it.hidden ? '' : ' checked'}><span>On menu${sr}</span></label>` +
      '</div>' +
      '<div class="row__tools">' +
        `<button type="button" class="icon-btn" data-act="item-up" aria-label="Move ${esc(name)} up"${ii === 0 ? ' disabled' : ''}>${icon('up')}</button>` +
        `<button type="button" class="icon-btn" data-act="item-down" aria-label="Move ${esc(name)} down"${ii === len - 1 ? ' disabled' : ''}>${icon('down')}</button>` +
        `<button type="button" class="icon-btn icon-btn--danger" data-act="del-item" aria-label="Delete ${esc(name)}">${icon('trash')}</button>` +
      '</div></li>';
  }

  function catHTML(cat, ci, last) {
    const secs = sectionsOf(cat);
    const n = secs.reduce((s, g) => s + g.items.length, 0);
    const collapsed = !!state.collapsed[cat.id];
    const bodyId = `cat-body-${ci}`;
    const meta = [plural(n, 'item')];
    if (cat.groups) meta.push(plural(cat.groups.length, 'section'));
    if (cat.notice) meta.push(`${cat.notice} days’ notice`);
    return `<section class="cat card" data-cat="${ci}" aria-labelledby="cat-title-${ci}">` +
      '<header class="cat__head">' +
        `<button type="button" class="cat__toggle" data-act="toggle-cat" aria-expanded="${!collapsed}" aria-controls="${bodyId}">` +
          `<svg class="i chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg><span class="sr-only">Show or hide </span></button>` +
        `<h2 id="cat-title-${ci}" tabindex="-1">${esc(cat.name || 'Untitled category')}</h2>` +
        `<span class="cat__meta">${esc(meta.join(' · '))}</span>` +
        '<div class="cat__tools">' +
          `<button type="button" class="btn btn--quiet btn--sm" data-act="edit-cat">${icon('edit')}Edit<span class="sr-only"> category ${esc(cat.name)}</span></button>` +
          `<button type="button" class="icon-btn" data-act="cat-up" aria-label="Move category ${esc(cat.name)} up"${ci === 0 ? ' disabled' : ''}>${icon('up')}</button>` +
          `<button type="button" class="icon-btn" data-act="cat-down" aria-label="Move category ${esc(cat.name)} down"${ci === last ? ' disabled' : ''}>${icon('down')}</button>` +
          `<button type="button" class="icon-btn icon-btn--danger" data-act="del-cat" aria-label="Delete category ${esc(cat.name)}">${icon('trash')}</button>` +
        '</div></header>' +
      `<div class="cat__body" id="${bodyId}"${collapsed ? ' hidden' : ''}>` +
        (cat.note ? `<p class="cat__note">${esc(cat.note)}</p>` : '') +
        secs.map((g, gi) => `<div class="sec" data-sec="${ci}.${gi}">` +
          (cat.groups ? `<h3 class="sec__title">${esc(g.title || 'Untitled section')}</h3>` : '') +
          (g.items.length ? `<ul class="rows">${g.items.map((it, ii) => rowHTML(it, ci, gi, ii, g.items.length)).join('')}</ul>` : '<p class="muted small sec__empty">No items yet.</p>') +
          `<button type="button" class="btn btn--quiet btn--sm add-here" data-act="add-here">${icon('plus')}Add item to ${esc(cat.groups ? g.title : cat.name)}</button>` +
        '</div>').join('') +
      '</div></section>';
  }

  function viewMenu(main) {
    const d = state.draft;
    const c = countItems(d);
    const cats = d.menu.categories;
    const view = doc.createElement('div');
    view.className = 'view view--menu';
    view.innerHTML =
      '<div class="view__head"><div><h1 tabindex="-1">Menu</h1>' +
        `<p class="muted">${plural(c.items, 'item')} in ${plural(cats.length, 'category', 'categories')}` +
        `${c.soldOut ? ` · ${c.soldOut} sold out` : ''}${c.hidden ? ` · ${c.hidden} hidden` : ''}. Change a price right in the list, or select an item to edit everything.</p></div>` +
        '<div class="view__actions">' +
          `<button type="button" class="btn btn--primary" data-act="add-item">${icon('plus')}Add item</button>` +
          `<button type="button" class="btn btn--quiet" data-act="add-cat">${icon('plus')}Add category</button>` +
        '</div></div>' +
      '<div class="toolbar">' +
        `<div class="search">${icon('search')}<label class="sr-only" for="menu-find">Find an item</label>` +
          `<input class="input" id="menu-find" type="search" placeholder="Find an item" autocomplete="off" value="${esc(state.search)}"></div>` +
        '<div class="chips" role="group" aria-label="Filter items">' +
          [['all', 'All'], ['soldout', 'Sold out'], ['hidden', 'Hidden'], ['nophoto', 'No photo']]
            .map(([k, l]) => `<button type="button" class="chip" data-filter="${k}" aria-pressed="${state.filter === k}">${l}</button>`).join('') +
        '</div>' +
        '<div class="toolbar__end"><button type="button" class="btn btn--quiet btn--sm" data-act="expand-all">Expand all</button>' +
          '<button type="button" class="btn btn--quiet btn--sm" data-act="collapse-all">Collapse all</button></div>' +
      '</div>' +
      '<p class="sr-only" data-find-status aria-live="polite"></p>' +
      `<div class="cats">${cats.map((cat, ci) => catHTML(cat, ci, cats.length - 1)).join('')}</div>` +
      '<p class="empty" data-find-empty hidden>No items match. <button type="button" class="link-btn" data-act="clear-find">Show all items</button></p>';
    main.appendChild(view);
    applyMenuFilter(view);

    view.addEventListener('input', (e) => {
      if (e.target.id === 'menu-find') {
        state.search = e.target.value;
        applyMenuFilter(view, true);
      } else if (e.target.getAttribute('data-field') === 'price') {
        const it = itemFromEl(e.target);
        const v = parsePrice(e.target.value);
        if (v === null) {
          fieldError(e.target, 'Enter a price like 5.50');
        } else {
          fieldError(e.target, '');
          it.price = v;
          changed();
        }
      }
    });
    view.addEventListener('focusout', (e) => {
      if (e.target.getAttribute('data-field') !== 'price') return;
      const it = itemFromEl(e.target);
      if (parsePrice(e.target.value) !== null) e.target.value = priceInput(it.price);
    });
    view.addEventListener('change', (e) => {
      const f = e.target.getAttribute('data-field');
      if (f !== 'soldOut' && f !== 'shown') return;
      const li = e.target.closest('.row');
      const it = itemFromEl(e.target);
      if (f === 'soldOut') { if (e.target.checked) it.soldOut = true; else delete it.soldOut; }
      else if (e.target.checked) delete it.hidden; else it.hidden = true;
      replaceRow(li, `[data-field="${f}"]`);
      changed();
      toast(`${it.name}: ${f === 'soldOut' ? (it.soldOut ? 'marked sold out' : 'available again') : (it.hidden ? 'hidden from the menu' : 'back on the menu')}. Publish to update the website.`);
    });
    view.addEventListener('click', async (e) => {
      const chip = e.target.closest('[data-filter]');
      if (chip) {
        state.filter = chip.getAttribute('data-filter');
        $$('[data-filter]', view).forEach((b) => b.setAttribute('aria-pressed', String(b === chip)));
        applyMenuFilter(view, true);
        return;
      }
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      const catEl = btn.closest('[data-cat]');
      const ci = catEl ? Number(catEl.getAttribute('data-cat')) : null;
      const cat = ci != null ? d.menu.categories[ci] : null;
      const rowEl = btn.closest('[data-path]');
      const path = rowEl ? parsePath(rowEl.getAttribute('data-path')) : null;
      if (act === 'toggle-cat') {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        state.collapsed[cat.id] = !open;
        btn.setAttribute('aria-expanded', String(open));
        $('.cat__body', catEl).hidden = !open;
      } else if (act === 'expand-all' || act === 'collapse-all') {
        d.menu.categories.forEach((x) => { state.collapsed[x.id] = act === 'collapse-all'; });
        renderTab(`[data-act="${act}"]`);
      } else if (act === 'clear-find') {
        state.search = '';
        state.filter = 'all';
        renderTab('#menu-find');
      } else if (act === 'add-item') openItemEditor(null, { ci: 0, gi: 0 });
      else if (act === 'add-here') {
        const sec = btn.closest('[data-sec]').getAttribute('data-sec').split('.').map(Number);
        openItemEditor(null, { ci: sec[0], gi: sec[1] });
      } else if (act === 'edit-item') openItemEditor(path);
      else if (act === 'add-cat') openCategoryEditor(null);
      else if (act === 'edit-cat') openCategoryEditor(ci);
      else if (act === 'cat-up' || act === 'cat-down') {
        const to = act === 'cat-up' ? ci - 1 : ci + 1;
        const list = d.menu.categories;
        [list[ci], list[to]] = [list[to], list[ci]];
        const lastIdx = list.length - 1;
        const keep = (act === 'cat-up' && to === 0) || (act === 'cat-down' && to === lastIdx) ? (act === 'cat-up' ? 'cat-down' : 'cat-up') : act;
        changed({ rerender: true, focus: `[data-cat="${to}"] [data-act="${keep}"]` });
      } else if (act === 'del-cat') {
        const n = sectionsOf(cat).reduce((s, g) => s + g.items.length, 0);
        const ok = await ask({
          title: `Delete “${cat.name}”?`, danger: true, ok: 'Delete category',
          text: n ? `This also deletes its ${plural(n, 'item')}. You can undo right after, or restore an older version from History.` : 'This category is empty.',
        });
        if (!ok) return;
        const snap = clone(d);
        d.menu.categories.splice(ci, 1);
        changed({ rerender: true, focus: 'h1' });
        toastUndo(`Deleted “${cat.name}”.`, snap);
      } else if (act === 'item-up' || act === 'item-down') {
        const list = listAt(d, path.ci, path.gi);
        const to = act === 'item-up' ? path.ii - 1 : path.ii + 1;
        [list[path.ii], list[to]] = [list[to], list[path.ii]];
        const edge = act === 'item-up' ? to === 0 : to === list.length - 1;
        const keep = edge ? (act === 'item-up' ? 'item-down' : 'item-up') : act;
        changed({ rerender: true, focus: `[data-path="${path.ci}.${path.gi}.${to}"] [data-act="${keep}"]` });
      } else if (act === 'del-item') {
        const it = itemAt(d, path);
        const ok = await ask({ title: `Delete “${it.name}”?`, text: 'It will be removed from the menu when you publish.', ok: 'Delete item', danger: true });
        if (!ok) return;
        const snap = clone(d);
        listAt(d, path.ci, path.gi).splice(path.ii, 1);
        const list = listAt(d, path.ci, path.gi);
        const next = list.length ? `[data-path="${path.ci}.${path.gi}.${Math.min(path.ii, list.length - 1)}"] [data-act="edit-item"]` : `[data-sec="${path.ci}.${path.gi}"] [data-act="add-here"]`;
        changed({ rerender: true, focus: next });
        toastUndo(`Deleted “${it.name}”.`, snap);
      }
    });
  }

  function parsePath(s) { const [ci, gi, ii] = s.split('.').map(Number); return { ci, gi, ii }; }
  function itemFromEl(el) { return itemAt(state.draft, parsePath(el.closest('[data-path]').getAttribute('data-path'))); }
  function replaceRow(li, focusSel) {
    const p = parsePath(li.getAttribute('data-path'));
    const len = listAt(state.draft, p.ci, p.gi).length;
    const tmp = doc.createElement('ul');
    tmp.innerHTML = rowHTML(itemAt(state.draft, p), p.ci, p.gi, p.ii, len);
    const fresh = tmp.firstElementChild;
    li.replaceWith(fresh);
    if (focusSel) { const el = $(focusSel, fresh); if (el) el.focus(); }
    const view = fresh.closest('.view');
    if (view) applyMenuFilter(view);
  }

  function applyMenuFilter(view, announce) {
    const words = fold(state.search.trim()).split(/\s+/).filter(Boolean);
    const filter = state.filter;
    const active = words.length > 0 || filter !== 'all';
    let shown = 0;
    $$('.row', view).forEach((li) => {
      const hay = li.getAttribute('data-search');
      const flags = li.getAttribute('data-flags').split(' ');
      const ok = words.every((w) => hay.includes(w)) && (filter === 'all' || flags.includes(filter));
      li.hidden = !ok;
      if (ok) shown++;
    });
    $$('.sec', view).forEach((sec) => {
      const any = $$('.row', sec).some((li) => !li.hidden);
      sec.hidden = active && !any;
      const add = $('.add-here', sec);
      if (add) add.hidden = active;
    });
    $$('.cat', view).forEach((catEl) => {
      const any = $$('.row', catEl).some((li) => !li.hidden);
      catEl.hidden = active && !any;
      const body = $('.cat__body', catEl);
      const cat = state.draft.menu.categories[Number(catEl.getAttribute('data-cat'))];
      body.hidden = active ? false : !!state.collapsed[cat.id];
      $('.cat__toggle', catEl).setAttribute('aria-expanded', String(!body.hidden));
    });
    $('[data-find-empty]', view).hidden = !active || shown > 0;
    if (announce) $('[data-find-status]', view).textContent = active ? `${plural(shown, 'item')} shown` : 'Showing all items';
  }

  /* ---------- item editor ---------- */
  function findOriginal(catId, slug) {
    let found = null;
    if (state.original) eachItem(state.original, (it, cat) => { if (cat.id === catId && it.slug === slug) found = it; });
    return found;
  }

  function optionSummary(g) {
    const t = g.options.map((o) => `${o.name} ${o.price ? `+${money(o.price)}` : 'free'}`).join(', ');
    return t.length > 110 ? `${t.slice(0, 107)}…` : t;
  }

  function openItemEditor(path, where) {
    const d = state.draft;
    const isNew = !path;
    const src = isNew ? { slug: '', name: '', price: 0 } : itemAt(d, path);
    const work = clone(src);
    let ci = isNew ? Math.min(where.ci || 0, d.menu.categories.length - 1) : path.ci;
    let gi = isNew ? where.gi || 0 : path.gi;
    if (!d.menu.categories.length) {
      toast('Add a category first.', 'error');
      openCategoryEditor(null);
      return;
    }
    const orig = isNew ? null : findOriginal(d.menu.categories[path.ci].id, src.slug);
    let img = work.img || '';
    const groups = Object.entries(d.menu.addonGroups);
    const sizeLabel = (k) => (SIZE_TYPES.find((x) => x[0] === (k || '')) || SIZE_TYPES[0])[1];
    const avail = work.hidden ? 'hidden' : work.soldOut ? 'soldout' : 'on';
    const body =
      '<div class="editor"><div class="editor__main">' +
        '<div class="field"><label for="ie-name">Name <span class="req" aria-hidden="true">*</span></label>' +
          `<input class="input" id="ie-name" maxlength="90" required value="${esc(work.name)}"></div>` +
        '<div class="field"><label for="ie-desc">Description</label>' +
          `<textarea class="input" id="ie-desc" rows="3" maxlength="600" aria-describedby="ie-desc-count">${esc(work.desc || '')}</textarea>` +
          `<p class="hint" id="ie-desc-count"><span data-count>${(work.desc || '').length}</span> of 600 characters</p></div>` +
        '<fieldset class="field"><legend>Price</legend>' +
          '<div class="seg">' +
            `<label><input type="radio" name="ie-pricing" value="one"${work.sizes && work.sizes.length ? '' : ' checked'}><span>One price</span></label>` +
            `<label><input type="radio" name="ie-pricing" value="sizes"${work.sizes && work.sizes.length ? ' checked' : ''}><span>Different sizes</span></label>` +
          '</div>' +
          '<div class="field" data-one-price><label for="ie-price">Price</label>' +
            `<span class="money"><span aria-hidden="true">$</span><input class="input input--price" id="ie-price" inputmode="decimal" autocomplete="off" value="${priceInput(work.sizes && work.sizes.length ? '' : work.price)}"></span></div>` +
          '<div data-sizes><table class="sizes"><thead><tr><th scope="col">Size</th><th scope="col">Price</th><th scope="col"><span class="sr-only">Move or remove</span></th></tr></thead>' +
            '<tbody data-size-rows></tbody></table>' +
            `<button type="button" class="btn btn--quiet btn--sm" data-act="add-size">${icon('plus')}Add size</button>` +
            '<p class="hint">The menu shows the lowest price as “From”. Name sizes like 8", 10", 1/4 sheet, 1/2 sheet or full sheet so the matching extras appear.</p></div>' +
        '</fieldset>' +
        '<fieldset class="field"><legend>Extras customers can choose</legend>' +
          (groups.length
            ? `<div class="checks">${groups.map(([gid, g]) => `<label class="check"><input type="checkbox" name="ie-addons" value="${esc(gid)}"${(work.addons || []).includes(gid) ? ' checked' : ''}>` +
              `<span>${esc(g.name)} <span class="muted small">(${esc(g.forSize ? `for ${sizeLabel(g.forSize)}` : 'any size')}${g.required ? ', required' : ''}: ${esc(optionSummary(g))})</span></span></label>`).join('')}</div>`
            : '<p class="muted small">No extras yet. Add them in the Extras section.</p>') +
          '<p class="hint">Edit the choices and their prices in the <strong>Extras</strong> section.</p>' +
        '</fieldset>' +
      '</div><div class="editor__side">' +
        '<div class="field"><span class="label" id="ie-photo-label">Photo</span>' +
          '<div class="photo-box" data-photo-box></div>' +
          '<div class="btn-row">' +
            `<label class="btn btn--quiet btn--sm file-btn">${icon('upload')}<span data-upload-label>Upload photo</span>` +
              '<input type="file" class="sr-only" data-photo-input accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-describedby="ie-photo-status"></label>' +
            '<button type="button" class="btn btn--quiet btn--sm" data-act="photo-remove">Remove photo</button>' +
            `<button type="button" class="btn btn--quiet btn--sm" data-act="photo-restore"${orig && orig.img ? '' : ' hidden'}>Use original photo</button>` +
          '</div>' +
          '<p class="hint" id="ie-photo-status" data-photo-status aria-live="polite">JPG, PNG or WebP. Large photos are resized for you.</p></div>' +
        '<div class="field"><label for="ie-cat">Category</label><select class="input" id="ie-cat"></select></div>' +
        '<div class="field" data-sec-field><label for="ie-sec">Section</label><select class="input" id="ie-sec"></select></div>' +
        '<fieldset class="field"><legend>Availability</legend><div class="radios">' +
          `<label class="check"><input type="radio" name="ie-avail" value="on"${avail === 'on' ? ' checked' : ''}><span>On the menu</span></label>` +
          `<label class="check"><input type="radio" name="ie-avail" value="soldout"${avail === 'soldout' ? ' checked' : ''}><span>Sold out <span class="muted small">(shown, can’t be ordered)</span></span></label>` +
          `<label class="check"><input type="radio" name="ie-avail" value="hidden"${avail === 'hidden' ? ' checked' : ''}><span>Hidden <span class="muted small">(not shown)</span></span></label>` +
        '</div></fieldset>' +
        `<label class="check"><input type="checkbox" id="ie-pop"${work.popular ? ' checked' : ''}><span>Bestseller <span class="muted small">(badge on the menu, and shown on the home page)</span></span></label>` +
        '<div class="field"><label for="ie-spice">Spice level</label><select class="input" id="ie-spice">' +
          SPICE.map((s) => `<option value="${s}"${((work.labels || [])[0] || '') === s ? ' selected' : ''}>${s || 'None'}</option>`).join('') +
          ((work.labels || [])[0] && !SPICE.includes(work.labels[0]) ? `<option value="${esc(work.labels[0])}" selected>${esc(work.labels[0])}</option>` : '') +
        '</select></div>' +
        '<div class="field"><label for="ie-notice">Days of notice needed</label>' +
          `<input class="input input--num" id="ie-notice" type="number" min="0" max="60" step="1" inputmode="numeric" value="${work.notice || 0}" aria-describedby="ie-notice-hint">` +
          '<p class="hint" id="ie-notice-hint">0 means the usual next-day ordering.</p></div>' +
      '</div></div>' +
      '<p class="form-error" data-editor-error role="alert" hidden></p>';
    const foot = (isNew ? '' : `<button type="button" class="btn btn--danger-quiet" data-act="delete">${icon('trash')}Delete item</button>`) +
      '<span class="spacer"></span><button type="button" class="btn btn--quiet" data-dlg-close>Cancel</button>' +
      `<button type="submit" class="btn btn--primary">${isNew ? 'Add item' : 'Save item'}</button>`;

    let initial = null;
    const dlg = openDialog({
      title: isNew ? 'Add an item' : `Edit “${src.name}”`, size: 'lg', body, foot, focus: '#ie-name',
      confirmClose: () => initial !== null && initial !== canon(collect(true)),
      onSubmit: () => save(),
    });
    const box = dlg.box;
    const q = (s) => $(s, box);
    const sizeRows = q('[data-size-rows]');
    let sizes = (work.sizes || []).map((s) => ({ name: s.name, price: priceInput(s.price) }));
    if (!sizes.length) sizes = [{ name: '', price: '' }];

    function drawSizes(focus) {
      sizeRows.innerHTML = sizes.map((s, i) =>
        `<tr data-i="${i}"><td><label class="sr-only" for="ie-sz-${i}">Size ${i + 1} name</label><input class="input" id="ie-sz-${i}" data-sz="name" maxlength="50" value="${esc(s.name)}" placeholder="e.g. 8&quot;"></td>` +
        `<td><label class="sr-only" for="ie-szp-${i}">Size ${i + 1} price</label><span class="money"><span aria-hidden="true">$</span><input class="input input--price" id="ie-szp-${i}" data-sz="price" inputmode="decimal" value="${esc(s.price)}"></span></td>` +
        '<td class="nowrap">' +
          `<button type="button" class="icon-btn" data-act="sz-up" aria-label="Move size ${i + 1} up"${i === 0 ? ' disabled' : ''}>${icon('up')}</button>` +
          `<button type="button" class="icon-btn" data-act="sz-down" aria-label="Move size ${i + 1} down"${i === sizes.length - 1 ? ' disabled' : ''}>${icon('down')}</button>` +
          `<button type="button" class="icon-btn icon-btn--danger" data-act="sz-del" aria-label="Remove size ${i + 1}"${sizes.length === 1 ? ' disabled' : ''}>${icon('trash')}</button>` +
        '</td></tr>').join('');
      if (focus) { const el = $(focus, sizeRows); if (el) el.focus(); }
    }
    function drawPricing() {
      const multi = $('input[name="ie-pricing"]:checked', box).value === 'sizes';
      q('[data-one-price]').hidden = multi;
      q('[data-sizes]').hidden = !multi;
    }
    function drawPlaces() {
      q('#ie-cat').innerHTML = d.menu.categories.map((c, i) => `<option value="${i}"${i === ci ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
      const cat = d.menu.categories[ci];
      q('[data-sec-field]').hidden = !cat.groups;
      if (cat.groups) {
        if (gi >= cat.groups.length) gi = 0;
        q('#ie-sec').innerHTML = cat.groups.map((g, i) => `<option value="${i}"${i === gi ? ' selected' : ''}>${esc(g.title)}</option>`).join('');
      } else {
        gi = 0;
      }
    }
    function drawPhoto() {
      const url = img ? photoUrl(img, 'full') : '';
      q('[data-photo-box]').innerHTML = url
        ? `<img src="${esc(url)}" alt="Current photo of ${esc(q('#ie-name').value || 'this item')}">`
        : `<div class="photo-box__empty">${icon('photo')}<span>No photo</span></div>`;
      q('[data-act="photo-remove"]').hidden = !img;
      q('[data-upload-label]').textContent = img ? 'Replace photo' : 'Upload photo';
      const r = q('[data-act="photo-restore"]');
      r.hidden = !(orig && orig.img && orig.img !== img);
    }
    function collect(loose) {
      const out = Object.assign({}, work);
      out.name = q('#ie-name').value.trim();
      out.desc = q('#ie-desc').value.trim();
      if (!out.desc) delete out.desc;
      const multi = $('input[name="ie-pricing"]:checked', box).value === 'sizes';
      if (multi) {
        out.sizes = sizes.map((s) => ({ name: s.name.trim(), price: loose ? s.price : parsePrice(s.price), key: sizeKey(s.name) }));
        delete out.price;
      } else {
        delete out.sizes;
        out.price = loose ? q('#ie-price').value : parsePrice(q('#ie-price').value);
      }
      out.addons = $$('input[name="ie-addons"]:checked', box).map((x) => x.value);
      if (!out.addons.length) delete out.addons;
      const spice = q('#ie-spice').value;
      if (spice) { out.labels = [spice]; out.spice = spice; } else { delete out.labels; delete out.spice; }
      if (q('#ie-pop').checked) out.popular = true; else delete out.popular;
      const n = Number(q('#ie-notice').value);
      if (n > 0) out.notice = n; else delete out.notice;
      const av = $('input[name="ie-avail"]:checked', box).value;
      delete out.hidden;
      delete out.soldOut;
      if (av === 'hidden') out.hidden = true;
      if (av === 'soldout') out.soldOut = true;
      if (img) out.img = img; else delete out.img;
      if (loose) { out._ci = ci; out._gi = gi; }
      return out;
    }
    function save() {
      const err = q('[data-editor-error]');
      err.hidden = true;
      $$('[aria-invalid]', box).forEach((el) => fieldError(el, ''));
      const it = collect(false);
      const bad = [];
      if (!it.name) { fieldError(q('#ie-name'), 'Enter a name.'); bad.push(q('#ie-name')); }
      if (it.sizes) {
        const seen = new Set();
        it.sizes.forEach((s, i) => {
          const nameEl = q(`#ie-sz-${i}`), priceEl = q(`#ie-szp-${i}`);
          if (!s.name) { fieldError(nameEl, 'Name this size.'); bad.push(nameEl); }
          else if (seen.has(s.name.toLowerCase())) { fieldError(nameEl, 'This size is listed twice.'); bad.push(nameEl); }
          seen.add(s.name.toLowerCase());
          if (s.price === null) { fieldError(priceEl, 'Enter a price like 48.90'); bad.push(priceEl); }
        });
        if (!bad.length) it.price = Math.min.apply(null, it.sizes.map((s) => s.price));
      } else if (it.price === null) {
        fieldError(q('#ie-price'), 'Enter a price like 5.50');
        bad.push(q('#ie-price'));
      }
      const n = Number(q('#ie-notice').value);
      if (!Number.isInteger(n) || n < 0 || n > 60) { fieldError(q('#ie-notice'), 'Use a whole number from 0 to 60.'); bad.push(q('#ie-notice')); }
      if (bad.length) {
        err.textContent = bad.length === 1 ? 'Please fix the highlighted field.' : `Please fix the ${bad.length} highlighted fields.`;
        err.hidden = false;
        bad[0].focus();
        return;
      }
      const target = d.menu.categories[ci];
      const targetList = sectionsOf(target)[gi].items;
      if (isNew) {
        it.slug = uniqueSlug(target, it.name);
        targetList.push(it);
      } else {
        const fromList = listAt(d, path.ci, path.gi);
        const moved = path.ci !== ci || path.gi !== gi;
        if (!moved) {
          fromList[path.ii] = it;
        } else {
          fromList.splice(path.ii, 1);
          if (path.ci !== ci) {
            const clash = sectionsOf(target).some((g) => g.items.some((x) => x.slug === it.slug));
            if (clash) it.slug = uniqueSlug(target, it.name);
          }
          targetList.push(it);
        }
      }
      const ii = targetList.indexOf(it);
      state.collapsed[target.id] = false;
      dlg.close(true);
      if (state.tab !== 'menu') state.tab = 'menu';
      changed({ rerender: true, focus: `[data-path="${ci}.${gi}.${ii}"] [data-act="edit-item"]` });
      toast(`${isNew ? 'Added' : 'Saved'} “${it.name}”. Publish when you’re ready.`, 'ok');
    }

    drawSizes();
    drawPricing();
    drawPlaces();
    drawPhoto();
    initial = canon(collect(true));

    box.addEventListener('input', (e) => {
      const t = e.target;
      if (t.id === 'ie-desc') q('[data-count]').textContent = t.value.length;
      const sz = t.getAttribute('data-sz');
      if (sz) sizes[Number(t.closest('tr').getAttribute('data-i'))][sz] = t.value;
      if (t.getAttribute('aria-invalid')) fieldError(t, '');
    });
    box.addEventListener('change', async (e) => {
      const t = e.target;
      if (t.name === 'ie-pricing') {
        drawPricing();
        if (t.value === 'sizes' && sizes.length === 1 && !sizes[0].name && !sizes[0].price && q('#ie-price').value) sizes[0].price = q('#ie-price').value;
        if (t.value === 'one' && !q('#ie-price').value && sizes[0] && sizes[0].price) q('#ie-price').value = sizes[0].price;
        drawSizes();
      } else if (t.id === 'ie-cat') {
        ci = Number(t.value);
        gi = 0;
        drawPlaces();
      } else if (t.id === 'ie-sec') {
        gi = Number(t.value);
      } else if (t.hasAttribute('data-photo-input')) {
        const file = t.files && t.files[0];
        t.value = '';
        if (!file) return;
        const status = q('[data-photo-status]');
        status.textContent = 'Preparing the photo…';
        box.classList.add('is-busy');
        try {
          const { full, thumb } = await preparePhoto(file);
          status.textContent = 'Uploading…';
          const res = await state.backend.upload(full, thumb);
          img = res.ref;
          drawPhoto();
          status.textContent = `Photo ready (${Math.round(full.size / 1024)} KB). Save the item to keep it.`;
        } catch (ex) {
          if (ex.code === 'signed_out') { status.textContent = 'Your login ended. Save your other changes, then log in again to upload.'; }
          else status.textContent = ex.message || 'The photo couldn’t be uploaded.';
        } finally {
          box.classList.remove('is-busy');
        }
      }
    });
    box.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.getAttribute('data-act');
      if (act === 'add-size') {
        sizes.push({ name: '', price: '' });
        drawSizes(`#ie-sz-${sizes.length - 1}`);
      } else if (act === 'sz-up' || act === 'sz-down' || act === 'sz-del') {
        const i = Number(b.closest('tr').getAttribute('data-i'));
        if (act === 'sz-del') {
          sizes.splice(i, 1);
          drawSizes(`#ie-sz-${Math.min(i, sizes.length - 1)}`);
        } else {
          const to = act === 'sz-up' ? i - 1 : i + 1;
          [sizes[i], sizes[to]] = [sizes[to], sizes[i]];
          const edge = act === 'sz-up' ? to === 0 : to === sizes.length - 1;
          drawSizes(`tr[data-i="${to}"] [data-act="${edge ? (act === 'sz-up' ? 'sz-down' : 'sz-up') : act}"]`);
        }
      } else if (act === 'photo-remove') {
        img = '';
        drawPhoto();
        q('[data-photo-status]').textContent = 'Photo removed. Save the item to keep this change.';
        q('[data-photo-input]').focus();
      } else if (act === 'photo-restore') {
        img = orig.img;
        drawPhoto();
        q('[data-photo-status]').textContent = 'Original photo back. Save the item to keep it.';
      } else if (act === 'delete') {
        const ok = await ask({ title: `Delete “${src.name}”?`, text: 'It will be removed from the menu when you publish.', ok: 'Delete item', danger: true });
        if (!ok) return;
        const snap = clone(d);
        listAt(d, path.ci, path.gi).splice(path.ii, 1);
        dlg.close(true);
        changed({ rerender: true, focus: 'h1' });
        toastUndo(`Deleted “${src.name}”.`, snap);
      }
    });
  }

  /* ---------- category editor ---------- */
  function openCategoryEditor(ci) {
    const d = state.draft;
    const isNew = ci == null;
    const cat = isNew ? { id: '', name: '', items: [] } : d.menu.categories[ci];
    let secs = cat.groups ? cat.groups.map((g, i) => ({ title: g.title, from: i, count: g.items.length })) : null;
    const body =
      '<div class="field"><label for="ce-name">Name <span class="req" aria-hidden="true">*</span></label>' +
        `<input class="input" id="ce-name" maxlength="80" required value="${esc(cat.name)}"></div>` +
      '<div class="field"><label for="ce-short">Short name <span class="muted">(menu tab label, optional)</span></label>' +
        `<input class="input" id="ce-short" maxlength="40" value="${esc(cat.short || '')}"></div>` +
      '<div class="field"><label for="ce-note">Note shown above the items <span class="muted">(optional)</span></label>' +
        `<textarea class="input" id="ce-note" rows="2" maxlength="240">${esc(cat.note || '')}</textarea></div>` +
      '<div class="field"><label for="ce-notice">Days of notice for everything in this category</label>' +
        `<input class="input input--num" id="ce-notice" type="number" min="0" max="60" step="1" value="${cat.notice || 0}">` +
        '<p class="hint">0 means the usual next-day ordering.</p></div>' +
      '<fieldset class="field"><legend>Sections</legend><div data-secs></div></fieldset>' +
      '<p class="form-error" data-editor-error role="alert" hidden></p>';
    const foot = (isNew ? '' : `<button type="button" class="btn btn--danger-quiet" data-act="delete">${icon('trash')}Delete category</button>`) +
      '<span class="spacer"></span><button type="button" class="btn btn--quiet" data-dlg-close>Cancel</button>' +
      `<button type="submit" class="btn btn--primary">${isNew ? 'Add category' : 'Save category'}</button>`;
    const snapshot = () => canon([$('#ce-name').value, $('#ce-short').value, $('#ce-note').value, $('#ce-notice').value, secs]);
    let initial = null;
    const dlg = openDialog({
      title: isNew ? 'Add a category' : `Edit “${cat.name}”`, size: 'md', body, foot, focus: '#ce-name',
      confirmClose: () => initial !== null && initial !== snapshot(),
      onSubmit: () => save(),
    });
    const box = dlg.box;
    function drawSecs(focus) {
      const wrap = $('[data-secs]', box);
      if (!secs) {
        wrap.innerHTML = '<p class="muted small">Items are shown in one list.</p>' +
          '<button type="button" class="btn btn--quiet btn--sm" data-act="split">Split into sections</button>';
      } else {
        wrap.innerHTML = '<ul class="sec-list">' + secs.map((s, i) =>
          `<li data-i="${i}"><label class="sr-only" for="ce-sec-${i}">Section ${i + 1} name</label>` +
          `<input class="input" id="ce-sec-${i}" maxlength="60" value="${esc(s.title)}">` +
          `<span class="muted small nowrap">${plural(s.count, 'item')}</span>` +
          `<button type="button" class="icon-btn" data-act="sec-up" aria-label="Move section ${i + 1} up"${i === 0 ? ' disabled' : ''}>${icon('up')}</button>` +
          `<button type="button" class="icon-btn" data-act="sec-down" aria-label="Move section ${i + 1} down"${i === secs.length - 1 ? ' disabled' : ''}>${icon('down')}</button>` +
          `<button type="button" class="icon-btn icon-btn--danger" data-act="sec-del" aria-label="Remove section ${i + 1}"${s.count || secs.length === 1 ? ' disabled' : ''}>${icon('trash')}</button></li>`).join('') + '</ul>' +
          `<button type="button" class="btn btn--quiet btn--sm" data-act="sec-add">${icon('plus')}Add section</button>` +
          (secs.length === 1 ? ' <button type="button" class="btn btn--quiet btn--sm" data-act="unsplit">Use one list instead</button>' : '') +
          '<p class="hint">A section can be removed once it has no items. Move items with each item’s Section setting.</p>';
      }
      if (focus) { const el = $(focus, box); if (el) el.focus(); }
    }
    drawSecs();
    initial = snapshot();
    box.addEventListener('input', (e) => {
      const li = e.target.closest('.sec-list li');
      if (li) secs[Number(li.getAttribute('data-i'))].title = e.target.value;
      if (e.target.getAttribute('aria-invalid')) fieldError(e.target, '');
    });
    box.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.getAttribute('data-act');
      const li = b.closest('.sec-list li');
      const i = li ? Number(li.getAttribute('data-i')) : -1;
      if (act === 'split') {
        secs = [{ title: $('#ce-name', box).value.trim() || 'Main', from: -1, count: (cat.items || []).length }];
        drawSecs('#ce-sec-0');
      } else if (act === 'unsplit') {
        secs = null;
        drawSecs('[data-act="split"]');
      } else if (act === 'sec-add') {
        secs.push({ title: '', from: null, count: 0 });
        drawSecs(`#ce-sec-${secs.length - 1}`);
      } else if (act === 'sec-del') {
        secs.splice(i, 1);
        drawSecs('[data-act="sec-add"]');
      } else if (act === 'sec-up' || act === 'sec-down') {
        const to = act === 'sec-up' ? i - 1 : i + 1;
        [secs[i], secs[to]] = [secs[to], secs[i]];
        drawSecs(`li[data-i="${to}"] input`);
      } else if (act === 'delete') {
        const n = sectionsOf(cat).reduce((s, g) => s + g.items.length, 0);
        const ok = await ask({ title: `Delete “${cat.name}”?`, text: n ? `This also deletes its ${plural(n, 'item')}.` : 'This category is empty.', ok: 'Delete category', danger: true });
        if (!ok) return;
        const snap = clone(d);
        d.menu.categories.splice(ci, 1);
        dlg.close(true);
        changed({ rerender: true, focus: 'h1' });
        toastUndo(`Deleted “${cat.name}”.`, snap);
      }
    });
    function save() {
      const err = $('[data-editor-error]', box);
      err.hidden = true;
      const nameEl = $('#ce-name', box);
      const name = nameEl.value.trim();
      const bad = [];
      if (!name) { fieldError(nameEl, 'Enter a name.'); bad.push(nameEl); }
      const noticeEl = $('#ce-notice', box);
      const notice = Number(noticeEl.value);
      if (!Number.isInteger(notice) || notice < 0 || notice > 60) { fieldError(noticeEl, 'Use a whole number from 0 to 60.'); bad.push(noticeEl); }
      if (secs) {
        const seen = new Set();
        secs.forEach((s, i) => {
          const el = $(`#ce-sec-${i}`, box);
          const t = s.title.trim();
          if (!t) { fieldError(el, 'Name this section.'); bad.push(el); }
          else if (seen.has(t.toLowerCase())) { fieldError(el, 'Two sections have this name.'); bad.push(el); }
          seen.add(t.toLowerCase());
        });
      }
      if (bad.length) {
        err.textContent = 'Please fix the highlighted fields.';
        err.hidden = false;
        bad[0].focus();
        return;
      }
      const target = isNew ? { id: '', name } : cat;
      target.name = name;
      const short = $('#ce-short', box).value.trim();
      const note = $('#ce-note', box).value.trim();
      if (short) target.short = short; else delete target.short;
      if (note) target.note = note; else delete target.note;
      if (notice) target.notice = notice; else delete target.notice;
      const oldGroups = cat.groups || null;
      const allItems = oldGroups ? [].concat(...oldGroups.map((g) => g.items)) : (cat.items || []);
      if (secs) {
        target.groups = secs.map((s) => ({
          title: s.title.trim(),
          items: s.from === -1 ? allItems : s.from != null && oldGroups ? oldGroups[s.from].items : [],
        }));
        delete target.items;
      } else {
        target.items = allItems;
        delete target.groups;
      }
      let at = ci;
      if (isNew) {
        const ids = new Set(d.menu.categories.map((c) => c.id));
        let id = slugify(name), n = 2;
        while (ids.has(id)) id = `${slugify(name)}-${n++}`;
        target.id = id;
        d.menu.categories.push(target);
        at = d.menu.categories.length - 1;
      }
      state.collapsed[target.id] = false;
      dlg.close(true);
      changed({ rerender: true, focus: `[data-cat="${at}"] h2` });
      toast(`${isNew ? 'Added' : 'Saved'} “${name}”.`, 'ok');
    }
  }

  /* ------------------------------------------------------------------ extras */
  function viewExtras(main) {
    const d = state.draft;
    const view = doc.createElement('div');
    view.className = 'view';
    const entries = Object.entries(d.menu.addonGroups);
    view.innerHTML =
      '<div class="view__head"><div><h1 tabindex="-1">Extras</h1>' +
        '<p class="muted">Choices customers make in the item pop-up, like cake decorations or a side. Attach them to items in each item’s editor.</p></div>' +
        `<div class="view__actions"><button type="button" class="btn btn--primary" data-act="add-group">${icon('plus')}Add extras group</button></div></div>` +
      (entries.length ? '' : '<p class="empty">No extras yet.</p>') +
      entries.map(([gid, g]) => {
        const used = groupUsage(d, gid);
        const p = `gx-${gid}`;
        return `<section class="card group" data-gid="${esc(gid)}" aria-labelledby="${p}-title">` +
          `<header class="group__head"><h2 id="${p}-title">${esc(g.name || 'Untitled extras')}</h2>` +
          `<span class="muted small">${used.length ? `Used by ${plural(used.length, 'item')}` : 'Not used by any item'}</span>` +
          `<button type="button" class="btn btn--danger-quiet btn--sm" data-act="del-group">${icon('trash')}Delete<span class="sr-only"> ${esc(g.name)}</span></button></header>` +
          (used.length ? `<p class="muted small group__used">${esc(used.slice(0, 8).join(', '))}${used.length > 8 ? `, and ${used.length - 8} more` : ''}</p>` : '') +
          '<div class="grid-4">' +
            `<div class="field"><label for="${p}-name">Name</label><input class="input" id="${p}-name" data-g="name" maxlength="80" value="${esc(g.name)}"></div>` +
            `<div class="field"><label for="${p}-size">Show for</label><select class="input" id="${p}-size" data-g="forSize">` +
              SIZE_TYPES.map(([k, l]) => `<option value="${k}"${(g.forSize || '') === k ? ' selected' : ''}>${l}</option>`).join('') + '</select></div>' +
            `<div class="field"><label for="${p}-min">Customers must pick at least</label><input class="input input--num" id="${p}-min" data-g="min" type="number" min="0" max="40" step="1" value="${g.min}"></div>` +
            `<div class="field"><label for="${p}-max">Customers can pick up to</label><input class="input input--num" id="${p}-max" data-g="max" type="number" min="1" max="40" step="1" value="${g.max}"></div>` +
          '</div>' +
          `<table class="opts"><caption class="sr-only">Options in ${esc(g.name)}</caption><thead><tr><th scope="col">Option</th><th scope="col">Extra charge</th><th scope="col"><span class="sr-only">Move or remove</span></th></tr></thead><tbody>` +
          g.options.map((o, i) =>
            `<tr data-o="${i}"><td><label class="sr-only" for="${p}-o${i}">Option ${i + 1} name</label><input class="input" id="${p}-o${i}" data-o-field="name" maxlength="80" value="${esc(o.name)}"></td>` +
            `<td><label class="sr-only" for="${p}-op${i}">Option ${i + 1} extra charge</label><span class="money"><span aria-hidden="true">$</span><input class="input input--price" id="${p}-op${i}" data-o-field="price" inputmode="decimal" value="${priceInput(o.price)}"></span></td>` +
            '<td class="nowrap">' +
              `<button type="button" class="icon-btn" data-act="opt-up" aria-label="Move option ${i + 1} up"${i === 0 ? ' disabled' : ''}>${icon('up')}</button>` +
              `<button type="button" class="icon-btn" data-act="opt-down" aria-label="Move option ${i + 1} down"${i === g.options.length - 1 ? ' disabled' : ''}>${icon('down')}</button>` +
              `<button type="button" class="icon-btn icon-btn--danger" data-act="opt-del" aria-label="Remove option ${i + 1}"${g.options.length === 1 ? ' disabled' : ''}>${icon('trash')}</button>` +
            '</td></tr>').join('') +
          '</tbody></table>' +
          `<button type="button" class="btn btn--quiet btn--sm" data-act="opt-add">${icon('plus')}Add option</button>` +
          '<p class="hint">Use 0 for choices that don’t cost extra.</p>' +
          '</section>';
      }).join('');
    main.appendChild(view);

    const groupOf = (el) => {
      const sec = el.closest('[data-gid]');
      return sec ? { gid: sec.getAttribute('data-gid'), g: d.menu.addonGroups[sec.getAttribute('data-gid')], sec } : null;
    };
    view.addEventListener('input', (e) => {
      const t = e.target;
      const x = groupOf(t);
      if (!x) return;
      const gf = t.getAttribute('data-g');
      const of = t.getAttribute('data-o-field');
      if (gf === 'name') {
        x.g.name = t.value;
        fieldError(t, t.value.trim() ? '' : 'Enter a name.');
        $('h2', x.sec).textContent = t.value || 'Untitled extras';
      } else if (gf === 'min' || gf === 'max') {
        const n = Number(t.value);
        const okRange = Number.isInteger(n) && n >= (gf === 'min' ? 0 : 1) && n <= 40;
        if (!okRange) { fieldError(t, gf === 'min' ? 'Use 0 to 40.' : 'Use 1 to 40.'); return; }
        fieldError(t, '');
        x.g[gf] = n;
        x.g.required = x.g.min > 0;
        const minEl = $('[data-g="min"]', x.sec), maxEl = $('[data-g="max"]', x.sec);
        fieldError(maxEl, x.g.min > x.g.max ? 'Must be at least the minimum.' : '');
      } else if (of) {
        const i = Number(t.closest('tr').getAttribute('data-o'));
        if (of === 'name') {
          x.g.options[i].name = t.value;
          fieldError(t, t.value.trim() ? '' : 'Enter a name.');
        } else {
          const v = parsePrice(t.value);
          if (v === null) { fieldError(t, 'Enter an amount like 2.50'); return; }
          fieldError(t, '');
          x.g.options[i].price = v;
        }
      } else return;
      changed();
    });
    view.addEventListener('change', (e) => {
      const x = groupOf(e.target);
      if (!x || e.target.getAttribute('data-g') !== 'forSize') return;
      x.g.forSize = e.target.value || null;
      changed();
    });
    view.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.getAttribute('data-act');
      const x = groupOf(b);
      if (act === 'add-group') {
        const gid = nextGroupId(d);
        d.menu.addonGroups[gid] = { name: 'New extras', min: 0, max: 1, required: false, forSize: null, options: [{ name: '', price: 0 }] };
        changed({ rerender: true, focus: `[data-gid="${gid}"] [data-g="name"]` });
        const el = $(`[data-gid="${gid}"]`);
        if (el) el.scrollIntoView({ block: 'center' });
      } else if (act === 'del-group') {
        const used = groupUsage(d, x.gid);
        const ok = await ask({
          title: `Delete “${x.g.name}”?`, danger: true, ok: 'Delete extras',
          text: used.length ? `It will also be removed from ${plural(used.length, 'item')}.` : 'No items use it.',
        });
        if (!ok) return;
        const snap = clone(d);
        delete d.menu.addonGroups[x.gid];
        eachItem(d, (it) => {
          if (it.addons) { it.addons = it.addons.filter((g) => g !== x.gid); if (!it.addons.length) delete it.addons; }
        });
        changed({ rerender: true, focus: 'h1' });
        toastUndo(`Deleted “${x.g.name}”.`, snap);
      } else if (act === 'opt-add') {
        x.g.options.push({ name: '', price: 0 });
        changed({ rerender: true, focus: `[data-gid="${x.gid}"] tr[data-o="${x.g.options.length - 1}"] input` });
      } else if (act === 'opt-del' || act === 'opt-up' || act === 'opt-down') {
        const i = Number(b.closest('tr').getAttribute('data-o'));
        if (act === 'opt-del') {
          x.g.options.splice(i, 1);
          if (x.g.max > x.g.options.length) x.g.max = Math.max(1, x.g.options.length);
          if (x.g.min > x.g.options.length) x.g.min = x.g.options.length;
          changed({ rerender: true, focus: `[data-gid="${x.gid}"] [data-act="opt-add"]` });
        } else {
          const to = act === 'opt-up' ? i - 1 : i + 1;
          [x.g.options[i], x.g.options[to]] = [x.g.options[to], x.g.options[i]];
          const edge = act === 'opt-up' ? to === 0 : to === x.g.options.length - 1;
          changed({ rerender: true, focus: `[data-gid="${x.gid}"] tr[data-o="${to}"] [data-act="${edge ? (act === 'opt-up' ? 'opt-down' : 'opt-up') : act}"]` });
        }
      }
    });
  }

  /* ------------------------------------------------------------------ hours and closed days */
  function viewHours(main) {
    const s = state.draft.site;
    const today = todayLA();
    const view = doc.createElement('div');
    view.className = 'view';
    view.innerHTML =
      '<div class="view__head"><div><h1 tabindex="-1">Hours & closed days</h1>' +
        '<p class="muted">Store hours drive the “Open now” label and the pickup times customers can choose.</p></div></div>' +
      '<section class="card" aria-labelledby="hours-title"><h2 id="hours-title">Weekly hours</h2>' +
        '<div class="hours-grid">' +
        WEEK.map((day) => {
          const h = s.hours.find((x) => x.day === day);
          const open = !!(h.open && h.close);
          return `<fieldset class="hours-row" data-day="${day}"><legend>${DAY[day]}</legend>` +
            `<label class="switch"><input type="checkbox" data-h="isopen"${open ? ' checked' : ''}><span>Open<span class="sr-only"> on ${DAY[day]}</span></span></label>` +
            `<div class="field"><label for="h-${day}-o">Opens</label><input class="input" id="h-${day}-o" type="time" step="900" data-h="open" value="${esc(h.open || '09:00')}"${open ? '' : ' disabled'}></div>` +
            `<div class="field"><label for="h-${day}-c">Closes</label><input class="input" id="h-${day}-c" type="time" step="900" data-h="close" value="${esc(h.close || '17:00')}"${open ? '' : ' disabled'}></div>` +
            `<span class="muted small hours-row__sum" data-sum>${open ? `${fmtTime(h.open)} – ${fmtTime(h.close)}` : 'Closed'}</span>` +
            '</fieldset>';
        }).join('') +
        '</div></section>' +
      '<section class="card" aria-labelledby="closed-title"><h2 id="closed-title">Closed days</h2>' +
        '<p class="muted">Holidays and other days the bakery is closed. Customers can’t pick those days for pickup or delivery.</p>' +
        '<form class="inline-form" data-add-closure novalidate>' +
          `<div class="field"><label for="cl-date">Date</label><input class="input" id="cl-date" type="date" min="${today}" required></div>` +
          '<div class="field grow"><label for="cl-note">Reason <span class="muted">(optional, shown to customers)</span></label><input class="input" id="cl-note" maxlength="80" placeholder="e.g. Thanksgiving"></div>' +
          `<button type="submit" class="btn btn--primary">${icon('plus')}Add closed day</button>` +
        '</form>' +
        (s.closures.length
          ? `<ul class="list">${s.closures.map((c, i) => `<li class="${c.date < today ? 'is-past' : ''}"><span><strong>${esc(fmtDay(c.date))}</strong>${c.note ? ` · ${esc(c.note)}` : ''}${c.date < today ? ' <span class="badge badge--muted">Past</span>' : ''}</span>` +
              `<button type="button" class="btn btn--quiet btn--sm" data-act="del-closure" data-i="${i}">${icon('trash')}Remove<span class="sr-only"> ${esc(fmtDay(c.date))}</span></button></li>`).join('')}</ul>` +
            (s.closures.some((c) => c.date < today) ? '<button type="button" class="btn btn--quiet btn--sm" data-act="clear-past">Remove past days</button>' : '')
          : '<p class="empty">No closed days coming up.</p>') +
      '</section>';
    main.appendChild(view);

    const rowState = (fs) => {
      const day = Number(fs.getAttribute('data-day'));
      const h = s.hours.find((x) => x.day === day);
      const isOpen = $('[data-h="isopen"]', fs).checked;
      const o = $('[data-h="open"]', fs), c = $('[data-h="close"]', fs);
      o.disabled = c.disabled = !isOpen;
      fieldError(c, '');
      if (!isOpen) { h.open = ''; h.close = ''; $('[data-sum]', fs).textContent = 'Closed'; return; }
      if (!o.value || !c.value) { fieldError(c, 'Enter both times.'); return; }
      if (c.value <= o.value) { fieldError(c, 'Must be after the opening time.'); return; }
      h.open = o.value;
      h.close = c.value;
      $('[data-sum]', fs).textContent = `${fmtTime(h.open)} – ${fmtTime(h.close)}`;
    };
    view.addEventListener('change', (e) => {
      const fs = e.target.closest('.hours-row');
      if (!fs) return;
      rowState(fs);
      changed();
    });
    view.addEventListener('input', (e) => {
      const fs = e.target.closest('.hours-row');
      if (fs && e.target.type === 'time') { rowState(fs); changed(); }
    });
    $('[data-add-closure]', view).addEventListener('submit', (e) => {
      e.preventDefault();
      const dateEl = $('#cl-date', view);
      const v = dateEl.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { fieldError(dateEl, 'Choose a date.'); dateEl.focus(); return; }
      if (s.closures.some((c) => c.date === v)) { fieldError(dateEl, 'That day is already on the list.'); dateEl.focus(); return; }
      fieldError(dateEl, '');
      s.closures.push({ date: v, note: $('#cl-note', view).value.trim() });
      s.closures.sort((a, b) => (a.date < b.date ? -1 : 1));
      changed({ rerender: true, focus: '#cl-date' });
      toast(`Added ${fmtDay(v)} as a closed day.`, 'ok');
    });
    view.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.getAttribute('data-act') === 'del-closure') {
        const c = s.closures.splice(Number(b.getAttribute('data-i')), 1)[0];
        changed({ rerender: true, focus: '#cl-date' });
        toast(`Removed ${fmtDay(c.date)}.`);
      } else if (b.getAttribute('data-act') === 'clear-past') {
        s.closures = s.closures.filter((c) => c.date >= today);
        changed({ rerender: true, focus: '#cl-date' });
        toast('Removed past days.');
      }
    });
  }

  /* ------------------------------------------------------------------ announcement and ordering */
  function viewOrdering(main) {
    const s = state.draft.site;
    const o = s.ordering;
    const view = doc.createElement('div');
    view.className = 'view';
    view.innerHTML =
      '<div class="view__head"><div><h1 tabindex="-1">Announcement & ordering</h1></div></div>' +
      '<section class="card" aria-labelledby="ann-title"><h2 id="ann-title">Announcement bar</h2>' +
        '<p class="muted">The pink bar at the top of every page. Leave it empty to hide the bar.</p>' +
        '<div class="field"><label for="ann-text">Announcement</label>' +
          `<textarea class="input" id="ann-text" rows="2" maxlength="200" aria-describedby="ann-count">${esc(s.announcement)}</textarea>` +
          `<p class="hint" id="ann-count"><span data-count>${s.announcement.length}</span> of 200 characters</p></div>` +
        '<p class="label">Preview</p>' +
        `<div class="ann-preview" data-preview>${s.announcement ? `${esc(s.announcement)} · <u>Order online</u>` : '<em>The bar is hidden.</em>'}</div>` +
      '</section>' +
      '<section class="card" aria-labelledby="ord-title"><h2 id="ord-title">Ordering rules</h2>' +
        '<div class="grid-2">' +
          `<div class="field"><label for="o-cutoff">Order cutoff time</label><input class="input" id="o-cutoff" type="time" step="900" value="${esc(o.cutoff)}" aria-describedby="o-cutoff-hint">` +
            '<p class="hint" id="o-cutoff-hint">Orders placed before this time can be ready the next day.</p></div>' +
          `<div class="field"><label for="o-lead">Days of notice for every order</label><input class="input input--num" id="o-lead" type="number" min="0" max="14" step="1" value="${o.leadDays}" aria-describedby="o-lead-hint">` +
            '<p class="hint" id="o-lead-hint">1 = next day. Items and categories can ask for more.</p></div>' +
          `<div class="field"><label for="o-max">How many days ahead customers can order</label><input class="input input--num" id="o-max" type="number" min="1" max="120" step="1" value="${o.maxDaysAhead}"></div>` +
          '<div class="field"><label for="o-window">Pickup and delivery time slots</label><select class="input" id="o-window">' +
            [60, 90, 120, 180, 240].map((m) => `<option value="${m}"${o.windowMinutes === m ? ' selected' : ''}>${m % 60 ? `${m / 60} hours` : plural(m / 60, 'hour')}</option>`).join('') +
          '</select></div>' +
        '</div>' +
        '<fieldset class="field"><legend>Delivery days</legend><div class="checks checks--row">' +
          WEEK.map((d) => `<label class="check"><input type="checkbox" name="o-days" value="${d}"${o.deliveryDays.includes(d) ? ' checked' : ''}><span>${DAY[d]}</span></label>`).join('') +
        '</div><p class="hint" data-days-hint></p></fieldset>' +
      '</section>';
    main.appendChild(view);
    const hint = () => {
      $('[data-days-hint]', view).textContent = o.deliveryDays.length ? '' : 'With no delivery days, customers can only choose pickup.';
    };
    hint();
    view.addEventListener('input', (e) => {
      const t = e.target;
      if (t.id === 'ann-text') {
        s.announcement = t.value.replace(/\s+/g, ' ');
        $('[data-count]', view).textContent = t.value.length;
        $('[data-preview]', view).innerHTML = s.announcement.trim() ? `${esc(s.announcement.trim())} · <u>Order online</u>` : '<em>The bar is hidden.</em>';
        changed();
      }
    });
    view.addEventListener('change', (e) => {
      const t = e.target;
      if (t.id === 'o-cutoff') {
        if (!/^\d{2}:\d{2}$/.test(t.value)) { fieldError(t, 'Enter a time.'); return; }
        fieldError(t, '');
        o.cutoff = t.value;
      } else if (t.id === 'o-lead' || t.id === 'o-max') {
        const n = Number(t.value);
        const [min, max] = t.id === 'o-lead' ? [0, 14] : [1, 120];
        if (!Number.isInteger(n) || n < min || n > max) { fieldError(t, `Use a whole number from ${min} to ${max}.`); return; }
        fieldError(t, '');
        o[t.id === 'o-lead' ? 'leadDays' : 'maxDaysAhead'] = n;
      } else if (t.id === 'o-window') {
        o.windowMinutes = Number(t.value);
      } else if (t.name === 'o-days') {
        o.deliveryDays = $$('input[name="o-days"]:checked', view).map((x) => Number(x.value)).sort();
        hint();
      } else return;
      changed();
    });
  }

  /* ------------------------------------------------------------------ farmers markets */
  function viewMarkets(main) {
    const s = state.draft.site;
    s.markets.sort((a, b) => WEEK.indexOf(a.day) - WEEK.indexOf(b.day));
    const used = new Set(s.markets.map((m) => m.day));
    const free = WEEK.filter((d) => !used.has(d));
    const view = doc.createElement('div');
    view.className = 'view';
    view.innerHTML =
      '<div class="view__head"><div><h1 tabindex="-1">Farmers markets</h1>' +
        '<p class="muted">The market days and locations shown on the home page and the Farmers Market page. Each name links to Google Maps.</p></div>' +
        (free.length ? '<div class="view__actions"><form class="inline-form" data-add-day novalidate>' +
          '<div class="field"><label for="mk-new">Add a market day</label><select class="input" id="mk-new">' +
          free.map((d) => `<option value="${d}">${DAY[d]}</option>`).join('') + '</select></div>' +
          `<button type="submit" class="btn btn--primary">${icon('plus')}Add day</button></form></div>` : '') +
      '</div>' +
      (s.markets.length ? '' : '<p class="empty">No market days. The market sections on the website will be empty.</p>') +
      s.markets.map((m, mi) => `<section class="card market" data-m="${mi}" aria-labelledby="mk-${mi}-title">` +
        `<header class="group__head"><h2 id="mk-${mi}-title">${DAY[m.day]}</h2>` +
        `<button type="button" class="btn btn--danger-quiet btn--sm" data-act="del-day">${icon('trash')}Remove ${DAY[m.day]}</button></header>` +
        `<ul class="sec-list">${m.locations.map((l, li) => `<li data-l="${li}"><label class="sr-only" for="mk-${mi}-${li}">${DAY[m.day]} market ${li + 1}</label>` +
          `<input class="input" id="mk-${mi}-${li}" maxlength="60" value="${esc(l)}" placeholder="Market name">` +
          `<button type="button" class="icon-btn" data-act="loc-up" aria-label="Move up"${li === 0 ? ' disabled' : ''}>${icon('up')}</button>` +
          `<button type="button" class="icon-btn" data-act="loc-down" aria-label="Move down"${li === m.locations.length - 1 ? ' disabled' : ''}>${icon('down')}</button>` +
          `<button type="button" class="icon-btn icon-btn--danger" data-act="loc-del" aria-label="Remove ${esc(l || 'this market')}"${m.locations.length === 1 ? ' disabled' : ''}>${icon('trash')}</button></li>`).join('')}</ul>` +
        `<button type="button" class="btn btn--quiet btn--sm" data-act="loc-add">${icon('plus')}Add market on ${DAY[m.day]}</button>` +
        '</section>').join('');
    main.appendChild(view);
    const addDay = $('[data-add-day]', view);
    if (addDay) addDay.addEventListener('submit', (e) => {
      e.preventDefault();
      const day = Number($('#mk-new', view).value);
      s.markets.push({ day, locations: [''] });
      s.markets.sort((a, b) => WEEK.indexOf(a.day) - WEEK.indexOf(b.day));
      const mi = s.markets.findIndex((m) => m.day === day);
      changed({ rerender: true, focus: `[data-m="${mi}"] input` });
    });
    view.addEventListener('input', (e) => {
      const sec = e.target.closest('[data-m]'), li = e.target.closest('[data-l]');
      if (!sec || !li) return;
      const m = s.markets[Number(sec.getAttribute('data-m'))];
      m.locations[Number(li.getAttribute('data-l'))] = e.target.value;
      fieldError(e.target, e.target.value.trim() ? '' : 'Enter a name, or remove this line.');
      changed();
    });
    view.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const sec = b.closest('[data-m]');
      const mi = sec ? Number(sec.getAttribute('data-m')) : -1;
      const m = s.markets[mi];
      const act = b.getAttribute('data-act');
      const li = b.closest('[data-l]') ? Number(b.closest('[data-l]').getAttribute('data-l')) : -1;
      if (act === 'del-day') {
        const ok = await ask({ title: `Remove ${DAY[m.day]} markets?`, text: `${plural(m.locations.filter(Boolean).length, 'market')} will be removed from the website.`, ok: 'Remove', danger: true });
        if (!ok) return;
        const snap = clone(state.draft);
        s.markets.splice(mi, 1);
        changed({ rerender: true, focus: 'h1' });
        toastUndo(`Removed ${DAY[m.day]} markets.`, snap);
      } else if (act === 'loc-add') {
        m.locations.push('');
        changed({ rerender: true, focus: `[data-m="${mi}"] [data-l="${m.locations.length - 1}"] input` });
      } else if (act === 'loc-del') {
        m.locations.splice(li, 1);
        changed({ rerender: true, focus: `[data-m="${mi}"] [data-act="loc-add"]` });
      } else if (act === 'loc-up' || act === 'loc-down') {
        const to = act === 'loc-up' ? li - 1 : li + 1;
        [m.locations[li], m.locations[to]] = [m.locations[to], m.locations[li]];
        const edge = act === 'loc-up' ? to === 0 : to === m.locations.length - 1;
        changed({ rerender: true, focus: `[data-m="${mi}"] [data-l="${to}"] [data-act="${edge ? (act === 'loc-up' ? 'loc-down' : 'loc-up') : act}"]` });
      }
    });
  }

  /* ------------------------------------------------------------------ wholesale page */
  function viewWholesale(main) {
    withWholesale(state.draft);
    const w = state.draft.site.wholesale;
    ['categories', 'products', 'terms', 'photos'].forEach((k) => { if (!Array.isArray(w[k])) w[k] = []; });
    const view = doc.createElement('div');
    view.className = 'view ws';
    const moveBtns = (i, len, what) =>
      `<button type="button" class="icon-btn" data-act="up" aria-label="Move ${what} up"${i === 0 ? ' disabled' : ''}>${icon('up')}</button>` +
      `<button type="button" class="icon-btn" data-act="down" aria-label="Move ${what} down"${i === len - 1 ? ' disabled' : ''}>${icon('down')}</button>` +
      `<button type="button" class="icon-btn icon-btn--danger" data-act="del" aria-label="Remove ${what}">${icon('trash')}</button>`;
    const counter = (id, v, max) => `<p class="hint" id="${id}-count"><span data-count-for="${id}">${String(v || '').length}</span> of ${max} characters</p>`;
    const full = (k) => w[k].length >= WS_LIMIT[k];
    const addBtn = (list, label) => `<button type="button" class="btn btn--quiet btn--sm" data-act="add" data-list="${list}"${full(list) ? ' disabled' : ''}>${icon('plus')}${label}</button>` +
      (full(list) ? `<span class="hint"> The limit is ${WS_LIMIT[list]}.</span>` : '');
    const siteLink = state.siteUrl ? `<a class="btn btn--quiet btn--sm" href="${esc(new URL('wholesale.html', new URL(state.siteUrl, location.href)).href)}" target="_blank" rel="noopener">${icon('external')}See the wholesale page<span class="sr-only"> (opens in a new tab)</span></a>` : '';

    view.innerHTML =
      '<div class="view__head"><div><h1 tabindex="-1">Wholesale</h1>' +
        '<p class="muted">Everything on the website’s Wholesale page: the introduction, what you supply, a price list, how ordering works, photos, and whether you’re taking new accounts.</p></div>' +
        (siteLink ? `<div class="view__actions">${siteLink}</div>` : '') + '</div>' +

      // 1. accounts on/off
      '<section class="card" aria-labelledby="ws-acc-title"><h2 id="ws-acc-title">New wholesale accounts</h2>' +
        `<label class="switch"><input type="checkbox" id="ws-accepting"${w.accepting ? ' checked' : ''}><span>Taking new wholesale accounts</span></label>` +
        `<p class="hint" data-acc-hint>${w.accepting ? 'The inquiry form is shown on the page.' : 'The inquiry form is hidden, and the message below is shown instead.'}</p>` +
        `<div class="field field--gap"><label for="ws-closed">Message when you’re not taking new accounts</label>` +
          `<textarea class="input" id="ws-closed" rows="2" maxlength="300" aria-describedby="ws-closed-count">${esc(w.closedMessage)}</textarea>${counter('ws-closed', w.closedMessage, 300)}</div>` +
      '</section>' +

      // 2. intro
      '<section class="card" aria-labelledby="ws-intro-title"><h2 id="ws-intro-title">Introduction</h2>' +
        '<div class="field"><label for="ws-intro">Text next to the photo at the top of the page</label>' +
          `<textarea class="input" id="ws-intro" rows="4" maxlength="600" aria-describedby="ws-intro-count">${esc(w.intro)}</textarea>${counter('ws-intro', w.intro, 600)}</div>` +
      '</section>' +

      // 3. categories
      '<section class="card" aria-labelledby="ws-cat-title"><h2 id="ws-cat-title">What we can supply</h2>' +
        '<p class="muted">The boxes under “What we can supply”. Leave the list empty to hide them.</p>' +
        (w.categories.length ? `<ol class="ws-list">${w.categories.map((c, i) => `<li class="ws-item" data-list="categories" data-i="${i}">` +
          '<div class="ws-item__fields">' +
            `<div class="field"><label for="ws-cat-${i}-t">Name</label><input class="input" id="ws-cat-${i}-t" data-k="title" maxlength="60" value="${esc(c.title)}" placeholder="e.g. Breads"></div>` +
            `<div class="field"><label for="ws-cat-${i}-d">Description</label><textarea class="input" id="ws-cat-${i}-d" data-k="text" rows="2" maxlength="400">${esc(c.text)}</textarea></div>` +
          `</div><div class="ws-item__acts">${moveBtns(i, w.categories.length, esc(c.title || `box ${i + 1}`))}</div></li>`).join('')}</ol>` : '<p class="empty">No boxes. This part of the page is hidden.</p>') +
        addBtn('categories', 'Add a box') +
      '</section>' +

      // 4. price list
      '<section class="card" aria-labelledby="ws-pr-title"><h2 id="ws-pr-title">Wholesale price list</h2>' +
        '<p class="muted">Products you offer to businesses, with pack sizes and minimum orders. The price list only appears on the page when it has at least one product.</p>' +
        `<label class="switch"><input type="checkbox" id="ws-show-prices"${w.showPrices ? ' checked' : ''}><span>Show prices on the website</span></label>` +
        '<p class="hint">When this is off, the list shows products without prices and asks businesses to call or send the form for pricing. Products with no price show “Call”.</p>' +
        `<div class="field field--gap"><label for="ws-note">Note under the price list (shown with prices)</label><input class="input" id="ws-note" maxlength="200" value="${esc(w.priceNote)}" placeholder="e.g. Prices are per unit before tax."></div>` +
        (w.products.length ? `<ol class="ws-list">${w.products.map((p, i) => `<li class="ws-item" data-list="products" data-i="${i}">` +
          '<div class="ws-item__fields ws-grid">' +
            `<div class="field ws-grid__name"><label for="ws-pr-${i}-name">Product</label><input class="input" id="ws-pr-${i}-name" data-k="name" maxlength="90" value="${esc(p.name)}" placeholder="e.g. Classic baguette"></div>` +
            `<div class="field"><label for="ws-pr-${i}-pack">Pack size</label><input class="input" id="ws-pr-${i}-pack" data-k="pack" maxlength="60" value="${esc(p.pack)}" placeholder="e.g. Case of 12"></div>` +
            `<div class="field"><label for="ws-pr-${i}-price">Price <span class="muted">(optional)</span></label><input class="input" id="ws-pr-${i}-price" data-k="price" inputmode="decimal" autocomplete="off" value="${esc(typeof p.price === 'number' ? priceInput(p.price) : (p.price || ''))}" placeholder="$0.00"></div>` +
            `<div class="field"><label for="ws-pr-${i}-min">Minimum order</label><input class="input" id="ws-pr-${i}-min" data-k="minQty" maxlength="60" value="${esc(p.minQty)}" placeholder="e.g. 2 cases"></div>` +
            `<div class="field ws-grid__note"><label for="ws-pr-${i}-note">Note <span class="muted">(optional)</span></label><input class="input" id="ws-pr-${i}-note" data-k="note" maxlength="140" value="${esc(p.note)}" placeholder="e.g. Par-baked available"></div>` +
          `</div><div class="ws-item__acts">${moveBtns(i, w.products.length, esc(p.name || `product ${i + 1}`))}</div></li>`).join('')}</ol>` : '<p class="empty">No products yet. The price list is hidden on the website.</p>') +
        addBtn('products', 'Add a product') +
      '</section>' +

      // 5. terms
      '<section class="card" aria-labelledby="ws-terms-title"><h2 id="ws-terms-title">How wholesale works</h2>' +
        '<p class="muted">Short points about ordering: minimum order, notice needed, delivery area and days, payment terms. Shown as a checklist. Leave empty to hide.</p>' +
        (w.terms.length ? `<ul class="sec-list">${w.terms.map((t, i) => `<li data-list="terms" data-i="${i}"><label class="sr-only" for="ws-term-${i}">Point ${i + 1}</label>` +
          `<input class="input" id="ws-term-${i}" data-k="term" maxlength="200" value="${esc(t)}" placeholder="e.g. Order by 3 PM for next-day delivery">` +
          `${moveBtns(i, w.terms.length, `point ${i + 1}`)}</li>`).join('')}</ul>` : '<p class="empty">No points. This part of the page is hidden.</p>') +
        addBtn('terms', 'Add a point') +
      '</section>' +

      // 6. photos
      '<section class="card" aria-labelledby="ws-ph-title"><h2 id="ws-ph-title">Photos</h2>' +
        '<p class="muted">Your photos appear first in the “Fresh from our kitchen” strip, before the bakery’s existing photos. JPEG, PNG, WebP or iPhone photos; they’re resized automatically.</p>' +
        (w.photos.length ? `<ol class="ws-photos">${w.photos.map((ph, i) => `<li class="ws-photo" data-list="photos" data-i="${i}">` +
          `<div class="ws-photo__img">${photoUrl(ph.img, 'thumb') ? `<img src="${esc(photoUrl(ph.img, 'thumb'))}" alt="">` : `<div class="photo-box__empty">${icon('photo')}<span>Not available here</span></div>`}</div>` +
          `<div class="field"><label for="ws-ph-${i}-alt">Description</label><input class="input" id="ws-ph-${i}-alt" data-k="alt" maxlength="140" value="${esc(ph.alt)}" placeholder="e.g. Baguettes on a cooling rack"></div>` +
          `<div class="ws-photo__acts">` +
            `<button type="button" class="icon-btn" data-act="up" aria-label="Move photo ${i + 1} earlier"${i === 0 ? ' disabled' : ''}>${icon('left')}</button>` +
            `<button type="button" class="icon-btn" data-act="down" aria-label="Move photo ${i + 1} later"${i === w.photos.length - 1 ? ' disabled' : ''}>${icon('right')}</button>` +
            `<button type="button" class="icon-btn icon-btn--danger" data-act="del" aria-label="Remove photo ${i + 1}">${icon('trash')}</button></div>` +
          '</li>').join('')}</ol>` : '<p class="empty">No extra photos. The page shows the bakery’s existing photos.</p>') +
        (full('photos') ? `<p class="hint">The limit is ${WS_LIMIT.photos} photos.</p>` :
          `<label class="btn btn--quiet btn--sm file-btn">${icon('upload')}<span>Upload photos</span>` +
          '<input type="file" class="sr-only" multiple data-ws-photo-input accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-describedby="ws-ph-status"></label>') +
        '<p class="hint" id="ws-ph-status" role="status" aria-live="polite" data-ws-ph-status></p>' +
      '</section>';
    main.appendChild(view);

    const itemOf = (el) => {
      const li = el.closest('[data-list]');
      return li ? { list: li.getAttribute('data-list'), i: Number(li.getAttribute('data-i')) } : null;
    };
    const blank = { categories: () => ({ title: '', text: '' }), products: () => ({ name: '', pack: '', price: null, minQty: '', note: '' }), terms: () => '' };
    const firstField = { categories: (i) => `#ws-cat-${i}-t`, products: (i) => `#ws-pr-${i}-name`, terms: (i) => `#ws-term-${i}`, photos: (i) => `#ws-ph-${i}-alt` };

    view.addEventListener('input', (e) => {
      const t = e.target;
      const cnt = $(`[data-count-for="${t.id}"]`, view);
      if (cnt) cnt.textContent = t.value.length;
      if (t.id === 'ws-intro') w.intro = t.value;
      else if (t.id === 'ws-closed') w.closedMessage = t.value;
      else if (t.id === 'ws-note') w.priceNote = t.value;
      else {
        const at = itemOf(t);
        if (!at || !t.hasAttribute('data-k')) return;
        const k = t.getAttribute('data-k');
        if (at.list === 'terms') w.terms[at.i] = t.value;
        else if (k === 'price') {
          const v = t.value.trim();
          const n = parsePrice(v);
          w.products[at.i].price = v === '' ? null : (n == null ? v : n);
          fieldError(t, v === '' || n != null ? '' : 'Enter a price like 4.50, or leave it empty.');
        } else {
          w[at.list][at.i][k] = t.value;
          if (at.list === 'products' && k === 'name') fieldError(t, '');
        }
      }
      changed();
    });
    view.addEventListener('change', async (e) => {
      const t = e.target;
      if (t.id === 'ws-accepting') {
        w.accepting = t.checked;
        $('[data-acc-hint]', view).textContent = w.accepting ? 'The inquiry form is shown on the page.' : 'The inquiry form is hidden, and the message below is shown instead.';
        changed();
      } else if (t.id === 'ws-show-prices') {
        w.showPrices = t.checked;
        changed();
      } else if (t.hasAttribute('data-k') && t.getAttribute('data-k') === 'price') {
        const n = parsePrice(t.value);
        if (n != null) t.value = priceInput(n);
      } else if (t.hasAttribute('data-ws-photo-input')) {
        const files = Array.from(t.files || []);
        t.value = '';
        if (!files.length) return;
        const status = $('[data-ws-ph-status]', view);
        const room = WS_LIMIT.photos - w.photos.length;
        const todo = files.slice(0, room);
        let added = 0, failed = '';
        view.classList.add('is-busy');
        for (let n = 0; n < todo.length; n++) {
          status.textContent = todo.length > 1 ? `Preparing photo ${n + 1} of ${todo.length}…` : 'Preparing the photo…';
          try {
            const { full: big, thumb } = await preparePhoto(todo[n]);
            status.textContent = todo.length > 1 ? `Uploading photo ${n + 1} of ${todo.length}…` : 'Uploading…';
            const res = await state.backend.upload(big, thumb);
            w.photos.push({ img: res.ref, alt: '' });
            added++;
          } catch (ex) {
            failed = ex.code === 'signed_out' ? 'Your login ended. Log in again to upload.' : (ex.message || 'A photo couldn’t be uploaded.');
            if (ex.code === 'signed_out') break;
          }
        }
        view.classList.remove('is-busy');
        const skipped = files.length - todo.length;
        const msg = [
          added ? `${plural(added, 'photo')} added. Add a short description to each, then publish.` : '',
          failed,
          skipped ? `${plural(skipped, 'photo')} skipped (the limit is ${WS_LIMIT.photos}).` : '',
        ].filter(Boolean).join(' ');
        if (added) {
          changed({ rerender: true, focus: firstField.photos(w.photos.length - added) });
          const st = $('#admin-main [data-ws-ph-status]');
          if (st) st.textContent = msg;
        } else status.textContent = msg;
      }
    });
    view.addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      const act = b.getAttribute('data-act');
      if (act === 'add') {
        const list = b.getAttribute('data-list');
        if (full(list)) return;
        w[list].push(blank[list]());
        changed({ rerender: true, focus: firstField[list](w[list].length - 1) });
        return;
      }
      const at = itemOf(b);
      if (!at) return;
      const arr = w[at.list];
      if (act === 'del') {
        const snap = clone(state.draft);
        const what = { categories: 'box', products: 'product', terms: 'point', photos: 'photo' }[at.list];
        const entry = arr[at.i];
        const label = at.list === 'products' ? entry.name : at.list === 'categories' ? entry.title : '';
        arr.splice(at.i, 1);
        const next = arr.length ? firstField[at.list](Math.min(at.i, arr.length - 1)) : `[data-act="add"][data-list="${at.list}"]`;
        changed({ rerender: true, focus: at.list === 'photos' && !arr.length ? '#ws-ph-title' : next });
        toastUndo(`Removed ${label ? `“${label}”` : `the ${what}`}.`, snap);
      } else if (act === 'up' || act === 'down') {
        const to = act === 'up' ? at.i - 1 : at.i + 1;
        if (to < 0 || to >= arr.length) return;
        [arr[at.i], arr[to]] = [arr[to], arr[at.i]];
        const edge = act === 'up' ? to === 0 : to === arr.length - 1;
        const keep = edge ? (act === 'up' ? 'down' : 'up') : act;
        changed({ rerender: true, focus: `[data-list="${at.list}"][data-i="${to}"] [data-act="${keep}"]` });
      }
    });
  }

  /* ------------------------------------------------------------------ history and backup */
  function viewHistory(main) {
    const view = doc.createElement('div');
    view.className = 'view';
    view.innerHTML =
      '<div class="view__head"><div><h1 tabindex="-1">History & backup</h1>' +
        '<p class="muted">Every publish is saved here. Restoring a version publishes it again, so it goes live right away.</p></div></div>' +
      '<section class="card" aria-labelledby="hist-title"><h2 id="hist-title">Published versions</h2><div data-versions aria-busy="true"><p class="muted">Loading…</p></div></section>' +
      '<section class="card" aria-labelledby="bk-title"><h2 id="bk-title">Backup</h2>' +
        '<p class="muted">Download a copy of the menu and business info (including changes you haven’t published), or load one back in to review and publish.</p>' +
        '<div class="btn-row">' +
          `<button type="button" class="btn btn--quiet" data-act="download">${icon('download')}Download backup</button>` +
          `<label class="btn btn--quiet file-btn">${icon('upload')}<span>Load a backup</span><input type="file" class="sr-only" accept="application/json,.json" data-backup-input></label>` +
          '<button type="button" class="btn btn--quiet" data-act="reset-original">Start again from the original menu</button>' +
        '</div><p class="hint" data-backup-status aria-live="polite"></p></section>';
    main.appendChild(view);
    const box = $('[data-versions]', view);
    state.backend.history().then((list) => {
      box.removeAttribute('aria-busy');
      if (!list.length) {
        box.innerHTML = '<p class="empty">Nothing published yet. The website shows the menu and hours from its own files.</p>';
        return;
      }
      box.innerHTML = `<ul class="list">${list.map((v, i) => `<li><span><strong>Version ${v.version}</strong>${i === 0 ? ' <span class="badge badge--ok">Live now</span>' : ''}` +
        `<br><span class="muted small">${esc(fmtStamp(v.savedAt))}${v.note ? ` · ${esc(v.note)}` : ''}</span></span>` +
        (i === 0 ? '' : `<button type="button" class="btn btn--quiet btn--sm" data-act="restore" data-v="${v.version}">${icon('history')}Restore<span class="sr-only"> version ${v.version}</span></button>`) +
        '</li>').join('')}</ul>`;
    }).catch((ex) => {
      box.removeAttribute('aria-busy');
      box.innerHTML = `<p class="form-error">${esc(ex.message)}</p>`;
    });
    view.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.getAttribute('data-act');
      if (act === 'restore') {
        const v = Number(b.getAttribute('data-v'));
        const ok = await ask({
          title: `Restore version ${v}?`, ok: 'Restore and publish',
          text: isDirty() ? 'This publishes version ' + v + ' right away and replaces your unpublished changes.' : `This publishes version ${v} right away. You can undo it by restoring the current version afterwards.`,
        });
        if (!ok) return;
        b.disabled = true;
        try {
          const res = await state.backend.restore(v);
          await state.backend.preload([res.doc]);
          state.published = { version: res.version, savedAt: res.savedAt, doc: res.doc };
          state.draft = clone(res.doc);
          store.del(DRAFT_KEY);
          changed({ rerender: true, focus: 'h1' });
          toast(`Restored version ${v}. It’s live now.`, 'ok');
        } catch (ex) {
          b.disabled = false;
          if (ex.code === 'signed_out') handleSaveError(ex); else toast(ex.message, 'error');
        }
      } else if (act === 'download') {
        const data = JSON.stringify({ app: 'bouledepain-admin', exportedAt: new Date().toISOString(), doc: normalized(state.draft) }, null, 2);
        const a = doc.createElement('a');
        a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        a.download = `bouledepain-backup-${todayLA()}.json`;
        doc.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        $('[data-backup-status]', view).textContent = 'Backup downloaded.';
      } else if (act === 'reset-original') {
        const ok = await ask({ title: 'Start again from the original menu?', text: 'Your draft is replaced with the menu and hours from the website files. Nothing changes on the website until you publish.', ok: 'Start again', danger: true });
        if (!ok) return;
        state.draft = clone(state.original);
        changed({ rerender: true, focus: 'h1' });
        toast('Draft reset to the original menu. Publish to make it live.');
      }
    });
    $('[data-backup-input]', view).addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      const status = $('[data-backup-status]', view);
      if (!file) return;
      try {
        if (file.size > 5 * 1024 * 1024) throw new Error('That file is too large to be a backup.');
        const parsed = JSON.parse(await file.text());
        const d = parsed && parsed.doc;
        if (!d || !d.site || !d.menu || !Array.isArray(d.menu.categories) || !Array.isArray(d.site.hours)) throw new Error('That file isn’t a Boule de Pain backup.');
        const problems = problemsIn(d);
        if (problems.length) throw new Error(`The backup has a problem: ${problems[0].message}`);
        const ok = await ask({ title: 'Load this backup?', text: `It replaces your current draft (backup from ${fmtStamp(Date.parse(parsed.exportedAt)) || 'an unknown date'}). Nothing changes on the website until you publish.`, ok: 'Load backup' });
        if (!ok) return;
        state.draft = normalize(d);
        await state.backend.preload([d]);
        changed({ rerender: true, focus: 'h1' });
        toast('Backup loaded. Review it, then publish.', 'ok');
      } catch (ex) {
        status.textContent = ex instanceof SyntaxError ? 'That file isn’t a Boule de Pain backup.' : ex.message;
      }
    });
  }

  /* ------------------------------------------------------------------ login and security */
  function viewSecurity(main) {
    const test = state.backend.kind === 'local';
    const view = doc.createElement('div');
    view.className = 'view';
    view.innerHTML =
      '<div class="view__head"><div><h1 tabindex="-1">Login & security</h1></div></div>' +
      (test
        ? '<section class="card"><h2>Test mode</h2>' +
            `<p>You’re using test mode on this computer (username <code>${TEST_USER}</code>, passcode <code>${TEST_PASS}</code>). It only saves in this browser. The live panel uses the username and passcode you set in Cloudflare, and it won’t accept a passcode shorter than 12 characters.</p>` +
            `<label class="switch"><input type="checkbox" data-act="preview"${localBackend.previewOn() ? ' checked' : ''}><span>Show published test changes on this copy of the website</span></label>` +
            `<p class="btn-row"><button type="button" class="btn btn--danger-quiet" data-act="reset-test">${icon('trash')}Reset test data</button></p></section>`
        : '<section class="card"><h2>Your login</h2>' +
            `<p>Logged in as <strong>${esc(state.user)}</strong>. Logins end after 60 minutes without activity, or after 8 hours.</p>` +
            '<p>To change the username or passcode, double-click <strong>Set admin passcode</strong> in the boule-de-pain-admin folder. Changing it logs everyone out.</p>' +
            `<p class="btn-row"><button type="button" class="btn btn--quiet" data-act="logout-all">${icon('logout')}Log out on all devices</button></p></section>` +
          '<section class="card" aria-labelledby="act-title"><h2 id="act-title">Recent activity</h2><div data-activity aria-busy="true"><p class="muted">Loading…</p></div></section>') +
      '<section class="card"><h2>How the panel is protected</h2><ul class="bullets">' +
        '<li>The passcode is checked on the server and never stored in the website files.</li>' +
        '<li>After 5 wrong tries, logins from that network are locked for 15 minutes, and longer each time it happens again.</li>' +
        '<li>Your login is kept in a secure cookie that scripts can’t read, and it ends on its own.</li>' +
        '<li>Changes are only accepted from this panel, and every change is checked before it’s saved.</li>' +
        '<li>Photos must be real JPG, PNG or WebP images.</li>' +
      '</ul><p class="muted small">Use a long passcode that you don’t use anywhere else, and don’t share it by text or email.</p></section>';
    main.appendChild(view);
    const box = $('[data-activity]', view);
    if (box) {
      const LABELS = { login: 'Logged in', login_failed: 'Wrong passcode', login_blocked: 'Login blocked (too many tries)', publish: 'Published', photo_upload: 'Photo uploaded', logout_all: 'Logged out everywhere' };
      state.backend.activity().then((r) => {
        box.removeAttribute('aria-busy');
        box.innerHTML = r.events.length
          ? `<table class="table"><thead><tr><th scope="col">When</th><th scope="col">What</th><th scope="col">Network</th></tr></thead><tbody>${r.events.map((ev) =>
            `<tr class="${ev.action === 'login_failed' || ev.action === 'login_blocked' ? 'is-warn' : ''}"><td>${esc(fmtStamp(ev.at))}</td><td>${esc(LABELS[ev.action] || ev.action)}${ev.detail ? ` · ${esc(ev.detail)}` : ''}</td><td><code>${esc(ev.ip)}</code></td></tr>`).join('')}</tbody></table>`
          : '<p class="empty">No activity yet.</p>';
      }).catch((ex) => { box.removeAttribute('aria-busy'); box.innerHTML = `<p class="form-error">${esc(ex.message)}</p>`; });
    }
    view.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.getAttribute('data-act');
      if (act === 'logout-all') {
        const ok = await ask({ title: 'Log out on all devices?', text: 'Everyone using the admin panel, including you, will need to log in again.', ok: 'Log out everywhere', danger: true });
        if (!ok) return;
        try { await state.backend.logoutAll(); } catch (ex) { /* ignore */ }
        if (isDirty()) store.trySet(DRAFT_KEY, { base: state.published.version, savedAt: Date.now(), doc: state.draft });
        state.draft = null;
        renderLogin({ message: 'You’re logged out on all devices.' });
      } else if (act === 'reset-test') {
        const ok = await ask({ title: 'Reset test data?', text: 'All test changes, history and photos in this browser are deleted. The live website isn’t affected.', ok: 'Reset test data', danger: true });
        if (!ok) return;
        await localBackend.reset();
        store.del(DRAFT_KEY);
        await startApp();
        state.tab = 'security';
        renderTab('h1');
        toast('Test data reset.');
      }
    });
    view.addEventListener('change', (e) => {
      if (e.target.getAttribute('data-act') === 'preview') {
        localBackend.setPreview(e.target.checked);
        toast(e.target.checked ? 'This copy of the website shows your published test changes.' : 'This copy of the website shows the menu from its files.');
      }
    });
  }

  /* ------------------------------------------------------------------ start */
  async function startTestMode() {
    state.backend = localBackend;
    state.siteUrl = 'index.html';
    state.user = TEST_USER;
    const s = await localBackend.session();
    if (s.authenticated) await startApp(); else renderLogin();
  }

  async function boot() {
    const bootMsg = $('[data-boot]');
    try {
      if (IS_SERVER) {
        state.backend = serverBackend;
        const s = await serverBackend.session();
        state.siteUrl = s.siteUrl || '';
        state.user = s.user || '';
        if (s.authenticated) await startApp(); else renderLogin({ setup: s.setup });
        return;
      }
      const live = adminUrlFromSite();
      if (!IS_LOCAL) { renderLinkPage(live); return; }
      if (live) { renderChooser(live); return; }
      await startTestMode();
    } catch (ex) {
      if (bootMsg) bootMsg.textContent = `The admin panel couldn’t start: ${ex.message}`;
      else app().innerHTML = `<p class="boot">The admin panel couldn’t start: ${esc(ex.message)}</p>`;
    }
  }
  const origLogin = serverBackend.login;
  serverBackend.login = async (u, p) => {
    const r = await origLogin(u, p);
    const s = await serverBackend.session();
    state.user = s.user || u;
    state.siteUrl = s.siteUrl || state.siteUrl;
    return r;
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();
