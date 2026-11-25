### Uploading signing certificates
*Created 2026-11-12 · last active 2026-11-12 · session `session_01V21hojzjXe4rr4PYFAuxmp`*

**Goal:** Find out how to get code-signing certificates into Claude so an app can be signed, and share that setup with a team.

**Requirements & decisions:**
- Don't paste or upload certificates into chat; store them as cloud environment secrets/variables (base64-encoded): `SIGNING_CERT_B64` and `SIGNING_CERT_PASSWORD`; a new session picks them up.
- Linux container can sign Android (apksigner) and Windows Authenticode (osslsigncode); iOS/macOS needs a Mac (or macOS CI runners).
- User wants to create it and share with the team; clarified teammates have different logins. Environments and secrets belong to one account, so options are: each person adds the secrets to their own environment (share cert via password-manager vault), or sign in CI with one GitHub Actions secret (recommended).
- Platforms: "all but mac" = Android and Windows (iOS possible via GitHub macOS runners if wanted).

**Delivered & links:**
- No files, artifacts or repos; guidance only.

**Final state:** Assistant offered to write a GitHub Actions signing workflow for Android and Windows once it has the repo.

**Open items:** User to provide the GitHub repository (owner/name) and say whether to include iOS; then add repo secrets.

**Your messages:**
1. *(2026-11-12)* is there a way for me to upload my signing certificates into claude so that i can sign in this app ?
2. *(2026-11-12)* i would like to create it and share with my team  and that is it - we all have the same logins
3. *(2026-11-12)* sorry - different logins but want to share
4. *(2026-11-12)* all but mac
