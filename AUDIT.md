# ValueClub prototype 14 — iOS status area and interaction audit

Source: valueclub-prototype_13.zip in Downloads. This is a patched prototype, not a deployed update.

## Changes

- Replaced the default status-bar meta setting with black-translucent; retained standalone capability and viewport-fit=cover.
- Added a fixed navy safe-area background above the app shell. Content starts below that region so scroll content and page animations cannot travel behind the time. The strip remains navy on utility pages, with a darker navy for dark mode.
- Matched manifest theme and launch backgrounds to the navy page background.
- Removed the top-edge colour sampling loop, its temporary style insertion and repeated scroll-triggered background writes. Status appearance follows the chosen app appearance, including an explicit light/dark preference.
- Sized the phone shell from the visible viewport, accounting for the status inset; deduplicated unchanged renders and removed timed startup renders. This is intended to reduce keyboard and browser-bar clipping. Desktop framing is retained.
- Removed the per-scroll clientHeight check in sheet measurement; measurements are invalidated on layout property changes.
- Disabled whole-document View Transitions in standalone mode to keep the status area out of page snapshots. Existing app-layer motion remains available.
- Cleaned up a cancelled or vertically abandoned edge-back swipe, including its shadow and temporary background. Reduced motion skips that gesture animation and shared motion effects; CSS animations and transitions also respect reduced motion.
- Prevented rejected View Transition promises from becoming unhandled errors.
- Prevented a completed spin from opening a reward modal on a different screen after navigating away. Clears spin and scroll-animation timers on unmount.
- Fixed false “Link copied” feedback and caught asynchronous clipboard failures.
- Flushes saved state when the app is hidden or leaves the page. Daily progress now uses the device's local date rather than the UTC date.
- Reset removes only ValueClub's storage keys. Service worker cache cleanup removes only caches prefixed with vc-.
- Bumped the offline cache version and removed forced reloads on controller changes, preventing an update from interrupting an active session.

## Validation completed

All five application scripts parse. Executed renderVals for 15 screens × four membership tiers × two appearances: 120 configurations passed. Tested forward/back navigation and simulated scan completion. Inspected source changes and archive contents.

Automated browser launch and local test server were blocked by the environment. No visual browser, iPhone, performance trace or installed iOS 27 test was completed. The rendering logic checks do not validate CSS painting, gesture timing or Safari's system chrome.

## iPhone test after deployment

1. Upload all files from the ZIP, including sw.js, replacing the old package. Open the site online, allow the new offline worker to install, then fully close and reopen it.
2. Remove the old Home Screen icon and add the updated site again. This may affect locally stored prototype progress depending on iOS storage handling.
3. Check the time region on Home, Cashback, Rewards, Account and Settings in light/dark mode. It should have a stable navy page backdrop; verify the clock remains legible.
4. Scroll repeatedly and switch tabs quickly; check that the header and bottom navigation stay visible.
5. Open signup/login and show/dismiss the keyboard; check that fields can be reached and the layout recovers.
6. Start a back swipe and cancel it vertically; the screen should return without a lingering shadow or offset. Start a spin, navigate away and wait; its win modal should not interrupt the other page.
7. Test reduced motion and reopen offline after one successful online load.

The patch controls the pixels painted by the page. iOS may still apply its own status-area blur, separator or contrast treatment; this package cannot promise removal of system effects. If grey remains, inspect the installed build and exact iOS version before making further changes. Avoid stacking additional hardcoded status offsets on top of this safe-area shell.

## Primary references checked

- https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html
- https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- https://webkit.org/blog/18325/webkit-features-for-safari-27-0/

Apple's legacy meta-tag documentation describes the overlay behaviour; it does not guarantee the precise appearance of system chrome in iOS 27. The current Safari 27 release article does not establish a universal fix for installed web-app status-bar tinting.
