import React, { useState, useEffect, useRef } from 'react';
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { askFollowUpQuestion } from '../services/geminiService';
import { ChatMessage } from '../types';

interface AIConceptChatProps {
    context: {
        subject: string;
        problem: string;
        misconception: string;
        repair: string;
    };
    onClose: () => void;
}

export const AIConceptChat: React.FC<AIConceptChatProps> = ({ context, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'ai', text: "Hi! I'm here to help. What part of this concept is still confusing for you?" }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (manualInput?: string) => {
        const textToSend = manualInput || input;
        if (!textToSend.trim()) return;

        const userMsg: ChatMessage = { role: 'user', text: textToSend };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        try {
            const response = await askFollowUpQuestion(context, textToSend);
            setMessages(prev => [...prev, { role: 'ai', text: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I'm having trouble connecting right now. Please try again." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const suggestions = [
        "Can you give me a real-world example?",
        "Why is my original answer wrong?",
        "How do I remember this rule?"
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-lg bg-card-dark border border-white/10 rounded-2xl shadow-2xl flex flex-col h-[600px] overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                             <span className="material-symbols-outlined text-primary">smart_toy</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-white leading-none">Misconception Tutor</h3>
                            <span className="text-xs text-green-400 font-medium">Online • Gemini 3 Pro</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background-dark/50" ref={scrollRef}>
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                msg.role === 'user' 
                                ? 'bg-primary text-white rounded-br-none' 
                                : 'bg-slate-700/50 text-slate-200 border border-white/5 rounded-bl-none'
                            }`}>
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <Markdown 
                                        remarkPlugins={[remarkMath]} 
                                        rehypePlugins={[[rehypeKatex, { strict: false }]]}
                                    >
                                        {msg.text}
                                    </Markdown>
                                </div>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-slate-700/50 rounded-2xl px-4 py-3 rounded-bl-none border border-white/5 flex gap-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Suggestions */}
                {messages.length < 3 && !isTyping && (
                    <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
                        {suggestions.map((s, i) => (
                            <button 
                                key={i}
                                onClick={() => handleSend(s)}
                                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary hover:bg-primary/20 transition-colors"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-white/10 bg-white/5">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask a follow-up question..."
                            className="flex-1 bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                        />
                        <button 
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isTyping}
                            className="p-3 bg-primary rounded-xl text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <span className="material-symbols-outlined">send</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};