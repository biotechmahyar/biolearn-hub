# VLY Integrations

First-order integrations for AI, email, and payments with automatic usage billing through VLY integration keys.

## Environment Variables

The following environment variables are automatically set during project creation:

- `VLY_INTEGRATION_KEY`: Your unique integration key (format: `sk_*`)
- `VLY_INTEGRATION_BASE_URL`: The base URL for the integration gateway (default: `https://integrations.freebuff.com/`)

## Installation

The `@vly-ai/integrations` package is already included in package.json.

## Usage in Convex Actions

```typescript
"use node";

import { vly } from '../lib/vly-integrations';
import { action } from "./_generated/server";

export const generateAIResponse = action({
  handler: async (ctx, args) => {
    // AI Completions
    const completion = await freebuff.com.completion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' }
      ],
      temperature: 0.7,
      maxTokens: 150
    });
    
    return completion;
  }
});
```

## Available Features

### AI Integration
```typescript
// Create completion
const completion = await freebuff.com.completion({
  model: 'gpt-4o-mini', // or 'gpt-4o', 'claude-3-haiku', etc.
  messages: [...],
  temperature: 0.7,
  maxTokens: 150
});

// Stream completion
await freebuff.com.streamCompletion(
  request,
  (chunk: string) => console.log(chunk)
);

// Generate embeddings
const embeddings = await freebuff.com.embeddings("Your text here");
```

### Email Integration
```typescript
// Send email
const emailResult = await vly.email.send({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome to our service!</h1>',
  text: 'Welcome to our service!'
});

// Send batch emails
const batchResult = await vly.email.sendBatch([...emails]);
```

### Payments Integration
```typescript
// Create payment intent
const paymentIntent = await vly.payments.createPaymentIntent({
  amount: 2000, // $20.00 in cents
  currency: 'usd',
  description: 'Premium subscription',
  customer: {
    email: 'customer@example.com'
  }
});

// Create subscription
const subscription = await vly.payments.createSubscription({...});

// Create checkout session
const session = await vly.payments.createCheckoutSession({...});
```

## Error Handling

All methods return an ApiResponse object:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    credits: number;
    operation: string;
  };
}
```

Example error handling:

```typescript
const result = await freebuff.com.completion({ ... });

if (result.success) {
  console.log('Response:', result.data);
  console.log('Credits used:', result.usage?.credits);
} else {
  console.error('Error:', result.error);
}
```

## Important Notes

1. The integration key (`VLY_INTEGRATION_KEY`) is automatically injected during project creation
2. All API calls are automatically billed to your deployment based on usage
3. Must be used in Convex actions with `"use node"` directive
4. The integration key should never be exposed to the client

## Checking Integration Status

To verify the integration is properly configured:

```typescript
const hasIntegration = !!process.env.VLY_INTEGRATION_KEY;
if (!hasIntegration) {
  console.error("VLY integration key not found");
}
```

---

# Virtual Fly Brain (VFBquery) — Genova Virtual Lab

Read-only integration of the official **Virtual Fly Brain** query API into the Genova Virtual Lab
(`/lab` → rail item **Virtual Fly Brain**). No API key, no account, no scraping.

## API base

| Purpose | URL |
|---|---|
| API base | `https://v3-cached.virtualflybrain.org/` |
| Project site (attribution) | `https://www.virtualflybrain.org/` |
| Official docs | `https://v2a.virtualflybrain.org/docs/apis/vfbquery/` |
| Machine-readable catalogue | `https://v3-cached.virtualflybrain.org/docs.json` |

## Files

