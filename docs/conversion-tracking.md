# Conversion tracking

Set these public identifiers in Vercel Production and redeploy:

```
NEXT_PUBLIC_META_PIXEL_ID=your_numeric_pixel_id
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

No Meta access token or GA API secret is needed for this browser integration. Do not regenerate payment keys.

Events:

| Trigger | GA4 | Meta |
| --- | --- | --- |
| Consented public-page visit | page_view | PageView |
| Razorpay order prepared | begin_checkout | InitiateCheckout |
| Free confirmed demo or verified paid demo | demo_booked | Schedule |
| Server-verified demo/course payment | purchase | Purchase |

Purchase includes INR value, item and the Razorpay order as transaction ID. Failed/cancelled checkout does not emit purchase. A local event/order key suppresses repeat emissions in the same browser; this is not a cross-device delivery guarantee. No explicit names, emails, phones, chat contents or student profile data are included in event parameters. Google page URLs exclude queries. Meta's browser script can collect its standard browser/page metadata.

Tracking scripts load after consent. Classroom, support and admin page views are excluded. Configure GA enhanced measurement to disable history-based pageviews (this app sends SPA pageviews), form interactions and site-search parameters if they could contain personal information. Do not enable Meta automatic advanced matching without a separate privacy review.

In GA4 mark `demo_booked` as a key event and verify `purchase` in ecommerce reports. In Meta Events Manager use Test Events to check Schedule and Purchase. Use a test payment setup to verify paid events; do not manufacture purchases on the live site. Decline consent and confirm there are no script requests, then accept and inspect events in GA DebugView/Realtime and Meta Test Events. For DebugView enable debug mode with the browser debugger extension in your testing environment.

Browser blocking, denied consent or closing the page before verification can prevent delivery. CAPI/Measurement Protocol server delivery is not enabled by this change. Existing Meta CAPI endpoint remains disabled. IDs, deployed event receipt and live conversions require verification before campaign optimization.

References: https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
