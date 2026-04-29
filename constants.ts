import { Language, RoutePath, NavItem, Project, Achievement, SkillCategory, Skill, SkillLevel } from './types';
import {
  Home,
  Briefcase,
  Cpu,
  Award,
  GraduationCap,
  User,
  FileText,
  Github
} from 'lucide-react';

export const NAV_ITEMS: (NavItem & { icon: any })[] = [
  { key: 'home', path: RoutePath.HOME, label: { [Language.EN]: 'Home', [Language.VI]: 'Trang Chủ' }, icon: Home },
  { key: 'about', path: RoutePath.ABOUT, label: { [Language.EN]: 'About', [Language.VI]: 'Giới Thiệu' }, icon: User },
  { key: 'project', path: RoutePath.PROJECT, label: { [Language.EN]: 'Projects', [Language.VI]: 'Dự Án' }, icon: Briefcase },
  { key: 'github', path: RoutePath.GITHUB, label: { [Language.EN]: 'Repository', [Language.VI]: 'Kho Lưu Trữ' }, icon: Github },
  { key: 'resume', path: RoutePath.RESUME, label: { [Language.EN]: 'Resume', [Language.VI]: 'Hồ Sơ' }, icon: FileText },
  { key: 'skill', path: RoutePath.SKILL, label: { [Language.EN]: 'Skills', [Language.VI]: 'Kỹ Năng' }, icon: Cpu },
  // { key: 'achievements', path: RoutePath.ACHIEVEMENTS, label: { [Language.EN]: 'Achievements', [Language.VI]: 'Thành Tựu' }, icon: Award },
  { key: 'education', path: RoutePath.EDUCATION, label: { [Language.EN]: 'Education', [Language.VI]: 'Học Vấn' }, icon: GraduationCap },
];

