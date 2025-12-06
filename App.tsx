import React, { useState } from "react";
import { LandingPage } from "./components/LandingPage";
import { DiagnosticForm } from "./components/DiagnosticForm";
import { DiagnosticReport } from "./components/DiagnosticReport";
import { HistoryPage } from "./components/HistoryPage";
import { Subject } from "./types";
import { saveHistoryItem } from "./services/historyService";

type Screen = "landing" | "form" | "report" | "history";

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>("landing");
  const [subject, setSubject] = useState<string>(Subject.MATHS); 
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const handleAnalysisComplete = (result: string, problem: string) => {
    setAnalysisResult(result);
    // Save to history automatically
    saveHistoryItem({
        subject,
        result,
        problemSnippet: problem
    });
    setScreen("report");
  };

  return (
    <div className="min-h-screen w-full bg-background-dark text-white font-display overflow-x-hidden relative selection:bg-primary/30">
      
      {/* Global Background Gradient Blob - Adds depth for glass panels */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
         <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-blue-900/20 rounded-full blur-[120px] opacity-40 animate-pulse" style={{ animationDuration: '8s' }}></div>
         <div className="absolute top-[30%] -right-[10%] w-[50%] h-[60%] bg-indigo-900/20 rounded-full blur-[100px] opacity-30"></div>
         <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[100px] opacity-20"></div>
      </div>

      {screen === "landing" && (
        <LandingPage
          onSelectSubject={(s) => setSubject(s)}
          selectedSubject={subject}
          onStart={() => setScreen("form")}
          onOpenHistory={() => setScreen("history")}
        />
      )}

      {screen === "history" && (
          <HistoryPage 
            onBack={() => setScreen("landing")}
            onSelectHistoryItem={(item) => {
                setSubject(item.subject);
                setAnalysisResult(item.result);
                setScreen("report");
            }}
          />
      )}

      {screen === "form" && (
        <DiagnosticForm
          subject={subject}
          onAnalysisComplete={handleAnalysisComplete}
          onBack={() => setScreen("landing")}
        />
      )}

      {screen === "report" && (
        <DiagnosticReport
          subject={subject}
          result={analysisResult}
          onBack={() => setScreen("form")}
          onNewProblem={() => {
            setAnalysisResult(null);
            setScreen("landing");
          }}
        />
      )}
    </div>
  );
};

export default App;
