# Good Dog Club

A responsive dog-care website with a Node.js API and a persistent SQLite database. It has no third-party runtime dependencies. It uses Node's built-in `node:sqlite` module, so use Node.js 22.5 or newer.

The service categories on the home page open dedicated same-site detail pages (`/care.html?service=...`). Those pages are generated from the SQLite catalog and include available options, sample prices, estimated durations, and included steps. Choosing an option returns to the appointment form with that choice selected.

## Run locally on Windows

In PowerShell, change to this project folder and start the server:

```powershell
cd "C:\Users\AKSHATA BELLAD\OneDrive\Full stack sdp"
node server.js
```

If PowerShell says `node` is not recognized, install Node.js 22.5 or newer and reopen PowerShell. In the Codex desktop environment, the bundled runtime can be started directly:

```powershell
& "C:\Users\AKSHATA BELLAD\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.js
```

Open <http://localhost:3000>. On first startup, the server creates `data/gooddog.sqlite` and creates/seeds the tables. The SQLite file is the database and should be backed up. Do not upload it to a public web host or S3.

## SQLite tables

- `services` — service categories/tabs loaded dynamically by the frontend.
- `service_offerings` — choices within each tab, including descriptions, estimated duration and sample price label.
- `owners` — owner name, unique email and phone.
- `dogs` — dogs linked to an owner.
- `appointments` — service requests, dates, time preferences, notes and status.
- `care_records` — vaccinations, medication, surgery, grooming, wellness and boarding notes, with optional follow-up date.
- `contact_messages` — contact form messages and staff status.
- `newsletter_subscribers` — unique newsletter email subscriptions.

Foreign keys connect dogs to owners, appointments to owners/dogs/services, and care records to dogs and optional appointments. The server creates schema on startup. The old JSON files are no longer used.

## Public API

- `GET /api/health` — server and database status.
- `GET /api/services` — active service tabs and their active offerings from SQLite.
- `POST /api/appointments` — validates and saves the owner, dog, selected service and specific offering together.
- `POST /api/contact` — saves a contact message.
- `POST /api/newsletter` — saves a unique subscriber email.

## Staff API

Set a long random secret in the `ADMIN_API_KEY` environment variable before starting the server. Keep it on the server only; never put it in `app.js` or HTML. PowerShell example:

```powershell
$env:ADMIN_API_KEY = "replace-with-a-long-random-secret"
node server.js
```

Send staff requests with `Authorization: Bearer <ADMIN_API_KEY>`:

- `GET /api/admin/appointments` — list appointments with owner, dog and service details.
- `PATCH /api/admin/appointments/:id` with `{"status":"confirmed"}` — update status (`requested`, `confirmed`, `cancelled`, `completed`).
- `GET /api/admin/care-records?dogId=<dog-id>` — list a dog's care records.
- `POST /api/admin/care-records` — add a care record. JSON fields: `dogId`, `recordType`, `title`, `recordDate`; optional: `appointmentId`, `details`, `followUpDate`. Allowed record types: `vaccination`, `medication`, `surgery`, `grooming`, `wellness`, `boarding`.

Example appointment request JSON:

```json
{
  "name": "Alex Smith",
  "email": "alex@example.com",
  "phone": "555-0100",
  "dogName": "Milo",
  "service": "wellness",
  "offering": "wellness-checkup",
  "date": "2030-05-12",
  "time": "Morning (8am–11am)",
  "notes": "First visit"
}
```

## Configuration

- `PORT` — HTTP port; defaults to `3000`.
- `DB_PATH` — SQLite file path; defaults to `data/gooddog.sqlite`.
- `ADMIN_API_KEY` — required for staff API routes.

The sample clinic identity, contact details, testimonial and images should be replaced before publication. For a real clinic, use HTTPS, restrict server access, keep encrypted off-site database backups, and establish retention/access policies for health information.

## Hosting note

SQLite is a file database. S3 can host the static frontend files (`index.html`, `styles.css`, `contact.css`, `services.css`, and `app.js`), but it cannot run this Node.js API or host a live writable SQLite database. To keep the full app together on AWS, run the Node server on an EC2 instance with an EBS volume for `data/gooddog.sqlite`, then put HTTPS in front of it. If you host the frontend separately on S3/CloudFront, configure the API origin and CORS before deployment. Do not place the live SQLite database file in S3 or use Lambda's temporary filesystem for persistent records.
