// ============================================
// ALPHA — WebSocket Handler
// Handles real-time sync & conflict resolution
// ============================================

const db = require('../db/database');

module.exports = function setupWebSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Join a specific board room
    socket.on('join-board', (boardId) => {
      // Leave previous rooms (except socket's own room)
      socket.rooms.forEach(room => {
        if (room !== socket.id) socket.leave(room);
      });
      
      socket.join(boardId);
      console.log(`[WS] Client ${socket.id} joined board ${boardId}`);
    });

    // ─── Cards ───
    
    // Broadcast card creation
    socket.on('card-create', (data) => {
      socket.to(data.boardId).emit('card-created', data.card);
    });

    // Broadcast card update (with Last-Write-Wins conflict check simulation)
    socket.on('card-update', (data) => {
      // In a real production app we'd verify the timestamp against the DB
      // For this demo, we'll just broadcast the update to everyone else in the room
      // If two users edit the same card at the exact same time, the last one processed by the server wins.
      // The frontend will handle showing a toast if it receives an update for a card it's currently editing.
      socket.to(data.boardId).emit('card-updated', data.card);
    });

    // Broadcast card movement (drag & drop)
    socket.on('card-move', (data) => {
      socket.to(data.boardId).emit('card-moved', {
        cardId: data.cardId,
        newColumnId: data.newColumnId,
        newPosition: data.newPosition,
        // The sender also sends the full updated card object for convenience
        card: data.card 
      });
    });

    // Broadcast card deletion
    socket.on('card-delete', (data) => {
      socket.to(data.boardId).emit('card-deleted', data.cardId);
    });

    // ─── Columns ───
    socket.on('column-create', (data) => {
      socket.to(data.boardId).emit('column-created', data.column);
    });

    socket.on('column-update', (data) => {
      socket.to(data.boardId).emit('column-updated', data.column);
    });
    
    // ─── Live Typing / Editing Presence ───
    socket.on('card-editing-start', (data) => {
      socket.to(data.boardId).emit('card-locked', {
        cardId: data.cardId,
        userId: socket.id,
        userName: data.userName || 'Someone'
      });
    });

    socket.on('card-editing-stop', (data) => {
      socket.to(data.boardId).emit('card-unlocked', data.cardId);
    });

    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
      // Send a general unlock event if they were editing
      // (Could be improved by tracking what they were editing)
    });
  });
};
