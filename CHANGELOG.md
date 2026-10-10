# ValueClub v15 — concise changelog

- Replaced the competing navigation/gesture engines with one motion owner; removed document-wide View Transitions and pixel-sampled background tinting.
- Fixed blue detail layers and Home header flashes with opaque page-local backgrounds, frozen colour variables and stationary system chrome.
- Fixed button Back skipping its slide when returning to a root page.
- Preserved detail/list scroll, each tab's route and scroll, and active-tab root-then-top behavior agreed in this chat.
- Removed tab drag/click suppression, full-screen tab crossfades and page-wide segment swipes; tabs now activate on one tap without cloning the page.
- Added direction/velocity-aware edge Back, cancellation and multi-touch cleanup, scoped scroll-stop protection and interruption cleanup.
- Tuned push/Back/indicator/sheet/reward timings; added explicit reduced-motion cleanup and idle image decoding.
- Restored the attached transparent Zenbook PNG.
- Applied Audit thoughts CRM refinements: same Home layout and Scan placement; audience fixtures, useful reminders, service-first Inbox, distinct cashback types with combined usable total, consent copy and member-since context.
- Added Scan success/failure QA controls and existing member-QR recovery. Scan completion no longer announces cashback before payment.
- Updated cache versioning, scoped cache cleanup to ValueClub and removed forced reloads during active interactions.

Source provenance: the accessible conversation attachment was valueclub-prototype_13.zip. The generated v14 ZIP and refined CRM HTML were mentioned in chat but not exposed as downloadable attachments. This build reconstructs their relevant changes from the conversation and attached assets, rather than claiming a direct v14/refined-file merge.

Validation: 48 normal-motion + 48 simulated reduced-motion browser checks, JavaScript syntax and asset checks, ZIP integrity, plus visual inspection of a held partial Back swipe. See TEST-RESULTS.json and MOTION-AUDIT.md. Physical iPhone Safari/PWA performance remains unverified.
