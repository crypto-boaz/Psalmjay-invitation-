const intro = document.querySelector('#intro');
const story = document.querySelector('#story');
const enter = document.querySelector('#enter');
const gallery = document.querySelector('#galleryScroll');
const track = document.querySelector('#galleryTrack');
const cards = [...document.querySelectorAll('.gallery-card')];
const lightbox = document.querySelector('#lightbox');
const lightboxImage = document.querySelector('#lightboxImage');
const captions = ['THE BEGINNING', 'LITTLE THINGS', 'OUR PROMISE', 'FOREVER STARTS HERE', 'THE CELEBRATION'];
const photos = [
  'assets/optimized/photo-01.jpg',
  'assets/optimized/photo-05.jpg',
  'assets/optimized/photo-03.jpg',
  'assets/optimized/photo-04.jpg',
  'assets/optimized/photo-02.jpg'
];
let galleryIndex = 0;
let lightboxIndex = 0;
let pointerStart = null;
let dragDelta = 0;
let audioContext = null;
let ambientNodes = [];

document.body.classList.add('locked');
enter.addEventListener('click', () => {
  intro.classList.add('leaving');
  story.classList.add('entered');
  story.setAttribute('aria-hidden', 'false');
  document.body.classList.remove('locked');
  window.setTimeout(() => document.querySelector('#top').scrollIntoView({ behavior: 'smooth' }), 240);
});

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));

function updateGallery() {
  const rect = gallery.getBoundingClientRect();
  const range = Math.max(1, gallery.offsetHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, -rect.top / range));
  const maxTravel = Math.max(0, track.scrollWidth - window.innerWidth * 0.78);
  const offset = progress * maxTravel;
  track.style.transform = `translate3d(${-offset + dragDelta}px,0,0)`;
  let closest = 0;
  let closestDistance = Infinity;
  cards.forEach((card, index) => {
    const bounds = card.getBoundingClientRect();
    const distance = Math.abs(bounds.left + bounds.width / 2 - window.innerWidth / 2);
    if (distance < closestDistance) { closest = index; closestDistance = distance; }
    card.classList.toggle('active', distance < window.innerWidth * 0.41);
  });
  galleryIndex = closest;
  document.querySelector('#galleryProgress').innerHTML = `${String(closest + 1).padStart(2, '0')} <i>—</i> 05`;
  document.querySelector('#progressFill').style.width = `${progress * 100}%`;
}
let galleryTick = false;
function requestGalleryUpdate() {
  if (galleryTick) return;
  galleryTick = true;
  requestAnimationFrame(() => { updateGallery(); galleryTick = false; });
}
window.addEventListener('scroll', requestGalleryUpdate, { passive: true });
window.addEventListener('resize', requestGalleryUpdate);
requestGalleryUpdate();

track.addEventListener('pointerdown', event => {
  if (event.target.closest('.gallery-card')) {
    pointerStart = { x: event.clientX, y: window.scrollY, dragged: false };
    track.setPointerCapture(event.pointerId);
    track.classList.add('dragging');
  }
});
track.addEventListener('pointermove', event => {
  if (!pointerStart) return;
  const dx = event.clientX - pointerStart.x;
  if (Math.abs(dx) > 7) pointerStart.dragged = true;
  dragDelta = dx;
  requestGalleryUpdate();
});
function finishDrag() {
  if (!pointerStart) return;
  const start = pointerStart;
  pointerStart = null;
  track.classList.remove('dragging');
  if (start.dragged) {
    track.dataset.dragged = 'true';
    const maxTravel = Math.max(1, track.scrollWidth - window.innerWidth * 0.78);
    const scrollRange = Math.max(1, gallery.offsetHeight - window.innerHeight);
    const currentProgress = Math.min(1, Math.max(0, -(gallery.getBoundingClientRect().top) / scrollRange));
    const nextProgress = Math.min(1, Math.max(0, currentProgress - dragDelta / maxTravel));
    dragDelta = 0;
    window.scrollTo({ top: start.y + (nextProgress - currentProgress) * scrollRange, behavior: 'smooth' });
  }
  requestGalleryUpdate();
}
track.addEventListener('pointerup', finishDrag);
track.addEventListener('pointercancel', finishDrag);
track.addEventListener('lostpointercapture', finishDrag);

function showPhoto(index) {
  lightboxIndex = (index + photos.length) % photos.length;
  lightboxImage.classList.add('changing');
  window.setTimeout(() => {
    lightboxImage.src = photos[lightboxIndex];
    document.querySelector('#lightboxCaption').textContent = captions[lightboxIndex];
    document.querySelector('#lightboxCount').textContent = `${String(lightboxIndex + 1).padStart(2, '0')} / 05`;
    lightboxImage.onload = () => lightboxImage.classList.remove('changing');
  }, 160);
}
function openLightbox(index, sourceCard = cards[index]) {
  showPhoto(index);
  const source = sourceCard.getBoundingClientRect();
  const frame = document.querySelector('.lightbox-frame');
  frame.style.setProperty('--origin-x', `${source.left}px`);
  frame.style.setProperty('--origin-y', `${source.top}px`);
  frame.style.setProperty('--origin-w', `${source.width}px`);
  frame.style.setProperty('--origin-h', `${source.height}px`);
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('locked');
  document.querySelector('#lightboxClose').focus();
}
function closeLightbox() {
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('locked');
}
cards.forEach(card => card.addEventListener('click', () => {
  if (track.dataset.dragged === 'true') { track.dataset.dragged = 'false'; return; }
  openLightbox(Number(card.dataset.index), card);
}));
document.querySelector('#lightboxClose').addEventListener('click', closeLightbox);
document.querySelector('#photoPrev').addEventListener('click', () => showPhoto(lightboxIndex - 1));
document.querySelector('#photoNext').addEventListener('click', () => showPhoto(lightboxIndex + 1));
lightbox.addEventListener('click', event => { if (event.target.classList.contains('lightbox-backdrop')) closeLightbox(); });
window.addEventListener('keydown', event => {
  if (!lightbox.classList.contains('open')) return;
  if (event.key === 'Escape') closeLightbox();
  if (event.key === 'ArrowLeft') showPhoto(lightboxIndex - 1);
  if (event.key === 'ArrowRight') showPhoto(lightboxIndex + 1);
});
let touchStartX = 0;
lightbox.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
lightbox.addEventListener('touchend', event => {
  const delta = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(delta) > 55) showPhoto(lightboxIndex + (delta < 0 ? 1 : -1));
}, { passive: true });

document.querySelector('#rsvpButton').addEventListener('click', () => {
  window.alert('Thank you for being part of our story. RSVP details will be shared soon.');
});

document.querySelector('#soundToggle').addEventListener('click', async event => {
  const button = event.currentTarget;
  const status = button.querySelector('i');
  if (ambientNodes.length) {
    ambientNodes.forEach(node => { try { node.stop(); } catch {} });
    ambientNodes = [];
    status.textContent = 'OFF';
    button.title = 'Ambient sound is off';
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) { button.title = 'Ambient audio is not supported in this browser'; return; }
  audioContext ||= new AudioContextClass();
  await audioContext.resume();
  [110, 164.81, 220].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index === 1 ? 'triangle' : 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.value = index === 1 ? 0.003 : 0.002;
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    ambientNodes.push(oscillator);
  });
  status.textContent = 'ON';
  button.title = 'Ambient sound is on';
});