export const PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Algorithm Complexity Visualizer',
    tech: ['Next.js', 'React', 'TypeScript', 'TailwindCSS'],
    description: {
      [Language.EN]: 'Interactive web platform for visualizing and understanding algorithm complexity with sorting, searching, and extreme value algorithms.',
      [Language.VI]: 'Nền tảng web tương tác để trực quan hóa và hiểu độ phức tạp thuật toán với các thuật toán sắp xếp, tìm kiếm và tìm giá trị cực trị.'
    },
    image: '/image-project/algorithm-complexity-visualizer.png',
    link: 'https://github.com/InfinityZero3000/Algorithm-complexity-visualizer',
    demo: 'https://algorithm-complexity-visualizer.vercel.app/'
  },
  {
    id: '2',
    title: 'Mom-Baby Shop E-commerce',
    tech: ['React', 'TypeScript', 'Vite', 'TailwindCSS'],
    description: {
      [Language.EN]: 'Full-featured e-commerce platform for mother and baby products with shopping cart, wishlist, and multi-role authentication.',
      [Language.VI]: 'Nền tảng thương mại điện tử đầy đủ chức năng cho sản phẩm mẹ và bé với giỏ hàng, danh sách yêu thích và xác thực đa vai trò.'
    },
    image: '/image-project/mom-baby-shop.png',
    link: 'https://github.com/InfinityZero3000/Mom-baby-shop',
    demo: 'https://infinityzero3000.github.io/Mom-baby-shop/'
  },
  {
    id: '3',
    title: 'Spam Email Classification System',
    tech: ['Python', 'React', 'Scikit-learn', 'Gmail API', 'NLP'],
    description: {
      [Language.EN]: 'ML-powered spam detection system with Gmail integration, Vietnamese text processing, and interactive web interface.',
      [Language.VI]: 'Hệ thống phát hiện spam sử dụng ML với tích hợp Gmail, xử lý văn bản tiếng Việt và giao diện web tương tác.'
    },
    image: '/image-project/spam-email-classification.png',
    link: 'https://github.com/InfinityZero3000/Spam-email-classify'
  },
  {
    id: '4',
    title: 'Skin Cancer Classification',
    tech: ['Python', 'TensorFlow', 'Streamlit', 'Deep Learning', 'Computer Vision'],
    description: {
      [Language.EN]: 'AI-powered skin cancer classification system using deep learning for early detection and diagnosis with interactive web interface.',
      [Language.VI]: 'Hệ thống phân loại ung thư da sử dụng AI với học sâu để phát hiện và chẩn đoán sớm với giao diện web tương tác.'
    },
    image: '/image-project/skin-cancer-classification.jpg',
    link: 'https://github.com/InfinityZero3000/Skincancer_classification',
    demo: 'https://skincancer-vit.streamlit.app/'
  },
  {
    id: '5',
    title: 'Document Image Processing',
    tech: ['Python', 'OpenCV', 'Tesseract OCR', 'Next.js', 'Vercel'],
    description: {
      [Language.EN]: 'Advanced image processing web app for document text cleaning using morphological operations to improve OCR accuracy.',
      [Language.VI]: 'Ứng dụng web xử lý ảnh nâng cao để làm sạch văn bản tài liệu sử dụng các phép hình thái để cải thiện độ chính xác OCR.'
    },
    image: '/image-project/image-processing.png',
    link: 'https://github.com/InfinityZero3000/Image-Processing-for-Text-Cleaning',
    demo: 'https://image-processing-for-text-cleaning.vercel.app/'
  },
  {
    id: '6',
    title: 'Pac-Man with Dijkstra Algorithm',
    tech: ['Python', 'Pygame', 'AI Pathfinding', 'Dijkstra', 'A* Algorithm'],
    description: {
      [Language.EN]: 'Intelligent Pac-Man game implementing Dijkstra/A* pathfinding with ghost avoidance and auto-play mode.',
      [Language.VI]: 'Game Pac-Man thông minh triển khai thuật toán tìm đường Dijkstra/A* với tránh ma và chế độ tự động.'
    },
    image: '/image-project/Pac-man-dijkstra.png',
    link: 'https://github.com/InfinityZero3000/Pac-Man-Dijkstra'
  },
  {
    id: '7',
    title: 'John Henry Fashion Website',
    tech: ['HTML', 'Bootstrap', 'C#', '.NET Core 9.0', 'PostgreSQL'],
    description: {
      [Language.EN]: 'Professional e-commerce fashion website with product catalog, shopping cart, and modern responsive design.',
      [Language.VI]: 'Website thời trang thương mại điện tử chuyên nghiệp với catalog sản phẩm, giỏ hàng và thiết kế đáp ứng hiện đại.'
    },
    image: '/image-project/john-henry.png',
    link: 'https://github.com/InfinityZero3000/John-Henry-Fashion',
    demo: 'https://johnhenry-web.onrender.com/'
  },
  {
    id: '8',
    title: 'LexiLingo — Admin Dashboard',
    tech: ['Flutter', 'FastAPI', 'PostgreSQL', 'MongoDB', 'LangGraph', 'Microservices'],
    description: {
      [Language.EN]: 'Admin dashboard for LexiLingo — manage users, content, and AI conversation flows across a microservice architecture.',
      [Language.VI]: 'Trang quản trị LexiLingo — quản lý người dùng, nội dung và luồng hội thoại AI trên kiến trúc microservice.'
    },
    image: '/image-project/lexilingo-admin.png',
    link: 'https://github.com/InfinityZero3000/LexiLingo',
    demo: 'https://admin.lexilingo.me/'
  },
  {
    id: '9',
    title: 'LexiLingo — Mobile App',
    tech: ['Flutter', 'FastAPI', 'PostgreSQL', 'MongoDB', 'LangGraph', 'Microservices'],
    description: {
      [Language.EN]: 'AI-powered language learning mobile app with LangGraph-driven conversation flows, personalized lessons, and cross-platform support.',
      [Language.VI]: 'Ứng dụng học ngôn ngữ di động với AI, luồng hội thoại LangGraph, bài học cá nhân hóa và hỗ trợ đa nền tảng.'
    },
    image: '/image-project/lexilingo-mobile.png',
    link: 'https://github.com/InfinityZero3000/LexiLingo',
    demo: 'https://lexilingo.me'
  },
  {
    id: '10',
    title: 'ViRES — Hotel Review ABSA',
    tech: ['Python', 'NLP', 'ABSA', 'React', 'FastAPI', 'Vercel'],
    description: {
      [Language.EN]: 'Aspect-Based Sentiment Analysis system for Vietnamese hotel reviews, extracting fine-grained opinions on service, location, price, and amenities.',
      [Language.VI]: 'Hệ thống phân tích cảm xúc theo khía cạnh (ABSA) cho đánh giá khách sạn tiếng Việt, trích xuất ý kiến chi tiết về dịch vụ, vị trí, giá cả và tiện nghi.'
    },
    image: '/image-project/Vires-HotelABSA.png',
    link: 'https://github.com/InfinityZero3000/ViRES-HotelABSA-2026',
    demo: 'https://huit-vires-hotelabsa2026.vercel.app/'
  }
];

