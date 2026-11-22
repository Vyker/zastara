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
    [/^build your stack|^start your stack|^build.*stack/, 'stack-studio.html'],
    [/^explore collection|^shop collection|^view collection|^shop pieces|^explore pieces/, 'collection.html'],
    [/^sets$|^explore sets|^view sets/, 'account.html'],
    [/^proceed to secure checkout/, 'checkout.html'],
    [/^continue shopping|^back to collection|^continue browsing|^discover the collection/, 'collection.html'],
    [/^view saved stacks|^saved stacks/, 'account.html'],
    [/^ear piercing|^ear stack|^build.*ear/, 'ear-studio.html'],
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
      if (!/(^|[^a-z])add to (stack|bag)|^auto_fix_high acquire|^acquire/i.test(text)) return;
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
          '<p class="font-body-sm text-secondary mt-1">Curated stacks await in the atelier.</p>' +
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

  /* ---------- toast styles ---------- */
  var css = document.createElement('style');
  css.textContent = '.za-toast{position:fixed;left:50%;bottom:88px;transform:translate(-50%,12px);background:#380622;color:#faf9f6;' +
    'font-family:Inter,sans-serif;font-size:12px;letter-spacing:.08em;text-transform:uppercase;padding:12px 20px;' +
    'box-shadow:0 8px 24px rgba(56,6,34,.35);opacity:0;transition:opacity .3s,transform .3s;z-index:9999;pointer-events:none;}' +
    '.za-toast--show{opacity:1;transform:translate(-50%,0);}';
  document.head.appendChild(css);

  /* ---------- boot ---------- */
  wireNav();
  updateBadges();
  wireAddButtons();
  if (PAGE === 'bag.html') renderBag();
  if (PAGE === 'checkout.html') wireCheckout();
  if (PAGE === 'confirmation.html') fillConfirmation();
})();
