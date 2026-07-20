import React, { useState, createContext, useContext, memo, lazy, Suspense, useEffect, useCallback, startTransition, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NAV_ITEMS, PROJECTS, SKILLS, ACHIEVEMENTS, EDUCATION_DATA, BIO, NAME } from './constants';
import { Language } from './types';
import { getTranslations } from './i18n/translations';
import { Sun, Moon, Download, Award, GraduationCap, FileText, Github, Linkedin, Mail, MapPin, Calendar, Menu, X, Cpu } from 'lucide-react';
import clsx from 'clsx';
import { scrollToSection, setupScrollObserver } from './utils/scroll-utils';
import { ThemeContext, useTheme, type Theme } from './contexts/ThemeContext';
import { cacheManager, DATA_CACHE_TTL } from './utils/cache-manager';
import VisualizationErrorBoundary from './components/VisualizationErrorBoundary';

// Lazy load components — only one WebGL viz is ever active at a time
const GlobeViz  = lazy(() => import('./components/GlobeViz'));
const SunViz    = lazy(() => import('./components/SunViz'));
const StarfieldBackground = lazy(() => import('./components/StarfieldBackground'));
const GithubPinnedRepos   = lazy(() => import('./components/GithubPinnedRepos'));

// --- Context ---
interface LangContextType {
  lang: Language;
  toggleLang: () => void;
}
const LangContext = createContext<LangContextType>({ lang: Language.EN, toggleLang: () => { } });
const useLang = () => useContext(LangContext);

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children,
  delay = 0,
  className
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.1 }}
    transition={{ duration: 0.6, ease: "easeOut", delay }}
    className={className}
  >
    {children}
  </motion.div>
);

// --- Layout Components ---

const NavBar: React.FC<{ activeSection: string; onNavigate: (section: string) => void }> = memo(({ activeSection, onNavigate }) => {
  const { lang, toggleLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const t = getTranslations(lang);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (key: string) => {
    onNavigate(key);
    setMobileOpen(false);
  };

  return (
    <nav
      className="fixed top-0 left-0 w-full bg-dark-900/85 backdrop-blur-md border-b border-dark-700 z-50"
      style={{ position: 'fixed' }}
    >
      {/* Main bar */}
      <div className="max-w-7xl mx-auto h-16 flex items-center px-6 md:px-16">

      {/* Left: Logo */}
      <div className="flex items-center flex-shrink-0">
        <span className="text-brand-600 text-2xl font-extrabold tracking-tight uppercase leading-none">
          ZERO
        </span>
      </div>

      {/* Desktop nav items */}
      <div className="hidden md:flex items-center gap-1 ml-6">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={clsx(
                "px-3 py-1.5 text-sm font-medium transition-all duration-200 relative",
                isActive
                  ? "text-brand-600 after:content-[''] after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-brand-600 after:rounded-full"
                  : "text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              )}
            >
              {item.label[lang]}
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: Lang + Theme (desktop) */}
      <div className="hidden md:flex items-center gap-1">
        <button
          onClick={toggleLang}
          className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          {lang}
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Mobile: theme toggle + hamburger */}
      <div className="flex md:hidden items-center gap-1">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      </div>{/* end main bar */}

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden md:hidden border-t border-dark-700 bg-dark-900"
          >
            <div className="px-4 py-3 flex flex-col gap-0.5">
              {NAV_ITEMS.map((item) => {
                const isActive = activeSection === item.key;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavigate(item.key)}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-left w-full transition-all duration-200",
                      isActive
                        ? "text-brand-600 border-l-2 border-brand-600 bg-brand-600/10 pl-3.5"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Icon size={16} />
                    {item.label[lang]}
                  </button>
                );
              })}
              <div className="mt-2 pt-2 border-t border-dark-700 flex items-center justify-between px-4 py-1">
                <span className="text-white/40 text-xs uppercase tracking-widest">{t.nav.language}</span>
                <button
                  onClick={toggleLang}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  {lang}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
});