export const SKILLS: SkillCategory[] = [
  {
    category: { [Language.EN]: 'Frontend', [Language.VI]: 'Frontend' },
    items: [
      { name: 'React.js', level: SkillLevel.BEGINNER },
      { name: 'Next.js', level: SkillLevel.BEGINNER },
      { name: 'Tailwind CSS', level: SkillLevel.BEGINNER },
      { name: 'Bootstrap', level: SkillLevel.BASIC }
    ]
  },
  {
    category: { [Language.EN]: 'Backend', [Language.VI]: 'Backend' },
    items: [
      { name: 'Python', level: SkillLevel.INTERMEDIATE },
      { name: 'C/C++', level: SkillLevel.BASIC },
      { name: '.NET Core 9.0', level: SkillLevel.INTERMEDIATE },
      { name: 'Redis', level: SkillLevel.BASIC }
    ]
  },
  {
    category: { [Language.EN]: 'DevOps', [Language.VI]: 'Vận Hành' },
    items: [
      { name: 'Docker', level: SkillLevel.INTERMEDIATE },
      { name: 'CI/CD Pipelines', level: SkillLevel.BASIC },
      { name: 'GitHub Actions', level: SkillLevel.BASIC }
    ]
  },
  {
    category: { [Language.EN]: 'AI & Data', [Language.VI]: 'Trí tuệ nhân tạo & Dữ Liệu' },
    items: [
      { name: 'PostgreSQL', level: SkillLevel.INTERMEDIATE },
      { name: 'SQL Server', level: SkillLevel.INTERMEDIATE },
      { name: 'Machine Learning', level: SkillLevel.BASIC },
      { name: 'NLP', level: SkillLevel.BEGINNER }
    ]
  }
];

// export const ACHIEVEMENTS: Achievement[] = [
//   {
//     id: 'a1',
//     year: '2023',
//     title: { [Language.EN]: 'Best Innovation Award', [Language.VI]: 'Giải Thưởng Đổi Mới Sáng Tạo' },
//     description: { 
//       [Language.EN]: 'Recognized for creating an accessibility tool for visually impaired developers.',
//       [Language.VI]: 'Được công nhận vì đã tạo ra công cụ hỗ trợ tiếp cận cho các lập trình viên khiếm thị.'
//     }
//   },
//   {
//     id: 'a2',
//     year: '2022',
//     title: { [Language.EN]: 'Hackathon Winner', [Language.VI]: 'Vô Địch Hackathon' },
//     description: {
//       [Language.EN]: '1st place globally in the Decentralized Web Hackathon.',
//       [Language.VI]: 'Hạng nhất toàn cầu trong cuộc thi Decentralized Web Hackathon.'
//     }
//   }
// ];

export const EDUCATION_DATA = [
  {
    id: 'e1',
    year: '2023 - 2027',
    degree: { [Language.EN]: 'Student of Software Technology', [Language.VI]: 'Sinh viên Công nghệ Phần mềm' },
    school: { [Language.EN]: 'Ho Chi Minh City University of Industry And Trade', [Language.VI]: 'Trường Đại học Công Thương TP.HCM' },
    location: { [Language.EN]: 'Ho Chi Minh City, Vietnam', [Language.VI]: 'TP.HCM, Việt Nam' },
  }
];

export const BIO = {
  [Language.EN]: "I'm Nguyen Thang, a Software Developer with a passion for creating useful products for users. Studying and working in Ho Chi Minh City, I aspire to develop my skills and experience in the future.",
  [Language.VI]: "Tôi là Nguyễn Thắng, một Lập Trình Viên Phần Mềm với niềm đam mê tạo ra các sản phẩm hữu ích cho người dùng. Học và làm việc tại TP.HCM, tôi mong muốn phát triển kỹ năng và kinh nghiệm trong tương lai"
};

export const NAME = {
  [Language.EN]: 'Nguyen Huu Thang',
  [Language.VI]: 'Nguyễn Hữu Thắng'
};