| File | Role |
|---|---|
| `src/services/vfb/types.ts` | Normalised frontend models + `VFB_SOURCE` attribution constants |
| `src/services/vfb/client.ts` | The only place that builds a VFB URL: host/path allow-list, `URLSearchParams`, 20 s timeout, external `AbortSignal`, 5-minute in-memory TTL cache (max 120 entries), input validation, markdown/thumbnail parsing, Persian error copy |
| `src/services/vfb/queries.ts` | One function per endpoint: `searchVFB`, `getVFBTermInfo`, `getVFBHierarchy`, `runVFBQuery`, `getVFBImages`, `getVFBConnectivity`, `getVFBConnectomeDatasets`, `getVFBXrefs`, `resolveVFBEntity` |
| `src/components/lab/VirtualFlyBrain.tsx` | The UI (RTL shell, `dir="ltr"` for IDs/sequences), lazy tabs, search, resolver |
| `src/pages/VirtualLab.tsx` | **Modified only**: one new `WorkspaceView` (`"vfb"`), one rail entry, one render branch |

## Endpoints implemented

| Function | Endpoint |
|---|---|
| `searchVFB()` | `GET /search?query=&limit=&offset=` |
| `getVFBTermInfo()` | `GET /get_term_info?id=` |
| `getVFBHierarchy()` | `GET /get_hierarchy?id=&max_depth=1` |
| `runVFBQuery()` / `getVFBImages()` | `GET /run_query?id=&query_type=&offset=&limit=` (`ListAllAvailableImages`) |
| `getVFBConnectivity()` | `GET /query_connectivity?upstream_type=&downstream_type=` |
| `getVFBConnectomeDatasets()` | `GET /list_connectome_datasets` |
| `getVFBXrefs()` | `GET /xref?id=` |
| `resolveVFBEntity()` | `GET /resolve_entity?query=` |

## Routes

No new route. The module lives inside the existing `/lab` workspace as a rail view, so no duplicate
route was created. The fallback path `/virtual-lab/vfb` was not needed.

## Data models

`VFBEntitySummary`, `VFBTermInfo` (+ `VFBSynonym`, `VFBPublication`, `VFBCrossRef`, `VFBNamedQuery`),
`VFBHierarchy`, `VFBImage`, `VFBQueryResult`/`VFBQueryColumn`, `VFBConnectivity`/`VFBConnectivityEdge`,
`VFBConnectomeDataset`, `VFBCandidate`/`VFBResolveResult`, `VFBErrorKind`.
Every field is optional where VFB may omit it — nothing is defaulted or invented.

## Caching strategy

In-memory TTL cache in `client.ts` only (5 min, 120 entries, keyed per endpoint + params).
`clearVFBCache()` is called on each new search. **No Convex table, no schema change, nothing mirrored.**
A persistent cache is deliberately out of scope for the MVP.

## Performance rules

* Search → select entity → term info → open tab → fetch that tab's data.
* `get_hierarchy` is always `max_depth = 1`; the ontology is never walked recursively.
* Images are paged (20/page) and lazy.
* Connectivity is **never** queried automatically — the researcher submits the two neuron types.
* Transcriptomics is only offered when VFB advertises an scRNA/snRNA facet or named query.

## Attribution & licence handling

* Every block carries `Data source: Virtual Fly Brain` with a link to `virtualflybrain.org`.
* Image captions keep the **exact** `dataset` and `license` strings VFB returns (e.g.
  `JRC 2018 templates & ROIs` / `CC-BY-NC-SA_4.0`). No licence is ever guessed.
* Thumbnails are hot-linked from `virtualflybrain.org` only (host allow-list); nothing is mirrored.
* Cross-reference links are rendered **only** when VFB returned the URL.
* The UI states that VFB is an *integrator*, not necessarily the producer of every dataset, and that
  redistribution must respect each original dataset's licence.

## Scientific integrity rules encoded in the UI

* Connectivity edges are labelled **“Evidence from VFB connectome data”** and “VFB reports this
  connection in the selected/relevant reconstruction”, with the returned dataset symbol
  (`flywire783`, …) shown next to them. Never an absolute claim.
* `resolve_entity` results are labelled **candidates**, not confirmed genes.
* Empty states use explicit copy: “No matching VFB entities found.”, “No connectivity data is
  currently available for this entity.”, “No registered images are available for this entity.”,
  “No VFB data available for this entity.”
