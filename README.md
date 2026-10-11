# ValueClub prototype v26 — voucher scrolling, scratch release and touch ownership

Unzip and serve this folder over HTTP locally, or upload its contents unchanged to your existing static host. Open index.html through the server. HTTPS is required for installed PWA offline support. No build step or package installation is needed. This is a browser-local prototype; POS, camera, payments and CRM services remain simulated.

## Navigation

Home, Rewards and Account retain their route, detail stack, segment choices and scroll position for the session. Switch tabs with one tap. Re-tap the selected tab from a detail page to return to its root at the saved position; another tap scrolls to the top. On a root screen, a re-tap scrolls to the top. Scroll at the top stays unchanged. A cold launch starts at Home.

Button Back and left-edge Back restore the exact previous page scroll. The edge gesture locks only after horizontal intent, supports quick flicks, and cleans up on cancellation or additional touches. Vertical scrolling, manually swiped campaign banners and bottom navigation have separate interaction ownership. Warranty/voucher sibling sections support horizontal swipes and taps. The bottom tab indicator follows a horizontal drag and selects its destination on release; cancellation keeps the current tab. Scan stays separate.

Scan remains the detached primary action, with the original Home layout and six manual vendor banners in the demo. Scan does not become a saved tab destination.

## Motion

Push: 320ms. Button Back: 280ms. Completed/cancelled interactive Back settles in 180ms. Bottom tabs switch content immediately; the indicator moves for 220ms. Sheets enter in 320ms; dialogs in 220ms; overlays fade in 180ms and out 160ms. Scan/reward feedback uses 240ms. Page slides use transform only. System chrome keeps a neutral background; it no longer samples screen pixels or changes background during gestures. Reduced motion removes programmatic page and overlay animations while preserving direct finger tracking.

The navigation stack keeps bounded snapshots captured at navigation boundaries. It does not clone on every gesture frame. Tab switching never crossfades the entire page. Explicit cleanup handles completed, cancelled and interrupted animations.

## Audit thoughts updates

- General / Apple / Gaming campaign fixtures change content inside the same Home modules.
- Three manually swiped banners; no autoplay; existing 3/1/0/loading controls retained.
- Separate Cashback and Spend Reward cashback, combined usable total, and a next-earn action based on the existing $25 single-receipt rule.
- Member-since context and additional Coming Up fixtures for expiry, renewal, launches and streaks.
- Receipt/service activity first in Inbox; duplicated Acer hero campaign removed.
- Essential account Inbox messages distinguished from opted-in marketing channels.
- Scan confirmation says “You're checked in”; permission, unavailable-camera, unavailable-service and wrong-QR recovery added to existing expired/linked/offline states, using the existing member QR fallback.
- Scan completion no longer claims cashback was earned before payment.
- Campaign IAM cannot interrupt Scan/auth/payment or an open modal; at most one manually requested IAM per session. Automatic launch marketing removed.

## QA and developer controls

Three quick taps on the ValueClub logo opens the dev menu. Five quick taps resets browser-local demo data. The menu includes account tier, audience, Coming Up, banners, notification preferences, appearance, reward states and eight Scan outcomes.

QA.html runs the included isolated regression suite. QA.html?reduced tests the reduced-motion branch by substituting the motion preference. QA pages do not write the app's saved preferences. QA-motion.html holds a partial warranty-to-Home swipe for visual inspection. TEST-RESULTS.json contains the captured results and MOTION-AUDIT.md explains the verification limits.

## Deployment and device testing

Deploy all app files and assets together. The service-worker version is content-derived; activation removes only ValueClub caches. Updates apply on the next launch after the new cache has installed, without reloading an active gesture. Test both a fresh iPhone Home Screen installation and an update over the old installation. Use the same deployment subpath; relative asset URLs are retained.

Desktop preview uses the original phone frame. The existing medium/expanded and Android component variants remain in source; this release's recorded browser interaction tests exercise compact iOS. Production CRM governance and adaptive layout handoff are in CRM-HANDOFF.md. These tests do not establish physical iPhone PWA frame rates or real POS/payment reliability.

Preact is MIT licensed; see PREACT-LICENSE.

Additional page matrix: open `QA.html?layout=1`. Visual fixtures: `QA-review.html?page=scan&large` or `QA-review.html?w=760&h=820`. Production app responsive preview: `?viewport`; Android styling: `?viewport&platform=android`. Tests isolate local storage from the product preview.

Final v16 checks: 840/840 local-browser assertions. See TEST-RESULTS.json, MOTION-AUDIT.md and GLASS-AUDIT.md for scope and physical-device limits. The Cashback history chart no longer includes the redundant earning CTA.

## v20 scratch card

Scratch with a finger or pointer to erase the coating. Clearing half the sampled surface reveals the reward automatically. Ordinary taps do not claim it. Reveal it remains a keyboard/screen-reader alternative. Reveal fades the remaining coating and animates the prize and coins; reduced motion confirms immediately.

## v21 audit

AUDIT-v21.md documents findings, fixes and remaining device/integration acceptance. QA-audit.html covers delayed reward/input callbacks, modal focus, clipboard rejection, account isolation, matching-game taps and repair history. Local demo rewards are scoped per account; daily resets use the Singapore date.

## Build 22 date fixtures

Triple-tap the ValueClub logo to open Demo dates. Original calendar dates default to +3 days, with preset and custom offsets. Warranty Available / Expired fixtures adjust the iPad purchase window relative to today in Singapore; the displayed dates and eligibility stay consistent. Month-only membership dates and card expiry codes remain unchanged.

## PWA verification

Build 22 tests actual service-worker cache installation, offline navigation and offline Home launch. QA-PWA.html provides a cache report; add ?offline=1 for offline navigation checks after loading it once online. Desktop automated checks do not certify iPhone Home Screen rendering or 120 Hz performance. Full device verification remains necessary. Deploy all files together, fully close and reopen the installed app, then triple-tap the logo to confirm Build 22.

Build 23: see CHANGELOG-v23.md and AUDIT-v23.md. Vouchers use a full list with one outer page scroll. Scratch reveals only on release after 70% erased coverage. Section swipes keep one full-width panel visible.

Build 24: section capture-transfer cancellation fixed; voucher height is reserved to keep the page anchored when switching to a shorter list. Main scrolling contains overscroll and header effects clamp negative scroll offsets. See CHANGELOG-v24.md.

Build 25 restores local elastic scrolling with scroll chaining contained. Negative offsets remain excluded from header parallax and fade calculations.

Build 26 redesigns the campaign page and expands Home to six banners. Campaign fields and catalog selection are editable through the Braze adapter after SDK/catalog setup. See BRAZE-EDITOR-GUIDE.md, BRAZE-CONTENT-EXAMPLE.json and BRAZE-PRODUCT-CATALOG.csv. No live Braze workspace is connected.
