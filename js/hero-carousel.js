(function () {
  const carousels = document.querySelectorAll('[data-carousel]');

  carousels.forEach((carousel) => {
    const slides = Array.from(carousel.querySelectorAll('.hero-slide'));
    const dots = Array.from(carousel.querySelectorAll('[data-carousel-dot]'));
    const prevButton = carousel.querySelector('[data-carousel-prev]');
    const nextButton = carousel.querySelector('[data-carousel-next]');

    if (!slides.length) return;

    let currentIndex = 0;
    let autoRotate;

    const setSlide = (index) => {
      currentIndex = (index + slides.length) % slides.length;

      slides.forEach((slide, slideIndex) => {
        slide.classList.toggle('is-active', slideIndex === currentIndex);
      });

      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle('is-active', dotIndex === currentIndex);
      });
    };

    const startAutoRotate = () => {
      autoRotate = window.setInterval(() => {
        setSlide(currentIndex + 1);
      }, 4500);
    };

    const resetAutoRotate = () => {
      window.clearInterval(autoRotate);
      startAutoRotate();
    };

    prevButton?.addEventListener('click', () => {
      setSlide(currentIndex - 1);
      resetAutoRotate();
    });

    nextButton?.addEventListener('click', () => {
      setSlide(currentIndex + 1);
      resetAutoRotate();
    });

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const index = Number(dot.getAttribute('data-carousel-dot'));
        setSlide(index);
        resetAutoRotate();
      });
    });

    carousel.addEventListener('mouseenter', () => window.clearInterval(autoRotate));
    carousel.addEventListener('mouseleave', startAutoRotate);

    setSlide(0);
    startAutoRotate();
  });
})();
