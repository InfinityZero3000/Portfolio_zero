// Helper utilities for smooth scrolling navigation

export const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (!element) return;

  // Use Lenis if available (injected via window.__lenis by App.tsx)
  const lenis = (window as any).__lenis;
  if (lenis) {
    lenis.scrollTo(element, { offset: 0, duration: 1.2 });
  } else {
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: 'smooth' });
  }
};

export const getCurrentSection = (): string => {
  const sections = ['home', 'project', 'about', 'resume', 'skill', 'education'];
  const scrollPosition = window.scrollY + window.innerHeight / 2;

  for (const sectionId of sections) {
    const element = document.getElementById(sectionId);
    if (element) {
      const { offsetTop, offsetHeight } = element;
      if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
        return sectionId;
      }
    }
  }

  return 'home';
};

export const setupScrollObserver = (callback: (sectionId: string) => void) => {
  const handleScroll = () => {
    const currentSection = getCurrentSection();
    callback(currentSection);
  };

  // Throttle scroll events
  let ticking = false;
  const scrollListener = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScroll();
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', scrollListener, { passive: true });

  return () => {
    window.removeEventListener('scroll', scrollListener);
  };
};
