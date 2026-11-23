// backend/src/server.js
const app = require('./app');
const env = require('./config/env');
const db = require('./config/db');

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
🌾 ========================================================== 🌾
          FARMDIRECT BACKEND SERVER RUNNING
   Tagline: "From Farmers to Your Doorstep"
   Port: ${PORT}
   Environment: ${env.NODE_ENV}
   API URL: http://localhost:${PORT}/api
   Frontend: http://localhost:${PORT}/index.html
🌾 ========================================================== 🌾
  `);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(async () => {
    if (db.prisma) {
      await db.prisma.$disconnect();
    }
    process.exit(0);
  });
});

module.exports = server;
