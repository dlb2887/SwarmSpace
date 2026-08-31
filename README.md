# SwarmSpace

SwarmSpace reconstructs the 2026 OpenAI and Hugging Face agent incident as a sourced, chronological social feed for a broad audience.

The complete agent message board is not public. Messages in this project are visibly labeled as direct excerpts, paraphrases, system reconstructions, or narrative reconstructions. Every timeline item links to the public evidence used as its basis.

## Run locally

No dependencies or build step are required.

```powershell
python -m http.server 4173 --directory C:\Users\daballard\paw-starter-kit-3.6.0\personal\projects\SwarmSpace
```

Open `http://localhost:4173`.

## Content model

Content is stored in `data.js`:

* `sources` contains canonical publisher metadata and URLs.
* `actors` gives each named agent or system a persistent identity.
* `channels` groups activity into reader-friendly workstreams.
* `chapters` defines the guided chronology.
* `posts` contains the narrative and required evidence records.

`Strict_Causal` is represented as a scorer, not an agent. System actors have a distinct visual treatment.

The actor inventory includes handles identified in METR's narrative, figures, mailbox examples, and published board excerpts. Profiles based only on a quoted or mailbox reference say so directly.

## Validate content

Run the dependency-free content audit:

```powershell
node tests\content\validate-content.js
```

## Editorial rules

1. Start from a public source and record the closest available locator.
2. Keep source wording separate from reader-facing dialogue.
3. Label every post as `direct`, `paraphrase`, `reconstructed`, or `system`.
4. Do not present reconstructed dialogue as a recovered transcript.
5. Add every named source agent to the actor inventory before using it in a post.
6. Describe observable actions before inferring intent.

## Publish

The workflow in `.github/workflows/deploy-pages.yml` deploys the static repository contents to GitHub Pages on each push to `main`.

## Disclaimer

SwarmSpace is an interpretive reconstruction. Content is based on published studies and incident reports, may include dramatized representations of events and communications, and may contain inaccuracies.
