# Lin Ride

Lin Ride is a mobile-first web app and PWA for local rides, shared rides, courier work, errands, shopping pickup, school runs, moving help, urgent pickup, and business delivery across Linstead and nearby Jamaican communities.

Passenger slogan: **Local rides. Better experience.**

Driver slogan: **Keep your fare. Pay one weekly pass.**

## Business Model

- Passengers pay drivers directly by cash or transfer.
- Lin Ride does not take a commission from passenger fares.
- Drivers keep 100% of passenger fares.
- An eligible driver pays a J$2,000 weekly pass.
- There is no automated payment processor in this MVP.
- Weekly pass payments use a reference number and manually reviewed proof.
- Passenger reward points and driver platform payouts are separate balances.

## Stack

- Next.js 14, React 18, and TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, Storage, Realtime, and RLS
- MapLibre GL JS
- Geoapify autocomplete, reverse geocoding, tiles, and road routing
- Installable PWA shell with an offline fallback

## Run Locally

Requirements: Node.js 20 or newer and npm.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

For a production check:

```powershell
npm run lint
npm run build
npm run start
```

## Environment

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GEOAPIFY_API_KEY=
GEOAPIFY_API_KEY=
NEXT_PUBLIC_DRIVER_VERIFICATION_FORM_URL=
NEXT_PUBLIC_APP_MODE=backend
MAP_PROVIDER=geoapify
DATABASE_URL=
```

Use either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Keep `GEOAPIFY_API_KEY` and `DATABASE_URL` server-side. Never prefix a database password or service-role key with `NEXT_PUBLIC_`.

The app uses backend mode when the Supabase URL and browser key are present. It falls back to local preview data when they are missing or when `NEXT_PUBLIC_APP_MODE=mock`.

Restrict the browser Geoapify key to the Lin Ride domains before deployment. The server route API prefers `GEOAPIFY_API_KEY` and temporarily caches identical routes for five minutes.

## Database Setup

Run every SQL file in `supabase/` in numeric order. Existing migrations are additive and should not be rewritten after deployment.

```powershell
$env:DATABASE_URL='your-session-pooler-or-direct-connection-string'
Get-ChildItem supabase/*.sql | Sort-Object Name | ForEach-Object {
  node scripts/run-migration.mjs $_.FullName
}
node scripts/db-audit.mjs
```

Migrations `001` through `008` establish the original accounts, rides, maps, storage, profile-photo, and security model. Migrations `009` through `023` finish the testing MVP:

- `009_finish_mvp_trip_delivery_support.sql`
- `010_points_withdrawals_admin_audit.sql`
- `011_storage_privacy_signed_urls.sql`
- `012_document_reuploads_rating_security.sql`
- `013_business_delivery_rls.sql`
- `014_business_delivery_earnings.sql`
- `015_ride_request_details.sql`
- `016_points_bonus_rules.sql`
- `017_realtime_participant_security.sql`
- `018_business_counter_offer_acceptance.sql`
- `019_business_driver_visibility.sql`
- `020_business_offer_driver_visibility.sql`
- `021_ride_request_cancellation_offer_decline.sql`
- `022_driver_location_last_seen.sql`
- `023_legacy_service_table_rls.sql`

The audit checks required tables, RPCs, Realtime publication, RLS, critical columns, and private storage buckets. It exits with a failure when the deployed database is incomplete.

## Admin Setup

1. Sign up through the app with the intended admin email.
2. Promote that existing account from a trusted terminal:

```powershell
$env:DATABASE_URL='your-server-only-database-connection-string'
node scripts/promote-admin.mjs admin@example.com
```

3. Sign out and sign in again.

Admin access is checked from `profiles.role`. A non-admin opening the admin view sees exactly `Access denied.`

## Completed Workflows

### Passenger

- Profile photo requirement for real passenger and driver accounts
- Jamaica-only location autocomplete biased toward Linstead
- Current high-accuracy GPS, accuracy feedback, confirmation for suspicious results, draggable pins, and manual map pins
- Geoapify road distance, kilometres, miles, duration, and road geometry
- Ride, shared ride, delivery, courier, errand, shopping, school, moving, town-to-town, urgent, and business-delivery service choices
- Landmark notes, country directions, schedule time, rough road, heavy/fragile items, nearby call, extra stop, and return trip
- Local fare-zone suggestion with optional boosts and passenger-entered fare
- Realtime driver accept/counter offers with driver photo, name, vehicle, plate, fare, choose, and decline controls
- Persistent request cancellation before selection
- Accepted trip status, driver phone, driver ID, plate, PIN, and WhatsApp sharing
- Pre-start cancellation, issue report, completed-trip rating, and reward badges
- Backend points wallet, point history, bank withdrawal requests, and trip history
- Support tickets and status history

### Driver

- Account, required-document, profile-photo, and active-pass eligibility gates
- Google Form verification handoff and manual admin approval state
- J$2,000 weekly pass agreement, payment method, reference, proof upload, and admin review
- Live GPS begins only after the eligible driver taps Online
- `watchPosition` publishes real latitude, longitude, heading, speed, accuracy, and heartbeat with throttling
- Going offline, losing GPS permission, unmounting, or leaving driver mode stops the watcher and marks the driver offline
- Nearby requests, accept, counter, ignore, business delivery accept/counter/ignore, and active jobs
- Ordered trip lifecycle: accepted, driving to pickup, arrived, PIN verification, in progress, completed, or cancelled
- Optional trip or delivery proof photo
- Rider rating, trip report, earnings/history, platform-payout withdrawal, and support

### Business

- Business signup and pending approval lock
- Delivery request fields for pickup business, addresses, customer contact, package, offer, cash collection, and notes
- Exact search action: `We a search fi a driver`
- Realtime driver counter offers with business acceptance
- Assigned driver photo, name, phone, vehicle, and plate
- Realtime delivery progress and history
- Cancellation, issue report, and support

### Admin

- Protected dashboard with refresh, loading, and empty states
- Compact driver accounts with approval, document, pass, payment due, active/inactive, suspend, and unsuspend controls
- Private signed previews for current driver documents and weekly payment proofs
- Driver, document, payment, business, delivery, trip, support, withdrawal, report, and points-rule actions
- Live driver location records, ride requests, ratings, and business deliveries
- Passenger and driver withdrawal review through approved, rejected, and paid states
- Support notes and report resolution
- Immutable admin audit log records for privileged workflows

## Security Notes

- RLS is enabled on application tables.
- Ride, trip, offer, profile, driver, business, support, report, wallet, and withdrawal visibility is participant or admin scoped.
- Driver request visibility and live publishing require approved account, approved documents, and a current weekly pass.
- Driver document, pass proof, and trip proof buckets are private.
- Admin previews use short-lived signed URLs.
- Public profile photos contain only the identity image that matched participants need to see.
- Acceptance and lifecycle transitions use guarded Postgres functions to prevent double acceptance or out-of-order status changes.
- Raw database messages are mapped to friendly user-facing errors in normal workflows.

## PWA And GPS

The production build registers `public/sw.js`. It caches the app shell and provides `public/offline.html` when navigation is offline. Live requests, location, offers, and status changes still require a network connection.

Browser GPS runs only while the page is open. This web MVP does not claim native background tracking after the browser or installed PWA is closed. A driver marker moves only when that driver's device is online and publishing recent live coordinates; the app does not simulate movement in backend mode.

## Google Driver Verification

Set `NEXT_PUBLIC_DRIVER_VERIFICATION_FORM_URL` to the published Google Form URL. The driver opens that form, uploads the requested documents, returns to Lin Ride, and taps `I submitted the Google Form`.

Google Forms does not automatically write its file records into Supabase in this MVP. An admin must compare the form response with the Lin Ride driver account and approve or reject the driver's document state manually. Once approved, the upload section disappears from that driver's dashboard.

## Manual Test Checklist

### Admin

- [ ] Create a normal account, promote it with `scripts/promote-admin.mjs`, sign out, and sign in as admin.
- [ ] Confirm a non-admin sees only `Access denied.` in the admin view.
- [ ] Approve, reject, suspend, and unsuspend a driver.
- [ ] Review current driver documents through signed preview links.
- [ ] Approve and reject documents with a reason; confirm the aggregate document state changes.
- [ ] Review weekly pass proof; approve it and confirm seven active days are created or extended.
- [ ] Reject a pass payment with a reason and confirm the driver remains blocked.
- [ ] Approve, reject, suspend, and restore a business account.
- [ ] Review ride requests, trips, live drivers, deliveries, reports, and ratings.
- [ ] Update a support ticket status and admin note.
- [ ] Approve, reject, and mark passenger and driver withdrawals paid.
- [ ] Change points rules and reload to confirm persistence.
- [ ] Review admin audit log entries for privileged actions.

### Driver

- [ ] Sign up as a driver and upload a profile photo.
- [ ] Confirm Online is blocked while account approval, required documents, or weekly pass is missing.
- [ ] Submit the Google verification form and mark it submitted.
- [ ] Confirm pending and rejected document messages, then confirm the card disappears after approval.
- [ ] Accept the weekly pass agreement.
- [ ] Submit bank transfer, Lynk, or cash-to-admin proof and confirm pending state.
- [ ] Confirm requests remain blocked until admin approves the pass.
- [ ] Tap Online, allow GPS, and confirm a fresh `driver_locations` heartbeat appears.
- [ ] Deny GPS and confirm the app returns the driver to Offline.
- [ ] Receive a nearby passenger request; accept, counter, and ignore separate test requests.
- [ ] Receive a business delivery; accept, counter, and ignore separate test deliveries.
- [ ] Progress a trip through driving, arrived, PIN, in progress, and completed.
- [ ] Enter a wrong PIN and confirm it is rejected.
- [ ] Upload proof where relevant, cancel a test trip with a reason, and complete another trip.
- [ ] Rate the passenger, report a trip, review earnings/history, create a withdrawal, and open support.

### Passenger

- [ ] Sign up as a passenger and upload a profile photo.
- [ ] Search a Jamaica address and select a result.
- [ ] Use current location and confirm the GPS accuracy message and pickup pin.
- [ ] Drag pickup and destination pins and confirm the road route recalculates.
- [ ] Add fare, service, schedule, landmarks, and country-trip options.
- [ ] Submit a request and confirm eligible nearby drivers receive it.
- [ ] Cancel a pending request and confirm it stays cancelled after reload.
- [ ] Receive multiple accepts/counters, decline one, and choose another driver.
- [ ] Confirm driver photo, name, phone, ID, vehicle, and plate appear only after matching.
- [ ] View the PIN and follow Realtime status updates through completion.
- [ ] Share the trip with WhatsApp, rate the driver, report an issue, and open support.
- [ ] Confirm points are awarded once and submit a bank withdrawal request above the configured minimum.

### Business

- [ ] Sign up as a business and confirm the delivery form is locked pending approval.
- [ ] Approve the business as admin and reload.
- [ ] Create a delivery and confirm the button reads `We a search fi a driver`.
- [ ] Receive and accept a driver counter offer.
- [ ] Confirm assigned driver details and live status updates.
- [ ] Complete and cancel separate deliveries, verify history, report an issue, and open support.

### Security And PWA

- [ ] Run `node scripts/db-audit.mjs` with the server-only database URL and get `AUDIT_OK`.
- [ ] Confirm a driver without an active pass cannot read pending requests or publish an online location.
- [ ] Confirm a normal user cannot read another driver's private documents or payment proof.
- [ ] Confirm unauthorized trip, offer, business delivery, report, and withdrawal updates are blocked by RLS/RPC rules.
- [ ] Build and run production mode, install the PWA, then confirm the offline shell opens without a network.
- [ ] Test passenger, driver, business, and admin layouts at 360 px and desktop widths.

## MVP Limitations

- Payments are manually verified; no card, bank, Lynk, or cash processor is connected.
- The Google Form is a manual verification handoff and is not synchronized to Supabase automatically.
- GPS cannot continue after the browser or PWA is closed.
- Offline mode provides the app shell and previously cached assets, not offline booking or status mutation.
- Route caching is per running Next.js server instance, not a distributed cache.
- No native push notification, SMS, email, or WhatsApp messaging provider is connected.
- Shared rides are represented as a request type and corridor choice; automatic multi-passenger grouping is not part of this test MVP.
