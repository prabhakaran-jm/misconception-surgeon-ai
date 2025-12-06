import React, { useEffect, useState } from "react";
import { HistoryItem } from "../types";
import { getHistory, clearHistory } from "../services/historyService";

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
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConfirming) {
        clearHistory();
        setHistory([]);
        setIsConfirming(false);
    } else {
        setIsConfirming(true);
        // Reset confirmation after 3 seconds if not clicked
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
    <div className="relative flex min-h-screen w-full flex-col items-center text-white overflow-x-hidden p-4 md:p-6">
      
      {/* Header */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between py-6 mb-4 animate-fade-in relative z-50">
        <button
          onClick={onBack}
          className="group p-3 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/5 transition-colors text-slate-300 hover:text-white focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-neon-focus cursor-pointer"
        >
          <span className="material-symbols-outlined transition-transform duration-300 group-hover:scale-110">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-md">
          Diagnosis History
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

      {/* Content */}
      <div className="w-full max-w-4xl mx-auto relative z-10">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-slide-up">
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
  );
};