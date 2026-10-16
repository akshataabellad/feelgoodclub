const bookingForm = document.querySelector('#booking-form');
const statusBox = document.querySelector('.form-status');
const dateInput = bookingForm.elements.date;
const localToday = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
dateInput.min = localToday;

bookingForm.addEventListener('submit', async event => {
  event.preventDefault();
  statusBox.className = 'form-status';
  if (!bookingForm.elements.service.value || !bookingForm.elements.offering.value) {
    statusBox.classList.add('error');
    statusBox.textContent = 'Choose a care type and a specific option before requesting a visit.';
    document.querySelector('#care').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  statusBox.textContent = 'Sending your request…';
  const data = Object.fromEntries(new FormData(bookingForm));
  try {
    const response = await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Please check your details and try again.');
    statusBox.classList.add('success');
    statusBox.textContent = result.message;
    bookingForm.reset();
    dateInput.min = localToday;
    document.querySelector('#selected-care-label').textContent = 'Choose a care type and option above.';
    document.querySelectorAll('.offering-choose').forEach(button => {
      button.textContent = 'Choose this care ↗';
      button.setAttribute('aria-pressed', 'false');
    });
  } catch (error) {
    statusBox.classList.add('error');
    statusBox.textContent = error.message || 'We couldn’t send that just now. Please try again.';
  }
});

const newsletterForm = document.querySelector('#newsletter-form');
newsletterForm.addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.querySelector('.newsletter-status');
  status.textContent = 'Adding you…';
  try {
    const response = await fetch('/api/newsletter', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: new FormData(newsletterForm).get('email') })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not subscribe.');
    status.textContent = result.message;
    newsletterForm.reset();
  } catch (error) {
    status.textContent = error.message || 'Could not subscribe right now.';
  }
});

const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
menuToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});
navLinks.addEventListener('click', event => {
  if (event.target.closest('a')) {
    navLinks.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }
});

async function loadServices() {
  try {
    const response = await fetch('/api/services');
    if (!response.ok) throw new Error('Unable to load services.');
    const { services } = await response.json();
    if (!Array.isArray(services)) return;
    const tabs = document.querySelector('#care-tabs');
    tabs.replaceChildren();
    for (const service of services) {
      const tab = document.createElement('a');
      tab.className = `care-tab ${service.color}`;
      tab.href = `/care.html?service=${encodeURIComponent(service.id)}`;
      const icon = document.createElement('span');
      icon.textContent = service.icon;
      const name = document.createElement('span');
      name.textContent = service.name;
      const count = document.createElement('small');
      count.textContent = `${(service.offerings || []).length} options`;
      tab.append(icon, name, count);
      tabs.append(tab);
    }

    const query = new URLSearchParams(location.search);
    const requestedService = query.get('service');
    const requestedOffering = query.get('offering');
    const service = services.find(item => item.id === requestedService);
    const offering = service?.offerings?.find(item => item.id === requestedOffering);
    if (service && offering) {
      bookingForm.elements.service.value = service.id;
      bookingForm.elements.offering.value = offering.id;
      document.querySelector('#selected-care-label').textContent = `${service.name} · ${offering.name} · ${offering.duration} · ${offering.price}`;
      history.replaceState({}, '', `${location.pathname}${location.hash}`);
    }
  } catch {
    document.querySelector('#care-tabs').textContent = 'Care options are temporarily unavailable. Please refresh or contact our team.';
  }
}

loadServices();

const contactForm = document.querySelector('#contact-form');
contactForm.addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.querySelector('.contact-status');
  status.textContent = 'Sending your note…';
  try {
    const response = await fetch('/api/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(contactForm)))
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not send your message.');
    status.textContent = result.message;
    contactForm.reset();
  } catch (error) {
    status.textContent = error.message || 'Could not send your message right now.';
  }
});