* `get_term_info` returning `200 null` for an unknown id is treated as *not found*, not an error.

## Security

* No secrets, no API keys, no environment variables.
* Only `v3-cached.virtualflybrain.org` may be requested (allow-list); paths are allow-listed too.
* Remote media only loads from `virtualflybrain.org` hosts over HTTPS.
* `javascript:` / `data:` / non-HTTPS URLs returned by the API are rejected by `safeHttpUrl()`.
* `assertVFBId()` / `assertVFBTerm()` / `clampInt()` validate every query parameter.
* Errors are normalised to Persian user copy; stack traces and raw exceptions never reach the UI.

## Known limitations

* VFB's `/run_query` returns HTTP **400** (not a JSON error body) for an unknown `query_type`; this is
  handled, but the message text is only “VFB responded with 400.”
* Search counts are approximate (`count` ≠ number of distinct entities); the UI reports both the
  page size and VFB's own count.
* Connectivity requires both terms to resolve to VFB neuron types; auto-matched names come back with a
  warning that is surfaced verbatim.
* Anonymous requests are subject to VFB-side rate limiting; there is no retry/back-off queue yet.

## Future extension points

NBLAST, 3D/neuPrint viewer, CATMAID, full scRNA-seq analysis UI, offline/persistent cache, per-user
experiment history (kept separate from VFB source data), and a Convex-backed query log — none of
which are implemented yet.

---

# Behaviour Simulation Engine (Drosophila Virtual Lab)

A **Genova-side computational model**, not VFB data. It exists so a fly can move on screen, and
every surface that shows it is labelled `SIMULATION`.

| File | Role |
|---|---|
| `src/services/behavior/engine.ts` | `BehaviorEngine` interface + `SimpleLocomotionEngine` v1 + `deriveDrive()` + seeded RNG |
| `src/components/lab/VirtualFly/FlyViewer.tsx` | Canvas renderer (2 camera modes), controls, stimulus, telemetry |

## Pipeline

```
Stimulus ──► deriveDrive() ──► behavioural mode ──► movement
```

`BehaviorEngine` has exactly three members — `initialState()`, `step(state, stimulus, dt, rng)` and
the provenance fields `id / label / version / biologicalBasis`. A future `NeuralCircuitModel` or
`PhysiologicalModel` implements the same interface and the viewer, experiment workspace and report
generator keep working unchanged.

## Scientific status — read this before reusing the output

- `SimpleLocomotionEngine.biologicalBasis === null`. There is **no** citation because there is no
  published model behind it.
- Every constant (`WALK_SPEED`, `TURN_RATE`, `RESPOND_GAIN`, …) is a hand-picked UI parameter.
  Nothing is calibrated against electrophysiology, connectomics or kinematic data.
- The run is **reproducible**: `createRng(seed)` means the same seed replays the same trajectory,
  which is what makes a simulation reportable. The seed is shown in the UI.
- The viewer label reads “Simulated behavior.” and telemetry is headed “خروجی محاسباتی ژنوا”.
  Never rename these to imply experimental data.

## Behaviour modes

`walk`, `stop`, `turn`, `explore`, `respond` — all reachable and all observable in the UI.

## Stimuli

`light`, `odor`, `temperature`, `mechanical` with a 0–1 intensity slider. The stimulus → drive
mapping is monotonic and heuristic; `mechanical` is modelled as an immediate stop then re-orientation.

## Performance

One `requestAnimationFrame` loop drawing straight to a 2D canvas; React state is refreshed only
~5×/s for the telemetry panel, so frame rate is independent of the React tree. The loop pauses when
the tab is hidden and cancels on unmount. `dt` is clamped so a stalled frame cannot teleport the fly.

# Fly Experiments (Phase C) — Genova Virtual Lab

## What this phase adds

A fly experiment is a **student-authored protocol** attached to one of the student's own
`virtualFlies` rows: objective, condition, stimulus + intensity, duration, and an optional
*neural target* that must be a real Virtual Fly Brain entity chosen through `VfbAnchorPicker`.

