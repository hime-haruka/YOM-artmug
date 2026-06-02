(function () {
  'use strict';

  var IFRAME_KEY = 'yom-artmug';
  var IFRAME_SELECTOR = 'section[name="am-root"] iframe[src*="' + IFRAME_KEY + '"], [name="am-root"] iframe[src*="' + IFRAME_KEY + '"], iframe[src*="' + IFRAME_KEY + '"], section[name="am-root"] iframe, [name="am-root"] iframe';
  var STYLE_ID = 'yom-artmug-parent-style-v2';
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
.yom-artmug-parent-nav{position:fixed;top:22px;right:22px;z-index:999999;width:218px;font-family:Paperozi,Pretendard,Apple SD Gothic Neo,Malgun Gothic,sans-serif;color:#3d3654}
.yom-artmug-parent-nav__box{position:relative;border:1px solid rgba(185,160,255,.42);border-radius:18px;background:rgba(255,255,255,.94);box-shadow:0 18px 44px rgba(138,105,210,.18);backdrop-filter:blur(12px);overflow:hidden}
.yom-artmug-parent-nav__box:before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,rgba(196,178,255,.18),rgba(158,126,235,.72),rgba(221,212,255,.42))}
.yom-artmug-parent-nav__head{position:relative;display:flex;align-items:center;justify-content:center;gap:8px;padding:18px 18px 14px;border-bottom:1px solid rgba(190,170,245,.22);background:linear-gradient(180deg,rgba(250,247,255,.95),rgba(255,255,255,.76));font-size:15px;letter-spacing:.08em;font-weight:800;color:#7d65c8;text-align:center}
.yom-artmug-parent-nav__head:before,.yom-artmug-parent-nav__head:after{content:"";width:6px;height:6px;border-radius:999px;background:#c7b5ff;box-shadow:12px 0 0 rgba(213,203,255,.9)}
.yom-artmug-parent-nav__head:after{box-shadow:-12px 0 0 rgba(213,203,255,.9)}
.yom-artmug-parent-nav__list{display:flex;flex-direction:column;padding:10px 0}
.yom-artmug-parent-nav__button{position:relative;appearance:none;width:100%;border:0;background:transparent;border-radius:0;padding:13px 20px 13px 24px;text-align:left;font:inherit;font-size:15px;font-weight:700;color:#49405f;cursor:pointer;transition:background .18s ease,color .18s ease,letter-spacing .18s ease}
.yom-artmug-parent-nav__button:hover{background:linear-gradient(90deg,rgba(235,229,255,.98),rgba(248,246,255,.62));color:#6f55c8;letter-spacing:.01em}
.yom-artmug-parent-nav__button.is-active{background:linear-gradient(90deg,rgba(222,212,255,.95),rgba(244,240,255,.72));color:#5e43bd}
.yom-artmug-parent-nav__button:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#a98cff;opacity:0;transition:opacity .18s ease}
.yom-artmug-parent-nav__button:hover:before,.yom-artmug-parent-nav__button.is-active:before{opacity:1}
.yom-artmug-parent-nav__button:after{content:"";position:absolute;right:18px;top:50%;width:5px;height:5px;border-radius:999px;background:#c7b5ff;opacity:0;transform:translateY(-50%) scale(.6);transition:opacity .18s ease,transform .18s ease}
.yom-artmug-parent-nav__button:hover:after,.yom-artmug-parent-nav__button.is-active:after{opacity:1;transform:translateY(-50%) scale(1)}
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
    head.textContent = 'Quick Menu';
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
    var next = Math.max(720, raw + 30);
    if (lastHeight && Math.abs(next - lastHeight) < 24) return;
    iframe.style.height = next + 'px';
    iframe.style.minHeight = next + 'px';
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
