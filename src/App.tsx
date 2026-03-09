import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Star, ThumbsUp, ThumbsDown, Trophy, BookOpen, Skull, Clock,
  Send, Shield, AlertTriangle, X, Menu, ChevronRight, Users, Award,
  Flame, Eye, EyeOff, MessageSquare, Tag, Plus, Check,
  ArrowUpDown, GraduationCap, Frown, Smile, Loader2,
  BarChart3, UserPlus, RefreshCw, Home, ListOrdered, FileQuestion, Settings,
  Trash2, Image as ImageIcon, FolderPlus, Upload, Camera, Database
} from 'lucide-react';
import { Professor, Review, Page } from './types';
import {
  PREDEFINED_TAGS, getAvatarColor, getInitials,
  getOverallAvg, getCategoryAvg, getTopTags, timeAgo, compressImage
} from './data';
import { useApp, AppProvider, generateAISummary, extractAITags } from './store';

/* ============================
   REUSABLE COMPONENTS
   ============================ */

function BurntFrame({ children, className = '', size = 'md' }: { children: React.ReactNode; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'p-1.5', md: 'p-2.5', lg: 'p-3' };
  return (
    <div className={`burnt-frame ${sizeClasses[size]} ${className}`}>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Avatar({ name, photoUrl, size = 'md' }: { name: string; photoUrl?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const color = getAvatarColor(name);
  const initials = getInitials(name);
  const sizeClasses = { sm: 'w-10 h-10 text-sm', md: 'w-16 h-16 text-xl', lg: 'w-24 h-24 text-3xl', xl: 'w-32 h-32 text-4xl' };
  const [imgError, setImgError] = useState(false);

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sizeClasses[size]} rounded-md object-cover`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-md flex items-center justify-center font-bold text-white font-heading`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${sizeClasses[size]} ${i <= Math.round(rating) ? 'fill-primary text-primary' : 'text-gray-600'}`}
        />
      ))}
    </div>
  );
}

function StarInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-300 min-w-[140px]">{label}</span>
      <div className="flex gap-1 star-input">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(i)}
            className="p-0.5"
          >
            <Star
              className={`w-6 h-6 star-icon transition-colors ${
                i <= (hover || value) ? 'fill-primary text-primary' : 'text-gray-600 hover:text-gray-400'
              }`}
            />
          </button>
        ))}
        <span className="text-sm text-gray-400 ml-2 w-4">{value || ''}</span>
      </div>
    </div>
  );
}

function RatingBar({ label, value, maxValue = 5, icon }: { label: string; value: number; maxValue?: number; icon?: React.ReactNode }) {
  const percentage = (value / maxValue) * 100;
  const getColor = (val: number) => {
    if (val >= 4) return 'bg-green-500';
    if (val >= 3) return 'bg-primary';
    if (val >= 2) return 'bg-orange-500';
    return 'bg-red-500';
  };
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 min-w-[160px]">
        {icon}
        <span className="text-sm text-gray-300">{label}</span>
      </div>
      <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full rating-bar-fill ${getColor(value)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-primary min-w-[32px] text-right">{value.toFixed(1)}</span>
    </div>
  );
}

function TagBadge({ tag, count }: { tag: string; count?: number }) {
  return (
    <span className="tag-badge px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-default">
      <Tag className="w-3 h-3 text-primary" />
      <span className="text-cream">{tag}</span>
      {count !== undefined && <span className="text-gray-400">({count})</span>}
    </span>
  );
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay bg-black/70" onClick={onClose}>
      <div
        className="bg-surface border border-surface-border rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-border">
          <h3 className="text-lg font-heading text-primary text-glow-sm">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ============================
   PROFESSOR CARD
   ============================ */

function ProfessorCard({ professor, reviews }: { professor: Professor; reviews: Review[] }) {
  const { navigate } = useApp();
  const profReviews = reviews.filter(r => r.professorId === professor.id && !r.hidden);
  const avgRating = getOverallAvg(profReviews);
  const topTags = getTopTags(profReviews).slice(0, 3);

  return (
    <div
      className="wanted-poster rounded-xl p-4 cursor-pointer card-hover animate-fadeIn"
      onClick={() => navigate('professor', professor.id)}
    >
      <div className="flex flex-col items-center text-center">
        <BurntFrame size="sm">
          <Avatar name={professor.name} photoUrl={professor.photoUrl} size="md" />
        </BurntFrame>
        <h3 className="mt-3 font-heading text-lg text-primary text-glow-sm">{professor.name}</h3>
        <p className="text-xs text-gray-400 mt-1">{professor.department}</p>
        <div className="flex items-center gap-2 mt-2">
          <StarDisplay rating={avgRating} size="sm" />
          <span className="text-sm font-semibold text-primary">{avgRating.toFixed(1)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{profReviews.length} review{profReviews.length !== 1 ? 's' : ''}</p>
        {topTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 justify-center">
            {topTags.map(t => (
              <span key={t.tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                {t.tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================
   REVIEW CARD
   ============================ */

function ReviewCard({ review, showActions = false }: { review: Review; showActions?: boolean }) {
  const { voteReview, deleteReview, restoreReview, votedReviews } = useApp();
  const voted = votedReviews[review.id];

  return (
    <div className={`bg-surface-light border border-surface-border rounded-xl p-4 animate-fadeIn ${review.hidden ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-burnt flex items-center justify-center">
            <span className="text-xs font-bold text-cream">
              {review.nickname === 'Anonymous' ? '?' : review.nickname[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-cream font-typewriter">{review.nickname}</p>
            <p className="text-xs text-gray-500">{timeAgo(review.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <StarDisplay rating={review.overallRating} size="sm" />
          <span className="text-sm font-bold text-primary ml-1">{review.overallRating}</span>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-300 leading-relaxed font-typewriter">{review.comment}</p>

      {review.hidden && (
        <div className="mt-2 flex items-center gap-1 text-red-400 text-xs">
          <AlertTriangle className="w-3 h-3" />
          <span>Hidden - flagged for moderation</span>
        </div>
      )}

      {review.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {review.tags.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-border">
        <div className="flex items-center gap-4">
          <button
            onClick={() => !voted && voteReview(review.id, 'helpful')}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              voted === 'helpful' ? 'text-green-400' : 'text-gray-500 hover:text-green-400'
            } ${voted ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>Helpful ({review.helpful})</span>
          </button>
          <button
            onClick={() => !voted && voteReview(review.id, 'notHelpful')}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              voted === 'notHelpful' ? 'text-red-400' : 'text-gray-500 hover:text-red-400'
            } ${voted ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            <span>({review.notHelpful})</span>
          </button>
        </div>
        {showActions && (
          <div className="flex gap-2">
            {review.hidden ? (
              <button onClick={() => restoreReview(review.id)} className="text-xs px-3 py-1 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors">
                <Eye className="w-3 h-3 inline mr-1" />Restore
              </button>
            ) : (
              <button onClick={() => deleteReview(review.id)} className="text-xs px-3 py-1 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors">
                <EyeOff className="w-3 h-3 inline mr-1" />Hide
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================
   REVIEW FORM MODAL
   ============================ */

function ReviewForm({ professorId, isOpen, onClose }: { professorId: string; isOpen: boolean; onClose: () => void }) {
  const { addReview, canReviewProfessor } = useApp();
  const [nickname, setNickname] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [comment, setComment] = useState('');
  const [teachingRating, setTeachingRating] = useState(0);
  const [examDifficulty, setExamDifficulty] = useState(0);
  const [friendliness, setFriendliness] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [assignmentLoad, setAssignmentLoad] = useState(0);
  const [attendanceStrictness, setAttendanceStrictness] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 5 ? [...prev, tag] : prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const reviewCheck = canReviewProfessor(professorId);
    if (!reviewCheck.allowed) {
      const days = Math.floor(reviewCheck.remainingHours / 24);
      const hours = reviewCheck.remainingHours % 24;
      if (days > 0) {
        setError(`You have already reviewed this professor. You can review again in ${days} day(s).`);
      } else {
        setError(`You have already reviewed this professor. You can review again in ${hours} hour(s).`);
      }
      return;
    }

    if (!comment.trim()) { setError('Please write a comment'); return; }
    if (!overallRating) { setError('Please provide an overall rating'); return; }
    if (!teachingRating || !examDifficulty || !friendliness || !clarity || !assignmentLoad || !attendanceStrictness) {
      setError('Please rate all categories'); return;
    }

    setSubmitting(true);

    let aiTags = selectedTags;
    try {
      const extracted = await extractAITags(comment);
      if (extracted.length > 0) {
        aiTags = [...new Set([...selectedTags, ...extracted])].slice(0, 6);
      }
    } catch {
      // Use manually selected tags
    }

    addReview({
      professorId,
      nickname: isAnonymous ? 'Anonymous' : (nickname || 'Anonymous'),
      comment,
      teachingRating,
      examDifficulty,
      friendliness,
      clarity,
      assignmentLoad,
      attendanceStrictness,
      overallRating,
      tags: aiTags
    });

    setSubmitting(false);
    onClose();
    setComment('');
    setTeachingRating(0);
    setExamDifficulty(0);
    setFriendliness(0);
    setClarity(0);
    setAssignmentLoad(0);
    setAttendanceStrictness(0);
    setOverallRating(0);
    setSelectedTags([]);
    setNickname('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🔥 Drop Your Review">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={() => setIsAnonymous(!isAnonymous)}
              className="rounded accent-primary"
            />
            <span className="text-sm text-gray-300">Post anonymously</span>
          </label>
          {!isAnonymous && (
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="Your nickname..."
              className="w-full px-3 py-2 bg-gray-900 border border-surface-border rounded-lg text-cream text-sm focus:outline-none focus:border-primary"
            />
          )}
        </div>

        <div className="space-y-2 bg-gray-900/50 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Rate the professor</p>
          <StarInput label="⭐ Teaching Quality" value={teachingRating} onChange={setTeachingRating} />
          <StarInput label="📝 Exam Difficulty" value={examDifficulty} onChange={setExamDifficulty} />
          <StarInput label="😊 Friendliness" value={friendliness} onChange={setFriendliness} />
          <StarInput label="💡 Clarity" value={clarity} onChange={setClarity} />
          <StarInput label="📚 Assignment Load" value={assignmentLoad} onChange={setAssignmentLoad} />
          <StarInput label="📋 Attendance Strictness" value={attendanceStrictness} onChange={setAttendanceStrictness} />
          <div className="border-t border-surface-border pt-2 mt-2">
            <StarInput label="🌟 Overall Rating" value={overallRating} onChange={setOverallRating} />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-300 mb-1 block">Your honest review</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Share your experience with this professor..."
            rows={4}
            className="w-full px-3 py-2 bg-gray-900 border border-surface-border rounded-lg text-cream text-sm focus:outline-none focus:border-primary resize-none font-typewriter"
          />
        </div>

        <div>
          <label className="text-sm text-gray-300 mb-2 block">Tags (select up to 5)</label>
          <div className="flex flex-wrap gap-1.5">
            {PREDEFINED_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                  selectedTags.includes(tag)
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-gray-900 border-surface-border text-gray-400 hover:border-gray-500'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-primary hover:bg-primary-dark text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              AI is checking your review...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Review
            </>
          )}
        </button>
      </form>
    </Modal>
  );
}

/* ============================
   NAVBAR
   ============================ */

function Navbar() {
  const { navigate, page, supabaseConnected, isAdminAuthenticated } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { label: string; page: Page; icon: React.ReactNode }[] = [
    { label: 'Home', page: 'home', icon: <Home className="w-4 h-4" /> },
    { label: 'Leaderboards', page: 'leaderboards', icon: <ListOrdered className="w-4 h-4" /> },
    { label: 'Request Prof', page: 'request', icon: <FileQuestion className="w-4 h-4" /> },
  ];

  if (isAdminAuthenticated) {
    navItems.push({ label: 'Admin', page: 'admin', icon: <Settings className="w-4 h-4" /> });
  }

  return (
    <nav className="sticky top-0 z-40 bg-[#0a0a12]/95 backdrop-blur border-b border-surface-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <button onClick={() => navigate('home')} className="flex items-center gap-2 group">
          <Flame className="w-6 h-6 text-primary animate-flicker" />
          <span className="font-heading text-2xl text-primary text-glow tracking-wider">DSI-RATE</span>
          {supabaseConnected && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full">
              <Database className="w-2.5 h-2.5" /> DB
            </span>
          )}
        </button>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map(item => (
            <button
              key={item.page}
              onClick={() => navigate(item.page)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                page === item.page
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-400 hover:text-cream hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-400 hover:text-cream">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-surface-border bg-surface animate-fadeIn">
          {navItems.map(item => (
            <button
              key={item.page}
              onClick={() => { navigate(item.page); setMobileOpen(false); }}
              className={`flex items-center gap-2 w-full px-4 py-3 text-sm transition-colors ${
                page === item.page ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}

/* ============================
   HOME PAGE
   ============================ */

function HomePage() {
  const { professors, reviews, departments, navigate, setSearchQuery, loading } = useApp();
  const [localSearch, setLocalSearch] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      setSearchQuery(localSearch.trim());
      navigate('search');
    }
  };

  const visibleReviews = reviews.filter(r => !r.hidden);

  const featured = useMemo(() => {
    return professors
      .map(p => ({ prof: p, avg: getOverallAvg(visibleReviews.filter(r => r.professorId === p.id)), count: visibleReviews.filter(r => r.professorId === p.id).length }))
      .filter(p => p.count > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 4);
  }, [professors, visibleReviews]);

  const mostReviewed = useMemo(() => {
    return professors
      .map(p => ({ prof: p, count: visibleReviews.filter(r => r.professorId === p.id).length }))
      .filter(p => p.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [professors, visibleReviews]);

  const bestTeaching = useMemo(() => {
    return professors
      .map(p => {
        const pRevs = visibleReviews.filter(r => r.professorId === p.id);
        return { prof: p, avg: getCategoryAvg(pRevs, 'teachingRating'), count: pRevs.length };
      })
      .filter(p => p.count > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3);
  }, [professors, visibleReviews]);

  const isEmpty = professors.length === 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-fadeIn">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-gray-400 font-typewriter">Loading from database...</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Hero */}
      <div className="relative py-16 md:py-24 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative z-10 max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Flame className="w-10 h-10 text-primary animate-flicker" />
            <h1 className="font-heading text-5xl md:text-7xl text-primary text-glow tracking-wider">DSI-RATE</h1>
            <Flame className="w-10 h-10 text-primary animate-flicker" />
          </div>
          <p className="font-typewriter text-lg md:text-xl text-gray-300 mb-8 italic">
            "Find your professor before they find you."
          </p>

          <form onSubmit={handleSearch} className="relative max-w-xl mx-auto search-glow rounded-xl transition-all">
            <div className="flex items-center bg-surface border-2 border-primary/30 rounded-xl overflow-hidden">
              <Search className="w-5 h-5 text-primary ml-4 shrink-0" />
              <input
                type="text"
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                placeholder="Search professors by name..."
                className="flex-1 px-3 py-3.5 bg-transparent text-cream placeholder-gray-500 focus:outline-none font-typewriter"
              />
              <button
                type="submit"
                className="px-6 py-3.5 bg-primary text-black font-bold hover:bg-primary-dark transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {departments.map((dept: string) => (
              <button
                key={dept}
                onClick={() => { setSearchQuery(dept); navigate('search'); }}
                className="text-xs px-3 py-1 rounded-full bg-surface border border-surface-border text-gray-400 hover:text-primary hover:border-primary/30 transition-all"
              >
                {dept}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isEmpty ? (
        /* Empty State */
        <section className="max-w-2xl mx-auto px-4 pb-16 text-center">
          <div className="bg-surface border border-surface-border rounded-xl p-12">
            <GraduationCap className="w-20 h-20 text-gray-700 mx-auto mb-6" />
            <h2 className="font-heading text-2xl text-primary text-glow-sm mb-3">No Professors Yet</h2>
            <p className="text-gray-400 font-typewriter mb-6">
              This is a fresh start! Be the first to request a professor to be added.
            </p>
            <button
              onClick={() => navigate('request')}
              className="px-6 py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary-dark transition-colors inline-flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Request a Professor
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Featured Professors */}
          {featured.length > 0 && (
            <section className="max-w-6xl mx-auto px-4 pb-12">
              <div className="flex items-center gap-3 mb-6">
                <Award className="w-6 h-6 text-primary" />
                <h2 className="font-heading text-2xl text-primary text-glow-sm">Top Rated Professors</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {featured.map(({ prof }) => (
                  <ProfessorCard key={prof.id} professor={prof} reviews={visibleReviews} />
                ))}
              </div>
            </section>
          )}

          {/* Leaderboard Preview */}
          {(mostReviewed.length > 0 || bestTeaching.length > 0) && (
            <section className="max-w-6xl mx-auto px-4 pb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-primary" />
                  <h2 className="font-heading text-2xl text-primary text-glow-sm">Leaderboards</h2>
                </div>
                <button
                  onClick={() => navigate('leaderboards')}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark transition-colors"
                >
                  View all <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {mostReviewed.length > 0 && (
                  <div className="bg-surface border border-surface-border rounded-xl p-5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-cream mb-4">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      Most Reviewed
                    </h3>
                    <div className="space-y-3">
                      {mostReviewed.map(({ prof, count }, i) => (
                        <button
                          key={prof.id}
                          onClick={() => navigate('professor', prof.id)}
                          className="flex items-center gap-3 w-full text-left hover:bg-white/5 p-2 rounded-lg transition-colors"
                        >
                          <span className={`text-lg font-heading ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : 'text-amber-700'}`}>
                            #{i + 1}
                          </span>
                          <Avatar name={prof.name} photoUrl={prof.photoUrl} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-cream truncate">{prof.name}</p>
                            <p className="text-xs text-gray-500">{prof.department}</p>
                          </div>
                          <span className="text-sm text-primary font-semibold">{count} reviews</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {bestTeaching.length > 0 && (
                  <div className="bg-surface border border-surface-border rounded-xl p-5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-cream mb-4">
                      <BookOpen className="w-4 h-4 text-primary" />
                      Best Teaching Quality
                    </h3>
                    <div className="space-y-3">
                      {bestTeaching.map(({ prof, avg }, i) => (
                        <button
                          key={prof.id}
                          onClick={() => navigate('professor', prof.id)}
                          className="flex items-center gap-3 w-full text-left hover:bg-white/5 p-2 rounded-lg transition-colors"
                        >
                          <span className={`text-lg font-heading ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : 'text-amber-700'}`}>
                            #{i + 1}
                          </span>
                          <Avatar name={prof.name} photoUrl={prof.photoUrl} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-cream truncate">{prof.name}</p>
                            <p className="text-xs text-gray-500">{prof.department}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-primary text-primary" />
                            <span className="text-sm text-primary font-semibold">{avg.toFixed(1)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Browse All */}
          <section className="max-w-6xl mx-auto px-4 pb-16">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-primary" />
              <h2 className="font-heading text-2xl text-primary text-glow-sm">All Professors</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {professors.map(prof => (
                <ProfessorCard key={prof.id} professor={prof} reviews={visibleReviews} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/* ============================
   SEARCH RESULTS PAGE
   ============================ */

function SearchPage() {
  const { professors, reviews, searchQuery, navigate, setSearchQuery } = useApp();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const visibleReviews = reviews.filter(r => !r.hidden);

  const results = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return professors.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q) ||
      p.subjects.some(s => s.toLowerCase().includes(q))
    );
  }, [professors, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fadeIn">
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex items-center bg-surface border border-surface-border rounded-xl overflow-hidden search-glow">
          <Search className="w-5 h-5 text-primary ml-4" />
          <input
            type="text"
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="Search professors..."
            className="flex-1 px-3 py-3 bg-transparent text-cream placeholder-gray-500 focus:outline-none font-typewriter"
          />
          <button type="submit" className="px-6 py-3 bg-primary text-black font-bold hover:bg-primary-dark transition-colors">
            Search
          </button>
        </div>
      </form>

      <p className="text-sm text-gray-400 mb-6">
        {results.length} result{results.length !== 1 ? 's' : ''} for "<span className="text-primary">{searchQuery}</span>"
      </p>

      {results.length === 0 ? (
        <div className="text-center py-16">
          <Frown className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 font-typewriter">No professors found. Try a different search.</p>
          <button onClick={() => navigate('request')} className="mt-4 text-primary hover:text-primary-dark text-sm flex items-center gap-1 mx-auto">
            <Plus className="w-4 h-4" /> Request a professor to be added
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {results.map(prof => (
            <ProfessorCard key={prof.id} professor={prof} reviews={visibleReviews} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================
   PROFESSOR PAGE
   ============================ */

function ProfessorPage() {
  const { selectedProfessorId, professors, reviews, summaries, navigate } = useApp();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'helpful'>('newest');

  const professor = professors.find(p => p.id === selectedProfessorId);
  if (!professor) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Professor not found.</p>
        <button onClick={() => navigate('home')} className="mt-4 text-primary">Go back home</button>
      </div>
    );
  }

  const profReviews = reviews.filter(r => r.professorId === professor.id && !r.hidden);
  const summary = summaries.find(s => s.professorId === professor.id);
  const topTags = getTopTags(profReviews);

  const avgOverall = getOverallAvg(profReviews);
  const avgTeaching = getCategoryAvg(profReviews, 'teachingRating');
  const avgExam = getCategoryAvg(profReviews, 'examDifficulty');
  const avgFriendliness = getCategoryAvg(profReviews, 'friendliness');
  const avgClarity = getCategoryAvg(profReviews, 'clarity');
  const avgAssignment = getCategoryAvg(profReviews, 'assignmentLoad');
  const avgAttendance = getCategoryAvg(profReviews, 'attendanceStrictness');

  const sortedReviews = [...profReviews].sort((a, b) => {
    if (sortBy === 'helpful') return b.helpful - a.helpful;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn">
      <button onClick={() => navigate('home')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-primary mb-6 transition-colors">
        ← Back to all professors
      </button>

      {/* Professor Header */}
      <div className="bg-surface border border-surface-border rounded-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <BurntFrame size="lg">
            <Avatar name={professor.name} photoUrl={professor.photoUrl} size="xl" />
          </BurntFrame>

          <div className="flex-1">
            <h1 className="font-heading text-3xl md:text-4xl text-primary text-glow">{professor.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-sm text-gray-400">
                <GraduationCap className="w-4 h-4" /> {professor.department}
              </span>
              <span className="flex items-center gap-1 text-sm text-gray-400">
                <Clock className="w-4 h-4" /> {professor.yearsTeaching} years
              </span>
              <span className="flex items-center gap-1 text-sm text-gray-400">
                <MessageSquare className="w-4 h-4" /> {profReviews.length} reviews
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {professor.subjects.map(s => (
                <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
                  {s}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-1">
                <span className="text-4xl font-heading text-primary text-glow">{avgOverall.toFixed(1)}</span>
                <span className="text-lg text-gray-500">/5</span>
              </div>
              <StarDisplay rating={avgOverall} size="lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Rating Breakdown */}
      {profReviews.length > 0 && (
        <div className="bg-surface border border-surface-border rounded-xl p-6 mt-6">
          <h2 className="font-heading text-xl text-primary text-glow-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Rating Breakdown
          </h2>
          <div className="space-y-3">
            <RatingBar label="Teaching Quality" value={avgTeaching} icon={<BookOpen className="w-4 h-4 text-gray-500" />} />
            <RatingBar label="Exam Difficulty" value={avgExam} icon={<Skull className="w-4 h-4 text-gray-500" />} />
            <RatingBar label="Friendliness" value={avgFriendliness} icon={<Smile className="w-4 h-4 text-gray-500" />} />
            <RatingBar label="Clarity" value={avgClarity} icon={<Eye className="w-4 h-4 text-gray-500" />} />
            <RatingBar label="Assignment Load" value={avgAssignment} icon={<BookOpen className="w-4 h-4 text-gray-500" />} />
            <RatingBar label="Attendance" value={avgAttendance} icon={<Clock className="w-4 h-4 text-gray-500" />} />
          </div>
        </div>
      )}

      {/* AI Summary */}
      <div className="bg-surface border border-surface-border rounded-xl p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl text-primary text-glow-sm flex items-center gap-2">
            <Shield className="w-5 h-5" /> AI Summary
          </h2>
        </div>

        {summary ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-300 leading-relaxed font-typewriter italic bg-gray-900/50 p-4 rounded-lg border-l-4 border-primary">
              "{summary.summary}"
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Pros
                </h4>
                <ul className="space-y-1.5">
                  {summary.pros.map((pro, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span> {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-1">
                  <X className="w-4 h-4" /> Cons
                </h4>
                <ul className="space-y-1.5">
                  {summary.cons.map((con, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">✗</span> {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            {profReviews.length === 0
              ? 'No reviews yet.'
              : 'AI summary will be generated automatically.'}
          </p>
        )}
      </div>

      {/* Tags */}
      {topTags.length > 0 && (
        <div className="bg-surface border border-surface-border rounded-xl p-6 mt-6">
          <h2 className="font-heading text-xl text-primary text-glow-sm mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5" /> Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {topTags.map(t => (
              <TagBadge key={t.tag} tag={t.tag} count={t.count} />
            ))}
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl text-primary text-glow-sm flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Student Reviews ({profReviews.length})
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSortBy(sortBy === 'newest' ? 'helpful' : 'newest')}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-surface border border-surface-border text-gray-400 rounded-lg hover:text-cream transition-colors"
            >
              <ArrowUpDown className="w-3 h-3" />
              {sortBy === 'newest' ? 'Newest' : 'Most Helpful'}
            </button>
            <button
              onClick={() => setReviewOpen(true)}
              className="flex items-center gap-1 text-sm px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Write Review
            </button>
          </div>
        </div>

        {sortedReviews.length === 0 ? (
          <div className="bg-surface border border-surface-border rounded-xl p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-typewriter">No reviews yet. Be the first to drop a review!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedReviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>

      <ReviewForm professorId={professor.id} isOpen={reviewOpen} onClose={() => setReviewOpen(false)} />
    </div>
  );
}

/* ============================
   LEADERBOARDS PAGE
   ============================ */

function LeaderboardsPage() {
  const { professors, reviews, navigate } = useApp();
  const visibleReviews = reviews.filter(r => !r.hidden);

  type BoardItem = { prof: Professor; value: number; reviewCount: number };

  const boards: { title: string; emoji: string; items: BoardItem[] }[] = useMemo(() => {
    const withReviews = professors.map(p => {
      const pRevs = visibleReviews.filter(r => r.professorId === p.id);
      return { prof: p, revs: pRevs, count: pRevs.length };
    }).filter(p => p.count > 0);

    return [
      {
        title: 'Top Rated Professors',
        emoji: '🏆',
        items: withReviews
          .map(p => ({ prof: p.prof, value: getOverallAvg(p.revs), reviewCount: p.count }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
      },
      {
        title: 'Best Teaching Quality',
        emoji: '📚',
        items: withReviews
          .map(p => ({ prof: p.prof, value: getCategoryAvg(p.revs, 'teachingRating'), reviewCount: p.count }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
      },
      {
        title: 'Hardest Exams',
        emoji: '💀',
        items: withReviews
          .map(p => ({ prof: p.prof, value: getCategoryAvg(p.revs, 'examDifficulty'), reviewCount: p.count }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
      },
      {
        title: 'Strictest Attendance',
        emoji: '😤',
        items: withReviews
          .map(p => ({ prof: p.prof, value: getCategoryAvg(p.revs, 'attendanceStrictness'), reviewCount: p.count }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
      },
      {
        title: 'Most Assignments',
        emoji: '📝',
        items: withReviews
          .map(p => ({ prof: p.prof, value: getCategoryAvg(p.revs, 'assignmentLoad'), reviewCount: p.count }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
      },
      {
        title: 'Friendliest Professors',
        emoji: '😊',
        items: withReviews
          .map(p => ({ prof: p.prof, value: getCategoryAvg(p.revs, 'friendliness'), reviewCount: p.count }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
      }
    ];
  }, [professors, visibleReviews]);

  const hasData = boards.some(b => b.items.length > 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="w-8 h-8 text-primary" />
        <h1 className="font-heading text-3xl text-primary text-glow">Leaderboards</h1>
      </div>

      {!hasData ? (
        <div className="bg-surface border border-surface-border rounded-xl p-12 text-center">
          <Trophy className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h2 className="font-heading text-xl text-primary mb-2">No Rankings Yet</h2>
          <p className="text-gray-400 font-typewriter">Once professors get reviews, leaderboards will appear here!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {boards.map(board => (
            board.items.length > 0 && (
              <div key={board.title} className="bg-surface border border-surface-border rounded-xl p-5">
                <h3 className="flex items-center gap-2 font-heading text-lg text-primary mb-4">
                  <span>{board.emoji}</span> {board.title}
                </h3>
                <div className="space-y-2">
                  {board.items.map((item, i) => (
                    <button
                      key={item.prof.id}
                      onClick={() => navigate('professor', item.prof.id)}
                      className={`flex items-center gap-3 w-full text-left p-3 rounded-lg transition-colors hover:bg-white/5 ${
                        i === 0 ? 'leaderboard-gold' : i === 1 ? 'leaderboard-silver' : i === 2 ? 'leaderboard-bronze' : 'border-l-4 border-transparent'
                      }`}
                    >
                      <span className={`text-xl font-heading w-8 text-center ${
                        i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-600'
                      }`}>
                        #{i + 1}
                      </span>
                      <Avatar name={item.prof.name} photoUrl={item.prof.photoUrl} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-cream truncate">{item.prof.name}</p>
                        <p className="text-xs text-gray-500">{item.prof.department} · {item.reviewCount} reviews</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-primary text-primary" />
                        <span className="text-sm font-bold text-primary">{item.value.toFixed(1)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================
   REQUEST PROFESSOR PAGE
   ============================ */

function RequestPage() {
  const { addRequest, navigate, departments } = useApp();
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [subjects, setSubjects] = useState('');
  const [years, setYears] = useState('');
  const [photoData, setPhotoData] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [useCustomDept, setUseCustomDept] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file);
      setPhotoPreview(compressed);
      setPhotoData(compressed);
    } catch (err) {
      console.error('Image compression failed:', err);
      alert('Failed to process image. Please try a different file.');
    }
    setUploadingPhoto(false);
  };

  const removePhoto = () => {
    setPhotoData('');
    setPhotoPreview('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDept = useCustomDept ? customDepartment.trim() : department;
    if (!name.trim() || !finalDept || !subjects.trim()) return;

    addRequest({
      name: name.trim(),
      department: finalDept,
      subjects: subjects.trim(),
      yearsTeaching: parseInt(years) || 0,
      photo: photoData
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center animate-fadeIn">
        <div className="bg-surface border border-surface-border rounded-xl p-8">
          <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="font-heading text-2xl text-primary text-glow mb-2">Request Submitted!</h2>
          <p className="text-gray-400 text-sm mb-6">
            Your professor request has been sent to the admin team for review. It will appear once approved.
          </p>
          <button
            onClick={() => navigate('home')}
            className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary-dark transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 animate-fadeIn">
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="w-8 h-8 text-primary" />
        <h1 className="font-heading text-3xl text-primary text-glow">Request a Professor</h1>
      </div>

      <p className="text-sm text-gray-400 mb-6 font-typewriter">
        Can't find a professor? Submit a request and our admin team will review it. 🕵️
      </p>

      <form onSubmit={handleSubmit} className="bg-surface border border-surface-border rounded-xl p-6 space-y-4">
        <div>
          <label className="text-sm text-gray-300 mb-1 block">Professor Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Dr. John Smith"
            required
            className="w-full px-3 py-2.5 bg-gray-900 border border-surface-border rounded-lg text-cream text-sm focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-sm text-gray-300 mb-1 block">Department *</label>
          {!useCustomDept ? (
            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              required={!useCustomDept}
              className="w-full px-3 py-2.5 bg-gray-900 border border-surface-border rounded-lg text-cream text-sm focus:outline-none focus:border-primary"
            >
              <option value="">Select department...</option>
              {departments.map((d: string) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={customDepartment}
              onChange={e => setCustomDepartment(e.target.value)}
              placeholder="e.g., Physics"
              required={useCustomDept}
              className="w-full px-3 py-2.5 bg-gray-900 border border-surface-border rounded-lg text-cream text-sm focus:outline-none focus:border-primary"
            />
          )}
          <button
            type="button"
            onClick={() => { setUseCustomDept(!useCustomDept); setDepartment(''); setCustomDepartment(''); }}
            className="text-xs text-primary mt-1.5 hover:underline"
          >
            {useCustomDept ? '← Choose from existing departments' : "Department not listed? Type it manually →"}
          </button>
        </div>

        <div>
          <label className="text-sm text-gray-300 mb-1 block">Subjects Taught *</label>
          <input
            type="text"
            value={subjects}
            onChange={e => setSubjects(e.target.value)}
            placeholder="e.g., Machine Learning, Deep Learning"
            required
            className="w-full px-3 py-2.5 bg-gray-900 border border-surface-border rounded-lg text-cream text-sm focus:outline-none focus:border-primary"
          />
          <p className="text-xs text-gray-500 mt-1">Separate multiple subjects with commas</p>
        </div>

        <div>
          <label className="text-sm text-gray-300 mb-1 block">Years Teaching</label>
          <input
            type="number"
            value={years}
            onChange={e => setYears(e.target.value)}
            placeholder="e.g., 5"
            min="0"
            max="50"
            className="w-full px-3 py-2.5 bg-gray-900 border border-surface-border rounded-lg text-cream text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {/* Photo Upload */}
        <div>
          <label className="text-sm text-gray-300 mb-2 block flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-primary" />
            Professor Photo
          </label>

          {photoPreview ? (
            <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg border border-surface-border">
              <img
                src={photoPreview}
                alt="Professor preview"
                className="w-24 h-24 rounded-lg object-cover border-2 border-primary/30"
              />
              <div className="flex-1">
                <p className="text-sm text-green-400 flex items-center gap-1 mb-2">
                  <Check className="w-4 h-4" /> Photo uploaded!
                </p>
                <div className="flex gap-2">
                  <label className="cursor-pointer text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors inline-flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Change
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="text-xs px-3 py-1.5 bg-red-600/10 text-red-400 rounded-lg hover:bg-red-600/20 transition-colors inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <label className="cursor-pointer block">
              <div className="w-full px-4 py-8 bg-gray-900 border-2 border-dashed border-surface-border rounded-lg text-center hover:border-primary/40 transition-all group">
                {uploadingPhoto ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <span className="text-sm text-gray-400">Processing image...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-sm text-gray-300">Click to upload photo</span>
                    <span className="text-xs text-gray-600">JPG, PNG, WebP · Max 5MB</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
              />
            </label>
          )}
          <p className="text-xs text-gray-500 mt-1.5">Optional — if not provided, initials will be used as avatar.</p>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          Submit Request
        </button>
      </form>
    </div>
  );
}

/* ============================
   ADMIN PAGE
   ============================ */

function AdminPage() {
  const {
    professors, reviews, requests, summaries, departments,
    approveRequest, rejectRequest, updateSummary,
    addDepartment, removeDepartment, deleteProfessor, supabaseConnected,
    reviewCooldownHours, setReviewCooldownHours
  } = useApp();
  const [activeTab, setActiveTab] = useState<'requests' | 'reviews' | 'professors' | 'departments' | 'settings'>('requests');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [newDept, setNewDept] = useState('');
  const [confirmDeleteProf, setConfirmDeleteProf] = useState<string | null>(null);
  const [cooldownInput, setCooldownInput] = useState(reviewCooldownHours.toString());

  const tabs = [
    { id: 'requests' as const, label: 'Requests', icon: <FileQuestion className="w-4 h-4" />, count: requests.filter(r => r.status === 'pending').length },
    { id: 'reviews' as const, label: 'Reviews', icon: <MessageSquare className="w-4 h-4" />, count: reviews.filter(r => r.hidden).length },
    { id: 'professors' as const, label: 'Professors', icon: <Users className="w-4 h-4" />, count: professors.length },
    { id: 'departments' as const, label: 'Departments', icon: <FolderPlus className="w-4 h-4" />, count: departments.length },
    { id: 'settings' as const, label: 'Settings', icon: <Settings className="w-4 h-4" />, count: 0 },
  ];

  const handleSaveCooldown = () => {
    const hours = parseInt(cooldownInput);
    if (!isNaN(hours) && hours >= 0) {
      setReviewCooldownHours(hours);
    }
  };

  const handleRegenerate = async (profId: string) => {
    setGeneratingId(profId);
    const profReviews = reviews.filter(r => r.professorId === profId && !r.hidden);
    try {
      const result = await generateAISummary(profReviews);
      if (result) {
        updateSummary(profId, {
          professorId: profId,
          summary: result.summary,
          pros: result.pros,
          cons: result.cons,
          generatedAt: new Date().toISOString().split('T')[0]
        });
      }
    } catch { /* Failed */ }
    setGeneratingId(null);
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDept.trim()) {
      addDepartment(newDept.trim());
      setNewDept('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-8 h-8 text-primary" />
        <h1 className="font-heading text-3xl text-primary text-glow">Admin Panel</h1>
      </div>

      {/* Storage Status Banner */}
      <div className={`mb-6 flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
        supabaseConnected
          ? 'bg-green-900/20 border border-green-800 text-green-400'
          : 'bg-yellow-900/20 border border-yellow-800 text-yellow-400'
      }`}>
        <Database className="w-3.5 h-3.5" />
        {supabaseConnected
          ? '✓ Connected to Supabase — data is shared across all users'
          : '⚠ Using browser storage (localStorage) — data is only on this device. Set up Supabase for shared data.'}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-surface text-gray-400 border border-surface-border hover:text-cream'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-primary text-black' : 'bg-gray-700 text-gray-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---- Requests Tab ---- */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-surface border border-surface-border rounded-xl p-8 text-center">
              <FileQuestion className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No professor requests yet.</p>
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="bg-surface border border-surface-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {req.photo ? (
                      <img src={req.photo} alt="" className="w-14 h-14 rounded-lg object-cover border border-surface-border" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-gray-800 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-medium text-cream">{req.name}</h3>
                      <p className="text-sm text-gray-400">{req.department} · {req.subjects}</p>
                      <p className="text-xs text-gray-500 mt-1">{req.yearsTeaching} years · Submitted {timeAgo(req.createdAt)}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${
                    req.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
                    req.status === 'approved' ? 'bg-green-600/20 text-green-400' :
                    'bg-red-600/20 text-red-400'
                  }`}>
                    {req.status}
                  </span>
                </div>
                {req.status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => approveRequest(req.id)}
                      className="flex items-center gap-1 px-4 py-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 text-sm transition-colors"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => rejectRequest(req.id)}
                      className="flex items-center gap-1 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-sm transition-colors"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ---- Reviews Tab ---- */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <p className="text-sm text-gray-400">Manage all reviews. Hidden reviews are flagged for moderation.</p>
          </div>
          {reviews.length === 0 ? (
            <div className="bg-surface border border-surface-border rounded-xl p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No reviews to moderate.</p>
            </div>
          ) : (
            <>
              {reviews.filter(r => r.hidden).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-400 mb-3">Flagged / Hidden Reviews</h3>
                  <div className="space-y-3">
                    {reviews.filter(r => r.hidden).map(review => {
                      const prof = professors.find(p => p.id === review.professorId);
                      return (
                        <div key={review.id}>
                          <p className="text-xs text-gray-500 mb-1">Professor: {prof?.name || 'Unknown'}</p>
                          <ReviewCard review={review} showActions />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3 mt-6">All Reviews</h3>
                <div className="space-y-3">
                  {reviews.filter(r => !r.hidden).map(review => {
                    const prof = professors.find(p => p.id === review.professorId);
                    return (
                      <div key={review.id}>
                        <p className="text-xs text-gray-500 mb-1">Professor: {prof?.name || 'Unknown'}</p>
                        <ReviewCard review={review} showActions />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---- Professors Tab ---- */}
      {activeTab === 'professors' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400 mb-2">Manage professors, regenerate AI summaries, or remove professors.</p>
          {professors.length === 0 ? (
            <div className="bg-surface border border-surface-border rounded-xl p-8 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No professors yet. Approve requests to add professors.</p>
            </div>
          ) : (
            professors.map(prof => {
              const profReviews = reviews.filter(r => r.professorId === prof.id && !r.hidden);
              const summary = summaries.find(s => s.professorId === prof.id);
              return (
                <div key={prof.id} className="bg-surface border border-surface-border rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <Avatar name={prof.name} photoUrl={prof.photoUrl} size="sm" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-cream">{prof.name}</h3>
                      <p className="text-sm text-gray-400">{prof.department} · {profReviews.length} reviews</p>
                      {summary && (
                        <p className="text-xs text-gray-500 mt-1">Summary generated: {summary.generatedAt}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRegenerate(prof.id)}
                        disabled={generatingId === prof.id || profReviews.length === 0}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        {generatingId === prof.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        AI Summary
                      </button>
                      {confirmDeleteProf === prof.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { deleteProfessor(prof.id); setConfirmDeleteProf(null); }}
                            className="text-xs px-2 py-1.5 bg-red-600/30 text-red-400 rounded-lg hover:bg-red-600/40"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteProf(null)}
                            className="text-xs px-2 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteProf(prof.id)}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-600/10 text-red-400 rounded-lg hover:bg-red-600/20 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ---- Departments Tab ---- */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400 mb-2">Manage departments. Add new ones or remove existing ones.</p>

          {/* Add Department Form */}
          <form onSubmit={handleAddDepartment} className="bg-surface border border-surface-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-cream mb-3 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-primary" />
              Add New Department
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDept}
                onChange={e => setNewDept(e.target.value)}
                placeholder="e.g., Physics, Electrical Engineering..."
                className="flex-1 px-3 py-2 bg-gray-900 border border-surface-border rounded-lg text-cream text-sm focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!newDept.trim()}
                className="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary-dark transition-colors text-sm disabled:opacity-50 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </form>

          {/* Department List */}
          <div className="bg-surface border border-surface-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-cream mb-3">Current Departments ({departments.length})</h3>
            <div className="space-y-2">
              {departments.map((dept: string) => {
                const profCount = professors.filter(p => p.department === dept).length;
                return (
                  <div key={dept} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      <span className="text-sm text-cream">{dept}</span>
                      <span className="text-xs text-gray-500">({profCount} professor{profCount !== 1 ? 's' : ''})</span>
                    </div>
                    <button
                      onClick={() => removeDepartment(dept)}
                      className="text-xs px-2 py-1 text-red-400 hover:bg-red-600/10 rounded transition-colors flex items-center gap-1"
                      title={profCount > 0 ? 'Warning: professors in this department will keep their department label' : 'Remove department'}
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---- Settings Tab ---- */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-surface border border-surface-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Review Cooldown Settings
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Set how long a user must wait before they can review the same professor again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1 w-full">
                <label className="text-sm text-gray-300 mb-1 block">Cooldown (hours)</label>
                <input
                  type="number"
                  value={cooldownInput}
                  onChange={(e) => setCooldownInput(e.target.value)}
                  min="0"
                  className="w-full px-3 py-2 bg-gray-900 border border-surface-border rounded-lg text-cream text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={handleSaveCooldown}
                className="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary-dark transition-colors text-sm flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
            </div>
            <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
              <p className="text-xs text-gray-400">
                <span className="text-primary font-semibold">Current setting:</span> {reviewCooldownHours} hours
                {reviewCooldownHours === 0 && <span className="text-green-400 ml-2">(No cooldown)</span>}
                {reviewCooldownHours === 24 && <span className="text-yellow-400 ml-2">(1 day)</span>}
                {reviewCooldownHours === 168 && <span className="text-yellow-400 ml-2">(1 week)</span>}
                {reviewCooldownHours === 336 && <span className="text-yellow-400 ml-2">(2 weeks)</span>}
              </p>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <p className="mb-2"><span className="text-gray-400">Quick presets:</span></p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setCooldownInput('0')} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">0 hours</button>
                <button onClick={() => setCooldownInput('24')} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">24 hours</button>
                <button onClick={() => setCooldownInput('168')} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">168 hours</button>
                <button onClick={() => setCooldownInput('336')} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">336 hours</button>
                <button onClick={() => setCooldownInput('720')} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">720 hours</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================
   MAIN APP
   ============================ */

function Router() {
  const { page, isAdminAuthenticated, navigate, loginAdmin } = useApp();
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin-secret' || path.endsWith('/admin-secret')) {
      if (!isAdminAuthenticated) {
        setShowPasswordPrompt(true);
      } else {
        navigate('admin');
      }
    }
  }, [isAdminAuthenticated, navigate]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = loginAdmin(passwordInput);
    if (success) {
      setShowPasswordPrompt(false);
      navigate('admin');
    } else {
      setPasswordError(true);
      setPasswordInput('');
    }
  };

  if (showPasswordPrompt) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="bg-surface border border-surface-border rounded-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <Shield className="w-12 h-12 text-primary mx-auto mb-3" />
            <h1 className="font-heading text-2xl text-primary text-glow">Admin Access</h1>
            <p className="text-gray-400 text-sm mt-2">Enter the admin password to continue</p>
          </div>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
              placeholder="Enter admin password..."
              className="w-full px-4 py-3 bg-gray-900 border border-surface-border rounded-lg text-cream text-sm focus:outline-none focus:border-primary mb-4"
              autoFocus
            />
            {passwordError && (
              <p className="text-red-400 text-sm mb-4">Incorrect password. Please try again.</p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary-dark transition-colors"
            >
              Access Admin
            </button>
          </form>
          <button
            onClick={() => { setShowPasswordPrompt(false); navigate('home'); }}
            className="w-full mt-3 py-2 text-gray-500 text-sm hover:text-cream transition-colors"
          >
            Go back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      <Navbar />
      <main>
        {page === 'home' && <HomePage />}
        {page === 'search' && <SearchPage />}
        {page === 'professor' && <ProfessorPage />}
        {page === 'leaderboards' && <LeaderboardsPage />}
        {page === 'request' && <RequestPage />}
        {page === 'admin' && <AdminPage />}
      </main>

      <footer className="border-t border-surface-border py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-primary animate-flicker" />
            <span className="font-heading text-xl text-primary">DSI-RATE</span>
          </div>
          <p className="text-xs text-gray-600 font-typewriter">
            "Students secretly reviewing professors." · All reviews are anonymous.
          </p>
          <p className="text-xs text-gray-700 mt-2">
            Powered by AI · Built for DSI students · Stay honest 🔥
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
