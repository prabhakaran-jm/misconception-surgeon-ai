
import React, { useMemo, useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { generateConceptDiagram, explainWorkedExampleStep, evaluateQuizAnswer } from "../services/geminiService";
import { AIConceptChat } from "./AIConceptChat";

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
  printColorClass: string;
  printTextClass: string;
}

// --- Interactive Quiz Component ---
const InteractiveQuiz: React.FC<{ content: string; subject: string }> = ({ content, subject }) => {
    // Parse questions: ① ... ② ... ③ ...
    const questions = useMemo(() => {
        const matches = [
            content.match(/①\s*(.*?)(?=\n- ②|$)/s),
            content.match(/②\s*(.*?)(?=\n- ③|$)/s),
            content.match(/③\s*(.*?)(?=\n\n|$)/s)
        ];
        return matches.map(m => m ? m[1].trim() : null).filter(Boolean) as string[];
    }, [content]);

    const [answers, setAnswers] = useState<string[]>(["", "", ""]);
    const [feedbacks, setFeedbacks] = useState<{status: 'correct'|'incorrect'|null, msg: string}[]>([
        {status: null, msg: ""}, {status: null, msg: ""}, {status: null, msg: ""}
    ]);
    const [loadingIndices, setLoadingIndices] = useState<number[]>([]);

    const handleCheck = async (index: number) => {
        if (!answers[index].trim()) return;
        
        setLoadingIndices(prev => [...prev, index]);
        try {
            const result = await evaluateQuizAnswer(questions[index], answers[index], subject);
            const newFeedbacks = [...feedbacks];
            newFeedbacks[index] = {
                status: result.isCorrect ? 'correct' : 'incorrect',
                msg: result.feedback
            };
            setFeedbacks(newFeedbacks);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingIndices(prev => prev.filter(i => i !== index));
        }
    };

    if (questions.length === 0) return <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { strict: false }]]}>{content}</Markdown>;

    return (
        <div className="flex flex-col gap-6">
            {questions.map((q, i) => (
                <div key={i} className="bg-background-dark/40 rounded-xl p-5 border border-white/5">
                    <div className="flex gap-3 mb-3">
                         <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                             {i + 1}
                         </div>
                         <div className="text-slate-200 font-medium"><Markdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { strict: false }]]}>{q}</Markdown></div>
                    </div>
                    
                    <div className="pl-9">
                        <div className="flex gap-2 mb-2">
                            <input 
                                type="text" 
                                value={answers[i]}
                                onChange={(e) => {
                                    const newAns = [...answers];
                                    newAns[i] = e.target.value;
                                    setAnswers(newAns);
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleCheck(i)}
                                placeholder="Type your answer..."
                                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                            />
                            <button 
                                onClick={() => handleCheck(i)}
                                disabled={loadingIndices.includes(i) || !answers[i]}
                                className="px-4 py-2 bg-white/5 hover:bg-primary hover:text-white rounded-lg text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
                            >
                                {loadingIndices.includes(i) ? 'Checking...' : 'Check'}
                            </button>
                        </div>
                        
                        {feedbacks[i].status && (
                             <div className={`text-sm p-3 rounded-lg border ${feedbacks[i].status === 'correct' ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-red-500/10 border-red-500/20 text-red-300'} animate-fade-in`}>
                                 <strong className="block mb-1">{feedbacks[i].status === 'correct' ? 'Correct!' : 'Not quite right.'}</strong>
                                 {feedbacks[i].msg}
                             </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- Interactive Worked Example Component ---
const InteractiveWorkedExample: React.FC<{ content: string; context: any }> = ({ content, context }) => {
    const [isInteractive, setIsInteractive] = useState(false);
    const [explanation, setExplanation] = useState<{idx: number, text: string} | null>(null);
    const [loadingIdx, setLoadingIdx] = useState<number | null>(null);

    // Robust Split using the new Marker
    const splitMarker = "**Derivation:**";
    const hasMarker = content.includes(splitMarker);
    
    let comparisonBlock = content;
    let stepsBlock = "";

    if (hasMarker) {
        const parts = content.split(splitMarker);
        comparisonBlock = parts[0].trim();
        stepsBlock = parts[1].trim();
    } else {
        // Fallback split if marker missing
        const parts = content.split(/\n\n(?=\d+\.|Step)/);
        comparisonBlock = parts[0]; 
        stepsBlock = parts.slice(1).join("\n\n") || content.replace(comparisonBlock, "");
    }
    
    const lines = stepsBlock.split('\n').filter(l => l.trim().length > 0);

    const handleExplain = async (line: string, idx: number) => {
        setLoadingIdx(idx);
        try {
            const expl = await explainWorkedExampleStep(line, context);
            setExplanation({ idx, text: expl });
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingIdx(null);
        }
    };

    // Helper to determine if a line is Math (Equation) or Text (Instruction)
    const isMathLine = (line: string) => {
        return line.includes('$$') || line.includes('=') || line.trim().startsWith('$');
    };

    return (
        <div className="space-y-6">
            <div className="prose prose-invert max-w-none">
                <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { strict: false }]]}>{comparisonBlock}</Markdown>
            </div>
            
            <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-bold text-lg">Step-by-Step Derivation</h4>
                    <button 
                        onClick={() => setIsInteractive(!isInteractive)}
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${isInteractive ? 'bg-primary text-white border-primary shadow-neon-focus' : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/30'}`}
                    >
                        {isInteractive ? "Interactive Mode ON" : "Enable Step-by-Step"}
                    </button>
                </div>

                <div className="space-y-4 text-sm bg-black/20 p-6 rounded-2xl border border-white/5">
                    {lines.map((line, i) => {
                        const isMath = isMathLine(line);
                        
                        if (!isMath) {
                            // Render Instruction Text cleanly
                            return (
                                <div key={i} className="text-slate-400 font-bold uppercase tracking-wide text-xs pt-2">
                                    <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { strict: false }]]}>{line}</Markdown>
                                </div>
                            );
                        }

                        // Render Math Block
                        return (
                            <div key={i} className="relative group/line">
                                <div className={`py-3 px-4 rounded-xl transition-all ${explanation?.idx === i ? 'bg-primary/10 border border-primary/30' : 'bg-white/5 border border-white/5 hover:border-white/20'}`}>
                                    <div className="text-base text-white font-medium flex justify-center">
                                         <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { strict: false }]]}>{line}</Markdown>
                                    </div>
                                </div>
                                
                                {isInteractive && (
                                    <button
                                        onClick={() => handleExplain(line, i)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/line:opacity-100 transition-opacity px-2 py-1 bg-primary text-white text-[10px] font-bold uppercase rounded shadow-lg hover:scale-105"
                                    >
                                        {loadingIdx === i ? '...' : 'Why?'}
                                    </button>
                                )}

                                {explanation?.idx === i && (
                                    <div className="mt-2 p-3 bg-blue-900/40 border border-blue-500/30 rounded-lg text-blue-100 text-xs animate-slide-up relative">
                                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-900/40 border-t border-l border-blue-500/30 rotate-45"></div>
                                        <span className="font-bold block mb-1 text-primary">Explanation:</span>
                                        {explanation.text}
                                        <button onClick={() => setExplanation(null)} className="absolute top-2 right-2 text-blue-400 hover:text-white">
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- Sub-component: AI Reasoning Log (Tech/Terminal Style) ---
const ReasoningLog: React.FC<{ content: string; onClose: () => void }> = ({ content, onClose }) => {
    const confidenceMatch = content.match(/\*\*Confidence Score:\*\*\s*(\d+)%/);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 0;
    const lines = content.split('\n').filter(l => l.trim().length > 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-2xl bg-[#0d1117] border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-slide-up">
                <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-400 text-sm">terminal</span>
                        <span className="text-slate-300 text-xs font-mono font-bold tracking-wide uppercase">Gemini 3 Pro // Reasoning Stream</span>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
                <div className="p-6 font-mono text-sm overflow-y-auto max-h-[70vh]">
                    <div className="mb-6 bg-[#0d1117] p-4 rounded-lg border border-slate-800">
                        <div className="flex justify-between text-xs text-slate-400 mb-2 uppercase tracking-wider font-bold">
                            <span>Analysis Confidence</span>
                            <span>{confidence}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-green-400" style={{ width: `${confidence}%` }}></div>
                        </div>
                    </div>
                    <div className="space-y-3 text-slate-300">
                        {lines.map((line, i) => (
                             <div key={i} className={line.includes('**') ? "flex gap-2" : line.trim().startsWith('-') ? "pl-6 text-green-300/90 border-l border-slate-800 ml-1" : "text-slate-500"}>
                                 {line}
                             </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- Section Card ---
const SectionCard: React.FC<{ 
    id: string;
    section: ParsedSection; 
    defaultOpen: boolean; 
    delay: number;
    extraContent?: React.ReactNode; 
    isPrintMode: boolean;
    replaceContent?: boolean;
}> = ({ id, section, defaultOpen, delay, extraContent, isPrintMode, replaceContent }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (isPrintMode) {
        return (
            <div id={id} className="flex flex-col rounded-xl bg-white border border-slate-300 mb-6 break-inside-avoid shadow-sm overflow-visible">
                <div className="flex items-center gap-4 p-5 border-b border-slate-200 bg-slate-100 rounded-t-xl">
                    <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${section.printColorClass} border border-slate-300 shrink-0`}>
                        <span className={`material-symbols-outlined text-xl ${section.printTextClass}`}>{section.icon}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{section.title}</h3>
                </div>
                <div className="p-6">
                    {!replaceContent && (
                        <div className="prose prose-slate prose-lg max-w-none"><Markdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { strict: false }]]}>{section.content}</Markdown></div>
                    )}
                    {/* Render extraContent directly if replacing, or append it if not */}
                    {(replaceContent || (section.title === "Concept Repair" && extraContent)) && (
                         <div className={replaceContent ? "" : "mt-6 pt-4 border-t border-slate-200"}>
                            {extraContent}
                         </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div 
            id={id}
            className="flex flex-col rounded-2xl bg-card-dark/40 backdrop-blur-md border border-white/5 transition-all duration-300 hover:bg-card-dark/50 hover:border-white/10 animate-slide-up shadow-sm scroll-mt-28"
            style={{ animationDelay: `${delay}ms` }}
        >
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="group flex items-center justify-between p-6 w-full text-left hover:bg-white/5 transition-colors focus:outline-none rounded-t-2xl"
            >
                <div className="flex items-center gap-5">
                    <div className={`flex items-center justify-center h-12 w-12 rounded-xl ${section.colorClass} bg-opacity-10 shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 border border-white/5`}>
                        <span className={`material-symbols-outlined text-2xl ${section.textColorClass}`}>{section.icon}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">{section.title}</h3>
                </div>
                <span className={`material-symbols-outlined text-slate-500 text-2xl transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            <div className={`${isOpen ? 'block' : 'hidden'} animate-fade-in`}>
                <div className="p-8 pt-2 border-t border-white/5">
                    {!replaceContent && (
                        <div className="prose prose-invert prose-lg max-w-none">
                            <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { strict: false }]]}>{section.content}</Markdown>
                        </div>
                    )}
                    {(replaceContent || extraContent) && (
                         <div className={replaceContent ? "animate-fade-in" : "mt-8 pt-6 border-t border-white/5 animate-fade-in"}>
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
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [activeSection, setActiveSection] = useState<string>("");
  const [showLogic, setShowLogic] = useState(false);
  const [showChat, setShowChat] = useState(false); // AI Chat Modal State
  
  const [diagramUrl, setDiagramUrl] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const { headline, sections, severity, score, reasoningLog } = useMemo(() => {
    if (!result) return { headline: "", sections: [], severity: "Unknown", score: 0, reasoningLog: "" };

    let contentToParse = result;
    let logicContent = "";
    
    // Extract Reasoning Log
    const logMatch = result.match(/### 7\. AI Reasoning Log([\s\S]*?)($|---)/);
    if (logMatch) {
        logicContent = logMatch[1].trim();
        contentToParse = contentToParse.replace(logMatch[0], "").trim();
    }
    
    // Extract Headline
    let headlineText = "";
    const headlineMatch = contentToParse.match(/^#\s*(.+)$/m);
    if (headlineMatch) {
        headlineText = headlineMatch[1].trim();
        contentToParse = contentToParse.replace(/^#\s*(.+)$/m, '').trim();
    }

    // ROBUST PARSING BY HEADER NAME (Prevents Duplication)
    const extractSection = (headerName: string) => {
        // Regex looks for "### [Number]. [HeaderName]" ... content ... until next "###" or end
        const regex = new RegExp(`###\\s*\\d+\\.\\s*${headerName}([\\s\\S]*?)(?=###|$)`, 'i');
        const match = contentToParse.match(regex);
        return match ? match[1].trim() : "";
    };

    const uiConfig = [
      { title: "What I Observed", icon: "visibility", color: "bg-blue-500", text: "text-blue-400", printColor: "bg-blue-100", printText: "text-blue-700" },
      { title: "Detected Misconceptions", icon: "error", color: "bg-red-500", text: "text-red-400", printColor: "bg-red-100", printText: "text-red-700" },
      { title: "Why This Misconception Happens", icon: "psychology", color: "bg-orange-500", text: "text-orange-400", printColor: "bg-orange-100", printText: "text-orange-700" },
      { title: "Concept Repair", icon: "healing", color: "bg-green-500", text: "text-green-400", printColor: "bg-green-100", printText: "text-green-700" },
      { title: "Worked Correct Example", icon: "check_circle", color: "bg-teal-500", text: "text-teal-400", printColor: "bg-teal-100", printText: "text-teal-700" },
      { title: "Check Yourself", icon: "quiz", color: "bg-purple-500", text: "text-purple-400", printColor: "bg-purple-100", printText: "text-purple-700" },
    ];

    const parsed: ParsedSection[] = uiConfig.map((config, idx) => {
        const content = extractSection(config.title);
        return {
            id: `section-${idx}`,
            title: config.title,
            content: content || "No content generated.",
            icon: config.icon,
            colorClass: config.color,
            textColorClass: config.text,
            printColorClass: config.printColor,
            printTextClass: config.printText
        };
    }).filter(s => s.content !== "No content generated."); // Only return found sections

    // Calculate Severity
    const misconceptionSection = parsed.find(p => p.title === "Detected Misconceptions");
    let severityLevel = "Mild";
    let calculatedScore = 30;
    if (misconceptionSection) {
        const bulletCount = (misconceptionSection.content.match(/[•-]/g) || []).length;
        if (bulletCount >= 3) { severityLevel = "Severe"; calculatedScore = 95; }
        else if (bulletCount >= 2) { severityLevel = "Moderate"; calculatedScore = 65; }
    }

    return { headline: headlineText, sections: parsed, severity: severityLevel, score: calculatedScore, reasoningLog: logicContent };
  }, [result]);

  useEffect(() => {
    if (sections.length > 0) setActiveSection(sections[0].id);
  }, [sections]);

  useEffect(() => {
      const timer = setTimeout(() => setAnimatedScore(score), 300);
      return () => clearTimeout(timer);
  }, [score]);

  // Diagram Gen
  useEffect(() => {
      const repairSection = sections.find(s => s.title === "Concept Repair");
      if (repairSection && genStatus === 'idle' && result && !diagramUrl) {
          setGenStatus('loading');
          generateConceptDiagram(repairSection.content)
              .then(url => { setDiagramUrl(url); setGenStatus('success'); })
              .catch(e => { console.error(e); setGenStatus('error'); });
      }
  }, [sections, genStatus, result]);

  const scrollToSection = (id: string) => {
      const element = document.getElementById(id);
      if (element) {
          const y = element.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
      }
  };

  const getSeverityStyle = (s: string) => {
      if (isCapturing) {
           switch(s) {
              case "Severe": return "bg-red-100 text-red-700 border-red-300";
              case "Moderate": return "bg-orange-100 text-orange-700 border-orange-300";
              default: return "bg-green-100 text-green-700 border-green-300";
          }
      }
      switch(s) {
          case "Severe": return "bg-red-500/10 text-red-300 border-red-500/20";
          case "Moderate": return "bg-orange-500/10 text-orange-300 border-orange-500/20";
          default: return "bg-green-500/10 text-green-300 border-green-500/20";
      }
  }

  const handleExport = async (type: 'png' | 'pdf') => {
      if (!reportContainerRef.current) return;
      const setDownloading = type === 'png' ? setIsSharing : setIsDownloadingPDF;
      setDownloading(true);
      setIsCapturing(true);
      
      // Allow DOM to update to print styles
      await new Promise(resolve => setTimeout(resolve, 800));
      
      try {
          const element = reportContainerRef.current;
          const canvas = await html2canvas(element, { 
              backgroundColor: '#ffffff', 
              scale: 2, 
              useCORS: true, 
              logging: false, 
              windowWidth: 1200 
          });
          
          if (type === 'png') {
              const link = document.createElement('a');
              link.href = canvas.toDataURL("image/png");
              link.download = `Report-${subject}.png`;
              link.click();
          } else {
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF('p', 'mm', 'a4');
              const pdfWidth = 210;
              const pdfHeight = 297;
              
              const imgProps = pdf.getImageProperties(imgData);
              const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
              
              let heightLeft = imgHeight;
              let position = 0;
              
              // First page
              pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
              heightLeft -= pdfHeight;
              
              // Subsequent pages
              while (heightLeft > 0) {
                  position -= pdfHeight; // Move image up by one page height
                  pdf.addPage();
                  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                  heightLeft -= pdfHeight;
              }
              
              pdf.save(`Report-${subject}.pdf`);
          }
      } catch (e) { console.error(e); } finally { setIsCapturing(false); setDownloading(false); }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center text-white">
      {showLogic && <ReasoningLog content={reasoningLog} onClose={() => setShowLogic(false)} />}
      
      {showChat && (
          <AIConceptChat 
            context={{
                subject,
                problem: headline, // Using headline as concise problem ref
                misconception: sections.find(s=>s.title==="Detected Misconceptions")?.content || "",
                repair: sections.find(s=>s.title==="Concept Repair")?.content || ""
            }} 
            onClose={() => setShowChat(false)} 
          />
      )}

      {!isCapturing && (
          <div className="sticky top-0 z-40 w-full bg-background-dark/70 backdrop-blur-xl border-b border-white/5 transition-all shadow-lg no-capture">
              <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="group p-2 -ml-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined transition-transform duration-300 group-hover:scale-110">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold leading-none">Diagnostic Report</h1>
                        <span className="text-sm text-slate-400 leading-none mt-1.5 font-medium">{subject}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {reasoningLog && (
                        <button onClick={() => setShowLogic(true)} className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wide hover:bg-indigo-500/20">
                            <span className="material-symbols-outlined text-sm">terminal</span> Logic
                        </button>
                    )}
                    <div className={`px-5 py-2 rounded-full border text-xs font-bold uppercase tracking-widest ${getSeverityStyle(severity)}`}>{severity} Issue</div>
                </div>
              </div>
          </div>
      )}

      <main className={`w-full max-w-6xl mx-auto p-4 sm:p-8 relative z-10 ${isCapturing ? 'bg-white text-slate-900 min-h-screen' : ''}`}>
        <div className={`grid gap-8 items-start ${!isCapturing ? 'lg:grid-cols-[240px_1fr]' : 'grid-cols-1'}`}>
            {!isCapturing && (
                <aside className="hidden lg:block sticky top-28 no-capture">
                    <nav className="flex flex-col gap-1 p-4 rounded-2xl bg-card-dark/20 backdrop-blur-sm border border-white/5">
                        <p className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Sections</p>
                        {sections.map(s => (
                            <button key={s.id} onClick={() => scrollToSection(s.id)} className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${activeSection === s.id ? "bg-primary/10 text-white border border-primary/20" : "text-slate-400 hover:text-slate-200"}`}>
                                <span className={`material-symbols-outlined text-lg ${activeSection === s.id ? 'text-primary' : ''}`}>{s.icon}</span>
                                <span className="text-sm font-medium truncate">{s.title}</span>
                            </button>
                        ))}
                    </nav>
                </aside>
            )}

            <div className="flex flex-col gap-6 w-full">
                <div ref={reportContainerRef} data-capture-target="true" className={`flex flex-col gap-5 rounded-xl ${isCapturing ? 'p-8 bg-white' : 'p-4 -m-4'}`}>
                    {headline && (
                        <div className={`rounded-xl p-6 mb-2 break-inside-avoid ${isCapturing ? 'bg-blue-50 border border-blue-100' : 'bg-gradient-to-r from-blue-900/30 to-background-dark border border-primary/20 shadow-glow-blue'}`}>
                             <h2 className={`text-xl font-bold mb-1 ${isCapturing ? 'text-blue-900' : 'text-blue-200'}`}>Root Misconception Identified</h2>
                             <p className={`text-lg leading-relaxed ${isCapturing ? 'text-slate-800' : 'text-white'}`}><Markdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { strict: false }]]}>{headline}</Markdown></p>
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
                            replaceContent={!isCapturing && (section.title === "Worked Correct Example" || section.title === "Check Yourself")}
                            extraContent={
                                section.title === "Concept Repair" ? (
                                    <div className="flex flex-col gap-4">
                                        <div className={`relative w-full rounded-2xl overflow-hidden mt-4 min-h-[200px] flex items-center justify-center ${isCapturing ? 'bg-slate-50 border border-slate-200' : 'bg-black/20 border border-white/10'}`}>
                                            {genStatus === 'loading' && !isCapturing && <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>}
                                            {genStatus === 'success' && diagramUrl && <img src={diagramUrl} alt="Diagram" className="w-full h-auto object-cover" />}
                                            {!isCapturing && !diagramUrl && genStatus !== 'loading' && <p className="text-slate-500 text-xs">Visual aid loading...</p>}
                                        </div>
                                        {!isCapturing && (
                                            <div className="flex justify-end">
                                                <button onClick={() => setShowChat(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-primary/30 transition-all hover:scale-105">
                                                    <span className="material-symbols-outlined">chat_bubble</span>
                                                    Still Confused? Ask AI
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : section.title === "Worked Correct Example" && !isCapturing ? (
                                    <InteractiveWorkedExample content={section.content} context={{subject, headline}} />
                                ) : section.title === "Check Yourself" && !isCapturing ? (
                                    <InteractiveQuiz content={section.content} subject={subject} />
                                ) : undefined
                            }
                        />
                    ))}
                </div>
                
                {/* Footer Actions */}
                {!isCapturing && (
                    <div className="flex flex-col sm:flex-row justify-center gap-4 mt-12 pb-10 no-capture print:hidden">
                        <button
                            onClick={() => handleExport('png')}
                            disabled={isSharing}
                            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-card-dark/40 border border-white/10 hover:bg-white/10 text-white font-bold transition-all hover:scale-105 disabled:opacity-50"
                        >
                            {isSharing ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">image</span>}
                            <span>{isSharing ? 'Generating...' : 'Save Image'}</span>
                        </button>
                        <button
                            onClick={() => handleExport('pdf')}
                            disabled={isDownloadingPDF}
                            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-card-dark/40 border border-white/10 hover:bg-white/10 text-white font-bold transition-all hover:scale-105 disabled:opacity-50"
                        >
                            {isDownloadingPDF ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">picture_as_pdf</span>}
                            <span>{isDownloadingPDF ? 'Generating...' : 'Save PDF'}</span>
                        </button>
                        <button
                            onClick={onNewProblem}
                            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105"
                        >
                            <span className="material-symbols-outlined">add_circle</span>
                            <span>New Diagnosis</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};
