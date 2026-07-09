# halopsa-gorelo-rewriter

The goal of this project is to allow apps with Halo integrations to integrate with Gorelo. It will scale as their API improves.

## Where to start

Gorelo's Public API covers only a slice of what a Halo integration expects, so
the first job is knowing exactly what maps, what degrades, and what has no home
at all. That's captured in the capability manifest seed:

- **[docs/gorelo-halo-feature-matrix.md](docs/gorelo-halo-feature-matrix.md)** —
  every Halo PSA operation mapped onto the Gorelo Public API, with a
  `full` / `partial` / `missing` / `gorelo-only` status and the caveats each one
  carries. This is the contract the rewriter code will be generated against.
- **[spec/gorelo-public-api.v1.json](spec/gorelo-public-api.v1.json)** — the
  vendored Gorelo Public API v1 OpenAPI spec the matrix is verified against.

Gorelo ships weekly. Re-fetch the spec, diff it against the vendored copy, and
update the matrix when it drifts (instructions are at the bottom of the matrix).
