(function () {
  'use strict';

  var IFRAME_KEY = 'yom-artmug';
  var IFRAME_SELECTOR = 'section[name="am-root"] iframe[src*="' + IFRAME_KEY + '"], [name="am-root"] iframe[src*="' + IFRAME_KEY + '"], iframe[src*="' + IFRAME_KEY + '"], section[name="am-root"] iframe, [name="am-root"] iframe';
  var STYLE_ID = 'yom-artmug-parent-style-v1';
  var NAV_ID = 'yom-artmug-parent-nav';
  var lastHeight = 0;
  var retryTimer = null;

  var MENU_ITEMS = [
    { id: 'intro', label: '작가 소개' },
    { id: 'works', label: '작업 안내' },
    { id: 'notice', label: '안내사항' },
    { id: 'event', label: '할인/이벤트' },
    { id: 'process', label: '진행 안내' },
    { id: 'form', label: '신청 양식' }
  ];

  function getIframe() {
    return document.querySelector(IFRAME_SELECTOR);
  }

  function getOrigin() {
    var iframe = getIframe();
    if (!iframe || !iframe.src) return '*';
    try { return new URL(iframe.src, location.href).origin; } catch (e) { return '*'; }
  }

  function getPageScrollY() {
    return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  function injectStyle() {
    var old = document.getElementById(STYLE_ID);
    if (old) old.remove();
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
.yom-artmug-parent-nav{position:fixed;top:22px;right:22px;z-index:999999;width:176px;font-family:Paperozi,Pretendard,Apple SD Gothic Neo,Malgun Gothic,sans-serif;color:#4d514d}
.yom-artmug-parent-nav__box{border:1px solid rgba(95,105,91,.18);border-radius:18px;background:rgba(252,251,247,.94);box-shadow:0 16px 38px rgba(54,60,52,.12);backdrop-filter:blur(10px);overflow:hidden}
.yom-artmug-parent-nav__head{padding:15px 16px 12px;border-bottom:1px solid rgba(95,105,91,.12);font-size:11px;letter-spacing:.18em;font-weight:700;color:#8b8f87;text-align:left}
.yom-artmug-parent-nav__list{display:flex;flex-direction:column;padding:8px}
.yom-artmug-parent-nav__button{appearance:none;border:0;background:transparent;border-radius:12px;padding:10px 10px;text-align:left;font:inherit;font-size:13px;font-weight:600;color:#4c524c;cursor:pointer;transition:background .18s ease,color .18s ease,transform .18s ease}
.yom-artmug-parent-nav__button:hover{background:#eef0e8;color:#1f251f;transform:translateX(-2px)}
.yom-artmug-parent-nav__button.is-active{background:#dfe4d7;color:#20271f}

.yom-artmug-parent-nav__box{position:relative}
.yom-artmug-parent-nav__box:before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,rgba(116,131,108,.15),rgba(200,185,157,.48),rgba(116,131,108,.15))}
.yom-artmug-parent-nav__button{position:relative;overflow:hidden}
.yom-artmug-parent-nav__button:before{content:"";position:absolute;left:0;top:50%;width:3px;height:0;border-radius:999px;background:#74836c;transform:translateY(-50%);transition:height .18s ease}
.yom-artmug-parent-nav__button:hover:before,.yom-artmug-parent-nav__button.is-active:before{height:18px}
.yom-artmug-parent-nav__head{background:linear-gradient(180deg,rgba(255,255,255,.68),rgba(247,246,241,.65))}

@media (max-width:900px){.yom-artmug-parent-nav{display:none!important}}
`;
    document.head.appendChild(style);
  }

  function sendViewport() {
    var iframe = getIframe();
    if (!iframe || !iframe.contentWindow) return;
    var rect = iframe.getBoundingClientRect();
    iframe.contentWindow.postMessage({
      source: 'yom-artmug-parent',
      type: 'YOM_PARENT_VIEWPORT',
      iframeTop: rect.top,
      iframeHeight: rect.height,
      viewportHeight: window.innerHeight || document.documentElement.clientHeight || 0,
      scrollY: getPageScrollY()
    }, getOrigin());
  }

  function requestChildScroll(sectionId) {
    var iframe = getIframe();
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage({
      source: 'yom-artmug-parent',
      type: 'YOM_PARENT_NAV_TO',
      sectionId: sectionId
    }, getOrigin());
  }

  function setActive(id) {
    document.querySelectorAll('.yom-artmug-parent-nav__button').forEach(function (button) {
      button.classList.toggle('is-active', button.getAttribute('data-target') === id);
    });
  }

  function buildNav() {
    var old = document.getElementById(NAV_ID);
    if (old) old.remove();
    var nav = document.createElement('div');
    nav.id = NAV_ID;
    nav.className = 'yom-artmug-parent-nav';
    var box = document.createElement('div');
    box.className = 'yom-artmug-parent-nav__box';
    var head = document.createElement('div');
    head.className = 'yom-artmug-parent-nav__head';
    head.textContent = 'YOM MENU';
    var list = document.createElement('div');
    list.className = 'yom-artmug-parent-nav__list';
    MENU_ITEMS.forEach(function (item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'yom-artmug-parent-nav__button';
      button.textContent = item.label;
      button.setAttribute('data-target', item.id);
      button.addEventListener('click', function () { requestChildScroll(item.id); });
      list.appendChild(button);
    });
    box.appendChild(head);
    box.appendChild(list);
    nav.appendChild(box);
    document.body.appendChild(nav);
  }

  function unlockArtmugDetail() {
    var box = document.querySelector('.detailinfo');
    if (box) {
      box.classList.remove('showstep1');
      box.style.maxHeight = 'none';
      box.style.overflow = 'visible';
    }
    var content = document.querySelector('.detailinfo .showcontent');
    if (content) {
      content.style.maxHeight = 'none';
      content.style.overflow = 'visible';
    }
    document.querySelectorAll('.btn_open_btn,.btn_open,.btn_close').forEach(function (el) { el.remove(); });
  }

  function setIframeHeight(height) {
    var iframe = getIframe();
    if (!iframe) return;
  
    var raw = Math.ceil(Number(height) || 0);
    if (!raw) return;
  
    var next = Math.max(720, raw);
  
    if (lastHeight && Math.abs(next - lastHeight) < 40) return;
  
    iframe.style.height = next + 'px';
    iframe.style.maxHeight = 'none';
    iframe.style.overflow = 'hidden';
    iframe.height = String(next);
    iframe.setAttribute('height', String(next));
    iframe.setAttribute('scrolling', 'no');
  
    lastHeight = next;
    sendViewport();
  }

  function scrollParentTo(targetY) {
    var iframe = getIframe();
    if (!iframe) return;
    var iframeTop = getPageScrollY() + iframe.getBoundingClientRect().top;
    window.scrollTo({ top: Math.max(0, iframeTop + Number(targetY || 0) - 16), behavior: 'smooth' });
  }

  function bindMessages() {
    if (window.__yomArtmugParentMessageBind) return;
    window.__yomArtmugParentMessageBind = true;
    window.addEventListener('message', function (event) {
      var iframe = getIframe();
      if (!iframe) return;
      var origin = getOrigin();
      if (origin !== '*' && event.origin !== origin) return;
      var data = event.data || {};
      if (data.source !== 'yom-artmug') return;
      if (data.type === 'YOM_IFRAME_HEIGHT') setIframeHeight(data.height);
      if (data.type === 'YOM_PARENT_SCROLL_TO') scrollParentTo(data.targetY);
      if (data.type === 'YOM_ACTIVE_SECTION') setActive(data.sectionId);
      if (data.type === 'YOM_IFRAME_READY') sendViewport();
    });
    window.addEventListener('scroll', sendViewport, { passive: true });
    window.addEventListener('resize', sendViewport);
  }

  function prepareIframe() {
    var iframe = getIframe();
    if (!iframe) return false;
    iframe.style.width = '100%';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.style.overflow = 'hidden';
    iframe.setAttribute('scrolling', 'no');
    if (!iframe.dataset.yomArtmugBound) {
      iframe.dataset.yomArtmugBound = '1';
      iframe.addEventListener('load', function () {
        [80, 250, 700, 1500].forEach(function (ms) { setTimeout(sendViewport, ms); });
      });
    }
    sendViewport();
    return true;
  }

  function neutralize() {
    injectStyle();
    unlockArtmugDetail();
    bindMessages();
    if (!document.getElementById(NAV_ID)) buildNav();
    prepareIframe();
  }

  function watch() {
    if (window.__yomArtmugParentWatch) return;
    window.__yomArtmugParentWatch = true;
    var mo = new MutationObserver(function (mutations) {
      var onlyNav = mutations.every(function (m) {
        return m.target && (m.target.id === NAV_ID || (m.target.closest && m.target.closest('#' + NAV_ID)));
      });
      if (onlyNav) return;
      clearTimeout(retryTimer);
      retryTimer = setTimeout(neutralize, 100);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    var count = 0;
    var iv = setInterval(function () {
      count += 1;
      neutralize();
      if (count > 18) clearInterval(iv);
    }, 700);
  }

  function boot() {
    neutralize();
    watch();
    [300, 1000, 2200, 4200].forEach(function (ms) { setTimeout(neutralize, ms); });
  }

  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
