const categoryId = new URLSearchParams(location.search).get('service');
const intro = document.querySelector('#care-intro');
const options = document.querySelector('#detail-offerings');

function makeLink(service, className = '') {
  const link = document.createElement('a');
  link.className = className;
  link.href = `/care.html?service=${encodeURIComponent(service.id)}`;
  link.textContent = `${service.icon} ${service.name}`;
  return link;
}

function showUnavailable(message) {
  options.replaceChildren();
  const note = document.createElement('p');
  note.className = 'care-error';
  note.textContent = message;
  options.append(note);
}

async function loadCarePage() {
  try {
    const response = await fetch('/api/services');
    if (!response.ok) throw new Error('The care catalog could not be loaded.');
    const { services } = await response.json();
    const service = services.find(item => item.id === categoryId);
    const serviceLinks = document.querySelector('#care-page-tabs');
    for (const item of services) {
      const link = makeLink(item, `care-page-tab ${item.color}${item.id === categoryId ? ' current' : ''}`);
      if (item.id === categoryId) link.setAttribute('aria-current', 'page');
      serviceLinks.append(link);
    }
    if (!service) {
      intro.innerHTML = '<div class="eyebrow">GOOD DOG CARE</div><h1>Let’s find the right<br><em>kind of care.</em></h1><p>Choose one of the service categories below to explore its options.</p>';
      document.querySelector('#offerings-title').textContent = 'Choose a care category';
      document.querySelector('#offerings-subtitle').textContent = 'Each category has its own visit options and pricing details.';
      options.replaceChildren();
      for (const item of services) options.append(makeLink(item, `care-category-card ${item.color}`));
      return;
    }

    document.title = `${service.name} — Good Dog Club`;
    intro.replaceChildren();
    const eyebrow = document.createElement('div');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'GOOD DOG CARE · SERVICE GUIDE';
    const title = document.createElement('h1');
    title.append(document.createTextNode(`${service.name.split(' ')[0]} `));
    const titleEm = document.createElement('em');
    titleEm.textContent = service.name.split(' ').slice(1).join(' ') || 'care';
    title.append(titleEm);
    const description = document.createElement('p');
    description.textContent = service.detail;
    intro.append(eyebrow, title, description);
    document.querySelector('#offerings-title').textContent = `Explore ${service.name.toLowerCase()}`;
    document.querySelector('#offerings-subtitle').textContent = 'Compare the options below. Each card explains what’s included, how long it takes and the sample price.';
    options.replaceChildren();

    for (const offering of service.offerings || []) {
      const card = document.createElement('article');
      card.className = `detail-offering-card ${service.color}`;
      const top = document.createElement('div');
      top.className = 'detail-offering-top';
      const name = document.createElement('h3');
      name.textContent = offering.name;
      const price = document.createElement('span');
      price.className = 'detail-price';
      price.textContent = offering.price;
      top.append(name, price);
      const description = document.createElement('p');
      description.className = 'detail-description';
      description.textContent = offering.detail;
      const duration = document.createElement('div');
      duration.className = 'detail-duration';
      duration.textContent = `◷ ${offering.duration}`;
      const processHeading = document.createElement('h4');
      processHeading.textContent = 'What happens';
      const steps = document.createElement('ol');
      steps.className = 'process-steps';
      for (const step of offering.process || []) {
        const item = document.createElement('li');
        item.textContent = step;
        steps.append(item);
      }
      const button = document.createElement('a');
      button.className = 'button button-dark detail-book-button';
      button.href = `/?service=${encodeURIComponent(service.id)}&offering=${encodeURIComponent(offering.id)}#booking`;
      button.innerHTML = 'Request this option <span>↗</span>';
      card.append(top, description, duration, processHeading, steps, button);
      options.append(card);
    }
  } catch (error) {
    showUnavailable(error.message || 'Care options are temporarily unavailable. Please try again later.');
  }
}

loadCarePage();
