# Maintaining this profile

The README and its desktop and mobile SVGs are generated from real public GitHub data. The only profile-specific configuration is the GitHub username, number of featured projects, and accent colour in `profile.config.json`. Edit the GitHub profile, pins, repository descriptions, or topics to change the content.

## What updates

| Content | Source | Selection or calculation |
| --- | --- | --- |
| Name, bio, location, followers, repository count | GitHub REST user endpoint | Exact profile fields |
| Contact links | GitHub REST social accounts and blog fields | Valid HTTPS links; malformed whitespace removed |
| Featured projects | GitHub GraphQL pins, with public profile HTML fallback | Owned public original active repos; fill remaining slots by stars, then latest push |
| Project descriptions, topics, language, stars, forks | GitHub REST repositories | Exact fields; full descriptions remain in accessible Markdown |
| Languages | Each owned public repo's REST primary `language` field | One observation per repo; exclude forks and undetected languages; proportions describe repos, not proficiency |
| Contribution skyline and metrics | GraphQL contribution calendar, with public GitHub calendar fallback | One column per day; exact daily counts determine height |
| Recent work | GitHub REST repository `pushed_at` | Three most recently pushed original repos, excluding the profile repo |

The calendar uses GitHub's visibility and counting rules. It can include anonymised private contribution counts if the owner publishes them on their profile; private repository metadata is never fetched. The longest streak is measured only within the displayed calendar window. No visitor counts, proficiency ratings, fictional commits, or hardcoded project metrics are generated.

## Run locally

Requires Node.js 22 or newer. No package installation is needed.

```sh
npm test
npm run build
npm run check
npm run preview
```

Open the local address printed by `npm run preview`. The preview uses the same image assets as the README; the README is canonical for links, details, and timestamps.

`npm run build` renders the saved snapshot without a network call. It never changes the data's fetch timestamp. To fetch new data, run `npm run sync`. `GITHUB_TOKEN` or `GH_TOKEN` is optional locally, but recommended because unauthenticated REST calls share a low rate limit and GraphQL requires authentication. Do not put tokens into files or command arguments.

The complete API-backed snapshot is in `data/profile.json`, including its timestamp and source metadata. A sync must successfully fetch all repository pages, profile fields, social links, and a complete calendar before the workflow can publish anything. Failed runs leave the previously committed profile intact, with its original timestamp visible. Languages are counted by repositories so large notebook outputs cannot overwhelm the other work.

## Activate on GitHub

Commit and push the replacement files to the `main` branch of `RajatBhardwaj2006/RajatBhardwaj2006`. The profile repository name must match the account username, and its README must be on the default branch.

The `Sync GitHub profile` workflow starts when the generator is pushed. It also runs at minute 23 every six hours (UTC) and can be run manually from the Actions tab. It uses the automatically provided `GITHUB_TOKEN` with repository contents write permission; no personal token or external stats server is required. Repository or organisation policy must permit that workflow permission. If branch protection requires pull requests, use a bot PR flow instead of direct workflow pushes.

GitHub can delay scheduled runs and image caches can delay visible updates. Scheduled workflows in public repositories may be disabled after 60 days without repository activity. The checked-in assets remain visible; re-enable the workflow in Actions if GitHub disables it. A local edit does not activate the remote workflow.

## Rendering and motion

GitHub profiles render sanitised Markdown and embedded images, not arbitrary JavaScript, canvas, or WebGL. The 3D manifold is mathematically projected into an SVG mesh and animates its path geometry with SVG SMIL. The daily contribution scene uses isometric projected blocks. All SVGs are self-contained with no external fonts, scripts, or remote images.

CSS motion is paused for `prefers-reduced-motion`, and the animated mesh is replaced by a static version. Dedicated mobile hero and contribution scenes are selected with `<picture>`. Project illustrations are abstract art, not screenshots or claims about a project's interface. SVG titles, descriptions, README alt text, and expandable Markdown provide text equivalents.

## Change the design

- `scripts/lib/render.mjs`: SVG artwork, layout, copy, and generated README.
- `scripts/lib/github.mjs`: API pagination, public HTML fallbacks, data selection, and calculations.
- `scripts/sync-profile.mjs`: collect a complete snapshot, then render.
- `.github/workflows/sync-profile.yml`: refresh and publish schedule.
- `tests/profile.test.mjs`: meaningful data, privacy, pagination, and failure checks.

Do not hand-edit `README.md` or `assets/generated/`; the next sync replaces them. Use `npm run build` after editing the renderer. The verification workflow checks the saved data and regenerates the profile to detect drift.

## Primary references

- [GitHub profile README requirements](https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme)
- [REST repositories](https://docs.github.com/en/rest/repos/repos)
- [GitHub Actions schedule behaviour](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [Automatic workflow token](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)
