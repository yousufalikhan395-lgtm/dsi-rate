import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Professor, Review, ProfessorRequest, AISummary } from '../types';

// =====================================================
// SUPABASE CONFIGURATION
// =====================================================
// To enable Supabase, create a .env file in the project root with:
//   VITE_SUPABASE_URL=https://your-project.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key
//
// Without these, the app uses localStorage (browser-only storage).
// =====================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
}

// ---- Row → Type Mappers ----

/* eslint-disable @typescript-eslint/no-explicit-any */
function toProfessor(r: any): Professor {
  return { id: r.id, name: r.name, department: r.department, subjects: r.subjects || [], yearsTeaching: r.years_teaching, photoUrl: r.photo_url || '', createdAt: r.created_at };
}
function toReview(r: any): Review {
  return { id: r.id, professorId: r.professor_id, nickname: r.nickname, comment: r.comment, teachingRating: r.teaching_rating, examDifficulty: r.exam_difficulty, friendliness: r.friendliness, clarity: r.clarity, assignmentLoad: r.assignment_load, attendanceStrictness: r.attendance_strictness, overallRating: r.overall_rating, tags: r.tags || [], helpful: r.helpful, notHelpful: r.not_helpful, createdAt: r.created_at, hidden: r.hidden };
}
function toRequest(r: any): ProfessorRequest {
  return { id: r.id, name: r.name, department: r.department, subjects: r.subjects, yearsTeaching: r.years_teaching, photo: r.photo || '', status: r.status, createdAt: r.created_at };
}
function toSummary(r: any): AISummary {
  return { professorId: r.professor_id, summary: r.summary, pros: r.pros || [], cons: r.cons || [], generatedAt: r.generated_at };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---- Professors ----

export async function fetchProfessors(): Promise<Professor[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data, error } = await sb.from('professors').select('*').order('created_at', { ascending: false });
  if (error) { console.error('fetchProfessors:', error); return []; }
  return (data || []).map(toProfessor);
}

export async function sbInsertProfessor(p: Professor): Promise<boolean> {
  const sb = getSupabase(); if (!sb) return false;
  const { error } = await sb.from('professors').insert({
    id: p.id, name: p.name, department: p.department, subjects: p.subjects,
    years_teaching: p.yearsTeaching, photo_url: p.photoUrl, created_at: p.createdAt,
  });
  if (error) { console.error('sbInsertProfessor:', error); return false; }
  return true;
}

export async function sbDeleteProfessor(id: string): Promise<boolean> {
  const sb = getSupabase(); if (!sb) return false;
  const { error } = await sb.from('professors').delete().eq('id', id);
  if (error) { console.error('sbDeleteProfessor:', error); return false; }
  return true;
}

// ---- Reviews ----

export async function fetchReviews(): Promise<Review[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data, error } = await sb.from('reviews').select('*').order('created_at', { ascending: false });
  if (error) { console.error('fetchReviews:', error); return []; }
  return (data || []).map(toReview);
}

export async function sbInsertReview(r: Review): Promise<boolean> {
  const sb = getSupabase(); if (!sb) return false;
  const { error } = await sb.from('reviews').insert({
    id: r.id, professor_id: r.professorId, nickname: r.nickname, comment: r.comment,
    teaching_rating: r.teachingRating, exam_difficulty: r.examDifficulty,
    friendliness: r.friendliness, clarity: r.clarity, assignment_load: r.assignmentLoad,
    attendance_strictness: r.attendanceStrictness, overall_rating: r.overallRating,
    tags: r.tags, helpful: r.helpful, not_helpful: r.notHelpful,
    created_at: r.createdAt, hidden: r.hidden,
  });
  if (error) { console.error('sbInsertReview:', error); return false; }
  return true;
}

export async function sbUpdateReviewHidden(id: string, hidden: boolean): Promise<boolean> {
  const sb = getSupabase(); if (!sb) return false;
  const { error } = await sb.from('reviews').update({ hidden }).eq('id', id);
  if (error) { console.error('sbUpdateReviewHidden:', error); return false; }
  return true;
}

export async function sbIncrementVote(id: string, field: 'helpful' | 'not_helpful'): Promise<boolean> {
  const sb = getSupabase(); if (!sb) return false;
  const { data } = await sb.from('reviews').select(field).eq('id', id).single();
  if (data) {
    const currentVal = (data as Record<string, number>)[field] || 0;
    const { error } = await sb.from('reviews').update({ [field]: currentVal + 1 }).eq('id', id);
    if (error) { console.error('sbIncrementVote:', error); return false; }
  }
  return true;
}

// ---- Professor Requests ----

export async function fetchRequests(): Promise<ProfessorRequest[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data, error } = await sb.from('professor_requests').select('*').order('created_at', { ascending: false });
  if (error) { console.error('fetchRequests:', error); return []; }
  return (data || []).map(toRequest);
}

export async function sbInsertRequest(r: ProfessorRequest): Promise<boolean> {
  const sb = getSupabase(); if (!sb) return false;
  const { error } = await sb.from('professor_requests').insert({
    id: r.id, name: r.name, department: r.department, subjects: r.subjects,
    years_teaching: r.yearsTeaching, photo: r.photo, status: r.status, created_at: r.createdAt,
  });
  if (error) { console.error('sbInsertRequest:', error); return false; }
  return true;
}

export async function sbUpdateRequestStatus(id: string, status: string): Promise<boolean> {
  const sb = getSupabase(); if (!sb) return false;
  const { error } = await sb.from('professor_requests').update({ status }).eq('id', id);
  if (error) { console.error('sbUpdateRequestStatus:', error); return false; }
  return true;
}

// ---- AI Summaries ----

export async function fetchSummaries(): Promise<AISummary[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data, error } = await sb.from('ai_summaries').select('*');
  if (error) { console.error('fetchSummaries:', error); return []; }
  return (data || []).map(toSummary);
}

export async function sbUpsertSummary(s: AISummary): Promise<boolean> {
  const sb = getSupabase(); if (!sb) return false;
  const { error } = await sb.from('ai_summaries').upsert({
    professor_id: s.professorId, summary: s.summary, pros: s.pros, cons: s.cons, generated_at: s.generatedAt,
  }, { onConflict: 'professor_id' });
  if (error) { console.error('sbUpsertSummary:', error); return false; }
  return true;
}

// ---- Departments ----

export async function fetchDepartments(): Promise<string[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data, error } = await sb.from('departments').select('name').order('name');
  if (error) { console.error('fetchDepartments:', error); return []; }
  return (data || []).map((d: { name: string }) => d.name);
}

export async function sbInsertDepartment(name: string): Promise<boolean> {
  const sb = getSupabase(); if (!sb) return false;
  const { error } = await sb.from('departments').upsert({ name }, { onConflict: 'name' });
  if (error) { console.error('sbInsertDepartment:', error); return false; }
  return true;
}

export async function sbDeleteDepartment(name: string): Promise<boolean> {
  const sb = getSupabase(); if (!sb) return false;
  const { error } = await sb.from('departments').delete().eq('name', name);
  if (error) { console.error('sbDeleteDepartment:', error); return false; }
  return true;
}
