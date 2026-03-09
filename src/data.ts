import { Review } from './types';

export const DEFAULT_DEPARTMENTS = [
  'Computer Science',
  'Data Science',
  'Mathematics',
  'Statistics',
  'Business',
  'Engineering'
];

export const PREDEFINED_TAGS = [
  'strict',
  'chill',
  'easy grader',
  'boring lectures',
  'funny',
  'heavy assignments',
  'clear explanations',
  'helpful',
  'tough exams',
  'lenient attendance',
  'inspiring',
  'monotone',
  'practical examples',
  'theoretical',
  'approachable',
  'intimidating'
];

export const AVATAR_COLORS = [
  '#C2410C', '#9A3412', '#7C2D12', '#92400E', '#78350F',
  '#713F12', '#854D0E', '#A16207', '#CA8A04', '#B45309'
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(name: string): string {
  return name
    .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, '')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export function getOverallAvg(reviews: Review[]): number {
  if (reviews.length === 0) return 0;
  return reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length;
}

export function getCategoryAvg(reviews: Review[], category: keyof Pick<Review, 'teachingRating' | 'examDifficulty' | 'friendliness' | 'clarity' | 'assignmentLoad' | 'attendanceStrictness' | 'overallRating'>): number {
  if (reviews.length === 0) return 0;
  return reviews.reduce((sum, r) => sum + r[category], 0) / reviews.length;
}

export function getTopTags(reviews: Review[]): { tag: string; count: number }[] {
  const tagCounts: Record<string, number> = {};
  reviews.forEach(r => {
    r.tags.forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function compressImage(file: File, maxSize: number = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Image must be under 5MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize; }
        } else {
          if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
