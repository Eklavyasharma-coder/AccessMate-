# Stage 7 — Security and privacy hardening

## Changes
- Production CORS allows only exact `FRONTEND_ORIGIN` values; comma-separated origins are supported. Development retains localhost origins.
- Added process-local rate limits: 20 authentication requests per 15 minutes and 10 AI requests per minute by default. Tune using `AUTH_RATE_LIMIT_MAX` and `AI_RATE_LIMIT_MAX`.
- JWT creation rejects missing, placeholder, or shorter-than-32-character secrets.
- Uploads check file signatures after extension filtering and remove rejected files.
- AI requests cap document text at 60,000 characters and questions at 4,000; optional `documentId` must belong to the authenticated user.
- JSON request bodies are capped at 256 KB and URL-encoded bodies at 64 KB.
- Production error responses avoid exposing internal details.

## Before production
1. Generate a private random secret of 32 bytes or more and put it in `backend/.env` as `JWT_SECRET`. Never commit `.env`.
2. Set `NODE_ENV=production` and configure exact deployed frontend origin(s) in `FRONTEND_ORIGIN`.
3. Enable `TRUST_PROXY=true` only behind a trusted reverse proxy.
4. Use HTTPS and configure host-level request limits.
5. For multiple Node instances, replace the in-memory rate limiter with a shared store such as Redis; this limiter is process-local only.
6. Review retention and provider privacy terms before sending sensitive document text to an external AI endpoint.

## Limitations
Magic-byte checks help reject obvious extension spoofing but do not replace malware scanning, full file parsing, decompression-bomb protection, or sandboxing. DOCX is identified as a ZIP-based container but its internal package structure is not inspected. The current auth logout records the event but JWTs remain valid until expiry. Password recovery deliberately remains disabled until a real token-storage and email flow is configured.

## Tests
Run `npm run check` and `npm test` in `backend/`. Tests do not prove that PostgreSQL, a live AI provider, OCR language packs, or deployed HTTPS configuration works.
