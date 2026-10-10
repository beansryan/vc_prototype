# Motion and page audit — ValueClub v16

The local browser regression suite exercises the real app state, renderer and animation APIs. It checks normal and simulated reduced motion separately. Scripted TouchEvents exercise gestures; they do not replace physical touchscreen validation.

Page pushes last 320ms, button Back 280ms and edge settle/cancellation 180ms. The under-page travels 25% of the width while the foreground travels the full width. All navigation animation properties are transforms. Navy waves morph over 360ms on tab switches, using only transform. Detail snapshots freeze the current wave position. Screen-edge shading is copied into page layers while stationary edge layers are hidden during motion and restored on completion. No full-page tab fade, document View Transition or background pixel sampling is used. Opaque snapshots are made at detail navigation boundaries, not per animation frame. At most eight history snapshots are retained per tab.

Checks cover detail/list scroll restoration, tab scroll and stack retention, active-tab root/top taps, bottom navigation during scroll suppression, diagonal/vertical gesture rejection, completed/cancelled Back, rapid reversals, transition cleanup, Scan errors/fallbacks and daily reward eligibility. Modal entrance and exit are exercised separately. The page matrix checks rendered content, screen dimensions, horizontal page overflow and text-element overflow on phone, two tablet windows and iOS/Android enlarged text. The JSON reports give exact results and scope.

The active-push requestAnimationFrame sample measures the transition itself in this local preview, not a physical iPhone frame-rate guarantee. It does not include a Safari hardware profiler trace. Visual inspection includes enlarged-text Scan, tablet Home and a held warranty-to-Home swipe.

## Device acceptance still required

Test Safari and a freshly installed/updated Home Screen app on the target iPhone: vertical inertia and stop taps, quick/diagonal edge gestures, interrupted transitions, background/resume, keyboard and safe areas, orientation/window resizing, offline relaunch and cache updates. Record physical-device frames with Safari's profiler. Test VoiceOver/TalkBack and OS text settings. This prototype's explicit large-text fixture scales body/labels to 200%, large display type to 135%, and navigation labels to 17px; it is not a claim of blanket WCAG or native Dynamic Type compliance.

Real camera/POS/CRM/payment integration needs separate acceptance testing. The prototype is browser-based with bounded DOM snapshots, not a native retained-screen application. “Bulletproof” remains an acceptance target, not a device/integration certification.

Final results: 60/60 normal navigation, 60/60 reduced motion, 673/673 page matrix and 47/47 glass checks. Page matrix covers 33 routes × five fixtures with render, width, text overflow and action-binding checks, plus geometry and modal checks. Tests measure action binding, not every business outcome.


## v17 promotion pass
Banner scrolling updates indicator transforms without page state updates. The iPhone modal animates its own translate/opacity and a separate shade opacity layer, avoiding a scaling card nested inside a full-screen opacity group. No background-color animation, layout animation or persistent card will-change. Reduced motion bypasses transitions. Normal and reduced navigation each passed 60 assertions; 18 new promotion/link assertions also passed. Desktop timing is not a device FPS certification.
