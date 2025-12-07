import { HistoryItem, HistoryAnalytics, Achievement, SubjectStat, MisconceptionPattern } from "../types";

const HISTORY_KEY = "misconception_history_v1";

export const getHistory = (): HistoryItem[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const saveHistoryItem = (
  item: Omit<HistoryItem, "id" | "date">
): HistoryItem => {
  const history = getHistory();
  
  const newItem: HistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  };

  // Prepend new item (newest first)
  const updatedHistory = [newItem, ...history];
  
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (e) {
    console.error("Failed to save history", e);
  }

  return newItem;
};

export const clearHistory = (): void => {
  localStorage.removeItem(HISTORY_KEY);
};

// --- Analytics Logic ---

const getSubjectColorHex = (subject: string) => {
    switch (subject) {
      case 'Maths': return '#60A5FA'; // blue-400
      case 'Physics': return '#818CF8'; // indigo-400
      case 'Chemistry': return '#2DD4BF'; // teal-400
      case 'Biology': return '#4ADE80'; // green-400
      case 'Computer Science': return '#C084FC'; // purple-400
      default: return '#94A3B8'; // slate-400
    }
};

export const calculateAnalytics = (history: HistoryItem[]): HistoryAnalytics => {
    const totalDiagnoses = history.length;
    
    // 1. Calculate Misconceptions Fixed
    // We estimate this by counting bullet points in the "Detected Misconceptions" section of the raw result
    let misconceptionsFixed = 0;
    const patternsMap: Record<string, { count: number, subject: string }> = {};

    history.forEach(item => {
        // Extract section 2
        const match = item.result.match(/### 2\. Detected Misconceptions([\s\S]*?)(###|$)/);
        if (match) {
            const content = match[1];
            // Count bullets
            const bullets = content.match(/^\s*-\s*\*\*(.*?)\*\*/gm);
            if (bullets) {
                misconceptionsFixed += bullets.length;
                
                // Extract Pattern Names for recurring analysis
                bullets.forEach(b => {
                    const name = b.replace(/^\s*-\s*\*\*/, '').replace(/\*\*.*$/, '').trim();
                    if (name) {
                        if (!patternsMap[name]) {
                            patternsMap[name] = { count: 0, subject: item.subject };
                        }
                        patternsMap[name].count++;
                    }
                });
            }
        }
    });

    // 2. Calculate Streak
    // Sort dates descending
    const sortedDates = [...history].map(h => new Date(h.date).setHours(0,0,0,0)).sort((a,b) => b - a);
    const uniqueDates = Array.from(new Set(sortedDates));
    
    let streakDays = 0;
    if (uniqueDates.length > 0) {
        const today = new Date().setHours(0,0,0,0);
        const yesterday = today - 86400000;
        
        // If last activity was today or yesterday, streak is active
        if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
            streakDays = 1;
            for (let i = 0; i < uniqueDates.length - 1; i++) {
                if (uniqueDates[i] - uniqueDates[i+1] <= 86400000) { // 1 day diff
                    streakDays++;
                } else {
                    break;
                }
            }
        }
    }

    // 3. Subject Breakdown
    const subjectCounts: Record<string, number> = {};
    history.forEach(h => {
        subjectCounts[h.subject] = (subjectCounts[h.subject] || 0) + 1;
    });
    
    const subjectBreakdown: SubjectStat[] = Object.entries(subjectCounts).map(([sub, count]) => ({
        subject: sub,
        count,
        percentage: Math.round((count / totalDiagnoses) * 100),
        color: getSubjectColorHex(sub)
    })).sort((a, b) => b.count - a.count);

    const topSubject = subjectBreakdown.length > 0 ? subjectBreakdown[0].subject : "N/A";

    // 4. Recurring Patterns (Top 3)
    const recurringPatterns: MisconceptionPattern[] = Object.entries(patternsMap)
        .map(([name, data]) => ({ id: name, name, count: data.count, subject: data.subject }))
        .sort((a, b) => b.count - a.count)
        .filter(p => p.count > 1) // Only show if it happened more than once
        .slice(0, 3);

    // 5. Achievements
    const achievements: Achievement[] = [
        {
            id: "first_step",
            title: "First Step",
            description: "Completed your first diagnosis",
            icon: "flag",
            color: "text-blue-400 bg-blue-500/20 border-blue-500/50",
            isUnlocked: totalDiagnoses >= 1
        },
        {
            id: "momentum",
            title: "Momentum",
            description: "Completed 5 diagnoses",
            icon: "trending_up",
            color: "text-green-400 bg-green-500/20 border-green-500/50",
            isUnlocked: totalDiagnoses >= 5
        },
        {
            id: "scholar",
            title: "Scholar",
            description: "Reached a 3-day learning streak",
            icon: "local_fire_department",
            color: "text-orange-400 bg-orange-500/20 border-orange-500/50",
            isUnlocked: streakDays >= 3
        },
        {
            id: "master",
            title: "Subject Master",
            description: "5 diagnoses in a single subject",
            icon: "school",
            color: "text-purple-400 bg-purple-500/20 border-purple-500/50",
            isUnlocked: subjectBreakdown.some(s => s.count >= 5)
        }
    ];

    return {
        totalDiagnoses,
        misconceptionsFixed,
        streakDays,
        topSubject,
        subjectBreakdown,
        recurringPatterns,
        achievements
    };
};