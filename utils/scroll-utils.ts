// Helper utilities for smooth scrolling navigation

export const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (!element) return;

  const top = element.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top, behavior: 'smooth' });
};

export const getCurrentSection = (): string => {
  const sections = ['home', 'about', 'project', 'github', 'resume', 'skill', 'achievements', 'education'];
  const scrollPosition = window.scrollY + window.innerHeight / 2;

  // Use a more generous threshold for bottom detection (checking if we are near the bottom of the page)
  if (Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 250) {
    return 'education';
  }

  for (let i = sections.length - 1; i >= 0; i--) {
    const sectionId = sections[i];
    const element = document.getElementById(sectionId);
    if (element) {
      if (scrollPosition >= element.offsetTop) {
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
