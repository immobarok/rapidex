// Intercepts browser downloads and forwards URL + cookies to local Rappidex server
chrome.downloads.onCreated.addListener(async (downloadItem) => {
  if (!downloadItem.url.startsWith('http')) return;

  try {
    await fetch('http://127.0.0.1:41920/api/v1/sniffer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: downloadItem.url,
        fileName: downloadItem.filename || '',
        referer: downloadItem.referrer || '',
        userAgent: navigator.userAgent,
      }),
    });
    chrome.downloads.cancel(downloadItem.id);
  } catch {
    // Rappidex desktop app is not running; let browser handle download normally
  }
});

