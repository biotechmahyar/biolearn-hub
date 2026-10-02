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

# Research Projects & Anchored Simulation (Phase E) — Genova Virtual Lab

## Anchored simulation — what "real" can honestly mean here

The fly viewer used to ignore everything the student configured. Phase E makes the
simulation actually consume their recorded VFB data, while keeping the three layers
strictly separate:

| Layer | What it is | Where |
|---|---|---|
| **REAL INPUT** | numbers VFB returned, stored with `entityId` + `accessedAt` in Phase D | `flyObservations.evidence` |
| **MODEL MAPPING** | how Genova turns that number into a movement gain — hand-picked constants | `src/services/behavior/profile.ts` |
| **OUTPUT** | movement on a canvas, permanently badged SIMULATION | `FlyViewer` |

`SimulationProfile.biologicalBasis` is still `null`. **No amount of real input makes
the movement biological** — the mapping is a declared heuristic, and the UI says so.

### Which real readouts may drive movement

Only **connectivity evidence for the target**:

- `connections` — edges VFB reports for target → the chosen downstream type
- `synapseWeightSum` — total synaptic weight VFB returned for those edges

Ontology counts (`synonyms`, `descendants`, `images`, …) are real but say nothing
about motor output, so they are deliberately **not** allowed to move the fly.
Verified by test: a profile built only from `descendants` + `images` returns
`anchored: false` and identity scales.

If no connectivity readout exists, the profile falls back to the Phase B defaults and
states that no neural readout is available. It never substitutes a plausible number.

### Declared model constants

```
WEIGHT_LOW  = 100          WEIGHT_HIGH = 100_000
driveGain   = 0.70 + 0.90 × norm(log10(synapseWeightSum))
turnRate    = 0.85 + 0.40 × norm(…)
```

These are Genova's own choice, surfaced in the UI under every `MODEL` badge. They are
not thresholds from any dataset and no dataset is cited, because none backs them.

## Engine change

`BehaviorEngine.step(state, stimulus, dt, rng, context?)` gained an optional fifth
argument. `context` is `{ driveGain, turnRate, respondGain }`, all `1` by default, so
omitting it reproduces the Phase B model **bit-for-bit** (verified: identical `x`,
`y` and `distance` over 3600 steps). The viewer holds the context in a ref so a profile
change never restarts the animation loop mid-run.

## Files

| File | Role |
|---|---|
| `src/services/behavior/profile.ts` | `buildProfile()`, `toRealMeasurements()`, `defaultProfile()` |
| `src/convex/flyProjects.ts` | project CRUD + count-only `projectSummary` |
| `src/components/lab/VirtualFly/FlyProjects.tsx` | project builder, list, project view |
| `FlyViewer.tsx` | new `profile` prop + `ModelProvenancePanel` |

## Schema

`flyProjects`: `userId`, `flyId`, `title`, `question`, `hypothesis`,
`status` (`draft|active|completed`), timestamps. Indexes `by_user`, `by_fly`,
`by_user_status`.

`flyExperiments.projectId: OPT(ID("flyProjects"))` + `by_project` index.

## Endpoints

| Function | Notes |
|---|---|
| `listMyProjects({ flyId? })` | `[]` when anonymous |
| `projectSummary({ projectId })` | **counts + measurement keys only**; zeros for an id that is not the caller's |
| `createProject(...)` | verifies fly ownership; caps 12 projects/fly; title + question + hypothesis all required |
| `updateProject(...)` | ownership re-checked |
| `deleteProject(...)` | detaches member experiments before deleting |
| `flyExperiments.updateExperiment({ projectId })` | project must belong to the caller **and the same fly** |

## Why there are no statistics

`projectSummary` returns counts and the measurement keys that were read. It does not
compute a p-value, a correlation, or "significant difference". With a handful of
student observations any such number would look rigorous and mean nothing, and the
panel says this on screen. Simulation telemetry stays excluded from every project
summary, exactly as in Phase D.

## Live verification

