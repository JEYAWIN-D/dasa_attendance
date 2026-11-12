const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test PostgreSQL database connectivity
    const client = await pool.connect();
    console.log('✅ PostgreSQL database connected successfully.');
    client.release();

    app.listen(PORT, () => {
      console.log(`🚀 DASA TECH Attendance API Server running on port ${PORT}`);
      console.log(`🌐 Base URL: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

