import React, { useEffect, useState, useMemo } from "react";
import { HistoryItem, HistoryAnalytics, Recommendation } from "../types";
import { getHistory, clearHistory, calculateAnalytics } from "../services/historyService";
import { generateRecommendations } from "../services/geminiService";

interface HistoryPageProps {
  onSelectHistoryItem: (item: HistoryItem) => void;
  onBack: () => void;
}

const getSubjectIcon = (subject: string) => {
  switch (subject) {
    case 'Maths': return 'calculate';
    case 'Physics': return 'science';
    case 'Chemistry': return 'biotech';
    case 'Biology': return 'genetics';
    case 'Computer Science': return 'computer';
    default: return 'school';
  }
};

const getSubjectColor = (subject: string) => {
    switch (subject) {
      case 'Maths': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'Physics': return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
      case 'Chemistry': return 'text-teal-400 bg-teal-400/10 border-teal-400/20';
      case 'Biology': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'Computer Science': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onSelectHistoryItem,
  onBack,
}) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [analytics, setAnalytics] = useState<HistoryAnalytics | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isRecLoading, setIsRecLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const data = getHistory();
    setHistory(data);
    
    // Calculate Analytics
    const stats = calculateAnalytics(data);
    setAnalytics(stats);

    // Get Recommendations if we have patterns
    if (stats.recurringPatterns.length > 0 || stats.subjectBreakdown.length > 0) {
        setIsRecLoading(true);
        generateRecommendations(
            stats.subjectBreakdown.map(s => s.subject),
            stats.recurringPatterns
        ).then(recs => {
            setRecommendations(recs);
            setIsRecLoading(false);
        }).catch(() => setIsRecLoading(false));
    }

  }, []);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConfirming) {
        clearHistory();
        setHistory([]);
        setAnalytics(null);
        setRecommendations([]);
        setIsConfirming(false);
    } else {
        setIsConfirming(true);
        setTimeout(() => setIsConfirming(false), 3000);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    }).format(date);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center text-white overflow-x-hidden p-4 md:p-6 pb-20">
      
      {/* Header */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between py-6 mb-4 animate-fade-in relative z-50">
        <button
          onClick={onBack}
          className="group p-3 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/5 transition-colors text-slate-300 hover:text-white focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-neon-focus cursor-pointer"
        >
          <span className="material-symbols-outlined transition-transform duration-300 group-hover:scale-110">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-md">
          Learning Dashboard
        </h1>
        {history.length > 0 ? (
           <button 
             type="button"
             onClick={handleClear}
             className={`text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all cursor-pointer border ${
                 isConfirming 
                 ? "bg-red-500 text-white border-red-500 hover:bg-red-600 shadow-lg scale-105" 
                 : "text-red-400 border-transparent hover:bg-red-400/10 hover:text-red-300"
             }`}
           >
             {isConfirming ? "Confirm Delete?" : "Clear All"}
           </button>
        ) : (
            <div className="w-20"></div>
        )}
      </div>

      <div className="w-full max-w-6xl mx-auto flex flex-col gap-8 relative z-10">
        
        {/* --- ANALYTICS DASHBOARD --- */}
        {analytics && history.length > 0 && (
            <div className="animate-slide-up">
                
                {/* 1. Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Diagnoses', value: analytics.totalDiagnoses, icon: 'analytics', color: 'text-blue-400' },
                        { label: 'Misconceptions Fixed', value: analytics.misconceptionsFixed, icon: 'check_circle', color: 'text-green-400' },
                        { label: 'Day Streak', value: analytics.streakDays, icon: 'local_fire_department', color: 'text-orange-400' },
                        { label: 'Top Subject', value: analytics.topSubject, icon: 'star', color: 'text-purple-400' },
                    ].map((stat, i) => (
                        <div key={i} className="p-5 rounded-2xl bg-card-dark/40 backdrop-blur-md border border-white/5 shadow-lg flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-card-dark/60 hover:border-white/10">
                            <span className={`material-symbols-outlined text-3xl ${stat.color} mb-1`}>{stat.icon}</span>
                            <span className="text-3xl font-bold text-white tracking-tight">{stat.value}</span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    
                    {/* 2. Subject Breakdown Chart */}
                    <div className="lg:col-span-2 p-6 rounded-2xl bg-card-dark/40 backdrop-blur-md border border-white/5 shadow-lg">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">pie_chart</span>
                            Subject Breakdown
                        </h3>
                        <div className="flex flex-col gap-4">
                            {analytics.subjectBreakdown.map((sub, i) => (
                                <div key={sub.subject} className="flex items-center gap-4">
                                    <div className="w-8 flex justify-center">
                                        <span className={`material-symbols-outlined text-xl`} style={{ color: sub.color }}>
                                            {getSubjectIcon(sub.subject)}
                                        </span>
                                    </div>
                                    <div className="flex-1 flex flex-col gap-1">
                                        <div className="flex justify-between text-xs font-bold text-slate-400">
                                            <span>{sub.subject}</span>
                                            <span>{sub.percentage}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${sub.percentage}%`, backgroundColor: sub.color, transitionDelay: `${i * 100}ms` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-white w-6 text-right">{sub.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. Achievements Badges */}
                    <div className="p-6 rounded-2xl bg-card-dark/40 backdrop-blur-md border border-white/5 shadow-lg">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">emoji_events</span>
                            Achievements
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {analytics.achievements.map((badge) => (
                                <div 
                                    key={badge.id} 
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                                        badge.isUnlocked 
                                        ? `${badge.color} bg-opacity-10 border-opacity-30 shadow-neon-focus` 
                                        : "bg-white/5 border-white/5 text-slate-600 grayscale opacity-50"
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-3xl mb-2">{badge.icon}</span>
                                    <span className="text-xs font-bold leading-tight">{badge.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 4. AI Insights & Recurring Patterns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    
                    {/* Recurring Patterns */}
                    <div className="p-6 rounded-2xl bg-card-dark/40 backdrop-blur-md border border-white/5 shadow-lg">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                             <span className="material-symbols-outlined text-lg">warning</span>
                             Recurring Patterns
                        </h3>
                        {analytics.recurringPatterns.length > 0 ? (
                            <div className="flex flex-col gap-3">
                                {analytics.recurringPatterns.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-red-300">{p.name}</span>
                                            <span className="text-xs text-red-400/60">{p.subject}</span>
                                        </div>
                                        <span className="px-2 py-1 rounded-md bg-red-500/20 text-xs font-bold text-red-300">
                                            {p.count}x
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm italic">No recurring patterns detected yet. Keep learning!</p>
                        )}
                    </div>

                    {/* AI Next Steps */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-blue-600/10 backdrop-blur-md border border-primary/20 shadow-glow-blue">
                         <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
                             <span className="material-symbols-outlined text-lg">auto_awesome</span>
                             AI Recommended Next Steps
                        </h3>
                        {isRecLoading ? (
                            <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-70">
                                <span className="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
                                <span className="text-xs font-bold uppercase tracking-widest text-primary">Generating path...</span>
                            </div>
                        ) : recommendations.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                {recommendations.map((rec, i) => (
                                    <div key={i} className="flex gap-3 items-start">
                                        <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0"></div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white leading-tight">{rec.title}</h4>
                                            <p className="text-xs text-slate-300 mt-1 mb-2">{rec.description}</p>
                                            <span className="inline-block px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-primary uppercase tracking-wide">
                                                {rec.action}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm italic">Complete more diagnoses to get personalized recommendations.</p>
                        )}
                    </div>
                </div>

            </div>
        )}

        {/* --- HISTORY LIST --- */}
        <div className="animate-slide-up delay-300">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 px-2">
                Recent Activity
            </h3>
            {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-24 w-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-5xl text-slate-600">history</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-300">No History Yet</h2>
                <p className="text-slate-500 mt-2 max-w-xs mx-auto">Complete a diagnosis to see your past results here.</p>
                <button
                    onClick={onBack}
                    className="mt-8 px-8 py-3 rounded-xl bg-primary/20 text-primary border border-primary/20 hover:bg-primary hover:text-white hover:shadow-glow-blue transition-all font-bold cursor-pointer"
                >
                    Start Diagnosis
                </button>
            </div>
            ) : (
            <div className="grid gap-4">
                {history.map((item, index) => (
                <div
                    key={item.id}
                    onClick={() => onSelectHistoryItem(item)}
                    className="group relative flex flex-col md:flex-row items-start md:items-center gap-5 p-6 rounded-2xl bg-card-dark/40 backdrop-blur-md border border-white/5 hover:bg-card-dark/60 hover:border-white/10 hover:shadow-lg transition-all cursor-pointer animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    {/* Icon Box */}
                    <div className={`h-14 w-14 rounded-xl flex items-center justify-center shrink-0 border ${getSubjectColor(item.subject)} group-hover:scale-110 transition-transform duration-300`}>
                    <span className="material-symbols-outlined text-3xl">
                        {getSubjectIcon(item.subject)}
                    </span>
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-white truncate">{item.subject}</h3>
                        <span className="text-xs font-medium text-slate-500 px-2 py-0.5 rounded-md bg-white/5 border border-white/5">
                            {formatDate(item.date)}
                        </span>
                    </div>
                    <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
                        {item.problemSnippet || "No problem text saved."}
                    </p>
                    </div>

                    {/* Arrow */}
                    <div className="hidden md:flex h-10 w-10 rounded-full border border-white/5 items-center justify-center text-slate-500 group-hover:text-primary group-hover:border-primary/30 transition-colors">
                        <span className="material-symbols-outlined group-hover:translate-x-0.5 transition-transform">chevron_right</span>
                    </div>
                </div>
                ))}
            </div>
            )}
        </div>
      </div>
    </div>
  );
};