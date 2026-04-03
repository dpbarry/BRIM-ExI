require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.use('/api/chat', require('./routes/chat'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/employees', require('./routes/employees'));

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;

async function start() {
  const { initDb } = require('./db');
  const { runSeed } = require('./seed');
  initDb();
  await runSeed();
  app.listen(PORT, () => console.log(`ExI running at http://localhost:${PORT}`));
}

start().catch(err => { console.error(err); process.exit(1); });
