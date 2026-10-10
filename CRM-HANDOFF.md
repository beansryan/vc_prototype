# CRM handoff

ValueClub is Challenger's relationship app: identify, reward, engage and convert. Keep Home / Rewards / Account, the detached Scan action and current Home module order. Personalise content within modules. Avoid further container nesting; use plain rows for secondary information.

The audience controls are local fixtures, not a live Braze integration. Production home_hero inventory requires campaign_id, vendor_id, audience, fallback audience, priority, start/end timestamps, session/user frequency cap and deep-link destination. Limit to three consistent-aspect-ratio placements, manual swipe only. Count viewable impressions only after a defined visibility/dwell threshold (recommended 50% for one second); deduplicate per campaign/session, record clicks and attribute downstream conversion separately. Coordinate hero, Inbox and IAM allocation so the same campaign is not duplicated by default.

Service/account messages outrank campaigns. No marketing interruptions during Scan, receipt recovery, checkout, payment failure or authentication. Maximum one disruptive marketing IAM per session. Apply opted-in channels, Singapore quiet hours (22:00–08:00), campaign deduplication, eligibility, expiry and frequency caps before rendering. These server-side targeting, cap, analytics and scheduling rules are handoff requirements; this browser-only prototype has no production CRM backend.

Coming Up supports warranty deadlines, order shipment/collection, Spend Reward cashback expiry, renewal, voucher expiry, saved launch and streak fixtures. Keep its position fixed. Launch and streak entries are demo scenarios, not inferred account events.

Adapt React Native layouts to available width and posture, not model name: compact single column with bottom navigation and Scan; medium useful two-column content; expanded persistent navigation and list/detail with max content widths. Validate resized iPad windows as well as full-screen tablets. Use iOS 44pt / Android 48dp hit targets, semantic type and 200% text QA. The Large Text fixture uses 200% body/label text with reflow, conservative 135% display type and 17px navigation labels. Screen geometry is not zoomed. Browser page-matrix checks cover the explicit fixture; physical OS text settings, VoiceOver/TalkBack and production accessibility acceptance remain required.

The imported campaigns and dates are prototype data from the supplied source, including concept products. Do not treat these as current retail inventory or a live campaign calendar.

Scan success may show only a known current usable balance. Post-payment cashback projections require actual POS eligible spend and that member’s daily Spend Reward eligibility. Spend Reward is once per member per day. Never infer eligibility from the generic cashback-earned flag. Member QR fallback is for camera/permission failures only; backend outages require retry/manual receipt recovery.
