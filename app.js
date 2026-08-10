(function () {
  'use strict';

  var SHEETS = {
    profile: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSXkbhLDGAPgEpoMANVlx2PpKUi1AYpBC8TOn_IFUqBjNYZ_y9G_1dhHaebPwXlttpU5_h-SV58BEa5/pub?gid=0&single=true&output=csv',
    products: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSXkbhLDGAPgEpoMANVlx2PpKUi1AYpBC8TOn_IFUqBjNYZ_y9G_1dhHaebPwXlttpU5_h-SV58BEa5/pub?gid=617163462&single=true&output=csv',
    images: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSXkbhLDGAPgEpoMANVlx2PpKUi1AYpBC8TOn_IFUqBjNYZ_y9G_1dhHaebPwXlttpU5_h-SV58BEa5/pub?gid=173039933&single=true&output=csv',
    artists: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSXkbhLDGAPgEpoMANVlx2PpKUi1AYpBC8TOn_IFUqBjNYZ_y9G_1dhHaebPwXlttpU5_h-SV58BEa5/pub?gid=769353044&single=true&output=csv',
    events: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSXkbhLDGAPgEpoMANVlx2PpKUi1AYpBC8TOn_IFUqBjNYZ_y9G_1dhHaebPwXlttpU5_h-SV58BEa5/pub?gid=1287243651&single=true&output=csv',
    notices: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSXkbhLDGAPgEpoMANVlx2PpKUi1AYpBC8TOn_IFUqBjNYZ_y9G_1dhHaebPwXlttpU5_h-SV58BEa5/pub?gid=644883226&single=true&output=csv',
    progress: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSXkbhLDGAPgEpoMANVlx2PpKUi1AYpBC8TOn_IFUqBjNYZ_y9G_1dhHaebPwXlttpU5_h-SV58BEa5/pub?gid=1268388877&single=true&output=csv',
    steps: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSXkbhLDGAPgEpoMANVlx2PpKUi1AYpBC8TOn_IFUqBjNYZ_y9G_1dhHaebPwXlttpU5_h-SV58BEa5/pub?gid=400479264&single=true&output=csv'
  };

  var state = { products: [], artists: [] };
  var parentViewport = null;

  function $(selector, root) { return (root || document).querySelector(selector); }
  function $all(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function clean(value) { return String(value == null ? '' : value).trim(); }
  function number(value) { var n = Number(String(value || '').replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : 0; }
  function money(value) { var n = number(value); return n ? n.toLocaleString('ko-KR') + '원' : clean(value || '문의'); }
  function isPaid(value) { return number(value) > 0; }
  function sortBy(key) { return function (a, b) { return number(a[key]) - number(b[key]); }; }

  function csvParse(text) {
    var rawRows = [];
    var row = [];
    var cell = '';
    var quote = false;
    for (var i = 0; i < text.length; i += 1) {
      var ch = text[i];
      var next = text[i + 1];
      if (quote) {
        if (ch === '"' && next === '"') { cell += '"'; i += 1; }
        else if (ch === '"') quote = false;
        else cell += ch;
      } else {
        if (ch === '"') quote = true;
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n') { row.push(cell); rawRows.push(row); row = []; cell = ''; }
        else if (ch !== '\r') cell += ch;
      }
    }
    row.push(cell);
    rawRows.push(row);

    var rows = rawRows.filter(function (r) { return r.some(clean); }).map(function (r) { return r.map(clean); });
    if (!rows.length) return [];

    var profileKeys = ['img_url', 'name', 'sub', 'badge', 'desc', 'noti'];
    var keyValueCount = rows.filter(function (r) { return profileKeys.indexOf(r[0]) > -1 && r.length > 1; }).length;
    if (keyValueCount >= 2) {
      var kv = {};
      rows.forEach(function (r) {
        if (profileKeys.indexOf(r[0]) > -1) kv[r[0]] = clean(r.slice(1).join('\n'));
      });
      return [kv];
    }

    if (rows.length >= 2 && rows[0].length === 1 && profileKeys.indexOf(rows[0][0]) > -1) {
      var obj = {};
      for (var k = 0; k < rows.length; k += 2) {
        var key = clean(rows[k] && rows[k][0]);
        var value = clean(rows[k + 1] && rows[k + 1][0]);
        if (profileKeys.indexOf(key) > -1) obj[key] = value;
      }
      if (Object.keys(obj).length) return [obj];
    }

    var header = (rows.shift() || []).map(clean);
    return rows.filter(function (r) { return r.some(clean); }).map(function (r) {
      var obj = {};
      header.forEach(function (h, idx) { obj[h] = clean(r[idx]); });
      return obj;
    });
  }

  function bust(url) {
    return url + (url.indexOf('?') > -1 ? '&' : '?') + '_=' + Date.now();
  }

  function fetchCsv(url) {
    return fetch(bust(url), { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('csv fetch failed');
      return res.text();
    }).then(csvParse).catch(function () { return []; });
  }

  function escapeHtml(str) {
    return clean(str).replace(/[&<>"]/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]; });
  }

  function imageUrl(url) {
    url = clean(url);
    if (!url) return '';
    var drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (drive && drive[1]) return 'https://lh3.googleusercontent.com/d/' + drive[1];
    var open = url.match(/[?&]id=([^&]+)/);
    if (url.indexOf('drive.google.com') > -1 && open && open[1]) return 'https://lh3.googleusercontent.com/d/' + open[1];
    if (/^https?:\/\//i.test(url)) return url;
    if (/^\/\//.test(url)) return location.protocol + url;
    try { return new URL(url, location.href).href; } catch (e) { return url; }
  }

  function fallbackImage(img) {
    img.onerror = null;
    img.closest('.sample-image,.artist-card__thumb,.profile-card__image').classList.add('is-error');
    img.remove();
    sendHeightSoon();
  }

  function setHtml(selector, html) {
    var el = $(selector);
    if (el) el.innerHTML = html;
  }

  function empty(text) { return '<div class="empty">' + escapeHtml(text) + '</div>'; }

  function renderProfile(rows) {
    var item = rows[0] || {};
    var img = imageUrl(item.img_url);
    setHtml('[data-profile]', '<div class="profile-card__image">' + (img ? '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(item.name || 'profile') + '">' : '') + '</div><div class="profile-card__body"><span class="badge">' + escapeHtml(item.badge || 'Live2D RIGGER') + '</span><h3>' + escapeHtml(item.name || 'YOM') + '<small>' + escapeHtml(item.sub || '') + '</small></h3><p>' + escapeHtml(item.desc || '작가 소개 데이터가 없습니다.') + '</p>' + (item.noti ? '<div class="profile-card__notice">' + escapeHtml(item.noti) + '</div>' : '') + '</div>');
  }

  function categoryTitle(category, items) {
    var map = {
      basic: '기본 리깅 포함 항목',
      ld_rigging: 'LD 리깅',
      sd_rigging: 'SD 리깅',
      vbridger: 'VBridger',
      emotion: '표정 옵션',
      addon: '추가 파츠',
      addon_ear: '동물귀',
      addon_arm: '팔 추가',
      etc: '기타 옵션'
    };
    return map[category] || (items[0] && items[0].category) || '옵션';
  }

  function renderProducts(products, images) {
    state.products = products.slice().sort(sortBy('dis_order'));
    var imageMap = images.reduce(function (acc, img) {
      var key = img.category;
      if (!key || !img.image_url) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(img);
      return acc;
    }, {});
    Object.keys(imageMap).forEach(function (key) { imageMap[key].sort(sortBy('image_order')); });

    var groups = state.products.reduce(function (acc, item) {
      var key = item.category || 'etc';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
    var order = Object.keys(groups).sort(function (a, b) {
      return number(groups[a][0] && groups[a][0].dis_order) - number(groups[b][0] && groups[b][0].dis_order);
    });

    var html = order.map(function (category) {
      var items = groups[category].sort(sortBy('dis_order'));
      var imgs = (imageMap[category] || []).filter(function (img) { return img.image_url; });
      var sampleItems = imgs.map(function (img) {
        var src = imageUrl(img.image_url);
        return '<button type="button" class="sample-image sample-image--large" data-sample-modal data-full-src="' + escapeHtml(src) + '" aria-label="샘플 이미지 크게 보기"><img src="' + escapeHtml(src) + '" alt="' + escapeHtml(categoryTitle(category, items)) + ' sample"><span class="sample-image__zoom">크게 보기</span></button>';
      });
      var sampleClass = 'sample-grid sample-grid--group sample-grid--count-' + Math.min(Math.max(imgs.length, 1), 2);
      var sample = '';
      if (!imgs.length) {
        sample = '<div class="sample-grid sample-grid--group sample-grid--empty"><div class="sample-empty sample-empty--large">샘플 준비 중</div></div>';
      } else if (imgs.length >= 3) {
        sample = '<div class="sample-slider" data-sample-slider data-real-count="' + sampleItems.length + '"><button type="button" class="sample-slider__nav sample-slider__nav--prev" data-slide-prev aria-label="이전 샘플">‹</button><div class="sample-slider__viewport"><div class="sample-slider__track">' + sampleItems.join('') + sampleItems.join('') + sampleItems.join('') + '</div></div><button type="button" class="sample-slider__nav sample-slider__nav--next" data-slide-next aria-label="다음 샘플">›</button></div>';
      } else {
        sample = '<div class="' + sampleClass + '">' + sampleItems.join('') + '</div>';
      }
      var notes = [];
      var optionHtml = items.map(function (item) {
        var priceHtml = '';
        if (clean(item.price)) priceHtml = '<strong class="price">' + escapeHtml(money(item.price)) + '</strong>';
        if (clean(item.description)) notes.push('<article class="product-note product-note--full"><p>' + escapeHtml(item.description) + '</p></article>');
        return '<article class="product-option" data-product-id="' + escapeHtml(item.product_id) + '"><div class="product-option__top"><h4>' + escapeHtml(item.title || '옵션명 없음') + '</h4>' + priceHtml + '</div></article>';
      }).join('');
      var noteHtml = notes.length ? '<div class="product-notes">' + notes.join('') + '</div>' : '';
      return '<section class="product-group" data-category="' + escapeHtml(category) + '"><div class="product-group__media"><h3>' + escapeHtml(categoryTitle(category, items)) + '</h3><p class="sample-guide">샘플 이미지를 클릭하면 큰 화면으로 확인할 수 있습니다.</p><div class="product-group__sample">' + sample + '</div></div><div class="product-group__options">' + optionHtml + '</div>' + noteHtml + '</section>';
    }).join('');
    setHtml('[data-products]', html || empty('작업 안내 데이터가 없습니다.'));
  }

  function renderNotices(rows) {
    var grouped = rows.sort(function (a, b) { return number(a.category_order) - number(b.category_order) || number(a.order) - number(b.order); }).reduce(function (acc, item) {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
    var html = Object.keys(grouped).map(function (key) {
      return '<article class="notice-card"><h3>' + escapeHtml(key) + '</h3><ul>' + grouped[key].map(function (item) { return '<li>' + escapeHtml(item.desc) + '</li>'; }).join('') + '</ul></article>';
    }).join('');
    setHtml('[data-notices]', html || empty('안내사항 데이터가 없습니다.'));
  }

  function artistType(item) {
    var category = clean(item && item.category).toUpperCase();
    if (category.indexOf('LD') > -1) return 'LD';
    if (category.indexOf('SD') > -1) return 'SD';
    return '';
  }

  function renderArtistCards(rows) {
    return rows.map(function (item) {
      var img = imageUrl(item.thumb);
      return '<article class="artist-card"><div class="artist-card__thumb">' + (img ? '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(item.name) + '">' : '') + '</div><div><h4>' + escapeHtml(item.name) + '</h4><p>' + escapeHtml(item.desc) + '</p>' + (item.link ? '<button type="button" data-link="' + escapeHtml(item.link) + '">작가 페이지 보기</button>' : '') + '</div></article>';
    }).join('');
  }

  function renderArtists(rows) {
    state.artists = rows.slice().sort(sortBy('order'));
    var ld = state.artists.filter(function (item) { return artistType(item) === 'LD'; });
    var sd = state.artists.filter(function (item) { return artistType(item) === 'SD'; });
    setHtml('[data-artists-ld]', renderArtistCards(ld) || empty('LD 협업 작가 데이터가 없습니다.'));
    setHtml('[data-artists-sd]', renderArtistCards(sd) || empty('SD 협업 작가 데이터가 없습니다.'));
  }

  function renderEvents(rows) {
    var html = rows.sort(sortBy('order')).map(function (item) {
      return '<article class="event-card"><h4>' + escapeHtml(item.title) + '</h4><p>' + escapeHtml(item.desc) + '</p></article>';
    }).join('');
    setHtml('[data-events]', html || empty('이벤트 데이터가 없습니다.'));
  }

  function renderProgress(rows) {
    setHtml('[data-progress]', rows.sort(sortBy('order')).map(function (item) { return '<li>' + escapeHtml(item.desc) + '</li>'; }).join('') || '<li>진행 안내 데이터가 없습니다.</li>');
  }

  function renderSteps(rows) {
    setHtml('[data-steps]', rows.sort(sortBy('order')).map(function (item) { return '<li>' + escapeHtml(item.step) + '</li>'; }).join('') || '<li>작업 과정 데이터가 없습니다.</li>');
  }

  function makeChoice(type, name, item, suffix) {
    var price = item.price ? '<small>' + escapeHtml(money(item.price)) + '</small>' : '';
    return '<label class="choice"><input type="' + type + '" name="' + name + '" value="' + escapeHtml(item.product_id || item.name) + '" data-title="' + escapeHtml(item.title || item.name) + '" data-price="' + escapeHtml(item.price || 0) + '" data-category="' + escapeHtml(item.category || '') + '" data-extra="' + escapeHtml(suffix || '') + '"><span>' + escapeHtml(item.title || item.name) + price + '</span></label>';
  }

  function baseRigType(input) {
    if (!input) return '';
    var hint = [input.value, input.dataset.category, input.dataset.title].join(' ').toUpperCase();
    if (hint.indexOf('LD') > -1) return 'LD';
    if (hint.indexOf('SD') > -1) return 'SD';
    return '';
  }

  function updateCollabOptions() {
    var select = $('[data-collab-select]');
    if (!select) return;
    var base = $('input[name="baseOption"]:checked');
    var type = baseRigType(base);
    var current = select.value;
    var label = $('[data-collab-label]');
    var guide = $('[data-collab-guide]');

    if (!type) {
      select.disabled = true;
      select.innerHTML = '<option value="">기본 리깅을 먼저 선택해주세요</option>';
      if (label) label.textContent = '협업 작가';
      if (guide) guide.textContent = 'LD/SD 선택에 맞춰 협업 작가가 표시됩니다.';
      return;
    }

    var artists = state.artists.filter(function (item) { return artistType(item) === type; });
    var options = ['<option value="">선택 안 함</option>'].concat(artists.map(function (item) {
      return '<option value="' + escapeHtml(item.name) + '" data-title="' + escapeHtml(item.name) + '" data-category="' + escapeHtml(type) + '" data-desc="' + escapeHtml(item.desc) + '">' + escapeHtml(item.name) + '</option>';
    }));
    select.innerHTML = options.join('');
    select.disabled = false;
    if (artists.some(function (item) { return item.name === current; })) select.value = current;
    if (label) label.textContent = type + ' 협업 작가';
    if (guide) guide.textContent = artists.length ? type + ' 협업 작가 중 선택할 수 있습니다.' : type + ' 협업 작가가 아직 등록되지 않았습니다.';
  }

  function renderFormOptions() {
    var base = state.products.filter(function (p) { return ['ld_rigging', 'sd_rigging'].indexOf(p.product_id) > -1 || ['ld_rigging', 'sd_rigging'].indexOf(p.category) > -1; });
    var extras = state.products.filter(function (p) { return base.indexOf(p) === -1 && p.product_id !== 'basic' && p.product_id !== 'etc_work'; });
    setHtml('[data-base-options]', base.map(function (item) { return makeChoice('radio', 'baseOption', item); }).join('') || empty('기본 옵션 데이터가 없습니다.'));
    setHtml('[data-extra-options]', extras.map(function (item) { return makeChoice('checkbox', 'extras', item); }).join('') || empty('추가 옵션 데이터가 없습니다.'));
    updateCollabOptions();
  }

  function selectedInputs() {
    return $all('[data-request-form] input[type="radio"]:checked,[data-request-form] input[type="checkbox"]:checked');
  }

  function updateEstimate() {
    var total = 0;
    var hasAsk = false;
    selectedInputs().forEach(function (input) {
      if (isPaid(input.dataset.price)) total += number(input.dataset.price);
      else if (input.value) hasAsk = true;
    });
    $('[data-estimate]').textContent = total.toLocaleString('ko-KR') + '원';
    $('[data-arm-detail]').classList.toggle('is-hidden', !selectedInputs().some(function (i) { return i.value === 'arm_add' || i.dataset.category === 'addon_arm'; }));
    var portfolio = $('input[name="portfolioUse"]:checked');
    $('[data-portfolio-date]').classList.toggle('is-hidden', !portfolio || portfolio.value !== 'YES');
    sendHeightSoon();
  }

  function requestText() {
    var form = $('[data-request-form]');
    var fd = new FormData(form);
    var base = $('input[name="baseOption"]:checked');
    var collab = $('[data-collab-select]');
    var collabOption = collab && collab.options[collab.selectedIndex];
    var extras = $all('input[name="extras"]:checked').map(function (i) { return i.dataset.title + (isPaid(i.dataset.price) ? ' (' + money(i.dataset.price) + ')' : ' (문의)'); });
    var portfolio = $('input[name="portfolioUse"]:checked');
    return [
      '[Live2D 리깅 신청 양식]',
      '방송 닉네임 / 방송 주소: ' + clean(fd.get('channel')),
      '기본 리깅: ' + (base ? base.dataset.title + ' (' + money(base.dataset.price) + ')' : '미선택'),
      '협업 작가: ' + (collabOption && collabOption.value ? collabOption.dataset.title + ' (' + clean(collabOption.dataset.category) + ') / ' + clean(collabOption.dataset.desc) : '선택 안 함'),
      '추가 옵션: ' + (extras.length ? extras.join(', ') : '없음'),
      '팔 추가 상세: ' + clean(fd.get('armDetail')),
      '희망 일정: ' + clean(fd.get('date')),
      '포트폴리오 사용 가능 여부: ' + (portfolio ? portfolio.value : '미선택'),
      '공개 가능일: ' + clean(fd.get('portfolioDate')),
      '그 외 요청사항: ' + clean(fd.get('memo')),
      '예상 견적: ' + $('[data-estimate]').textContent
    ].join('\n');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    return Promise.resolve();
  }

  function toast(text) {
    var el = $('[data-toast]');
    el.textContent = text;
    el.classList.add('is-show');
    clearTimeout(el._timer);
    el._timer = setTimeout(function () { el.classList.remove('is-show'); }, 1800);
  }

  function bindForm() {
    var form = $('[data-request-form]');
    form.addEventListener('change', function (event) {
      if (event.target && event.target.name === 'baseOption') updateCollabOptions();
      updateEstimate();
    });
    form.addEventListener('input', updateEstimate);
    form.addEventListener('reset', function () {
      setTimeout(function () {
        updateCollabOptions();
        updateEstimate();
      }, 0);
    });
    $('[data-copy]').addEventListener('click', function () {
      copyText(requestText()).then(function () { toast('신청 양식을 복사했습니다.'); });
    });
  }

  function bindSampleModal() {
    document.addEventListener('click', function (e) {
      var sample = e.target.closest('[data-sample-modal]');
      if (!sample) return;
      e.preventDefault();
      var src = sample.getAttribute('data-full-src');
      if (!src) return;
      parent.postMessage({ source: 'yom-artmug', type: 'YOM_OPEN_IMAGE_MODAL', src: src }, '*');
    });
  }

  function sliderVisibleCount() {
    return window.matchMedia('(max-width: 520px)').matches ? 1 : 2;
  }

  function sliderGap(track) {
    if (!track) return 18;
    var style = window.getComputedStyle(track);
    return parseFloat(style.columnGap || style.gap) || 18;
  }

  function sliderMoveTo(slider, index, animate) {
    var track = slider.querySelector('.sample-slider__track');
    var item = slider.querySelector('.sample-image');
    if (!track || !item) return;
    var width = item.getBoundingClientRect().width || 0;
    var move = index * (width + sliderGap(track));
    track.style.transition = animate ? 'transform .42s cubic-bezier(.22,.61,.36,1)' : 'none';
    track.style.transform = 'translate3d(' + (-move) + 'px,0,0)';
    slider.dataset.index = String(index);
    if (!animate) {
      track.offsetHeight;
      track.style.transition = 'transform .42s cubic-bezier(.22,.61,.36,1)';
    }
  }

  function normalizeSliderIndex(slider) {
    var real = number(slider.getAttribute('data-real-count'));
    if (!real) return;
    var index = number(slider.dataset.index || real);
    if (index >= real * 2) index -= real;
    if (index < real) index += real;
    sliderMoveTo(slider, index, false);
  }

  function setupSampleSlider(slider) {
    var real = number(slider.getAttribute('data-real-count'));
    if (!real) return;
    if (!slider.dataset.index) slider.dataset.index = String(real);
    sliderMoveTo(slider, number(slider.dataset.index), false);
  }

  function initSampleSliders() {
    $all('[data-sample-slider]').forEach(setupSampleSlider);
  }

  function bindSampleSlider() {
    initSampleSliders();
    if (window.__yomSampleSliderBound) return;
    window.__yomSampleSliderBound = true;
    document.addEventListener('click', function (e) {
      var prev = e.target.closest('[data-slide-prev]');
      var next = e.target.closest('[data-slide-next]');
      if (!prev && !next) return;
      e.preventDefault();
      e.stopPropagation();
      var slider = (prev || next).closest('[data-sample-slider]');
      if (!slider || slider.dataset.moving === '1') return;
      var real = number(slider.getAttribute('data-real-count'));
      if (!real) return;
      var step = sliderVisibleCount();
      var index = number(slider.dataset.index || real) + (next ? step : -step);
      slider.dataset.moving = '1';
      sliderMoveTo(slider, index, true);
    });
    document.addEventListener('transitionend', function (e) {
      var track = e.target.closest('.sample-slider__track');
      if (!track || e.propertyName !== 'transform') return;
      var slider = track.closest('[data-sample-slider]');
      if (!slider) return;
      slider.dataset.moving = '0';
      normalizeSliderIndex(slider);
    });
    window.addEventListener('resize', function () {
      $all('[data-sample-slider]').forEach(function (slider) { normalizeSliderIndex(slider); });
    });
  }

  function bindLinks() {
    document.addEventListener('click', function (e) {
      var linkButton = e.target.closest('[data-link]');
      if (linkButton) {
        e.preventDefault();
        var url = linkButton.getAttribute('data-link');
        try { window.open(url, '_blank', 'noopener'); } catch (err) { location.href = url; }
      }
    });
  }

  function contentHeight() {
    var app = document.getElementById('app');
    if (!app) return 720;
  
    var rect = app.getBoundingClientRect();
    var style = window.getComputedStyle(app);
    var marginTop = parseFloat(style.marginTop) || 0;
    var marginBottom = parseFloat(style.marginBottom) || 0;
  
    return Math.ceil(rect.height + marginTop + marginBottom);
  }

  function sendHeight() {
    parent.postMessage({ source: 'yom-artmug', type: 'YOM_IFRAME_HEIGHT', height: contentHeight() }, '*');
  }

  function sendHeightSoon() {
    [0, 80, 260, 700].forEach(function (ms) { setTimeout(sendHeight, ms); });
  }

  function navTo(sectionId) {
    var el = document.getElementById(sectionId);
    if (!el) return;
    parent.postMessage({ source: 'yom-artmug', type: 'YOM_PARENT_SCROLL_TO', targetY: el.getBoundingClientRect().top + (window.scrollY || 0) }, '*');
  }

  function bindParentMessages() {
    window.addEventListener('message', function (event) {
      var data = event.data || {};
      if (data.source !== 'yom-artmug-parent') return;
      if (data.type === 'YOM_PARENT_NAV_TO') navTo(data.sectionId);
      if (data.type === 'YOM_PARENT_VIEWPORT') parentViewport = data;
    });
    parent.postMessage({ source: 'yom-artmug', type: 'YOM_IFRAME_READY' }, '*');
  }

  function observeActive() {
    var sections = $all('[data-section]');
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) parent.postMessage({ source: 'yom-artmug', type: 'YOM_ACTIVE_SECTION', sectionId: entry.target.id }, '*');
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0.01 });
    sections.forEach(function (s) { io.observe(s); });
  }

  function hideLoading() {
    var loading = $('[data-loading]');
    if (loading) loading.classList.add('is-hidden');
  }

  function markImages() {
    $all('img').forEach(function (img) {
      img.addEventListener('load', sendHeightSoon);
      img.addEventListener('error', function () { fallbackImage(img); });
    });
  }

  function initResizeWatch() {
    if ('ResizeObserver' in window) new ResizeObserver(sendHeightSoon).observe(document.body);
    window.addEventListener('load', sendHeightSoon);
    window.addEventListener('resize', sendHeightSoon);
  }

  function init() {
    Promise.all([
      fetchCsv(SHEETS.profile), fetchCsv(SHEETS.products), fetchCsv(SHEETS.images), fetchCsv(SHEETS.artists), fetchCsv(SHEETS.events), fetchCsv(SHEETS.notices), fetchCsv(SHEETS.progress), fetchCsv(SHEETS.steps)
    ]).then(function (data) {
      renderProfile(data[0]);
      renderProducts(data[1], data[2]);
      renderNotices(data[5]);
      renderArtists(data[3]);
      renderEvents(data[4]);
      renderProgress(data[6]);
      renderSteps(data[7]);
      renderFormOptions();
      bindForm();
      bindLinks();
      bindSampleModal();
      bindSampleSlider();
      markImages();
      updateEstimate();
      observeActive();
      hideLoading();
      sendHeightSoon();
    }).catch(function () {
      hideLoading();
      toast('데이터를 불러오지 못했습니다.');
      sendHeightSoon();
    });
    bindParentMessages();
    initResizeWatch();
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
