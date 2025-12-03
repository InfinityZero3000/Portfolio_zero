import { Language, RoutePath, NavItem, Project, Achievement, SkillCategory } from './types';
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
  { key: 'zero', path: RoutePath.ZERO, label: { [Language.EN]: 'Zero', [Language.VI]: 'Zero' }, icon: Home },
  { key: 'project', path: RoutePath.PROJECT, label: { [Language.EN]: 'Projects', [Language.VI]: 'Dự Án' }, icon: Briefcase },
  { key: 'skill', path: RoutePath.SKILL, label: { [Language.EN]: 'Skills', [Language.VI]: 'Kỹ Năng' }, icon: Cpu },
  { key: 'achievements', path: RoutePath.ACHIEVEMENTS, label: { [Language.EN]: 'Achievements', [Language.VI]: 'Thành Tựu' }, icon: Award },
  { key: 'education', path: RoutePath.EDUCATION, label: { [Language.EN]: 'Education', [Language.VI]: 'Học Vấn' }, icon: GraduationCap },
  { key: 'about', path: RoutePath.ABOUT, label: { [Language.EN]: 'About', [Language.VI]: 'Giới Thiệu' }, icon: User },
  { key: 'resume', path: RoutePath.RESUME, label: { [Language.EN]: 'Resume', [Language.VI]: 'Hồ Sơ' }, icon: FileText },
];

export const PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Neon Commerce',
    tech: ['React', 'Node.js', 'MongoDB', 'Redux'],
    description: {
      [Language.EN]: 'A high-performance e-commerce platform with real-time inventory tracking.',
      [Language.VI]: 'Nền tảng thương mại điện tử hiệu suất cao với theo dõi kho hàng thời gian thực.'
    },
    image: 'https://picsum.photos/600/400?random=1'
  },
  {
    id: '2',
    title: 'AI Chatbot Integration',
    tech: ['Python', 'Gemini API', 'FastAPI', 'React'],
    description: {
      [Language.EN]: 'Intelligent customer support agent leveraging LLMs for natural conversation.',
      [Language.VI]: 'Đại lý hỗ trợ khách hàng thông minh sử dụng LLM cho các cuộc hội thoại tự nhiên.'
    },
    image: 'https://picsum.photos/600/400?random=2'
  },
  {
    id: '3',
    title: 'Crypto Dashboard',
    tech: ['TypeScript', 'D3.js', 'WebSocket'],
    description: {
      [Language.EN]: 'Real-time cryptocurrency visualization tool with predictive analytics.',
      [Language.VI]: 'Công cụ trực quan hóa tiền điện tử thời gian thực với phân tích dự đoán.'
    },
    image: 'https://picsum.photos/600/400?random=3'
  }
];

export const SKILLS: SkillCategory[] = [
  {
    category: { [Language.EN]: 'Frontend', [Language.VI]: 'Frontend' },
    items: ['React.js', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Framer Motion', 'Three.js']
  },
  {
    category: { [Language.EN]: 'Backend', [Language.VI]: 'Backend' },
    items: ['Node.js', 'NestJS', 'Python', 'Go', 'PostgreSQL', 'Redis']
  },
  {
    category: { [Language.EN]: 'DevOps', [Language.VI]: 'Vận Hành' },
    items: ['Docker', 'Kubernetes', 'AWS', 'CI/CD Pipelines', 'Terraform']
  }
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'a1',
    year: '2023',
    title: { [Language.EN]: 'Best Innovation Award', [Language.VI]: 'Giải Thưởng Đổi Mới Sáng Tạo' },
    description: { 
      [Language.EN]: 'Recognized for creating an accessibility tool for visually impaired developers.',
      [Language.VI]: 'Được công nhận vì đã tạo ra công cụ hỗ trợ tiếp cận cho các lập trình viên khiếm thị.'
    }
  },
  {
    id: 'a2',
    year: '2022',
    title: { [Language.EN]: 'Hackathon Winner', [Language.VI]: 'Vô Địch Hackathon' },
    description: {
      [Language.EN]: '1st place globally in the Decentralized Web Hackathon.',
      [Language.VI]: 'Hạng nhất toàn cầu trong cuộc thi Decentralized Web Hackathon.'
    }
  }
];

export const EDUCATION_DATA = [
  {
    id: 'e1',
    year: '2018 - 2022',
    degree: { [Language.EN]: 'Bachelor of Software Engineering', [Language.VI]: 'Cử Nhân Kỹ Thuật Phần Mềm' },
    school: { [Language.EN]: 'University of Information Technology', [Language.VI]: 'Trường Đại học Công nghệ Thông tin' },
    location: 'Ho Chi Minh City, Vietnam'
  }
];

export const BIO = {
  [Language.EN]: "I am a Senior Frontend Engineer passionate about crafting immersive digital experiences. Based in Ho Chi Minh City, I blend technical precision with artistic motion to build the future of the web.",
  [Language.VI]: "Tôi là Kỹ sư Frontend cao cấp với niềm đam mê tạo ra các trải nghiệm kỹ thuật số sống động. Làm việc tại TP.HCM, tôi kết hợp sự chính xác về kỹ thuật với nghệ thuật chuyển động để xây dựng tương lai của web."
};
