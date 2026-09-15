/* Boule de Pain — online ordering
   Menu with search, item pop-up (pickup/delivery + date, sizes, add-ons, special requests),
   cart drawer and order requests. */
(function () {
  'use strict';

  function start() {
    var B = window.BDP, SITE = window.SITE || {}, MENU = window.MENU;
    var menuRoot = document.querySelector('[data-menu]');
    if (!B || !MENU || !menuRoot) return;

    var $ = B.$, $$ = B.$$, esc = B.esc, icon = B.icon, money = B.money, cart = B.cart, T = B.time, F = B.forms;
    var ORD = SITE.ordering || {};
    var GROUPS = MENU.addonGroups || {};
    var WIX = 'https://static.wixstatic.com/media/';

    function wixImg(id, w, h) {
      return WIX + id + '/v1/fill/w_' + w + ',h_' + h + ',al_c,q_80,usm_0.66_1.00_0.01,enc_auto/' + id.replace(/~/g, '_');
    }
    function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
    function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
    function round2(n) { return Math.round(n * 100) / 100; }
    function plus(n) { return n > 0 ? '+' + money(n) : 'Included'; }

    /* ---------- Menu index ---------- */
    var items = new Map();
    MENU.categories.forEach(function (cat) {
      (cat.groups || [{ title: '', items: cat.items || [] }]).forEach(function (g) {
        g.items.forEach(function (it) {
          var id = cat.id + '.' + it.slug;
          items.set(id, Object.assign({}, it, {
            id: id, cat: cat.id, catName: cat.name, section: g.title || '',
            notice: Math.max(it.notice || 0, cat.notice || 0)
          }));
        });
      });
    });

    function sizeOf(it, name) { return (it.sizes || []).find(function (s) { return s.name === name; }) || null; }
    function groupsFor(it, sizeName) {
      var ids = (it.addons || []).filter(function (gid) { return GROUPS[gid]; });
      if (!it.sizes) return ids;
      var size = sizeOf(it, sizeName);
      var key = size ? size.key : null;
      return ids.filter(function (gid) { return !GROUPS[gid].forSize || GROUPS[gid].forSize === key; });
    }
    function optionPrice(gid, name) {
      var g = GROUPS[gid];
      var o = g ? g.options.find(function (x) { return x.name === name; }) : null;
      return o ? o.price : null;
    }
    function requiredGroups(it, sizeName) {
      return groupsFor(it, sizeName).filter(function (gid) { return GROUPS[gid].required || GROUPS[gid].min > 0; });
    }
    function lineValid(l) {
      var it = items.get(l.id);
      if (!it) return false;
      if (it.sizes ? !sizeOf(it, l.size) : !!l.size) return false;
      var allowed = groupsFor(it, l.size);
      var picks = l.addons || [];
      if (picks.some(function (a) { return allowed.indexOf(a.group) < 0 || optionPrice(a.group, a.name) === null; })) return false;
      return requiredGroups(it, l.size).every(function (gid) {
        return picks.filter(function (a) { return a.group === gid; }).length >= Math.max(1, GROUPS[gid].min);
      });
    }
    function unitPrice(l) {
      var it = items.get(l.id);
      var base = it.sizes ? (sizeOf(it, l.size) || {}).price || it.price : it.price;
      var extra = (l.addons || []).reduce(function (s, a) { return s + (optionPrice(a.group, a.name) || 0); }, 0);
      return round2(base + extra);
    }
    function lineDetails(l) {
      var parts = [];
      if (l.size) parts.push(l.size);
      (l.addons || []).forEach(function (a) {
        var p = optionPrice(a.group, a.name);
        parts.push(a.name + (p ? ' (+' + money(p) + ')' : ''));
      });
      return parts;
    }
    // Lines saved before this version (or edited menus) that no longer make sense are dropped
    cart.prune(lineValid);

    /* ---------- Menu rendering ---------- */
    function badges(it) {
      var b = [];
      if (it.popular) b.push(['badge--pop', 'Bestseller']);
      (it.labels || []).forEach(function (l) { b.push(['badge--spice', l + ' spice']); });
      if (it.sizes) b.push(['', it.sizes.length + ' sizes']);
      var groups = it.addons || [];
      if (groups.some(function (g) { return GROUPS[g] && GROUPS[g].required; })) b.push(['', 'Choice of side']);
      else if (groups.length) b.push(['badge--pop', 'Extras available']);
      if (it.notice && !/advance/i.test(it.name) && !/advance/i.test(it.catName)) b.push(['badge--notice', it.notice + ' days’ notice']);
      return b;
    }
    function dishHTML(it, level) {
      var b = badges(it);
      var q = cart.qtyFor(it.id);
      var search = norm([it.name, it.desc, it.catName, it.section, (it.sizes || []).map(function (s) { return s.name; }).join(' ')].join(' '));
      return '<article class="dish' + (it.img ? '' : ' dish--noimg') + (q ? ' in-cart' : '') + '" data-id="' + esc(it.id) + '" data-search="' + esc(search) + '">' +
        '<div class="dish__body">' +
          '<h' + level + ' class="dish__name"><button type="button" class="dish__btn" data-open-item>' + esc(it.name) + '</button></h' + level + '>' +
          (it.desc ? '<p class="dish__desc">' + esc(it.desc) + '</p>' : '') +
          (b.length ? '<ul class="dish__badges">' + b.map(function (x) { return '<li class="badge ' + x[0] + '">' + esc(x[1]) + '</li>'; }).join('') + '</ul>' : '') +
          '<div class="dish__foot"><span class="dish__price">' + (it.sizes ? 'From ' : '') + money(it.price) + '</span>' +
            '<span class="dish__incart" data-incart' + (q ? '' : ' hidden') + '>' + q + ' in your order</span>' +
            '<span class="add-btn" aria-hidden="true">' + icon('plus') + 'Add</span></div>' +
        '</div>' +
        (it.img ? '<img class="dish__img" src="' + wixImg(it.img, 248, 248) + '" srcset="' + wixImg(it.img, 124, 124) + ' 1x, ' + wixImg(it.img, 248, 248) + ' 2x" width="124" height="124" alt="" loading="lazy" decoding="async">' : '') +
      '</article>';
    }
    function renderMenu() {
      menuRoot.innerHTML = MENU.categories.map(function (cat) {
        var groups = cat.groups || [{ title: '', items: cat.items || [] }];
        if (!groups.some(function (g) { return g.items.length; })) return '';
        return '<section class="menu-cat" id="cat-' + esc(cat.id) + '" aria-labelledby="cat-' + esc(cat.id) + '-title">' +
          '<div class="menu-cat__head"><h2 id="cat-' + esc(cat.id) + '-title">' + esc(cat.name) + '</h2>' +
          (cat.note ? '<p class="menu-cat__note' + (cat.notice ? ' menu-cat__note--alert' : '') + '">' + (cat.notice ? icon('info') : '') + '<span>' + esc(cat.note) + '</span></p>' : '') +
          '</div>' +
          groups.map(function (g) {
            return '<div class="menu-group-block">' + (g.title ? '<h3 class="menu-group">' + esc(g.title) + '</h3>' : '') +
              '<div class="menu-grid">' + g.items.map(function (it) {
                return dishHTML(items.get(cat.id + '.' + it.slug), g.title ? 4 : 3);
              }).join('') + '</div></div>';
          }).join('') +
        '</section>';
      }).join('');
      var nav = $('[data-cat-nav]');
      if (nav) {
        nav.innerHTML = MENU.categories.filter(function (c) {
          return (c.groups || [{ items: c.items || [] }]).some(function (g) { return g.items.length; });
        }).map(function (c) {
          return '<li><a href="#cat-' + esc(c.id) + '">' + esc(c.short || c.name) + '</a></li>';
        }).join('');
      }
    }
    renderMenu();

    function syncCards() {
      $$('.dish', menuRoot).forEach(function (card) {
        var q = cart.qtyFor(card.getAttribute('data-id'));
        card.classList.toggle('in-cart', q > 0);
        var badge = $('[data-incart]', card);
        badge.hidden = !q;
        badge.textContent = q + ' in your order';
      });
    }
    menuRoot.addEventListener('click', function (e) {
      var card = e.target.closest('.dish');
      if (!card || e.target.closest('a')) return;
      openItem(card.getAttribute('data-id'), { opener: $('[data-open-item]', card) });
    });

    /* Search */
    var search = $('#menu-search'), empty = $('[data-menu-empty]'), searchStatus = $('[data-search-status]');
    var timer = null;
    function applySearch() {
      var words = norm(search.value.trim()).split(/\s+/).filter(Boolean);
      var shown = 0;
      $$('.dish', menuRoot).forEach(function (card) {
        var hay = card.getAttribute('data-search');
        var match = words.every(function (w) { return hay.indexOf(w) > -1; });
        card.hidden = !match;
        if (match) shown++;
      });
      $$('.menu-group-block', menuRoot).forEach(function (g) { g.hidden = !$$('.dish', g).some(function (c) { return !c.hidden; }); });
      $$('.menu-cat', menuRoot).forEach(function (s) { s.hidden = !$$('.dish', s).some(function (c) { return !c.hidden; }); });
      $$('[data-cat-nav] a').forEach(function (a) {
        var sec = document.getElementById(a.getAttribute('href').slice(1));
        a.parentNode.hidden = !!(sec && sec.hidden);
      });
      if (empty) {
        empty.hidden = shown > 0;
        var qEl = $('[data-query]', empty);
        if (qEl) qEl.textContent = search.value.trim();
      }
      if (searchStatus) searchStatus.textContent = words.length ? plural(shown, 'item') + ' found' : '';
    }
    if (search) {
      search.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(applySearch, 120); });
      search.addEventListener('keydown', function (e) { if (e.key === 'Escape') { search.value = ''; applySearch(); } });
    }
    $$('[data-clear-search]').forEach(function (b) {
      b.addEventListener('click', function () { search.value = ''; applySearch(); search.focus(); });
    });

    /* Category chips follow the scroll position */
    var catNav = $('.cat-nav');
    function setActiveChip(id) {
      $$('[data-cat-nav] a').forEach(function (a) {
        var on = a.getAttribute('href') === '#' + id;
        a.classList.toggle('is-active', on);
        if (on) {
          a.setAttribute('aria-current', 'true');
          if (catNav) {
            var left = a.offsetLeft - catNav.clientWidth / 2 + a.clientWidth / 2;
            catNav.scrollTo({ left: Math.max(0, left), behavior: B.reduceMotion ? 'auto' : 'smooth' });
          }
        } else a.removeAttribute('aria-current');
      });
    }
    if ('IntersectionObserver' in window) {
      var visible = {};
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
        var first = $$('.menu-cat', menuRoot).find(function (s) { return visible[s.id] && !s.hidden; });
        if (first) setActiveChip(first.id);
      }, { rootMargin: '-35% 0px -55% 0px' });
      $$('.menu-cat', menuRoot).forEach(function (s) { spy.observe(s); });
    }

    /* ---------- Pickup / delivery rules ---------- */
    function cartNotice(extra) {
      return cart.all().reduce(function (m, l) {
        var it = items.get(l.id);
        return Math.max(m, it ? it.notice : 0);
      }, extra || 0);
    }
    function isAvailable(m, d) {
      if ((SITE.closedDates || []).indexOf(T.isoDate(d)) > -1) return false;
      if (m === 'delivery' && (ORD.deliveryDays || [1, 2, 3, 4, 5]).indexOf(d.getUTCDay()) < 0) return false;
      return !!T.hoursFor(d);
    }
    function earliest(m, notice) {
      var n = T.nowLocal();
      var pastCutoff = n.minutes >= T.toMin(ORD.cutoff || '15:00');
      var lead = Math.max(ORD.leadDays == null ? 1 : ORD.leadDays, notice || 0) + (pastCutoff ? 1 : 0);
      var d = T.addDays(n.date, lead);
      for (var i = 0; i < 30 && !isAvailable(m, d); i++) d = T.addDays(d, 1);
      return d;
    }
    function latest() { return T.addDays(T.nowLocal().date, ORD.maxDaysAhead || 42); }
    function windowsFor(m, d) {
      if (!d || !isAvailable(m, d)) return [];
      if (m === 'delivery' && ORD.deliveryWindows && ORD.deliveryWindows.length) return ORD.deliveryWindows.slice();
      var h = T.hoursFor(d), step = ORD.windowMinutes || 180, out = [];
      for (var t = h.open; t < h.close; t += step) {
        var end = Math.min(t + step, h.close);
        if (end - t >= 60) out.push(T.fmtTime(t, true) + ' – ' + T.fmtTime(end, true));
      }
      return out;
    }
    function dateProblem(m, d, notice) {
      var min = earliest(m, notice);
      if (d < min) return 'The earliest available date' + (notice ? ' for this order' : '') + ' is ' + T.fmtDate(min, { weekday: 'long' }) + '.';
      if (d > latest()) return 'Please choose a date within the next ' + (ORD.maxDaysAhead || 42) + ' days.';
      if (!isAvailable(m, d)) return m === 'delivery' ? 'We don’t deliver on weekends. Please choose a weekday.' : 'The bakery is closed that day. Please choose another date.';
      return '';
    }
    function fillWindows(select, m, d, keep) {
      var list = windowsFor(m, d);
      select.innerHTML = list.length
        ? '<option value="">Choose a time</option>' + list.map(function (w) { return '<option' + (w === keep ? ' selected' : '') + '>' + esc(w) + '</option>'; }).join('')
        : '<option value="">No times available that day</option>';
      if (list.length === 1) select.value = list[0];
    }

    /* ---------- Dispatch (how and when), remembered for the visit ---------- */
    var DKEY = 'bdp-dispatch-v1';
    var dispatch = B.store.get(DKEY, null);
    function dispatchOk(d, notice) {
      if (!d || (d.mode !== 'pickup' && d.mode !== 'delivery') || !d.date || !d.time) return false;
      var dt = T.parseISO(d.date);
      return !dateProblem(d.mode, dt, notice) && windowsFor(d.mode, dt).indexOf(d.time) > -1;
    }
    function currentMode() { return (dispatch && dispatch.mode) || 'pickup'; }
    function setDispatch(d, fromCheckout) {
      dispatch = d;
      B.store.set(DKEY, d);
      renderDispatchBar();
      if (!fromCheckout) updateCheckout();
    }
    function renderDispatchBar() {
      var ok = dispatchOk(dispatch, cartNotice());
      var label = $('[data-dispatch-label]'), detail = $('[data-dispatch-detail]'), btn = $('[data-dispatch-button]');
      var mode = currentMode();
      if (label) {
        if (ok) {
          label.textContent = (mode === 'delivery' ? 'Delivery' : 'Pickup') + ' · ' + T.fmtDate(T.parseISO(dispatch.date), { weekday: 'long' });
          detail.textContent = dispatch.time + ' · ' + (mode === 'delivery' ? 'Delivery in ' + (ORD.deliveryArea || 'our area') : 'Pickup at ' + SITE.address.street);
          btn.textContent = 'Change';
        } else {
          label.textContent = 'Pickup or delivery?';
          detail.textContent = 'Earliest pickup: ' + T.fmtDate(earliest('pickup', cartNotice()), { weekday: 'long' }) +
            ' · Earliest delivery: ' + T.fmtDate(earliest('delivery', cartNotice()), { weekday: 'long' });
          btn.textContent = 'Choose';
        }
        $$('[data-dispatch-icon]').forEach(function (el) { el.innerHTML = icon(ok && mode === 'delivery' ? 'truck' : ok ? 'store' : 'calendar'); });
      }
      var cutEl = $('[data-cutoff]');
      if (cutEl) {
        var n = T.nowLocal(), cut = T.toMin(ORD.cutoff || '15:00');
        if (n.minutes < cut) {
          var left = cut - n.minutes, h = Math.floor(left / 60), mm = left % 60;
          cutEl.textContent = 'Order in the next ' + (h ? h + ' hr ' : '') + mm + ' min for ' + T.fmtDate(earliest('delivery', 0), { weekday: 'long' }) + ' delivery';
        } else {
          cutEl.textContent = 'Orders placed before ' + T.fmtTime(cut) + ' are ready the next day';
        }
      }
    }

    /* ---------- Item pop-up ---------- */
    var modal = $('#item-modal');
    var mPanel = modal ? $('.modal__panel', modal) : null;
    var dForm = modal ? $('[data-modal-step="dispatch"]', modal) : null;
    var iForm = modal ? $('[data-modal-step="item"]', modal) : null;
    var pending = null; // { id, editKey, preset }
    var modalOpener = null;
    var qty = 1;

    function setContext(text) {
      var el = $('[data-modal-context]', modal);
      if (el) el.textContent = text;
    }
    function showModalStep(name) {
      $$('[data-modal-step]', modal).forEach(function (s) { s.hidden = s.getAttribute('data-modal-step') !== name; });
      var title = $('[data-modal-step="' + name + '"] .modal__title', modal);
      if (title) mPanel.setAttribute('aria-labelledby', title.id);
      var body = $('[data-modal-step="' + name + '"] .modal__body', modal);
      if (body) body.scrollTop = 0;
      setTimeout(function () { if (title) title.focus(); }, 30);
    }
    function openModal(opener) {
      if (modal.hidden) modalOpener = opener || document.activeElement;
      modal.hidden = false;
      document.body.classList.add('is-locked');
    }
    function closeModal() {
      if (!modal || modal.hidden) return;
      modal.hidden = true;
      pending = null;
      if (!drawer || drawer.hidden) document.body.classList.remove('is-locked');
      if (modalOpener && modalOpener.focus && document.contains(modalOpener)) modalOpener.focus();
    }

    function openItem(id, opts) {
      opts = opts || {};
      var it = items.get(id);
      if (!it || !modal) return;
      pending = { id: id, editKey: opts.editKey || null, preset: opts.preset || null };
      openModal(opts.opener);
      var notice = Math.max(cartNotice(), it.notice || 0);
      if (!opts.editKey && !dispatchOk(dispatch, notice)) openDispatch(it);
      else renderItem(it);
    }
    function openDispatchOnly(opener) {
      pending = null;
      openModal(opener);
      openDispatch(null);
    }

    function openDispatch(it) {
      var notice = Math.max(cartNotice(), it ? it.notice || 0 : 0);
      var mode = currentMode();
      $$('input[name="d-mode"]', dForm).forEach(function (r) { r.checked = r.value === mode; });
      var dateEl = $('#d-date', dForm), timeEl = $('#d-time', dForm);
      var min = earliest(mode, notice);
      dateEl.min = T.isoDate(min);
      dateEl.max = T.isoDate(latest());
      var cur = dispatch && dispatch.date ? T.parseISO(dispatch.date) : null;
      if (!cur || dateProblem(mode, cur, notice)) cur = min;
      dateEl.value = T.isoDate(cur);
      fillWindows(timeEl, mode, cur, dispatch && dispatch.time);
      F.showFieldError(dateEl, '');
      F.showFieldError(timeEl, '');
      updateDispatchText(it, notice);
      if (pending) pending.stepped = !!it;
      setContext(it ? 'Step 1 of 2 · Pickup or delivery' : 'Pickup or delivery');
      showModalStep('dispatch');
    }
    function updateDispatchText(it, notice) {
      var mode = $('input[name="d-mode"]:checked', dForm).value;
      var min = earliest(mode, notice);
      $('label[for="d-time"]', dForm).firstChild.nodeValue = mode === 'delivery' ? 'Delivery window ' : 'Pickup time ';
      $('[data-d-hint]', dForm).textContent = (mode === 'delivery' ? 'Deliveries run Monday to Friday. ' : 'Pickup at ' + SITE.address.street + ', ' + SITE.address.city + '. ') +
        'Earliest: ' + T.fmtDate(min, { weekday: 'long' }) + '.';
      var note = $('[data-d-note]', dForm);
      note.hidden = !(it && it.notice);
      if (it && it.notice) $('p', note).textContent = it.name + ' needs ' + it.notice + ' days’ notice, so earlier dates aren’t available.';
    }
    if (dForm) {
      F.bindLiveValidation(dForm);
      $$('input[name="d-mode"]', dForm).forEach(function (r) {
        r.addEventListener('change', function () {
          var it = pending ? items.get(pending.id) : null;
          var notice = Math.max(cartNotice(), it ? it.notice || 0 : 0);
          var dateEl = $('#d-date', dForm), timeEl = $('#d-time', dForm);
          var min = earliest(r.value, notice);
          dateEl.min = T.isoDate(min);
          var cur = dateEl.value ? T.parseISO(dateEl.value) : null;
          if (!cur || dateProblem(r.value, cur, notice)) { cur = min; dateEl.value = T.isoDate(min); }
          fillWindows(timeEl, r.value, cur, timeEl.value);
          F.showFieldError(dateEl, '');
          updateDispatchText(it, notice);
        });
      });
      $('#d-date', dForm).addEventListener('change', function () {
        var it = pending ? items.get(pending.id) : null;
        var notice = Math.max(cartNotice(), it ? it.notice || 0 : 0);
        var mode = $('input[name="d-mode"]:checked', dForm).value;
        var el = this, timeEl = $('#d-time', dForm);
        el.setCustomValidity('');
        var d = el.value ? T.parseISO(el.value) : null;
        if (d) el.setCustomValidity(dateProblem(mode, d, notice));
        F.showFieldError(el, F.fieldError(el));
        fillWindows(timeEl, mode, d && !el.validationMessage ? d : null, timeEl.value);
      });
      dForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var it = pending ? items.get(pending.id) : null;
        var notice = Math.max(cartNotice(), it ? it.notice || 0 : 0);
        var mode = $('input[name="d-mode"]:checked', dForm).value;
        var dateEl = $('#d-date', dForm);
        dateEl.setCustomValidity(dateEl.value ? dateProblem(mode, T.parseISO(dateEl.value), notice) : '');
        if (!F.validateForm(dForm)) return;
        setDispatch({ mode: mode, date: dateEl.value, time: $('#d-time', dForm).value });
        if (it) renderItem(it); else closeModal();
      });
    }

    function notePlaceholder(it) {
      if (it.cat === 'cakes' || it.cat === 'gluten-free') return 'Writing on the cake, allergies, other requests…';
      if (it.cat === 'lunch') return 'Allergies, leave something out, other requests…';
      return 'Allergies or other requests…';
    }
    function renderItem(it) {
      var preset = (pending && pending.preset) || {};
      var size = preset.size || (it.sizes ? it.sizes[0].name : '');
      qty = preset.qty || 1;
      var box = $('[data-item-body]', iForm);
      var mode = currentMode();
      box.innerHTML =
        (it.img ? '<img class="modal__img" src="' + wixImg(it.img, 960, 600) + '" width="960" height="600" alt="">' : '') +
        '<div class="modal__inner">' +
          '<div class="modal__dispatch">' + icon(mode === 'delivery' ? 'truck' : 'store') +
            '<span>' + (dispatch ? (mode === 'delivery' ? 'Delivery' : 'Pickup') + ' · ' + esc(T.fmtDate(T.parseISO(dispatch.date))) + ' · ' + esc(dispatch.time) : '') + '</span>' +
            '<button type="button" class="link-btn" data-change-dispatch>Change</button></div>' +
          '<h2 class="modal__title" id="item-modal-title" tabindex="-1">' + esc(it.name) + '</h2>' +
          ((it.labels || []).length ? '<ul class="dish__badges">' + it.labels.map(function (l) { return '<li class="badge badge--spice">' + esc(l) + ' spice</li>'; }).join('') + '</ul>' : '') +
          '<p class="modal__price">' + (it.sizes ? 'From ' : '') + money(it.price) + '</p>' +
          (it.desc ? '<p class="modal__desc">' + esc(it.desc) + '</p>' : '') +
          (it.notice ? '<p class="notice small">' + icon('calendar') + '<span>Needs ' + it.notice + ' days’ notice.</span></p>' : '') +
          (it.sizes ? '<fieldset class="opt-group" data-size-group><legend>Size <span class="opt-tag">Required</span></legend>' +
            it.sizes.map(function (s, i) {
              return '<label class="opt"><input type="radio" name="size" value="' + esc(s.name) + '"' + (s.name === size ? ' checked' : '') + ' required>' +
                '<span class="opt__name">' + esc(s.name) + '</span><span class="opt__price">' + money(s.price) + '</span></label>';
            }).join('') + '</fieldset>' : '') +
          '<div data-addon-groups></div>' +
          '<div class="field"><label for="i-note">Special requests</label>' +
            '<textarea class="textarea" id="i-note" name="note" rows="2" maxlength="200" placeholder="' + notePlaceholder(it) + '">' + esc(preset.note || '') + '</textarea>' +
            '<p class="field__hint">Requests that change the price will be confirmed by the bakery.</p></div>' +
        '</div>';
      renderGroups(it, size, preset.addons || []);
      $('[data-qty-out]', iForm).textContent = qty;
      $('[data-item-submit-label]', iForm).textContent = pending && pending.editKey ? 'Update order' : 'Add to order';
      updateItemTotal();
      var ctxLabel = it.catName.replace(/\s+\d+ days in advance$/i, '') + (it.section ? ' · ' + it.section : '');
      setContext((pending && pending.stepped ? 'Step 2 of 2 · ' : '') + ctxLabel);
      showModalStep('item');
    }
    function renderGroups(it, sizeName, picks) {
      var wrap = $('[data-addon-groups]', iForm);
      var ids = groupsFor(it, sizeName);
      var hasAny = (it.addons || []).length > 0;
      wrap.innerHTML = ids.map(function (gid) {
        var g = GROUPS[gid];
        var single = g.max === 1;
        var need = g.required || g.min > 0;
        var tag = need ? (single ? 'Required' : 'Choose at least ' + g.min) : (single ? 'Optional' : 'Choose up to ' + g.max);
        return '<fieldset class="opt-group" data-gid="' + esc(gid) + '" data-max="' + g.max + '" data-min="' + (need ? Math.max(1, g.min) : 0) + '">' +
          '<legend>' + esc(g.name) + ' <span class="opt-tag">' + esc(tag) + '</span></legend>' +
          g.options.map(function (o, i) {
            var checked = picks.some(function (p) { return p.group === gid && p.name === o.name; });
            return '<label class="opt"><input type="' + (single ? 'radio' : 'checkbox') + '" name="g-' + esc(gid) + '" value="' + esc(o.name) + '"' + (checked ? ' checked' : '') + '>' +
              '<span class="opt__name">' + esc(o.name) + '</span><span class="opt__price">' + plus(o.price) + '</span></label>';
          }).join('') +
          '<p class="opt-error" role="alert" hidden></p></fieldset>';
      }).join('') +
      (it.sizes && hasAny && !ids.length ? '<p class="notice small">' + icon('info') + '<span>No extras are listed for this size. Add decoration requests below and the bakery will confirm them.</span></p>' : '');
      enforceMax();
    }
    function enforceMax() {
      $$('.opt-group[data-gid]', iForm).forEach(function (fs) {
        var max = Number(fs.getAttribute('data-max'));
        var boxes = $$('input[type="checkbox"]', fs);
        if (!boxes.length) return;
        var n = boxes.filter(function (b) { return b.checked; }).length;
        boxes.forEach(function (b) {
          b.disabled = !b.checked && n >= max;
          b.closest('.opt').classList.toggle('is-disabled', b.disabled);
        });
      });
    }
    function currentSelection() {
      var it = items.get(pending.id);
      var sizeEl = $('input[name="size"]:checked', iForm);
      var size = sizeEl ? sizeEl.value : '';
      var addons = [];
      $$('.opt-group[data-gid]', iForm).forEach(function (fs) {
        var gid = fs.getAttribute('data-gid');
        $$('input:checked', fs).forEach(function (inp) { addons.push({ group: gid, name: inp.value, price: optionPrice(gid, inp.value) }); });
      });
      var noteEl = $('#i-note', iForm);
      return { id: it.id, size: size, addons: addons, note: noteEl ? noteEl.value : '' };
    }
    function updateItemTotal() {
      if (!pending) return;
      var sel = currentSelection();
      $('[data-item-total]', iForm).textContent = money(unitPrice(sel) * qty);
    }
    if (iForm) {
      iForm.addEventListener('change', function (e) {
        var it = pending && items.get(pending.id);
        if (!it) return;
        if (e.target.name === 'size') {
          renderGroups(it, e.target.value, currentSelection().addons);
        } else if (e.target.closest('.opt-group[data-gid]')) {
          enforceMax();
          var err = $('.opt-error', e.target.closest('.opt-group'));
          if (err) err.hidden = true;
        }
        updateItemTotal();
      });
      iForm.addEventListener('click', function (e) {
        if (e.target.closest('[data-q-inc]')) { qty = Math.min(99, qty + 1); }
        else if (e.target.closest('[data-q-dec]')) { qty = Math.max(1, qty - 1); }
        else return;
        $('[data-qty-out]', iForm).textContent = qty;
        $('[data-q-dec]', iForm).disabled = qty <= 1;
        updateItemTotal();
      });
      iForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var it = items.get(pending.id);
        var firstBad = null;
        $$('.opt-group[data-gid]', iForm).forEach(function (fs) {
          var min = Number(fs.getAttribute('data-min'));
          var n = $$('input:checked', fs).length;
          var err = $('.opt-error', fs);
          if (n < min) {
            err.textContent = min === 1 ? 'Please choose one option.' : 'Please choose at least ' + min + ' options.';
            err.hidden = false;
            if (!firstBad) firstBad = $('input', fs);
          } else err.hidden = true;
        });
        if (firstBad) { firstBad.focus(); return; }
        var sel = currentSelection();
        var editing = pending.editKey;
        if (editing) cart.replaceLine(editing, sel, qty); else cart.addLine(sel, qty);
        closeModal();
        if (!editing) {
          B.toast((qty === 1 ? '' : qty + ' × ') + it.name + ' added to your order',
            { label: 'View order', href: '#cart', onClick: function (ev) { ev.preventDefault(); openDrawer('cart'); } });
        }
      });
    }
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target.closest('[data-modal-close]')) { e.preventDefault(); closeModal(); }
        else if (e.target.closest('[data-change-dispatch]')) {
          e.preventDefault();
          openDispatch(pending ? items.get(pending.id) : null);
        }
      });
    }

    /* ---------- Cart drawer ---------- */
    var drawer = $('#cart'), panel = drawer ? $('.drawer__panel', drawer) : null;
    var step = 'cart', lastFocus = null;
    function showStep(name) {
      step = name;
      $$('[data-step]', drawer).forEach(function (el) { el.hidden = el.getAttribute('data-step') !== name; });
      $$('[data-step-label]', drawer).forEach(function (el) {
        if (el.getAttribute('data-step-label') === name) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
      });
      var title = $('[data-drawer-title]', drawer);
      if (title) title.textContent = name === 'details' ? 'Pickup or delivery details' : name === 'done' ? 'Order request' : 'Your order';
      var foot = $('[data-cart-foot]', drawer);
      if (foot && name === 'cart') foot.hidden = !cart.count();
      var body = $('[data-step="' + name + '"].drawer__body', drawer);
      if (body) body.scrollTop = 0;
    }
    function openDrawer(name) {
      if (!drawer) return;
      if (drawer.hidden) lastFocus = document.activeElement;
      renderCart();
      showStep(name || 'cart');
      drawer.hidden = false;
      document.body.classList.add('is-locked');
      renderCartBar();
      if (location.hash !== '#cart') history.replaceState(null, '', '#cart');
      setTimeout(function () { panel.focus(); }, 30);
    }
    function closeDrawer() {
      if (!drawer || drawer.hidden) return;
      drawer.hidden = true;
      if (!modal || modal.hidden) document.body.classList.remove('is-locked');
      if (location.hash === '#cart') history.replaceState(null, '', location.pathname + location.search);
      if (step === 'done') showStep('cart');
      renderCartBar();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    B.openCart = openDrawer;
    document.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-open-cart]');
      if (opener) { e.preventDefault(); openDrawer('cart'); return; }
      var chooser = e.target.closest('[data-dispatch-button]');
      if (chooser) { e.preventDefault(); openDispatchOnly(chooser); return; }
      if (drawer && !drawer.hidden && (!modal || modal.hidden)) {
        if (e.target.closest('[data-close]')) { e.preventDefault(); closeDrawer(); }
        var go = e.target.closest('[data-go]');
        if (go) { e.preventDefault(); goTo(go.getAttribute('data-go')); }
      }
    });
    function trapFocus(e, container) {
      var f = $$('a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select, textarea', container).filter(function (el) {
        return !el.closest('[hidden]') && !el.closest('.hp') && el.offsetParent !== null;
      });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !container.contains(document.activeElement) || document.activeElement === container)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', function (e) {
      if (modal && !modal.hidden) {
        if (e.key === 'Escape') { closeModal(); return; }
        if (e.key === 'Tab') trapFocus(e, mPanel);
        return;
      }
      if (!drawer || drawer.hidden) return;
      if (e.key === 'Escape') { closeDrawer(); return; }
      if (e.key === 'Tab') trapFocus(e, panel);
    });
    window.addEventListener('hashchange', function () { if (location.hash === '#cart') openDrawer('cart'); });

    function goTo(name) {
      if (name === 'details') {
        if (!cart.count()) { showStep('cart'); return; }
        updateCheckout();
        showStep('details');
        var first = $('#o-date');
        if (first) first.focus();
      } else {
        showStep(name);
        panel.focus();
      }
    }

    function subtotal() {
      return round2(cart.all().reduce(function (s, l) { return s + (items.has(l.id) ? unitPrice(l) * l.qty : 0); }, 0));
    }
    function renderCart() {
      if (!drawer) return;
      var lines = cart.all().filter(function (l) { return items.has(l.id); });
      var list = $('[data-cart-lines]', drawer);
      var active = document.activeElement;
      var focusInfo = active && list.contains(active) ? { key: active.closest('[data-key]') && active.closest('[data-key]').getAttribute('data-key'), act: active.getAttribute('data-act') } : null;

      $('[data-cart-empty]', drawer).hidden = lines.length > 0;
      $('[data-cart-foot]', drawer).hidden = !lines.length || step !== 'cart';
      list.innerHTML = lines.map(function (l) {
        var it = items.get(l.id);
        var details = lineDetails(l);
        var canEdit = !!(it.sizes || (it.addons || []).length || l.note);
        return '<li class="cart-line" data-key="' + esc(l.key) + '">' +
          (it.img ? '<img class="cart-line__img" src="' + wixImg(it.img, 112, 112) + '" alt="" width="56" height="56" loading="lazy">' : '<span class="cart-line__img" aria-hidden="true">' + icon('bag') + '</span>') +
          '<div><div class="cart-line__name">' + esc(it.name) + '</div>' +
          (details.length ? '<div class="cart-line__meta">' + details.map(esc).join(' · ') + '</div>' : '') +
          (l.note ? '<div class="cart-line__meta">Note: “' + esc(l.note) + '”</div>' : '') +
          '<div class="cart-line__meta">' + money(unitPrice(l)) + ' each</div>' +
          '<div class="cart-line__actions">' +
            (canEdit ? '<button type="button" class="remove-btn" data-act="edit">Edit<span class="sr-only"> ' + esc(it.name) + '</span></button>' : '') +
            '<button type="button" class="remove-btn" data-act="remove">Remove<span class="sr-only"> ' + esc(it.name) + '</span></button></div></div>' +
          '<div class="cart-line__right"><div class="qty" role="group" aria-label="' + esc(it.name) + ' quantity">' +
          '<button type="button" data-act="dec" aria-label="One less ' + esc(it.name) + '"' + (l.qty <= 1 ? ' disabled' : '') + '>' + icon('minus') + '</button>' +
          '<output>' + l.qty + '</output>' +
          '<button type="button" data-act="inc" aria-label="One more ' + esc(it.name) + '">' + icon('plus') + '</button></div>' +
          '<strong>' + money(unitPrice(l) * l.qty) + '</strong></div></li>';
      }).join('');

      var sub = money(subtotal());
      $$('[data-cart-subtotal]').forEach(function (el) { el.textContent = sub; });
      var notice = cartNotice(), noticeBox = $('[data-cart-notice]', drawer);
      if (noticeBox) {
        noticeBox.hidden = !notice;
        if (notice) {
          $('p', noticeBox).textContent = 'Some items need ' + notice + ' days’ notice. The earliest date for this order is ' +
            T.fmtDate(earliest(currentMode(), notice), { weekday: 'long' }) + '.';
        }
      }
      if (focusInfo && focusInfo.key) {
        var line = $('.cart-line[data-key="' + (window.CSS && CSS.escape ? CSS.escape(focusInfo.key) : focusInfo.key) + '"]', list);
        var target = line ? ($('[data-act="' + focusInfo.act + '"]:not([disabled])', line) || $('[data-act="inc"]', line)) : $('[data-close]', drawer);
        if (target) target.focus();
      }
      if (!lines.length && step === 'details') showStep('cart');
    }
    if (drawer) {
      $('[data-cart-lines]', drawer).addEventListener('click', function (e) {
        var btn = e.target.closest('[data-act]');
        if (!btn) return;
        var key = btn.closest('[data-key]').getAttribute('data-key');
        var l = cart.line(key);
        if (!l) return;
        var act = btn.getAttribute('data-act');
        if (act === 'inc') cart.setQty(key, l.qty + 1);
        else if (act === 'dec') cart.setQty(key, l.qty - 1);
        else if (act === 'edit') openItem(l.id, { editKey: key, opener: btn, preset: { size: l.size, addons: l.addons, note: l.note, qty: l.qty } });
        else if (act === 'remove') {
          var name = items.get(l.id).name;
          cart.removeLine(key);
          B.toast(name + ' removed', { label: 'Undo', href: '#cart', onClick: function (ev) { ev.preventDefault(); cart.addLine(l, l.qty); } });
          var close = $('[data-close]', drawer);
          if (close) close.focus();
        }
      });
    }

    var cartBar = $('[data-cart-bar]');
    function renderCartBar() {
      var n = cart.count();
      var sub = money(subtotal());
      $$('[data-cart-total]').forEach(function (el) { el.textContent = sub; });
      $$('[data-cart-bar-count]').forEach(function (el) { el.textContent = plural(n, 'item'); });
      var show = n > 0 && (!drawer || drawer.hidden);
      if (cartBar) {
        cartBar.classList.toggle('is-visible', show);
        cartBar.setAttribute('aria-hidden', String(!show));
        cartBar.tabIndex = show ? 0 : -1;
      }
    }

    cart.subscribe(function () {
      syncCards();
      renderCart();
      renderCartBar();
      renderDispatchBar();
      updateCheckout();
    });

    /* ---------- Checkout form ---------- */
    var form = $('#order-form');
    var dateEl = form ? $('#o-date', form) : null, timeEl = form ? $('#o-time', form) : null;
    var deliveryBox = form ? $('[data-delivery-fields]', form) : null;

    function checkoutMode() {
      var r = form ? $('input[name="fulfillment"]:checked', form) : null;
      return r ? r.value : currentMode();
    }
    function updateCheckout() {
      if (!form) return;
      var mode = currentMode();
      $$('input[name="fulfillment"]', form).forEach(function (r) { r.checked = r.value === mode; });
      var notice = cartNotice();
      var min = earliest(mode, notice);
      dateEl.min = T.isoDate(min);
      dateEl.max = T.isoDate(latest());
      var d = dispatch && dispatch.date ? T.parseISO(dispatch.date) : null;
      if (!d || dateProblem(mode, d, notice)) d = min;
      dateEl.value = T.isoDate(d);
      fillWindows(timeEl, mode, d, dispatch && dispatch.time);
      var hint = $('[data-date-hint]', form);
      if (hint) {
        hint.textContent = (mode === 'delivery' ? 'Deliveries run Monday to Friday. ' : 'Pickup during store hours. ') +
          'Earliest: ' + T.fmtDate(min, { weekday: 'long' }) + (notice ? ' (some items need ' + notice + ' days’ notice).' : '.');
      }
      var timeLabel = $('label[for="o-time"]', form);
      if (timeLabel) timeLabel.firstChild.nodeValue = mode === 'delivery' ? 'Delivery window ' : 'Pickup time ';
      deliveryBox.hidden = mode !== 'delivery';
      $$('input', deliveryBox).forEach(function (i) { i.disabled = mode !== 'delivery'; });
    }
    function saveFromCheckout() {
      setDispatch({ mode: checkoutMode(), date: dateEl.value, time: timeEl.value }, true);
    }
    if (form) {
      F.bindLiveValidation(form);
      $$('input[name="fulfillment"]', form).forEach(function (r) {
        r.addEventListener('change', function () {
          if (!r.checked) return;
          dispatch = Object.assign({}, dispatch || {}, { mode: r.value });
          B.store.set(DKEY, dispatch);
          updateCheckout();
          saveFromCheckout();
        });
      });
      dateEl.addEventListener('change', function () {
        validateDate();
        var d = dateEl.value && !dateEl.validationMessage ? T.parseISO(dateEl.value) : null;
        fillWindows(timeEl, checkoutMode(), d, timeEl.value);
        saveFromCheckout();
      });
      timeEl.addEventListener('change', saveFromCheckout);
    }
    function validateDate() {
      dateEl.setCustomValidity('');
      if (dateEl.value) dateEl.setCustomValidity(dateProblem(checkoutMode(), T.parseISO(dateEl.value), cartNotice()));
      F.showFieldError(dateEl, F.fieldError(dateEl));
    }

    function makeRef() {
      var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
      var rnd = window.crypto && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(4)) : [1, 2, 3, 4].map(function () { return Math.floor(Math.random() * 1e9); });
      for (var i = 0; i < 4; i++) s += chars[rnd[i] % chars.length];
      var d = T.nowLocal().date;
      return 'BDP-' + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0') + '-' + s;
    }

    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      F.clearStatus(form);
      if (!cart.count()) { showStep('cart'); return; }
      validateDate();
      if (!F.validateForm(form)) {
        F.setStatus(form, 'error', 'Please fix the highlighted fields.');
        return;
      }
      if (F.honeypotTripped(form)) return;

      var mode = checkoutMode();
      var v = function (n) { var el = form.elements[n]; return el && !el.disabled ? String(el.value || '').trim() : ''; };
      var ref = makeRef();
      var date = T.parseISO(v('date'));
      var dateText = T.fmtDate(date, { weekday: 'long', month: 'long', year: 'numeric' });
      var lines = cart.all().filter(function (l) { return items.has(l.id); }).map(function (l) {
        var it = items.get(l.id);
        var details = lineDetails(l);
        return {
          text: l.qty + ' × ' + it.name,
          details: details.concat(l.note ? ['Note: ' + l.note] : []),
          total: money(unitPrice(l) * l.qty)
        };
      });
      var total = money(subtotal());
      var address = mode === 'delivery' ? [v('street'), v('unit'), v('city') + ' ' + v('zip')].filter(Boolean).join(', ') : '';
      var itemText = lines.map(function (l) {
        return l.text + ' — ' + l.total + (l.details.length ? '\n    ' + l.details.join('\n    ') : '');
      });
      form.elements.order_summary.value = itemText.join('\n') + '\nSubtotal: ' + total + ' (tax and any delivery fee to be confirmed)';
      form.elements.order_ref.value = ref;
      form.elements.order_total.value = total;

      var body = [
        'ORDER REQUEST ' + ref,
        '',
        (mode === 'delivery' ? 'Delivery' : 'Pickup') + ': ' + dateText + ', ' + v('time'),
        address ? 'Address: ' + address : '',
        '',
        'Name: ' + v('name'),
        'Phone: ' + v('phone'),
        'Email: ' + v('email'),
        '',
        'Items:'
      ].concat(itemText, ['', 'Subtotal: ' + total + ' (tax and any delivery fee to be confirmed)'], v('notes') ? ['', 'Notes: ' + v('notes')] : [])
        .filter(function (x, i, arr) { return !(x === '' && arr[i - 1] === ''); });

      var subject = 'Order request ' + ref + ' — ' + v('name') + ' (' + mode + ', ' + T.fmtDate(date) + ')';
      form.classList.add('is-sending');
      F.sendForm({ form: form, formName: 'order', subject: subject, lines: body, replyTo: v('email') })
        .then(function (r) { showDone(ref, r, { mode: mode, dateText: dateText, time: v('time'), address: address, lines: lines, total: total }); })
        .catch(function () {
          F.setStatus(form, 'error', 'Sorry, your order didn’t go through. Please try again. ' + F.contactFallbackHTML().replace('Nothing opened? ', ''));
        })
        .then(function () { form.classList.remove('is-sending'); });
    });

    function showDone(ref, result, o) {
      var box = $('[data-done-content]', drawer);
      var mailto = result.mode === 'mailto';
      var pay = ORD.checkoutUrl ? '<p><a class="btn btn--pink btn--block" href="' + esc(ORD.checkoutUrl) + '" target="_blank" rel="noopener">Pay online now</a></p>' : '';
      box.innerHTML =
        '<div class="message-page__icon">' + icon(mailto ? 'mail' : 'check') + '</div>' +
        '<h3>' + (mailto ? 'One last step' : 'Order request sent!') + '</h3>' +
        (mailto
          ? '<p>Your email app should have opened with your order filled in. <strong>Press Send</strong> to place your request.</p>'
          : '<p>Thank you! We’ll confirm by phone or email before we start baking.</p>') +
        '<p class="small muted">Your reference</p><p class="ref-code">' + esc(ref) + '</p>' +
        '<div class="order-summary"><strong>' + (o.mode === 'delivery' ? 'Delivery' : 'Pickup') + ':</strong> ' + esc(o.dateText) + ', ' + esc(o.time) +
        (o.address ? '<br><strong>To:</strong> ' + esc(o.address) : '') +
        '<ul>' + o.lines.map(function (l) {
          return '<li><span>' + esc(l.text) + (l.details.length ? '<small>' + l.details.map(esc).join('<br>') + '</small>' : '') + '</span><span>' + esc(l.total) + '</span></li>';
        }).join('') + '</ul>' +
        '<div class="totals"><div class="total"><span>Subtotal</span><span>' + esc(o.total) + '</span></div></div>' +
        '<p class="small muted" style="margin:6px 0 0">Pay at ' + (o.mode === 'delivery' ? 'delivery' : 'pickup') + '. Tax and any delivery fee will be confirmed.</p></div>' +
        pay +
        (mailto
          ? '<div class="btn-row" style="justify-content:center;margin-top:16px">' +
              '<a class="btn btn--outline btn--sm" href="' + esc(result.href) + '">Open email again</a>' +
              '<button class="btn btn--ink btn--sm" type="button" data-sent-clear>I’ve sent it — clear my order</button></div>' +
            '<p class="small muted" style="margin-top:12px">' + F.contactFallbackHTML() + '</p>'
          : '<p style="margin-top:16px"><button class="btn btn--ink btn--block" type="button" data-close>Done</button></p>');
      if (!mailto) { cart.clear(); resetContact(); }
      showStep('done');
      panel.focus();
      var clr = $('[data-sent-clear]', box);
      if (clr) clr.addEventListener('click', function () {
        cart.clear();
        resetContact();
        closeDrawer();
        B.toast('Thanks! We’ll be in touch to confirm your order.');
      });
    }
    function resetContact() {
      ['notes', 'street', 'unit', 'city', 'zip'].forEach(function (n) { if (form.elements[n]) form.elements[n].value = ''; });
      updateCheckout();
    }

    /* ---------- Boot ---------- */
    if (dispatch && !dispatchOk(dispatch, cartNotice())) {
      // keep the chosen method, drop a date that has passed
      dispatch = { mode: dispatch.mode === 'delivery' ? 'delivery' : 'pickup' };
      B.store.set(DKEY, dispatch);
    }
    renderDispatchBar();
    renderCart();
    renderCartBar();
    updateCheckout();
    if (location.hash === '#cart') openDrawer('cart');
    setInterval(renderDispatchBar, 60 * 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
