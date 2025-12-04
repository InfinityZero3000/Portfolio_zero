import React, { useState, createContext, useContext, memo, lazy, Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, Link, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { NAV_ITEMS, PROJECTS, SKILLS, /* ACHIEVEMENTS, */ EDUCATION_DATA, BIO } from './constants';
import { Language, RoutePath } from './types';
import { Menu, X, Globe as GlobeIcon, Download, Award, GraduationCap, FileText, Github, Linkedin, Mail, MapPin, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { performanceMonitor } from './utils/performance-monitor';
import { cacheManager } from './utils/cache-manager';

// Lazy load GlobeViz component for faster initial load
const GlobeViz = lazy(() => import('./components/GlobeViz'));

// --- Context ---
interface LangContextType {
  lang: Language;
  toggleLang: () => void;
}
const LangContext = createContext<LangContextType>({ lang: Language.EN, toggleLang: () => {} });
const useLang = () => useContext(LangContext);

// --- Layout Components ---

const NavBar: React.FC = memo(() => {
  const { lang, toggleLang } = useLang();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Desktop Nav */}
      <nav className="fixed top-0 left-0 h-full w-24 hidden md:flex flex-col items-center justify-between py-8 bg-dark-900/80 backdrop-blur-md border-r border-dark-700 z-50">
        <div className="text-brand-600 font-bold text-2xl tracking-tighter">ZERO</div>
        
        <div className="flex flex-col gap-8">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link 
                key={item.key} 
                to={item.path}
                className={clsx(
                  "p-3 rounded-xl transition-all duration-300 relative group",
                  isActive ? "bg-brand-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]" : "text-gray-400 hover:text-white hover:bg-dark-800"
                )}
              >
                <Icon size={24} />
                <span className="absolute left-14 bg-brand-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {item.label[lang]}
                </span>
              </Link>
            );
          })}
        </div>

        <button 
          onClick={toggleLang}
          className="flex flex-col items-center gap-1 text-xs font-mono text-gray-400 hover:text-brand-500 transition-colors"
        >
          <GlobeIcon size={20} />
          {lang}
        </button>
      </nav>

      {/* Mobile Header */}
      <nav className="fixed top-0 left-0 w-full h-16 md:hidden flex items-center justify-between px-6 bg-dark-900/90 backdrop-blur-md border-b border-dark-700 z-50">
        <div className="text-brand-600 font-bold text-xl">ZERO</div>
        <button onClick={() => setIsOpen(true)} className="text-white">
          <Menu />
        </button>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-0 z-[60] bg-dark-900 flex flex-col p-8 md:hidden"
          >
            <div className="flex justify-between items-center mb-12">
              <span className="text-brand-600 font-bold text-2xl">MENU</span>
              <button onClick={() => setIsOpen(false)}><X className="text-white" /></button>
            </div>
            <div className="flex flex-col gap-6">
               {NAV_ITEMS.map((item) => (
                <Link 
                  key={item.key} 
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={clsx(
                    "text-2xl font-light",
                    location.pathname === item.path ? "text-brand-500" : "text-gray-300"
                  )}
                >
                  {item.label[lang]}
                </Link>
               ))}
            </div>
            <div className="mt-auto">
               <button onClick={toggleLang} className="text-xl text-gray-400 border border-gray-700 px-4 py-2 rounded-full w-full flex items-center justify-center gap-2">
                 <GlobeIcon size={20} /> {lang === Language.EN ? 'VI' : 'EN'}
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

const PageWrapper: React.FC<{ children: React.ReactNode; title: string }> = ({ children, title }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.5 }}
    className="min-h-screen pt-24 pb-12 px-6 md:pl-32 md:pr-12 md:pt-12 max-w-7xl mx-auto"
  >
    <header className="mb-12 border-b border-gray-800 pb-4">
      <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight uppercase">
        <span className="text-brand-600">/</span> {title}
      </h1>
    </header>
    {children}
  </motion.div>
);

// --- Pages ---

