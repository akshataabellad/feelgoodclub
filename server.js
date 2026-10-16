const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'gooddog.sqlite');
const PORT = Number(process.env.PORT) || 3000;
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, detail TEXT NOT NULL, icon TEXT NOT NULL,
    color TEXT NOT NULL, duration TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS service_offerings (
    id TEXT PRIMARY KEY, service_id TEXT NOT NULL REFERENCES services(id), name TEXT NOT NULL,
    detail TEXT NOT NULL, duration TEXT NOT NULL, price_label TEXT NOT NULL DEFAULT 'Ask us',
    process TEXT NOT NULL DEFAULT '[]',
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS owners (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    phone TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS dogs (
    id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES owners(id), name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(owner_id, name)
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES owners(id), dog_id TEXT NOT NULL REFERENCES dogs(id),
    service_id TEXT NOT NULL REFERENCES services(id), offering_id TEXT REFERENCES service_offerings(id),
    visit_date TEXT NOT NULL, preferred_time TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'requested'
      CHECK(status IN ('requested','confirmed','cancelled','completed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments(visit_date, status);
  CREATE TABLE IF NOT EXISTS care_records (
    id TEXT PRIMARY KEY, dog_id TEXT NOT NULL REFERENCES dogs(id), appointment_id TEXT REFERENCES appointments(id),
    record_type TEXT NOT NULL CHECK(record_type IN ('vaccination','medication','surgery','grooming','wellness','boarding')),
    title TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', record_date TEXT NOT NULL,
    follow_up_date TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS care_records_dog_idx ON care_records(dog_id, record_date DESC);
  CREATE TABLE IF NOT EXISTS contact_messages (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE,
    message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','read','closed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id TEXT PRIMARY KEY, email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add this column when upgrading a database created before service options existed.
if (!db.prepare('PRAGMA table_info(appointments)').all().some(column => column.name === 'offering_id')) {
  db.exec('ALTER TABLE appointments ADD COLUMN offering_id TEXT REFERENCES service_offerings(id)');
}
if (!db.prepare('PRAGMA table_info(service_offerings)').all().some(column => column.name === 'process')) {
  db.exec("ALTER TABLE service_offerings ADD COLUMN process TEXT NOT NULL DEFAULT '[]'");
}

const seedServices = [
  ['wellness', 'Wellness visits', 'Nose-to-tail checkups, thoughtful advice and a plan that fits your dog.', '✳', 'mint', '30–45 min'],
  ['vaccinations', 'Vaccinations', 'Puppy schedules, annual boosters and travel-ready protection.', '♡', 'peach', '20–30 min'],
  ['grooming', 'Grooming & spa', 'A gentle bath, tidy trim and plenty of breaks for nervous pups.', '✿', 'lilac', '1–2 hours'],
  ['medication', 'Medication care', 'Medication reviews, refills and support for ongoing conditions.', '＋', 'yellow', '20 min'],
  ['surgery', 'Surgery & dental', 'Clear pre-op guidance and attentive aftercare from our care team.', '⌁', 'blue', 'Consult first'],
  ['daycare', 'Daycare & boarding', 'A safe, supervised second home for play days and little getaways.', '☀', 'rose', 'Half or full day']
];
const seed = db.prepare('INSERT OR IGNORE INTO services (id,name,detail,icon,color,duration) VALUES (?,?,?,?,?,?)');
for (const service of seedServices) seed.run(...service);

const seedOfferings = [
  ['wellness-checkup','wellness','Complete wellness check','A nose-to-tail exam, weight check and personalized care plan.','30–45 min','From $65'],
  ['wellness-puppy','wellness','Puppy first visit','A gentle introduction, growth check and a plan for the first year.','45 min','From $75'],
  ['wellness-senior','wellness','Senior dog checkup','A thoughtful age-related health review and comfort plan.','45 min','From $75'],
  ['vaccines-puppy','vaccinations','Puppy vaccine series','A vet-guided vaccine schedule for growing pups.','20–30 min','From $35'],
  ['vaccines-boosters','vaccinations','Booster visit','A review of records and any due booster vaccinations.','20 min','From $30'],
  ['vaccines-travel','vaccinations','Travel vaccine consult','Review travel plans and discuss destination requirements.','30 min','From $45'],
  ['grooming-haircut','grooming','Haircut & tidy','Breed-aware haircut, face trim and a tidy finish.','1–2 hours','From $55'],
  ['grooming-bath','grooming','Bath & brush','Warm bath, coat conditioning, blow-dry and brushing.','60–90 min','From $40'],
  ['grooming-nails','grooming','Nail trim & paw care','Nail trim, paw pad tidy and a gentle paw balm.','20–30 min','From $18'],
  ['grooming-spa','grooming','Spa day','A soothing bath, brush, ear clean and coat conditioning.','90 min','From $65'],
  ['grooming-dressup','grooming','Dress-up & photo-ready','A finishing style with a bandana, bow or seasonal accessory.','Add-on','From $12'],
  ['medication-review','medication','Medication review','Review current prescriptions, dosage schedule and questions with the care team.','20 min','From $30'],
  ['medication-refill','medication','Prescription refill request','Request a refill review for an existing patient and prescription.','Care team review','Price varies'],
  ['medication-followup','medication','Treatment follow-up','Check progress, side effects and next steps for ongoing treatment.','20 min','From $30'],
  ['surgery-consult','surgery','Surgery consultation','Discuss the procedure, pre-op preparation, estimate and recovery plan.','30–45 min','Estimate provided'],
  ['surgery-dental','surgery','Dental assessment','Oral health assessment and recommendations for dental care.','30 min','From $45'],
  ['surgery-aftercare','surgery','Post-surgery check-in','A recovery check and guidance following a procedure.','20 min','From $30'],
  ['daycare-half','daycare','Half-day daycare','Supervised social time, enrichment and rest breaks.','Up to 5 hours','From $28'],
  ['daycare-full','daycare','Full-day daycare','A full day of supervised play, enrichment and quiet time.','Up to 10 hours','From $45'],
  ['boarding-night','daycare','Overnight boarding','An overnight stay with a familiar routine and attentive care.','Per night','From $65'],
  ['boarding-meet','daycare','Boarding introduction','Meet the team and discuss your dog’s routine before their stay.','30 min','Complimentary']
];
const seedOffering = db.prepare(`INSERT OR IGNORE INTO service_offerings
  (id,service_id,name,detail,duration,price_label) VALUES (?,?,?,?,?,?)`);
for (const offering of seedOfferings) seedOffering.run(...offering);

const offeringProcesses = {
  'wellness-checkup': ['Check weight, appetite, mobility and daily habits.', 'Complete a gentle nose-to-tail physical exam.', 'Discuss findings and agree on a personalized care plan.'],
  'wellness-puppy': ['Review vaccination and deworming history.', 'Check growth, teeth, ears and general development.', 'Plan the next puppy visits and at-home routine.'],
  'wellness-senior': ['Review mobility, appetite, behavior and comfort.', 'Complete a senior-focused physical exam.', 'Discuss prevention, monitoring and follow-up timing.'],
  'vaccines-puppy': ['Review your puppy’s history and lifestyle.', 'Vet confirms which vaccines are due.', 'Give due vaccines and record the next visit date.'],
  'vaccines-boosters': ['Check the existing vaccine record.', 'Vet reviews current booster recommendations.', 'Update the record and discuss any next due date.'],
  'vaccines-travel': ['Share your destination and travel dates.', 'Review current records and destination needs.', 'Receive a plan for any required vet visits or documentation.'],
  'grooming-haircut': ['Talk through coat length, style and comfort needs.', 'Brush and bathe as needed before the trim.', 'Shape the coat, tidy face and paws, then check the finish together.'],
  'grooming-bath': ['Brush out loose coat and check skin.', 'Use a suitable shampoo, rinse and condition.', 'Dry gently and finish with a thorough brush.'],
  'grooming-nails': ['Let your dog settle and get comfortable.', 'Trim nails gradually with breaks as needed.', 'Tidy paw pads and apply balm if appropriate.'],
  'grooming-spa': ['Brush and check coat condition.', 'Enjoy a soothing bath and conditioning treatment.', 'Finish with gentle drying, ear clean and brush-out.'],
  'grooming-dressup': ['Choose a comfortable bandana, bow or seasonal accessory.', 'Have the accessory fitted gently with your dog’s comfort first.', 'Take a photo-ready finishing look home.'],
  'medication-review': ['Bring the medication list and current instructions.', 'Review schedule, questions and any changes with the care team.', 'Leave with a clear written plan for the next steps.'],
  'medication-refill': ['Send the current prescription and refill details.', 'The care team checks the patient record and prescription status.', 'We contact you when the request is reviewed.'],
  'medication-followup': ['Discuss progress and any side effects.', 'Review the treatment plan with the care team.', 'Set a follow-up date if one is needed.'],
  'surgery-consult': ['Discuss your dog’s needs and the recommended procedure.', 'Review preparation, estimate and questions.', 'Plan pre-op checks, scheduling and recovery guidance.'],
  'surgery-dental': ['Review eating habits and any oral health concerns.', 'Vet checks teeth and gums and explains findings.', 'Discuss home care or recommended next steps.'],
  'surgery-aftercare': ['Review recovery, appetite, comfort and current instructions.', 'Check the procedure site as appropriate.', 'Update the recovery plan and any follow-up timing.'],
  'daycare-half': ['Share your dog’s routine, temperament and play preferences.', 'Enjoy supervised play and enrichment with rest breaks.', 'Pick up with a short update from the team.'],
  'daycare-full': ['Settle in and meet the care team.', 'Rotate supervised play, enrichment and quiet rest.', 'Pick up with a summary of your dog’s day.'],
  'boarding-night': ['Share feeding, medication and bedtime routines.', 'Stay overnight with supervised care and rest.', 'Receive an update and pickup plan from the team.'],
  'boarding-meet': ['Meet the team and tour the routine.', 'Discuss food, medication, comfort and emergency contacts.', 'Plan what to bring for a future stay.']
};
const saveProcess = db.prepare("UPDATE service_offerings SET process=? WHERE id=? AND process='[]'");
for (const [id, steps] of Object.entries(offeringProcesses)) saveProcess.run(JSON.stringify(steps), id);

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 20_000) { reject(new Error('Request is too large.')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(new Error('Please send valid JSON data.')); }
    });
    req.on('error', reject);
  });
}
function clean(value, max = 200) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function isFutureDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value && value >= new Date().toISOString().slice(0, 10);
}
function isAdmin(req) {
  const expected = process.env.ADMIN_API_KEY;
  const actual = req.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
  const actualBuffer = Buffer.from(actual), expectedBuffer = Buffer.from(expected || '');
  return Boolean(expected && actual && actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer));
}
function serveFile(req, res, pathname) {
  const routes = { '/': 'index.html', '/index.html': 'index.html', '/care': 'care.html', '/care.html': 'care.html', '/styles.css': 'styles.css', '/contact.css': 'contact.css', '/services.css': 'services.css', '/care-page.css': 'care-page.css', '/app.js': 'app.js', '/care.js': 'care.js' };
  const name = routes[pathname];
  if (!name) return send(res, 404, { error: 'Page not found.' });
  const file = path.join(ROOT, name);
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
  fs.readFile(file, (error, content) => {
    if (error) return send(res, 500, { error: 'Unable to load this page.' });
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { status: 'ok', database: 'sqlite' });
    if (req.method === 'GET' && url.pathname === '/api/services') {
      const offerings = db.prepare(`SELECT id,service_id AS serviceId,name,detail,duration,price_label AS price,process
        FROM service_offerings WHERE active=1 ORDER BY rowid`).all();
      const services = db.prepare('SELECT id,name,detail,icon,color,duration FROM services WHERE active=1 ORDER BY rowid').all()
        .map(service => ({ ...service, offerings: offerings.filter(item => item.serviceId === service.id)
          .map(({ serviceId, process, ...offering }) => ({ ...offering, process: JSON.parse(process || '[]') })) }));
      return send(res, 200, { services });
    }
    if (req.method === 'POST' && url.pathname === '/api/appointments') {
      const body = await readBody(req);
      const appointment = {
        name: clean(body.name, 160), email: clean(body.email).toLowerCase(), phone: clean(body.phone, 40),
        dogName: clean(body.dogName, 160), service: clean(body.service, 60), offering: clean(body.offering, 80), date: clean(body.date, 10),
        time: clean(body.time, 40), notes: clean(body.notes, 1000)
      };
      if (!appointment.name || !validEmail(appointment.email) || !appointment.phone || !appointment.dogName ||
          !db.prepare('SELECT 1 FROM service_offerings WHERE id=? AND service_id=? AND active=1').get(appointment.offering, appointment.service) ||
          !isFutureDate(appointment.date) || !appointment.time) {
        return send(res, 400, { error: 'Please complete the required fields with a valid email and future date.' });
      }
      const appointmentId = crypto.randomUUID();
      const ownerId = db.prepare('SELECT id FROM owners WHERE email=?').get(appointment.email)?.id || crypto.randomUUID();
      db.exec('BEGIN');
      try {
        if (!db.prepare('SELECT id FROM owners WHERE email=?').get(appointment.email)) {
          db.prepare('INSERT INTO owners (id,name,email,phone) VALUES (?,?,?,?)').run(ownerId, appointment.name, appointment.email, appointment.phone);
        } else {
          db.prepare('UPDATE owners SET name=?,phone=? WHERE id=?').run(appointment.name, appointment.phone, ownerId);
        }
        let dogId = db.prepare('SELECT id FROM dogs WHERE owner_id=? AND name=?').get(ownerId, appointment.dogName)?.id;
        if (!dogId) {
          dogId = crypto.randomUUID();
          db.prepare('INSERT INTO dogs (id,owner_id,name) VALUES (?,?,?)').run(dogId, ownerId, appointment.dogName);
        }
        db.prepare(`INSERT INTO appointments
          (id,owner_id,dog_id,service_id,offering_id,visit_date,preferred_time,notes)
          VALUES (?,?,?,?,?,?,?,?)`).run(appointmentId, ownerId, dogId, appointment.service, appointment.offering, appointment.date, appointment.time, appointment.notes);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      return send(res, 201, { message: `Thanks, ${appointment.name}! We’ll be in touch to confirm ${appointment.dogName}’s visit.`, appointment: { id: appointmentId, status: 'requested' } });
    }
    if (req.method === 'POST' && url.pathname === '/api/contact') {
      const body = await readBody(req);
      const name = clean(body.name, 160), email = clean(body.email).toLowerCase(), message = clean(body.message, 2000);
      if (!name || !validEmail(email) || message.length < 10) return send(res, 400, { error: 'Please add your name, a valid email, and a message of at least 10 characters.' });
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO contact_messages (id,name,email,message) VALUES (?,?,?,?)').run(id, name, email, message);
      return send(res, 201, { message: 'Message received! Our team will get back to you soon.' });
    }
    if (req.method === 'POST' && url.pathname === '/api/newsletter') {
      const body = await readBody(req), email = clean(body.email).toLowerCase();
      if (!validEmail(email)) return send(res, 400, { error: 'Please enter a valid email address.' });
      db.prepare('INSERT OR IGNORE INTO newsletter_subscribers (id,email) VALUES (?,?)').run(crypto.randomUUID(), email);
      return send(res, 201, { message: 'You’re on the list. Thanks for subscribing!' });
    }
    if (url.pathname.startsWith('/api/admin/')) {
      if (!isAdmin(req)) return send(res, 401, { error: 'Staff authorization required.' });
      if (req.method === 'GET' && url.pathname === '/api/admin/appointments') {
        const rows = db.prepare(`SELECT a.id,a.visit_date AS date,a.preferred_time AS time,a.notes,a.status,a.created_at AS createdAt,
          o.name AS ownerName,o.email,o.phone,d.id AS dogId,d.name AS dogName,s.name AS serviceName,so.name AS offeringName
          FROM appointments a JOIN owners o ON o.id=a.owner_id JOIN dogs d ON d.id=a.dog_id JOIN services s ON s.id=a.service_id
          LEFT JOIN service_offerings so ON so.id=a.offering_id
          ORDER BY a.visit_date,a.created_at`).all();
        return send(res, 200, { appointments: rows });
      }
      const appointmentMatch = url.pathname.match(/^\/api\/admin\/appointments\/([\w-]+)$/);
      if (req.method === 'PATCH' && appointmentMatch) {
        const body = await readBody(req), status = clean(body.status, 20);
        if (!['requested', 'confirmed', 'cancelled', 'completed'].includes(status)) return send(res, 400, { error: 'Invalid appointment status.' });
        const result = db.prepare('UPDATE appointments SET status=? WHERE id=?').run(status, appointmentMatch[1]);
        if (!result.changes) return send(res, 404, { error: 'Appointment not found.' });
        return send(res, 200, { message: 'Appointment status updated.' });
      }
      if (req.method === 'GET' && url.pathname === '/api/admin/care-records') {
        const dogId = clean(url.searchParams.get('dogId'), 80);
        if (!dogId) return send(res, 400, { error: 'Provide a dogId query parameter.' });
        return send(res, 200, { records: db.prepare('SELECT * FROM care_records WHERE dog_id=? ORDER BY record_date DESC').all(dogId) });
      }
      if (req.method === 'POST' && url.pathname === '/api/admin/care-records') {
        const body = await readBody(req);
        const types = ['vaccination', 'medication', 'surgery', 'grooming', 'wellness', 'boarding'];
        const dogId = clean(body.dogId, 80), type = clean(body.recordType, 20), title = clean(body.title, 160);
        const recordDate = clean(body.recordDate, 10);
        if (!db.prepare('SELECT 1 FROM dogs WHERE id=?').get(dogId) || !types.includes(type) || !title || !/^\d{4}-\d{2}-\d{2}$/.test(recordDate)) {
          return send(res, 400, { error: 'Provide a valid dogId, recordType, title and YYYY-MM-DD recordDate.' });
        }
        const id = crypto.randomUUID();
        db.prepare(`INSERT INTO care_records (id,dog_id,appointment_id,record_type,title,details,record_date,follow_up_date)
          VALUES (?,?,?,?,?,?,?,?)`).run(id, dogId, clean(body.appointmentId, 80) || null, type, title, clean(body.details, 2000), recordDate, clean(body.followUpDate, 10) || null);
        return send(res, 201, { id, message: 'Care record saved.' });
      }
      return send(res, 404, { error: 'Admin endpoint not found.' });
    }
    if ((req.method === 'GET' || req.method === 'HEAD') && !url.pathname.startsWith('/api/')) return serveFile(req, res, url.pathname);
    return send(res, 404, { error: 'Not found.' });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: 'The request could not be completed.' });
  }
});

server.listen(PORT, () => console.log(`Good Dog Club is ready at http://localhost:${PORT}; SQLite database: ${DB_PATH}`));
process.on('SIGINT', () => { db.close(); server.close(() => process.exit(0)); });
process.on('SIGTERM', () => { db.close(); server.close(() => process.exit(0)); });
