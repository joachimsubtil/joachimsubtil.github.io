// ==========================================================
// Portfolio Joachim Subtil — petits comportements de la page
// ==========================================================

// Vidéos : clic sur le bouton lecture → lance la vidéo, et met en pause les autres
const players = document.querySelectorAll('.js-video');

players.forEach((player) => {
  const video = player.querySelector('video');
  const button = player.querySelector('.play');

  button.addEventListener('click', () => {
    video.controls = true;
    video.play();
  });

  video.addEventListener('play', () => {
    player.classList.add('is-playing');
    players.forEach((other) => {
      const otherVideo = other.querySelector('video');
      if (otherVideo !== video) otherVideo.pause();
    });
  });
});

// Images agrandies au clic (galeries)
const lightbox = document.querySelector('.js-lightbox');

if (lightbox) {
  const bigImage = lightbox.querySelector('img');
  document.querySelectorAll('.js-zoom').forEach((item) => {
    item.addEventListener('click', () => {
      const image = item.querySelector('img');
      bigImage.src = item.dataset.full || image.src; // version grand format si elle existe
      bigImage.alt = image.alt;
      lightbox.showModal();
    });
  });
  // un clic n'importe où (ou la touche Échap) referme
  lightbox.addEventListener('click', () => lightbox.close());
}

// Accueil : les vignettes vidéo se lancent au survol (ordinateur)
// ou quand elles sont à l'écran (téléphone, pas de survol possible)
const previews = document.querySelectorAll('.js-preview');
const canHover = window.matchMedia('(hover: hover)').matches;

previews.forEach((card) => {
  const video = card.querySelector('video');
  const start = () => video.play().catch(() => {});
  const stop = () => {
    card.classList.remove('is-previewing');
    video.pause();
    video.currentTime = 0;
  };
  // la miniature ne disparaît qu'une fois la vidéo vraiment lancée
  video.addEventListener('playing', () => card.classList.add('is-previewing'));

  if (canHover) {
    card.addEventListener('mouseenter', start);
    card.addEventListener('mouseleave', stop);
  } else if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start();
      else stop();
    }, { threshold: 0.6 }).observe(card);
  }
});

// Apparition douce des sections au défilement
const reveals = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px -10% 0px' }); // dès que le haut du bloc entre à l'écran, même pour une très longue galerie
  reveals.forEach((el) => observer.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('is-visible'));
}

// Carrousels de clips : flèches, compteur, et seul le clip affiché tourne en boucle
document.querySelectorAll('.js-slider').forEach((slider) => {
  const track = slider.querySelector('.clip-track');
  const clips = track.querySelectorAll('video');
  const prev = slider.querySelector('.to-prev');
  const next = slider.querySelector('.to-next');
  const count = slider.querySelector('.slider-count');

  // on glisse au doigt grâce au défilement natif ; les flèches avancent d'un clip
  prev.addEventListener('click', () => track.scrollBy({ left: -track.clientWidth }));
  next.addEventListener('click', () => track.scrollBy({ left: track.clientWidth }));

  const update = () => {
    const current = Math.round(track.scrollLeft / track.clientWidth);
    count.textContent = `${current + 1} / ${clips.length}`;
    prev.disabled = current === 0;
    next.disabled = current === clips.length - 1;
  };
  track.addEventListener('scroll', update, { passive: true });
  update();

  if ('IntersectionObserver' in window) {
    const clipObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.play().catch(() => {});
        else entry.target.pause();
      });
    }, { threshold: 0.6 });
    clips.forEach((clip) => clipObserver.observe(clip));
  }
});

// ==========================================================
// Animations « caméra » : barre de montage, REC, chiffres, curseur viseur,
// titre en générique, photos en volet, vignettes en 3D
// Tout reste immobile pour qui a demandé à réduire les animations.
// ==========================================================
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// Barre de montage : une tête de lecture rouge avance avec le défilement
// + un compteur « REC » du temps passé sur la page
const scrub = document.createElement('div');
scrub.className = 'scrub';
scrub.setAttribute('aria-hidden', 'true');
scrub.innerHTML = '<span></span>';
document.body.append(scrub);

const updateScrub = () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrub.style.setProperty('--p', max > 0 ? Math.min(window.scrollY / max, 1) : 0);
};
window.addEventListener('scroll', updateScrub, { passive: true });
window.addEventListener('resize', updateScrub);
updateScrub();

const timecode = document.createElement('div');
timecode.className = 'timecode';
timecode.setAttribute('aria-hidden', 'true');
document.body.append(timecode);
const startedAt = Date.now();
const two = (n) => String(n).padStart(2, '0');
const tick = () => {
  const s = Math.floor((Date.now() - startedAt) / 1000);
  timecode.textContent = `REC ${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`;
};
tick();
setInterval(tick, 1000);

// Chiffres qui défilent : « 82K », « +235K », « 36,2k »… partent de 0
const counters = [...document.querySelectorAll('.num:not(.word)')]
  .map((el) => ({ el, match: el.textContent.trim().match(/^([^\d]*)([\d]+(?:,\d+)?)(.*)$/) }))
  .filter((c) => c.match);