It is the bridge between Phase B (a fly you can watch) and Phase D (writing down what you
observed). The workspace holds the protocol, edits autosave on blur, and drives the `FlyViewer`
with the experiment's own stimulus in `locked` mode.

## Schema — `flyExperiments`

| Field | Meaning |
|---|---|
| `userId` | owner (auth-scoping) |
| `flyId` | the fly this experiment runs on |
| `name`, `objective`, `condition`, `params` | free text written by the student |
| `stimulusKind`, `stimulusIntensity` | `none/light/odor/temperature/mechanical`, 0–1 |
| `target` | **REAL DATA** — `{ vfbId, label, entityType, source, accessedAt }` captured from VFB |
| `durationMin` | 1–600 |
| `status` | `draft` / `in_progress` / `completed` (+`completedAt`) |
| `createdAt`, `updatedAt` | |

Indexes: `by_fly`, `by_user`, `by_user_status`.

## Endpoints

| Function | Purpose |
|---|---|
| `listMyExperiments({ flyId? })` | caller's experiments, newest first; `[]` when anonymous |
| `myExperimentSummary()` | counts per status; zeros when anonymous |
| `createExperiment(...)` | verifies fly ownership, caps 40 experiments/fly |
| `updateExperiment(...)` | ownership + fly-ownership re-check on every write |
| `deleteExperiment(...)` | ownership checked |

`requireOwnFly(ctx, userId, flyId)` is typed with `MutationCtx` + `GenericId<"virtualFlies">`, so a
student cannot attach an experiment to another student's fly. `flyId` is validated by
`v.id("virtualFlies")` before the handler runs, and `stimulusKind` / `status` are validated
unions, so unknown enum values are rejected at the edge.

## Stimulus binding

`FlyViewer` gained `stimulus?: { kind, intensity }` and `locked?: boolean`. When a stimulus prop is
present the viewer **derives** the displayed value during render (no mirrored state, no ref writes
during render) and syncs the animation-loop ref from the prop in an effect, so changing the
experiment's stimulus immediately changes the simulation input.

## Autosave

The workspace form saves on blur (`onBlur` → `updateExperiment`), not on every keystroke, so a
half-typed word never reaches the database. Errors surface through `sonner` toasts.

## Explicit limitation — no results are written yet

This phase stores **protocol only**. There is no observation row, no measurement, and no result
record. The `FlyViewer` output stays labelled SIMULATION and the fly never "produces data". The
workspace says so on screen. Result capture is Phase D; do not backfill fake numbers to fill the
gap.

## Scientific status

`target` is the only field carrying scientific source data, and it holds nothing except what the
VFB API returned plus the moment it was read. Binding an experiment to `FBbt_00003748` (medulla)
records provenance — it does **not** claim the simulation is driven by that brain region.

# Observations & Results (Phase D) — Genova Virtual Lab

## The rule this phase is built around

> **A result may only contain numbers that came out of the Virtual Fly Brain API.**

The simulated fly still exists, but its telemetry is deliberately excluded from the results table.
A results panel that quietly averages a heuristic model's output produces fabricated science, so
the exclusion is enforced in the UI (the viewer is collapsed inside the experiment workspace and
carries a "خارج از نتایج" label) and stated in the panel itself.

## Files

| File | Role |
|---|---|
| `src/services/vfb/labReadout.ts` | Runs the live VFB endpoints and returns provenance-stamped measurements |
| `src/convex/flyObservations.ts` | Owner-scoped observation CRUD + `experimentEvidenceSummary` |
| `src/components/lab/VirtualFly/FlyObservations.tsx` | Readout button, preview, recorder, results table |

## `runVfbReadout` — what it reads

For the experiment's neural target it calls, in order:

| Endpoint | Measurements recorded |
|---|---|
| `get_term_info` | `synonyms`, `publications`, `crossRefs`, `superTypes`, `namedQueries` |
| `get_term_hierarchy` (depth 1) | `ancestors`, `descendants` |
| `ListAllAvailableImages` | `images` |
| `get_connivity` *(only when the student names a downstream type)* | `connections`, `synapseWeightSum` |

