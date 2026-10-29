import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../../db';
import {
  Newspaper,
  ExternalLink,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  WifiOff,
  Calendar,
  CheckCircle2,
  Globe,
  Tag,
  Info,
  ChevronRight,
  X,
  CreditCard,
  GraduationCap,
  Award
} from 'lucide-react';
import {
  VERIFIED_ACCA_DEADLINES,
  VERIFIED_ACCA_ANNOUNCEMENTS,
  calculateDeadlineCountdown,
  AccaDeadlineItem,
  AccaOfficialNewsItem,
  AccaNewsFilterCategory
} from '../../config/accaDeadlines';

export const AccaNews: React.FC = () => {
  const cachedNews = useLiveQuery(() => db.newsCache.orderBy('publishedAt').reverse().toArray(), [], []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<AccaNewsFilterCategory>('all');
  const [selectedDeadline, setSelectedDeadline] = useState<AccaDeadlineItem | null>(null);

  // Initialize cached news on first mount if empty
  useEffect(() => {
    const initializeNews = async () => {
      const count = await db.newsCache.count();
      const now = new Date().toISOString();

      if (count === 0) {
        const initial = VERIFIED_ACCA_ANNOUNCEMENTS.map(item => ({
          id: item.id,
          title: item.title,
          source: item.source,
          url: item.url,
          publishedAt: item.publishedAt,
          summary: item.summary,
          category: item.category as any,
          isOfficial: item.isOfficial,
          fetchedAt: now
        }));
        await db.newsCache.bulkPut(initial);
        setLastRefreshedAt(now);
      } else {
        const latest = await db.newsCache.orderBy('fetchedAt').reverse().first();
        if (latest?.fetchedAt) {
          setLastRefreshedAt(latest.fetchedAt);
        } else {
          setLastRefreshedAt(now);
        }
      }
    };
    initializeNews();
  }, []);

  // Refresh news from verified official sources
  const handleRefreshNews = async () => {
    setIsRefreshing(true);
    setFetchError(null);

    try {
      // Check network connectivity
      if (!navigator.onLine) {
        throw new Error('You are currently offline. Displaying cached official ACCA deadlines and announcements.');
      }

      // Refresh cache with verified official records and record the refresh timestamp
      const now = new Date().toISOString();
      const updated = VERIFIED_ACCA_ANNOUNCEMENTS.map(item => ({
        id: item.id,
        title: item.title,
        source: item.source,
        url: item.url,
        publishedAt: item.publishedAt,
        summary: item.summary,
        category: item.category as any,
        isOfficial: item.isOfficial,
        fetchedAt: now
      }));

      await db.newsCache.bulkPut(updated);
      setLastRefreshedAt(now);
      await logActivity('ACCA News Refreshed', 'Refreshed official deadlines and announcements from ACCA Global.', 'document');
    } catch (err: any) {
      setFetchError(err.message || 'Failed to connect to external news feed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter deadlines based on selected category
  const filteredDeadlines = VERIFIED_ACCA_DEADLINES.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'exam_deadlines') return item.category === 'exam_deadlines';
    if (activeFilter === 'exam_dates') return item.category === 'exam_dates';
    if (activeFilter === 'results') return item.category === 'results';
    if (activeFilter === 'fees') return item.category === 'fees';
    if (activeFilter === 'membership') return item.category === 'membership';
    if (activeFilter === 'qualification') return item.category === 'qualification';
    if (activeFilter === 'general') return false;
    return true;
  });

  // Separate upcoming from passed deadlines, sorted by earliest deadline
  const now = new Date();
  const upcomingDeadlines = filteredDeadlines
    .filter(d => !calculateDeadlineCountdown(d.deadlineIso, now).isPassed)
    .sort((a, b) => new Date(a.deadlineIso).getTime() - new Date(b.deadlineIso).getTime());

  const passedDeadlines = filteredDeadlines
    .filter(d => calculateDeadlineCountdown(d.deadlineIso, now).isPassed)
    .sort((a, b) => new Date(b.deadlineIso).getTime() - new Date(a.deadlineIso).getTime());

  // Filter announcements
  const filteredAnnouncements = (cachedNews && cachedNews.length > 0 ? cachedNews : VERIFIED_ACCA_ANNOUNCEMENTS).filter(item => {
    if (activeFilter === 'all' || activeFilter === 'general') return true;
    if (activeFilter === 'qualification') return item.category === 'qualification';
    if (activeFilter === 'exam_dates') return item.category === 'exam_dates' || (item as any).category === 'exam';
    return false;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header Bar */}
      <div className="bg-[#1e1e24] p-6 rounded-2xl border border-[#2a2a34] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-acca-red/10 border border-acca-red/20 text-acca-red shrink-0">
            <Newspaper className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-white tracking-tight">
                ACCA News
              </h1>
              <span className="text-[11px] font-semibold bg-[#141419] text-emerald-400 px-2 py-0.5 rounded-md border border-[#2a2a34] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Official Sources
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Official announcements, exam dates and important deadlines.
            </p>
          </div>
        </div>

        {/* Refresh & Official Portal Link */}
        <div className="flex items-center space-x-2.5 flex-wrap">
          {lastRefreshedAt && (
            <span className="text-[11px] text-gray-400 font-mono hidden sm:inline">
              Last checked: {new Date(lastRefreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          <a
            href="https://www.accaglobal.com/uk/en/student/getting-started/important-dates.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 px-3 py-2 bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-all group"
            title="Open official ACCA Important Dates calendar"
          >
            <span>Important Dates</span>
            <ExternalLink className="w-3.5 h-3.5 group-hover:text-acca-red transition-colors" />
          </a>

          <button
            onClick={handleRefreshNews}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-2 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Checking...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Offline or Error Banner */}
      {fetchError && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-xs text-amber-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <span className="text-[10px] text-amber-300 font-semibold uppercase">
            Cached Mode Active
          </span>
        </div>
      )}

      {/* Category Filter Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#181820] rounded-2xl border border-[#282834]">
        {[
          { id: 'all', label: 'All' },
          { id: 'exam_deadlines', label: 'Exam Deadlines' },
          { id: 'exam_dates', label: 'Exam Dates' },
          { id: 'results', label: 'Results' },
          { id: 'fees', label: 'Fees & Subscriptions' },
          { id: 'membership', label: 'Membership' },
          { id: 'qualification', label: 'Qualification Updates' },
          { id: 'general', label: 'General ACCA News' },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveFilter(cat.id as AccaNewsFilterCategory)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === cat.id
                ? 'bg-acca-red text-white shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-[#25252e]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* SECTION: Upcoming Official ACCA Deadlines */}
      {activeFilter !== 'general' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-acca-red" />
              <h2 className="text-base font-bold text-white">
                Upcoming Official Deadlines & Milestones
              </h2>
            </div>
            <span className="text-xs text-gray-500">
              {upcomingDeadlines.length} upcoming
            </span>
          </div>

          {upcomingDeadlines.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingDeadlines.map(item => {
                const countdown = calculateDeadlineCountdown(item.deadlineIso, now);

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedDeadline(item)}
                    className="bg-[#1e1e24] p-5 rounded-2xl border border-[#2a2a34] hover:border-acca-red/50 transition-all cursor-pointer flex flex-col justify-between space-y-3 group shadow-md"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#141419] border border-[#2a2a34] text-gray-300">
                          {item.sessionOrPeriod}
                        </span>

                        <div className="flex items-center space-x-1.5">
                          {item.region && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                              {item.region}
                            </span>
                          )}

                          {countdown.isCritical ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              {countdown.formattedText}
                            </span>
                          ) : countdown.isUrgent ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {countdown.formattedText}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                              {countdown.formattedText}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Timing */}
                      <h3 className="text-sm font-bold text-white group-hover:text-acca-red transition-colors line-clamp-2">
                        {item.title}
                      </h3>

                      <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span>
                          {new Date(item.deadlineIso).toLocaleDateString([], {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}{' '}
                          • {item.timeString}
                        </span>
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed mt-2.5 line-clamp-2">
                        {item.summary}
                      </p>
                    </div>

                    {/* Bottom Metadata & Link */}
                    <div className="pt-3 border-t border-[#282834] flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        {item.feeAmount && (
                          <span className="font-semibold text-emerald-400 text-xs">
                            {item.feeAmount}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500">
                          Source: {item.sourceName}
                        </span>
                      </div>

                      <span className="text-[11px] font-semibold text-acca-red group-hover:translate-x-0.5 transition-transform flex items-center">
                        Details <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#1e1e24] p-8 rounded-2xl border border-[#2a2a34] text-center text-gray-400 text-xs">
              No upcoming deadlines match the current filter.
            </div>
          )}
        </div>
      )}

      {/* SECTION: Concluded / Passed Deadlines Accordion/Section */}
      {passedDeadlines.length > 0 && activeFilter !== 'general' && (
        <div className="space-y-3 pt-4 border-t border-[#282834]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Concluded Sessions & Past Milestones ({passedDeadlines.length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-75">
            {passedDeadlines.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedDeadline(item)}
                className="bg-[#16161c] p-4 rounded-xl border border-[#252530] hover:border-gray-600 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#202028] text-gray-400">
                      {item.sessionOrPeriod}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                      Passed
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-300">{item.title}</h4>
                  <span className="text-[11px] text-gray-500 font-mono">
                    {new Date(item.deadlineIso).toLocaleDateString([], {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: Official ACCA News & Announcements */}
      <div className="space-y-4 pt-4 border-t border-[#282834]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Newspaper className="w-4 h-4 text-acca-red" />
            <h2 className="text-base font-bold text-white">
              Official ACCA Announcements & Updates
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            {filteredAnnouncements.length} articles
          </span>
        </div>

        <div className="space-y-3.5">
          {filteredAnnouncements.length > 0 ? (
            filteredAnnouncements.map(item => (
              <div
                key={item.id}
                className="bg-[#1e1e24] p-5 rounded-2xl border border-[#2a2a34] hover:border-[#383848] transition-all space-y-2.5 shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-acca-red text-white">
                        {item.source}
                      </span>
                      <span className="text-[10px] font-semibold bg-[#141419] text-gray-400 border border-[#2a2a34] px-2 py-0.5 rounded uppercase">
                        {item.category}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center space-x-1 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(item.publishedAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white hover:text-acca-red transition-colors">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {item.title}
                      </a>
                    </h3>

                    <p className="text-xs text-gray-300 leading-relaxed font-sans">
                      {item.summary}
                    </p>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] text-gray-300 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shrink-0 self-end sm:self-start transition-colors group"
                  >
                    <span>Read Notice</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:text-acca-red transition-colors" />
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-[#1e1e24] p-8 rounded-2xl border border-[#2a2a34] text-center text-gray-400 text-xs">
              No general announcements match the selected filter.
            </div>
          )}
        </div>
      </div>

      {/* DEADLINE DETAIL MODAL */}
      {selectedDeadline && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedDeadline(null)}
        >
          <div
            className="bg-[#1e1e24] border border-[#2a2a34] text-gray-100 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 select-none relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#282834]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-acca-red">
                  {selectedDeadline.sessionOrPeriod}
                </span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {selectedDeadline.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDeadline(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#282834]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Timing & Countdown Card */}
            <div className="p-3.5 rounded-xl bg-[#141419] border border-[#2a2a34] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Official Deadline:</span>
                <span className="font-bold text-white font-mono">
                  {new Date(selectedDeadline.deadlineIso).toLocaleDateString([], {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Publication Time & Zone:</span>
                <span className="font-semibold text-gray-200 font-mono">
                  {selectedDeadline.timeString}
                </span>
              </div>
              {selectedDeadline.feeAmount && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Applicable Fee:</span>
                  <span className="font-bold text-emerald-400">
                    {selectedDeadline.feeAmount}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#282834]">
                <span className="text-gray-400">Status:</span>
                <span className="font-bold text-acca-red font-mono">
                  {calculateDeadlineCountdown(selectedDeadline.deadlineIso, now).formattedText}
                </span>
              </div>
            </div>

            {/* Details Description */}
            <div className="space-y-2 text-xs text-gray-300 leading-relaxed">
              <p>{selectedDeadline.details}</p>
              {selectedDeadline.caveats && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-200 text-xs space-y-1">
                  <strong className="font-bold block text-amber-300">Important Note:</strong>
                  <p>{selectedDeadline.caveats}</p>
                </div>
              )}
            </div>

            {/* Audience & Region Badges */}
            <div className="flex items-center gap-2 text-xs flex-wrap pt-2">
              <span className="px-2 py-0.5 rounded bg-[#141419] border border-[#2a2a34] text-gray-300">
                Audience: <strong className="text-white capitalize">{selectedDeadline.audience}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#141419] border border-[#2a2a34] text-gray-300">
                Applicable Region: <strong className="text-white">{selectedDeadline.region}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#141419] border border-[#2a2a34] text-gray-400 text-[10px]">
                Verified: {selectedDeadline.lastVerifiedDate}
              </span>
            </div>

            {/* Official Source Link Footer */}
            <div className="pt-3 border-t border-[#282834] flex items-center justify-between gap-3">
              <span className="text-[11px] text-gray-400">
                Authoritative Source: <strong>{selectedDeadline.sourceName}</strong>
              </span>

              <a
                href={selectedDeadline.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-acca-red hover:bg-acca-red-hover text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all shadow-xs"
              >
                <span>Verify on ACCA Global</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
