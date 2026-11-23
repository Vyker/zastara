/* ZASTARA — shared site behaviour: navigation wiring, demo cart, mock checkout.
   No dependencies. Cart state lives in localStorage under zastara:* keys. */
(function () {
  'use strict';
  var PAGE = (location.pathname.split('/').pop() || 'index.html');
  var LS = { cart: ['zastara', 'cart', 'v1'].join('_'), order: ['zastara', 'order', 'v1'].join('_') };

  /* ---------- helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function money(n) { return 'AED ' + Number(n).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function moneyShort(n) { return 'AED ' + Math.round(n).toLocaleString('en-AE'); }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function getCart() { try { return JSON.parse(localStorage.getItem(LS.cart)) || []; } catch (e) { return []; } }
  function setCart(items) { localStorage.setItem(LS.cart, JSON.stringify(items)); updateBadges(); }
  function norm(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'za-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('za-toast--show'); }, 10);
    setTimeout(function () { t.classList.remove('za-toast--show'); setTimeout(function () { t.remove(); }, 350); }, 2200);
  }

  /* ---------- cart badge ---------- */
  function updateBadges() {
    var count = getCart().reduce(function (s, i) { return s + i.qty; }, 0);
    $all('header button[aria-label*="Cart" i]').forEach(function (btn) {
      var badge = btn.querySelector('span.absolute') || btn.appendChild(Object.assign(document.createElement('span'), {
        className: 'absolute top-2 right-1.5 w-4 h-4 rounded-full bg-primary-container text-on-primary font-label-caps text-[9px] flex items-center justify-center font-semibold leading-none'
      }));
      badge.textContent = count > 9 ? '9+' : String(count);
      badge.style.display = count ? '' : 'none';
    });
  }

  /* ---------- navigation wiring ---------- */
  var PATH_BY_KEY = {
    'home': 'index.html', 'collection-catalogue': 'collection.html', 'piece-detail': 'piece.html',
    'stack-studio': 'stack-studio.html', 'shopping-bag': 'bag.html', 'client-account': 'account.html',
    'checkout': 'checkout.html', 'ear-piercing': 'ear-studio.html'
  };
  var CTA_MAP = [
    [/^build your stack|^start your stack|^build.*stack|customize.*stack|^edit in studio/, 'stack-studio.html'],
    [/^explore collection|^shop collection|^view collection|^shop pieces|^explore pieces|^sets(\s|$)|^ring stacks|^explore sets/, 'collection.html'],
    [/^proceed to secure checkout/, 'checkout.html'],
    [/^continue shopping|^back to collection|^continue browsing|^discover the collection/, 'collection.html'],
    [/^view saved stacks|^saved stacks/, 'account.html'],
    [/^ear piercing|^ear stack|^build.*ear|^ear & piercing/, 'ear-studio.html'],
    [/^continue to boutique|^back to home|^back to boutique/, 'index.html']
  ];
  function wireNav() {
    // bottom / side nav via data-path
    $all('[data-path]').forEach(function (a) {
      var target = PATH_BY_KEY[a.getAttribute('data-path')];
      if (!target) return;
      a.setAttribute('href', target);
      var active = (target === PAGE);
      a.classList.toggle('text-primary-container', active);
      a.classList.toggle('font-semibold', active);
      if (active) a.setAttribute('aria-current', 'page');
    });
    // header cart + account buttons
    var cartBtn = $('header button[aria-label*="Cart" i]');
    if (cartBtn) cartBtn.addEventListener('click', function () { location.href = 'bag.html'; });
    // CTA buttons by visible text (skip nav + pages with own handlers)
    $all('main button:not(.za-wired), main a:not(.za-wired)').forEach(function (el) {
      var text = norm(el);
      if (!text || text.length > 40) return;
      for (var i = 0; i < CTA_MAP.length; i++) {
        if (CTA_MAP[i][0].test(text)) {
          el.classList.add('za-wired');
          if (el.tagName === 'A') { if (!el.getAttribute('href') || el.getAttribute('href') === '#') el.setAttribute('href', CTA_MAP[i][1]); }
          else el.addEventListener('click', function (url) { return function () { location.href = url; }; }(CTA_MAP[i][1]));
          break;
        }
      }
    });
  }

  /* ---------- add to cart ---------- */
  function priceFrom(text) {
    var m = text.match(/AED\s*([\d,]+(?:\.\d+)?)/) || text.match(/\$\s*([\d,]+(?:\.\d+)?)/);
    return m ? parseFloat(m[1].replace(/,/g, '')) : null;
  }
  function cardOf(btn) {
    return btn.closest('article') || btn.closest('section') || btn.parentElement;
  }
  function wireAddButtons() {
    if (PAGE === 'bag.html' || PAGE === 'checkout.html' || PAGE === 'confirmation.html') return;
    // piece detail: dedicated button with tray total (wire first so generic loop skips it)
    var trayBtn = $('#add-to-stack-btn');
    if (trayBtn) {
      trayBtn.classList.add('za-wired');
      var title = ($('main h1') || $('main h2') || {});
      var pname = (title.textContent || 'ZASTARA piece').replace(/\s+/g, ' ').trim();
      trayBtn.addEventListener('click', function () {
        var p = priceFrom(($('#tray-total-price') || document.body).textContent) || priceFrom(document.body.textContent);
        addToCart(pname, p, null);
      });
    }
    $all('button').forEach(function (btn) {
      if (btn.classList.contains('za-wired')) return;
      var text = norm(btn);
      if (!/(add to (stack|bag)|acquire)/i.test(text)) return;
      var card = cardOf(btn);
      var nameEl = card && (card.querySelector('h2,h3,[class*="title-editorial"]'));
      var name = nameEl ? nameEl.textContent.replace(/\s+/g, ' ').trim() : null;
      var price = priceFrom((card || document.body).textContent);
      if (!name || price == null) return;
      btn.classList.add('za-wired');
      btn.addEventListener('click', function () { addToCart(name, price, card); });
    });
  }
  function addToCart(name, price, card) {
    var img = card && card.querySelector('img');
    var items = getCart();
    var id = slug(name);
    var hit = items.find(function (i) { return i.id === id; });
    if (hit) hit.qty += 1;
    else items.push({ id: id, name: name, price: price, qty: 1, img: img ? img.getAttribute('src') : '' });
    setCart(items);
    toast('Added — ' + name);
  }

  /* ---------- bag page: render cart ---------- */
  function renderBag() {
    var removeBtn = $('article button[aria-label="Remove item"]');
    if (!removeBtn) return;
    var list = removeBtn.closest('article').parentElement;
    function esc(s) { return s.replace(/[&<"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function draw() {
      var items = getCart();
      if (!items.length) {
        list.innerHTML = '<div class="py-16 flex flex-col items-center justify-center text-center bg-surface-container-lowest">' +
          '<span class="material-symbols-outlined text-[40px] text-outline-variant">shopping_bag</span>' +
          '<p class="font-headline-sm text-headline-sm text-primary mt-4 tracking-widest">Your bag is empty</p>' +
          '<p class="font-body-sm text-secondary mt-1">Curated stacks await you.</p>' +
          '<button id="za-empty-cta" class="mt-6 h-11 px-6 bg-primary text-on-primary font-label-caps text-label-caps tracking-[0.2em] uppercase">Explore the Collection</button></div>';
        var cta = $('#za-empty-cta');
        if (cta) cta.addEventListener('click', function () { location.href = 'collection.html'; });
      } else {
        list.innerHTML = items.map(function (it) {
          return '<article class="flex gap-3.5 py-3.5" data-id="' + esc(it.id) + '">' +
            '<div class="w-20 h-24 shrink-0 bg-surface-container-low relative overflow-hidden flex items-center justify-center">' +
            (it.img ? '<img class="w-full h-full object-cover" src="' + esc(it.img) + '" alt="">' : '') + '</div>' +
            '<div class="flex flex-col justify-between flex-1 min-w-0">' +
            '<div><div class="flex items-start justify-between gap-1">' +
            '<h3 class="font-title-editorial text-title-editorial text-primary tracking-normal leading-snug line-clamp-1">' + esc(it.name) + '</h3>' +
            '<button aria-label="Remove item" class="text-secondary hover:text-primary active:scale-95 transition-transform p-0.5 za-remove"><span class="material-symbols-outlined text-[17px]">close</span></button></div>' +
            '<p class="font-label-specs text-label-specs text-secondary uppercase tracking-wider mt-0.5">925 Sterling Silver</p></div>' +
            '<div class="flex items-center justify-between mt-2">' +
            '<div class="flex items-center border border-surface-container-highest">' +
            '<button aria-label="Decrease quantity" class="w-6 h-6 flex items-center justify-center text-secondary text-sm active:bg-surface-container za-dec">-</button>' +
            '<span class="w-7 text-center font-label-specs text-label-specs">' + it.qty + '</span>' +
            '<button aria-label="Increase quantity" class="w-6 h-6 flex items-center justify-center text-secondary text-sm active:bg-surface-container za-inc">+</button></div>' +
            '<span class="font-label-specs text-primary font-semibold">' + money(it.price * it.qty) + '</span></div></div></article>';
        }).join('');
      }
      updateSummary();
    }
    function totals() {
      var items = getCart();
      var sub = items.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
      var count = items.reduce(function (s, i) { return s + i.qty; }, 0);
      var disc = count >= 3 ? sub * 0.15 : 0;
      return { sub: sub, disc: disc, total: sub - disc, count: count };
    }
    function rowBy(label) {
      var rows = $all('section div.flex.justify-between, section div.flex.items-center.justify-between');
      return rows.find(function (r) { return norm(r).indexOf(label) === 0; });
    }
    function updateSummary() {
      var t = totals();
      var r;
      r = rowBy('subtotal');
      if (r) { r.lastElementChild.textContent = money(t.sub); r.firstElementChild.textContent = 'Subtotal (' + t.count + (t.count === 1 ? ' piece' : ' pieces') + ')'; }
      r = rowBy('stack privilege');
      if (r) { r.style.display = t.disc ? '' : 'none'; r.lastElementChild.textContent = '-' + money(t.disc); }
      r = rowBy('total to pay');
      if (r) { var span = r.querySelector('span.font-headline-md') || r.lastElementChild; span.textContent = money(t.total); }
      // static header: "3 PIECES CALIBRATED  AED 1,360"
      $all('span,p,div').forEach(function (el) {
        if (el.children.length === 0 && /pieces calibrated/i.test(el.textContent))
          el.textContent = t.count + (t.count === 1 ? ' piece calibrated' : ' pieces calibrated');
      });
      $all('span').forEach(function (el) {
        if (el.children.length === 0 && /^-?AED 1[,.]360(?:\.00)?$/.test(el.textContent.trim()))
          el.textContent = moneyShort(t.total);
      });
      // static duplicate discount chip "-AED 240"
      $all('span').forEach(function (el) {
        if (el.children.length === 0 && el.textContent.trim() === '-AED 240') {
          el.textContent = t.disc ? '-' + money(t.disc) : '';
          el.style.display = t.disc ? '' : 'none';
        }
      });
      // sticky checkout button
      var go = $all('button').find(function (b) { return norm(b).indexOf('proceed to secure checkout') === 0; });
      if (go) {
        var amt = go.querySelectorAll('span');
        if (amt.length >= 2) amt[amt.length - 2].textContent = moneyShort(t.total);
        go.onclick = function () { if (!getCart().length) { toast('Your bag is empty'); return; } location.href = 'checkout.html'; };
      }
    }
    list.addEventListener('click', function (e) {
      var art = e.target.closest('article[data-id]');
      if (!art) return;
      var id = art.getAttribute('data-id');
      var items = getCart();
      var it = items.find(function (i) { return i.id === id; });
      if (!it) return;
      if (e.target.closest('.za-remove')) { setCart(items.filter(function (i) { return i.id !== id; })); }
      else if (e.target.closest('.za-inc')) { it.qty += 1; setCart(items); }
      else if (e.target.closest('.za-dec')) { it.qty -= 1; if (it.qty <= 0) setCart(items.filter(function (i) { return i.id !== id; })); else setCart(items); }
      else return;
      draw();
    });
    draw();
  }

  /* ---------- checkout page ---------- */
  function wireCheckout() {
    var btn = $all('button').find(function (b) { return /confirm\s*&?\s*dispatch|place.*order|complete.*order/i.test(norm(b)); });
    if (!btn) return;
    var t = checkoutTotals();
    // reflect real totals in the sticky bar
    var due = $all('span').find(function (s) { return /due at confirmation/i.test(s.textContent); });
    if (due && t.count) { var v = due.nextElementSibling; if (v) v.textContent = money(t.total); }
    var amtSpan = Array.prototype.slice.call(btn.querySelectorAll('span')).find(function (s) { return /·\s*AED [\d,]+|AED [\d,]+/.test(s.textContent) && !/material-symbols/.test(s.className); });
    if (amtSpan && t.count) {
      if (/·/.test(amtSpan.textContent)) amtSpan.textContent = amtSpan.textContent.replace(/·\s*AED [\d,.]+/, '· ' + moneyShort(t.total));
      else if (/^AED [\d,.]+$/.test(amtSpan.textContent.trim())) amtSpan.textContent = moneyShort(t.total);
    }
    btn.addEventListener('click', function () {
      var form = $('form');
      if (form) {
        var bad = $all('input[required]', form).find(function (i) { return !i.value.trim() || !i.checkValidity(); });
        if (bad) { bad.focus(); bad.reportValidity && bad.reportValidity(); toast('Complete the highlighted field'); return; }
      }
      var email = ($('input[type="email"]') || {}).value || 'client@zastara.com';
      var order = {
        id: 'ZST-' + String(Math.floor(1000 + Math.random() * 9000)) + '-' + String(Math.floor(1000 + Math.random() * 9000)),
        when: new Date().toISOString(),
        email: email,
        items: getCart(),
        total: t.count ? t.total : 1360
      };
      localStorage.setItem(LS.order, JSON.stringify(order));
      setCart([]);
      location.href = 'confirmation.html';
    });
  }
  function checkoutTotals() {
    var items = getCart();
    var sub = items.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    var count = items.reduce(function (s, i) { return s + i.qty; }, 0);
    return { sub: sub, total: count >= 3 ? sub * 0.85 : sub, count: count };
  }

  /* ---------- confirmation page: inject real order ---------- */
  function renderOrderItems(order) {
    var h3 = $all('h3').find(function (h) { return /curated stack summary/i.test(h.textContent); });
    if (!h3 || !order.items || !order.items.length) return;
    var section = h3.closest('section');
    if (!section) return;
    var count = order.items.reduce(function (s, i) { return s + i.qty; }, 0);
    // header count: "3 PIECES · SIZE 52 / US 6.0"
    $all('span', section).forEach(function (el) {
      if (/^\s*\d+\s*PIECES\b/i.test(el.textContent))
        el.textContent = el.textContent.replace(/^\s*\d+\s*PIECES\b/i, count + ' PIECE' + (count === 1 ? '' : 'S'));
    });
    // find item rows: divs with an img and an AED price, keep packaging row
    var rows = $all('div', section).filter(function (d) {
      return d.querySelector(':scope > img') && /AED [\d,.]+/.test(d.textContent);
    });
    var list = rows.length ? rows[0].parentElement : null;
    if (!list) return;
    function esc(s) { return (s || '').replace(/[&<"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    var html = order.items.map(function (it) {
      return '<div class="flex items-center gap-space-sm bg-surface-container-low p-space-sm">' +
        (it.img ? '<img alt="' + esc(it.name) + '" class="w-14 h-14 object-cover bg-surface-container-lowest shrink-0" src="' + esc(it.img) + '">' :
          '<div class="w-14 h-14 bg-surface-container-lowest shrink-0 flex items-center justify-center"><span class="material-symbols-outlined text-primary">radio_button_checked</span></div>') +
        '<div class="flex flex-col min-w-0 flex-1">' +
        '<span class="font-body-md text-body-md text-primary truncate">' + esc(it.name) + (it.qty > 1 ? ' ×' + it.qty : '') + '</span>' +
        '<span class="font-label-specs text-label-specs text-on-surface-variant">925 Sterling Silver</span>' +
        '</div>' +
        '<span class="font-label-specs text-label-specs text-primary shrink-0">' + money(it.price * it.qty) + '</span></div>';
    }).join('');
    rows.forEach(function (r) { r.remove(); });
    // insert before packaging row (the div with inventory_2 icon), else append
    var packaging = $all('div', list).find(function (d) { return /inventory_2/.test(d.innerHTML); });
    var frag = document.createElement('div');
    frag.innerHTML = html;
    while (frag.firstChild) list.insertBefore(frag.firstChild, packaging || null);
  }
  function fillConfirmation() {
    var order;
    try { order = JSON.parse(localStorage.getItem(LS.order)); } catch (e) {}
    if (!order) return;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var t = node.nodeValue;
      if (/ZST-[A-Z0-9-]+/.test(t)) node.nodeValue = t.replace(/ZST-[A-Z0-9-]+/g, order.id);
      if (/AED\s*1[,.]360(?:\.00)?/.test(t)) node.nodeValue = t.replace(/AED\s*1[,.]360(?:\.00)?/g, money(order.total));
      if (/AED\s*1[,.]600\.00/.test(t)) node.nodeValue = t.replace(/AED\s*1[,.]600\.00/g, money(order.total / 0.85));
      if (/AED\s*240\.00/.test(t)) node.nodeValue = t.replace(/AED\s*240\.00/g, money(order.total / 0.85 * 0.15));
      if (/elena\.vance@zastara\.com/i.test(t)) node.nodeValue = t.replace(/elena\.vance@zastara\.com/ig, order.email);
      }
      renderOrderItems(order);
    // continue-shopping style CTAs back home
    $all('main a[href="#"], main button').forEach(function (el) {
      if (/continue shopping|back to boutique|back to home|explore collection/i.test(norm(el))) {
        el.onclick = function () { location.href = 'index.html'; };
      }
    });
  }

  /* ---------- universal behaviors: drawer, search, wishlist, share, chips ---------- */
  var WISH_KEY = LS.cart.replace('cart', 'wishlist');
  function getWish() { try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; } catch (e) { return []; } }
  function setWish(a) { localStorage.setItem(WISH_KEY, JSON.stringify(a)); }

  function doShare(title) {
    var data = { title: 'ZASTARA — ' + (title || document.title), text: (title || 'ZASTARA') + ' at ' + location.href, url: location.href };
    function copy() {
      try {
        if (navigator.clipboard) navigator.clipboard.writeText(location.href).catch(function () {});
      } catch (e) {}
    }
    if (navigator.share) { navigator.share(data).then(copy, copy); toast('Sharing — ' + (title || 'ZASTARA')); return; }
    copy();
    toast('Link copied to clipboard');
  }

  function injectOverlays() {
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div id="za-drawer" class="fixed inset-0 z-[100] hidden"><div class="absolute inset-0 bg-black/50 za-drawer-scrim"></div>' +
      '<nav class="absolute left-0 top-0 bottom-0 w-[78%] max-w-[300px] bg-surface shadow-2xl flex flex-col pt-16 translate-x-0 transition-transform duration-300">' +
      '<span class="font-title-editorial text-title-editorial text-primary uppercase tracking-[0.3em] px-6">ZASTARA</span>' +
      '<div class="mt-6 flex flex-col">' +
      ['index.html|Home', 'collection.html|Collection', 'stack-studio.html|Stack Studio', 'ear-studio.html|Ear Studio', 'account.html|Account', 'bag.html|Shopping Bag'].map(function (l) {
        var parts = l.split('|');
        return '<a href="' + parts[0] + '" class="px-6 py-3.5 font-label-caps text-label-caps uppercase tracking-[0.2em] ' +
          (parts[0] === PAGE ? 'text-primary font-semibold bg-surface-container-low' : 'text-secondary') + '">' + parts[1] + '</a>';
      }).join('') + '</div>' +
      '<button aria-label="Close menu" class="absolute top-4 right-2 w-11 h-11 flex items-center justify-center text-primary"><span class="material-symbols-outlined">close</span></button>' +
      '</nav></div>' +
      '<div id="za-search" class="fixed inset-0 z-[100] hidden"><div class="absolute inset-0 bg-black/50 za-drawer-scrim"></div>' +
      '<div class="absolute top-0 inset-x-0 bg-surface p-4 pt-6 shadow-2xl">' +
      '<form id="za-search-form" class="flex items-center gap-2"><span class="material-symbols-outlined text-secondary">search</span>' +
      '<input id="za-search-input" type="text" placeholder="Search bands, sets, moissanite…" class="flex-1 h-11 bg-surface-container-low px-3 font-body-md text-primary outline-none" autocomplete="off">' +
      '<button type="submit" class="h-11 px-4 bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-widest">Go</button></form>' +
      '<p class="mt-3 font-body-sm text-secondary">Press Enter to search the collection.</p></div></div>';
    document.body.appendChild(wrap);
    wrap.querySelectorAll('a').forEach(function (a) { if (a.getAttribute('href') === PAGE) a.setAttribute('aria-current', 'page'); });
  }

  function openOverlay(id, open) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('hidden', !open);
    if (open) { var inp = el.querySelector('input'); if (inp) setTimeout(function () { inp.focus(); }, 50); }
  }

  function wireOverlays() {
    injectOverlays();
    var drawer = document.getElementById('za-drawer');
    drawer.addEventListener('click', function (e) { if (e.target.closest('.za-drawer-scrim') || e.target.closest('[aria-label="Close menu"]')) openOverlay('za-drawer', false); });
    document.getElementById('za-search').addEventListener('click', function (e) { if (e.target.closest('.za-drawer-scrim')) openOverlay('za-search', false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { openOverlay('za-drawer', false); openOverlay('za-search', false); } });
    document.getElementById('za-search-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = document.getElementById('za-search-input').value.trim();
      openOverlay('za-search', false);
      location.href = 'collection.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });
  }

  function wireHeader() {
    var menuBtn = $all('button').find(function (b) { return /(^|\s)menu(\s|$)/.test(iconOf(b)) || b.getAttribute('aria-label') === 'Navigation menu'; });
    if (menuBtn) menuBtn.addEventListener('click', function () { openOverlay('za-drawer', true); });
    var searchBtn = $all('header button').find(function (b) { return iconOf(b) === 'search' || /Search/i.test(b.getAttribute('aria-label') || ''); });
    if (searchBtn) searchBtn.addEventListener('click', function () { openOverlay('za-search', true); });
    var langBtn = $all('header button').find(function (b) { return /EN\s*\|?\s*ع/.test(b.textContent) || /language/i.test(b.getAttribute('aria-label') || ''); });
    if (langBtn) langBtn.addEventListener('click', function () {
      var spans = langBtn.querySelectorAll('span');
      var ar = !langBtn.classList.toggle('za-ar');
      spans.forEach(function (s) {
        if (s.textContent.trim() === 'EN') s.className = ar ? 'text-outline-variant' : 'font-medium text-primary';
        if (s.textContent.trim() === 'ع') s.className = ar ? 'font-medium text-primary' : '';
      });
      langBtn.classList.toggle('za-ar', !ar);
      toast(ar ? 'Arabic edition coming soon' : 'English selected');
    });
  }

  function iconOf(btn) {
    var s = btn.querySelector('.material-symbols-outlined');
    return s ? s.textContent.trim() : '';
  }

  function wireShareAndWish() {
    $all('button').forEach(function (b) {
      if (b.classList.contains('za-wired')) return;
      var icon = iconOf(b), aria = b.getAttribute('aria-label') || '';
      if (icon === 'share' || icon === 'ios_share' || /share/i.test(aria)) {
        b.classList.add('za-wired');
        b.addEventListener('click', function () { doShare((b.closest('article,section') || {}).querySelector ? (((b.closest('article,section').querySelector('h1,h2,h3') || {}).textContent) || '').trim() : ''); });
        return;
      }
      if (icon === 'favorite' || icon === 'favorite_border' || /wishlist/i.test(aria)) {
        var headerBtn = !!b.closest('header');
        b.classList.add('za-wired');
        if (headerBtn) { b.addEventListener('click', function () { var n = getWish().length; toast(n ? n + (n === 1 ? ' saved piece' : ' saved pieces') + ' in your wishlist' : 'Wishlist empty — tap the heart on a piece'); }); return; }
        var card = b.closest('article,section');
        var pname = card ? (((card.querySelector('h1,h2,h3') || {}).textContent) || 'piece').replace(/\s+/g, ' ').trim() : 'piece';
        var saved = getWish().indexOf(pname) > -1;
        if (saved && icon === 'favorite') setFilled(b, true);
        b.addEventListener('click', function () {
          var list = getWish(), idx = list.indexOf(pname);
          if (idx > -1) { list.splice(idx, 1); setFilled(b, false); toast('Removed from wishlist'); }
          else { list.push(pname); setFilled(b, true); toast('Saved — ' + pname); }
          setWish(list);
        });
      }
    });
  }
  function setFilled(btn, on) {
    var s = btn.querySelector('.material-symbols-outlined');
    if (!s) return;
    s.textContent = on ? 'favorite' : 'favorite_border';
    s.style.fontVariationSettings = "'FILL' " + (on ? 1 : 0);
  }

  /* generic chip group: sibling buttons toggling selection */
  function wireChipGroups() {
    $all('button').forEach(function (b) {
      if (b.classList.contains('za-wired')) return;
      var t = norm(b);
      if (!/^\d\d$|^\d\d us [\d.]+$|^6$|^7$|^8$|^9$/.test(t) || b.closest('header')) return;
      var group = b.parentElement;
      if (!group || group.querySelectorAll(':scope > button').length < 3) return;
      b.classList.add('za-wired', 'za-chip');
      b.addEventListener('click', function () {
        group.querySelectorAll(':scope > button.za-chip').forEach(function (c) { c.classList.remove('za-chip--on'); });
        b.classList.add('za-chip--on');
        if (!/^\d+$/.test(t)) return;
        toast('Size ' + t + ' selected');
      });
    });
  }

  /* collection: category filter chips, view toggle, filter panel, ?q= */
  var CAT_KEYWORDS = {
    'plain': /plain|core band/i, 'moissanite': /moissanite|solitaire|brilliant/i,
    'textured': /fluted|textured|chevron|hugger|pav/i, 'sets': /set|triad|stack of|curated/i,
    'ear': /ear|cuff|huggie/i
  };
  function filterGrid(kw, label) {
    var grid = document.getElementById('catalogGrid') || $('main .grid');
    if (!grid) return 0;
    var arts = $all('article', grid), shown = 0;
    arts.forEach(function (a) {
      var show = !kw || kw.test(a.textContent);
      a.style.display = show ? '' : 'none';
      if (show) shown++;
    });
    if (label !== null) toast(shown + (shown === 1 ? ' piece' : ' pieces') + (label ? ' — ' + label : ''));
    return shown;
  }
  function wireCollection() {
    if (PAGE !== 'collection.html') return;
    $all('main button').forEach(function (b) {
      var t = norm(b).replace(/\(\d+\)/, '').trim();
      var key = /all pieces|^all\b/.test(t) ? 'all' : Object.keys(CAT_KEYWORDS).find(function (k) { return t.indexOf(k) > -1; });
      if (key && (key === 'all' || key)) {
        b.classList.add('za-wired', 'za-chip');
        b.addEventListener('click', function () {
          $all('main button.za-chip').forEach(function (c) { c.classList.remove('za-chip--on'); });
          b.classList.add('za-chip--on');
          filterGrid(key === 'all' ? null : CAT_KEYWORDS[key], key === 'all' ? null : b.textContent.replace(/\(\d+\)/, '').trim());
        });
      }
    });
    var gridBtn = $all('main button').find(function (b) { return iconOf(b) === 'grid_view'; });
    if (gridBtn) { gridBtn.classList.add('za-wired'); gridBtn.addEventListener('click', function () { setGridCols(2); toast('Two-column view'); }); }
    var listBtn = $all('main button').find(function (b) { return iconOf(b) === 'view_agenda'; });
    if (listBtn) { listBtn.classList.add('za-wired'); listBtn.addEventListener('click', function () { setGridCols(1); toast('Editorial view'); }); }
    var reset = $all('main button').find(function (b) { return norm(b) === 'reset'; });
    if (reset) { reset.classList.add('za-wired'); reset.addEventListener('click', function () { $all('.za-chip--on').forEach(function (c) { c.classList.remove('za-chip--on'); }); filterGrid(null, 'Filters cleared'); }); }
    var apply = $all('main button').find(function (b) { return /apply filters/i.test(norm(b)); });
    if (apply) { apply.classList.add('za-wired'); apply.addEventListener('click', function () { var n = filterGrid(null, null); toast('Showing ' + n + ' pieces'); }); }
    var q = new URLSearchParams(location.search).get('q');
    if (q) {
      var re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filterGrid(re, '“' + q + '”');
    }
  }
  function setGridCols(n) {
    var grid = document.getElementById('catalogGrid');
    if (!grid) return;
    grid.classList.remove('grid-cols-1', 'grid-cols-2');
    grid.classList.add('grid-cols-' + n);
  }

  /* home + studio + account set/acquire buttons: parse price from the button itself */
  function wirePriceButtons() {
    $all('main button').forEach(function (b) {
      if (b.classList.contains('za-wired')) return;
      var t = norm(b);
      var m = t.match(/aed\s*([\d,]+)(?:\.\d+)?/);
      if (!m || !/add set|acquire|slot to ear|add to stack/.test(t)) return;
      var price = parseFloat(m[1].replace(/,/g, ''));
      var card = b.closest('article,section');
      var name = card ? (((card.querySelector('h1,h2,h3,h4') || {}).textContent) || '').replace(/\s+/g, ' ').trim() : '';
      if (!name) name = t.replace(/shopping_bag|add set to bag|acquire curated stack|add to stack|slot to ear|·/gi, ' ').replace(/\s+/g, ' ').trim() || 'ZASTARA piece';
      name = name.replace(/·?\s*AED\s*[\d,.]+.*$/, '').trim() || name;
      b.classList.add('za-wired');
      b.addEventListener('click', function () { addToCart(name, price, card); });
    });
  }

  /* newsletter, guides, misc toasts, express pay, tabs */
  function wireStackStudio() {
    if (PAGE !== 'stack-studio.html') return;
    var C = $('#layers-container');
    if (!C) return;
    var OV = { knife: '5a2779b762f2d5c6', solitaire: '6dd96a90f0605e5a', flat: '5a2779b762f2d5c6', comfort: '5a2779b762f2d5c6', classic: '5a2779b762f2d5c6', prism: 'ff34151e96c86cbd', facet: 'ff34151e96c86cbd', pave: '6dd96a90f0605e5a', flut: '60fdf730eee34d01', marquise: '6dd96a90f0605e5a', bloom: '60fdf730eee34d01', pear: 'ca30676073a93fec', baguette: 'ff34151e96c86cbd', chevron: '6dd96a90f0605e5a' };
    var KEY = ['knife','solitaire','comfort','flat','classic','prism','facet','pav','flut','marquise','bloom','pear','baguette','chevron'];
    function ringFor(name) {
      var n = name.toLowerCase();
      for (var i = 0; i < KEY.length; i++) { if (n.indexOf(KEY[i]) > -1) return 'assets/img/ring-' + OV[KEY[i]] + '.png'; }
      return 'assets/img/ring-5a2779b762f2d5c6.png';
    }
    function layerName(r) { var m = r.querySelector('.font-body-md'); return m ? m.textContent.replace(/\s+/g, ' ').trim() : norm(r).slice(0, 40); }
    /* finger geometry in fractions of the source photo (studio-finger-clean.webp, 2816x1404) */
    var CX = 0.50, CY = 0.46;                  /* ring cluster center */
    var KX = 0.025, KY = 0.055;                /* per-step offset toward knuckle (width/height fracs) */
    var ROT = -25, RW = 0.13;                  /* ring rotation (deg), ring width (frac of rendered width) */
    var heroImg = null, layer = null;
    function mount() {
      heroImg = $all('main img').filter(function (im) { return /stacked|three rhodium/i.test(im.getAttribute('data-alt') || ''); })[0];
      if (!heroImg) return false;
      heroImg.src = 'assets/img/studio-finger-clean.webp';
      heroImg.setAttribute('alt', 'ZASTARA finger preview');
      layer = document.createElement('div');
      layer.id = 'za-finger-rings';
      layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:6;';
      heroImg.parentElement.appendChild(layer);
      return true;
    }
    function geom() {
      var rw = heroImg.clientWidth, rh = heroImg.clientHeight;
      var nw = heroImg.naturalWidth || 2816, nh = heroImg.naturalHeight || 1404;
      var s = Math.max(rw / nw, rh / nh), dw = nw * s, dh = nh * s;
      return { x: (rw - dw) / 2, y: (rh - dh) / 2, w: dw, h: dh };
    }
    function renumber() {
      var rows = $all('.layer-item', C), n = rows.length;
      rows.forEach(function (r, i) { var lab = r.querySelector('.font-label-caps'); if (lab && /^L\d/.test(lab.textContent.trim())) lab.textContent = 'L' + (n - i); });
    }
    function render() {
      if (!layer && !mount()) return;
      var g = geom(), rows = $all('.layer-item', C), n = rows.length, html = '';
      rows.forEach(function (r, i) {
        var cx = CX + ((n - 1) / 2 - i) * KX, cy = CY - ((n - 1) / 2 - i) * KY;
        var px = g.x + cx * g.w, py = g.y + cy * g.h;
        html += '<img src="' + ringFor(layerName(r)) + '" alt="" style="position:absolute;left:' + px.toFixed(1) + 'px;top:' + py.toFixed(1) + 'px;width:' + (RW * g.w).toFixed(1) + 'px;transform:translate(-50%,-50%) rotate(' + ROT + 'deg);filter:drop-shadow(0 10px 14px rgba(30,4,20,.45));z-index:' + (10 + i) + ';transition:left .35s ease, top .35s ease;">';
      });
      layer.innerHTML = html;
    }
    var prevCount = $all('.layer-item', C).length;
    new MutationObserver(function () {
      var n = $all('.layer-item', C).length;
      if (n > prevCount) toast('Added to stack \u2014 ' + layerName($all('.layer-item', C)[0]));
      else if (n < prevCount) toast('Band removed from stack');
      prevCount = n;
      render(); renumber();
    }).observe(C, { childList: true });
    C.addEventListener('click', function (e) {
      var up = e.target.closest && e.target.closest('.layer-up');
      var dn = e.target.closest && e.target.closest('.layer-down');
      var row = e.target.closest && e.target.closest('.layer-item');
      if (!row || (!up && !dn)) return;
      if (up) toast(row.previousElementSibling ? 'Moved up in stack' : 'Already at top of stack');
      if (dn) toast(row.nextElementSibling ? 'Moved down in stack' : 'Already at bottom of stack');
    }, true);
    window.addEventListener('resize', render);
    if (heroImg && !heroImg.complete) heroImg.addEventListener('load', render);
    render(); renumber();
    $all('.add-band-btn').forEach(function (b) { b.classList.add('za-wired'); });
    var q = $('#quick-add-slot-btn');
    if (q) { q.classList.add('za-wired'); }
  }
  function wireMisc() {
    $all('main button, form button').forEach(function (b) {
      if (b.classList.contains('za-wired')) return;
      var t = norm(b);
      if (/^join$/.test(t) || /subscribe/.test(t)) {
        b.classList.add('za-wired');
        b.addEventListener('click', function () {
          var input = b.closest('section,div,form') && b.closest('section,div,form').querySelector('input[type="email"],input[type="text"]');
          if (input && /.+@.+\..+/.test(input.value)) { toast('Welcome — check your inbox'); input.value = ''; }
          else if (input) { input.focus(); toast('Enter a valid email address'); }
          else toast('Welcome to ZASTARA — check your inbox');
        });
      } else if (/sizing guide/.test(t)) {
        b.classList.add('za-wired');
        b.addEventListener('click', function () { toast('EU 48=US4.5 · 50=5.25 · 52=6.0 · 54=7.0 · Circumference mm ÷ π = size'); });
      } else if (/^guide$/.test(t)) {
        b.classList.add('za-wired');
        b.addEventListener('click', function () { toast('Flush nesting: total stack depth ≤ 6.6mm for zero gap'); });
      } else if (/pay express|^pay$|g pay/.test(t)) {
        b.classList.add('za-wired');
        b.addEventListener('click', function () {
          if (PAGE === 'bag.html') location.href = 'checkout.html';
          else { var el = $all('input[name="payment_choice"]')[2]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Complete payment via the options below'); }
        });
      } else if (/edit in studio/.test(t)) {
        b.classList.add('za-wired'); b.addEventListener('click', function () { location.href = 'stack-studio.html'; });
      } else if (/inspect vehicle telemetry/i.test(t)) {
        b.classList.add('za-wired'); b.addEventListener('click', function () { toast('Live telemetry unlocks at dispatch'); });
      } else if (/^tune$/.test(t) && !/apply filters/i.test(t)) {
        b.classList.add('za-wired'); b.addEventListener('click', function () { toast('Preferences — coming soon to the client portal'); });
      } else if (/book fitting/.test(t)) {
        b.classList.add('za-wired'); b.addEventListener('click', function () { toast('Fitting request sent — we will contact you'); });
      } else if (/whatsapp stylist/.test(t)) {
        b.classList.add('za-wired'); b.addEventListener('click', function () { toast('Contact line: +971 4 555 0100'); });
      } else if (/^configured$/.test(t)) {
        b.classList.add('za-wired'); b.addEventListener('click', function () { toast('Configuration saved'); });
      } else if (iconOf(b) === 'bookmark_border' || iconOf(b) === 'bookmark') {
        b.classList.add('za-wired');
        b.addEventListener('click', function () {
          var s = b.querySelector('.material-symbols-outlined');
          var on = s.textContent.trim() !== 'bookmark';
          s.textContent = on ? 'bookmark' : 'bookmark_border';
          toast(on ? 'Saved to your vault' : 'Removed from vault');
        });
      } else if (iconOf(b) === '360' || /360/.test(t)) {
        b.classList.add('za-wired');
        b.addEventListener('click', function () {
          var prev = document.querySelector('main .relative img, main canvas, main [class*="preview"]');
          toast('360° preview');
          if (prev) { prev.style.transition = 'transform 1.6s ease'; prev.style.transform = 'rotateY(360deg)'; setTimeout(function () { prev.style.transform = ''; }, 1700); }
        });
      } else if (iconOf(b) === 'refresh') {
        b.classList.add('za-wired'); b.addEventListener('click', function () { toast('Preview reset'); });
      } else if (iconOf(b) === 'flip' || /^pair/.test(t)) {
        b.classList.add('za-wired');
        b.addEventListener('click', function () {
          var prev = document.querySelector('main .relative img, main [class*="preview"]');
          var flipped = b.classList.toggle('za-flipped');
          if (prev) prev.style.transform = flipped ? 'scaleX(-1)' : '';
          toast('Mirrored ear');
        });
      } else if (iconOf(b) === 'straighten') {
        b.classList.add('za-wired'); b.addEventListener('click', function () { toast('Flush nesting depth: 5.4mm · zero gap'); });
      } else if (/clear all/.test(t)) {
        b.classList.add('za-wired');
        b.addEventListener('click', function () {
          var rows = $all('article[data-ear], [class*="slot-row"]');
          rows.forEach(function (r) { r.remove(); });
          $all('.za-chip--on').forEach(function (c) { c.classList.remove('za-chip--on'); });
          toast('All slots cleared');
        });
      } else if (iconOf(b) === 'swap_horiz') {
        b.classList.add('za-wired');
        b.addEventListener('click', function () {
          var row = b.closest('div');
          var img = row && row.parentElement && row.parentElement.querySelector('img');
          if (!img && b.parentElement) img = b.parentElement.querySelector('img');
          if (img) { var f = img.dataset.zaflip === '1' ? '' : '-1'; img.dataset.zaflip = f === '-1' ? '1' : '0'; img.style.transform = f ? 'scaleX(-1)' : ''; toast('Mirrored'); }
          else toast('Mirrored');
        });
      } else if (iconOf(b) === 'close' && PAGE === 'ear-studio.html') {
        b.classList.add('za-wired');
        b.addEventListener('click', function () {
          var row = b.closest('article, li, .flex');
          if (row) row.remove();
          toast('Slot cleared');
        });
      } else if (/add 4th nesting layer|add \d+\w*\s*nesting layer/i.test(t)) {
        b.classList.add('za-wired');
        b.addEventListener('click', function () {
          var stack = b.closest('section');
          var rows = stack ? $all('div', stack).filter(function (d) { return /^\d\d/.test(norm(d)) && /mm/.test(d.textContent) && d.className.indexOf('h-') > -1; }) : [];
          if (!stack || rows.length >= 4) { toast('Maximum 4 nesting layers'); return; }
          var last = rows[rows.length - 1];
          var clone = last.cloneNode(true);
          clone.textContent = '0' + (rows.length + 1) + ' · 1.4mm Chevron Rhodium';
          clone.style.opacity = '0';
          last.after(clone);
          requestAnimationFrame(function () { clone.style.transition = 'opacity .4s'; clone.style.opacity = '1'; });
          toast('Layer 0' + (rows.length + 1) + ' added');
        });
      } else if (/^(left ear|right ear|left|right)$/.test(t) && PAGE === 'ear-studio.html') {
        b.classList.add('za-wired');
        b.addEventListener('click', function () {
          $all('main button.za-chip').forEach(function (c) { if (/left|right/.test(norm(c))) c.classList.remove('za-chip--on'); });
          b.classList.add('za-chip--on');
          var prev = document.querySelector('main .relative img');
          if (prev) prev.style.transform = /right/.test(t) ? 'scaleX(-1)' : '';
          toast(t.toUpperCase() + ' preview');
        });
      } else if (/ear & piercing|ear and piercing/.test(t)) {
        b.classList.add('za-wired');
        b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); toast('Ear & Piercing studio'); });
      } else if (/(add to stack|acquire)/i.test(t)) {
        b.classList.add('za-wired');
        b.addEventListener('click', function () {
          var row = b.closest('article,li,div.flex');
          var name = row ? (((row.querySelector('h1,h2,h3,h4,[class*="title-editorial"]') || {}).textContent) || 'ZASTARA piece').replace(/\s+/g, ' ').trim() : 'ZASTARA piece';
          var pm = row && row.textContent.match(/AED\s*([\d,]+(?:\.\d+)?)/);
          if (pm) addToCart(name, parseFloat(pm[1].replace(/,/g, '')), row);
          else toast('Added — ' + name);
        });
      } else if (/\badd$/.test(t)) {
        b.classList.add('za-wired');
        b.addEventListener('click', function () {
          var row = b.closest('article,div.flex');
          var name = row ? (((row.querySelector('h1,h2,h3,h4') || {}).textContent) || row.textContent).replace(/\s+/g, ' ').trim().slice(0, 60) : 'piece';
          var pm = row && row.textContent.match(/AED\s*([\d,]+(?:\.\d+)?)/);
          if (pm) addToCart(name.split('·')[0].trim(), parseFloat(pm[1].replace(/,/g, '')), row);
          else toast('Added to your bag');
        });
      }
    });
  }

  /* account: tab buttons show/hide sections */
  function wireTabs() {
    var tabs = $all('main button').filter(function (b) { return /saved stacks|orders|vault & fit/i.test(norm(b)); });
    if (tabs.length < 2) return;
    tabs.forEach(function (tab) {
      if (tab.classList.contains('za-wired')) return;
      tab.classList.add('za-wired');
      tab.addEventListener('click', function () {
        tabs.forEach(function (o) { o.classList.remove('za-tab-on'); o.style.opacity = '0.55'; });
        tab.classList.add('za-tab-on'); tab.style.opacity = '1';
        var label = norm(tab);
        var key = /saved stacks/.test(label) ? /saved stack|curated/i : /orders/.test(label) ? /order|dispatch|delivery/i : /vault|fit/i ? /vault|fit|size/i : null;
        var sections = $all('main section');
        var matched = 0;
        sections.forEach(function (s) {
          if (!key) return;
          var hit = key.test(s.textContent.slice(0, 400));
          if (key.test(s.textContent)) { s.style.display = ''; matched++; }
        });
        if (matched) toast('Showing: ' + label.replace(/\s*\(\d+\)/, ''));
      });
    });
  }

  /* piece: In Stack / Solo toggle */
  function wirePieceView() {
    if (PAGE !== 'piece.html') return;
    var inStack = $all('main button').find(function (b) { return /in stack/.test(norm(b)); });
    var solo = $all('main button').find(function (b) { return /solo/.test(norm(b)); });
    if (!inStack) return;
    [[inStack, 'view-stack'], [solo, 'view-solo']].forEach(function (pair, idx) {
      var btn = pair[0]; if (!btn) return;
      btn.classList.add('za-wired');
      btn.addEventListener('click', function () {
        var s = document.getElementById('view-stack'), o = document.getElementById('view-solo');
        var showStack = idx === 0;
        if (s) s.style.display = showStack ? '' : 'none';
        if (o) o.style.display = showStack ? 'none' : '';
        [inStack, solo].forEach(function (x) { if (x) x.classList.remove('za-tab-on'); });
        btn.classList.add('za-tab-on');
      });
    });
  }

  /* ---------- toast styles ---------- */
  var css = document.createElement('style');
  css.textContent = '.za-toast{position:fixed;left:50%;bottom:88px;transform:translate(-50%,12px);background:#380622;color:#faf9f6;' +
    'font-family:Inter,sans-serif;font-size:12px;letter-spacing:.08em;text-transform:uppercase;padding:12px 20px;' +
    'box-shadow:0 8px 24px rgba(56,6,34,.35);opacity:0;transition:opacity .3s,transform .3s;z-index:9999;pointer-events:none;}' +
    '.za-toast--show{opacity:1;transform:translate(-50%,0);}' +
    '.za-chip--on{outline:2px solid #380622;outline-offset:-2px;background-color:#380622 !important;color:#faf9f6 !important;}' +
    '.za-tab-on{outline:2px solid #380622;outline-offset:2px;}' +
    '.za-ann{position:fixed;top:0;left:0;right:0;z-index:60;height:36px;display:flex;align-items:center;justify-content:center;background:#1c0412;color:#f2e9ee;font-size:9px;letter-spacing:.28em;text-transform:uppercase;font-family:Inter,system-ui,sans-serif;padding:0 12px;text-align:center;}' +
    'body>main{padding-top:6.75rem !important;}' +
    '.za-pay{display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:26px;padding:0 8px;border:1px solid #d8d0cc;border-radius:4px;font-size:10px;letter-spacing:.08em;color:#380622;background:#fff;}' +
    '@media(max-width:639px){header button[aria-label="Switch language"]{display:none !important}body>main{padding-top:7.5rem !important}}';
  document.head.appendChild(css);

  function wireFooter() {
    $all('footer button').forEach(function (b) {
      if (b.classList.contains('za-wired')) return;
      var t = norm(b);
      b.classList.add('za-wired');
      if (/sign me up|subscribe/.test(t)) {
        b.addEventListener('click', function () {
          var i = document.querySelector('.za-news-email');
          if (i && i.value && /.+@.+\..+/.test(i.value)) { toast('Welcome to ZASTARA — check your inbox'); i.value = ''; }
          else toast('Please enter a valid email address');
        });
        return;
      }
      b.addEventListener('click', function () {
        toast('Contact — ' + t.replace(/\s+/g, ' '));
      });
    });
  }

  /* ---------- boot ---------- */
  wireNav();
  updateBadges();
  wireStackStudio();
  wireAddButtons();
  wireOverlays();
  wireHeader();
  wireShareAndWish();
  wireChipGroups();
  wireCollection();
  wirePriceButtons();
  wireMisc();
  wireTabs();
  wirePieceView();
  wireFooter();
  if (PAGE === 'bag.html') renderBag();
  if (PAGE === 'checkout.html') wireCheckout();
  if (PAGE === 'confirmation.html') fillConfirmation();
})();
