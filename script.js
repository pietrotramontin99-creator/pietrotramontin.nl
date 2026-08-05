
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

const portrait = document.querySelector(".portrait");
if (portrait) {
  portrait.addEventListener("error", () => {
    portrait.style.display = "none";
    const fallback = document.querySelector(".portrait-fallback");
    if (fallback) fallback.style.display = "flex";
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));


const marquee = document.querySelector(".media-marquee");
const items = document.querySelectorAll(".media-item");
const popup = document.querySelector(".media-popup");
const popupLink = document.querySelector(".media-popup-link");
const previewImage = document.querySelector(".mini-site-image");
const previewWrap = document.querySelector(".mini-site-image-wrap");
const brand = document.querySelector(".mini-site-brand");
const domain = document.querySelector(".mini-site-domain");
const type = document.querySelector(".mini-site-type");
const title = document.querySelector(".mini-site-title");
const copy = document.querySelector(".mini-site-copy");
const quote = document.querySelector(".mini-site-quote");

let hideTimer = null;
let activeItem = null;
const previewCache = new Map();

const cookieHidingCss = `
  #onetrust-banner-sdk,
  #onetrust-consent-sdk,
  .onetrust-pc-dark-filter,
  #didomi-host,
  .didomi-popup-container,
  .qc-cmp2-container,
  .sp_message_container,
  .fc-consent-root,
  [id*="cookie"][role="dialog"],
  [class*="cookie"][role="dialog"],
  [class*="consent"][role="dialog"],
  [class*="privacy"][role="dialog"],
  [data-testid*="cookie"],
  [aria-label*="cookie" i],
  [aria-label*="privacy" i] {
    display:none !important;
    visibility:hidden !important;
    opacity:0 !important;
  }
  html,body{overflow:auto !important}
`;

function microlinkUrl(targetUrl, params = {}) {
  const api = new URL("https://api.microlink.io/");
  api.searchParams.set("url", targetUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      api.searchParams.set(key, String(value));
    }
  });

  return api.toString();
}

async function fetchMicrolinkScreenshot(targetUrl) {
  if (previewCache.has(targetUrl)) return previewCache.get(targetUrl);

  const request = fetch(microlinkUrl(targetUrl, {
    screenshot: true,
    meta: false,
    "screenshot.type": "jpeg",
    "screenshot.quality": 82,
    "screenshot.fullPage": false,
    "viewport.width": 1180,
    "viewport.height": 760,
    waitUntil: "networkidle2",
    waitForTimeout: 1200,
    styles: cookieHidingCss
  }))
    .then((response) => {
      if (!response.ok) throw new Error(`Microlink ${response.status}`);
      return response.json();
    })
    .then((payload) => payload?.data?.screenshot?.url || null)
    .catch(() => null);

  previewCache.set(targetUrl, request);
  return request;
}


function pause() {
  marquee?.classList.add("is-paused");
}

function resume() {
  marquee?.classList.remove("is-paused");
}

function positionPopup(item) {
  if (!popup || !item) return;

  const rect = item.getBoundingClientRect();
  const edge = 12;
  const gap = 12;
  const width = popup.offsetWidth || 278;
  const height = popup.offsetHeight || 260;

  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.max(edge, Math.min(left, window.innerWidth - width - edge));

  let top = rect.top - height - gap;
  top = Math.max(edge, top);

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

async function loadPreview(item) {
  if (!previewImage || !previewWrap) return;

  previewWrap.classList.add("is-empty");
  previewImage.removeAttribute("src");

  const localPreview = item.dataset.preview;
  const targetUrl = item.href;

  if (localPreview) {
    previewImage.onload = () => {
      previewWrap.classList.remove("is-empty");
      positionPopup(activeItem);
    };
    previewImage.onerror = () => loadOnlinePreview(item);
    previewImage.src = localPreview;
    return;
  }

  await loadOnlinePreview(item);
}

async function loadOnlinePreview(item) {
  if (!previewImage || !previewWrap || activeItem !== item) return;

  const fallbackPreview = item.dataset.fallbackPreview || "";

  if (fallbackPreview) {
    previewImage.onload = () => {
      previewWrap.classList.remove("is-empty");
      positionPopup(activeItem);
    };
    previewImage.src = fallbackPreview;
  }

  const screenshotUrl = await fetchMicrolinkScreenshot(item.href);
  if (!screenshotUrl || activeItem !== item) return;

  previewImage.onload = () => {
    previewWrap.classList.remove("is-empty");
    positionPopup(activeItem);
  };
  previewImage.onerror = () => {
    previewWrap.classList.add("is-empty");
  };
  previewImage.src = screenshotUrl;
}

function show(item) {
  if (!popup) return;

  clearTimeout(hideTimer);
  activeItem = item;
  pause();

  if (popupLink) popupLink.href = item.href;
  if (brand) brand.textContent = item.dataset.brand || item.dataset.label || "";
  if (domain) domain.textContent = item.dataset.domain || "";
  if (type) type.textContent = item.dataset.type || "";
  if (title) title.textContent = item.dataset.title || "";
  if (copy) copy.textContent = item.dataset.copy || "";
  if (quote) {
    quote.textContent = item.dataset.quote || "";
    quote.hidden = !item.dataset.quote;
  }

  popup.dataset.theme = item.dataset.theme || "";
  popup.classList.add("is-visible");
  popup.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => positionPopup(item));
  loadPreview(item);
}

