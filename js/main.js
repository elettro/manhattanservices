(function () {
  const viewportQuery = window.matchMedia('(max-width: 1024px)');

  const syncClassicCarousel = (carousel) => {
    const track = carousel.querySelector('.classic-carousel-track');
    const slides = Array.from(carousel.querySelectorAll('.classic-carousel-slide'));
    const inputs = Array.from(carousel.querySelectorAll('.classic-carousel-input'));

    if (!track || !slides.length || !inputs.length) return;

    let scrollTimeout;

    const getNearestSlideIndex = () => {
      const slideWidth = slides[0].getBoundingClientRect().width || 1;
      return Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / slideWidth)));
    };

    const setCheckedSlide = (index) => {
      const input = inputs[index];
      if (input) input.checked = true;
    };

    const scrollToSlide = (index, behavior) => {
      const slide = slides[index];
      if (!slide) return;

      track.scrollTo({
        left: slide.offsetLeft,
        behavior
      });
    };

    const handleScroll = () => {
      if (!viewportQuery.matches) return;

      window.clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        setCheckedSlide(getNearestSlideIndex());
      }, 90);
    };

    track.addEventListener('scroll', handleScroll, { passive: true });

    inputs.forEach((input, index) => {
      input.addEventListener('change', () => {
        if (!input.checked || !viewportQuery.matches) return;
        scrollToSlide(index, 'smooth');
      });
    });

    const resetForViewport = () => {
      if (viewportQuery.matches) {
        const activeIndex = Math.max(0, inputs.findIndex((input) => input.checked));
        scrollToSlide(activeIndex, 'auto');
      } else {
        track.scrollTo({ left: 0, behavior: 'auto' });
      }
    };

    if (typeof viewportQuery.addEventListener === 'function') {
      viewportQuery.addEventListener('change', resetForViewport);
    } else {
      viewportQuery.addListener(resetForViewport);
    }

    resetForViewport();
  };

  document.querySelectorAll('.classic-carousel').forEach(syncClassicCarousel);
})();
