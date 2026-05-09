const API_BASE = "http://localhost:3000";
const PROCESSED_ATTR = "data-soltip";

// Cache registered/unregistered handles to avoid hammering the API
const creatorCache = new Map();

async function isRegisteredCreator(handle) {
  if (creatorCache.has(handle)) return creatorCache.get(handle);
  try {
    const res = await fetch(
      `${API_BASE}/api/creator?handle=${encodeURIComponent(handle)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    const result = res.ok;
    creatorCache.set(handle, result);
    return result;
  } catch {
    return false;
  }
}

function extractHandle(article) {
  // X profile links are /<handle> — not /<handle>/status/...
  const links = article.querySelectorAll('a[href^="/"]');
  for (const link of links) {
    const href = link.getAttribute("href") || "";
    const parts = href.split("/").filter(Boolean);
    if (parts.length === 1) return parts[0];
  }
  return null;
}

function extractTweetId(article) {
  const link = article.querySelector('a[href*="/status/"]');
  if (!link) return null;
  const match = (link.getAttribute("href") || "").match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

function buildTipButton(handle) {
  const btn = document.createElement("button");
  btn.className = "soltip-btn";
  btn.setAttribute("aria-label", `Tip @${handle} on SolTip`);
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
    </svg>
    <span>Tip</span>
  `;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(`${API_BASE}/creator/${handle}`, "_blank");
  });
  return btn;
}

async function processTweet(article) {
  if (article.hasAttribute(PROCESSED_ATTR)) return;
  article.setAttribute(PROCESSED_ATTR, "1");

  const handle = extractHandle(article);
  if (!handle) return;

  const registered = await isRegisteredCreator(handle);
  if (!registered) return;

  // Find the tweet action bar (reply / repost / like / share row)
  const actionGroup = article.querySelector('[role="group"]');
  if (!actionGroup || actionGroup.querySelector(".soltip-btn")) return;

  actionGroup.appendChild(buildTipButton(handle));
}

function scanTweets() {
  document
    .querySelectorAll(`article[data-testid="tweet"]:not([${PROCESSED_ATTR}])`)
    .forEach(processTweet);
}

// Initial scan after page load
scanTweets();

// Watch for new tweets injected by X's virtual DOM
const observer = new MutationObserver(scanTweets);
observer.observe(document.body, { childList: true, subtree: true });
