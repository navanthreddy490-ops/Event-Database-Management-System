import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mysql from 'mysql2/promise';
import { stringify } from 'csv-stringify';
import PDFDocument from 'pdfkit';
import path from 'path';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));
app.use('/static', express.static(path.join(process.cwd(), 'static')));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'event_management',
  waitForConnections: true,
  connectionLimit: 10
});
const q = async (sql, params = []) => (await pool.query(sql, params))[0];

app.get('/api/health', async (_, res) => {
  try {
    await q('SELECT 1');
    res.json({ ok: true, db: 'mysql', time: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

/* -------------------- EVENTS -------------------- */
app.get('/api/events', async (req, res) => {
  const rows = await q('SELECT * FROM events ORDER BY date, time, id');
  res.json(rows);
});

app.get('/api/events/:id', async (req, res) => {
  const [row] = await q('SELECT * FROM events WHERE id=?', [req.params.id]);
  if(!row) return res.status(404).json({ error: 'Event not found' });
  res.json(row);
});

app.post('/api/events', async (req, res) => {
  const { name, date, time, category, description, venue, organizer } = req.body;
  if (!name || !date || !time)
    return res.status(400).json({ error: 'name, date, time required' });
  await q(
    'INSERT INTO events (name,date,time,category,description,venue,organizer) VALUES (?,?,?,?,?,?,?)',
    [name, date, time, category || null, description || null, venue || null, organizer || null]
  );
  res.status(201).json({ ok: true });
});

app.put('/api/events/:id', async (req, res) => {
  const id = req.params.id;
  const [cur] = await q('SELECT * FROM events WHERE id=?', [id]);
  if (!cur) return res.status(404).json({ error: 'Event not found' });
  const { name, date, time, category, description, venue, organizer } = req.body;
  await q(
    'UPDATE events SET name=?, date=?, time=?, category=?, description=?, venue=?, organizer=? WHERE id=?',
    [
      name ?? cur.name,
      date ?? cur.date,
      time ?? cur.time,
      category ?? cur.category,
      description ?? cur.description,
      venue ?? cur.venue,
      organizer ?? cur.organizer,
      id
    ]
  );
  res.json({ ok: true });
});

app.delete('/api/events/:id', async (req, res) => {
  await q('DELETE FROM events WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

/* -------------------- REGISTRATIONS -------------------- */
app.get('/api/registrations', async (_, res) => {
  const rows = await q(
    `SELECT r.*, e.name AS event_name FROM registrations r
     JOIN events e ON e.id=r.event_id ORDER BY r.created_at DESC`
  );
  res.json(rows);
});

app.post('/api/registrations', async (req, res) => {
  const { event_id, name, email, contact, role, date } = req.body;
  if (!event_id || !name || !email)
    return res.status(400).json({ error: 'Missing fields' });
  const [dup] = await q('SELECT id FROM registrations WHERE event_id=? AND email=?', [
    event_id,
    email
  ]);
  if (dup)
    return res
      .status(409)
      .json({ error: 'already registered for this event with this email' });
  await q(
    'INSERT INTO registrations (event_id,name,email,contact,role,date) VALUES (?,?,?,?,?,?)',
    [event_id, name, email, contact || null, role || 'Participant', date || null]
  );
  res.status(201).json({ ok: true });
});

app.put('/api/registrations/:id', async (req, res) => {
  const id = req.params.id;
  const [cur] = await q('SELECT * FROM registrations WHERE id=?', [id]);
  if (!cur) return res.status(404).json({ error: 'Registration not found' });
  const { name, email, contact, role, date } = req.body;
  await q(
    'UPDATE registrations SET name=?, email=?, contact=?, role=?, date=? WHERE id=?',
    [
      name ?? cur.name,
      email ?? cur.email,
      contact ?? cur.contact,
      role ?? cur.role,
      date ?? cur.date,
      id
    ]
  );
  res.json({ ok: true });
});

app.delete('/api/registrations/:id', async (req, res) => {
  await q('DELETE FROM registrations WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

/* -------------------- STATS + EXPORT -------------------- */
app.get('/api/stats', async (_, res) => {
  const [{ totalEvents }] = await q('SELECT COUNT(*) AS totalEvents FROM events');
  const [{ totalRegs }] = await q('SELECT COUNT(*) AS totalRegs FROM registrations');
  const per = await q(
    `SELECT e.name, COUNT(r.id) AS registrations
     FROM events e LEFT JOIN registrations r ON e.id=r.event_id
     GROUP BY e.id`
  );
  res.json({ totalEvents, totalRegs, regsPerEvent: per });
});

app.get('/api/registrations.csv', async (_, res) => {
  const rows = await q(
    `SELECT e.name AS event, r.name, r.email, r.role, r.date
     FROM registrations r JOIN events e ON e.id=r.event_id`
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="registrations.csv"');
  const s = stringify({ header: true });
  s.pipe(res);
  rows.forEach(r => s.write(r));
  s.end();
});

app.get('/api/report.pdf', async (_, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="event-report.pdf"');
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);
  doc.fontSize(18).text('Event Report', { align: 'center' }).moveDown();
  const stats = await q('SELECT COUNT(*) AS ev FROM events');
  doc.text(`Total events: ${stats[0].ev}`).moveDown();
  const regs = await q(
    `SELECT e.name AS event, r.name, r.email, r.role, r.date
     FROM registrations r JOIN events e ON e.id=r.event_id
     ORDER BY r.created_at DESC LIMIT 50`
  );
  regs.forEach(r => doc.text(`${r.event} — ${r.name} (${r.role || ''}) <${r.email}>`));
  doc.end();
});

app.listen(PORT, () => console.log(`✅ API running at http://localhost:${PORT}`));