const HomePage: React.FC = () => {
  const { lang } = useLang();
  return (
    <div className="relative w-full h-screen overflow-hidden bg-dark-900">
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-12 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <GlobeViz />
      </Suspense>
      <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-dark-900 via-transparent to-transparent pointer-events-none md:w-1/2" />
      
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="absolute bottom-12 left-6 md:bottom-24 md:left-32 z-10 max-w-2xl pointer-events-none"
      >
        <h2 className="text-brand-500 font-mono text-sm md:text-base mb-2 tracking-widest uppercase">
          {lang === Language.EN ? 'Software Developer' : 'Lập Trình Viên Phần Mềm'}
        </h2>
        <h1 className="text-5xl md:text-8xl font-bold text-white leading-none mb-6">
          HELLO <br /> WORLD<span className="text-brand-600">.</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl font-light leading-relaxed max-w-lg">
          {BIO[lang]}
        </p>
      </motion.div>
    </div>
  );
};

const ProjectPage: React.FC = memo(() => {
  const { lang } = useLang();
  return (
    <PageWrapper title={lang === Language.EN ? 'Projects' : 'Dự Án'}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {PROJECTS.map((project) => (
          <div key={project.id} className="group relative bg-dark-800 rounded-2xl overflow-hidden border border-dark-700 hover:border-brand-600 transition-colors duration-300">
            <div className="aspect-video bg-gray-900 relative overflow-hidden">
              <img src={project.image} alt={project.title} className="object-cover w-full h-full opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
            </div>
            <div className="p-6">
              <h3 className="text-2xl font-bold text-white mb-2">{project.title}</h3>
              <p className="text-gray-400 text-sm mb-4 min-h-[40px]">{project.description[lang]}</p>
              <div className="flex flex-wrap gap-2">
                {project.tech.map(t => (
                  <span key={t} className="text-xs font-mono text-brand-500 bg-brand-900/20 px-2 py-1 rounded">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
});

const SkillPage: React.FC = memo(() => {
  const { lang } = useLang();
  return (
    <PageWrapper title={lang === Language.EN ? 'Skills' : 'Kỹ Năng'}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {SKILLS.map((section, idx) => (
          <div key={idx}>
            <h3 className="text-2xl font-bold text-brand-500 mb-6 border-l-4 border-brand-600 pl-4">
              {section.category[lang]}
            </h3>
            <div className="flex flex-col gap-3">
              {section.items.map((skill) => (
                <div key={skill} className="flex items-center gap-3 group">
                   <div className="w-2 h-2 bg-gray-700 rounded-full group-hover:bg-brand-500 transition-colors" />
                   <span className="text-lg text-gray-300 group-hover:text-white transition-colors">{skill}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
});

// const AchievementsPage: React.FC = memo(() => {
//   const { lang } = useLang();
//   return (
//     <PageWrapper title={lang === Language.EN ? 'Achievements' : 'Thành Tựu'}>
//       <div className="space-y-8">
//         {ACHIEVEMENTS.map((item) => (
//           <div key={item.id} className="flex flex-col md:flex-row gap-6 md:gap-12 md:items-center border-b border-dark-700 pb-8 last:border-0">
//             <div className="text-brand-600 font-mono text-xl md:w-32">{item.year}</div>
//             <div className="flex-1">
//               <h3 className="text-2xl font-bold text-white mb-2">{item.title[lang]}</h3>
//               <p className="text-gray-400">{item.description[lang]}</p>
//             </div>
//             <div className="text-brand-500">
//               <Award size={32} />
//             </div>
//           </div>
//         ))}
//       </div>
//     </PageWrapper>
//   );
// });

const EducationPage: React.FC = memo(() => {
  const { lang } = useLang();
  return (
    <PageWrapper title={lang === Language.EN ? 'Education' : 'Học Vấn'}>
      <div className="space-y-8 max-w-3xl">
        {EDUCATION_DATA.map((item) => (
          <div key={item.id} className="bg-dark-800 p-8 rounded-2xl border border-dark-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <GraduationCap size={120} />
            </div>
            <span className="inline-block bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
              {item.year}
            </span>
            <h3 className="text-3xl font-bold text-white mb-2">{item.school[lang]}</h3>
            <h4 className="text-xl text-brand-400 mb-4">{item.degree[lang]}</h4>
            <p className="text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-brand-600 rounded-full" /> {item.location}
            </p>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
});

const AboutPage: React.FC = memo(() => {
  const { lang } = useLang();
  const currentYear = new Date().getFullYear();
  const age = currentYear - 2005;
  const studentYear = currentYear - 2023 + 1; // Started in 2023
  const [repoCount, setRepoCount] = useState<number>(8);
  
  // Fetch GitHub repos count
  useEffect(() => {
    const fetchRepos = async () => {
      try {
        console.log('Fetching GitHub repos for InfinityZero3000...');
        const response = await fetch('https://api.github.com/users/InfinityZero3000/repos?per_page=100&type=all');
        
        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
          console.log('GitHub repos fetched successfully:', data.length);
          console.log('Repos:', data.map((r: any) => r.name));
          setRepoCount(data.length);
        } else {
          console.error('Invalid GitHub API response:', data);
        }
      } catch (err) {
        console.error('Failed to fetch GitHub repos:', err);
      }
    };
    
    fetchRepos();
  }, []);
  
  return (
    <PageWrapper title={lang === Language.EN ? 'About Me' : 'Về Tôi'}>
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Profile Header */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-4xl font-bold text-white mb-2">Nguyễn Hữu Thắng</h2>
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
                <span>{lang === Language.EN ? `Born in 2005 (${age} years old)` : `Sinh năm 2005 (${age} tuổi)`}</span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap size={18} className="text-brand-500" />
                <span>{lang === Language.EN ? `Year ${studentYear} Student` : `Sinh viên năm ${studentYear}`}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-brand-500" />
                <span>Ho Chi Minh City, Vietnam</span>
              </div>
            </div>

            <div className="text-lg text-gray-300 leading-relaxed space-y-4">
              <p>
                {lang === Language.EN 
                 ? "Hello! I'm Thắng, a passionate Software Developer currently pursuing my degree in Software Technology at Ho Chi Minh City University of Industry and Trade. My journey into the world of programming started with a curiosity about how things work behind the scenes, and it has evolved into a deep passion for creating meaningful digital experiences."
                 : "Xin chào! Tôi là Thắng, một Lập Trình Viên Phần Mềm đầy nhiệt huyết đang theo học ngành Công nghệ Phần mềm tại Trường Đại học Công Thương TP.HCM. Hành trình lập trình của tôi bắt đầu từ sự tò mò về cách mọi thứ hoạt động, và đã phát triển thành niềm đam mê sâu sắc trong việc tạo ra những trải nghiệm kỹ thuật số có ý nghĩa."}
              </p>
              <p>
                {lang === Language.EN 
                 ? "I specialize in building modern web applications using React and TypeScript, with a strong focus on creating intuitive user interfaces and seamless experiences. From e-commerce platforms to machine learning applications, I love tackling complex problems and turning ideas into reality through clean, efficient code."
                 : "Tôi chuyên xây dựng các ứng dụng web hiện đại sử dụng React và TypeScript, với trọng tâm vào việc tạo ra giao diện người dùng trực quan và trải nghiệm mượt mà. Từ nền tảng thương mại điện tử đến ứng dụng học máy, tôi yêu thích việc giải quyết các vấn đề phức tạp và biến ý tưởng thành hiện thực thông qua code sạch và hiệu quả."}
              </p>
              <p>
                {lang === Language.EN 
                 ? "Beyond frontend development, I'm deeply interested in AI and machine learning technologies. I've worked on projects ranging from spam email classification systems to customer emotion recognition, always eager to explore the intersection of software engineering and artificial intelligence. My goal is to bridge the gap between innovative technology and practical, user-centered solutions."
                 : "Ngoài phát triển frontend, tôi rất quan tâm đến công nghệ AI và học máy. Tôi đã làm việc trên các dự án từ hệ thống phân loại email spam đến nhận diện cảm xúc khách hàng, luôn háo hức khám phá sự giao thoa giữa kỹ thuật phần mềm và trí tuệ nhân tạo. Mục tiêu của tôi là kết nối công nghệ đổi mới với các giải pháp thực tế, lấy người dùng làm trung tâm."}
              </p>
              <p>
                {lang === Language.EN 
                 ? "When I'm not coding, you'll find me exploring new technologies, contributing to open-source projects, or experimenting with 3D visualizations and web animations. I believe that great software is not just about functionality—it's about creating experiences that delight and inspire users."
                 : "Khi không lập trình, bạn sẽ thấy tôi khám phá các công nghệ mới, đóng góp cho các dự án mã nguồn mở, hoặc thử nghiệm với trực quan hóa 3D và animation web. Tôi tin rằng phần mềm tuyệt vời không chỉ về chức năng—mà còn về việc tạo ra trải nghiệm làm hài lòng và truyền cảm hứng cho người dùng."}
              </p>
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
                href="https://www.linkedin.com/in/th%E1%BA%AFng-nguy%E1%BB%85n-h%E1%BB%AFu-82a5a0335/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors group"
              >
                <Linkedin size={20} className="group-hover:text-brand-500 transition-colors" />
                <span>LinkedIn</span>
              </a>
              <a 
                href="mailto:nhthang.dev@gmail.com"
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
              <h3 className="text-white font-bold mb-4 text-lg">
                {lang === Language.EN ? 'Quick Stats' : 'Thống Kê'}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{lang === Language.EN ? 'GitHub Repos' : 'Repo GitHub'}</span>
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
                  <span className="text-gray-400">{lang === Language.EN ? 'Technologies' : 'Công Nghệ'}</span>
                  <span className="text-2xl font-bold text-white">15+</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{lang === Language.EN ? 'Study Year' : 'Năm Học'}</span>
                  <span className="text-2xl font-bold text-brand-500">{studentYear}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-l-4 border-brand-600 bg-dark-800/50 rounded-r-xl">
              <p className="italic text-gray-400 text-sm">
                "Code is poetry, written for machines but designed for humans."
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
});

const ResumePage: React.FC = memo(() => {
  const { lang } = useLang();
  return (
    <PageWrapper title={lang === Language.EN ? 'Resume' : 'Hồ Sơ'}>
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8">
        <div className="w-24 h-24 bg-dark-800 rounded-full flex items-center justify-center text-brand-600 animate-pulse">
           <FileText size={48} />
        </div>
        <h2 className="text-2xl text-white">
          {lang === Language.EN ? 'Ready to work together?' : 'Sẵn sàng hợp tác?'}
        </h2>
        <button className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center gap-3">
          <Download size={24} />
          {lang === Language.EN ? 'Download CV (PDF)' : 'Tải Xuống CV (PDF)'}
        </button>
      </div>
    </PageWrapper>
  );
});

// --- Main App ---

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        <Route path={RoutePath.HOME} element={<HomePage />} />
        <Route path={RoutePath.PROJECT} element={<ProjectPage />} />
        <Route path={RoutePath.SKILL} element={<SkillPage />} />
        {/* <Route path={RoutePath.ACHIEVEMENTS} element={<AchievementsPage />} /> */}
        <Route path={RoutePath.EDUCATION} element={<EducationPage />} />
        <Route path={RoutePath.ABOUT} element={<AboutPage />} />
        <Route path={RoutePath.RESUME} element={<ResumePage />} />
        <Route path="*" element={<Navigate to={RoutePath.HOME} />} />
      </Routes>
    </AnimatePresence>
  );
};

export default function App() {
  const [lang, setLang] = useState<Language>(Language.EN);
  
  const toggleLang = () => {
    setLang(prev => prev === Language.EN ? Language.VI : Language.EN);
  };

  // Initialize performance monitoring
  useEffect(() => {
    // Log performance metrics on mount
    console.log('[Performance] App initialized');
    
    // Periodic cache cleanup
    const cleanupInterval = setInterval(() => {
      cacheManager.evictOldEntries();
    }, 5 * 60 * 1000); // Every 5 minutes
    
    // Show performance summary in development
    setTimeout(() => {
      const summary = performanceMonitor.getSummary();
      console.log('[Performance Summary]', summary);
      console.log('[Recommendations]', performanceMonitor.getRecommendations());
    }, 3000);
    
    return () => {
      clearInterval(cleanupInterval);
      performanceMonitor.stop();
    };
  }, []);

  return (
    <LangContext.Provider value={{ lang, toggleLang }}>
      <HashRouter>
        <div className="bg-dark-900 text-white min-h-screen font-sans selection:bg-brand-600 selection:text-white">
          <NavBar />
          <AnimatedRoutes />
        </div>
      </HashRouter>
    </LangContext.Provider>
  );
}