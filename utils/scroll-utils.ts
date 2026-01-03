// Helper utilities for smooth scrolling navigation

export const scrollToSection = (sectionId: string, behavior: ScrollBehavior = 'smooth') => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior, block: 'start' });
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