- no-context run identical to the default model (3600 steps)
- strong anchored profile (80 000 weights) → `driveGain` 1.571; weak (120) → 0.724
- anchored run travels 3.099 vs 1.407 arena units over 1800 steps
- ontology-only readouts → not anchored, identity scales
- newer observation supersedes an older one for the same key
- `biologicalBasis === null` in every profile

# Protein & Codon Tools — Genova Virtual Lab

Four new tools in a dedicated **پروتئین و کدون** group (violet accent), available in the
bioinformatics, genetics and microbiology research fields.

| Tool | Input | What it outputs |
|---|---|---|
| **ORF Finder** | DNA | ORF table (strand, frame, start, end, bp, aa, complete), length bar chart, per-ORF protein + nucleotide view, FASTA, TXT report |
| **DNA → Protein** | DNA + frame + strand | protein sequence, codon-by-codon table with Persian amino-acid names, TXT report |
| **Codon Analysis** | DNA + frame | codon usage table, GC1/GC2/GC3 chart, most-used codons chart, CpG ratio, homopolymer run, degenerate amino acids, CSV, save to lab notebook |
| **Back-translation** | protein + host | DNA, FASTA, chosen-codon table, GC chart, amino-acid composition, CSV, save to lab notebook |

## Files

| File | Role |
|---|---|
| `src/components/lab/proteinCore.ts` | pure sequence logic — genetic code, ORFs, translation, codon stats, back-translation |
| `src/components/lab/proteinUi.tsx` | shared shell, inputs, charts, tables, download/save buttons |
| `src/components/lab/OrfTranslateTools.tsx` | `OrfFinderTool`, `TranslateTool` |
| `src/components/lab/CodonTools.tsx` | `CodonAnalysisTool`, `BackTranslationTool` |

Everything runs client-side. No sequence is sent to the server except when the student
explicitly presses «ذخیره در آزمایشگاه», which writes to `labNotes` via `api.lab.addNote`.

## Scientific integrity — the important part

Only **two** kinds of fact are encoded:

1. The standard genetic code (NCBI translation table 1). A definition, not a measurement.
2. Approximate genome GC levels: *E. coli* 50.8%, *S. cerevisiae* 38.3%,
   *D. melanogaster* 43.0%, *Homo sapiens* 41.0%. Used **only** as a GC target.

**No codon usage frequency table is bundled.** Therefore:

- Codon Analysis never says a codon is "preferred" or "rare" for an organism. It reports what
  is actually in the pasted sequence.
- Back-translation is a **GC-targeting heuristic**, not codon optimisation: for each residue
  it picks the synonym whose GC keeps the running sequence closest to the host's genome GC,
  tie-breaking towards a GC-ending codon and then alphabetically. A synonym is also chosen
  whenever the previous codon would repeat more than 3 times. Both limitations are printed
  inside the tool.
- ORF Finder does not claim anything about genes, introns or CDSs — only the structure of the
  sequence it was given.

## Algorithms

- **ORF** — textbook rule per reading frame: first start codon after a stop opens the ORF, the
  next in-frame stop closes it. An ORF that runs off the end is still reported and flagged
  `complete: false` rather than being padded or closed artificially. `ATG` by default, with an
  opt-in for `GTG`/`TTG`. Both strands scanned.
- **Translation** — stops at the first stop codon, exactly as a ribosome does. Unknown
  codons become `X`; they are never silently dropped, so a translation can never be shorter
  than the sequence implies.
- **Codon Analysis** — GC computed per codon position, CpG observed/expected ratio, longest
  homopolymer run, and amino acids encoded by a single synonym in this sequence.

## Verified by test (47 assertions, all passing)

- genetic code: 64 codons, 21 symbols, every synonym maps back to its amino acid, Leu = 6,
  Met = 1
- reverse complement is an involution
- translation stops at the stop codon; frame and strand changes give different results;
  unknown codon → `X`
- ORF: `ATGGCTAACCGGGTTTAAA` → one complete ORF `+1:1-18` = `MANRV`; `ATG`+12×`GCT` → 13 aa
  and `complete: false`; min-length filter works; `GTG` accepted only when enabled
