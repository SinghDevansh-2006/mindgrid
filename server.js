// ─────────────────────────────────────────────
//  MindGrid — Backend Server (Node.js + Express)
//  Handles mood entry storage via JSON file
// ─────────────────────────────────────────────

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = 3000;
const DB   = path.join(__dirname, 'data', 'moods.json');

// ── Middleware ────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Helper: read/write JSON "database" ────────
function readDB() {
  if (!fs.existsSync(DB)) return { entries: [] };
  return JSON.parse(fs.readFileSync(DB, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

// ── ROUTES ────────────────────────────────────

// GET  /api/moods      — fetch all mood entries
app.get('/api/moods', (req, res) => {
  const db = readDB();
  res.json(db.entries);
});

// POST /api/moods      — save a new mood entry
app.post('/api/moods', (req, res) => {
  const { mood, intensity, note, emoji } = req.body;

  // Validate required fields
  if (!mood || !intensity) {
    return res.status(400).json({ error: 'mood and intensity are required' });
  }

  const db = readDB();

  const entry = {
    id:        Date.now().toString(),   // unique ID = timestamp
    mood,                               // e.g. "joy", "calm", "anxious"
    intensity: parseInt(intensity),     // 1–10
    note:      note || '',              // optional journal note
    emoji:     emoji || '✦',           // mood emoji
    timestamp: new Date().toISOString() // ISO date string
  };

  db.entries.push(entry);
  writeDB(db);

  res.status(201).json(entry);
});

// DELETE /api/moods/:id  — delete a single entry
app.delete('/api/moods/:id', (req, res) => {
  const db = readDB();
  const before = db.entries.length;
  db.entries = db.entries.filter(e => e.id !== req.params.id);

  if (db.entries.length === before) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  writeDB(db);
  res.json({ message: 'Entry deleted' });
});

// GET /api/stats  — return mood summary stats
app.get('/api/stats', (req, res) => {
  const db = readDB();
  const entries = db.entries;

  if (entries.length === 0) {
    return res.json({ total: 0, avgIntensity: 0, moodCounts: {}, streak: 0 });
  }

  // Count each mood type
  const moodCounts = {};
  let totalIntensity = 0;
  entries.forEach(e => {
    moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    totalIntensity += e.intensity;
  });

  // Calculate daily streak
  const days = [...new Set(entries.map(e => e.timestamp.split('T')[0]))].sort().reverse();
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  for (let i = 0; i < days.length; i++) {
    const expected = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    if (days[i] === expected) streak++;
    else break;
  }

  res.json({
    total:        entries.length,
    avgIntensity: (totalIntensity / entries.length).toFixed(1),
    moodCounts,
    streak,
    dominantMood: Object.entries(moodCounts).sort((a,b) => b[1]-a[1])[0]?.[0]
  });
});

// ── Start server ──────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🌊 MindGrid server running at http://localhost:${PORT}`);
  console.log(`  📁 Data stored in: ${DB}\n`);
});
