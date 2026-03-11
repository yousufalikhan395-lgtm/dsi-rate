import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Professor, Review, Page, ProfessorRequest, AISummary } from './types';
import { DEFAULT_DEPARTMENTS } from './data';
import {
  isSupabaseConfigured,
  fetchProfessors, fetchReviews, fetchRequests, fetchSummaries, fetchDepartments,
  sbInsertProfessor, sbDeleteProfessor,
  sbInsertReview, sbUpdateReviewHidden, sbIncrementVote,
  sbInsertRequest, sbUpdateRequestStatus,
  sbUpsertSummary,
  sbInsertDepartment, sbDeleteDepartment,
} from './lib/supabase';

const LLM_API = 'https://backend.buildpicoapps.com/aero/run/llm-api?pk=v1-Z0FBQUFBQnBkMjVhREdzOU9rWU0ycmdvYlFTeENSQzBqbUktWjM1aTRSLW9Fa0l6ZlJlMUdYejM5Tl9uMU1rUkdDS0dFOEVLRGNYY1B3NmpPeFZjTnVYR2pTLUtQZTN1MGc9PQ==';

const SUPABASE_READY = isSupabaseConfigured();
const ADMIN_PASSWORD = 'balubalu3476';

// ---- localStorage helpers ----
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return fallback;
}
function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

// ---- User ID (for review limiting) ----
function getUserId(): string {
  let userId = localStorage.getItem('dsi_user_id');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('dsi_user_id', userId);
  }
  return userId;
}

// ---- Review cooldown helper ----
function getReviewCooldownHours(): number {
  return loadJSON('dsi_review_cooldown_hours', 336); // default 14 days = 336 hours
}

// ---- Disclaimer timer helper ----
function getDisclaimerTimerSeconds(): number {
  return loadJSON('dsi_disclaimer_timer_seconds', 3); // default 3 seconds
}

