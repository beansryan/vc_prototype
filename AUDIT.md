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

## Prototype 15 correction

The device screenshot showed a navy gap under the app after prototype 14. The sizing code assigned visualViewport.height minus the top safe inset to a shell already inset from the top. That relies on visualViewport and fixed-position geometry using identical system-area accounting, which this installed app did not satisfy. Removed the inline height assignment. The fixed shell now stretches between its CSS top safe inset and bottom:0, and the component measures that actual shell height. The status background and earlier interaction fixes remain.

This correction was checked by script parsing, rendering logic and a focused sizing test using a visualViewport height smaller than the fixed shell. It still requires iPhone visual validation. The previous claim of improved keyboard sizing is unverified; the visualViewport height override has been removed.

## Prototype 16 — scroll status colour

The status backdrop switches from navy to #F2F3F8 when the sheet's cached starting position minus scrollTop reaches zero, and switches back when it is positive. Dark appearance uses black. The callback runs only on threshold changes; there are no additional layout measurements or page state renders. System status text/icon colour remains controlled by iOS and must be checked on device against the pale grey background.

## Prototype 17 — smooth top and neutral bottom

Top backdrop now interpolates continuously from navy to the content grey over a distance based on the actual top safe inset, with a 48px fallback. It uses the existing cached sheet position and animation-frame queue; there is no layout read or application state render per scroll. This replaces the threshold flip from v16. Neutral screens without a branded band use grey immediately.

The bottom safe area gets its own fixed neutral backdrop. The HTML/body canvas remains neutral independently of the top, so any system-exposed space at the bottom no longer inherits navy. Dark appearance uses black. Compact standalone content spacing is explicit 14px after the measured CSS safe inset, instead of subtracting the simulated status reservation. No physical iPhone 17 Pro Max dimensions are hardcoded.

Script/logic checks pass; visual iOS 27 testing remains outstanding. System clock colour remains controlled by iOS.

## Prototype 18 — extend actual content to screen edge

Prototype 17 coloured the exposed bottom area but did not correct the shortened fixed containing block seen in the device screenshot. Prototype 18 sets the installed phone shell height to the current display's CSS screen height minus its top safe inset. This extends the actual scrolling content and bottom navigation to the screen edge; the separate bottom colour strip has been removed. Portrait and landscape use the screen dimensions without hardcoding an iPhone model. Normal Safari and the desktop frame retain their existing layout. A focused-input/visual-viewport check temporarily shortens the shell when a large keyboard-sized occlusion is present.

The focused geometry regression checks simulate a display taller than the reported fixed/visual viewport, plus landscape and keyboard cases. Real-device visual confirmation is still needed.

## Prototype 19 — debug and polish pass

- Physical display orientation replaces CSS viewport orientation in sizing; showing the keyboard on a portrait phone no longer selects landscape dimensions. Keyboard sizing remains until the viewport recovers after blur, avoiding an immediate jump during dismissal.
- Startup/skeleton keeps the top navy rather than briefly grey. The scroll blend updates in the existing scroll animation frame rather than scheduling a second frame. Unchanged canvas colours no longer trigger repeated writes.
- Explicit light/dark choices survive a change in device appearance.
- Address and voucher-copy feedback waits for actual clipboard success.
- HTML references versioned v19 scripts. The new offline worker matches only its own cache and preserves request query strings. Failed navigation responses fall back to the offline page rather than replacing it with an error document.

Validation: 120 rendering logic configurations, navigation and simulated scan, full-screen geometry, keyboard open/closing/recovery, physical landscape, colour blend endpoints/midpoint/reversal, dark mode, startup and deduplicated style writes. All shipped scripts parse; referenced assets and offline precache paths exist. These checks execute real application functions with simulated browser geometry, not visual browser or iPhone tests. Browser launching remains blocked by the local sandbox. Actual scrolling smoothness, installed iOS system chrome and clock legibility still require device validation.

## Prototype 21 — correction using device measurements

The iPhone 17 Pro Max screenshot reports screen 440×956, inner and visual viewport 440×894, safe top 62px and bottom 34px, app root top 62px/bottom 894px/height 832px. That establishes the extra 62px inset in our app. Prototype 21 removes this inset and the separate status overlay, and restores default status-bar mode. It measures the remaining root viewport directly; no physical screen-height override is used. The runtime safe top is measured only for the colour blend distance, not deducted from layout.

Native default mode is required to be reinstalled via a fresh Home Screen icon. The previous translucent installation displayed a truncated usable viewport; simulated geometry tests did not establish that the native screen would paint outside it. The colour blend still drives theme-color and the root HTML/body background; its effect on the native iOS status region is device-dependent and unverified. Filling the actual content viewport and keeping the navigation visible takes priority over recreating a separate page-owned status strip.

Measured-geometry regression checks verify a root of 894px rather than 832px for the supplied metrics. Real device confirmation of the newly installed default mode is pending.