function scheduleHide() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    popup?.classList.remove("is-visible");
    popup?.setAttribute("aria-hidden", "true");
    activeItem = null;
    resume();
  }, 320);
}

function keepOpen() {
  clearTimeout(hideTimer);
  pause();
}

items.forEach((item) => {
  item.addEventListener("mouseenter", () => show(item));
  item.addEventListener("focus", () => show(item));
  item.addEventListener("mouseleave", scheduleHide);
  item.addEventListener("blur", scheduleHide);
});

marquee?.addEventListener("mouseenter", pause);
marquee?.addEventListener("mouseleave", () => {
  if (!popup?.matches(":hover")) scheduleHide();
});

popup?.addEventListener("mouseenter", keepOpen);
popup?.addEventListener("mouseleave", scheduleHide);

window.addEventListener("resize", () => {
  if (activeItem) positionPopup(activeItem);
});
window.addEventListener("scroll", scheduleHide, { passive: true });






// Mobile-only: continuously moving marquee that can also be swiped.
(() => {
  const mq = window.matchMedia("(max-width: 820px)");
  const scroller = document.querySelector(".media-marquee");
  const track = document.querySelector(".media-track");

  if (!scroller || !track) return;

  let raf = null;
  let last = 0;
  let touching = false;
  let resumeTimer = null;
  const speed = 28; // pixels per second

  function loopWidth() {
    return track.scrollWidth / 2;
  }

  function wrap() {
    const half = loopWidth();
    if (!half) return;

    if (scroller.scrollLeft >= half) {
      scroller.scrollLeft -= half;
    } else if (scroller.scrollLeft < 0) {
      scroller.scrollLeft += half;
    }
  }

  function stop() {
    if (raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    last = 0;
  }

  function tick(now) {
    if (!mq.matches || touching || document.hidden) {
      raf = null;
      last = 0;
      return;
    }

    if (!last) last = now;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    scroller.scrollLeft += speed * dt;
    wrap();
    raf = requestAnimationFrame(tick);
  }

  function start() {
    clearTimeout(resumeTimer);
    if (!mq.matches || touching || document.hidden || raf !== null) return;
    raf = requestAnimationFrame(tick);
  }

  function resumeAfter(delay = 450) {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(start, delay);
  }

  function reset() {
    clearTimeout(resumeTimer);
    touching = false;
    scroller.classList.remove("is-paused", "is-touching");
    popup?.classList.remove("is-visible");
    popup?.setAttribute("aria-hidden", "true");
    activeItem = null;
    stop();
    wrap();
    start();
  }

  scroller.addEventListener("touchstart", () => {
    if (!mq.matches) return;
    touching = true;
    stop();
  }, { passive: true });

  scroller.addEventListener("touchmove", () => {
    if (!mq.matches) return;
    wrap();
  }, { passive: true });

  const finishTouch = () => {
    if (!mq.matches) return;
    touching = false;
    wrap();
    resumeAfter();
  };

  scroller.addEventListener("touchend", finishTouch, { passive: true });
  scroller.addEventListener("touchcancel", finishTouch, { passive: true });

  scroller.addEventListener("scroll", () => {
    if (!mq.matches) return;
    wrap();
    if (!touching) resumeAfter(600);
  }, { passive: true });

  window.addEventListener("load", reset);
  window.addEventListener("pageshow", reset);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else reset();
  });

  mq.addEventListener?.("change", () => {
    stop();
    if (mq.matches) reset();
    else scroller.scrollLeft = 0;
  });

  // Start after images/layout have had time to settle.
  requestAnimationFrame(() => {
    requestAnimationFrame(reset);
  });
})();
