import './styles.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { fragrances } from './fragrances.js';

gsap.registerPlugin(ScrollTrigger);
const $ = (selector) => document.querySelector(selector);
const all = (selector) => [...document.querySelectorAll(selector)];
const dialog = $('#drawer');
const content = $('#drawer-content');
const menu = $('.menu-toggle');
const nav = $('#nav');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const format = (amount) => '৳' + amount.toLocaleString('en-BD');
const comboItems = new Set();
const bagKey = 'resh-homepage-bag';
const size = fragrances.length;
const wrap = (value) => ((value % size) + size) % size;
const find = (id) => fragrances.find((fragrance) => fragrance.id === id);
let bag = [];
let active = 0;
let note = 0;
let stage;
let trigger;
let autoplayTimer;
let panel;
let lastOpener;
let finderStep = 0;
let answers = [];

try {
  const saved = JSON.parse(localStorage.getItem(bagKey));
  if (Array.isArray(saved)) {
    bag = saved.filter((line) => Array.isArray(line) && line.length === 4 && new Set(line).size === 4 && line.every(find));
  }
} catch {
  // The preview remains usable with storage disabled.
}

const displayOffset = (index) => wrap(index - active + 2) - 2;

function bottle(fragrance) {
  return `<span class="bottle-art" aria-hidden="true"><span class="fallback-bottle" style="--label:${fragrance.light}"><span>RESH<small>${fragrance.name.toUpperCase()}</small></span></span><img src="/media/bottles/${fragrance.id}.webp" alt="" width="416" height="512" decoding="async"></span>`;
}

function productUrl(fragrance) {
  return fragrance.slug
    ? `https://reshbangladesh.com/product/${fragrance.slug}/`
    : 'https://reshbangladesh.com/shop/';
}

