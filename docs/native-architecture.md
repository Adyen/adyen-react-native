# Native architecture

Each platform has one serialized checkout coordinator. The iOS coordinator runs on its main-actor
boundary; Android uses a main-thread/mutex state machine. The coordinator owns the active checkout,
presenter registrations, operation slot, request broker, native UI, launchers, redirects, and
cleanup.

The generated Checkout TurboModule exposes setup, target queries, headless submit, Drop-in start,
correlated callback responses, and invalidation. Generated Action and CSE modules remain independent
from checkout state. Fabric is used for embedded components.

Every suspended native callback has checkout, operation, request, and kind identity. Native accepts
only a full match, so duplicate, late, forged, wrong-kind, and replacement-era responses cannot
settle current work. Native cleanup settles pending requests exactly once even if JavaScript no
longer has listeners.

Embedded registrations use canonical keys: exact regular payment-method type and exact stored ID.
Registrations are not routed by map order or an inferred initiating view. A future exact regular
subtype/funding-source key remains intentionally unsupported until the published native APIs accept
it.

Android session Drop-in uses the official v6 `DropIn.start(..., CheckoutContext)` path. Android
advanced Drop-in and iOS Drop-in reject before UI as documented in
[FeatureSupport.md](./FeatureSupport.md). No retired bridge or service path is used.
