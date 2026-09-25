# Platform management

## Administrator setup

1. Create an email/password account in Firebase Authentication for the designated administrator. Do not use a student's or teacher's account.
2. Copy that account's UID. In a trusted terminal with server credentials in `.env.local`, run `node scripts/set-platform-admin.cjs FIREBASE_UID`.
3. Open `/admin-login`, sign in, and use `/admin-console`.
4. To revoke access run `node scripts/set-platform-admin.cjs FIREBASE_UID revoke`.

The new management endpoints require the server-verified `admin: true` Firebase custom claim. A `users.role` field or navigation cookie does not grant access. No account has been granted administrator access by this implementation.

## Deployment requirements

Firebase Admin needs access to the `dark` Firestore database and the configured Storage bucket. Uploads support PNG/JPEG/WebP up to 3 MB. Uploaded banners become visible only after publishing settings.

Protect these collections from ALL direct client SDK reads/writes in the deployed Firestore rules: `platform_settings`, `admin_audit`, `help_threads` and its subcollections. They are accessed through authenticated server routes. For example, add a deny rule for each path and ensure no broader wildcard allow overlaps it (Firestore combines allows):

```
match /platform_settings/{document=**} { allow read, write: if false; }
match /admin_audit/{document=**} { allow read, write: if false; }
match /help_threads/{document=**} { allow read, write: if false; }
```

Deny direct client writes to Storage `platform-offers/**`. Images are uploaded by the authenticated admin endpoint and served publicly by their immutable image URL. Existing unrelated rules must be preserved. This repository has no checked-in rules file; deployed rules must be reviewed before production rollout.

## Behavior

- Student and teacher workspace navigation includes Help & chat. FAQ replies are predefined, not AI-generated. Human replies come from the admin inbox; conversations refresh every five seconds.
- Members can only read or write their own thread. Admins can page through the inbox and reply. Messages are limited to 2,000 characters, deduplicated by request ID, with a short member send cooldown.
- Directory pages load 50 members at a time; the search filters loaded rows. Sensitive verification documents and payout details are excluded.
- Demo fees, free-demo promotion and six course prices are stored centrally. New payment orders use server-side prices. Existing orders/booking fees retain their recorded amount.
- The 72-hour offer window remains tied to demo completion. Offer banners are editorial content; changing a banner does not itself change prices.
- Admin pricing updates record before/after values and the actor in `admin_audit`.

## Acceptance checks with test accounts

Check unsigned/non-admin management requests are denied; students cannot query another UID's chat; teacher/student messages arrive in admin inbox; admin replies return to the correct member; duplicate sends are not duplicated; pagination works. Verify a changed demo fee at booking and order creation, each plan in Hub/billing/order, disabled savings, and image upload/publish/remove. Use payment provider test mode. Live Firebase rules, Storage permissions, and real-account flows were not deployed or verified by local compilation checks.
