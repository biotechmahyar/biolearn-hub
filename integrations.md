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
