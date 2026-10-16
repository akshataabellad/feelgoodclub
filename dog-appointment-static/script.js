const services = {
  grooming: {
    kicker: 'FEEL-GOOD GROOMING', title: 'A fresh look.<br>A very happy pup.',
    description: 'Gentle, one-on-one grooming tailored to your dog’s coat, comfort and personality. Plenty of patience and praise included.',
    image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=1000&q=85', alt: 'Dog receiving gentle grooming',
    options: [['Bath & brush', 'From 45 min · $45'], ['Full groom & style', 'From 90 min · $75'], ['Puppy’s first groom', 'From 45 min · $50']]
  },
  surgery: {
    kicker: 'EXPERT VETERINARY CARE', title: 'A steady hand.<br>A softer landing.',
    description: 'Start with a one-on-one consultation. Our veterinary team will talk through your dog’s needs, the care plan and what to expect.',
    image: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=1000&q=85', alt: 'Veterinarian gently examining a dog',
    options: [['Surgery consultation', '30 min · $65'], ['Pre-op assessment', '45 min · $90'], ['Post-op check-in', '20 min · $35']]
  },
  wellness: {
    kicker: 'LITTLE CHECK-INS, BIG LOVE', title: 'Feeling good<br>looks good on them.',
    description: 'Routine check-ups and preventive care help keep your dog feeling their best at every age and every stage.',
    image: 'https://images.unsplash.com/photo-1587559070757-f72a388edbba?auto=format&fit=crop&w=1000&q=85', alt: 'Veterinarian caring for a dog',
    options: [['Nose-to-tail check-up', '30 min · $55'], ['Vaccination visit', '20 min · From $30'], ['Senior dog wellness', '45 min · $85']]
  },
  daycare: {
    kicker: 'ROOM TO PLAY, TIME TO REST', title: 'A good day out<br>for good dogs.',
    description: 'Small-group play, cozy rest breaks and caring supervision make our day care a happy place to be a dog.',
    image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1000&q=85', alt: 'Two dogs playing together outdoors',
    options: [['Meet & greet', '20 min · Complimentary'], ['Half day play', 'Up to 4 hours · $32'], ['Full day play', 'Up to 8 hours · $52']]
  }
};

const tabs = [...document.querySelectorAll('.service-tab')];
const bookingService = document.querySelector('#booking-service');
const bookingOption = document.querySelector('#booking-option');
const servicePages = { grooming: 'grooming.html', surgery: 'surgery.html', wellness: 'wellness.html', daycare: 'daycare.html' };

function renderOptions(service, selected = '') {
  bookingOption.replaceChildren(...services[service].options.map(([name]) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    option.selected = name === selected;
    return option;
  }));
}

function showService(key) {
  const data = services[key];
  if (!data) return;
  tabs.forEach(tab => {
    const active = tab.dataset.service === key;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  const activeTab = document.querySelector(`#tab-${key}`);
  document.querySelector('#service-panel').setAttribute('aria-labelledby', activeTab.id);
  document.querySelector('#service-kicker').textContent = data.kicker;
  document.querySelector('#service-title').innerHTML = data.title;
  document.querySelector('#service-description').textContent = data.description;
  const image = document.querySelector('#service-image');
  image.src = data.image;
  image.alt = data.alt;
  document.querySelector('#offerings').replaceChildren(...data.options.map(([name, detail]) => {
    const row = document.createElement('div');
    row.className = 'offering';
    const title = document.createElement('strong'); title.textContent = name;
    const price = document.createElement('span'); price.textContent = detail;
    row.append(title, price);
    return row;
  }));
  bookingService.value = key;
  renderOptions(key);
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => {
    const destination = new URL(servicePages[tab.dataset.service], window.location.href);
    window.location.href = destination.href;
  });
  tab.addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next = (index + direction + tabs.length) % tabs.length;
    tabs[next].focus();
    const destination = new URL(servicePages[tabs[next].dataset.service], window.location.href);
    window.location.href = destination.href;
  });
});

if (bookingService) bookingService.addEventListener('change', () => renderOptions(bookingService.value));
const serviceBook = document.querySelector('#service-book');
if (serviceBook) serviceBook.addEventListener('click', event => {
  if (document.querySelector('#booking')) {
    event.preventDefault();
    document.querySelector('#booking').scrollIntoView({ behavior: 'smooth' });
    bookingService.focus({ preventScroll: true });
  }
});

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.topbar nav');
menuToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));

const bookingForm = document.querySelector('#booking-form');
if (bookingForm) bookingForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const form = new FormData(event.currentTarget);
  const status = document.querySelector('#form-status');
  status.textContent = `Thanks, ${form.get('name')}! Your ${form.get('option').toLowerCase()} request for ${form.get('dog')} is ready. This static demo does not send the request, so please call or email the clinic to confirm.`;
  status.classList.add('success');
});

const requestedService = new URLSearchParams(window.location.search).get('service');
if (bookingService) {
  const initialService = requestedService && services[requestedService] ? requestedService : 'grooming';
  bookingService.value = initialService;
  renderOptions(initialService);
}