function applyNote(index) {
  const changed = note !== index;
  note = index;
  const fragrance = fragrances[active];
  $('#note-title').textContent = fragrance.notes[index][0];
  $('#note-description').textContent = fragrance.notes[index][1];
  $('#note-index').textContent = `0${index + 1}`;
  const photo = $('#note-photo');
  const hasPhoto = fragrance.id === 'knights-oud' && index === 1;
  photo.hidden = !hasPhoto;
  if (hasPhoto) {
    photo.href = '/media/notes/credits.txt';
    photo.querySelector('img').src = '/media/notes/agarwood.webp';
    photo.querySelector('span').textContent = 'Agarwood · photo credit ↗';
  }
  $('.notes-frame').dataset.layer = index;
  all('[data-note]').forEach((button, step) => button.setAttribute('aria-pressed', step === index));
  const title = $('#note-title');
  title.getAnimations().forEach((animation) => animation.cancel());
  if (changed && !motion.matches) {
    title.animate([{ opacity: .44, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 225, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
}

function updateProfile(animateColor = false) {
  const fragrance = fragrances[active];
  $('#hero-scent').textContent = fragrance.name;
  $('#hero-family').textContent = `${fragrance.family} · ${fragrance.original ? 'Resh Originals' : 'Resh Collection'}`;
  $('#hero-index').textContent = `0${active + 1} / 0${size}`;
  $('#notes-scent').textContent = `· ${fragrance.name}`;
  const hero = $('.hero');
  const wash = $('.hero-wash');
  const notes = $('.notes');
  const color = fragrance.surface;
  hero.style.setProperty('--tone-ink', fragrance.ink);
  notes.style.setProperty('--tone', color);
  notes.style.setProperty('--tone-ink', fragrance.ink);

  if (animateColor && !motion.matches) {
    const layer = document.createElement('div');
    layer.style.backgroundColor = color;
    wash.append(layer);
    const animation = layer.animate(
      [{ clipPath: 'circle(0% at 50% 45%)' }, { clipPath: 'circle(100% at 50% 45%)' }],
      { duration: 435, easing: 'cubic-bezier(.24,.69,.25,1)', fill: 'forwards' },
    );
    animation.onfinish = () => {
      if (layer.parentNode === wash) {
        hero.style.setProperty('--tone', color);
        layer.remove();
      }
    };
  } else {
    wash.replaceChildren();
    hero.style.setProperty('--tone', color);
  }

  $('#notes-fallback').innerHTML = bottle(fragrance);
  const pickers = all('[data-carousel]');
  pickers.forEach((button, index) => {
    const offset = displayOffset(index);
    button.dataset.offset = offset;
    button.style.setProperty('--slot', offset);
    button.style.setProperty('--distance', Math.abs(offset));
    button.setAttribute('aria-pressed', offset === 0);
  });
  applyNote(note);
  stage?.update(true);
}

function changeScent(index, { delta, profile = false } = {}) {
  const next = wrap(index);
  const distance = delta ?? wrap(next - active + size / 2) - size / 2;
  if (next !== active) {
    active = next;
    stage?.select(distance, !profile);
    updateProfile(!profile);
  }
  if (profile) scrollToLayer(0);
}

function stopAutoplay() {
  window.clearInterval(autoplayTimer);
  autoplayTimer = undefined;
  $('#autoplay').setAttribute('aria-pressed', 'false');
  $('#hero-scent').setAttribute('aria-live', 'polite');
}

function toggleAutoplay() {
  if (autoplayTimer) return stopAutoplay();
  $('#autoplay').setAttribute('aria-pressed', 'true');
  $('#hero-scent').setAttribute('aria-live', 'off');
  autoplayTimer = window.setInterval(() => {
    if (document.hidden || dialog.open || $('.hero').getBoundingClientRect().bottom < innerHeight * .55) {
      stopAutoplay();
      return;
    }
    changeScent(active + 1, { delta: 1 });
  }, 2900);
}

function setFilter(filter) {
  all('[data-filter]').forEach((button) => button.setAttribute('aria-pressed', button.dataset.filter === filter));
  const displayed = fragrances.filter((fragrance) =>
    filter === 'all' || (filter === 'originals' && fragrance.original) || fragrance.family.toLowerCase() === filter);
  $('#product-grid').innerHTML = displayed.map((fragrance) => `
    <article class="product" style="--surface:${fragrance.surface};--shade:${fragrance.ink}">
      <div class="product-top"><p>${fragrance.family}</p><h3>${fragrance.name}</h3></div>
      <button class="product-picture" data-product="${fragrance.id}" aria-label="Explore ${fragrance.name}'s notes">${bottle(fragrance)}</button>
      <div class="product-action"><a href="${productUrl(fragrance)}" aria-label="Shop ${fragrance.name} at RESH">Shop scent ↗</a><button class="round" data-combo="${fragrance.id}" aria-label="Add ${fragrance.name} to your discovery set">+</button></div>
    </article>`).join('');
  stage?.update(true);
}

function updateBag() {
  $('#bag-count').textContent = bag.length;
  try {
    localStorage.setItem(bagKey, JSON.stringify(bag));
  } catch {
    // Keep the current session's bag intact.
  }
}

const questions = [
  { text: 'What feels most like you?', options: ['Fresh and airy', 'Warm and soft', 'Deep and woody'] },
  { text: 'When will you wear it?', options: ['Every day', 'Evenings', 'Special occasions'] },
  { text: 'How would you like to explore?', options: ['Try four scents for ৳1,000', 'Explore one signature bottle'] },
];

function comboTray() {
  const selection = [...comboItems];
  return Array.from({ length: 4 }, (_, index) => {
    const fragrance = find(selection[index]);
    return fragrance
      ? `<div class="tray-slot filled" data-vial="${fragrance.id}" style="--tint:${fragrance.surface}"><span class="sample-vial" aria-hidden="true"><span>RESH</span></span><span>${fragrance.name}</span></div>`
      : `<div class="tray-slot"><span>${index + 1}</span></div>`;
  }).join('');
}

function renderCombo(flyingFrom, id) {
  $('#discovery-vials').innerHTML = comboTray();
  $('#inline-count').textContent = `${comboItems.size} / 4 selected`;
  all('[data-add]').forEach((button) => { button.disabled = comboItems.size !== 4; });
  all('[data-pick]').forEach((button) => {
    const picked = comboItems.has(button.dataset.pick);
    button.setAttribute('aria-pressed', picked);
    button.setAttribute('aria-disabled', !picked && comboItems.size === 4);
  });
  const slot = id && document.querySelector(`#discovery-vials [data-vial="${id}"] .sample-vial`);
  if (!slot || !flyingFrom || motion.matches) return;
  const from = flyingFrom.getBoundingClientRect();
  const to = slot.getBoundingClientRect();
  slot.animate([
    { opacity: .4, transform: `translate(${from.left - to.left}px,${from.top - to.top}px) rotate(-22deg) scale(.52)` },
    { opacity: 1, transform: 'translate(0,0) rotate(0) scale(1)' },
  ], { duration: 360, easing: 'cubic-bezier(.22,.75,.24,1)' });
}

function renderPanel() {
  $('#drawer-title').textContent = { builder: 'Build your set', bag: 'Your bag', finder: 'Scent finder' }[panel];
  if (panel === 'builder') {
    content.innerHTML = `<p>Choose four 6 ml fragrances for ${format(1000)}.</p>
      <div class="combo-tray" aria-hidden="true">${comboTray()}</div>
      <fieldset><legend id="selection-count" aria-live="polite">${comboItems.size} of 4 selected</legend>
      ${fragrances.map((fragrance) => `<label class="drawer-choice"><span>${fragrance.name} · ${fragrance.family}</span>
        <input type="checkbox" value="${fragrance.id}" ${comboItems.has(fragrance.id) ? 'checked' : comboItems.size === 4 ? 'disabled' : ''}></label>`).join('')}
      </fieldset><button class="button primary" data-add ${comboItems.size !== 4 ? 'disabled' : ''}>Add set to bag · ${format(1000)}</button>`;
  } else if (panel === 'bag') {
    const lines = bag.map((line, index) => `<div class="bag-line"><div><strong>4 × 6 ml Discovery Set</strong>
      <small>${line.map((id) => find(id).name).join(', ')}</small>
      </div><button data-remove="${index}" aria-label="Remove discovery set ${index + 1}">Remove</button></div>`);
    content.innerHTML = bag.length
      ? `${lines.join('')}<p class="drawer-total">Subtotal · ${format(bag.length * 1000)}</p>
        <p>This local bag is a preview. Place an order through the live RESH store.</p><a class="button primary" href="https://reshbangladesh.com/product/choose-your-own-combo/">Order a combo on RESH ↗</a>`
      : '<p>Your bag is empty.</p><button class="button primary" data-panel="builder">Build a discovery set</button>';
  } else if (finderStep < questions.length) {
    const question = questions[finderStep];
    content.innerHTML = `<form id="quiz"><fieldset><legend tabindex="-1" id="quiz-question">${finderStep + 1} / 3 · ${question.text}</legend>
      ${question.options.map((option, index) => `<label class="drawer-choice"><span>${option}</span>
      <input type="radio" name="answer" value="${index}" ${answers[finderStep] === index ? 'checked' : ''} required></label>`).join('')}
      </fieldset><button class="button primary" type="submit">${finderStep === 2 ? 'Show my result' : 'Continue'}</button>
      ${finderStep > 0 ? '<button class="quiet-link" type="button" data-back>Back</button>' : ''}</form>`;
  } else {
    const recommendation = find(answers[0] === 0 ? 'pahari'
      : answers[0] === 1 ? 'vampire-blood' : answers[1] === 2 ? 'resh-oud' : 'knights-oud');
    const sampler = answers[2] === 0;
    content.innerHTML = `<p tabindex="-1" id="quiz-result"><strong>${recommendation.name}</strong> is your starting point.</p>
      ${sampler ? `<p>Try it alongside three other scents in a discovery set.</p><button class="button primary" data-panel="builder" data-prefill="${recommendation.id}">Review the four-scent set</button>` :
        `<p>Explore this scent in the live shop.</p><a class="button primary" href="${productUrl(recommendation)}">Explore ${recommendation.name} ↗</a>`}
      <button class="quiet-link" data-restart>Start over</button>`;
  }
}

function openPanel(name, opener) {
  stopAutoplay();
  if (opener) lastOpener = opener;
  panel = name;
  renderPanel();
  if (!dialog.open) dialog.showModal();
  dialog.scrollTo({ top: 0, behavior: 'instant' });
  $('#close').focus({ preventScroll: true });
}

function closeMenu() {
  nav.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
}

function scrollToLayer(index) {
  if (!trigger) {
    applyNote(index);
    $('#notes').scrollIntoView();
    stage?.update();
    return;
  }
  const end = trigger.end - trigger.start;
  window.scrollTo({ top: trigger.start + end * (index === 0 ? .025 : index / 3 + .08), behavior: 'smooth' });
}

function scrollUpdate(self) {
  const step = Math.min(2, Math.floor(self.progress * 3));
  if (step !== note) applyNote(step);
  stage?.update();
}

const responsiveMotion = gsap.matchMedia();
responsiveMotion.add('(prefers-reduced-motion: no-preference)', () => {
  trigger = ScrollTrigger.create({
    trigger: '#notes',
    pin: '.notes-frame',
    start: 'top top',
    end: () => '+=' + Math.round(window.innerHeight * 1.15),
    anticipatePin: 1,
    onUpdate: scrollUpdate,
    onRefresh: (self) => {
      scrollUpdate(self);
      stage?.update(true);
    },
  });
  return () => {
    trigger = undefined;
    stage?.update(true);
    stopAutoplay();
  };
});

ScrollTrigger.create({
  trigger: '#top',
  start: 'top top',
  end: 'bottom 50%',
  onLeave: stopAutoplay,
});

ScrollTrigger.create({
  trigger: '#notes',
  start: 'top 44%',
  endTrigger: '#collection',
  end: 'top 44%',
  onToggle: ({ isActive }) => setCurrentLink(isActive ? 'notes' : null),
});
ScrollTrigger.create({
  trigger: '#collection',
  start: 'top 44%',
  endTrigger: '#discovery',
  end: 'top 44%',
  onToggle: ({ isActive }) => setCurrentLink(isActive ? 'collection' : null),
});
ScrollTrigger.create({
  trigger: '#discovery',
  start: 'top 44%',
  onEnter: () => setCurrentLink('discovery'),
  onLeaveBack: () => setCurrentLink(null),
});

function setCurrentLink(section) {
  if (!section) {
    const sections = ['discovery', 'collection', 'notes'];
    section = sections.find((id) => document.getElementById(id).getBoundingClientRect().top < innerHeight * .44) || 'top';
  }
  all('#nav a').forEach((link) => {
    if (link.hash === '#' + section) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

menu.addEventListener('click', () => menu.setAttribute('aria-expanded', nav.classList.toggle('open')));
nav.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeMenu();
    menu.focus();
  }
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('button, a');
  if (!button) return;
  const { open, filter, filterLink, product, panel: nextPanel, remove, combo, pick, carousel } = button.dataset;
  if (nav.contains(button)) closeMenu();
  if (open) openPanel(open, nav.contains(button) ? menu : button);
  if (filter || filterLink) setFilter(filter || filterLink);
  if (product) changeScent(fragrances.findIndex((fragrance) => fragrance.id === product), { profile: true });
  if (carousel !== undefined) {
    stopAutoplay();
    changeScent(Number(carousel), { delta: Number(button.dataset.offset) });
  }
  if (combo || pick) {
    const id = combo || pick;
    if (pick && comboItems.has(id)) comboItems.delete(id);
    else if (comboItems.size < 4) comboItems.add(id);
    renderCombo(pick ? button : null, id);
    if (combo) openPanel('builder', button);
  }
  if (nextPanel) {
    if (button.dataset.prefill) {
      comboItems.clear();
      comboItems.add(button.dataset.prefill);
      for (const fragrance of fragrances) {
        if (fragrance.original && comboItems.size < 4) comboItems.add(fragrance.id);
      }
      renderCombo();
    }
    openPanel(nextPanel);
  }
  if (button.hasAttribute('data-add') && comboItems.size === 4) {
    bag.push([...comboItems]);
    comboItems.clear();
    updateBag();
    openPanel('bag', dialog.open ? undefined : button);
    renderCombo();
  }
  if (remove !== undefined) {
    bag.splice(Number(remove), 1);
    updateBag();
    openPanel('bag');
  }
  if (button.hasAttribute('data-back') || button.hasAttribute('data-restart')) {
    finderStep = button.hasAttribute('data-restart') ? 0 : finderStep - 1;
    if (button.hasAttribute('data-restart')) answers = [];
    renderPanel();
    $('#quiz-question')?.focus();
  }
});

$('#close').addEventListener('click', () => dialog.close());
document.addEventListener('load', (event) => {
  if (event.target.matches?.('.bottle-art img')) event.target.dataset.ready = '';
}, true);
dialog.addEventListener('click', (event) => {
  if (event.target === dialog && event.clientX < dialog.getBoundingClientRect().left) dialog.close();
});
dialog.addEventListener('close', () => {
  const focusTarget = lastOpener?.matches(':disabled') ? $('#discovery-picker button') : lastOpener;
  focusTarget?.focus({ preventScroll: true });
});
content.addEventListener('change', (event) => {
  if (panel !== 'builder' || event.target.type !== 'checkbox') return;
  const { value, checked } = event.target;
  if (checked && comboItems.size < 4) comboItems.add(value);
  else if (!checked) comboItems.delete(value);
  $('#selection-count').textContent = `${comboItems.size} of 4 selected`;
  $('.combo-tray').innerHTML = comboTray();
  all('#drawer input[type=checkbox]').forEach((input) => {
    input.disabled = !input.checked && comboItems.size === 4;
  });
  renderCombo();
});
content.addEventListener('submit', (event) => {
  if (event.target.id !== 'quiz') return;
  event.preventDefault();
  answers[finderStep] = Number(new FormData(event.target).get('answer'));
  finderStep += 1;
  renderPanel();
  ($('#quiz-question') || $('#quiz-result')).focus();
});

all('[data-note]').forEach((button) => button.addEventListener('click', () => scrollToLayer(Number(button.dataset.note))));
for (const [selector, direction] of [['#prev', -1], ['#next', 1]]) {
  $(selector).addEventListener('click', () => {
    stopAutoplay();
    changeScent(active + direction, { delta: direction });
  });
}
$('#lineup').addEventListener('keydown', (event) => {
  const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
  if (direction) {
    event.preventDefault();
    stopAutoplay();
    changeScent(active + direction, { delta: direction });
  }
});
const lineup = $('#lineup');
let swipeStart;
let swipedAt = -Infinity;
lineup.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'mouse' && event.isPrimary) swipeStart = event.clientX;
});
lineup.addEventListener('pointercancel', () => { swipeStart = undefined; });
lineup.addEventListener('pointerup', (event) => {
  if (swipeStart === undefined || !event.isPrimary) return;
  const distance = swipeStart - event.clientX;
  swipeStart = undefined;
  if (Math.abs(distance) < 36) return;
  swipedAt = performance.now();
  stopAutoplay();
  const direction = Math.sign(distance);
  changeScent(active + direction, { delta: direction });
});
lineup.addEventListener('click', (event) => {
  if (performance.now() - swipedAt < 350 && event.detail) event.stopPropagation();
}, true);
lineup.addEventListener('pointerenter', (event) => {
  if (event.pointerType === 'mouse') stopAutoplay();
});
$('.hero').addEventListener('focusin', stopAutoplay);
$('#autoplay').addEventListener('click', toggleAutoplay);
$('#rotate').addEventListener('click', () => stage?.rotate());

$('#lineup-pickers').innerHTML = fragrances.map((fragrance, index) => `
  <button data-carousel="${index}" aria-label="Feature ${fragrance.name}" aria-pressed="false">${bottle(fragrance)}</button>`).join('');
$('#discovery-picker').innerHTML = fragrances.map((fragrance) => `
  <button data-pick="${fragrance.id}" aria-pressed="false"><span style="--surface:${fragrance.surface}">${bottle(fragrance)}</span><span>${fragrance.name}</span></button>`).join('');

updateProfile();
updateBag();
setFilter('all');
renderCombo();
document.fonts.ready.then(() => ScrollTrigger.refresh());

import('./bottle.js').then(({ createStage }) => {
  stage = createStage(fragrances, () => ({ active }));
  stage?.update();
}).catch(() => {
  // Static renders carry the full lineup when WebGL is unavailable.
});
