# AccessMate Stage 4 API reference
Base URL: `http://localhost:5000/api`. JSON errors use `{ "error": "..." }`.

## Authentication
- `POST /auth/register` JSON `{ "name":"Example", "email":"person@example.com", "password":"at-least-8-chars" }` -> `201 { user, token }`.
- `POST /auth/login` JSON `{ "email":"person@example.com", "password":"..." }` -> `{ user, token }`.
- `GET /auth/me` requires `Authorization: Bearer <token>` -> `{ user }`.
- `POST /auth/logout` requires bearer token. JWT is stateless and remains valid until its expiry; client must delete token. Server-side revocation is not implemented.
- `POST /auth/forgot-password` and `/auth/reset-password` return `501` until a real email delivery and reset-token store are configured. They do not claim to send email.

## Documents (all routes require bearer token)
- `GET /documents?q=term&type=pdf&sort=newest` -> `{ documents: [...] }`. `type` accepts extension or `all`; sort accepts `newest`, `oldest`, `name`, `size`.
- `POST /documents` multipart form field `document` -> `201 { document }`.
- `GET /documents/:id/download` -> owned file download.
- `PATCH /documents/:id` JSON `{ "originalName":"new name.pdf" }` -> `{ document }`.
- `DELETE /documents/:id` -> `{ message }`.
- `POST /documents/:id/ocr` JSON `{ "language":"eng" }`, `hin`, or `eng+hin` -> `{ text, document, status }`. Image and TXT files supported; PDF/Word conversion is not included. Tesseract.js must be installed for image OCR.
- `GET /documents/:id/text` -> `{ document, text }`.

## AI and activity
- `POST /ai/analyze` requires bearer token; JSON `{ "text":"...", "question":"optional question", "documentId":123 }` -> `{ answer }`. Requires `AI_API_KEY` and `AI_MODEL`; uses configurable OpenAI-compatible `AI_API_URL`. Document text is sent to that provider only after the user initiates analysis.
- `GET /activity` requires bearer token -> `{ activities: [...] }` (latest 100 events).
- `GET /health` reports API and database status. It returns HTTP 503 when PostgreSQL cannot be reached.

## Status and limitations
QR/barcode scanning currently uses browser `BarcodeDetector` in the frontend when available; no backend decoder endpoint is provided. Translation provider integration and password-reset email delivery are not configured. No API keys are shipped in this project.
