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
  const sections = ['home', 'about', 'project', 'github', 'resume', 'skill', 'achievements', 'education'];
  const scrollPosition = window.scrollY + window.innerHeight / 2;

  // If reached the bottom of the page, return the last section
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50) {
    return sections[sections.length - 1];
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
