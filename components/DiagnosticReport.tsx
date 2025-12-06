import React, { useMemo, useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { generateConceptDiagram } from "../services/geminiService";

interface DiagnosticReportProps {
  subject: string;
  result: string | null;
  onBack: () => void;
  onNewProblem: () => void;
}

interface ParsedSection {
  id: string;
  title: string;
  content: string;
  icon: string;
  colorClass: string;
  textColorClass: string;
  printColorClass: string; // Darker background for print
  printTextClass: string;  // Darker text for print
}

// --- Sub-component: Section Card (Handles both Screen and Print modes) ---
const SectionCard: React.FC<{ 
    id: string;
    section: ParsedSection; 
    defaultOpen: boolean; 
    delay: number;
    extraContent?: React.ReactNode; 
    isPrintMode: boolean;
}> = ({ id, section, defaultOpen, delay, extraContent, isPrintMode }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    // --- PRINT MODE RENDER ---
    if (isPrintMode) {
        return (
            <div 
                id={id}
                className="flex flex-col rounded-xl bg-white border border-slate-300 mb-6 break-inside-avoid shadow-sm overflow-visible"
            >
                <div className="flex items-center gap-4 p-5 border-b border-slate-200 bg-slate-100 rounded-t-xl">
                    <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${section.printColorClass} border border-slate-300 shrink-0`}>
                        <span className={`material-symbols-outlined text-xl ${section.printTextClass}`}>
                            {section.icon}
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                        {section.title}
                    </h3>
                </div>
                
                <div className="p-6">
                    <div className="prose prose-slate prose-lg prose-p:text-slate-800 prose-p:leading-relaxed prose-headings:text-slate-900 prose-strong:text-slate-900 prose-li:text-slate-800 max-w-none">
                        <Markdown>{section.content}</Markdown>
                    </div>
                    {extraContent && (
                        <div className="mt-6 pt-4 border-t border-slate-200">
                            {extraContent}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- SCREEN MODE RENDER ---
    return (
        <div 
            id={id}
            className="flex flex-col rounded-2xl bg-card-dark/40 backdrop-blur-md border border-white/5 transition-all duration-300 hover:bg-card-dark/50 hover:border-white/10 animate-slide-up shadow-sm scroll-mt-28"
            style={{ animationDelay: `${delay}ms` }}
        >
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="group flex items-center justify-between p-6 w-full text-left hover:bg-white/5 transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-neon-focus rounded-t-2xl"
            >
                <div className="flex items-center gap-5">
                    <div className={`flex items-center justify-center h-12 w-12 rounded-xl ${section.colorClass} bg-opacity-10 shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 border border-white/5`}>
                        <span className={`material-symbols-outlined text-2xl ${section.textColorClass}`}>
                            {section.icon}
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                        {section.title}
                    </h3>
                </div>
                <span className={`material-symbols-outlined text-slate-500 text-2xl transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>
            
            {/* Using max-height for animation instead of grid to avoid overflow clipping issues in some contexts, but simplified here for robustness */}
            <div className={`${isOpen ? 'block' : 'hidden'} animate-fade-in`}>
                <div className="p-8 pt-2 border-t border-white/5">
                    <div className="prose prose-invert prose-lg prose-p:text-slate-200 prose-p:leading-loose prose-p:text-lg prose-headings:text-white prose-headings:font-bold prose-headings:mb-4 prose-headings:mt-6 prose-strong:text-white prose-strong:font-bold prose-li:text-slate-200 prose-li:leading-relaxed max-w-none">
                        <Markdown>{section.content}</Markdown>
                    </div>
                    {extraContent && (
                            <div className="mt-8 pt-6 border-t border-white/5 animate-fade-in">
                                {extraContent}
                            </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const DiagnosticReport: React.FC<DiagnosticReportProps> = ({
  subject,
  result,
  onBack,
  onNewProblem,
}) => {
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false); // Controls Print Mode
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [activeSection, setActiveSection] = useState<string>("");

  // Diagram generation state
  const [diagramUrl, setDiagramUrl] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const { headline, sections, severity, score } = useMemo(() => {
    if (!result) return { headline: "", sections: [], severity: "Unknown", score: 0 };

    // Parse Headline (starts with #)
    let headlineText = "";
    let contentToParse = result;
    
    // Simple extraction of the first # Headline line
    const headlineMatch = result.match(/^#\s*(.+)$/m);
    if (headlineMatch) {
        headlineText = headlineMatch[1].trim();
        // Remove the headline line from content so it doesn't duplicate in sections
        contentToParse = result.replace(/^#\s*(.+)$/m, '').trim();
    }

    const rawSections = contentToParse.split(/###\s*\d+\.\s*/).filter((s) => s.trim());
    
    // Config includes both Screen (dark) and Print (light/bold) classes
    const uiConfig = [
      { title: "What I Observed", icon: "visibility", color: "bg-blue-500", text: "text-blue-400", printColor: "bg-blue-100", printText: "text-blue-700" },
      { title: "Detected Misconceptions", icon: "error", color: "bg-red-500", text: "text-red-400", printColor: "bg-red-100", printText: "text-red-700" },
      { title: "Why This Misconception Happens", icon: "psychology", color: "bg-orange-500", text: "text-orange-400", printColor: "bg-orange-100", printText: "text-orange-700" },
      { title: "Concept Repair", icon: "healing", color: "bg-green-500", text: "text-green-400", printColor: "bg-green-100", printText: "text-green-700" },
      { title: "Worked Correct Example", icon: "check_circle", color: "bg-teal-500", text: "text-teal-400", printColor: "bg-teal-100", printText: "text-teal-700" },
      { title: "Check Yourself", icon: "quiz", color: "bg-purple-500", text: "text-purple-400", printColor: "bg-purple-100", printText: "text-purple-700" },
    ];

    const parsed: ParsedSection[] = rawSections.map((sec, index) => {
        const lines = sec.trim().split('\n');
        // Handle cases where title might be in the first line or not
        const config = uiConfig[index] || { title: lines[0].replace(/^#+\s*/, ''), icon: "info", color: "bg-gray-500", text: "text-gray-400", printColor: "bg-gray-100", printText: "text-gray-700" };
        
        // Remove title from content if it was duplicated
        const contentBody = sec.replace(new RegExp(`^${config.title}`, 'i'), '').trim();

        return {
            id: `section-${index}`,
            title: config.title,
            content: contentBody,
            icon: config.icon,
            colorClass: config.color,
            textColorClass: config.text,
            printColorClass: config.printColor,
            printTextClass: config.printText
        };
    });

    // Calculate Severity
    const misconceptionSection = parsed.find(p => p.title === "Detected Misconceptions");
    let severityLevel = "Mild";
    let calculatedScore = 30; // Base score

    if (misconceptionSection) {
        const bulletCount = (misconceptionSection.content.match(/[•-]/g) || []).length;
        if (bulletCount >= 3) {
             severityLevel = "Severe";
             calculatedScore = 95;
        } else if (bulletCount >= 2) {
             severityLevel = "Moderate";
             calculatedScore = 65;
        }
    }

    return { headline: headlineText, sections: parsed, severity: severityLevel, score: calculatedScore };
  }, [result]);

  // Set initial active section
  useEffect(() => {
    if (sections.length > 0) {
      setActiveSection(sections[0].id);
    }
  }, [sections]);

  // ScrollSpy Logic
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200; // Offset for header

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  // Animate Gauge on Mount
  useEffect(() => {
      const timer = setTimeout(() => {
          setAnimatedScore(score);
      }, 300);
      return () => clearTimeout(timer);
  }, [score]);

  // Generate Diagram Effect
  useEffect(() => {
      setDiagramUrl(null);
      setGenStatus('idle');
  }, [result]);

  useEffect(() => {
      const repairSection = sections.find(s => s.title === "Concept Repair");
      if (repairSection && genStatus === 'idle' && result) {
          setGenStatus('loading');
          generateConceptDiagram(repairSection.content)
              .then(url => {
                  setDiagramUrl(url);
                  setGenStatus('success');
              })
              .catch(e => {
                  console.error("Failed to generate diagram", e);
                  setGenStatus('error');
              });
      }
  }, [sections, genStatus, result]);

  const scrollToSection = (id: string) => {
      const element = document.getElementById(id);
      if (element) {
          const y = element.getBoundingClientRect().top + window.scrollY - 100; // Offset for sticky header
          window.scrollTo({ top: y, behavior: 'smooth' });
      }
  };

  const getSeverityStyle = (s: string) => {
      if (isCapturing) {
          // Print Mode Severity Styles
           switch(s) {
              case "Severe": return "bg-red-100 text-red-700 border-red-300";
              case "Moderate": return "bg-orange-100 text-orange-700 border-orange-300";
              default: return "bg-green-100 text-green-700 border-green-300";
          }
      }
      // Screen Mode Severity Styles
      switch(s) {
          case "Severe": return "bg-red-500/10 text-red-300 border-red-500/20 ring-1 ring-red-500/20";
          case "Moderate": return "bg-orange-500/10 text-orange-300 border-orange-500/20 ring-1 ring-orange-500/20";
          default: return "bg-green-500/10 text-green-300 border-green-500/20 ring-1 ring-green-500/20";
      }
  }
  
  const getGaugeColor = (s: string) => {
      switch(s) {
          case "Severe": return "#EF4444"; // red-500
          case "Moderate": return "#F97316"; // orange-500
          default: return "#22C55E"; // green-500
      }
  }

  // --- EXPORT HANDLERS ---
  const handleExport = async (type: 'png' | 'pdf') => {
      if (!reportContainerRef.current) return;
      
      const setDownloading = type === 'png' ? setIsSharing : setIsDownloadingPDF;
      setDownloading(true);
      
      // 1. Enter Print Mode
      setIsCapturing(true);

      // 2. Wait for React to render the white layout
      await new Promise(resolve => setTimeout(resolve, 800));

      try {
          const element = reportContainerRef.current;
          
          // 3. Capture with light settings
          const canvas = await html2canvas(element, {
              backgroundColor: '#ffffff', // White background for print
              scale: 2, // High resolution
              useCORS: true,
              logging: false,
              ignoreElements: (element) => element.classList.contains('no-capture'),
              windowWidth: 1200, // Enforce desktop width layout
              onclone: (clonedDoc) => {
                  // Ensure all elements are visible in clone
                  const clonedElement = clonedDoc.querySelector(`[data-capture-target="true"]`) as HTMLElement;
                  if (clonedElement) {
                      clonedElement.style.height = 'auto';
                      clonedElement.style.overflow = 'visible';
                  }
              }
          });

          if (type === 'png') {
              const image = canvas.toDataURL("image/png");
              const link = document.createElement('a');
              link.href = image;
              link.download = `Misconception-Diagnosis-${subject}-${new Date().getTime()}.png`;
              link.click();
          } else {
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF('p', 'mm', 'a4');
              const imgWidth = 210;
              const pageHeight = 297;
              const imgHeight = (canvas.height * imgWidth) / canvas.width;
              let heightLeft = imgHeight;
              let position = 0;

              pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
              heightLeft -= pageHeight;

              while (heightLeft >= 0) {
                  position = heightLeft - imgHeight;
                  pdf.addPage();
                  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                  heightLeft -= pageHeight;
              }
              pdf.save(`Misconception-Report-${subject}.pdf`);
          }
      } catch (error) {
          console.error("Export failed:", error);
          alert("Failed to export report. Please try again.");
      } finally {
          // 4. Revert to Screen Mode
          setIsCapturing(false);
          setDownloading(false);
      }
  };
  
  // Gauge Calculations
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center text-white">
      
      {/* Sticky Header - Hidden during capture */}
      {!isCapturing && (
          <div className="sticky top-0 z-40 w-full bg-background-dark/70 backdrop-blur-xl border-b border-white/5 transition-all shadow-lg no-capture">
              <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="group p-2 -ml-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-neon-focus"
                    >
                        <span className="material-symbols-outlined transition-transform duration-300 group-hover:scale-110">arrow_back</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            <h1 className="text-lg font-bold leading-none tracking-tight">Diagnostic Report</h1>
                            <span className="text-sm text-slate-400 leading-none mt-1.5 font-medium">{subject}</span>
                        </div>
                        
                        {/* Circular Severity Gauge (Screen Only) */}
                        <div className="relative h-10 w-10 group cursor-help ml-2 hidden sm:block">
                            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 44 44">
                                <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-700/30" />
                                <circle 
                                    cx="22" cy="22" r={radius} fill="none" 
                                    stroke={getGaugeColor(severity)} 
                                    strokeWidth="4" 
                                    strokeDasharray={circumference} 
                                    strokeDashoffset={strokeDashoffset} 
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                    style={{ filter: `drop-shadow(0 0 4px ${getGaugeColor(severity)}80)` }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                 <span className="text-[10px] font-bold" style={{ color: getGaugeColor(severity) }}>
                                     {animatedScore}
                                 </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className={`px-5 py-2 rounded-full border text-xs font-bold uppercase tracking-widest shadow-lg backdrop-blur-md ${getSeverityStyle(severity)} animate-fade-in`}>
                    {severity} Issue
                </div>
              </div>
          </div>
      )}

      {/* Main Content Area */}
      <main className={`w-full max-w-6xl mx-auto p-4 sm:p-8 pb-32 relative z-10 transition-colors duration-500 ${isCapturing ? 'bg-white text-slate-900 min-h-screen' : ''}`}>
        <div className={`grid gap-8 items-start ${!isCapturing ? 'lg:grid-cols-[240px_1fr]' : 'grid-cols-1'}`}>
            
            {/* Sidebar Navigation - Hidden during capture */}
            {!isCapturing && (
                <aside className="hidden lg:block sticky top-28 animate-slide-up no-capture">
                    <nav className="flex flex-col gap-1 p-4 rounded-2xl bg-card-dark/20 backdrop-blur-sm border border-white/5">
                        <p className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                            Sections
                        </p>
                        {sections.map((section) => {
                            const isActive = activeSection === section.id;
                            return (
                                <button
                                    key={section.id}
                                    onClick={() => scrollToSection(section.id)}
                                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 text-left group ${
                                        isActive 
                                        ? "bg-primary/10 text-white shadow-neon-focus border border-primary/20" 
                                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                                    }`}
                                >
                                    <span className={`material-symbols-outlined text-lg ${isActive ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                        {section.icon}
                                    </span>
                                    <span className="text-sm font-medium truncate">
                                        {section.title}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>
            )}

            {/* Main Report Column */}
            <div className="flex flex-col gap-6 w-full">
                
                {/* Intro Text (Screen Only) */}
                {!isCapturing && (
                    <p className="text-slate-400 text-center lg:text-left text-base mb-2 animate-fade-in max-w-2xl leading-relaxed no-capture">
                        Review the detailed analysis below to understand the root cause of the misconception and how to fix it effectively.
                    </p>
                )}

                {/* --- CAPTURE CONTAINER --- */}
                <div 
                    ref={reportContainerRef} 
                    data-capture-target="true"
                    className={`flex flex-col gap-5 rounded-xl ${isCapturing ? 'p-8 bg-white' : 'p-4 -m-4'}`}
                >
                    {/* Header for Print/Image Only */}
                    {isCapturing && (
                        <div className="mb-8 text-center border-b-2 border-slate-100 pb-6">
                            <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">Misconception Surgeon Report</h1>
                            <div className="flex items-center justify-center gap-4 text-slate-500 font-medium">
                                <span>{subject}</span>
                                <span>•</span>
                                <span>{new Date().toLocaleDateString()}</span>
                            </div>
                            <div className={`inline-block mt-4 px-4 py-1.5 rounded-full border text-sm font-bold uppercase tracking-widest ${getSeverityStyle(severity)}`}>
                                {severity} Severity
                            </div>
                        </div>
                    )}

                    {/* Report Headline Summary */}
                    {headline && (
                        <div className={`rounded-xl p-6 mb-2 break-inside-avoid ${isCapturing ? 'bg-blue-50 border border-blue-100' : 'bg-gradient-to-r from-blue-900/30 to-background-dark border border-primary/20 shadow-glow-blue'}`}>
                             <h2 className={`text-xl font-bold mb-1 ${isCapturing ? 'text-blue-900' : 'text-blue-200'}`}>Root Misconception Identified</h2>
                             <p className={`text-lg leading-relaxed ${isCapturing ? 'text-slate-800' : 'text-white'}`}>
                                 {headline}
                             </p>
                        </div>
                    )}

                    {sections.map((section, idx) => (
                        <SectionCard 
                            key={section.id} 
                            id={section.id}
                            section={section} 
                            defaultOpen={idx < 4}
                            delay={idx * 100}
                            isPrintMode={isCapturing}
                            extraContent={section.title === "Concept Repair" ? (
                                <div className={`relative w-full rounded-2xl overflow-hidden mt-4 min-h-[200px] flex items-center justify-center ${isCapturing ? 'bg-slate-50 border border-slate-200' : 'bg-black/20 border border-white/10'}`}>
                                    {genStatus === 'loading' && !isCapturing && (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3 animate-fade-in">
                                            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                            <p className="text-xs font-bold uppercase tracking-widest text-primary/70 animate-pulse">Generating Visual Aid...</p>
                                        </div>
                                    )}
                                    {genStatus === 'success' && diagramUrl && (
                                        <div className="group relative w-full animate-fade-in">
                                            <img src={diagramUrl} alt="Concept Diagram" className="w-full h-auto object-cover" />
                                            {!isCapturing && (
                                                <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white/80 uppercase tracking-wider border border-white/10 shadow-lg">
                                                    AI Generated Diagram
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {genStatus === 'error' && (
                                        <div className="flex flex-col items-center justify-center py-8 gap-2 opacity-60">
                                            <span className="material-symbols-outlined text-slate-500">broken_image</span>
                                            <p className="text-xs text-slate-500 font-bold uppercase">Visual Aid Generation Failed</p>
                                        </div>
                                    )}
                                </div>
                            ) : undefined}
                        />
                    ))}
                    
                    {/* Footer for Print Only */}
                    {isCapturing && (
                        <div className="mt-8 pt-8 border-t border-slate-200 text-center text-slate-400 text-sm">
                            Generated by Misconception Surgeon AI • {new Date().getFullYear()}
                        </div>
                    )}
                </div>

                {/* Action Buttons (Screen Only) */}
                {!isCapturing && (
                    <div className="flex flex-col md:flex-row gap-4 mt-6 animate-slide-up delay-500 no-capture">
                    
                        {/* Group Secondary Actions */}
                        <div className="flex flex-1 gap-4">
                            <button
                                onClick={() => handleExport('png')}
                                disabled={isSharing}
                                className="group flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-slate-300 font-bold hover:bg-white/10 hover:text-white transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-neon-focus text-base"
                            >
                                {isSharing ? (
                                    <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover:scale-110">share</span>
                                )}
                                <span className="truncate">{isSharing ? "Generating..." : "Share Image"}</span>
                            </button>
                            
                            <button
                                onClick={() => handleExport('pdf')}
                                disabled={isDownloadingPDF}
                                className="group flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-slate-300 font-bold hover:bg-white/10 hover:text-white transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-neon-focus text-base"
                            >
                                {isDownloadingPDF ? (
                                    <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover:scale-110">picture_as_pdf</span>
                                )}
                                <span className="truncate">{isDownloadingPDF ? "Creating PDF..." : "Download PDF"}</span>
                            </button>
                        </div>

                        <div className="hidden md:block w-px bg-white/10 mx-2"></div>

                        {/* Group Primary Actions */}
                        <div className="flex flex-1 gap-4">
                            <button
                                onClick={onBack}
                                className="group flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-slate-300 font-bold hover:bg-white/10 hover:text-white transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-neon-focus text-base"
                            >
                                <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover:scale-110">edit</span>
                                Edit Inputs
                            </button>

                            <button
                                onClick={onNewProblem}
                                className="group flex-[1.2] flex items-center justify-center gap-2 h-14 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-blue-600 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-neon-focus text-base border border-white/10"
                            >
                                <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover:scale-110">add_circle</span>
                                New Diagnosis
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};