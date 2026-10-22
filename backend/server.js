const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();

const app = require('./src/app');

const port = Number(process.env.PORT || 5000);
const server = app.listen(port, () => {
  console.log(`AccessMate API running at http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[AccessMate] Port ${port} is already in use by another process.`);
    console.error(`Stop the process using port ${port} or change PORT in backend/.env to another port (e.g. 5001).\n`);
  } else {
    console.error('[AccessMate] Server error:', err);
  }
  process.exit(1);
});