if (!calm && 'IntersectionObserver' in window) {
  const countUp = ({ el, match }) => {
    const [, before, digits, after] = match;
    const target = parseFloat(digits.replace(',', '.'));
    const decimals = (digits.split(',')[1] || '').length;
    const duration = 1400;
    const t0 = performance.now();
    el.style.minWidth = `${el.getBoundingClientRect().width}px`; // la largeur finale est réservée : rien ne bouge autour
    const frame = (now) => {
      const t = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = before + (target * eased).toFixed(decimals).replace('.', ',') + after;
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      countUp(counters.find((c) => c.el === entry.target));
      countObserver.unobserve(entry.target);
    });
  }, { threshold: 0.6 });
  counters.forEach((c) => countObserver.observe(c.el));
}

// Titre en générique : les lettres du grand titre s'allument une à une, en rouge puis en blanc
const title = document.querySelector('main h1.display');

if (title && !calm) {
  title.setAttribute('aria-label', title.textContent.replace(/\s+/g, ' ').trim());
  let index = 0;
  const split = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) return split(child);
      if (child.nodeType !== Node.TEXT_NODE) return;
      const pieces = document.createDocumentFragment();
      [...child.textContent].forEach((char) => {
        if (/\s/.test(char)) return pieces.append(char);
        const letter = document.createElement('span');
        letter.className = 'letter';
        letter.style.setProperty('--i', index++);
        letter.textContent = char;
        pieces.append(letter);
      });
      child.replaceWith(pieces);
    });
  };
  split(title);
  title.classList.add('is-titling');
}

// Photos en volet : chaque image se dévoile de bas en haut en arrivant à l'écran
const wipes = document.querySelectorAll('.cell, .gallery > .gallery-item, .strip, .about-photo img');

if (!calm && 'IntersectionObserver' in window) {
  const wipeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-shown');
      wipeObserver.unobserve(entry.target);
      // une fois dévoilée, la photo n'est plus découpée (l'effet 3D peut déborder un peu)
      entry.target.addEventListener('transitionend', () => entry.target.classList.remove('wipe', 'is-shown'), { once: true });
    });
  }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
  wipes.forEach((el) => {
    // dans une rangée de photos, elles se dévoilent l'une après l'autre
    const siblings = el.parentElement ? [...el.parentElement.children] : [el];
    el.style.setProperty('--i', Math.max(siblings.indexOf(el), 0));
    el.classList.add('wipe');
    wipeObserver.observe(el);
  });
}

// Ordinateur seulement : curseur viseur, vignettes et photos qui s'inclinent vers la souris
if (finePointer) {
  // viseur d'appareil photo : un point rouge collé à la souris, et un cadre de mise au point qui le suit
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span class="cursor-frame"></span><span class="cursor-dot"></span><span class="cursor-label"></span>';
  document.body.append(cursor);
  document.documentElement.classList.add('has-cursor'); // cache la flèche de la souris
  const frame = cursor.querySelector('.cursor-frame');
  const dot = cursor.querySelector('.cursor-dot');
  const label = cursor.querySelector('.cursor-label');

  // le texte affiché dans le viseur selon ce qu'on survole
  const labels = [['.project-card', 'Voir'], ['.play', 'Lecture'], ['.js-zoom', 'Agrandir']];
  labels.forEach(([selector, text]) => document.querySelectorAll(selector).forEach((el) => { el.dataset.cursor = text; }));

  let x = -100, y = -100, cx = -100, cy = -100;
  window.addEventListener('mousemove', (e) => {
    x = e.clientX; y = e.clientY;
    cursor.classList.add('is-on');
    const target = e.target.closest('[data-cursor]');
    const text = target ? target.dataset.cursor : '';
    if (label.textContent !== text) label.textContent = text;
    cursor.classList.toggle('has-label', !!text);
    cursor.classList.toggle('is-link', !text && !!e.target.closest('a, button'));
    // sur une vidéo en lecture, la vraie flèche revient pour utiliser les commandes
    cursor.classList.toggle('is-native', !!e.target.closest('.is-playing video'));
  }, { passive: true });
  document.addEventListener('mouseleave', () => cursor.classList.remove('is-on'));
  window.addEventListener('mousedown', () => cursor.classList.add('is-pressed'));
  window.addEventListener('mouseup', () => cursor.classList.remove('is-pressed'));

  const follow = () => {
    const ease = calm ? 1 : 0.28; // le cadre suit le point avec un léger retard
    cx += (x - cx) * ease;
    cy += (y - cy) * ease;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    frame.style.transform = `translate(${cx}px, ${cy}px)`;
    label.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(follow);
  };
  follow();

  if (!calm) {
    // les photos d'une bande continue restent à plat pour ne pas casser la bande
    document.querySelectorAll('.project-card .thumb, .gallery-item:not(.strip .gallery-item)').forEach((thumb) => {
      const angle = thumb.classList.contains('thumb') ? 8 : 6; // les photos, souvent plus grandes, s'inclinent un peu moins
      thumb.classList.add('tilt');
      thumb.addEventListener('mousemove', (e) => {
        const box = thumb.getBoundingClientRect();
        const px = (e.clientX - box.left) / box.width - 0.5;
        const py = (e.clientY - box.top) / box.height - 0.5;
        thumb.style.setProperty('--ry', `${px * angle}deg`);
        thumb.style.setProperty('--rx', `${py * -angle}deg`);
        thumb.classList.add('is-tilting');
      });
      thumb.addEventListener('mouseleave', () => {
        thumb.classList.remove('is-tilting');
        thumb.style.setProperty('--rx', '0deg');
        thumb.style.setProperty('--ry', '0deg');
      });
    });
  }
}