const SectionWrapper: React.FC<{
  children: React.ReactNode;
  title?: string;
  id: string;
  showHeader?: boolean;
}> = ({ children, title, id, showHeader = true }) => (
  <section
    id={id}
    className="w-full relative"
  >
    {showHeader && title && (
      <div className="pt-24 pb-16 px-6 md:px-16 max-w-7xl mx-auto">
        <Reveal>
          <header className="mb-8 border-b border-gray-800 pb-4">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight uppercase">
              <span className="text-brand-600">/</span> {title}
            </h1>
          </header>
        </Reveal>
        {children}
      </div>
    )}
    {!showHeader && children}
  </section>
);

// --- Sections ---

const HomeSection: React.FC = memo(() => {
  const { lang } = useLang();
  const { theme } = useTheme();
  const t = getTranslations(lang);
  const [visualizationPhase, setVisualizationPhase] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    setVisualizationPhase('loading');
  }, [theme]);

  const handleVisualizationReady = useCallback(() => {
    setVisualizationPhase('ready');
  }, []);

  const handleVisualizationError = useCallback((_error?: Error) => {
    setVisualizationPhase('error');
  }, []);

  const loaderLabel = lang === Language.VI ? 'Đang khởi tạo Trái Đất' : 'Initializing Earth';
  const visualizationStatus = visualizationPhase === 'ready'
    ? (lang === Language.VI ? 'Mô phỏng đã sẵn sàng' : 'Visualization ready')
    : visualizationPhase === 'error'
      ? (lang === Language.VI ? 'Không thể tải mô phỏng' : 'Visualization failed to load')
      : loaderLabel;

  // Handler for when globe is fully zoomed out - scroll to next section
  const handleZoomOut = useCallback(() => {
    scrollToSection('project');
  }, []);

  return (
    <section id="home" className="relative w-full h-screen">
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {visualizationStatus}
      </span>
      <VisualizationErrorBoundary key={theme} onError={handleVisualizationError}>
        <Suspense fallback={null}>
          {/* Only mount the active viz — never run two WebGL contexts simultaneously */}
          <div className="absolute inset-0 h-screen">
            {theme === 'dark' ? (
              <GlobeViz
                onZoomOut={handleZoomOut}
                onGlobeReady={handleVisualizationReady}
                onGlobeError={handleVisualizationError}
              />
            ) : (
              <SunViz
                onReady={handleVisualizationReady}
                onError={handleVisualizationError}
              />
            )}
          </div>
        </Suspense>
      </VisualizationErrorBoundary>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.65,
          background: 'linear-gradient(to top, var(--page-bg) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none md:w-1/2"
        style={{
          opacity: 0.55,
          background: 'linear-gradient(to right, var(--page-bg) 0%, transparent 80%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
        className="absolute bottom-12 left-6 md:bottom-24 md:left-16 z-10 max-w-2xl pointer-events-none"
      >
        <h2 className="text-brand-500 font-mono text-sm md:text-base mb-2 tracking-widest uppercase">
          {t.home.jobTitle}
        </h2>
        <h1 className="text-5xl md:text-8xl font-extrabold text-white leading-none mb-6">
          HELLO <br /> WORLD<span className="text-brand-600">.</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl font-light leading-relaxed max-w-lg">
          {BIO[lang]}
        </p>
      </motion.div>
    </section>
  );
});

