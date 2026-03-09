export interface Professor {
  id: string;
  name: string;
  department: string;
  subjects: string[];
  yearsTeaching: number;
  photoUrl: string;
  createdAt: string;
}

export interface Review {
  id: string;
  professorId: string;
  userId: string;
  nickname: string;
  comment: string;
  teachingRating: number;
  examDifficulty: number;
  friendliness: number;
  clarity: number;
  assignmentLoad: number;
  attendanceStrictness: number;
  overallRating: number;
  tags: string[];
  helpful: number;
  notHelpful: number;
  createdAt: string;
  hidden: boolean;
}

export interface ProfessorRequest {
  id: string;
  name: string;
  department: string;
  subjects: string;
  yearsTeaching: number;
  photo: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AISummary {
  professorId: string;
  summary: string;
  pros: string[];
  cons: string[];
  generatedAt: string;
}

export type Page = 'home' | 'professor' | 'leaderboards' | 'request' | 'admin' | 'search';

export type LeaderboardCategory =
  | 'top-rated'
  | 'best-teaching'
  | 'hardest-exams'
  | 'strictest-attendance'
  | 'most-assignments'
  | 'friendliest';
