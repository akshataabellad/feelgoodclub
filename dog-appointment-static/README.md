# Paw & Pine website

A static website built with HTML, CSS, and JavaScript. It does not need a package install or a build step.

## Run locally

1. Open the `dog-appointment-static` folder.
2. Start a local web server from that folder. If Python is installed, run:

   ```powershell
   py -m http.server 8000
   ```

3. Open [http://localhost:8000](http://localhost:8000) in your browser.
4. Stop the server with **Ctrl+C** in the terminal.

## Pages

- `index.html` — Home
- `services.html` — Care services
- `grooming.html`, `surgery.html`, `wellness.html`, `daycare.html` — Individual service details
- `about.html` — Our approach
- `booking.html` — Appointment request form

Each service tab opens its own detail page, and the booking link carries the selected service into the form. The form is a front-end demo; it shows a confirmation but does not send or save appointment details.
