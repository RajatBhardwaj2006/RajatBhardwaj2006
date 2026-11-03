# Put the redesign on Rajat's profile

1. Open a local copy of `RajatBhardwaj2006/RajatBhardwaj2006` while signed into an account with write access.
2. Copy the contents of this redesign into it, including the hidden `.github` folder and `.gitignore`. Keep the repository's existing `.git` folder.
3. Delete the previous `.github/workflows/github-stats.yml` and old `profile/` artwork folder; this redesign replaces them.
4. Commit and push the replacement files to `main`.
5. Open **Actions → Sync GitHub profile → Run workflow** if the initial push did not already start the sync. Once it succeeds, open the profile.

The supplied images already show real GitHub data and work immediately. The workflow refreshes data every six hours after these files are published. It needs GitHub Actions to be enabled and permission to write repository contents. No additional personal access token or third-party account is needed.

To view the files locally, install Node.js 22 or newer, run `npm run preview` in this folder, and open the address it prints. There are no dependencies to install.

See [MAINTAINING.md](MAINTAINING.md) for data sources, checks, and design editing.
