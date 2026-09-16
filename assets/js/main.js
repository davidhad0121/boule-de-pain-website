/* Boule de Pain — shared site behaviour (no dependencies) */
(function () {
  'use strict';

  var SITE = window.SITE || {};
  var doc = document;
  doc.documentElement.classList.add('js');

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function icon(name, cls) {
    return '<svg class="icon ' + (cls || '') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>';
  }
  var moneyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  function money(n) { return moneyFmt.format(n || 0); }
  var systemReduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // "Stop animations" in the accessibility options counts too
  function motionOff() { return systemReduce || doc.documentElement.classList.contains('a11y-still'); }

  /* ---------- Safe storage (private mode / blocked storage never breaks the page) ---------- */
  var store = {
    get: function (key, fallback) {
      try { var v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    }
  };

  /* ---------- Time, always in the bakery's time zone ---------- */
  var TZ = SITE.timezone || 'America/Los_Angeles';
  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function nowLocal() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    var get = function (t) { var p = parts.find(function (x) { return x.type === t; }); return p ? Number(p.value) : 0; };
    var hour = get('hour') % 24;
    var date = new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
    return { date: date, weekday: date.getUTCDay(), minutes: hour * 60 + get('minute') };
  }
  function toMin(hhmm) { var p = String(hhmm).split(':'); return Number(p[0]) * 60 + Number(p[1] || 0); }
  function fmtTime(mins, always) {
    var h = Math.floor(mins / 60), m = mins % 60, ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return (m || always) ? h + ':' + String(m).padStart(2, '0') + ' ' + ap : h + ' ' + ap;
  }
  function addDays(d, n) { return new Date(d.getTime() + n * 864e5); }
  function isoDate(d) { return d.toISOString().slice(0, 10); }
  function parseISO(s) { var p = String(s).split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); }
  function fmtDate(d, opts) {
    return d.toLocaleDateString('en-US', Object.assign({ timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }, opts || {}));
  }
  function hoursForDay(day) {
    return (SITE.hours || []).find(function (h) { return h.day === day; }) || null;
  }
  function hoursFor(d) {
    if ((SITE.closedDates || []).indexOf(isoDate(d)) > -1) return null;
    var h = hoursForDay(d.getUTCDay());
    return h && h.open && h.close ? { open: toMin(h.open), close: toMin(h.close) } : null;
  }

  function closureNote(d) {
    var notes = SITE.closureNotes || {};
    return notes[isoDate(d)] || '';
  }
  function storeStatus() {
    var n = nowLocal();
    var today = hoursFor(n.date);
    var note = today ? '' : closureNote(n.date);
    if (today && n.minutes >= today.open && n.minutes < today.close) {
      var left = today.close - n.minutes;
      return { open: true, text: left <= 60 ? 'Open · closes soon (' + fmtTime(today.close) + ')' : 'Open now · until ' + fmtTime(today.close) };
    }
    if (today && n.minutes < today.open) return { open: false, text: 'Closed · opens today at ' + fmtTime(today.open) };
    var label = note ? 'Closed today (' + note + ')' : 'Closed';
    for (var i = 1; i <= 14; i++) {
      var d = addDays(n.date, i), h = hoursFor(d);
      if (h) return { open: false, text: label + ' · opens ' + (i === 1 ? 'tomorrow' : DAY_NAMES[d.getUTCDay()]) + ' at ' + fmtTime(h.open) };
    }
    return { open: false, text: label };
  }

  /* Hours lists: grouped ("compact") or one row per day ("full"), rendered from site-config.js */
  function groupedHours() {
    var order = [1, 2, 3, 4, 5, 6, 0], groups = [];
    order.forEach(function (day) {
      var h = hoursForDay(day), key = h && h.open ? h.open + '-' + h.close : 'closed';
      var last = groups[groups.length - 1];
      if (last && last.key === key && last.days[last.days.length - 1] === order[order.indexOf(day) - 1]) last.days.push(day);
      else groups.push({ key: key, days: [day], h: h });
    });
    return groups.map(function (g) {
      var label = g.days.length > 2 ? DAY_SHORT[g.days[0]] + ' – ' + DAY_SHORT[g.days[g.days.length - 1]]
        : g.days.length === 2 ? DAY_SHORT[g.days[0]] + ' & ' + DAY_SHORT[g.days[1]] : DAY_NAMES[g.days[0]];
      var time = g.h && g.h.open ? fmtTime(toMin(g.h.open)) + ' – ' + fmtTime(toMin(g.h.close)) : 'Closed';
      return { days: g.days, label: label, time: time };
    });
  }
  function renderHours() {
    var wd = nowLocal().weekday;
    $$('[data-hours]').forEach(function (list) {
      var mode = list.getAttribute('data-hours');
      var rows = mode === 'full'
        ? [1, 2, 3, 4, 5, 6, 0].map(function (day) {
            var h = hoursForDay(day);
            return { days: [day], label: DAY_NAMES[day], time: h && h.open ? fmtTime(toMin(h.open)) + ' – ' + fmtTime(toMin(h.close)) : 'Closed' };
          })
        : groupedHours();
      list.innerHTML = rows.map(function (r) {
        var today = r.days.indexOf(wd) > -1;
        return '<li data-days="' + r.days.join(',') + '"' + (today ? ' class="is-today" aria-current="date"' : '') +
          '><span class="hours__day">' + esc(r.label) + '</span><span class="hours__time">' + esc(r.time) + '</span></li>';
      }).join('');
    });
  }
  function renderStatus() {
    var s = storeStatus();
    $$('[data-status]').forEach(function (el) {
      el.textContent = s.text;
      el.hidden = false;
      el.classList.toggle('is-open', s.open);
      el.classList.toggle('is-closed', !s.open);
    });
  }

  /* ---------- Text that follows the ordering rules (cutoff, delivery days) ---------- */
  var WEEK = [1, 2, 3, 4, 5, 6, 0];
  function dayList(days, style, join) {
    var ds = WEEK.filter(function (d) { return days.indexOf(d) > -1; });
    if (!ds.length) return '';
    var names = ds.map(function (d) { return DAY_NAMES[d]; });
    var idx = ds.map(function (d) { return WEEK.indexOf(d); });
    var contiguous = idx.every(function (v, i) { return v === idx[0] + i; });
    if (ds.length >= 3 && contiguous && style !== 'list') {
      return names[0] + ({ dash: '–', to: ' to ' }[style] || ' through ') + names[names.length - 1];
    }
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(', ') + ' ' + (join || 'and') + ' ' + names[names.length - 1];
  }
  function deliveryDays() { return ((SITE.ordering || {}).deliveryDays || [1, 2, 3, 4, 5]).slice(); }
  function renderRules() {
    var on = deliveryDays();
    var off = [0, 1, 2, 3, 4, 5, 6].filter(function (d) { return on.indexOf(d) < 0; });
    var cutoff = fmtTime(toMin((SITE.ordering || {}).cutoff || '15:00'));
    $$('[data-cutoff-time]').forEach(function (el) { el.textContent = cutoff; });
    $$('[data-days]').forEach(function (el) {
      var list = el.getAttribute('data-days') === 'off' ? off : on;
      el.textContent = dayList(list, el.getAttribute('data-style'), el.getAttribute('data-join'));
    });
    $$('[data-if-days]').forEach(function (el) {
      el.hidden = !(el.getAttribute('data-if-days') === 'off' ? off : on).length;
    });
  }
  function hoursText(sep) {
    return groupedHours().map(function (g) { return g.label + (sep === 'inline' ? ' ' : ': ') + g.time; });
  }
  function renderHeaderHours() {
    $$('[data-hours-text]').forEach(function (el) {
      var parts = hoursText();
      el.textContent = '';
      parts.forEach(function (t, i) {
        el.appendChild(doc.createTextNode(t));
        if (i === parts.length - 1) return;
        if (i === 1) el.appendChild(doc.createElement('br'));
        else el.appendChild(doc.createTextNode(' \u00a0·\u00a0 '));
      });
    });
    $$('[data-hours-inline]').forEach(function (el) { el.textContent = hoursText('inline').join('; '); });
  }
  function renderAnnouncement() {
    var text = String(SITE.announcement || '').trim();
    $$('[data-announce]').forEach(function (bar) {
      bar.hidden = !text;
      var t = $('[data-announce-text]', bar);
      if (t && text) t.textContent = text;
    });
  }

  /* ---------- Photos: the bakery's Wix library, or photos uploaded in the admin panel ---------- */
  var WIX = 'https://static.wixstatic.com/media/';
  function imgUrl(ref, w, h) {
    if (!ref) return '';
    if (String(ref).indexOf('upload:') === 0) {
      return window.BDP_LIVE && BDP_LIVE.imgUrl ? BDP_LIVE.imgUrl(ref, Math.max(w, h) <= 480 ? 'thumb' : 'full') : '';
    }
    return WIX + ref + '/v1/fill/w_' + w + ',h_' + h + ',al_c,q_80,usm_0.66_1.00_0.01,enc_auto/' + String(ref).replace(/~/g, '_');
  }
  function liveData() {
    var live = window.BDP_LIVE;
    return live && live.source !== 'files' && live.menu ? live : null;
  }

  /* Farmers markets as published in the admin panel */
  function renderMarketsLive() {
    if (!liveData() || !Array.isArray(SITE.markets)) return;
    var markets = SITE.markets.slice().sort(function (a, b) { return WEEK.indexOf(a.day) - WEEK.indexOf(b.day); });
    var count = markets.reduce(function (n, m) { return n + m.locations.length; }, 0);
    $$('[data-market-count]').forEach(function (el) { el.textContent = String(count); });
    $$('[data-market-days]').forEach(function (el) {
      el.textContent = dayList(markets.map(function (m) { return m.day; }), 'list', 'and');
    });
    $$('.market-grid').forEach(function (grid) {
      var photos = {};
      $$('[data-market-day]', grid).forEach(function (card) {
        var im = $('img', card);
        if (im) photos[card.getAttribute('data-market-day')] = im;
      });
      var fallback = $('img', grid);
      grid.textContent = '';
      markets.forEach(function (m) {
        var card = doc.createElement('article');
        card.className = 'market-card reveal is-in';
        card.setAttribute('data-market-day', String(m.day));
        card.setAttribute('data-market-names', m.locations.join(', '));
        var badge = doc.createElement('span');
        badge.className = 'market-card__badge';
        badge.setAttribute('aria-live', 'off');
        card.appendChild(badge);
        var photo = photos[String(m.day)] || fallback;
        if (photo) card.appendChild(photo.cloneNode(true));
        var h = doc.createElement('h3');
        h.className = 'market-card__day';
        h.textContent = DAY_NAMES[m.day];
        card.appendChild(h);
        var ul = doc.createElement('ul');
        ul.className = 'market-list';
        m.locations.forEach(function (name) {
          var li = doc.createElement('li');
          var a = doc.createElement('a');
          a.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(name === 'Channel Islands' ? 'Channel Islands Harbor Farmers Market' : name + ' Farmers Market');
          a.target = '_blank';
          a.rel = 'noopener';
          a.textContent = name;
          a.insertAdjacentHTML('beforeend', icon('external') + '<span class="sr-only"> — open in Google Maps (new tab)</span>');
          li.appendChild(a);
          ul.appendChild(li);
        });
        card.appendChild(ul);
        grid.appendChild(card);
      });
    });
  }

  /* Home page bestsellers follow the "Bestseller" switch in the admin panel */
  function renderBestsellers() {
    var live = liveData();
    var grid = $('[data-bestsellers]');
    if (!live || !grid) return;
    var groups = live.menu.addonGroups || {};
    var picks = [];
    live.menu.categories.forEach(function (cat) {
      (cat.groups || [{ items: cat.items || [] }]).forEach(function (g) {
        g.items.forEach(function (it) { if (it.popular && !it.hidden) picks.push({ it: it, id: cat.id + '.' + it.slug }); });
      });
    });
    var section = grid.closest('section');
    if (section) section.hidden = !picks.length;
    if (!picks.length) return;
    var photos = {};
    $$('[data-best-id]', grid).forEach(function (card) {
      var im = $('.best-card__img', card);
      if (im) photos[card.getAttribute('data-best-id')] = im;
    });
    grid.textContent = '';
    picks.slice(0, 6).forEach(function (p) {
      var it = p.it;
      var card = doc.createElement('article');
      card.className = 'best-card reveal is-in';
      card.setAttribute('data-best-id', p.id);
      var media;
      var uploaded = it.img && String(it.img).indexOf('upload:') === 0;
      if (photos[p.id] && !uploaded) {
        media = photos[p.id];
      } else if (it.img) {
        media = doc.createElement('div');
        media.className = 'best-card__img';
        var im = doc.createElement('img');
        im.src = imgUrl(it.img, 800, 800);
        if (!uploaded) im.srcset = imgUrl(it.img, 400, 400) + ' 400w, ' + imgUrl(it.img, 800, 800) + ' 800w';
        im.sizes = '(min-width: 1180px) 370px, (min-width: 720px) 30vw, 100vw';
        im.width = 800;
        im.height = 800;
        im.alt = it.name;
        im.loading = 'lazy';
        im.decoding = 'async';
        media.appendChild(im);
      }
      if (media) card.appendChild(media);
      var h = doc.createElement('h3');
      h.textContent = it.name;
      card.appendChild(h);
      var price = doc.createElement('p');
      price.className = 'best-card__price';
      price.textContent = (it.sizes && it.sizes.length ? 'From ' : '') + money(it.price);
      card.appendChild(price);
      var needsChoice = (it.sizes && it.sizes.length) || (it.addons || []).some(function (gid) { return groups[gid]; });
      if (it.soldOut) {
        var sold = doc.createElement('p');
        sold.className = 'best-card__sold';
        sold.textContent = 'Sold out today';
        card.appendChild(sold);
      } else if (needsChoice) {
        var link = doc.createElement('a');
        link.className = 'btn btn--outline btn--sm';
        link.href = 'order.html#item=' + encodeURIComponent(p.id);
        link.innerHTML = icon('plus') + 'Choose options<span class="sr-only"> for ' + esc(it.name) + '</span>';
        card.appendChild(link);
      } else {
        var btn = doc.createElement('button');
        btn.className = 'btn btn--outline btn--sm';
        btn.type = 'button';
        btn.setAttribute('data-add-to-cart', p.id);
        btn.setAttribute('data-name', it.name);
        btn.innerHTML = icon('plus') + 'Add to order<span class="sr-only"> — ' + esc(it.name) + '</span>';
        card.appendChild(btn);
      }
      grid.appendChild(card);
    });
  }

  /* ---------- Farmers market: "Today" / "Next up" ---------- */
  function renderMarkets() {
    var cards = $$('[data-market-day]');
    if (!cards.length) return;
    var n = nowLocal();
    var best = null;
    cards.forEach(function (c) {
      var day = Number(c.getAttribute('data-market-day'));
      var offset = (day - n.weekday + 7) % 7;
      if (!best || offset < best.offset) best = { offset: offset, day: day, card: c };
    });
    cards.forEach(function (c) {
      var day = Number(c.getAttribute('data-market-day'));
      var isToday = day === n.weekday;
      var isNext = !isToday && best && best.offset > 0 && day === best.day;
      c.classList.toggle('is-today', isToday);
      c.classList.toggle('is-next', isNext);
      var badge = $('.market-card__badge', c);
      if (badge) badge.textContent = isToday ? 'Today' : isNext ? (best.offset === 1 ? 'Tomorrow' : 'Next up') : '';
    });
    $$('[data-market-next]').forEach(function (el) {
      if (!best) return;
      var when = best.offset === 0 ? 'Today' : best.offset === 1 ? 'Tomorrow' : 'This ' + DAY_NAMES[best.day];
      el.textContent = '';
      var chip = doc.createElement('span'); chip.className = 'chip';
      chip.textContent = best.offset === 0 ? 'Find us today' : 'Next market day';
      var strong = doc.createElement('strong'); strong.textContent = when;
      var names = doc.createElement('span'); names.textContent = best.card.getAttribute('data-market-names');
      el.appendChild(chip); el.appendChild(strong); el.appendChild(names);
      el.hidden = false;
    });
  }

  /* ---------- Navigation ---------- */
  function initNav() {
    var toggle = $('[data-nav-toggle]'), nav = $('#site-nav'), header = $('.site-header');
    if (!toggle || !nav) return;
    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (open && header && !window.matchMedia('(min-width: 1080px)').matches) {
        nav.style.paddingTop = Math.round(header.getBoundingClientRect().bottom + 12) + 'px';
      } else if (!open) {
        nav.style.paddingTop = '';
      }
      nav.classList.toggle('is-open', open);
      if (header) header.classList.toggle('nav-open', open);
      doc.body.classList.toggle('is-locked', open);
    }
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      setOpen(open);
      if (open) { var first = $('.nav-list a', nav); if (first) setTimeout(function () { first.focus(); }, 50); }
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    doc.addEventListener('keydown', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setOpen(false); toggle.focus(); return; }
      if (e.key !== 'Tab') return;
      var f = [toggle].concat($$('.nav-list a, .nav-extra a, .nav-extra button', nav));
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    var mq = matchMedia('(min-width: 1080px)');
    var reset = function () { if (mq.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', reset); else mq.addListener(reset);

    var sentinel = $('[data-nav-sentinel]');
    if (sentinel && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        nav.classList.toggle('is-stuck', !entries[0].isIntersecting);
      }).observe(sentinel);
    }
  }

  /* ---------- Cart (shared by every page; item details live on the order page) ----------
     A line is { key, id, qty, size?, addons?: [{ group, name, price }], note? }.
     Lines with the same item and the same choices are merged. */
  var CART_KEY = 'bdp-cart-v2';
  function lineKey(l) {
    var addons = (l.addons || []).map(function (a) { return a.group + ':' + a.name; }).sort().join('|');
    return [l.id, l.size || '', addons, (l.note || '').trim().toLowerCase()].join('~');
  }
  var cart = (function () {
    var items = store.get(CART_KEY, null);
    if (!Array.isArray(items)) {
      // carry over carts saved by the first version of the site
      var old = store.get('bdp-cart-v1', []);
      items = Array.isArray(old) ? old.map(function (l) { return { id: l.id, qty: l.qty }; }) : [];
    }
    items = items.filter(function (l) { return l && l.id && l.qty > 0; }).map(function (l) {
      l.key = lineKey(l);
      return l;
    });
    var subs = [];
    function emit() { subs.forEach(function (fn) { fn(items.slice()); }); }
    function save() { store.set(CART_KEY, items); emit(); }
    function find(key) { return items.findIndex(function (l) { return l.key === key; }); }
    var api = {
      all: function () { return items.map(function (l) { return Object.assign({}, l); }); },
      line: function (key) { var i = find(key); return i > -1 ? Object.assign({}, items[i]) : null; },
      qtyFor: function (id) { return items.reduce(function (s, l) { return s + (l.id === id ? l.qty : 0); }, 0); },
      addLine: function (line, qty) {
        var l = { id: line.id, qty: 0 };
        if (line.size) l.size = line.size;
        if (line.addons && line.addons.length) l.addons = line.addons.map(function (a) { return { group: a.group, name: a.name, price: a.price }; });
        if (line.note && line.note.trim()) l.note = line.note.trim();
        l.key = lineKey(l);
        var i = find(l.key);
        var n = Math.max(1, Math.floor(Number(qty) || 1));
        if (i > -1) items[i].qty = Math.min(99, items[i].qty + n);
        else { l.qty = Math.min(99, n); items.push(l); }
        save();
        return l.key;
      },
      setQty: function (key, qty) {
        var i = find(key);
        if (i < 0) return;
        qty = Math.max(0, Math.min(99, Math.floor(Number(qty) || 0)));
        if (qty === 0) items.splice(i, 1); else items[i].qty = qty;
        save();
      },
      replaceLine: function (oldKey, line, qty) {
        var i = find(oldKey);
        if (i > -1) items.splice(i, 1);
        return api.addLine(line, qty);
      },
      removeLine: function (key) { api.setQty(key, 0); },
      add: function (id, n) { return api.addLine({ id: id }, n == null ? 1 : n); },
      clear: function () { items = []; save(); },
      count: function () { return items.reduce(function (s, l) { return s + l.qty; }, 0); },
      prune: function (isValid) {
        var before = items.length;
        items = items.filter(isValid);
        if (items.length !== before) save();
      },
      subscribe: function (fn) { subs.push(fn); }
    };
    window.addEventListener('storage', function (e) {
      if (e.key === CART_KEY) { items = store.get(CART_KEY, []) || []; emit(); }
    });
    return api;
  })();

  function renderCartCount() {
    var n = cart.count();
    $$('[data-cart-count]').forEach(function (el) {
      var prev = Number(el.textContent) || 0;
      el.textContent = n;
      el.classList.toggle('has-items', n > 0);
      if (n > prev) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
    $$('[data-cart-label]').forEach(function (el) {
      el.setAttribute('aria-label', n ? 'View your order, ' + n + ' item' + (n === 1 ? '' : 's') : 'View your order (empty)');
    });
  }

  /* ---------- Toasts ---------- */
  function toast(message, action) {
    var region = $('.toast-region');
    if (!region) return;
    var t = doc.createElement('div');
    t.className = 'toast';
    var span = doc.createElement('span');
    span.textContent = message;
    t.appendChild(span);
    if (action) {
      var a = doc.createElement('a');
      a.href = action.href || '#';
      a.textContent = action.label;
      if (action.onClick) a.addEventListener('click', action.onClick);
      t.appendChild(a);
    }
    region.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .3s';
      t.style.opacity = '0';
      setTimeout(function () { t.remove(); }, 320);
    }, 4200);
  }

  function initQuickAdd() {
    doc.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-add-to-cart]');
      if (!btn) return;
      cart.add(btn.getAttribute('data-add-to-cart'), 1);
      toast((btn.getAttribute('data-name') || 'Item') + ' added to your order', { label: 'View order', href: 'order.html#cart' });
    });
  }

  /* ---------- Forms: validation ---------- */
  function fieldError(input) {
    var v = input.validity;
    if (!v) return '';
    if (v.valid) {
      if (input.type === 'email' && input.value.trim() && !/@[^@\s]+\.[^@\s]{2,}$/.test(input.value.trim())) {
        return 'Please enter a valid email address, like name@example.com.';
      }
      if (input.type === 'tel' && input.value.trim() && input.value.replace(/\D/g, '').length < 10) {
        return 'Please enter a phone number with area code (10 digits).';
      }
      return '';
    }
    if (v.valueMissing) {
      if (input.type === 'radio') return 'Please choose an option.';
      if (input.tagName === 'SELECT') return 'Please choose an option.';
      return input.getAttribute('data-required') || 'This field is required.';
    }
    if (v.customError) return input.validationMessage;
    if (v.typeMismatch && input.type === 'email') return 'Please enter a valid email address, like name@example.com.';
    if (v.patternMismatch) return input.getAttribute('data-pattern') || 'Please check the format.';
    if (v.rangeUnderflow) return input.type === 'date' ? 'Please choose a later date.' : 'Please enter ' + input.min + ' or more.';
    if (v.rangeOverflow) return input.type === 'date' ? 'Please choose an earlier date.' : 'Please enter ' + input.max + ' or less.';
    if (v.badInput) return 'Please enter a valid value.';
    return 'Please check this field.';
  }
  function showFieldError(input, msg) {
    var field = input.closest('.field');
    if (!field) return;
    var err = $('.field__error', field);
    if (!err) {
      err = doc.createElement('p');
      err.className = 'field__error';
      err.id = (input.id || input.name || 'field') + '-error';
      field.appendChild(err);
    }
    err.textContent = msg || '';
    field.classList.toggle('is-invalid', !!msg);
    var group = input.type === 'radio' || input.type === 'checkbox' ? $$('input[name="' + input.name + '"]', field) : [input];
    group.forEach(function (el) {
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      var ids = (el.getAttribute('aria-describedby') || '').split(' ').filter(Boolean).filter(function (x) { return x !== err.id; });
      if (msg) ids.push(err.id);
      if (ids.length) el.setAttribute('aria-describedby', ids.join(' ')); else el.removeAttribute('aria-describedby');
    });
  }
  function isActive(input) {
    return !input.disabled && input.type !== 'hidden' && !input.closest('.hp') && !input.closest('[hidden]');
  }
  function validateForm(form) {
    var firstInvalid = null, seenGroups = {};
    $$('input, select, textarea', form).forEach(function (input) {
      if (!isActive(input)) return;
      if (input.type === 'radio') {
        if (seenGroups[input.name]) return;
        seenGroups[input.name] = true;
      }
      var msg = fieldError(input);
      showFieldError(input, msg);
      if (msg && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      if (firstInvalid.scrollIntoView && !motionOff()) firstInvalid.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    return !firstInvalid;
  }
  function bindLiveValidation(form) {
    form.addEventListener('focusout', function (e) {
      var el = e.target;
      if (!el.matches || !el.matches('input, select, textarea') || !isActive(el) || el.type === 'radio' || el.type === 'checkbox') return;
      if (el.value.trim() === '' && !el.closest('.field.is-invalid')) return; // don't nag on empty, untouched fields
      showFieldError(el, fieldError(el));
    });
    form.addEventListener('input', function (e) {
      var el = e.target;
      if (el.closest && el.closest('.field.is-invalid')) showFieldError(el, fieldError(el));
    });
    form.addEventListener('change', function (e) {
      var el = e.target;
      if (el.closest && el.closest('.field.is-invalid')) showFieldError(el, fieldError(el));
    });
  }
  function setStatus(form, type, html) {
    var box = $('.form-status', form) || $('.form-status', form.parentNode);
    if (!box) return;
    box.className = 'form-status is-visible is-' + type;
    box.innerHTML = html;
  }
  function clearStatus(form) {
    var box = $('.form-status', form) || $('.form-status', form.parentNode);
    if (box) { box.className = 'form-status'; box.innerHTML = ''; }
  }

  /* Human-readable "Label: value" lines for email bodies */
  function labelFor(el, form) {
    var fs = el.closest('fieldset');
    if ((el.type === 'checkbox' || el.type === 'radio') && fs && $('legend', fs)) return $('legend', fs).textContent;
    var lab = el.id ? $('label[for="' + el.id + '"]', form) : null;
    var text = lab ? lab.textContent : (el.getAttribute('aria-label') || el.name);
    return text.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  }
  function collectLines(form) {
    var lines = [], done = {};
    $$('input, select, textarea', form).forEach(function (el) {
      if (!el.name || done[el.name] || !isActive(el) || el.hasAttribute('data-skip-email')) return;
      var value;
      if (el.type === 'checkbox' || el.type === 'radio') {
        value = $$('input[name="' + el.name + '"]:checked', form).map(function (x) { return x.value; }).join(', ');
      } else {
        value = el.value.trim();
      }
      done[el.name] = true;
      if (value) lines.push(labelFor(el, form) + ': ' + value);
    });
    return lines;
  }
  function honeypotTripped(form) {
    var hp = $('.hp input', form);
    return !!(hp && hp.value);
  }

  /* ---------- Forms: sending ---------- */
  function sendForm(opts) {
    var cfg = SITE.forms || {};
    var provider = String(cfg.provider || 'mailto').toLowerCase();
    var form = opts.form;
    if ((provider === 'formspree' || provider === 'endpoint') && cfg.endpoint) {
      var fd = new FormData(form);
      fd.append('_subject', opts.subject);
      fd.append('form', opts.formName);
      if (opts.replyTo) fd.append('_replyto', opts.replyTo);
      return fetch(cfg.endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('Form service error ' + r.status); return { mode: 'sent' }; });
    }
    if (provider === 'netlify') {
      var body = new URLSearchParams(new FormData(form));
      body.set('subject', opts.subject);
      return fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
        .then(function (r) { if (!r.ok) throw new Error('Netlify form error ' + r.status); return { mode: 'sent' }; });
    }
    var to = cfg.to || SITE.email;
    var href = 'mailto:' + to + '?subject=' + encodeURIComponent(opts.subject) + '&body=' + encodeURIComponent(opts.lines.join('\n'));
    window.location.href = href;
    return Promise.resolve({ mode: 'mailto', href: href });
  }

  function contactFallbackHTML() {
    var p = (SITE.phones && SITE.phones.main) || {};
    return 'Nothing opened? Email <a href="mailto:' + esc(SITE.email) + '">' + esc(SITE.email) + '</a>' +
      (p.tel ? ' or call <a href="tel:' + esc(p.tel) + '">' + esc(p.display) + '</a>' : '') + '.';
  }

  function subjectFor(form) {
    var base = form.getAttribute('data-subject') || 'Website message';
    var get = function (n) { var el = form.elements[n]; return el && el.value ? el.value.trim() : ''; };
    var who = get('name') || [get('first_name'), get('last_name')].filter(Boolean).join(' ') || get('email');
    return who ? base + ' — ' + who : base;
  }

  function initForms() {
    $$('form[data-form]').forEach(function (form) {
      if (form.getAttribute('data-form') === 'order') return; // handled by order.js
      form.setAttribute('novalidate', '');
      bindLiveValidation(form);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearStatus(form);
        if (!validateForm(form)) {
          setStatus(form, 'error', 'Please fix the highlighted fields and try again.');
          return;
        }
        if (honeypotTripped(form)) return;
        var name = form.getAttribute('data-form');
        var lines = ['New ' + (form.getAttribute('data-subject') || 'message').toLowerCase() + ' from bouledepain.com', ''].concat(collectLines(form));
        form.classList.add('is-sending');
        var emailEl = form.elements.email;
        sendForm({ form: form, formName: name, subject: subjectFor(form), lines: lines, replyTo: emailEl ? emailEl.value : '' })
          .then(function (r) {
            if (r.mode === 'mailto') {
              setStatus(form, 'info', '<strong>Almost done!</strong> Your email app should open with your message filled in. Just press <strong>Send</strong>. ' + contactFallbackHTML());
            } else {
              window.location.href = 'thanks.html?form=' + encodeURIComponent(name);
            }
          })
          .catch(function () {
            setStatus(form, 'error', 'Sorry, that didn’t go through. Please try again. ' + contactFallbackHTML().replace('Nothing opened? ', ''));
          })
          .then(function () { form.classList.remove('is-sending'); });
      });
    });

    // Date inputs that shouldn't allow past dates
    var today = isoDate(nowLocal().date);
    $$('input[type="date"][data-min-today]').forEach(function (el) {
      var extra = Number(el.getAttribute('data-min-today')) || 0;
      el.min = isoDate(addDays(parseISO(today), extra));
    });

    // Gift cards: live preview of the chosen amount + optional online checkout link
    $$('[data-amount-preview]').forEach(function (out) {
      var form = out.closest('[data-giftcard]') || doc;
      $$('input[name="amount"]', form).forEach(function (r) {
        r.addEventListener('change', function () { out.textContent = '$' + r.value; });
      });
    });
    var buyUrl = SITE.giftCards && SITE.giftCards.buyUrl;
    $$('[data-giftcard-buy]').forEach(function (a) {
      if (buyUrl) { a.href = buyUrl; a.hidden = false; }
    });
  }

  /* ---------- Lightbox ---------- */
  function initLightbox() {
    var triggers = $$('[data-lightbox]');
    if (!triggers.length) return;
    var box = doc.createElement('div');
    box.className = 'lightbox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Photo viewer');
    box.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button class="icon-btn lightbox__close" type="button" aria-label="Close photo">' + icon('close') + '</button>' +
      '<button class="icon-btn lightbox__prev" type="button" aria-label="Previous photo">' + icon('arrow-left') + '</button>' +
      '<button class="icon-btn lightbox__next" type="button" aria-label="Next photo">' + icon('arrow-right') + '</button>';
    doc.body.appendChild(box);
    var img = $('img', box), cap = $('figcaption', box);
    var group = [], index = 0, opener = null;

    function show(i) {
      index = (i + group.length) % group.length;
      var t = group[index], thumb = $('img', t);
      img.src = t.getAttribute('data-full') || (thumb && thumb.currentSrc) || '';
      img.alt = thumb ? thumb.alt : '';
      cap.textContent = t.getAttribute('data-caption') || (thumb ? thumb.alt : '');
      var multi = group.length > 1;
      $('.lightbox__prev', box).hidden = !multi;
      $('.lightbox__next', box).hidden = !multi;
    }
    function open(t) {
      var name = t.getAttribute('data-lightbox');
      group = triggers.filter(function (x) { return x.getAttribute('data-lightbox') === name; });
      opener = t;
      show(group.indexOf(t));
      box.hidden = false;
      doc.body.classList.add('is-locked');
      $('.lightbox__close', box).focus();
    }
    function close() {
      box.hidden = true;
      img.src = '';
      doc.body.classList.remove('is-locked');
      if (opener) opener.focus();
    }
    triggers.forEach(function (t) {
      t.addEventListener('click', function (e) { e.preventDefault(); open(t); });
    });
    box.addEventListener('click', function (e) {
      if (e.target.closest('.lightbox__close') || e.target === box) close();
      else if (e.target.closest('.lightbox__prev')) show(index - 1);
      else if (e.target.closest('.lightbox__next')) show(index + 1);
    });
    doc.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(index - 1);
      else if (e.key === 'ArrowRight') show(index + 1);
      else if (e.key === 'Tab') {
        var f = $$('button:not([hidden])', box), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- Video (file lives in assets/video/) ---------- */
  function initVideos() {
    $$('[data-video]').forEach(function (block) {
      var video = $('video', block), btn = $('.video-block__play', block);
      if (!video || !btn) return;
      var source = $('source', video);
      var failed = false;
      function fail() {
        if (failed) return;
        failed = true;
        block.classList.remove('is-playing');
        btn.hidden = true;
        var note = doc.createElement('p');
        note.className = 'video-block__fallback';
        var ig = (SITE.social && SITE.social.instagram) || '#';
        note.innerHTML = 'Our market video is coming soon. For now, catch market-day moments on <a href="' + esc(ig) + '" target="_blank" rel="noopener">Instagram</a>.';
        block.appendChild(note);
      }
      btn.addEventListener('click', function () {
        block.classList.add('is-playing');
        video.controls = true;
        var p = video.play();
        if (p && p.catch) p.catch(function () { if (video.error || (video.networkState === 3)) fail(); });
        video.focus();
      });
      video.addEventListener('error', fail, true);
      if (source) source.addEventListener('error', fail);
      // On a real web server, check up front whether the video file has been added yet
      if (/^https?:/.test(location.protocol) && source && window.fetch) {
        fetch(source.getAttribute('src'), { method: 'HEAD' }).then(function (r) { if (!r.ok) fail(); }).catch(function () {});
      }
    });
  }

  /* ---------- Small helpers ---------- */
  function initReveal() {
    var els = $$('.reveal');
    if (!els.length) return;
    if (motionOff() || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }
  function initStrips() {
    $$('[data-strip]').forEach(function (strip) {
      var track = $('.strip__track', strip);
      $$('.strip__btn', strip).forEach(function (b) {
        b.addEventListener('click', function () {
          var dir = b.classList.contains('strip__btn--prev') ? -1 : 1;
          track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: motionOff() ? 'auto' : 'smooth' });
        });
      });
    });
  }
  function initCopy() {
    $$('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        var done = function () { toast('Copied: ' + text); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, function () { toast(text); });
        else toast(text);
      });
    });
  }
  function initScrollUI() {
    var bar = $('.action-bar'), top = $('.to-top');
    function onScroll() {
      var y = window.scrollY || 0;
      if (bar) bar.classList.toggle('is-visible', y > 420);
      if (top) top.classList.toggle('is-visible', y > 900);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (top) top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: motionOff() ? 'auto' : 'smooth' });
      var main = $('#main');
      if (main) main.focus({ preventScroll: true });
    });
  }
  function initThanks() {
    var box = $('[data-thanks]');
    if (!box) return;
    var kind = new URLSearchParams(location.search).get('form') || '';
    var copy = {
      order: ['Order request received!', 'Thank you! We’ll confirm your order by phone or email before we start baking.'],
      catering: ['Thanks for thinking of us!', 'We’ve got your event details and will reply with a custom catering quote soon.'],
      wholesale: ['Thanks for reaching out!', 'We’ll follow up with wholesale product and pricing details shortly.'],
      newsletter: ['You’re on the sweet side!', 'Thanks for subscribing. Watch your inbox for news, seasonal treats and market updates.'],
      giftcard: ['Gift card request received!', 'We’ll contact you to take payment and get your eGift card ready.'],
      contact: ['Message sent!', 'Thanks for getting in touch. We’ll get back to you soon.'],
      question: ['Question received!', 'Thanks for asking. We’ll get back to you soon.']
    }[kind];
    if (!copy) return;
    $('[data-thanks-title]', box).textContent = copy[0];
    $('[data-thanks-text]', box).textContent = copy[1];
  }

  /* ---------- Boot ---------- */
  function boot() {
    renderAnnouncement();
    renderHeaderHours();
    renderRules();
    renderMarketsLive();
    renderBestsellers();
    renderHours();
    renderStatus();
    renderMarkets();
    renderCartCount();
    cart.subscribe(renderCartCount);
    initNav();
    initQuickAdd();
    initForms();
    initLightbox();
    initVideos();
    initReveal();
    initStrips();
    initCopy();
    initScrollUI();
    initThanks();
    $$('[data-year]').forEach(function (el) { el.textContent = String(nowLocal().date.getUTCFullYear()); });
    setInterval(function () { renderStatus(); renderMarkets(); }, 60 * 1000);
  }

  window.BDP = {
    $: $, $$: $$, esc: esc, icon: icon, money: money, store: store, cart: cart, lineKey: lineKey, toast: toast,
    imgUrl: imgUrl, dayList: dayList,
    time: { nowLocal: nowLocal, toMin: toMin, fmtTime: fmtTime, addDays: addDays, isoDate: isoDate, parseISO: parseISO, fmtDate: fmtDate, hoursFor: hoursFor, closureNote: closureNote, DAY_NAMES: DAY_NAMES },
    forms: {
      validateForm: validateForm, showFieldError: showFieldError, fieldError: fieldError, bindLiveValidation: bindLiveValidation,
      setStatus: setStatus, clearStatus: clearStatus, collectLines: collectLines, sendForm: sendForm,
      honeypotTripped: honeypotTripped, contactFallbackHTML: contactFallbackHTML
    },
    get reduceMotion() { return motionOff(); }
  };

  // Wait for changes published from the admin panel (see live-data.js), then draw the page.
  var ready = window.BDP_LIVE && window.BDP_LIVE.ready;
  if (ready) ready.then(boot, boot);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
