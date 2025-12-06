import React, { useState, useRef, useEffect } from "react";
import { Subject } from "../types";
import { analyseMisconception, extractHandwriting, verifySubjectContent } from "../services/geminiService";

interface DiagnosticFormProps {
  subject: string;
  onAnalysisComplete: (result: string, problem: string) => void;
  onBack: () => void;
}

// Sub-component for form progress tracking
const FormTracker: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = [
        { id: 1, label: "Problem", icon: "help" },
        { id: 2, label: "Reasoning", icon: "psychology" },
        { id: 3, label: "Analysis", icon: "analytics" },
    ];

    return (
        <div className="hidden lg:flex flex-col gap-8 sticky top-32 h-fit w-32 animate-fade-in">
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-white/10"></div>
            {steps.map((step) => {
                const isActive = currentStep >= step.id;
                const isCurrent = currentStep === step.id;
                
                return (
                    <div key={step.id} className="relative flex items-center gap-4 group">
                         <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-500 ${isActive ? 'bg-primary border-primary text-white shadow-neon-focus' : 'bg-background-dark border-slate-600 text-slate-600'}`}>
                             {isActive ? (
                                 <span className="material-symbols-outlined text-sm">check</span>
                             ) : (
                                 <span className="text-xs font-bold">{step.id}</span>
                             )}
                         </div>
                         <span className={`text-sm font-bold tracking-wide transition-colors duration-300 ${isCurrent ? 'text-white' : isActive ? 'text-slate-300' : 'text-slate-600'}`}>
                             {step.label}
                         </span>
                    </div>
                );
            })}
        </div>
    );
};

export const DiagnosticForm: React.FC<DiagnosticFormProps> = ({
  subject: initialSubject,
  onAnalysisComplete,
  onBack,
}) => {
  const [subject, setSubject] = useState<string>(initialSubject);
  const [problem, setProblem] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedContent, setDetectedContent] = useState<'MATH' | 'CODE' | null>(null);
  const [isKidFriendly, setIsKidFriendly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync prop changes if they occur
  useEffect(() => {
    setSubject(initialSubject);
  }, [initialSubject]);

  const currentStep = isLoading ? 3 : (reasoning.length > 10 ? 2 : 1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImage(base64);
        
        // Trigger OCR
        setIsScanning(true);
        setDetectedContent(null);
        try {
            const extractedText = await extractHandwriting(base64);
            if (extractedText) {
                setReasoning(prev => {
                    const newText = prev ? `${prev}\n\n--- Extracted from Image ---\n${extractedText}` : extractedText;
                    return newText;
                });
                
                // Smart content verification
                try {
                    const verification = await verifySubjectContent(subject, extractedText);
                    
                    if (subject === 'Computer Science') {
                        setDetectedContent('CODE');
                    } else if (verification.contains_math_symbols) {
                        setDetectedContent('MATH');
                    } else {
                        setDetectedContent(null);
                    }
                } catch (e) {
                    // Fail silently and don't show badge if verify fails
                    setDetectedContent(null);
                }
            }
        } catch (error) {
            console.error("OCR Failed", error);
        } finally {
            setIsScanning(false);
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  const loadDemo = (type: "Maths" | "CS") => {
    if (type === "Maths") {
      setSubject(Subject.MATHS);
      setProblem("Solve 3(2x – 5) = 2(x + 7)");
      setReasoning(
        "1. 3(2x − 5) = 6x − 5\n2. 2(x + 7) = 2x + 7\n3. So equation becomes:\n   6x − 5 = 2x + 7\n4. Move the 2x to the left:\n   6x − 2x = 7\n5. Move the −5 to the right:\n   7 + 5 = 7\n6. Therefore 4x = 7\n7. So x = 7 ÷ 4 = 2"
      );
    } else {
      setSubject(Subject.CS);
      setProblem("Write Python code that returns the sum of numbers from 1 to n.");
      setReasoning(
        "def sum_to_n(n):\n    total = 0\n    for i in range(1, n):   # I think this loops from 1 to n\n        total = total + i\n    return total"
      );
    }
  };

  const handleSubmit = async () => {
    if (!problem.trim() && !image) {
      alert("Please enter a problem statement or upload an image.");
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await analyseMisconception({
        subject,
        problem,
        reasoning,
        imageBase64: image || undefined,
        isKidFriendly
      });
      // Pass both result and problem text back for history
      onAnalysisComplete(result, problem || "Image based problem");
    } catch (error) {
      console.error(error);
      alert("Error diagnosing misconception. Please check API key.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden p-4 md:p-6 text-white">
      
      {/* Top App Bar */}
      <div className="flex items-center justify-between py-6 mb-4 max-w-5xl mx-auto w-full animate-fade-in relative z-10">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="group p-3 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/5 transition-colors text-slate-300 hover:text-white focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-neon-focus"
        >
          <span className="material-symbols-outlined transition-transform duration-300 group-hover:scale-110">arrow_back</span>
        </button>
        <h1 className="text-white text-xl font-bold tracking-tight text-center drop-shadow-md">
          Diagnostic Form
        </h1>
        <div className="w-12"></div> 
      </div>

      <div className="flex max-w-5xl mx-auto w-full gap-8">
        {/* Progress Tracker (Desktop Side) */}
        <FormTracker currentStep={currentStep} />

        {/* Main Content Card */}
        <div className="relative flex-1 rounded-3xl bg-card-dark/50 backdrop-blur-md border border-white/10 p-8 md:p-10 shadow-glow-card animate-fade-in mb-10 z-10">
            
            {isLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl bg-background-dark/80 backdrop-blur-lg animate-fade-in border border-white/10">
                    <div className="relative h-20 w-20 mb-6">
                        <div className="absolute inset-0 rounded-full border-[6px] border-slate-700/50"></div>
                        <div className="absolute inset-0 rounded-full border-[6px] border-primary border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-xl font-bold text-white animate-pulse tracking-tight">Analysing reasoning...</p>
                    <p className="text-base text-slate-400 mt-2 font-medium">Connecting to Gemini 3 Pro</p>
                    {isKidFriendly && <p className="text-sm text-blue-300 mt-1 font-bold animate-fade-in">✨ Kid-Friendly Mode Active</p>}
                </div>
            )}

            <div className="flex flex-col gap-10">
            
            {/* Header & Demo Buttons */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-8 animate-slide-up" style={{ animationDelay: '0ms' }}>
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">New Diagnosis</h2>
                    <p className="text-slate-300 text-base mt-2 leading-relaxed max-w-md">Provide the problem and student's attempt to identify misconceptions.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={() => loadDemo('Maths')} className="px-4 py-2 rounded-lg border border-slate-600/50 bg-slate-800/30 text-xs font-bold uppercase tracking-wide text-blue-300 hover:bg-slate-700/50 hover:border-blue-400/50 transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-neon-focus backdrop-blur-sm">
                        Load Maths Demo
                    </button>
                    <button onClick={() => loadDemo('CS')} className="px-4 py-2 rounded-lg border border-slate-600/50 bg-slate-800/30 text-xs font-bold uppercase tracking-wide text-purple-300 hover:bg-slate-700/50 hover:border-purple-400/50 transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-neon-focus backdrop-blur-sm">
                        Load CS Demo
                    </button>
                </div>
            </div>

            {/* Subject Selection & Kid-Friendly Toggle */}
            <div className="flex flex-col md:flex-row gap-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
                <div className="flex-1 flex flex-col gap-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Subject
                    </label>
                    <div className="relative">
                    <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-background-dark/50 backdrop-blur-sm text-white p-5 appearance-none transition-all hover:border-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:shadow-neon-focus text-lg"
                    >
                        {Object.values(Subject).map((s) => (
                        <option key={s} value={s} className="bg-background-dark">
                            {s}
                        </option>
                        ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <span className="material-symbols-outlined">expand_more</span>
                    </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 md:w-auto">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Explanation Style
                    </label>
                    <div 
                        onClick={() => setIsKidFriendly(!isKidFriendly)}
                        className="flex items-center gap-4 p-4 h-[68px] rounded-2xl border border-white/10 bg-background-dark/50 backdrop-blur-sm cursor-pointer hover:border-white/20 transition-all group focus-within:ring-1 focus-within:ring-primary focus-within:shadow-neon-focus"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsKidFriendly(!isKidFriendly)}
                    >
                        <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isKidFriendly ? 'bg-primary shadow-neon-focus' : 'bg-slate-700'}`}>
                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${isKidFriendly ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                        <span className={`font-bold transition-colors select-none ${isKidFriendly ? 'text-primary' : 'text-slate-400'}`}>
                            {isKidFriendly ? "Kid-Friendly" : "Standard"}
                        </span>
                        {isKidFriendly && <span className="material-symbols-outlined text-primary animate-fade-in">child_care</span>}
                    </div>
                </div>
            </div>

            {/* Problem Statement */}
            <div className="flex flex-col gap-3 animate-slide-up" style={{ animationDelay: '200ms' }}>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                Problem Statement
                </label>
                <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-background-dark/50 backdrop-blur-sm text-white p-5 h-36 placeholder:text-slate-500 resize-none transition-all hover:border-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:shadow-neon-focus text-base leading-relaxed"
                placeholder="Paste the original question here..."
                />
            </div>

            {/* Reasoning */}
            <div className="flex flex-col gap-3 animate-slide-up" style={{ animationDelay: '300ms' }}>
                <div className="flex justify-between items-center pr-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Student Reasoning
                    </label>
                    {detectedContent === 'MATH' && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider animate-fade-in">
                            <span className="material-symbols-outlined text-sm">function</span>
                            Math Detected
                        </span>
                    )}
                    {detectedContent === 'CODE' && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider animate-fade-in">
                            <span className="material-symbols-outlined text-sm">code</span>
                            Code Detected
                        </span>
                    )}
                </div>
                <textarea
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                className={`w-full rounded-2xl border border-white/10 bg-background-dark/50 backdrop-blur-sm text-white p-5 h-52 placeholder:text-slate-500 font-mono text-sm resize-none transition-all hover:border-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:shadow-neon-focus leading-relaxed ${isScanning ? 'animate-pulse' : ''}`}
                placeholder="Type or paste the student’s steps, thoughts, or partial solution here..."
                />
            </div>

            {/* Upload Area */}
            <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-3 block">
                    Work Screenshot (Optional)
                </label>
                <div
                    onClick={() => !isScanning && fileInputRef.current?.click()}
                    tabIndex={0}
                    onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        if (!isScanning) fileInputRef.current?.click();
                    }
                    }}
                    className={`flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-white/10 bg-slate-800/10 backdrop-blur-sm px-8 py-10 text-center cursor-pointer hover:bg-slate-800/30 hover:border-primary/50 transition-all group focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:shadow-neon-focus ${isScanning ? 'pointer-events-none opacity-80' : ''}`}
                >
                    <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isScanning}
                    />
                    {image ? (
                    <div className="relative group/image w-full flex justify-center">
                        <img
                        src={image}
                        alt="Uploaded work"
                        className="max-h-72 rounded-xl shadow-2xl border border-white/10"
                        />
                        
                        {isScanning && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center animate-fade-in z-20">
                                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-3"></div>
                                <p className="text-primary font-bold tracking-wide">Scanning Handwriting...</p>
                            </div>
                        )}
                        
                        {!isScanning && (
                            <>
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center rounded-xl pointer-events-none">
                                    <span className="text-white text-base font-bold bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">Change Image</span>
                                </div>
                                <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setImage(null);
                                    setDetectedContent(null);
                                }}
                                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 shadow-lg hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-white border-2 border-card-dark z-30"
                                >
                                <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </>
                        )}
                    </div>
                    ) : (
                    <>
                        <div className="h-16 w-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                            <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-primary transition-colors">
                            add_a_photo
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-slate-200 text-lg font-bold">
                            Upload handwritten work
                            </p>
                            <p className="text-slate-400 text-sm">Supports JPEG, PNG, WEBP</p>
                        </div>
                    </>
                    )}
                </div>
            </div>

            {/* Action Button */}
            <div className="pt-4 animate-slide-up" style={{ animationDelay: '500ms' }}>
                <button
                onClick={handleSubmit}
                disabled={isLoading || isScanning}
                className="group relative flex h-16 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-blue-600 text-white text-xl font-bold shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-neon-focus border border-white/10"
                >
                    <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
                    <span className="relative flex items-center gap-3">
                        <span className="material-symbols-outlined text-3xl transition-transform duration-300 group-hover:scale-110">analytics</span>
                        Analyse My Solution
                    </span>
                </button>
            </div>
            </div>
        </div>
      </div>
    </div>
  );
};