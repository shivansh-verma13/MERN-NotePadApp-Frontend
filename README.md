# Notes — frontend

Shivansh Verma's notes application, paired with NotepadAppBackend. The upgrade/notes-v1 branch is modernizing the original React 18/Create React App/MUI product incrementally. First slice improves reliable capture/edit: failed saves retain drafts, duplicate submissions are blocked, labels/pending/errors are accessible, deletion asks for confirmation, stable note IDs preserve component identity and the workspace fits mobile/desktop. This is an upgrade branch, not a verified hosted release.

## Setup and checks
Node 22+, npm ci, npm start. The source defaults to same-origin /notepad; for local separate ports set REACT_APP_API_URL=http://localhost:4040/notepad in ignored .env.local and run the paired backend. Signed cookies and the request header accompany API calls; session restoration finishes before notes redirect/fetch. See [local integration and paired deployment contract](docs/LOCAL_INTEGRATION.md). Do not copy production credentials into frontend source.

npm test -- --watchAll=false --runInBand; npm run lint (all changed save/auth components, context, API client and tests); npm run build. Eleven component/context tests and the production build passed. Existing CRA/Babel/Browserslist deprecation warnings remain; see docs/VERIFICATION.md for precise scope. Plain JavaScript has no typecheck command. The production build is in build/ and needs SPA fallback hosting plus a correctly configured API before deployment.

## Product release and AI
The durable release criteria in BACKLOG.md cover correct private CRUD, a polished searchable notes workspace and one opt-in summary over authorized selected notes. AI is planned, not implemented or mocked as a live feature. Provider keys will stay server-side. No user counts, performance gains, live URL or hiring-impact metrics are claimed.

## Continuity and recovery
UPGRADE_LOG.md and docs/DECISIONS.md record changes/next tasks. Keep the original default branch recoverable; do not deploy over its existing site or migrate data without authorization. The paired backend docs/automation contains the recurring workflow's runner source. Screenshots capture synthetic local UI verification. Real temporary local MongoDB HTTP integration passed with synthetic accounts. The browser tool exposes no browser in this run; visual/cookie behavior for this auth slice and the hosted journey remain unverified.

![Actual synthetic mobile save verification](docs/screenshots/mobile-save.png)