- codon stats: counts sum to the total, frequencies sum to 1, homopolymer counted correctly
- back-translation: exact round-trip through the translator for all four hosts; a protein that
  already starts with Met gets no extra `ATG`; one that does not gets exactly one; hosts
  produce different sequences; the function is deterministic; every chosen codon encodes its
  residue

# Alignment & Format Conversion Tools — Genova Virtual Lab

Two new tool groups: **«همترازی»** (`alignment`, cyan accent) and **«تبدیل فرمت»** (`format`,
fuchsia accent). Five tools, all running in the browser, registered in
`src/pages/VirtualLab.tsx` with their own `steps` / `outputs` briefs.

| Tool | Input | What it outputs |
|---|---|---|
| **همترازی دو توالی** (`pairwise-align`) | 2 sequences, method, score scheme | three-line alignment viewer (60-col blocks) with a match ruler, score, columns, covered range, identity, TXT download + save |
| **محاسبه‌گر شباهت توالی** (`sequence-similarity`) | 2 sequences, DNA/RNA, score scheme | side-by-side global + local cards, detailed stat grids, method comparison table, bar chart, TXT report + save |
| **FASTA ↔ CSV** (`fasta-csv`) | FASTA or CSV, drag-drop | CSV/FASTA text output, record table, record-length distribution chart, rejected-record list + warnings, copy / download / reset / save |
| **FASTA ↔ JSON** (`fasta-json`) | FASTA or JSON, drag-drop | pretty or minified JSON, record table, length chart, structure warnings |
| **FASTA ↔ GenBank** (`fasta-genbank`) | FASTA or GenBank, drag-drop | flat GenBank with LOCUS/DEFINITION/ACCESSION/VERSION/SOURCE/ORGANISM/FEATURES/ORIGIN, record table, length chart |

## Files

| File | Role |
|---|---|
| `src/components/lab/alignmentCore.ts` | IUPAC tables, scoring scheme, Needleman–Wunsch + Smith–Waterman, similarity statistics |
| `src/components/lab/AlignmentTools.tsx` | `PairwiseAlignTool`, `SimilarityCalculatorTool` |
| `src/components/lab/formatCore.ts` | FASTA / CSV / JSON / GenBank parsers and serialisers |
| `src/components/lab/FormatConvertTools.tsx` | `FastaCsvTool`, `FastaJsonTool`, `FastaGenBankTool` sharing one `SequenceConverter` + `FileDrop` |

## Scientific integrity — the important part

**The scoring scheme is a declared parameter, not biology.** No substitution matrix ships with
the app. There is no BLOSUM62, no PAM, and no nucleotide matrix derived from observed
replacements. `ScoreScheme` is a user-editable parameter:

```
match          +2   (default)
mismatch       -1
gap            -2
allowAmbiguity true  → an IUPAC-compatible but non-identical pair scores 0, not the mismatch
```

Every printed number is labelled as the output of that scheme. Both tools render an
`integrityNote()` panel stating this in plain language, and the downloaded reports carry the
scheme on their header line (`matrix: match=2 mismatch=-1 gap=-2 ambiguity=true`) so a report
that leaves the app cannot be misread as an evolutionary distance. The note also says plainly
that a similarity percentage is **not** a database match and that BLAST is needed for that.

### Identity and similarity are two numbers, never one

- `identity` — positions where both sides hold the **same unambiguous** base.
- `positives` / `similarity` — positions compatible under the IUPAC ambiguity codes
  (e.g. `A` vs `M`, where `M` means "A or C").

They are reported as separate cards. Collapsing them is the most common way a similarity score
gets misreported.

### Transitions and transversions are counted only where the class is defined

A substitution class is only meaningful when both sides are a single unambiguous base and the
two differ. `isTransition` returns `false` for any ambiguity code, because `M` (A or C) spans
both the purine and the pyrimidine class — calling it either way would be an invented claim.
For unambiguous input the invariant `transitions + transversions === mismatches` holds, and
ambiguity pairs land in `positives` with neither counter touched.

## Algorithms and implementation notes