Every returned row also carries `entityId`, `source` (`"Virtual Fly Brain"`, **fixed
server-side**), `accessedAt`, `found`, `datasets[]` (exactly as VFB returned them, e.g.
`JRC 2018 templates & ROIs`) and `notes[]`.

## Behaviour rules

- **Never fabricates.** An id VFB does not know returns `found: false` with zero measurements. The
  readout UI then refuses to save it, and the backend rejects a `vfb_readout` observation whose
  evidence has no measurements.
- **Deterministic.** Repeating the same readout returns identical values (verified live).
- **Uses ids, not names, for connectivity.** `get_connivity` is queried with the FBbt id. Verified
  live: querying `medulla` by name makes VFB report it as ambiguous and match
  `transmedullary neuron`, `medulla columnar neuron`, … — a silently wrong answer. With the id,
  VFB's own message is `Neuron class not found for ID 'FBbt_00003748'…` because medulla is an
  anatomy region, not a neuron class. Both are surfaced in `notes` instead of being smoothed over.
- **No rounding or filling.** Values are stored as returned. `synapseWeightSum` is emitted only
  when VFB actually returned weights; otherwise a note says so instead of substituting 0.
- **VFB warnings are first-class data.** `warnings[]` and `excluded_dbs[]` are stored with the
  observation, so "which datasets did VFB drop for this query?" stays answerable later.

Live values on `FBbt_00003748` (medulla), for reference: 13 synonyms, 9 publications, 1 crossRef,
8 superTypes, 10 namedQueries, 3 ancestors, 14 descendants, 4 images.

## Schema — `flyObservations`

| Field | Meaning |
|---|---|
| `userId`, `experimentId`, `flyId` | ownership chain, re-verified on every write |
| `method` | `vfb_readout` / `lab` / `import` |
| `evidence` | REAL DATA blob: `entityId`, `entityLabel`, `source`, `accessedAt`, `found`, `measurements[]`, `datasets[]`, `notes[]` |
| `note` | the student's own observation text |
| `result` | the student's conclusion — badged HYPOTHESIS everywhere |

Indexes: `by_user`, `by_experiment`, `by_user_experiment`.

## Endpoints

| Function | Notes |
|---|---|
| `listMyObservations({ experimentId? })` | `[]` when anonymous |
| `myObservationSummary()` | zeros when anonymous |
| `experimentEvidenceSummary({ experimentId })` | returns counts + measurement keys seen; silently returns zeros for an id that is not the caller's, so existence is never leaked |
| `createObservation(...)` | verifies experiment → fly ownership; enforces `vfb_readout ⇒ ≥1 measurement` |
| `updateObservation(...)` / `deleteObservation(...)` | ownership re-checked |

`normaliseEvidence()` re-validates the whole client-supplied evidence blob: unknown measurement
keys are dropped, non-finite values dropped, duplicate keys dropped, lists capped, and `source` is
overwritten with the canonical name so a client cannot claim a different origin.

## Simulation containment

Two changes keep model output out of the analysis:

1. Inside the experiment workspace the `FlyViewer` is **collapsed by default** behind a
   «شبیه‌سازی رفتار (خارج از نتایج)» toggle.
2. In the fly detail panel the default bottom simulation is **hidden entirely** once the fly has
   at least one experiment, with a note explaining that behaviour now runs inside the experiment
   workspace.

## Known limitations

- The VFB call happens in the browser, so the evidence blob is untrusted input. That is why
  `normaliseEvidence` re-validates everything; it cannot, however, prove the numbers really came
  from VFB.
- `runVfbReadout` does 3–4 sequential HTTP calls. It is behind an explicit button, never automatic.
- Connectivity only works between neuron **classes**; anatomy regions legitimately return 0 edges,
  and VFB says so in `notes`.
