# Changesets

This folder holds [changesets](https://github.com/changesets/changesets). Add one
with `npx changeset` describing your change.

**Semver policy for this package:** the public Halo surface is the contract.

- **major** — a breaking change to the Halo-shaped public surface (renamed field,
  changed method signature, removed operation).
- **minor** — additive Gorelo coverage (a `missing`/`planned` op becomes
  `partial`/`full`), new optional config, new manifest fields.
- **patch** — bug fixes, caveat/docs updates, field-map corrections that don't
  change the public shape.
