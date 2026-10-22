'use strict';
const { randomUUID } = require('crypto');

/** Attaches a UUID request-ID to req.requestId and the response header. */
function requestId(req, res, next) {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

module.exports = { requestId };
