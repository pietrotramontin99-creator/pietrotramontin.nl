
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


// Mobile-only: draggable media marquee that resumes automatically.
(() => {
  const mobileQuery = window.matchMedia("(max-width: 820px) and (hover: none)");
  const mobileMarquee = document.querySelector(".media-marquee");
  const mobileTrack = document.querySelector(".media-track");

  if (!mobileMarquee || !mobileTrack) return;

  let frameId = null;
  let resumeTimer = null;
  let lastTime = 0;
  let isTouching = false;
  const speed = 24;

  function halfTrackWidth() {
    return mobileTrack.scrollWidth / 2;
  }

  function normalizeScroll() {
    const half = halfTrackWidth();
    if (!half) return;

    if (mobileMarquee.scrollLeft >= half) {
      mobileMarquee.scrollLeft -= half;
    } else if (mobileMarquee.scrollLeft < 0) {
      mobileMarquee.scrollLeft += half;
    }
  }

  function stopAutoScroll() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    lastTime = 0;
  }

  function step(time) {
    if (!mobileQuery.matches || isTouching || document.hidden) {
      frameId = null;
      lastTime = 0;
      return;
    }

    if (!lastTime) lastTime = time;
    const delta = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    mobileMarquee.scrollLeft += speed * delta;
    normalizeScroll();
    frameId = requestAnimationFrame(step);
  }

  function startAutoScroll() {
    clearTimeout(resumeTimer);
    if (!mobileQuery.matches || isTouching || document.hidden || frameId !== null) return;
    frameId = requestAnimationFrame(step);
  }

  function resumeSoon(delay = 550) {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(startAutoScroll, delay);
  }

  function resetMobileMarquee() {
    if (!mobileQuery.matches) return;

    clearTimeout(resumeTimer);
    clearTimeout(hideTimer);
    activeItem = null;
    isTouching = false;

    mobileMarquee.classList.remove("is-paused", "is-touching");
    popup?.classList.remove("is-visible");
    popup?.setAttribute("aria-hidden", "true");

    normalizeScroll();
    stopAutoScroll();
    startAutoScroll();
  }

  mobileMarquee.addEventListener("touchstart", () => {
    if (!mobileQuery.matches) return;
    isTouching = true;
    mobileMarquee.classList.add("is-touching");
    stopAutoScroll();
  }, { passive: true });

  mobileMarquee.addEventListener("touchmove", () => {
    if (!mobileQuery.matches) return;
    normalizeScroll();
  }, { passive: true });

  function finishTouch() {
    if (!mobileQuery.matches) return;
    isTouching = false;
    mobileMarquee.classList.remove("is-touching");
    normalizeScroll();
    resumeSoon();
  }

  mobileMarquee.addEventListener("touchend", finishTouch, { passive: true });
  mobileMarquee.addEventListener("touchcancel", finishTouch, { passive: true });

  mobileMarquee.addEventListener("scroll", () => {
    if (!mobileQuery.matches) return;
    normalizeScroll();
    if (!isTouching) resumeSoon(700);
  }, { passive: true });

  window.addEventListener("pageshow", resetMobileMarquee);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoScroll();
    } else {
      resetMobileMarquee();
    }
  });

  mobileQuery.addEventListener?.("change", () => {
    stopAutoScroll();

    if (mobileQuery.matches) {
      resetMobileMarquee();
    } else {
      mobileMarquee.scrollLeft = 0;
      mobileMarquee.classList.remove("is-touching", "is-paused");
    }
  });

  if (mobileQuery.matches) {
    requestAnimationFrame(resetMobileMarquee);
  }
})();


// Ensure Safari/iOS never keeps the marquee frozen after opening an article.
window.addEventListener("pagehide", () => {
  document.querySelector(".media-marquee")?.classList.remove("is-paused", "is-touching");
});

window.addEventListener("pageshow", (event) => {
  const mobileMarquee = document.querySelector(".media-marquee");
  const popup = document.querySelector(".media-popup");

  mobileMarquee?.classList.remove("is-paused", "is-touching");
  popup?.classList.remove("is-visible");
  popup?.setAttribute("aria-hidden", "true");

  if (event.persisted) {
    window.dispatchEvent(new Event("resize"));
  }
});
