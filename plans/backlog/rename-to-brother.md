# brother-ql → brother — package, type, and repo rename

> Spun off from `add-pt-series.md` §3 / `migrate-to-contracts-shape.md`
> §6 step 1. Both of those originally treated the rename as a lead-off
> step they piggy-backed on. In practice the rename touches every
> downstream consumer (npm tags, GitHub repo, docs site URL, every
> import in apps depending on the package) and is its own headache —
> bundling it with the contracts-shape migration would mean two
> independently risky operations land in one PR. Splitting lets each
> happen on its own cadence.
>
> Scope here is **only** the rename. No shape changes, no PT-series
> additions, no schema work. Behavior is byte-for-byte identical
> across the version bump.

---

## 1. Why a separate plan

- **The contracts-shape migration is large mechanical churn already.**
  Adding a global identifier rename on top doubles the review surface
  and the merge-conflict probability if any other PR is in flight.
- **The PT-series work is gated on hardware access** in places. The
  rename should not wait on that — it stands on its own.
- **The rename has external blast radius** (npm deprecate, GitHub
  repo rename, docs site URL changes, redirects) that the other two
  plans do not. Wants its own checklist.

The contracts-shape migration plan and the PT-series plan should
both assume **the rename either has happened or will happen
separately**, and neither should block on it.

---

## 2. What renames

### 2.1 npm packages

| Old                                | New                              |
| ---------------------------------- | -------------------------------- |
| `@thermal-label/brother-ql-core`   | `@thermal-label/brother-core`    |
| `@thermal-label/brother-ql-node`   | `@thermal-label/brother-node`    |
| `@thermal-label/brother-ql-web`    | `@thermal-label/brother-web`     |

`package.json` `name`, `repository.directory`, `homepage`, `bugs.url`,
internal `dependencies` and `devDependencies` cross-references,
`pnpm-workspace.yaml` filter targets if any.

### 2.2 TypeScript identifiers

| Old                       | New                  |
| ------------------------- | -------------------- |
| `BrotherQLDevice`         | `BrotherDevice`      |
| `BrotherQLMedia`          | `BrotherMedia`       |
| `BrotherQLStatus`         | `BrotherStatus`      |
| `BrotherQLPrintOptions`   | `BrotherPrintOptions`|
| `BrotherQLPrinter`        | `BrotherPrinter`     |
| `family: 'brother-ql'`    | `family: 'brother'`  |

Plus any `BrotherQL...` symbol that grep finds in tests, fixtures,
docs, and example code.

### 2.3 Repo + docs

- GitHub repo: `thermal-label/brother-ql` → `thermal-label/brother`
  (GitHub auto-redirects the old slug indefinitely).
- Docs site: `thermal-label.github.io/brother-ql/` →
  `thermal-label.github.io/brother/`. Update any cross-links from the
  org docs hub and from sibling driver READMEs.
- Repo description, topics, README badges, CI workflow names.
- `CLAUDE.md` / `AGENTS.md` mentions if any.

---

## 3. Release strategy

Single release: bump from current `0.3.x` (last `brother-ql`) to
`0.4.0` (first `brother`). No transitional dual-publish — that doubles
maintenance burden and splits issue triage. The npm deprecate notice
is the migration path.

```sh
npm deprecate @thermal-label/brother-ql-core "Renamed to @thermal-label/brother-core; install that instead."
npm deprecate @thermal-label/brother-ql-node "Renamed to @thermal-label/brother-node; install that instead."
npm deprecate @thermal-label/brother-ql-web  "Renamed to @thermal-label/brother-web; install that instead."
```

We're at 0.x — semver makes no compatibility promises and the user
base is the maintainer plus a handful of early adopters. The
deprecation cost is one paragraph in each old README.

---

## 4. Sequencing

1. **Code rename in one PR** — `git grep -E 'brother-ql|BrotherQL'`
   and rename mechanically. Search ignores `node_modules` and
   `dist`. Update `package.json`s, lockfile, tsconfig paths,
   imports, type names, `family` literal, doc comments, test
   fixture names, and the docs site config (homepage, base URL).
2. **Tests pass green locally** before the repo rename — easier to
   bisect if anything regresses.
3. **GitHub repo rename** via the repo settings page. Update any
   GitHub Actions that reference the slug literally.
4. **Push the rename PR**, tag `0.4.0`, publish the three new
   packages.
5. **`npm deprecate` the three old packages** with the message above.
6. **Add the "previously known as brother-ql" paragraph** to each
   new README (one paragraph, install snippet, link to changelog
   entry explaining there are no functional changes in 0.4.0
   beyond the rename).
7. **Update sibling repos** (`labelmanager`, `labelwriter`,
   `contracts`, the docs hub, any CI orchestration) that reference
   `brother-ql` by name.

Each step is recoverable on its own. Step 3 (repo rename) is the
hardest to undo; do it last among reversible-by-recreating steps.

---

## 5. Test plan

- All existing tests pass identically — no behavior change.
- `pnpm install` from a fresh clone resolves the new package names.
- `pnpm build` produces dist with the new names.
- A consumer doing `pnpm add @thermal-label/brother-core` and
  `import { BrotherDevice } from '@thermal-label/brother-core'`
  builds successfully.
- The npm deprecate message renders on `npm install` of any old
  package name.
- GitHub auto-redirect resolves the old repo URL to the new one.

---

## 6. Coordination

- **Do not start while** the contracts-shape migration is in flight
  — let one mechanical-rename PR land at a time.
- **Do not start while** PT-series schema work is in flight, for the
  same reason.
- **Decision record** lands as `D10 — Package rename brother-ql →
  brother` in `DECISIONS.md`, referencing this plan.

---

## 7. Out of scope

- Schema changes (covered by `migrate-to-contracts-shape.md`).
- PT-series device additions (covered by `add-pt-series.md`).
- Any functional behavior change. If a bug surfaces during the
  rename PR, file it separately and fix it in a follow-up.
