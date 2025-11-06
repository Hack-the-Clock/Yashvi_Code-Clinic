import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Code2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Bot,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import AIInsightsCard from "./components/AiInsightCard.jsx";
const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:8080";

export default function App() {
  const [lang, setLang] = useState("python");
  const [code, setCode] = useState("");
  const [loading] = useState(false);
  const [error] = useState("");
  const [data] = useState(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [ai, setAi] = useState(null);

  const runAIReview = async () => {
    if (!code.trim()) return;
    setAiLoading(true);
    setAiError("");
    setAi(null);
    try {
      const res = await fetch(`${API_BASE}/ai_review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          code,
          issues: data?.result?.issues || [],
        }),
      });
      const json = await res.json();
      console.log("AI Review Response:", json);
      if (!res.ok) throw new Error(json.error || "AI review failed");
      setAi(json);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const exampleSnippets = {
    python: `def add(a,b):\n    # bad: no docstring, long line next\n    return a+b # TODO improve\n`,
    cpp: `#include <iostream>\nint main(){int   x=0; std::cout<<"hi"<<std::endl;return 0;}\n`,
    javascript: `function greet(name){console.log("hi, "+name)} greet("world")\n`,
    sql: `select  *  from users u
          join orders o on u.id=o.user_id
          where  u.status='active' and  o.total>100
          order by  o.created_at desc`,
    csharp: `using System;

class App
{
  static async System.Threading.Tasks.Task Main()
  {
    int x = 0;                  // CS0219: assigned but never used
    string? s = null;
    Console.WriteLine(s.ToString()); // CS8602: possible null dereference
    Foo();                       // CS0103: name does not exist
  }

  static async System.Threading.Tasks.Task DoThing() // CS1998: async without await
  {
  }
}
`,
  };

  const loadExample = () => setCode(exampleSnippets[lang] || "");

  return (
    <div className="min-h-screen bg-[#EDF6F9]">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="p-3 bg-[#006D77] rounded-xl">
              <Code2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-[#006D77]">Code Clinic</h1>
          </div>
          <p className="text-[#006D77]/70 text-lg max-w-2xl mx-auto">
            AI-powered code quality evaluator for maintainability & best
            practices
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#83C5BE]/30 p-8 mb-8">
          {/* Language Selector */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-8">
            <div className="flex items-center gap-4 flex-1">
              <label className="text-[#006D77] font-semibold">Language:</label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="bg-white text-[#006D77] border border-[#83C5BE] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#006D77] focus:border-transparent transition-all"
              >
                <option value="python">Python</option>
                <option value="cpp">C++</option>
                <option value="javascript">JavaScript</option>
                <option value="sql">SQL</option>
                <option value="csharp">C#</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button
              onClick={loadExample}
              className="cursor-pointer px-5 py-2 bg-[#83C5BE] hover:bg-[#83C5BE]/90 text-white rounded-lg transition-all font-medium"
            >
              Load Example
            </button>
          </div>

          {/* Code Editor */}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={`Paste your ${lang} code here...`}
            className="w-full h-72 bg-[#EDF6F9] text-[#006D77] border border-[#83C5BE]/40 rounded-xl p-6 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#006D77] focus:border-transparent resize-none transition-all placeholder-[#006D77]/40"
          />

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <button
              onClick={runAIReview}
              disabled={loading || !code.trim()}
              className="cursor-pointer w-full sm:w-auto px-8 py-3 bg-[#006D77] hover:bg-[#006D77]/90 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {aiLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Analyzing...
                </span>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Analyze Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-[#FFDDD2] border border-[#E29578] rounded-xl p-6 mb-8 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-[#E29578] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[#E29578] font-semibold">Error</p>
              <p className="text-[#E29578]/90 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* AI error */}
        {aiError && (
          <div className="bg-[#FFDDD2] border border-[#E29578] rounded-xl p-6 mb-8 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-[#E29578] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[#E29578] font-semibold">AI Review Error</p>
              <p className="text-[#E29578]/90 mt-1">{aiError}</p>
            </div>
          </div>
        )}

        {/* AI Insights Component */}
        <AIInsightsCard ai={ai} />
      </div>
    </div>
  );
}
