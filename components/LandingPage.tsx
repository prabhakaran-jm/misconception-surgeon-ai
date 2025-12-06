
import React from "react";
import { Subject } from "../types";

interface LandingPageProps {
  onSelectSubject: (subject: string) => void;
  selectedSubject: string;
  onStart: () => void;
  onOpenHistory: () => void;
}

const subjects = [
  {
    id: Subject.MATHS,
    icon: "calculate",
    title: "Maths",
    desc: "Fix foundational mathematical errors.",
  },
  {
    id: Subject.PHYSICS,
    icon: "science",
    title: "Physics",
    desc: "Uncover gaps in physical world concepts.",
  },
  {
    id: Subject.CHEMISTRY,
    icon: "biotech",
    title: "Chemistry",
    desc: "Correct misunderstandings in molecular science.",
  },
  {
    id: Subject.BIOLOGY,
    icon: "genetics",
    title: "Biology",
    desc: "Diagnose incorrect biological concepts.",
  },
  {
    id: Subject.CS,
    icon: "computer",
    title: "Computer Science",
    desc: "Debug algorithms and data structures.",
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onSelectSubject,
  selectedSubject,
  onStart,
  onOpenHistory
}) => {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden text-white">
      
      {/* Top Bar with History Button */}
      <div className="absolute top-0 right-0 p-6 z-50 animate-fade-in">
          <button 
            onClick={onOpenHistory}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 backdrop-blur-md text-slate-300 hover:text-white transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-neon-focus group"
          >
              <span className="material-symbols-outlined text-xl group-hover:rotate-[-20deg] transition-transform duration-300">history</span>
              <span className="text-sm font-bold tracking-wide">History</span>
          </button>
      </div>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center px-4 pt-24 pb-16 text-center animate-slide-up relative z-10">
        <div className="relative mb-8 group">
            {/* Main Pulsing Gradient */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 blur-[60px] bg-primary/50 rounded-full animate-pulse-glow"></div>
            
            {/* Secondary colored blobs for depth */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 blur-[80px] bg-purple-500/20 rounded-full animate-pulse-glow delay-75"></div>

            {/* Floating Particles */}
            {/* Particle 1 */}
            <div className="absolute -top-6 -left-6 w-1.5 h-1.5 bg-blue-300 rounded-full animate-float-slow opacity-80 shadow-[0_0_10px_rgba(147,197,253,0.8)]"></div>
            {/* Particle 2 */}
            <div className="absolute top-2 -right-10 w-2 h-2 bg-purple-400 rounded-full animate-float-medium delay-300 opacity-70 shadow-[0_0_10px_rgba(192,132,252,0.8)]"></div>
            {/* Particle 3 */}
            <div className="absolute -bottom-4 left-8 w-1 h-1 bg-white rounded-full animate-float-fast delay-150 opacity-90 shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
             {/* Particle 4 */}
            <div className="absolute bottom-6 -right-4 w-1.5 h-1.5 bg-primary rounded-full animate-float-slow delay-500 opacity-60"></div>
            {/* Particle 5 */}
            <div className="absolute top-0 -left-12 w-1 h-1 bg-cyan-300 rounded-full animate-float-medium delay-700 opacity-50"></div>

            <div
              className="relative text-primary z-10 transition-transform duration-700 hover:scale-105"
              style={{ textShadow: "0 0 50px rgba(58, 123, 255, 0.6)" }}
            >
              <span className="material-symbols-outlined text-9xl">neurology</span>
            </div>
        </div>
        
        <h1 className="text-5xl sm:text-7xl font-extrabold leading-tight tracking-tight text-white mb-6 drop-shadow-lg">
          Misconception <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-300">Surgeon</span>
        </h1>
        <p className="mt-2 text-xl font-light leading-relaxed text-slate-200/80 max-w-2xl mx-auto backdrop-blur-sm">
          AI-powered diagnosis for your STEM knowledge gaps. <br className="hidden sm:block" /> Pinpoint the root cause and repair it instantly.
        </p>
      </div>

      {/* Feature Section */}
      <div className="flex-1 px-4 max-w-5xl mx-auto w-full pb-32 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {subjects.map((sub, index) => {
            const isSelected = selectedSubject === sub.id;
            return (
              <div
                key={sub.id}
                onClick={() => onSelectSubject(sub.id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectSubject(sub.id);
                  }
                }}
                className={`
                  group relative flex cursor-pointer flex-row items-center gap-5 rounded-2xl border p-6 transition-all duration-300 ease-out
                  animate-slide-up backdrop-blur-md
                  hover:-translate-y-1
                  focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-neon-focus
                  ${
                    isSelected
                      ? "border-primary/50 bg-primary/20 shadow-glow-blue"
                      : "border-white/5 bg-card-dark/40 hover:bg-card-dark/60 hover:border-white/10 hover:shadow-lg"
                  }
                `}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div 
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300 border border-white/5 ${
                        isSelected ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 text-primary group-hover:bg-primary/20"
                    }`}
                >
                  <span className="material-symbols-outlined text-4xl transition-transform duration-300 ease-out group-hover:scale-110">
                    {sub.icon}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <h2 className="text-xl font-bold leading-tight text-white group-hover:text-primary transition-colors">
                    {sub.title}
                  </h2>
                  <p className="text-base font-normal leading-relaxed text-slate-400 group-hover:text-slate-300">
                    {sub.desc}
                  </p>
                </div>
                
                {/* Selection Indicator */}
                <div className={`absolute right-5 top-1/2 -translate-y-1/2 transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                   <span className="material-symbols-outlined text-primary text-3xl drop-shadow-[0_0_8px_rgba(58,123,255,0.8)]">check_circle</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA Section */}
      <div className="fixed bottom-0 z-20 w-full bg-gradient-to-t from-background-dark via-background-dark/95 to-transparent pt-12 pb-10 px-4 flex justify-center animate-fade-in delay-500 pointer-events-none">
        <div className="w-full max-w-sm pointer-events-auto">
            <button
            onClick={onStart}
            className="group flex h-16 w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-blue-600 text-xl font-bold leading-normal text-white shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-primary/50 hover:scale-105 active:scale-95 border border-white/20 focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-neon-focus backdrop-blur-sm"
            >
            <span>Start Diagnosis</span>
            <span className="material-symbols-outlined transition-transform duration-300 group-hover:scale-110 group-hover:translate-x-1">arrow_forward</span>
            </button>
        </div>
      </div>
    </div>
  );
};
