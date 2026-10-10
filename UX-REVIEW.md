# UX review — v19

Implemented improvements:

- Local sibling sections have a clear selected state, directional tap/swipe motion, stable headings and independent scroll. Warranty and voucher views use this behavior; ordinary filters do not slide the page.
- Rapid input and interrupted gestures do not remove newer animation layers. A cancelled swipe returns to its original section. Left-edge Back and vertical scrolling win their respective gestures.
- Returning from details restores the selected section and its scroll. Active bottom-tab selection animates back to the root, then a second tap scrolls to top.
- Scroll-stop taps in section content are blocked from activating cards. Section tabs and bottom tabs remain directly responsive.
- Keyboard arrows, Home/End and tab/panel semantics support an alternative to swiping. Reduced motion avoids the tap/settle animations.
- Lighter navigation glass has conservative contrast checks, a softer shadow and solid accessibility alternatives. Selected pills do not add another blur layer. Content cards remain plain surfaces, following Apple's guidance against glass-on-glass and glass content tables.
- The expired iPad purchase-window action and Home reminder no longer lead testers into an unavailable action.

Practical limits:

This is a prototype using illustrative membership, receipt, coverage and product data. Those values are not a live eligibility or warranty service. The Liquid Glass appearance is a CSS approximation; native refraction, system adaptation, physical iPhone frame rate and real VoiceOver navigation require device validation. Automated layout checks cover 33 routes across five phone/tablet/text-size fixtures.

Sources: [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/).
