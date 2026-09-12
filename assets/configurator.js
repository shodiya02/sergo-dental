/* ============================================================
   SERGO DENTAL — общий движок конфигуратора
   Данные модели приходят из data/<model>.js в объекте MODEL:
   { name, sub, base:[{c,p,d,q}], cats:[{t,items:[{c,p,d}]}] }
   Фото — из assets/photos.js (объект PHOTOS: ключ -> data-url)
   ============================================================ */
(function () {
  'use strict';

  var fmt = function (n) { return n.toLocaleString('ru-RU') + ' $'; };
  var K = (typeof PRICE_K !== 'undefined') ? PRICE_K : 0.44;
  var cp = function (p) { return Math.round(p * K); };
  /* LINE_PAGE — опционально задаётся на странице перед подключением этого файла
     (const LINE_PAGE = 'имя-страницы-линейки.html';). Её наличие означает, что
     страница относится к линейке с несколькими исполнениями: в баннере над
     комплектацией появляется кнопка «Другое исполнение», ведущая на страницу
     линейки. Отдельные позиции (кресла, тележки, рентген) её не объявляют —
     у них баннер выводит только название, без кнопки. */
  var displayName = MODEL.name || '';

  var state = [];
  var PH = (typeof PHOTOS !== 'undefined') ? PHOTOS : {};

  /* id страницы = имя html-файла без расширения (совпадает с именем data/*.js).
     Нужен, чтобы фото можно было переопределить для одной модели —
     см. assets/photo-overrides.js */
  var MODEL_ID = (function () {
    try {
      var last = (location.pathname || '').split('/').pop() || '';
      return last.replace(/\.html?$/i, '').toLowerCase();
    } catch (e) { return ''; }
  })();

  function photo(desc) {
    if (typeof photoFor === 'function') return photoFor(desc, MODEL_ID);
    return null;
  }

  function buildState() {
    state = [];
    MODEL.base.forEach(function (it, i) {
      state.push({ sec: -1, idx: i, code: it.c, price: it.p, desc: it.d, qty: it.q || 1 });
    });
    MODEL.cats.forEach(function (c, ci) {
      c.items.forEach(function (it, i) {
        state.push({ sec: ci, idx: i, code: it.c, price: it.p, desc: it.d, qty: 0 });
      });
    });
  }
  function find(s, i) {
    for (var k = 0; k < state.length; k++) if (state[k].sec === s && state[k].idx === i) return state[k];
    return null;
  }
  var key = function (s, i) { return s + '_' + i; };

  function rowHTML(s, i, it) {
    var ph = photo(it.desc);
    var thumb = ph === 'blank'
      ? '<span class="thumb blank" aria-hidden="true"></span>'
      : ph ? '<img class="thumb" src="' + ph + '" loading="lazy" onerror="this.remove()" ' +
        'onclick="zoom(\'' + ph + '\',' + JSON.stringify(it.desc).replace(/"/g, '&quot;') + ')">' : '';
    return '<div class="row ' + (it.qty > 0 ? 'on' : '') + '" id="r_' + key(s, i) + '">' +
      '<div class="stepper">' +
        '<button onclick="chg(' + s + ',' + i + ',-1)">−</button>' +
        '<div class="q">' + it.qty + '</div>' +
        '<button onclick="chg(' + s + ',' + i + ',1)">+</button>' +
      '</div>' + thumb +
      '<div class="info"><div class="desc">' + it.desc + '</div>' +
      '<div class="meta">арт. <span class="code">' + it.code + '</span></div></div>' +
      '<button class="ibtn" onclick="showCard(' + s + ',' + i + ')">i</button>' +
      '<div class="price">' + fmt(cp(it.price)) + '</div></div>';
  }

  function render() {
    var main = document.getElementById('main'), h = '';
    var stdSum = 0;
    state.forEach(function (x) { if (x.sec === -1) stdSum += cp(x.price) * x.qty; });
    h += '<section class="card open" id="c_-1"><div class="card-head" onclick="tgl(-1)">' +
      '<div style="flex:1"><h2>Базовая комплектация</h2></div>' +
      '<div class="badge" id="b_-1">' + fmt(stdSum) + '</div><div class="chev">▾</div></div>' +
      '<div class="card-body"><div class="base-note">Входит в стандартную поставку. ' +
      'Количество можно изменить или убрать позицию при замене на опцию ниже.</div>' +
      MODEL.base.map(function (it, i) { return rowHTML(-1, i, find(-1, i)); }).join('') +
      '</div></section>';
    MODEL.cats.forEach(function (c, ci) {
      h += '<section class="card" id="c_' + ci + '"><div class="card-head" onclick="tgl(' + ci + ')">' +
        '<div style="flex:1"><h2>' + c.t + '</h2></div>' +
        '<div class="badge" id="b_' + ci + '"></div><div class="chev">▾</div></div>' +
        '<div class="card-body">' +
        c.items.map(function (it, i) { return rowHTML(ci, i, find(ci, i)); }).join('') +
        '</div></section>';
    });
    h += '<p style="font-size:12px;color:var(--muted);padding:4px 6px 8px">Цены указаны в долларах США. ' +
      'Не является публичной офертой. Совместимость опций подтверждается при заказе.</p>';
    main.innerHTML = h;
    updateTotals();
  }

  window.tgl = function (s) { document.getElementById('c_' + s).classList.toggle('open'); };
  window.chg = function (s, i, d) {
    var it = find(s, i);
    it.qty = Math.max(0, Math.min(9, it.qty + d));
    var row = document.getElementById('r_' + key(s, i));
    row.classList.toggle('on', it.qty > 0);
    row.querySelector('.q').textContent = it.qty;
    updateTotals();
  };

  function updateTotals() {
    var total = 0, count = 0, sums = {};
    state.forEach(function (x) {
      var v = cp(x.price) * x.qty;
      total += v;
      if (x.qty > 0 && x.sec >= 0) count++;
      sums[x.sec] = (sums[x.sec] || 0) + v;
    });
    document.getElementById('b_-1').textContent = fmt(sums[-1] || 0);
    MODEL.cats.forEach(function (c, ci) {
      var b = document.getElementById('b_' + ci);
      if (b) b.textContent = sums[ci] ? '+ ' + fmt(sums[ci]) : '';
    });
    document.getElementById('tbSum').textContent = fmt(total);
    document.getElementById('tbCount').textContent = count
      ? 'базовая комплектация + ' + count + ' опц.' : 'базовая комплектация';
  }

  window.zoom = function (src, cap) {
    document.getElementById('lbImg').src = src;
    document.getElementById('lbCap').textContent = cap || '';
    document.getElementById('lightbox').classList.add('show');
  };

  window.showCard = function (sec, i) {
    var it = find(sec, i);
    var cat = sec === -1 ? 'Базовая комплектация' : MODEL.cats[sec].t;
    var ph = photo(it.desc);
    var noph = '<div class="noph"><svg viewBox="0 0 72 72">' +
      '<path d="M15 32v-6c0-7.7 6.3-14 14-14h28v13H30c-1.7 0-3 1.3-3 3v4H15z" fill="#0E90B8"/>' +
      '<path d="M57 40v6c0 7.7-6.3 14-14 14H15V47h27c1.7 0 3-1.3 3-3v-4h12z" fill="#0E90B8"/></svg></div>';
    document.getElementById('pcardBody').innerHTML =
      (ph ? '<img class="pph" src="' + ph + '">' : noph) +
      '<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--teal);font-weight:700;margin-bottom:6px">' + cat + '</div>' +
      '<h3>' + it.desc + '</h3>' +
      '<div class="pmeta"><span class="pprice">' + fmt(cp(it.price)) + '</span>' +
      '<span class="code">арт. ' + it.code + '</span></div>' +
      '<div class="ptext">Цена указана с учётом действующей дилерской скидки и включает поставку ' +
      'через официального дистрибьютора. Совместимость с другими опциями подтверждается при оформлении заказа.</div>';
    document.getElementById('pmodal').classList.add('show');
  };

  /* ---------- баннер линейки ---------- */
  window.goColor = function () { location.href = LINE_PAGE; };
  window.goConfig = function () {
    document.getElementById('main').classList.remove('hidden');
    document.getElementById('cbannerWrap').innerHTML = (typeof LINE_PAGE !== 'undefined')
      ? '<div class="cbanner"><div class="ct"><b>' + displayName + '</b></div>' +
        '<button onclick="goColor()">Другое исполнение</button></div>'
      : '<div class="cbanner"><div class="ct"><b>' + displayName + '</b></div></div>';
    window.scrollTo(0, 0);
  };

  /* ---------- КП ---------- */
  function makeOffer() {
    var sel = state.filter(function (x) { return x.qty > 0; });
    var total = 0;
    sel.forEach(function (x) { total += cp(x.price) * x.qty; });
    var today = new Date().toLocaleDateString('ru-RU');
    var rows = '', last = null;
    sel.forEach(function (x) {
      if (x.sec !== last) {
        rows += '<tr class="sec"><td colspan="5">' +
          (x.sec === -1 ? 'Базовая комплектация' : MODEL.cats[x.sec].t) + '</td></tr>';
        last = x.sec;
      }
      var u = cp(x.price);
      rows += '<tr><td>' + x.desc.replace(/\(\*\d+\)/g, '').trim() + '</td>' +
        '<td class="n">' + x.code + '</td><td class="n">' + x.qty + '</td>' +
        '<td class="n">' + fmt(u) + '</td><td class="n">' + fmt(u * x.qty) + '</td></tr>';
    });
    document.getElementById('offer').innerHTML =
      '<div class="obrand">Sergo Dental · официальный дистрибьютор Stern Weber</div>' +
      '<h1>Коммерческое предложение</h1>' +
      '<div class="oh">Стоматологическая установка ' + displayName + ' (Cefla, Италия)<br>' +
      'Sergo Dental · Ташкент, Узбекистан · +998 (78) 888-11-10 · info@sergodental.com &nbsp;·&nbsp; дата: ' + today + '</div>' +
      '<table><tr><th>Наименование</th><th class="n">Артикул</th><th class="n">Кол-во</th>' +
      '<th class="n">Цена</th><th class="n">Сумма</th></tr>' + rows +
      '<tr class="total-row"><td colspan="4">ИТОГО</td><td class="n">' + fmt(total) + '</td></tr></table>' +
      '<div class="ofoot">Цены указаны в долларах США. Предложение действительно 30 дней. ' +
      'Комплектация и совместимость опций подтверждаются при размещении заказа. Не является публичной офертой.</div>';
    window.print();
  }

  /* ---------- запуск ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('mdlName').innerHTML = MODEL.nameHtml || displayName;
    document.getElementById('mdlSub').textContent = MODEL.sub || '';
    document.getElementById('btnReset').onclick = function () { buildState(); render(); };
    document.getElementById('btnOffer').onclick = makeOffer;
    goConfig();
    buildState();
    render();
  });
})();
