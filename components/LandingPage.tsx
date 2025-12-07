
import React, { useState, useEffect } from "react";
import { Subject } from "../types";

interface LandingPageProps {
  onSelectSubject: (subject: string) => void;
  selectedSubject: string;
  onStart: () => void;
  onOpenHistory: () => void;
}

// --- Custom Hook for Number Animation ---
const useCountUp = (end: number, duration: number = 2000, delay: number = 0) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function (easeOutExpo) for smooth landing
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setCount(Math.floor(easeProgress * end));
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    const timer = setTimeout(() => {
      window.requestAnimationFrame(step);
    }, delay);

    return () => clearTimeout(timer);
  }, [end, duration, delay]);

  return count;
};

// --- Sub-Components ---

const StatCard = ({ icon, value, label, suffix = "", delay = 0, color = "text-primary" }: { icon: string, value: number, label: string, suffix?: string, delay?: number, color?: string }) => {
  const count = useCountUp(value, 2000, delay);
  
  return (
    <div 
      className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group"
    >
      <div className={`mb-2 p-3 rounded-full bg-white/5 group-hover:scale-110 transition-transform duration-300 ${color}`}>
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-white tracking-tight">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mt-1">
        {label}
      </div>
    </div>
  );
};

const TestimonialCard = ({ quote, name, role, subject, icon, colorClass, delay }: { quote: string, name: string, role: string, subject: string, icon: string, colorClass: string, delay: number }) => (
  <div 
    className="flex flex-col p-6 rounded-2xl bg-card-dark/40 backdrop-blur-md border border-white/5 hover:bg-card-dark/60 hover:border-white/10 transition-all duration-300 animate-slide-up h-full"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${colorClass} bg-opacity-20 text-white border border-white/10`}>
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className="material-symbols-outlined text-sm text-primary filled">star</span>
        ))}
      </div>
    </div>
    
    <p className="text-slate-200 text-sm italic leading-relaxed mb-6 flex-1">
      "{quote}"
    </p>
    
    <div className="border-t border-white/5 pt-4 mt-auto">
      <h4 className="text-white font-bold text-sm">{name}</h4>
      <div className="flex justify-between items-center mt-1">
         <span className="text-slate-400 text-xs">{role}</span>
         <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">{subject}</span>
      </div>
    </div>
  </div>
);

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
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden text-white pb-32">
      
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
      <div className="flex flex-col items-center justify-center px-4 pt-24 pb-12 text-center animate-slide-up relative z-10">
        <div className="relative mb-8 group">
            {/* Main Pulsing Gradient */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 blur-[60px] bg-primary/50 rounded-full animate-pulse-glow"></div>
            
            {/* Secondary colored blobs for depth */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 blur-[80px] bg-purple-500/20 rounded-full animate-pulse-glow delay-75"></div>

            {/* Floating Particles */}
            <div className="absolute -top-6 -left-6 w-1.5 h-1.5 bg-blue-300 rounded-full animate-float-slow opacity-80 shadow-[0_0_10px_rgba(147,197,253,0.8)]"></div>
            <div className="absolute top-2 -right-10 w-2 h-2 bg-purple-400 rounded-full animate-float-medium delay-300 opacity-70 shadow-[0_0_10px_rgba(192,132,252,0.8)]"></div>
            <div className="absolute -bottom-4 left-8 w-1 h-1 bg-white rounded-full animate-float-fast delay-150 opacity-90 shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
            <div className="absolute bottom-6 -right-4 w-1.5 h-1.5 bg-primary rounded-full animate-float-slow delay-500 opacity-60"></div>
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

      {/* --- IMPACT STATS BANNER --- */}
      <div className="w-full max-w-5xl mx-auto px-4 mb-16 relative z-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon="analytics" value={12847} suffix="+" label="Diagnoses" delay={0} color="text-blue-400 bg-blue-500/20" />
            <StatCard icon="groups" value={3421} suffix="+" label="Students Helped" delay={100} color="text-green-400 bg-green-500/20" />
            <StatCard icon="trending_up" value={94} suffix="%" label="Improvement Rate" delay={200} color="text-purple-400 bg-purple-500/20" />
            <StatCard icon="school" value={5} label="STEM Subjects" delay={300} color="text-orange-400 bg-orange-500/20" />
         </div>
      </div>

      {/* Subject Selection Grid */}
      <div className="flex-1 px-4 max-w-5xl mx-auto w-full mb-24 relative z-10">
        <h3 className="text-center text-sm font-bold text-slate-500 uppercase tracking-widest mb-8 animate-fade-in">Select Your Subject</h3>
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

      {/* --- TESTIMONIALS SECTION --- */}
      <div className="w-full max-w-5xl mx-auto px-4 mb-24 relative z-10">
         <div className="text-center mb-10 animate-fade-in">
             <h3 className="text-2xl font-bold text-white mb-2">Trusted by Students & Teachers</h3>
             <p className="text-slate-400">Join thousands learning smarter with AI-powered diagnosis</p>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <TestimonialCard 
                quote="This app finally helped me understand why I kept getting distribution wrong. The visual diagrams made it click!"
                name="Sarah M."
                role="Grade 10 Student"
                subject="Mathematics"
                icon="person"
                colorClass="bg-blue-500"
                delay={200}
             />
             <TestimonialCard 
                quote="I use this with my class to identify common misconceptions. The AI reasoning log helps me understand my students."
                name="Mr. Johnson"
                role="Physics Teacher"
                subject="Physics"
                icon="school"
                colorClass="bg-indigo-500"
                delay={300}
             />
             <TestimonialCard 
                quote="Being able to explain my confusion with voice instead of typing made it so much easier. The AI understood me!"
                name="Alex K."
                role="CS Student"
                subject="Comp Sci"
                icon="person"
                colorClass="bg-purple-500"
                delay={400}
             />
         </div>
      </div>

      {/* --- TRUST BADGES --- */}
      <div className="w-full max-w-5xl mx-auto px-4 pb-8 flex flex-wrap justify-center gap-6 md:gap-12 relative z-10 animate-fade-in opacity-70">
          <div className="flex items-center gap-2 text-slate-400">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              <span className="text-xs font-bold uppercase tracking-wider">Powered by Gemini 3 Pro</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
              <span className="material-symbols-outlined text-sm">security</span>
              <span className="text-xs font-bold uppercase tracking-wider">Privacy First - Local Data</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
              <span className="material-symbols-outlined text-sm">favorite</span>
              <span className="text-xs font-bold uppercase tracking-wider">Free for Students</span>
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
