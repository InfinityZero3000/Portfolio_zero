import { Language, RoutePath, NavItem, Project, Achievement, SkillCategory, Skill, SkillLevel } from './types';
import {
  Home,
  Briefcase,
  Cpu,
  Award,
  GraduationCap,
  User,
  FileText
} from 'lucide-react';

export const NAV_ITEMS: (NavItem & { icon: any })[] = [
  { key: 'home', path: RoutePath.HOME, label: { [Language.EN]: 'Home', [Language.VI]: 'Trang Chủ' }, icon: Home },
  { key: 'project', path: RoutePath.PROJECT, label: { [Language.EN]: 'Projects', [Language.VI]: 'Dự Án' }, icon: Briefcase },
  { key: 'about', path: RoutePath.ABOUT, label: { [Language.EN]: 'About', [Language.VI]: 'Giới Thiệu' }, icon: User },
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
    image: 'https://picsum.photos/600/400?random=1'
  },
  {
    id: '2',
    title: 'Mom-Baby Shop E-commerce',
    tech: ['React', 'TypeScript', 'Vite', 'TailwindCSS'],
    description: {
      [Language.EN]: 'Full-featured e-commerce platform for mother and baby products with shopping cart, wishlist, and multi-role authentication.',
      [Language.VI]: 'Nền tảng thương mại điện tử đầy đủ chức năng cho sản phẩm mẹ và bé với giỏ hàng, danh sách yêu thích và xác thực đa vai trò.'
    },
    image: 'https://picsum.photos/600/400?random=2'
  },
  {
    id: '3',
    title: 'Spam Email Classification System',
    tech: ['Python', 'React', 'Scikit-learn', 'Gmail API', 'NLP'],
    description: {
      [Language.EN]: 'ML-powered spam detection system with Gmail integration, Vietnamese text processing, and interactive web interface.',
      [Language.VI]: 'Hệ thống phát hiện spam sử dụng ML với tích hợp Gmail, xử lý văn bản tiếng Việt và giao diện web tương tác.'
    },
    image: 'https://picsum.photos/600/400?random=3'
  },
  {
    id: '4',
    title: 'Student Management System',
    tech: ['Flask', 'Python', 'JavaScript', 'Chart.js', 'Pandas'],
    description: {
      [Language.EN]: 'Comprehensive student management dashboard with statistics, advanced search, and multi-format data import capabilities.',
      [Language.VI]: 'Bảng điều khiển quản lý sinh viên toàn diện với thống kê, tìm kiếm nâng cao và khả năng nhập dữ liệu đa định dạng.'
    },
    image: 'https://picsum.photos/600/400?random=4'
  },
  {
    id: '5',
    title: 'Customer Emotion Recognition',
    tech: ['Python', 'TensorFlow', 'OpenCV', 'Deep Learning', 'Facial Recognition'],
    description: {
      [Language.EN]: 'Real-time emotion recognition system using deep learning for customer sentiment analysis and feedback.',
      [Language.VI]: 'Hệ thống nhận diện cảm xúc thời gian thực sử dụng học sâu để phân tích cảm xúc khách hàng và phản hồi.'
    },
    image: 'https://picsum.photos/600/400?random=5'
  },
  {
    id: '6',
    title: 'Pac-Man with Dijkstra Algorithm',
    tech: ['Python', 'Pygame', 'AI Pathfinding', 'Dijkstra', 'A* Algorithm'],
    description: {
      [Language.EN]: 'Intelligent Pac-Man game implementing Dijkstra/A* pathfinding with ghost avoidance and auto-play mode.',
      [Language.VI]: 'Game Pac-Man thông minh triển khai thuật toán tìm đường Dijkstra/A* với tránh ma và chế độ tự động.'
    },
    image: 'https://picsum.photos/600/400?random=6'
  },
  {
    id: '7',
    title: 'Document Image Processing',
    tech: ['Python', 'OpenCV', 'Tesseract OCR', 'Jupyter'],
    description: {
      [Language.EN]: 'Advanced image processing pipeline for document text cleaning using morphological operations to improve OCR accuracy.',
      [Language.VI]: 'Quy trình xử lý ảnh nâng cao để làm sạch văn bản tài liệu sử dụng các phép hình thái để cải thiện độ chính xác OCR.'
    },
    image: 'https://picsum.photos/600/400?random=7'
  },
  {
    id: '8',
    title: 'John Henry Website',
    tech: ['HTML', 'Bootstrap', 'C#', '.NET Core 9.0', 'PostgreSQL'],
    description: {
      [Language.EN]: 'Professional portfolio website showcasing projects, skills, and experience with modern responsive design.',
      [Language.VI]: 'Website portfolio chuyên nghiệp giới thiệu các dự án, kỹ năng và kinh nghiệm với thiết kế đáp ứng hiện đại.'
    },
    image: 'https://picsum.photos/600/400?random=8'
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
