import { Language } from '../types';

export type Translations = {
  nav: { language: string };
  home: { jobTitle: string };
  about: {
    title: string;
    location: string;
    bornIn: (age: number) => string;
    studentYear: (year: number) => string;
    bio1: string;
    bio2: string;
    bio3: string;
    bio4: string;
    quickStats: string;
    githubRepos: string;
    technologies: string;
    studyYear: string;
    codeQuote: string;
  };
  project: { title: string; viewAll: string; showLess: string };
  github: {
    title: string;
    subtitle: string;
    viewAll: string;
    retry: string;
    errorMsg: string;
    noDescription: string;
    today: string;
    daysAgo: (n: number) => string;
    monthsAgo: (n: number) => string;
    yearsAgo: (n: number) => string;
  };
  resume: {
    title: string;
    heading: string;
    openHint: string;
    download: string;
    openInNewTab: string;
    openPdfNewTab: string;
    tip: string;
  };
  skills: { title: string };
  achievements: { title: string };
  education: { title: string };
  footer: { rights: string };
};

const translations: Record<Language, Translations> = {
  [Language.EN]: {
    nav: {
      language: 'Language',
    },
    home: {
      jobTitle: 'Software Developer',
    },
    about: {
      title: 'About Me',
      location: 'Ho Chi Minh City, Vietnam',
      bornIn: (age) => `Born in 2005 (${age} years old)`,
      studentYear: (year) => `Year ${year} Student`,
      bio1: "Hello! I'm Thang, a passionate Software Developer currently pursuing my degree in Software Technology at Ho Chi Minh City University of Industry and Trade. My journey into the world of programming started with a curiosity about how things work behind the scenes, and it has evolved into a deep passion for creating meaningful digital experiences.",
      bio2: "I specialize in building modern web applications using React and TypeScript, with a strong focus on creating intuitive user interfaces and seamless experiences. From e-commerce platforms to machine learning applications, I love tackling complex problems and turning ideas into reality through clean, efficient code.",
      bio3: "Beyond frontend development, I'm deeply interested in AI and machine learning technologies. I've worked on projects ranging from spam email classification systems to customer emotion recognition, always eager to explore the intersection of software engineering and artificial intelligence. My goal is to bridge the gap between innovative technology and practical, user-centered solutions.",
      bio4: "Outside of coding, I'm constantly learning and staying up-to-date with the latest tech trends. Whether it's diving into new frameworks, optimizing performance, or exploring creative ways to enhance user experience, I'm driven by a genuine love for problem-solving and innovation. For me, writing code is more than a job—it's a craft that I'm constantly refining.",
      quickStats: 'Quick Stats',
      githubRepos: 'GitHub Repos',
      technologies: 'Technologies',
      studyYear: 'Study Year',
      codeQuote: '"Code is poetry, written for machines but designed for humans."',
    },
    project: {
      title: 'Projects',
      viewAll: 'View All Projects',
      showLess: 'Show Less',
    },
    github: {
      title: 'Repository',
      subtitle: 'Pinned repositories from my GitHub profile, synced automatically.',
      viewAll: 'View All Repositories',
      retry: 'Retry',
      errorMsg: 'Could not load repositories.',
      noDescription: 'No description available.',
      today: 'today',
      daysAgo: (n) => `${n}d ago`,
      monthsAgo: (n) => `${n}mo ago`,
      yearsAgo: (n) => `${n}y ago`,
    },
    resume: {
      title: 'Resume',
      heading: 'My Resume',
      openHint: 'Open in new tab to interact with links',
      download: 'Download',
      openInNewTab: 'Open in New Tab',
      openPdfNewTab: 'Open PDF in new tab ↗',
      tip: 'Tip: Use "Open in New Tab" to interact with links in the PDF.',
    },
    skills: { title: 'Skills' },
    achievements: { title: 'Achievements' },
    education: { title: 'Education' },
    footer: { rights: 'All rights reserved.' },
  },
  [Language.VI]: {
    nav: {
      language: 'Ngôn Ngữ',
    },
    home: {
      jobTitle: 'Lập Trình Viên Phần Mềm',
    },
    about: {
      title: 'Về Tôi',
      location: 'TP. Hồ Chí Minh, Việt Nam',
      bornIn: (age) => `Sinh năm 2005 (${age} tuổi)`,
      studentYear: (year) => `Sinh viên năm ${year}`,
      bio1: 'Xin chào! Tôi là Thắng, một Lập Trình Viên Phần Mềm đầy nhiệt huyết đang theo học ngành Công nghệ Phần mềm tại Trường Đại học Công Thương TP.HCM. Hành trình lập trình của tôi bắt đầu từ sự tò mò về cách mọi thứ hoạt động, và đã phát triển thành niềm đam mê sâu sắc trong việc tạo ra những trải nghiệm kỹ thuật số có ý nghĩa.',
      bio2: 'Tôi chuyên xây dựng các ứng dụng web hiện đại sử dụng React và TypeScript, với trọng tâm vào việc tạo ra giao diện người dùng trực quan và trải nghiệm mượt mà. Từ nền tảng thương mại điện tử đến ứng dụng học máy, tôi yêu thích việc giải quyết các vấn đề phức tạp và biến ý tưởng thành hiện thực thông qua code sạch và hiệu quả.',
      bio3: 'Ngoài phát triển frontend, tôi rất quan tâm đến công nghệ AI và học máy. Tôi đã làm việc trên các dự án từ hệ thống phân loại email spam đến nhận diện cảm xúc khách hàng, luôn háo hức khám phá sự giao thoa giữa kỹ thuật phần mềm và trí tuệ nhân tạo. Mục tiêu của tôi là kết nối công nghệ đổi mới với các giải pháp thực tế, lấy người dùng làm trung tâm.',
      bio4: 'Ngoài việc lập trình, tôi không ngừng học hỏi và cập nhật các xu hướng công nghệ mới nhất. Dù là tìm hiểu các framework mới, tối ưu hiệu suất, hay khám phá các cách sáng tạo để nâng cao trải nghiệm người dùng, tôi được thúc đẩy bởi tình yêu thực sự với việc giải quyết vấn đề và đổi mới. Với tôi, viết code không chỉ là công việc, đó là một nghệ thuật mà tôi không ngừng trau dồi.',
      quickStats: 'Thống Kê',
      githubRepos: 'Repo GitHub',
      technologies: 'Công Nghệ',
      studyYear: 'Năm Học',
      codeQuote: '"Code là thơ ca, viết cho máy móc nhưng được thiết kế cho con người."',
    },
    project: {
      title: 'Dự Án',
      viewAll: 'Xem Tất Cả Dự Án',
      showLess: 'Thu Gọn',
    },
    github: {
      title: 'Kho Lưu Trữ',
      subtitle: 'Các repo được ghim từ hồ sơ GitHub của tôi, đồng bộ tự động.',
      viewAll: 'Xem tất cả Repo',
      retry: 'Thử lại',
      errorMsg: 'Không thể tải danh sách repo.',
      noDescription: 'Chưa có mô tả.',
      today: 'hôm nay',
      daysAgo: (n) => `${n} ngày trước`,
      monthsAgo: (n) => `${n} tháng trước`,
      yearsAgo: (n) => `${n} năm trước`,
    },
    resume: {
      title: 'Hồ Sơ',
      heading: 'Bản Hồ Sơ',
      openHint: 'Mở tab mới để tương tác với các liên kết',
      download: 'Tải về',
      openInNewTab: 'Mở tab mới',
      openPdfNewTab: 'Mở PDF trong tab mới ↗',
      tip: 'Mẹo: Sử dụng "Mở tab mới" để tương tác với các liên kết trong PDF.',
    },
    skills: { title: 'Kỹ Năng' },
    achievements: { title: 'Thành Tựu' },
    education: { title: 'Học Vấn' },
    footer: { rights: 'Mọi bản quyền được bảo lưu.' },
  },
};

export const getTranslations = (lang: Language): Translations => translations[lang];
export default translations;
