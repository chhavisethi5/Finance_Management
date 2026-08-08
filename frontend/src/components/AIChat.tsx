import { useState, useRef, useEffect } from "react";
import { getAIChatResponse, getErrorMessage, updateRiskAppetite } from "../api";
import type { AIChatMessage } from "../api";
import { useAuth } from "../context/AuthContext";
import { Send, Bot, User as UserIcon, Sparkles } from "lucide-react";

// Helper to format simple markdown-like elements (bold and newlines) safely
function renderMessageContent(content: string) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-bold text-[#f1f5f9]">{part.slice(2, -2)}</strong>;
    }
    // Handle newlines
    const subParts = part.split("\n");
    return subParts.map((subPart, subIndex) => (
      <span key={`${index}-${subIndex}`}>
        {subPart}
        {subIndex < subParts.length - 1 && <br />}
      </span>
    ));
  });
}

export default function AIChat() {
  const { currentUser, login } = useAuth();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleUpdateRiskAppetite = async (level: "Low" | "Medium" | "High") => {
    if (!currentUser) return;
    try {
      await updateRiskAppetite(currentUser.id, level);
      login({ ...currentUser, risk_appetite: level });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update risk appetite."));
    }
  };

  const suggestionChips = [
    "Am I on track for my monthly savings target?",
    "Review my spending habits and flag areas of concern.",
    "Do I have enough liquid assets for my emergency fund?",
    "Give me advice on pacing my financial goals.",
  ];

  const handleSend = async (textToSend: string) => {
    if (!currentUser || !textToSend.trim() || loading) return;

    setError("");
    const userQuery = textToSend.trim();
    setInput("");

    // Append user message
    const newMessages: AIChatMessage[] = [...messages, { role: "user", content: userQuery }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const aiReply = await getAIChatResponse(currentUser.id, userQuery);
      setMessages([...newMessages, { role: "model", content: aiReply.response }]);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to connect with MoneyMap AI. Make sure GEMINI_API_KEY is configured."));
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex h-full w-full flex-col bg-[#0f1117]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2d3348] bg-[#10121a] px-8 py-4 shrink-0 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f8ef7] to-[#a78bfa] text-white shadow-glow">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#f1f5f9]">MoneyMap AI</h2>
            <p className="text-[10px] text-[#94a3b8] font-medium flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34d399] animate-pulse"></span>
              Personalized Financial Co-pilot
            </p>
          </div>
        </div>

        {/* Risk Appetite Selector */}
        <div className="flex items-center gap-2.5 text-xs">
          <span className="text-[#94a3b8] font-semibold">Risk Appetite:</span>
          <div className="flex rounded-lg border border-[#2d3348] bg-[#151827] p-0.5">
            {["Low", "Medium", "High"].map((level) => {
              const isActive = (currentUser?.risk_appetite || "Medium") === level;
              return (
                <button
                  key={level}
                  onClick={() => handleUpdateRiskAppetite(level as "Low" | "Medium" | "High")}
                  className={`rounded-md px-3 py-1 text-[11px] font-semibold transition-all ${
                    isActive
                      ? "bg-[#4f8ef7] text-white shadow"
                      : "text-[#64748b] hover:text-[#94a3b8]"
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Messages Log */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#252a3e] text-[#4f8ef7] mb-4">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-[#f1f5f9]">Welcome to MoneyMap AI!</h3>
              <p className="mt-2 text-xs text-[#94a3b8] leading-relaxed max-w-lg">
                I can analyze your budget plans, liquid cash reserves, recent expenses, and goals to provide personalized co-pilot advice. Try clicking on one of the quick suggestions below:
              </p>

              {/* Suggestions */}
              <div className="mt-8 w-full grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {suggestionChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    className="rounded-xl border border-[#2d3348] bg-[#252a3e]/30 px-4 py-3 text-left text-xs font-medium text-[#94a3b8] hover:border-[#4f8ef7]/40 hover:bg-[#252a3e] hover:text-[#f1f5f9] transition-all duration-200"
                  >
                    💡 {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={index}
                  className={`flex gap-4 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold ${
                      isUser
                        ? "bg-gradient-to-br from-[#4f8ef7] to-[#a78bfa] text-white"
                        : "bg-[#252a3e] border border-[#2d3348] text-[#4f8ef7]"
                    }`}
                  >
                    {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-gradient-to-br from-[#4f8ef7] to-[#6c63ff] text-white rounded-tr-none"
                        : "bg-[#252a3e] border border-[#2d3348] text-[#cbd5e1] rounded-tl-none"
                    }`}
                  >
                    {renderMessageContent(msg.content)}
                  </div>
                </div>
              );
            })
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex gap-4 max-w-[85%] mr-auto">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#252a3e] border border-[#2d3348] text-[#4f8ef7]">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-none bg-[#252a3e] border border-[#2d3348] px-4 py-3 shadow-sm flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#4f8ef7] animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="h-2 w-2 rounded-full bg-[#4f8ef7] animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="h-2 w-2 rounded-full bg-[#4f8ef7] animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              ⚠️ {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Action Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="border-t border-[#2d3348] bg-[#10121a] px-8 py-5 shrink-0"
      >
        <div className="max-w-3xl mx-auto w-full space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask MoneyMap AI about your budgets, goals, spending habits..."
              className="flex-1 bg-transparent py-3 text-sm text-[#f1f5f9] placeholder-[#475569] outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f8ef7] to-[#6c63ff] text-white shadow-lg shadow-[#4f8ef7]/15 hover:opacity-90 active:scale-95 transition-all disabled:pointer-events-none disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-center text-[#64748b] leading-relaxed">
            Disclaimer: MoneyMap AI provides general insights based on your portfolio data and is not professional financial advice.
          </p>
        </div>
      </form>
    </div>
  );
}
