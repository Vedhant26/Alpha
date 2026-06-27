// ============================================
// ALPHA — Server Entry Point
// Express + Socket.IO + Static Files
// ============================================
require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});

// ─── Security Middleware ───
app.use(helmet({ contentSecurityPolicy: false })); // Disabled CSP for inline styles/scripts in this MVP
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true })); // Allow cookies across origins if needed

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// ─── General Middleware ───
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Routes ───
const { router: authRoutes, authMiddleware } = require('./routes/auth');
const boardRoutes = require('./routes/boards');
const cardRoutes = require('./routes/cards');
const teamRoutes = require('./routes/teams');
const githubRoutes = require('./routes/github');

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Protected routes (could wrap with authMiddleware later, keeping open for now to not break UX without login modal fully wired up)
app.use('/api/boards', boardRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/github', githubRoutes);

// ─── AI Analysis trigger endpoint ───
const { runFullAnalysis } = require('./ai/scheduler');

app.post('/api/ai/analyze/:boardId', async (req, res) => {
  try {
    const results = await runFullAnalysis(req.params.boardId, io);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const { runStreamingAnalysis } = require('./ai/streaming');
app.post('/api/ai/stream-analysis/:boardId', async (req, res) => {
  try {
    // Fire and forget so we don't block the request. The UI will listen to WS.
    runStreamingAnalysis(req.params.boardId, io).catch(console.error);
    res.json({ success: true, message: 'Streaming started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const { recommendAssignee } = require('./ai/autoAssign');
app.get('/api/ai/auto-assign/:boardId/:cardId', async (req, res) => {
  try {
    const recommendation = await recommendAssignee(req.params.boardId, req.params.cardId);
    res.json(recommendation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ai/insights/:boardId', (req, res) => {
  const db = require('./db/database');
  const insights = db.getInsightsByBoard(req.params.boardId);
  res.json(insights);
});

app.get('/api/ai/digest/:boardId', (req, res) => {
  const db = require('./db/database');
  const digest = db.getLatestDigest(req.params.boardId);
  res.json(digest || null);
});

// ─── WebSocket Handler ───
const setupWebSocket = require('./websocket/handler');
setupWebSocket(io);

// ─── AI Scheduler ───
const { startScheduler } = require('./ai/scheduler');
startScheduler(io);

// ─── Fallback: serve SPA ───
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ─── Graceful Shutdown ───
function shutdown(signal) {
  console.log(`\n  [Server] ${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log('  [Server] HTTP server closed.');
    process.exit(0);
  });
  // Force exit after 3s if connections won't close
  setTimeout(() => process.exit(1), 3000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err);
  shutdown('uncaughtException');
});

// ─── Start Server ───
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n  ☁️  Alpha Kanban running at http://localhost:${PORT}\n`);
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ❌ Port ${PORT} is already in use. Run: taskkill /F /PID $(netstat -ano | findstr :${PORT})\n`);
  }
  process.exit(1);
});
