# Motion audit — ValueClub v15

## Verified in the local in-app browser

The included regression runner exercises real AppLogic, Preact rendering and animation APIs. It uses scripted touch events for the edge/scroll conflict tests, rather than claiming physical touch-hardware validation. Reduced-motion tests substitute that media preference before the motion engine loads. Normal and reduced-motion runs each contain 48 assertions.

Observed behavior includes: 320ms transform-only page pushes; a real outgoing layer for 280ms button Back; previous scroll restored before the revealed frame; immediate tab content changes with no page snapshot cloning; tab-root reselect followed by scroll-to-top; nested purchase-list/detail restoration; completed, cancelled and vertical edge gestures; rapid push/pop cleanup; scroll-stop content suppression that excludes bottom navigation; Scan error states and member-QR fallback; no runtime exceptions; and no leftover transition layers after settling.

The held warranty-to-Home swipe was visually inspected against the reported screenshot. Warranty stays on a neutral light surface with readable ink, while Home is revealed at its saved position. The original blue layer leak is absent in that inspection. The Home hierarchy, branded header and persistent navigation were visually reviewed.

Navigation motion changes transform only; overlay fades change opacity, and sheet/dialog feedback uses transform. No document-wide View Transition overlays, transition-frame cloning, background sampling or full-page tab crossfades remain. Existing decorative waves no longer drift during route restoration. Entrance feedback is limited to explicit reward/Scan events instead of ordinary page remounts. A stack retains at most eight snapshots per cached root tab. This is still a browser prototype with bounded DOM snapshots at detail navigation boundaries, not a retained native screen implementation.

The rAF samples in TEST-RESULTS.json measure the local preview only, after the sampled route transition. They are not transition-frame profiling, a device FPS guarantee or an iPhone performance claim. The transform-property assertion establishes animation structure, not compositor scheduling on physical devices.

## Remaining physical-device acceptance checks

1. Run on the target iPhone, both in Safari and a freshly installed Home Screen app; repeat as an update over the older installation.
2. At top, mid-feed and near the end of Home/Rewards/Account, exercise button Back, completed/cancelled/diagonal edge Back and quick reverse-direction gestures.
3. Flick vertically, tap to stop inertia over a card, then tap again to activate. Switch bottom tabs during momentum and during an unfinished push.
4. Repeat first-open and warm laptop/detail navigation. Record frame timing using Safari's profiler; investigate sustained dropped frames or long tasks rather than relying on desktop feel.
5. Check status safe areas, theme changes, keyboard dismissal, resize/orientation, background/resume, offline relaunch and service-worker update behavior.
6. Verify VoiceOver/TalkBack, real 200% text, switch control and reduced motion from system settings. The source's Large Text demo is 130%; it is not a completed 200% accessibility audit.
7. Real camera/POS/CRM/payment integration requires its own acceptance testing; those systems are simulated in this ZIP.

The release corrects observed browser defects and records its tests; “bulletproof” is an acceptance target, not an assertion that every device or production integration has been validated.
