import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Code2,
  ChevronDown,
  ChevronUp,
  Bot,
  Lightbulb,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

// AI Insights Component
export default function AIInsightsCard({ ai }) {
  const [showAll, setShowAll] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  
  if (!ai || !ai.insights) return null;

  const findings = ai.insights.findings || [];
  
  // Sort findings by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const sortedFindings = [...findings].sort((a, b) => {
    const severityA = (a.severity || "medium").toLowerCase();
    const severityB = (b.severity || "medium").toLowerCase();
    return (severityOrder[severityA] ?? 2) - (severityOrder[severityB] ?? 2);
  });
  
  // Filter by selected severity
  const filteredFindings = selectedSeverity === "all" 
    ? sortedFindings 
    : sortedFindings.filter(f => (f.severity || "medium").toLowerCase() === selectedSeverity);
  
  const displayedFindings = showAll ? filteredFindings : filteredFindings.slice(0, 3);
  const hasMore = !showAll && filteredFindings.length > 3;
  
  // Count findings by severity
  const severityCounts = findings.reduce((acc, f) => {
    const sev = (f.severity || "medium").toLowerCase();
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-[#83C5BE]/30 p-8 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#006D77] rounded-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-[#006D77]">
            AI Insights
          </h3>
        </div>
        {ai.model && (
          <span className="text-xs text-[#006D77] border border-[#83C5BE] px-3 py-1.5 rounded-full bg-[#EDF6F9]">
            {ai.model}
          </span>
        )}
      </div>

      {ai.insights.summary && (
        <div className="mt-3 mb-6 flex items-start gap-3 p-4 bg-[#EDF6F9] rounded-xl border border-[#83C5BE]/30">
          <Lightbulb className="w-5 h-5 mt-0.5 text-[#006D77]" />
          <p className="text-[#006D77] leading-relaxed">{ai.insights.summary}</p>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedSeverity("all")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            selectedSeverity === "all"
              ? "bg-[#006D77] text-white"
              : "bg-[#EDF6F9] text-[#006D77] hover:bg-[#83C5BE]/20"
          }`}
        >
          All ({findings.length})
        </button>
        {severityCounts.critical > 0 && (
          <button
            onClick={() => setSelectedSeverity("critical")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedSeverity === "critical"
                ? "bg-red-600 text-white"
                : "bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            Critical ({severityCounts.critical})
          </button>
        )}
        {severityCounts.high > 0 && (
          <button
            onClick={() => setSelectedSeverity("high")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedSeverity === "high"
                ? "bg-[#E29578] text-white"
                : "bg-orange-50 text-[#E29578] hover:bg-orange-100"
            }`}
          >
            High ({severityCounts.high})
          </button>
        )}
        {severityCounts.medium > 0 && (
          <button
            onClick={() => setSelectedSeverity("medium")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedSeverity === "medium"
                ? "bg-[#83C5BE] text-white"
                : "bg-teal-50 text-[#83C5BE] hover:bg-teal-100"
            }`}
          >
            Medium ({severityCounts.medium})
          </button>
        )}
        {severityCounts.low > 0 && (
          <button
            onClick={() => setSelectedSeverity("low")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedSeverity === "low"
                ? "bg-blue-500 text-white"
                : "bg-blue-50 text-blue-500 hover:bg-blue-100"
            }`}
          >
            Low ({severityCounts.low})
          </button>
        )}
        {severityCounts.info > 0 && (
          <button
            onClick={() => setSelectedSeverity("info")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedSeverity === "info"
                ? "bg-gray-500 text-white"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            Info ({severityCounts.info})
          </button>
        )}
      </div>

      {ai ? (
        <>
          <div className="space-y-4">
            {displayedFindings.map((f, i) => (
              <div
                key={i}
                className="bg-white border border-[#83C5BE]/40 rounded-xl p-5 hover:border-[#83C5BE] transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-[#83C5BE]" />
                  <div className="font-semibold text-[#006D77] text-lg">
                    {f.title}
                  </div>
                </div>
                <div className="text-xs mb-3 flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full font-medium ${
                    (f.severity || "medium").toLowerCase() === "critical"
                      ? "bg-red-600 text-white"
                      : (f.severity || "medium").toLowerCase() === "high"
                      ? "bg-[#E29578] text-white"
                      : (f.severity || "medium").toLowerCase() === "medium"
                      ? "bg-[#83C5BE] text-white"
                      : (f.severity || "medium").toLowerCase() === "low"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-500 text-white"
                  }`}>
                    {(f.severity || "medium").toUpperCase()}
                  </span>
                  {typeof f.line === "number" && (
                    <span className="px-3 py-1 rounded-full bg-[#EDF6F9] text-[#006D77] border border-[#83C5BE]/30">
                      Line {f.line}
                    </span>
                  )}
                </div>
                {f.why && (
                  <div className="text-[#006D77] mb-3 leading-relaxed">
                    <span className="font-medium">Why: </span>
                    {f.why}
                  </div>
                )}
                {Array.isArray(f.fix_steps) && f.fix_steps.length > 0 && (
                  <div className="text-[#006D77]">
                    <div className="font-medium mb-2">
                      Suggested steps:
                    </div>
                    <ol className="list-decimal ml-6 space-y-2 leading-relaxed">
                      {f.fix_steps.map((s, idx) => (
                        <li key={idx} className="text-[#006D77]/90">{s}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => setShowAll(showAll => !showAll)}
              className="mt-6 w-full px-6 py-3 bg-[#006D77] hover:bg-[#006D77]/90 text-white rounded-xl transition-all border border-[#006D77] flex items-center justify-center gap-2 font-medium"
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-5 h-5" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-5 h-5" />
                  Show All ({filteredFindings.length} total)
                </>
              )}
            </button>
          )}
        </>
      ) : (
        <div className="text-[#006D77] text-center py-8 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          No critical issues found
        </div>
      )}

      <div className="text-xs text-[#006D77]/70 mt-6 p-3 bg-[#EDF6F9] rounded-xl">
        <span className="font-medium">Note:</span> AI provides <b>advice only</b>—no patched code is shown by design.
      </div>
    </div>
  );
}