// Service worker — currently a passthrough.
// Future: handle wallet session, badge counts, notifications.
chrome.runtime.onInstalled.addListener(() => {
  console.log("SolTip extension installed.");
});
