(function () {
  'use strict';

  var IFRAME_KEY = 'yom-artmug';
  var IFRAME_SELECTOR = 'section[name="am-root"] iframe[src*="' + IFRAME_KEY + '"], [name="am-root"] iframe[src*="' + IFRAME_KEY + '"], iframe[src*="' + IFRAME_KEY + '"], section[name="am-root"] iframe, [name="am-root"] iframe';
  var STYLE_ID = 'yom-artmug-parent-style-v2';
  var NAV_ID = 'yom-artmug-parent-nav';
  var MODAL_ID = 'yom-artmug-parent-image-modal';
  var lastHeight = 0;
  var retryTimer = null;

  var MENU_ITEMS = [
    { id: 'intro', label: '작가 소개' },
    { id: 'works', label: '작업 안내' },
    { id: 'notice', label: '안내사항' },
    { id: 'event', label: '협업/이벤트' },
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
.yom-artmug-parent-nav{position:fixed;top:50%;right:22px;transform:translateY(-50%);z-index:999999;width:218px;font-family:Paperozi,Pretendard,Apple SD Gothic Neo,Malgun Gothic,sans-serif;color:#3d3654}
.yom-artmug-parent-nav__box{position:relative;border:1px solid rgba(185,160,255,.42);border-radius:18px;background:rgba(255,255,255,.94);box-shadow:0 18px 44px rgba(138,105,210,.18);backdrop-filter:blur(12px);overflow:hidden}
.yom-artmug-parent-nav__box:before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,rgba(196,178,255,.18),rgba(158,126,235,.72),rgba(221,212,255,.42))}
.yom-artmug-parent-nav__head{position:relative;display:flex;align-items:center;justify-content:center;gap:8px;padding:18px 18px 14px;border-bottom:1px solid rgba(190,170,245,.22);background:linear-gradient(180deg,rgba(250,247,255,.95),rgba(255,255,255,.76));font-size:15px;letter-spacing:.08em;font-weight:800;color:#7d65c8;text-align:center}
.yom-artmug-parent-nav__list{display:flex;flex-direction:column;padding:10px 0}
.yom-artmug-parent-nav__button{position:relative;appearance:none;width:100%;border:0;background:transparent;border-radius:0;padding:13px 20px 13px 24px;text-align:left;font:inherit;font-size:15px;font-weight:700;color:#49405f;cursor:pointer;transition:background .18s ease,color .18s ease,letter-spacing .18s ease}
.yom-artmug-parent-nav__button:hover{background:linear-gradient(90deg,rgba(235,229,255,.98),rgba(248,246,255,.62));color:#6f55c8;letter-spacing:.01em}
.yom-artmug-parent-nav__button:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#a98cff;opacity:0;transition:opacity .18s ease}
.yom-artmug-parent-nav__button:hover:before{opacity:1}
.yom-artmug-parent-nav__button:after{content:"";position:absolute;right:18px;top:50%;width:5px;height:5px;border-radius:999px;background:#c7b5ff;opacity:0;transform:translateY(-50%) scale(.6);transition:opacity .18s ease,transform .18s ease}
.yom-artmug-parent-nav__button:hover:after{opacity:1;transform:translateY(-50%) scale(1)}

.yom-artmug-image-modal{position:fixed;inset:0;z-index:1000000;display:none;align-items:center;justify-content:center;padding:34px;background:rgba(29,24,46,.62);backdrop-filter:blur(8px)}
.yom-artmug-image-modal.is-open{display:flex}
.yom-artmug-image-modal__panel{position:relative;display:flex;align-items:center;justify-content:center;max-width:min(92vw,1280px);max-height:88vh;border:1px solid rgba(221,212,255,.72);border-radius:24px;background:linear-gradient(135deg,rgba(255,255,255,.98),rgba(248,246,255,.96));box-shadow:0 28px 80px rgba(61,47,111,.34);overflow:hidden}
.yom-artmug-image-modal__image{display:block;max-width:100%;max-height:88vh;width:auto;height:auto;object-fit:contain}
.yom-artmug-image-modal__close{position:absolute;top:14px;right:14px;z-index:2;width:42px;height:42px;border:1px solid rgba(185,160,255,.5);border-radius:999px;background:rgba(255,255,255,.9);color:#6f55c8;font-size:24px;line-height:1;font-weight:700;cursor:pointer;box-shadow:0 10px 24px rgba(138,105,210,.18);transition:background .18s ease,transform .18s ease,color .18s ease}
.yom-artmug-image-modal__close:hover{background:#efeaff;color:#5e43bd;transform:scale(1.04)}
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
    // 활성 메뉴 표시는 실제 스크롤 위치와 싱크가 어긋날 수 있어 사용하지 않습니다.
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


  function closeImageModal() {
    var modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.classList.remove('is-open');
    var img = modal.querySelector('.yom-artmug-image-modal__image');
    if (img) img.removeAttribute('src');
  }

  function ensureImageModal() {
    var modal = document.getElementById(MODAL_ID);
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'yom-artmug-image-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    var panel = document.createElement('div');
    panel.className = 'yom-artmug-image-modal__panel';

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'yom-artmug-image-modal__close';
    close.setAttribute('aria-label', '이미지 닫기');
    close.textContent = '×';

    var img = document.createElement('img');
    img.className = 'yom-artmug-image-modal__image';
    img.alt = '샘플 이미지 크게 보기';

    close.addEventListener('click', closeImageModal);
    modal.addEventListener('click', function (event) {
      if (event.target === modal) closeImageModal();
    });

    panel.appendChild(close);
    panel.appendChild(img);
    modal.appendChild(panel);
    document.body.appendChild(modal);
    return modal;
  }

  function openImageModal(src) {
    if (!src) return;
    var modal = ensureImageModal();
    var img = modal.querySelector('.yom-artmug-image-modal__image');
    if (!img) return;
    img.src = src;
    modal.classList.add('is-open');
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
      if (data.type === 'YOM_OPEN_IMAGE_MODAL') openImageModal(data.src);
      if (data.type === 'YOM_IFRAME_READY') sendViewport();
    });
    window.addEventListener('scroll', sendViewport, { passive: true });
    window.addEventListener('resize', sendViewport);
    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeImageModal();
    });
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
