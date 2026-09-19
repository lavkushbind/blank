// Browser-side Meta Pixel, GA4 and UTM Parameter Engine

export function trackUtmParameters() {
  if (typeof window === "undefined") return;

  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get("utm_source");
  const utmMedium = urlParams.get("utm_medium");
  const utmCampaign = urlParams.get("utm_campaign");

  if (utmSource) {
    const utmData = {
      source: utmSource,
      medium: utmMedium || "organic",
      campaign: utmCampaign || "none",
      capturedAt: new Date().toISOString(),
    };

    // First-touch attribution (save if not already present)
    if (!localStorage.getItem("blanklearn_first_touch")) {
      localStorage.setItem("blanklearn_first_touch", JSON.stringify(utmData));
    }
    // Last-touch attribution (always update)
    localStorage.setItem("blanklearn_last_touch", JSON.stringify(utmData));
  }
}

export function logAnalyticsEvent(eventName: string, params: Record<string, any> = {}) {
  if (typeof window === "undefined") return;

  // 1. Google Analytics 4 (gtag)
  if ((window as any).gtag) {
    (window as any).gtag("event", eventName, params);
  }

  // 2. Meta Pixel (fbq)
  if ((window as any).fbq) {
    (window as any).fbq("trackCustom", eventName, params);
  }

  console.log(`[Analytics Event Tracked]: ${eventName}`, params);
}