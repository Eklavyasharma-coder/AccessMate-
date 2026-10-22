# Stage 7 changelog

- Added authentication and AI rate limiting.
- Restricted production CORS to explicitly configured frontend origins.
- Added stricter JSON/form request limits and safer production error responses.
- Enforced minimum JWT secret length.
- Added post-upload file signature validation and cleanup on rejection.
- Added AI text/question limits and document ownership validation for analysis activity.
- Added Stage 7 tests and production setup guidance.

No live PostgreSQL database was connected or changed. No external AI request was made.
