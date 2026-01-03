export enum Language {
  EN = 'EN',
  VI = 'VI'
}

export enum RoutePath {
  HOME = '/',
  ZERO = '/',
  PROJECT = '/project',
  SKILL = '/skill',
  ACHIEVEMENTS = '/achievements',
  EDUCATION = '/education',
  ABOUT = '/about',
  RESUME = '/resume'
}

export interface NavItem {
  key: string;
  path: RoutePath;
  label: {
    [Language.EN]: string;
    [Language.VI]: string;
  };
}

export interface Achievement {
  id: string;
  year: string;
  title: { [key in Language]: string };
  description: { [key in Language]: string };
}

export interface Project {
  id: string;
  title: string;
  tech: string[];
  description: { [key in Language]: string };
  image: string;
  link?: string;
}

export enum SkillLevel {
  BEGINNER = 'Beginner',
  BASIC = 'Basic',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
  EXPERT = 'Expert'
}

export interface Skill {
  name: string;
  level: SkillLevel;
}

export interface SkillCategory {
  category: { [key in Language]: string };
  items: Skill[];
}
