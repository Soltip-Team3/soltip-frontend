// ── Config ──────────────────────────────────────────────────────────────────
// Change this to your Vercel URL before submitting (e.g. "https://soltip.vercel.app")
const API_BASE = "http://localhost:3000";
const PROCESSED_ATTR = "data-soltip";
const USDC_DEVNET_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

// ── Caches ───────────────────────────────────────────────────────────────────
const creatorCache = new Map(); // handle → { registered: bool, wallet: string|null }

// ── API helpers ──────────────────────────────────────────────────────────────
async function fetchCreator(handle) {
  if (creatorCache.has(handle)) return creatorCache.get(handle);
  try {
    const res = await fetch(
      `${API_BASE}/api/creator?handle=${encodeURIComponent(handle)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    const result = res.ok ? await res.json() : null;
    creatorCache.set(handle, result);
    return result;
  } catch {
    return null;
  }
}

// ── DOM helpers ──────────────────────────────────────────────────────────────
function extractHandle(article) {
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

function buildTipButton(handle, tweetId) {
  const btn = document.createElement("button");
  btn.className = "soltip-btn";
  btn.setAttribute("aria-label", `Tip @${handle} on SolTip`);
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
    </svg>
    <span>Tip</span>
  `;

  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    e.preventDefault();

    // Build the destination URL
    const tipUrl = tweetId
      ? `${API_BASE}/creator/${handle}?tweet_id=${tweetId}`
      : `${API_BASE}/creator/${handle}`;

    // Simple heuristic: open cross-chain page if Solana wallet is likely not connected
    // (Full balance check would require a background service worker with wallet access)
    const crossChainUrl = `${API_BASE}/tip/${handle}`;

    // Open tip page — user can switch to cross-chain from there
    window.open(tipUrl, "_blank");
  });

  return btn;
}

async function processTweet(article) {
  if (article.hasAttribute(PROCESSED_ATTR)) return;
  article.setAttribute(PROCESSED_ATTR, "1");

  const handle = extractHandle(article);
  if (!handle) return;

  const creator = await fetchCreator(handle);
  if (!creator) return;

  const tweetId = extractTweetId(article);

  const actionGroup = article.querySelector('[role="group"]');
  if (!actionGroup || actionGroup.querySelector(".soltip-btn")) return;

  actionGroup.appendChild(buildTipButton(handle, tweetId));
}

function scanTweets() {
  document
    .querySelectorAll(`article[data-testid="tweet"]:not([${PROCESSED_ATTR}])`)
    .forEach(processTweet);
}

// Initial scan + MutationObserver for dynamically injected tweets
scanTweets();
const observer = new MutationObserver(scanTweets);
observer.observe(document.body, { childList: true, subtree: true });

