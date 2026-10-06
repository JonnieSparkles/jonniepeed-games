# AGENTS.md

Follow the **Standards** section in README.md on every change. In short:

- Games and scenes: full screen mode, work in portrait, landscape and desktop.
- After any change in `site/`: run `python3 tools/stamp.py`.
- New or changed game art: run `python3 tools/og/make.py`.
- No backward compatibility: delete old paths, no redirects.
- Studio name is JonniePeed Games (capital P).
- Don't commit or push to `main` unless the user says to in the conversation. Deliverables go in the repo, not zip files.
- Pages deploys only by hand (workflow_dispatch). Never add automatic triggers.
