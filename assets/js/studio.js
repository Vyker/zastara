/* ZASTARA Stack Studio engine — rings, necklaces, ears. Reuses site.js helpers ($, $all, norm, toast). */
(function () {
  'use strict';
  if (!document.getElementById('za-stage')) return;
  var CART = ['zastara', 'cart', 'v1'].join('_');
  var SAVED = ['zastara', 'saved', 'stacks', 'v1'].join('_');
  var AED = function (n) { return 'AED ' + n.toLocaleString('en-US'); };
  function toast(m) {
    var t = document.createElement('div');
    t.textContent = m;
    t.style.cssText = 'position:fixed;left:50%;bottom:92px;transform:translateX(-50%);background:#380622;color:#fff;padding:10px 18px;border-radius:2px;font:12px Inter,sans-serif;letter-spacing:.06em;z-index:9999;box-shadow:0 6px 24px rgba(0,0,0,.28);opacity:0;transition:opacity .3s;max-width:88vw;text-align:center;';
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; });
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 400); }, 2200);
  }

  var RINGS = [
    { id: 'flat',    name: 'The Flat Edge Band',       sub: '2.4mm · Comfort-Fit',        price: 88,  cut: 'ring-5a2779b762f2d5c6.png', thumb: '5a2779b762f2d5c6.webp' },
    { id: 'marquise',name: 'The Marquise Eternity',    sub: 'Marquise Moissanite',        price: 242, cut: 'ring-6dd96a90f0605e5a.png', thumb: '6dd96a90f0605e5a.webp' },
    { id: 'bloom',   name: 'Marquise Bloom Eternity',  sub: 'Open Marquise Set',          price: 280, cut: 'ring-60fdf730eee34d01.png', thumb: '60fdf730eee34d01.webp' },
    { id: 'baguette',name: 'Emerald Baguette Eternity',sub: 'Baguette Moissanite',        price: 280, cut: 'ring-ff34151e96c86cbd.png', thumb: 'ff34151e96c86cbd.webp' },
    { id: 'pear',    name: 'Pear Cluster Eternity',    sub: 'Pear & Round Cluster',       price: 340, cut: 'ring-ca30676073a93fec.png', thumb: 'ca30676073a93fec.webp' }
  ];
  var NECKLACES = [ /* awaiting product photography — transparent PNGs, see ASSETS NEEDED */ ];
  var NECK_PLACE = ['The Petit Tennis 40cm', 'The Station Necklace 45cm', 'The Ravenna Pendant 50cm', 'The Rivière 40cm'];
  var EARRINGS = [
    { id: 'stud',    name: 'Solstice Ball Stud',       price: 120, cut: 'cut-ballstud.png',    w: 0.045, slot: 'lobe1' },
    { id: 'trio',    name: 'Stellar Trio Huggie',      price: 240, cut: 'cut-triohuggie.png',  w: 0.062, slot: 'lobe1' },
    { id: 'star',    name: 'Star Cascade Drop Huggie', price: 260, cut: 'cut-starhuggie.png',  w: 0.05,  slot: 'lobe1' },
    { id: 'crawler', name: 'Marquise Illusion Crawler',price: 380, cut: 'cut-crawler.png',     w: 0.105, slot: 'helix' }
  ];
  var GEO = {
    ring:      { base: 'assets/img/studio-finger-clean.webp', alt: 'Index finger preview', cx: 0.50,  cy: 0.46,  kx: 0.025, ky: 0.055, rot: -25, rw: 0.13,  max: 5, ratio: '4 / 3' },
    necklace:  { base: 'assets/img/studio-neck-clean.webp',   alt: 'Neck preview',         cx: 0.475, cy: 0.715, kx: 0.004, ky: 0.075, rot: 0,   rw: 0.52,  max: 4, ratio: '4 / 5' },
    ear:       { base: 'assets/img/studio-ear-clean.webp',    alt: 'Ear preview',          slots: {
        lobe1:   { x: 0.658, y: 0.812, rot: 0,   w: 0.05,  label: 'First Lobe' },
        lobe2:   { x: 0.632, y: 0.702, rot: -6,  w: 0.05,  label: 'Second Lobe' },
        lobe3:   { x: 0.604, y: 0.596, rot: -12, w: 0.05,  label: 'Third Lobe' },
        helix:   { x: 0.545, y: 0.30,  rot: 14,  w: 0.105, label: 'Helix / Crawler' }
      }, max: 4, ratio: '16 / 9' }
  };
  var SIZES = [5, 6, 7, 8, 9];
  var PRESETS = [
    { name: 'Minimal Duo',      ids: ['flat', 'marquise'] },
    { name: 'The Everyday Three', ids: ['flat', 'marquise', 'bloom'] },
    { name: 'Statement Stack',  ids: ['bloom', 'baguette', 'pear'] }
  ];

  var state = {
    cat: 'ring',
    ring: { items: [{ id: 'marquise' }, { id: 'bloom' }, { id: 'flat' }], size: 7, view: 'model', mirrored: false },
    necklace: { items: [], size: null, view: 'model', mirrored: false },
    ear: { items: {}, view: 'model', mirrored: false } /* slot -> id */
  };

  var stage = document.getElementById('za-stage');
  var baseImg = document.getElementById('za-base');
  var itemsLayer = document.getElementById('za-items');
  var slotsLayer = document.getElementById('za-slots-ui');

  function cfg() { return GEO[state.cat]; }
  function cat() { return state[state.cat]; }
  function find(id) {
    var src = state.cat === 'ring' ? RINGS : state.cat === 'ear' ? EARRINGS : NECKLACES;
    for (var i = 0; i < src.length; i++) if (src[i].id === id) return src[i];
    return null;
  }
  function geom() {
    var rw = baseImg.clientWidth, rh = baseImg.clientHeight;
    var nw = baseImg.naturalWidth || 100, nh = baseImg.naturalHeight || 100;
    var s = Math.max(rw / nw, rh / nh);
    return { x: (rw - nw * s) / 2, y: (rh - nh * s) / 2, w: nw * s, h: nh * s };
  }
  function mirrorX(x) { return cat().mirrored ? 1 - x : x; }

  /* ---------- renderers ---------- */
  function itemHtml(p, px, py, wpx, rot, zi) {
    return '<img src="assets/img/' + p.cut + '" alt="' + p.name + '" style="position:absolute;left:' +
      px.toFixed(1) + 'px;top:' + py.toFixed(1) + 'px;width:' + wpx.toFixed(1) +
      'px;transform:translate(-50%,-50%) rotate(' + rot + 'deg);filter:drop-shadow(0 8px 12px rgba(30,4,20,.4));z-index:' +
      zi + ';transition:left .35s ease,top .35s ease;" draggable="false">';
  }
  function renderStacked() {
    var g = geom(), c = cfg(), n = cat().items.length, html = '', half = (n - 1) / 2;
    cat().items.forEach(function (it, i) {
      var p = find(it.id); if (!p) return;
      var k = half - i; /* i=0 (top of list) sits highest: knuckle / shortest chain */
      var cx = mirrorX(c.cx + k * c.kx);
      var cy = c.cy - k * c.ky;
      var wFrac = c.rw;
      if (state.cat === 'necklace') wFrac = c.rw * (1 + (half - i) * 0.14);
      var rot = state.cat === 'ring' ? c.rot : 0;
      html += itemHtml(p, g.x + cx * g.w, g.y + cy * g.h, wFrac * g.w, rot, 10 + i);
    });
    itemsLayer.innerHTML = html;
  }
  function renderEars() {
    var g = geom(), s = GEO.ear.slots, html = '';
    Object.keys(s).forEach(function (slot) {
      var d = s[slot], it = cat().items[slot];
      var hx = g.x + mirrorX(d.x) * g.w, hy = g.y + d.y * g.h;
      if (it) {
        var p = find(it);
        if (p) html += itemHtml(p, hx, hy, p.w * g.w, cat().mirrored ? -d.rot : d.rot, 10);
      }
      html += '<button class="za-hot" data-slot="' + slot + '" aria-label="Piercing: ' + d.label + '" title="' + d.label + '" style="position:absolute;left:' +
        hx.toFixed(1) + 'px;top:' + hy.toFixed(1) +
        'px;width:30px;height:30px;transform:translate(-50%,-50%);border-radius:9999px;border:1.5px dashed ' +
        (it ? 'transparent' : 'rgba(56,6,34,.55)') + ';background:' + (it ? 'transparent' : 'rgba(215,227,239,.25)') +
        ';cursor:pointer;z-index:20;"></button>';
    });
    itemsLayer.innerHTML = html;
  }
  function renderProductView() {
    var list = state.cat === 'ear'
      ? Object.keys(cat().items).map(function (k) { return { p: find(cat().items[k]), tag: GEO.ear.slots[k].label }; })
      : cat().items.map(function (it) { return { p: find(it.id), tag: '' }; });
    var html = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:4%;background:linear-gradient(160deg,#ffffff 0%,#eef3f9 55%,#d7e3ef 100%);">';
    var shown = list.filter(function (l) { return l.p; });
    if (!shown.length) html += '<div style="font-family:Inter,sans-serif;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#7c6a72;">No pieces yet — select to the right</div>';
    shown.forEach(function (l) {
      html += '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;max-width:26%;">' +
        '<img src="assets/img/' + l.p.cut + '" alt="' + l.p.name + '" style="max-height:52%;width:auto;max-width:100%;object-fit:contain;filter:drop-shadow(0 10px 16px rgba(30,4,20,.18));">' +
        '<span style="font-family:Inter,sans-serif;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#380622;text-align:center;">' + l.p.name + (l.tag ? ' · ' + l.tag : '') + '</span></div>';
    });
    itemsLayer.innerHTML = html + '</div>';
  }
  function render() {
    var c = cfg();
    stage.style.aspectRatio = c.ratio;
    if (cat().view === 'product') {
      baseImg.style.visibility = 'hidden';
      renderProductView();
    } else {
      baseImg.style.visibility = 'visible';
      if (baseImg.getAttribute('data-src') !== c.base) {
        baseImg.setAttribute('data-src', c.base);
        baseImg.src = c.base;
      }
      baseImg.style.transform = cat().mirrored ? 'scaleX(-1)' : '';
      if (state.cat === 'ear') renderEars(); else renderStacked();
    }
    renderSlots(); renderShelf(); renderSummary();
    document.querySelectorAll('#za-sizes [data-size]').forEach(function (o) {
      var on = +o.getAttribute('data-size') === cat().size;
      o.classList.toggle('bg-primary', on); o.classList.toggle('text-on-primary', on);
    });
  }

  /* ---------- slots list (arrows, remove, replace, size) ---------- */
  function renderSlots() {
    var el = document.getElementById('za-slots');
    if (state.cat === 'ear') {
      var rows = [];
      Object.keys(GEO.ear.slots).forEach(function (slot) {
        var d = GEO.ear.slots[slot], it = cat().items[slot], p = it ? find(it) : null;
        rows.push('<div class="flex items-center justify-between gap-2 py-2 border-b border-[#efe9e5]"><div class="flex items-center gap-3 min-w-0">' +
          '<span class="font-label-specs text-label-specs text-secondary w-24 shrink-0 uppercase">' + d.label + '</span>' +
          (p ? '<img src="assets/img/' + p.cut + '" class="w-8 h-8 object-contain shrink-0" alt=""><div class="min-w-0"><p class="font-body-md text-[13px] truncate">' + p.name + '</p><p class="font-label-specs text-label-specs text-primary">' + AED(p.price) + '</p></div>'
             : '<span class="font-body-sm text-[12px] text-outline italic">Empty — tap the ear or choose below</span>') +
          '</div><div class="flex gap-1 shrink-0">' +
          '<button class="za-slot-edit za-ic" data-slot="' + slot + '" data-mode="choose" aria-label="Choose earring" title="Choose / replace"><span class="material-symbols-outlined text-[16px]">' + (p ? 'swap_horiz' : 'add') + '</span></button>' +
          (p ? '<button class="za-slot-edit za-ic" data-slot="' + slot + '" data-mode="clear" aria-label="Remove earring" title="Remove"><span class="material-symbols-outlined text-[16px]">close</span></button>' : '') +
          '</div></div>');
      });
      el.innerHTML = rows.join('');
      return;
    }
    var n = cat().items.length;
    if (!n) { el.innerHTML = '<p class="font-body-sm text-[13px] text-outline italic py-4">Your ' + (state.cat === 'ring' ? 'ring ' : 'necklace ') + 'stack is empty — add pieces below.</p>'; return; }
    el.innerHTML = cat().items.map(function (it, i) {
      var p = find(it.id); if (!p) return '';
      return '<div class="flex items-center justify-between gap-2 py-2 border-b border-[#efe9e5]"><div class="flex items-center gap-3 min-w-0">' +
        '<span class="font-label-specs text-label-specs text-secondary w-7 shrink-0">L' + (n - i) + '</span>' +
        '<img src="assets/img/' + p.thumb + '" class="w-9 h-9 object-cover rounded-full shrink-0" alt="">' +
        '<div class="min-w-0"><p class="font-body-md text-[13px] truncate">' + p.name + '</p><p class="font-label-specs text-label-specs text-primary">' + AED(p.price) + (state.cat === 'ring' ? ' · Size ' + cat().size : '') + '</p></div></div>' +
        '<div class="flex gap-1 shrink-0">' +
        '<button class="za-move za-ic" data-i="' + i + '" data-dir="-1" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '><span class="material-symbols-outlined text-[16px]">keyboard_arrow_up</span></button>' +
        '<button class="za-move za-ic" data-i="' + i + '" data-dir="1" aria-label="Move down"' + (i === n - 1 ? ' disabled' : '') + '><span class="material-symbols-outlined text-[16px]">keyboard_arrow_down</span></button>' +
        '<button class="za-remove za-ic" data-i="' + i + '" aria-label="Remove"><span class="material-symbols-outlined text-[16px]">close</span></button>' +
        '</div></div>';
    }).join('');
  }
  if (!EARRINGS[0].thumb2) EARRINGS.forEach(function (e) { e.thumb2 = function () { return e.cut; }; });

  /* ---------- shelf ---------- */
  function renderShelf() {
    var el = document.getElementById('za-shelf');
    if (state.cat === 'necklace' && !NECKLACES.length) {
      el.innerHTML = NECK_PLACE.map(function (nm) {
        return '<div class="border border-dashed border-outline-variant rounded-sm p-3 flex flex-col gap-1 bg-[#d7e3ef]/20"><div class="aspect-square rounded-sm bg-[#d7e3ef]/40 flex items-center justify-center mb-1"><span class="material-symbols-outlined text-[22px] text-[#8aa2bc]">link</span></div>' +
          '<p class="font-body-md text-[13px]">' + nm + '</p><p class="font-label-specs text-[10px] uppercase tracking-widest text-secondary">Photo needed — assets/img/necklace-' + nm.split(' ').pop().toLowerCase() + '.png</p></div>';
      }).join('') + '<p class="col-span-2 font-body-sm text-[12px] text-outline pt-1">Necklace product photography is being prepared. The stacking system is live — transparent PNGs dropped at <span class="font-medium">assets/img/necklace-*.png</span> appear here automatically.</p>';
      return;
    }
    var src = state.cat === 'ring' ? RINGS : EARRINGS;
    el.innerHTML = src.map(function (p) {
      var inStack = state.cat === 'ear' ? Object.keys(cat().items).some(function (k) { return cat().items[k] === p.id; }) : cat().items.some(function (it) { return it.id === p.id; });
      return '<button class="za-add group border border-[#e8e2df] hover:border-primary bg-white rounded-sm p-3 flex flex-col gap-1 text-left transition-colors' + (inStack ? ' opacity-45' : '') + '" data-id="' + p.id + '"' + (inStack ? ' aria-disabled="true"' : '') + '>' +
        '<div class="aspect-square rounded-sm bg-[#d7e3ef]/25 overflow-hidden flex items-center justify-center mb-1"><img src="assets/img/' + (state.cat === 'ring' ? p.thumb : p.cut) + '" class="max-h-full max-w-full object-contain" alt=""></div>' +
        '<p class="font-body-md text-[13px] leading-tight">' + p.name + '</p><p class="font-label-specs text-label-specs text-primary">' + AED(p.price) + '</p></button>';
    }).join('');
  }

  /* ---------- summary + commerce ---------- */
  function currentList() {
    if (state.cat === 'ring') return cat().items.map(function (it) { var p = find(it.id); return p ? { p: p, variant: 'Ring size ' + cat().size } : null; });
    if (state.cat === 'necklace') return cat().items.map(function (it) { var p = find(it.id); return p ? { p: p, variant: p.length || '45cm' } : null; });
    return Object.keys(cat().items).map(function (slot) { var p = find(cat().items[slot]); return p ? { p: p, variant: GEO.ear.slots[slot].label } : null; });
  }
  function renderSummary() {
    var list = currentList().filter(Boolean);
    var total = list.reduce(function (s, l) { return s + l.p.price; }, 0);
    var disc = state.cat === 'ring' && list.length >= 3 ? Math.round(total * 0.10) : 0;
    document.getElementById('za-count').textContent = list.length + (state.cat === 'ring' ? ' of 5 bands' : state.cat === 'necklace' ? ' of 4 chains' : ' pieces');
    document.getElementById('za-original').textContent = disc ? AED(total) : '';
    document.getElementById('za-total').textContent = AED(total - disc);
    var btn = document.getElementById('add-stack-to-bag');
    btn.classList.toggle('opacity-40', !list.length);
  }
  function addToBag() {
    var list = currentList().filter(Boolean);
    if (!list.length) { toast('Add at least one piece to your stack'); return; }
    var cart = [];
    try { cart = JSON.parse(localStorage.getItem(CART) || '[]') || []; } catch (e) { cart = []; }
    list.forEach(function (l) {
      cart.push({ id: l.p.id + '-' + (l.variant || 'std'), name: l.p.name, price: l.p.price, qty: 1, variant: l.variant, stack: state.cat, img: 'assets/img/' + (l.p.thumb || l.p.cut) });
    });
    localStorage.setItem(CART, JSON.stringify(cart));
    var badges = document.querySelectorAll('[data-cart-count]');
    badges.forEach(function (b) { b.textContent = cart.length; });
    toast('Stack added to your bag — ' + list.length + ' pieces');
  }
  function saveStack() {
    if (state.cat === 'necklace') { toast('Necklace pieces are coming soon'); return; }
    var saved = [];
    try { saved = JSON.parse(localStorage.getItem(SAVED) || '[]') || []; } catch (e) { saved = []; }
    saved.push({ cat: state.cat, items: state.cat === 'ear' ? cat().items : cat().items.map(function (i) { return i.id; }), size: cat().size, ts: Date.now() });
    localStorage.setItem(SAVED, JSON.stringify(saved));
    toast('Stack saved to your account device');
  }
  function shareStack() {
    var payload = state.cat === 'ear' ? { c: state.cat, i: cat().items } : { c: state.cat, i: cat().items.map(function (i) { return i.id; }), s: cat().size };
    var url = location.origin + location.pathname + '?stack=' + btoa(encodeURIComponent(JSON.stringify(payload)));
    var done = function () { toast('Shareable stack link copied'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { prompt('Copy your stack link', url); });
    else prompt('Copy your stack link', url);
  }
  function loadFromUrl() {
    var m = location.search.match(/[?&]stack=([^&]+)/); if (!m) return;
    try {
      var d = JSON.parse(decodeURIComponent(atob(m[1])));
      if (!d || !GEO[d.c]) return;
      state.cat = d.c === 'ear' ? 'ear' : d.c;
      if (d.c === 'ear') cat().items = d.i || {};
      else { cat().items = (d.i || []).map(function (id) { return { id: id }; }); if (d.s) cat().size = d.s; }
      toast('Loading shared stack');
    } catch (e) { /* ignore malformed */ }
  }

  /* ---------- events ---------- */
  function bind() {
    ['za-mirror', 'za-view-model', 'za-view-product', 'za-save', 'za-share', 'add-stack-to-bag'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.classList.add('za-wired');
    });
    document.querySelectorAll('.za-cat').forEach(function (b) { b.classList.add('za-wired'); });
    document.querySelectorAll('.za-preset').forEach(function (b) { b.classList.add('za-wired'); });
    document.querySelectorAll('.za-cat').forEach(function (b) {
      b.addEventListener('click', function () {
        state.cat = b.getAttribute('data-cat');
        document.querySelectorAll('.za-cat').forEach(function (o) {
          var on = o === b;
          o.className = o.className.replace(/bg-primary text-on-primary|bg-\[#d7e3ef\]\/\[0\.35\] text-primary/g, '').trim();
          if (on) o.classList.add('bg-primary', 'text-on-primary'); else o.classList.add('bg-surface-container', 'text-secondary');
        });
        document.getElementById('za-mirror').style.display = state.cat === 'ear' ? '' : 'none';
        document.getElementById('za-sizes').style.display = state.cat === 'ring' ? '' : 'none';
        render();
      });
    });
    document.getElementById('za-view-model').addEventListener('click', function () { setView('model'); });
    document.getElementById('za-view-product').addEventListener('click', function () { setView('product'); });
    function setView(v) {
      if (cat().view === v) { toast(v === 'model' ? 'Already on model preview' : 'Already in product view'); return; }
      cat().view = v;
      document.getElementById('za-view-model').classList.toggle('bg-primary', v === 'model');
      document.getElementById('za-view-model').classList.toggle('text-on-primary', v === 'model');
      document.getElementById('za-view-product').classList.toggle('bg-primary', v === 'product');
      document.getElementById('za-view-product').classList.toggle('text-on-primary', v === 'product');
      render();
    }
    document.getElementById('za-mirror').addEventListener('click', function () {
      cat().mirrored = !cat().mirrored;
      toast(cat().mirrored ? 'Right ear' : 'Left ear');
      render();
    });
    document.getElementById('za-slots').addEventListener('click', function (e) {
      var mv = e.target.closest && e.target.closest('.za-move');
      var rm = e.target.closest && e.target.closest('.za-remove');
      var ed = e.target.closest && e.target.closest('.za-slot-edit');
      if (mv && !mv.disabled) {
        var i = +mv.getAttribute('data-i'), d = +mv.getAttribute('data-dir');
        var a = cat().items, j = i + d;
        if (j < 0 || j >= a.length) return;
        var t = a[i]; a[i] = a[j]; a[j] = t;
        toast(d === -1 ? 'Moved up in stack' : 'Moved down in stack');
        render();
      } else if (rm) {
        cat().items.splice(+rm.getAttribute('data-i'), 1);
        toast('Removed from stack'); render();
      } else if (ed) {
        var slot = ed.getAttribute('data-slot'), mode = ed.getAttribute('data-mode');
        if (mode === 'clear') { delete cat().items[slot]; toast('Earring removed'); render(); }
        else openPicker(slot);
      }
    });
  var picker = null;
  function openPicker(slot) {
    closePicker();
    picker = document.createElement('div');
    picker.style.cssText = 'position:fixed;left:0;right:0;bottom:90px;z-index:9999;padding:0 16px;';
    picker.innerHTML = '<div class="mx-auto max-w-md bg-white rounded-sm shadow-2xl border border-[#e8e2df] p-4">' +
      '<div class="flex items-center justify-between mb-3"><p class="font-label-caps text-label-caps tracking-widest uppercase text-primary">' + (GEO.ear.slots[slot] || {}).label + '</p>' +
      '<button class="za-ic" id="za-picker-x" aria-label="Close"><span class="material-symbols-outlined text-[18px]">close</span></button></div>' +
      '<div class="grid grid-cols-2 gap-2">' + EARRINGS.map(function (p) {
        return '<button class="za-pick border border-[#e8e2df] hover:border-primary rounded-sm p-2 flex items-center gap-2 text-left" data-id="' + p.id + '"><img src="assets/img/' + p.cut + '" class="w-10 h-10 object-contain shrink-0" alt=""><span class="min-w-0"><span class="block font-body-md text-[12px] truncate">' + p.name + '</span><span class="block font-label-specs text-label-specs text-primary">' + AED(p.price) + '</span></span></button>';
      }).join('') + '</div></div>';
    document.body.appendChild(picker);
    picker.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#za-picker-x')) { closePicker(); return; }
      var b = e.target.closest && e.target.closest('.za-pick');
      if (b) { cat().items[slot] = b.getAttribute('data-id'); toast('Placed on ' + (GEO.ear.slots[slot] || {}).label.toLowerCase()); closePicker(); render(); }
    });
  }
  function closePicker() { if (picker) { picker.remove(); picker = null; } }
  document.getElementById('za-items').addEventListener('click', function (e) {
    var h = e.target.closest && e.target.closest('.za-hot');
    if (h) openPicker(h.getAttribute('data-slot'));
  });
  document.getElementById('za-shelf').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.za-add');
    if (!b) return;
    var id = b.getAttribute('data-id');
    if (state.cat === 'necklace') { toast('Necklace photography is on its way'); return; }
    if (state.cat === 'ear') {
      var free = null; Object.keys(GEO.ear.slots).forEach(function (s) { if (!cat().items[s] && !free) free = s; });
      var p = find(id);
      if (p && GEO.ear.slots[p.slot] && !cat().items[p.slot]) free = p.slot;
      if (!free) { toast('All piercing positions are taken'); return; }
      cat().items[free] = id;
      toast('Added to ' + GEO.ear.slots[free].label.toLowerCase()); render(); return;
    }
    var c = cfg();
    if (cat().items.length >= c.max) { toast(c.max + (state.cat === 'ring' ? ' rings' : ' necklaces') + ' maximum'); return; }
    if (cat().items.some(function (it) { return it.id === id; })) { toast('Already in your stack — tap it in the list to rearrange'); return; }
    cat().items.unshift({ id: id });
    toast(find(id).name + ' added to stack'); render();
  });
  document.getElementById('za-sizes').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-size]');
    if (!b) return;
    cat().size = +b.getAttribute('data-size');
    document.querySelectorAll('#za-sizes [data-size]').forEach(function (o) {
      o.classList.toggle('bg-primary', o === b); o.classList.toggle('text-on-primary', o === b);
    });
    render();
  });
  document.querySelectorAll('.za-preset').forEach(function (b) {
    b.addEventListener('click', function () {
      var pr = PRESETS[+b.getAttribute('data-i')];
      state.cat = 'ring';
      document.querySelectorAll('.za-cat').forEach(function (o) {
        var on = o.getAttribute('data-cat') === 'ring';
        o.classList.toggle('bg-primary', on); o.classList.toggle('text-on-primary', on);
        o.classList.toggle('bg-surface-container', !on); o.classList.toggle('text-secondary', !on);
      });
      document.getElementById('za-mirror').style.display = 'none';
      document.getElementById('za-sizes').style.display = '';
      cat().items = pr.ids.map(function (id) { return { id: id }; });
      cat().view = 'model';
      toast(pr.name + ' loaded — make it yours');
      render();
    });
  });
  document.getElementById('add-stack-to-bag').addEventListener('click', addToBag);
  document.getElementById('za-save').addEventListener('click', saveStack);
  document.getElementById('za-share').addEventListener('click', shareStack);
  window.addEventListener('resize', render);
  baseImg.addEventListener('load', render);
  }

  loadFromUrl();
  bind();
  render();
})();
