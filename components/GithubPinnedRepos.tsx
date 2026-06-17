import React, { useEffect, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Star, GitFork, ExternalLink, Github, RefreshCw, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getTranslations } from '../i18n/translations';
import { Language } from '../types';
import clsx from 'clsx';

export interface PinnedRepo {
  name: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { name: string; color: string } | null;
  homepageUrl: string | null;
  updatedAt: string;
  isPrivate: boolean;
}

// Language color fallback map
const LANG_COLOR_FALLBACK: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  CSS: '#563d7c',
  HTML: '#e34c26',
  Vue: '#41b883',
  Svelte: '#ff3e00',
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const RepoCard: React.FC<{ repo: PinnedRepo; lang: 'EN' | 'VI' }> = memo(({ repo, lang }) => {
  const { theme } = useTheme();
  const t = getTranslations(lang as Language);
  const langColor =
    repo.primaryLanguage?.color ||
    LANG_COLOR_FALLBACK[repo.primaryLanguage?.name ?? ''] ||
    '#6b7280';

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return t.github.today;
    if (days < 30) return t.github.daysAgo(days);
    const months = Math.floor(days / 30);
    if (months < 12) return t.github.monthsAgo(months);
    return t.github.yearsAgo(Math.floor(months / 12));
  };

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4 }}
      className={clsx(
        'group relative backdrop-blur-sm border rounded-2xl p-6 flex flex-col gap-4 hover:border-brand-600/60 transition-colors duration-300 overflow-hidden',
        theme === 'dark'
          ? 'bg-dark-800/60 border-dark-700'
          : 'bg-white border-stone-200 shadow-sm'
      )}
    >
      {/* Glow accent on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08) 0%, transparent 70%)' }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Github size={16} className={theme === 'dark' ? 'text-gray-500 shrink-0' : 'text-stone-400 shrink-0'} />
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className={clsx(
              'font-mono text-sm font-semibold hover:text-brand-500 transition-colors truncate',
              theme === 'dark' ? 'text-white' : 'text-stone-800'
            )}
          >
            {repo.name}
          </a>
        </div>
        {repo.primaryLanguage && (
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full border shrink-0"
            style={{ color: langColor, borderColor: `${langColor}40`, backgroundColor: `${langColor}10` }}
          >
            {repo.primaryLanguage.name}
          </span>
        )}
      </div>

      {/* Description */}
      <p className={clsx('text-sm leading-relaxed line-clamp-2 flex-1', theme === 'dark' ? 'text-gray-400' : 'text-stone-500')}>
        {repo.description || <span className={clsx('italic', theme === 'dark' ? 'text-gray-600' : 'text-stone-400')}>{t.github.noDescription}</span>}
      </p>

      {/* Footer */}
      <div className={clsx('flex items-center justify-between pt-2 border-t', theme === 'dark' ? 'border-dark-700' : 'border-stone-100')}>
        <div className={clsx('flex items-center gap-4 text-xs', theme === 'dark' ? 'text-gray-500' : 'text-stone-400')}>
          <span className="flex items-center gap-1.5">
            <Star size={13} className="text-yellow-500" />
            {repo.stargazerCount}
          </span>
          <span className="flex items-center gap-1.5">
            <GitFork size={13} className="text-blue-400" />
            {repo.forkCount}
          </span>
          <span className={theme === 'dark' ? 'text-gray-600' : 'text-stone-400'}>{timeAgo(repo.updatedAt)}</span>
        </div>

        <div className="flex items-center gap-2">
          {repo.homepageUrl && (
            <a
              href={repo.homepageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={clsx('p-1.5 rounded-lg transition-colors hover:text-brand-500', theme === 'dark' ? 'text-gray-500 hover:bg-dark-700' : 'text-stone-400 hover:bg-stone-100')}
              title="Live Demo"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className={clsx('p-1.5 rounded-lg transition-colors', theme === 'dark' ? 'text-gray-500 hover:text-white hover:bg-dark-700' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100')}
            title="View on GitHub"
          >
            <Github size={14} />
          </a>
        </div>
      </div>
    </motion.div>
  );
});

type FetchState = 'idle' | 'loading' | 'success' | 'error';

const GithubPinnedRepos: React.FC<{ lang: 'EN' | 'VI' }> = ({ lang }) => {
  const { theme } = useTheme();
  const [repos, setRepos] = useState<PinnedRepo[]>([]);
  const [state, setState] = useState<FetchState>('idle');
  const [error, setError] = useState<string>('');

  const fetchRepos = async () => {
    setState('loading');
    setError('');
    try {
      const res = await fetch('/api/pinned-repos');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg =
          (body?.error ? String(body.error) : '') +
          (body?.hint ? ` — ${String(body.hint)}` : '');
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const data: PinnedRepo[] = await res.json();
      setRepos(data);
      setState('success');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch');
      setState('error');
    }
  };

  useEffect(() => { fetchRepos(); }, []);

  const t = getTranslations(lang as Language);

  return (
    <div className="space-y-8">
      {/* Subtitle */}
      <p className={clsx('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-stone-500')}>{t.github.subtitle}</p>

      {/* Loading skeleton */}
      {state === 'loading' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={clsx('border rounded-2xl p-6 space-y-3 animate-pulse', theme === 'dark' ? 'bg-dark-800/40 border-dark-700' : 'bg-white border-stone-200')}>
              <div className="flex justify-between">
                <div className={clsx('h-4 rounded w-2/5', theme === 'dark' ? 'bg-dark-700' : 'bg-stone-200')} />
                <div className={clsx('h-4 rounded w-1/5', theme === 'dark' ? 'bg-dark-700' : 'bg-stone-200')} />
              </div>
              <div className={clsx('h-3 rounded w-full', theme === 'dark' ? 'bg-dark-700' : 'bg-stone-200')} />
              <div className={clsx('h-3 rounded w-3/4', theme === 'dark' ? 'bg-dark-700' : 'bg-stone-200')} />
              <div className={clsx('h-px mt-4', theme === 'dark' ? 'bg-dark-700' : 'bg-stone-100')} />
              <div className="flex gap-4">
                <div className={clsx('h-3 rounded w-8', theme === 'dark' ? 'bg-dark-700' : 'bg-stone-200')} />
                <div className={clsx('h-3 rounded w-8', theme === 'dark' ? 'bg-dark-700' : 'bg-stone-200')} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <AlertCircle size={40} className="text-brand-600" />
          <p className="text-gray-400">{t.github.errorMsg}</p>
          <p className="text-gray-600 text-xs font-mono">{error}</p>
          <button
            onClick={fetchRepos}
            className={clsx('flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm hover:border-brand-600', theme === 'dark' ? 'bg-dark-800 hover:bg-dark-700 border-dark-700 text-white' : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700')}
          >
            <RefreshCw size={14} /> {t.github.retry}
          </button>
        </div>
      )}

      {/* Repo grid */}
      {state === 'success' && repos.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {repos.map((repo) => (
            <RepoCard key={repo.name} repo={repo} lang={lang} />
          ))}
        </motion.div>
      )}

      {/* View All button */}
      {state === 'success' && (
        <div className="flex justify-center pt-4">
          <a
            href={`https://github.com/InfinityZero3000?tab=repositories`}
            target="_blank"
            rel="noopener noreferrer"
            className={clsx('group flex items-center gap-2 px-6 py-3 border rounded-full text-sm transition-all duration-300 hover:border-brand-600 hover:bg-brand-600/10', theme === 'dark' ? 'border-dark-700 text-gray-400 hover:text-white' : 'border-stone-300 text-stone-500 hover:text-brand-600')}
          >
            {t.github.viewAll}
            <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      )}
    </div>
  );
};

export default GithubPinnedRepos;