- Needleman–Wunsch and Smith–Waterman share one DP. A `Float64Array` score matrix plus a
  `Uint8Array` traceback (1 = diagonal, 2 = up, 3 = left) keeps a 3000 × 3000 cell affordable in
  the browser. Gap cost is linear.
- `MAX_ALIGNMENT_LENGTH = 3000`. Past it, both tools refuse with an explanation rather than
  locking the tab.
- The alignment renders as a three-line block viewer at 60 columns with a ruler: `|` exact
  match, `:` IUPAC-compatible, `-` gap. Columns keep the start index of each 60-column block.
- `complement()` is exposed as «مکمل معکوس هر دو» for checking the other strand; it is an
  involution and is tested as one.
- CSV parsing is RFC-4180 (quoted fields, embedded commas, `""` escapes) with **delimiter
  sniffing** on the header line: `,`, `;` and tab are counted outside quotes and the majority
  wins, so a semicolon inside a description cannot hijack a comma-separated file. The detected
  delimiter is reported as a warning, never applied silently.
- The sequence column is found by header (`sequence` / `seq` / `توالی`, else column 2); the
  description by `description` / `desc` / `note` / `comment` / `توضیح`.
- GenBank support covers what a FASTA round-trip needs: `LOCUS`, `DEFINITION`, `ACCESSION`,
  `VERSION`, `KEYWORDS`, `SOURCE`/`ORGANISM`/taxonomy, `FEATURES` with qualifiers, and `ORIGIN`.
  Content outside that is not modelled, and the tool does not pretend otherwise.
- **Nothing is uploaded.** The drop zone reads with `File.text()` in the page.
- **No silent data loss.** Every record that fails validation is listed by id with a reason, and
  every character removed by `stripNonNucleotides` is reported as a warning. A conversion that
  loses data always says so on screen.
- `AlphabetPicker` (DNA / RNA / protein / none) exists because "sequence" means nucleotides in a
  `.fna` and amino acids in a `.faa`; the default (DNA) would otherwise reject every protein
  file.
- The three converter configs (`CSV_CONFIG`, `JSON_CONFIG`, `GENBANK_CONFIG`) are module-scope
  constants on purpose: a config built inside the component would be a fresh object every
  render and would invalidate the serialisation memo on every keystroke.
- All five tools save a summary to the lab notebook via `api.lab.addNote`, matching the existing
  protein/codon tools. The saved note repeats the score scheme, because a notebook entry that
  outlives the session must not be read as a biological measurement either.

## Verified by test (84 assertions, all passing)

Alignment:

- identical sequences → 100% identity, no gaps, score `= n × match`
- local alignment drops flanking non-homologous sequence; global keeps the full length, and
  `global.score < local.score`
- a harsher gap penalty never buys gratuitous gaps and scores ≤ a lenient one
- `A` vs `M` is a positive, `A` vs `G` is not, `N` vs `T` is; `N` vs `N` is **not** identical
- `T→C` is a transition (both pyrimidines), `A→C` is a transversion, an ambiguity pair is
  neither; `transitions + transversions === mismatches`
- stats sum to the column count: `identical + positives + mismatches + gaps === columns`
- both methods can be compared on the same input; `complement` is an involution
- a 3001 nt paste does not crash the DP

Formats:

- FASTA round-trips id, description and sequence, including the 60-column wrap
- CSV quoted fields, embedded commas, `""` escapes, and `,` / `;` / tab delimiter sniffing
- JSON pretty vs min, bare-string arrays, the `{sequences: [...]}` wrapper, and an invalid
  document producing a warning instead of throwing
- GenBank parse → serialise round-trip preserves sequence, id and feature count;
  `includeFeatures: false` drops the FEATURES block; a manual LOCUS id overrides the record id;
  two records separated by `//` parse as two
- validation rejects letters outside the chosen alphabet and empty sequences
- orphan data before the first `>` header, and removed characters, are both reported

Known limitation carried forward from the protein/codon group: back-translation still affects
codon choice only through approximate genome GC. No codon-usage table is bundled, and the tool
says so.
