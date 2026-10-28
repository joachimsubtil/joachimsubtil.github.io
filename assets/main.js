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
