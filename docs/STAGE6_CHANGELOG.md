# Stage 6 changelog

- Added `backend/scripts/smoke-test.js`, a read-only live API smoke test for health, protected-route authentication, and absence of a public uploads route.
- Added `backend/tests/stage6-packaging.test.js` to validate API URL consistency and required acceptance documentation.
- Added a final local integration setup guide and explicit acceptance checklist.
- Updated package metadata/documentation to identify this as Stage 6.
- Preserved the modular Express/PostgreSQL architecture and prior stage files.
- No live database was connected to or modified. Smoke tests require the user to start the app locally and are not represented as already passing against a real server.