// ---- AI helpers ----
async function callLLM(prompt: string): Promise<string> {
  try {
    const response = await fetch(LLM_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    if (data.status === 'success') return data.text;
    return '';
  } catch {
    return '';
  }
}

export async function checkToxicity(text: string): Promise<boolean> {
  const result = await callLLM(
    `You are a content moderator. Analyze this student review for toxic, abusive, harassing, or threatening content. Reply with ONLY the single word 'SAFE' or 'TOXIC'. Nothing else.\n\nReview: "${text}"`
  );
  return result.trim().toUpperCase().includes('TOXIC');
}

export async function generateAISummary(reviews: Review[]): Promise<{ summary: string; pros: string[]; cons: string[] } | null> {
  if (reviews.length === 0) return null;
  const reviewTexts = reviews.map((r, i) => `${i + 1}. ${r.comment}`).join('\n');
  const result = await callLLM(
    `You are analyzing student reviews of a university professor. Based on these reviews, provide a summary.\n\nRespond ONLY with valid JSON in this exact format (no markdown, no code blocks):\n{"summary": "A 2-3 sentence summary", "pros": ["pro 1", "pro 2"], "cons": ["con 1", "con 2"]}\n\nReviews:\n${reviewTexts}`
  );
  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function extractAITags(reviewText: string): Promise<string[]> {
  const result = await callLLM(
    `Extract 2-3 descriptive tags from this student review. Choose ONLY from this list: strict, chill, easy grader, boring lectures, funny, heavy assignments, clear explanations, helpful, tough exams, lenient attendance, inspiring, monotone, practical examples, theoretical, approachable, intimidating.\n\nReply with ONLY comma-separated tags from the list above. Nothing else.\n\nReview: "${reviewText}"`
  );
  if (!result) return [];
  return result.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0 && t.length < 30);
}

// ---- App State ----
interface AppState {
  page: Page;
  selectedProfessorId: string | null;
  searchQuery: string;
  professors: Professor[];
  reviews: Review[];
  requests: ProfessorRequest[];
  summaries: AISummary[];
  departments: string[];
  votedReviews: Record<string, 'helpful' | 'notHelpful'>;
  supabaseConnected: boolean;
  loading: boolean;
  isAdminAuthenticated: boolean;
  reviewCooldownHours: number;
  disclaimerTimerSeconds: number;
  navigate: (page: Page, professorId?: string | null) => void;
  setSearchQuery: (query: string) => void;
  addReview: (review: Omit<Review, 'id' | 'createdAt' | 'helpful' | 'notHelpful' | 'hidden' | 'userId'>) => void;
  voteReview: (reviewId: string, type: 'helpful' | 'notHelpful') => void;
  addRequest: (request: Omit<ProfessorRequest, 'id' | 'status' | 'createdAt'>) => void;
  approveRequest: (id: string) => void;
  rejectRequest: (id: string) => void;
  deleteReview: (id: string) => void;
  restoreReview: (id: string) => void;
  updateSummary: (professorId: string, summary: AISummary) => void;
  addDepartment: (name: string) => void;
  removeDepartment: (name: string) => void;
  deleteProfessor: (id: string) => void;
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
  canReviewProfessor: (professorId: string) => { allowed: boolean; remainingHours: number };
  setReviewCooldownHours: (hours: number) => void;
  setDisclaimerTimerSeconds: (seconds: number) => void;
}

const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<Page>('home');
  const [selectedProfessorId, setSelectedProfessorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(SUPABASE_READY);

  // All persistent state loaded from localStorage
  const [professors, setProfessors] = useState<Professor[]>(() => loadJSON('dsi_professors', []));
  const [reviews, setReviews] = useState<Review[]>(() => loadJSON('dsi_reviews', []));
  const [requests, setRequests] = useState<ProfessorRequest[]>(() => loadJSON('dsi_requests', []));
  const [summaries, setSummaries] = useState<AISummary[]>(() => loadJSON('dsi_summaries', []));
  const [departments, setDepartments] = useState<string[]>(() => loadJSON('dsi_departments', DEFAULT_DEPARTMENTS));
  const [votedReviews, setVotedReviews] = useState<Record<string, 'helpful' | 'notHelpful'>>(() => loadJSON('dsi_voted', {}));
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => loadJSON('dsi_admin_auth', false));

  // Persist to localStorage whenever state changes
  useEffect(() => { saveJSON('dsi_professors', professors); }, [professors]);
  useEffect(() => { saveJSON('dsi_reviews', reviews); }, [reviews]);
  useEffect(() => { saveJSON('dsi_requests', requests); }, [requests]);
  useEffect(() => { saveJSON('dsi_summaries', summaries); }, [summaries]);
  useEffect(() => { saveJSON('dsi_departments', departments); }, [departments]);
  useEffect(() => { saveJSON('dsi_voted', votedReviews); }, [votedReviews]);

  // Load from Supabase on mount (overrides localStorage if available)
  useEffect(() => {
    if (!SUPABASE_READY) return;
    let cancelled = false;

    (async () => {
      try {
        const [profs, revs, reqs, sums, depts] = await Promise.all([
          fetchProfessors(), fetchReviews(), fetchRequests(), fetchSummaries(), fetchDepartments()
        ]);
        if (cancelled) return;
        setProfessors(profs);
        setReviews(revs);
        setRequests(reqs);
        setSummaries(sums);
        if (depts.length > 0) setDepartments(depts);
      } catch (e) {
        console.error('Failed to load from Supabase:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const navigate = useCallback((newPage: Page, professorId?: string | null) => {
    setPage(newPage);
    if (professorId !== undefined) setSelectedProfessorId(professorId);
    window.scrollTo(0, 0);
  }, []);

  const addReview = useCallback(async (review: Omit<Review, 'id' | 'createdAt' | 'helpful' | 'notHelpful' | 'hidden' | 'userId'>) => {
    const currentUserId = getUserId();
    const newReview: Review = {
      ...review,
      id: 'r' + Date.now(),
      userId: currentUserId,
      createdAt: new Date().toISOString(),
      helpful: 0,
      notHelpful: 0,
      hidden: false
    };
    
    const updatedReviews = [newReview, ...reviews];
    setReviews(updatedReviews);
    
    const profReviews = updatedReviews.filter(r => r.professorId === review.professorId && !r.hidden);
    
    const result = await generateAISummary(profReviews);
    if (result) {
      const newSummary: AISummary = {
        professorId: review.professorId,
        summary: result.summary,
        pros: result.pros,
        cons: result.cons,
        generatedAt: new Date().toISOString().split('T')[0]
      };
      setSummaries(prev => {
        const filtered = prev.filter(s => s.professorId !== review.professorId);
        return [...filtered, newSummary];
      });
      if (SUPABASE_READY) {
        sbInsertReview(newReview);
        sbUpsertSummary(newSummary);
      }
    } else if (SUPABASE_READY) {
      sbInsertReview(newReview);
    }
  }, [reviews]);

  const voteReview = useCallback((reviewId: string, type: 'helpful' | 'notHelpful') => {
    setVotedReviews(prev => {
      if (prev[reviewId]) return prev;
      return { ...prev, [reviewId]: type };
    });
    setReviews(prev => prev.map(r => {
      if (r.id !== reviewId) return r;
      if (type === 'helpful') return { ...r, helpful: r.helpful + 1 };
      return { ...r, notHelpful: r.notHelpful + 1 };
    }));
    if (SUPABASE_READY) {
      sbIncrementVote(reviewId, type === 'helpful' ? 'helpful' : 'not_helpful');
    }
  }, []);

  const addRequest = useCallback((request: Omit<ProfessorRequest, 'id' | 'status' | 'createdAt'>) => {
    const newRequest: ProfessorRequest = {
      ...request,
      id: 'req' + Date.now(),
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setRequests(prev => [newRequest, ...prev]);
    if (SUPABASE_READY) sbInsertRequest(newRequest);
  }, []);

  const approveRequest = useCallback((id: string) => {
    const req = requests.find(r => r.id === id);
    if (!req || req.status !== 'pending') return;
    const newProf: Professor = {
      id: 'p' + Date.now(),
      name: req.name,
      department: req.department,
      subjects: req.subjects.split(',').map(s => s.trim()),
      yearsTeaching: req.yearsTeaching,
      photoUrl: req.photo,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setProfessors(p => [...p, newProf]);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' as const } : r));
    setDepartments(d => {
      if (!d.includes(req.department)) {
        if (SUPABASE_READY) sbInsertDepartment(req.department);
        return [...d, req.department];
      }
      return d;
    });
    if (SUPABASE_READY) {
      sbInsertProfessor(newProf);
      sbUpdateRequestStatus(id, 'approved');
    }
  }, [requests]);

  const rejectRequest = useCallback((id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' as const } : r));
    if (SUPABASE_READY) sbUpdateRequestStatus(id, 'rejected');
  }, []);

  const deleteReview = useCallback((id: string) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, hidden: true } : r));
    if (SUPABASE_READY) sbUpdateReviewHidden(id, true);
  }, []);

  const restoreReview = useCallback((id: string) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, hidden: false } : r));
    if (SUPABASE_READY) sbUpdateReviewHidden(id, false);
  }, []);

  const updateSummary = useCallback((professorId: string, summary: AISummary) => {
    setSummaries(prev => {
      const existing = prev.findIndex(s => s.professorId === professorId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = summary;
        return updated;
      }
      return [...prev, summary];
    });
    if (SUPABASE_READY) sbUpsertSummary(summary);
  }, []);

  const addDepartment = useCallback((name: string) => {
    setDepartments(prev => {
      const trimmed = name.trim();
      if (!trimmed || prev.includes(trimmed)) return prev;
      if (SUPABASE_READY) sbInsertDepartment(trimmed);
      return [...prev, trimmed];
    });
  }, []);

  const removeDepartment = useCallback((name: string) => {
    setDepartments(prev => prev.filter(d => d !== name));
    if (SUPABASE_READY) sbDeleteDepartment(name);
  }, []);

  const deleteProfessor = useCallback((id: string) => {
    setProfessors(prev => prev.filter(p => p.id !== id));
    setReviews(prev => prev.filter(r => r.professorId !== id));
    setSummaries(prev => prev.filter(s => s.professorId !== id));
    if (SUPABASE_READY) sbDeleteProfessor(id);
  }, []);

  const loginAdmin = useCallback((password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      saveJSON('dsi_admin_auth', true);
      return true;
    }
    return false;
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdminAuthenticated(false);
    saveJSON('dsi_admin_auth', false);
  }, []);

  const [reviewCooldownHours, setReviewCooldownHoursState] = useState<number>(() => getReviewCooldownHours());

  const [disclaimerTimerSeconds, setDisclaimerTimerSecondsState] = useState<number>(() => getDisclaimerTimerSeconds());

  const canReviewProfessor = useCallback((professorId: string) => {
    const userId = getUserId();
    const cooldownHours = reviewCooldownHours;
    const profUserReviews = reviews.filter(r => r.professorId === professorId && r.userId === userId && !r.hidden);
    
    if (profUserReviews.length === 0) {
      return { allowed: true, remainingHours: 0 };
    }
    
    const lastReview = profUserReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const lastReviewTime = new Date(lastReview.createdAt).getTime();
    const now = Date.now();
    const hoursPassed = (now - lastReviewTime) / (1000 * 60 * 60);
    const remainingHours = Math.max(0, cooldownHours - hoursPassed);
    
    return { allowed: remainingHours <= 0, remainingHours: Math.ceil(remainingHours) };
  }, [reviews, reviewCooldownHours]);

  const setReviewCooldownHours = useCallback((hours: number) => {
    setReviewCooldownHoursState(hours);
    saveJSON('dsi_review_cooldown_hours', hours);
  }, []);

  const setDisclaimerTimerSeconds = useCallback((seconds: number) => {
    setDisclaimerTimerSecondsState(seconds);
    saveJSON('dsi_disclaimer_timer_seconds', seconds);
  }, []);

  return (
    <AppContext.Provider value={{
      page, selectedProfessorId, searchQuery, professors, reviews, requests, summaries, departments, votedReviews,
      supabaseConnected: SUPABASE_READY, loading, isAdminAuthenticated, reviewCooldownHours, disclaimerTimerSeconds,
      navigate, setSearchQuery, addReview, voteReview, addRequest, approveRequest, rejectRequest,
      deleteReview, restoreReview, updateSummary, addDepartment, removeDepartment, deleteProfessor,
      loginAdmin, logoutAdmin, canReviewProfessor, setReviewCooldownHours, setDisclaimerTimerSeconds
    }}>
      {children}
    </AppContext.Provider>
  );
}