const ProjectSection: React.FC = memo(() => {
  const { lang } = useLang();
  const t = getTranslations(lang);
  const [expanded, setExpanded] = useState(false);

  const VISIBLE_COUNT = 6; // show 6 cards (3 rows); 3rd row fades out until expanded
  const visibleProjects = expanded ? PROJECTS : PROJECTS.slice(0, VISIBLE_COUNT);

  return (
    <SectionWrapper id="project" title={t.project.title}>
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {visibleProjects.map((project, idx) => {
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: idx * 0.05 }}
              >
                <div
                  className="group flex flex-col gap-4 transition-all duration-300"
                >
                  {/* Image */}
                  <div className="relative overflow-hidden rounded-xl bg-dark-800 aspect-video">
                    <img
                      src={project.image}
                      alt={project.title}
                      loading="lazy"
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Hover overlay with buttons */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                      {project.link && (
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/20"
                        >
                          <Github size={15} />
                          GitHub
                        </a>
                      )}
                      {project.demo && (
                        <a
                          href={project.demo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                          Demo
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="text-xl font-extrabold text-white leading-snug mb-2">
                      {project.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                      {project.description[lang]}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {project.tech.map(t => (
                        <span key={t} className="text-xs font-mono text-gray-300 bg-dark-800 border border-dark-700 px-2 py-0.5 rounded-md cursor-default transition-all duration-200 hover:text-brand-400 hover:border-brand-600 hover:bg-brand-900/20 hover:-translate-y-0.5">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Gradient fade + View More button */}
        {!expanded && (
          <div
            className="absolute bottom-0 left-0 right-0 h-[420px] flex items-end justify-center pb-6 pointer-events-none"
            style={{ background: 'linear-gradient(to top, var(--page-bg) 30%, transparent)' }}
          >
            <div className="pointer-events-auto">
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_28px_rgba(220,38,38,0.5)]"
            >
              {t.project.viewAll}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            </div>
          </div>
        )}

        {/* Collapse button when expanded */}
        {expanded && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center gap-2 border border-dark-700 hover:border-brand-600 text-white/60 hover:text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
            >
              {t.project.showLess}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
            </button>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
});

const SkillSection: React.FC = memo(() => {
  const { lang } = useLang();
  const t = getTranslations(lang);

  return (
    <SectionWrapper id="skill" title={t.skills.title}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {SKILLS.map((section, idx) => (
          <Reveal key={idx} delay={idx * 0.05}>
            <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 hover:border-brand-600/40 transition-colors duration-300 h-full flex flex-col">
              <h3 className="text-xs font-bold text-brand-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-0.5 h-3.5 bg-brand-600 rounded-full flex-shrink-0" />
                {section.category[lang]}
              </h3>
              <div className="flex flex-col gap-4 flex-1">
                {section.items.map((skill) => {
                  const levelInfo = SKILL_LEVEL_MAP[skill.level] ?? SKILL_LEVEL_MAP['Basic'];
                  return (
                    <div key={skill.name} className="group">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors font-medium leading-none">{skill.name}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${levelInfo.bg} ${levelInfo.color} whitespace-nowrap flex-shrink-0`}>
                          {levelInfo.text[lang]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionWrapper>
  );
});

// --- Skill level display map (module-level constant — never recreated on render) ---
const SKILL_LEVEL_MAP: Record<string, { text: { [key in Language]: string }; color: string; bg: string }> = {
  Beginner:     { text: { [Language.EN]: 'Beginner',     [Language.VI]: 'Mới bắt đầu' }, color: 'text-gray-400',   bg: 'bg-gray-900/50'   },
  Basic:        { text: { [Language.EN]: 'Basic',         [Language.VI]: 'Cơ bản'       }, color: 'text-blue-400',   bg: 'bg-blue-900/30'   },
  Intermediate: { text: { [Language.EN]: 'Intermediate',  [Language.VI]: 'Trung cấp'    }, color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  Advanced:     { text: { [Language.EN]: 'Advanced',      [Language.VI]: 'Nâng cao'     }, color: 'text-green-400',  bg: 'bg-green-900/30'  },
  Expert:       { text: { [Language.EN]: 'Expert',        [Language.VI]: 'Chuyên gia'   }, color: 'text-brand-400',  bg: 'bg-brand-900/30'  },
};

const GH_REPO_COUNT_CACHE_KEY = 'gh_repo_count';
let repoCountRequest: Promise<number> | null = null;

const loadGithubRepoCount = async () => {
  const cached = await cacheManager.get<number>(GH_REPO_COUNT_CACHE_KEY, 'localStorage');
  if (cached !== null) return cached;

  repoCountRequest ??= fetch('https://api.github.com/users/InfinityZero3000/repos?per_page=100&type=all')
    .then((response) => {
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
      return response.json();
    })
    .then(async (data) => {
      const count = Array.isArray(data) ? data.length : 8;
      await cacheManager.set(GH_REPO_COUNT_CACHE_KEY, count, {
        ttl: DATA_CACHE_TTL,
        storage: 'localStorage',
      });
      return count;
    })
    .finally(() => {
      repoCountRequest = null;
    });

  return repoCountRequest;
};

// --- Achievement Section helpers ---
const CATEGORY_META: Record<string, { label: { [key in Language]: string }; color: string; bg: string; border: string }> = {
  research:  { label: { [Language.EN]: 'Research',  [Language.VI]: 'Nghiên Cứu'  }, color: 'text-purple-400',  bg: 'bg-purple-900/30',  border: 'border-purple-500/40' },
  project:   { label: { [Language.EN]: 'Project',   [Language.VI]: 'Dự Án'       }, color: 'text-brand-400',   bg: 'bg-brand-900/30',   border: 'border-brand-500/40'  },
  ai:        { label: { [Language.EN]: 'AI / ML',   [Language.VI]: 'AI / ML'     }, color: 'text-cyan-400',    bg: 'bg-cyan-900/30',    border: 'border-cyan-500/40'   },
  education: { label: { [Language.EN]: 'Education', [Language.VI]: 'Học Vấn'     }, color: 'text-green-400',   bg: 'bg-green-900/30',   border: 'border-green-500/40'  },
  award:     { label: { [Language.EN]: 'Award',     [Language.VI]: 'Giải Thưởng' }, color: 'text-yellow-400',  bg: 'bg-yellow-900/30',  border: 'border-yellow-500/40' },
};

const AchievementIcon: React.FC<{ icon?: string; size?: number }> = ({ icon, size = 28 }) => {
  switch (icon) {
    case 'flask':      return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6"/><path d="M10 3v7l-4 7a2 2 0 0 0 1.74 3h8.52A2 2 0 0 0 18 17l-4-7V3"/></svg>;
    case 'rocket':     return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>;
    case 'chart':      return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>;
    case 'brain':      return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/></svg>;
    case 'graduation': return <GraduationCap size={size} />;
    default:           return <Award size={size} />;
  }
};

const resolvePublicUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) return url;
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${url.replace(/^\//, '')}`;
};

const AchievementImage: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  return (
    <div className="w-full md:w-[280px] lg:w-[340px] flex-shrink-0">
      <div className="rounded-xl overflow-hidden shadow-xl bg-dark-900/30 border border-white/10">
        <img
          src={resolvePublicUrl(src)}
          alt={alt}
          className="w-full h-auto object-contain"
          onError={() => setFailed(true)}
        />
      </div>
    </div>
  );
};

const AchievementSection: React.FC = memo(() => {
  const { lang } = useLang();
  const t = getTranslations(lang);

  return (
    <SectionWrapper id="achievements" title={t.achievements.title}>
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-brand-600/80 via-dark-700 to-transparent hidden md:block" />

        <div className="flex flex-col gap-6">
          {ACHIEVEMENTS.map((item, idx) => {
            const cat = item.category ? CATEGORY_META[item.category] : CATEGORY_META['project'];
            const catLabel = cat.label[lang];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: idx * 0.06 }}
                className="relative flex gap-0 md:gap-8 items-start"
              >
                {/* Timeline dot */}
                <div className="hidden md:flex flex-shrink-0 w-10 items-start justify-center pt-6">
                  <div className={`w-4 h-4 rounded-full border-2 border-brand-600 ${cat.bg} flex items-center justify-center ring-4 ring-dark-900`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  </div>
                </div>

                {/* Card */}
                <div className="flex-1 group">
                  <div className={`relative bg-dark-800/60 hover:bg-dark-800 border ${cat.border} rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-brand-600/10 overflow-hidden`}>
                    {/* Background glow on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ background: 'radial-gradient(600px circle at var(--mouse-x,50%) var(--mouse-y,50%), rgba(220,38,38,0.04), transparent 40%)' }}
                    />

                    <div className="relative flex flex-col md:flex-row gap-6 items-start">
                      <AchievementImage src={item.imageUrl} alt={item.title[lang]} />

                      <div className="flex-1 min-w-0">
                        {/* Top row: year + category badge + icon */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span className="font-mono text-brand-500 text-sm font-bold tracking-widest">{item.year}</span>
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cat.bg} ${cat.color} border ${cat.border}`}>
                            {catLabel}
                          </span>
                          <div className="ml-auto text-white/20 group-hover:text-brand-500 transition-colors duration-300">
                            <AchievementIcon icon={item.icon} size={24} />
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-extrabold text-white leading-snug mb-3 group-hover:text-brand-50 transition-colors">
                          {item.title[lang]}
                        </h3>

                        {/* Description */}
                        <p className="text-gray-400 text-sm leading-relaxed">
                          {item.description[lang]}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </SectionWrapper>
  );
});

const GithubSection: React.FC = memo(() => {
  const { lang } = useLang();
  const t = getTranslations(lang);
  return (
    <SectionWrapper id="github" title={t.github.title}>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <GithubPinnedRepos lang={lang} />
      </Suspense>
    </SectionWrapper>
  );
});

const EducationSection: React.FC = memo(() => {
  const { lang } = useLang();
  const t = getTranslations(lang);
  return (
    <SectionWrapper id="education" title={t.education.title}>
      <div className="space-y-8 max-w-3xl">
        {EDUCATION_DATA.map((item, idx) => (
          <Reveal key={item.id} delay={idx * 0.08}>
            <div className="bg-dark-800 p-8 rounded-2xl border border-dark-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <GraduationCap size={120} />
              </div>
              <span className="inline-block bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                {item.year}
              </span>
              <h3 className="text-3xl font-extrabold text-white mb-2">{item.school[lang]}</h3>
              <h4 className="text-xl text-brand-400 mb-4">{item.degree[lang]}</h4>
              <p className="text-gray-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-brand-600 rounded-full" /> {item.location[lang]}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionWrapper>
  );
});

const AboutSection: React.FC = memo(() => {
  const { lang } = useLang();
  const t = getTranslations(lang);
  const { currentYear, currentMonth } = useMemo(() => {
    const now = new Date();
    return { currentYear: now.getFullYear(), currentMonth: now.getMonth() + 1 };
  }, []);
  const age = currentYear - 2005;

  // Calculate student year based on academic year starting in September
  // Started: September 2023, Ends: June 2027
  // If current month >= 9 (Sep-Dec), we're in the new academic year
  // If current month < 9 (Jan-Aug), we're still in the previous academic year
  const studentYear = currentMonth >= 9
    ? currentYear - 2023 + 1  // New academic year (Sep onwards)
    : currentYear - 2023;      // Previous academic year (Jan-Aug)

  const [repoCount, setRepoCount] = useState<number>(8);

  // GitHub count is cached for a few days and shared across remounts.
  useEffect(() => {
    let cancelled = false;

    loadGithubRepoCount()
      .then((count) => {
        if (!cancelled) setRepoCount(count);
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to fetch GitHub repos:', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SectionWrapper id="about" title={t.about.title}>
      <Reveal className="max-w-6xl mx-auto space-y-10">
        {/* Profile Header */}
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-4xl font-extrabold text-white mb-2">{NAME[lang]}</h2>
              <a
                href="https://github.com/InfinityZero3000"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-500 text-xl font-mono hover:text-brand-400 transition-colors inline-flex items-center gap-1 group"
              >
                @InfinityZero3000
                <Github size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>

            <div className="flex flex-wrap gap-4 text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-brand-500" />
                <span>{t.about.bornIn(age)}</span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap size={18} className="text-brand-500" />
                <span>{t.about.studentYear(studentYear)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-brand-500" />
                <span>{t.about.location}</span>
              </div>
            </div>

            <div className="text-base text-gray-300 leading-relaxed space-y-4">
              <p>{t.about.bio1}</p>
              <p>{t.about.bio2}</p>
              <p>{t.about.bio3}</p>
              <p>{t.about.bio4}</p>
            </div>

            {/* Social Links */}
            <div className="flex flex-wrap gap-4 pt-4">
              <a
                href="https://github.com/InfinityZero3000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors group"
              >
                <Github size={20} className="group-hover:text-brand-500 transition-colors" />
                <span>GitHub</span>
              </a>
              <a
                href="https://www.linkedin.com/in/zero-nguyen/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors group"
              >
                <Linkedin size={20} className="group-hover:text-brand-500 transition-colors" />
                <span>LinkedIn</span>
              </a>
              <a
                href="mailto:nhthang312@gmail.com"
                className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors group"
              >
                <Mail size={20} className="group-hover:text-brand-500 transition-colors" />
                <span>Email</span>
              </a>
            </div>
          </div>

          {/* Stats Card */}
          <div className="lg:w-80 w-full space-y-4">
            <div className="bg-gradient-to-br from-dark-800 to-dark-900 p-6 rounded-2xl border border-dark-700">
              <h3 className="text-white font-extrabold mb-4 text-lg">
                {t.about.quickStats}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{t.about.githubRepos}</span>
                  <a
                    href="https://github.com/InfinityZero3000?tab=repositories"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-2xl font-bold text-white hover:text-brand-500 transition-colors"
                  >
                    {repoCount}
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{t.about.technologies}</span>
                  <span className="text-2xl font-bold text-white">15+</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{t.about.studyYear}</span>
                  <span className="text-2xl font-bold text-brand-500">{studentYear}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-l-4 border-brand-600 bg-dark-800/50 rounded-r-xl">
              <p className="italic text-gray-400 text-sm">
                {t.about.codeQuote}
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </SectionWrapper>
  );
});

const ResumeSection: React.FC = memo(() => {
  const { lang } = useLang();
  const t = getTranslations(lang);

  const envResumeUrl = import.meta.env?.VITE_RESUME_URL;
  const rawResumeUrl = (envResumeUrl && typeof envResumeUrl === 'string' && !envResumeUrl.includes('export=download'))
    ? envResumeUrl
    : '/NguyenHuuThang_Resume.pdf';

  const localPdfUrl = '/NguyenHuuThang_Resume.pdf#toolbar=1&navpanes=1&scrollbar=1';

  const viewUrl = rawResumeUrl.includes('drive.google.com')
    ? rawResumeUrl.replace(
        /drive\.google\.com\/file\/d\/([^/]+)\/(view|edit)(.*)/,
        'drive.google.com/file/d/$1/preview'
      )
    : rawResumeUrl;

  return (
    <SectionWrapper id="resume" title={t.resume.title}>
      <Reveal className="flex flex-col items-center justify-center space-y-6">
        <div className="w-full max-w-5xl">
          <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-dark-800 rounded-full flex items-center justify-center text-brand-600">
                <FileText size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-white">
                  {t.resume.heading}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {t.resume.openHint}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <a
                href={'/NguyenHuuThang_Resume.pdf'}
                download="NguyenHuuThang_Resume.pdf"
                className="inline-flex items-center gap-2 bg-dark-800 hover:bg-dark-700 text-white px-4 py-2 rounded-lg font-medium transition-all border border-dark-700 hover:border-brand-600"
              >
                <Download size={18} />
                {t.resume.download}
              </a>
              <a
                href={viewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg hover:shadow-brand-600/50"
              >
                <FileText size={18} />
                {t.resume.openInNewTab}
              </a>
            </div>
          </div>

          {/* iframe is pointer-events:none so wheel events pass through to the page */}
          <div
            className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden shadow-2xl relative mx-auto"
            style={{ height: 'calc(100vh - 10rem)', width: '100%' }}
          >
            <iframe
              title="resume-pdf"
              src={localPdfUrl}
              className="absolute inset-0 w-full h-full"
              style={{ border: 'none', pointerEvents: 'none' }}
              allow="fullscreen"
            />
            {/* pointer-events:none overlay — wheel events fall through to the page */}
            <div className="absolute inset-0 z-10 flex items-end justify-center pb-4 pointer-events-none">
              <a
                href={viewUrl}
                target="_blank"
                rel="noreferrer"
                className="pointer-events-auto bg-dark-900/80 backdrop-blur-sm text-white/60 hover:text-white/90 text-xs px-3 py-1.5 rounded-full border border-dark-700 transition-colors select-none"
              >
                {t.resume.openPdfNewTab}
              </a>
            </div>
          </div>

          <div className="mt-4 p-4 bg-dark-800/50 border border-dark-700 rounded-lg">
            <p className="text-sm text-gray-400 text-center">
              {t.resume.tip}
            </p>
          </div>
        </div>
      </Reveal>
    </SectionWrapper>
  );
});

const Footer: React.FC = memo(() => {
  const { lang } = useLang();
  const t = getTranslations(lang);
  return (
    <footer className="w-full pb-32 md:pb-48 pt-16 mt-12 border-t border-dark-700 bg-dark-900/10 text-center text-gray-500 relative z-10 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 mb-2 text-brand-500 opacity-50">
        <Cpu size={20} />
      </div>
      <p className="text-sm">
        &copy; {new Date().getFullYear()} {NAME[lang]}. {t.footer.rights}
      </p>
    </footer>
  );
});

// --- Main App ---

export default function App() {
  const [lang, setLang] = useState<Language>(Language.EN);
  const [activeSection, setActiveSection] = useState('home');
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('theme') as Theme | null;
      if (saved === 'dark' || saved === 'light') return saved;
    } catch { /* ignore */ }
    return 'dark';
  });

  const toggleTheme = useCallback(() => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch { /* ignore */ }
    startTransition(() => setTheme(next as Theme));
  }, []);

  // Apply theme to <html> for CSS selector support
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleLang = useCallback(() => {
    setLang(prev => prev === Language.EN ? Language.VI : Language.EN);
  }, []);

  const handleNavigate = useCallback((sectionKey: string) => {
    scrollToSection(sectionKey);
  }, []);

  // Setup scroll observer for active section tracking
  useEffect(() => {
    const cleanup = setupScrollObserver(setActiveSection);
    return cleanup;
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
    <LangContext.Provider value={{ lang, toggleLang }}>
      <div className="text-white font-sans selection:bg-brand-600 selection:text-white">
        {/* Global Starfield Background */}
        <Suspense fallback={null}>
          <StarfieldBackground />
        </Suspense>

        {/* Fixed Navigation */}
        <NavBar activeSection={activeSection} onNavigate={handleNavigate} />

        {/* Scrollable Content */}
        <main className="relative z-10">
          <HomeSection />
          <AboutSection />
          <ProjectSection />
          <GithubSection />
          <ResumeSection />
          <SkillSection />
          <AchievementSection />
          <EducationSection />
          <Footer />
        </main>
      </div>
    </LangContext.Provider>
    </ThemeContext.Provider>
  );
}
