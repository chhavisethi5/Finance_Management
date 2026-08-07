import AIChat from "../components/AIChat";
import { Sparkles } from "lucide-react";

export default function AIAdvisorPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#f1f5f9] flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#a78bfa]" />
            AI Advisor
          </h1>
          <p className="text-xs text-[#94a3b8]">
            Get real-time answers and smart strategies based on your unique financial status, budget limits, and savings goals.
          </p>
        </div>
      </div>

      {/* Chat View */}
      <AIChat />
    </div>
  );
}
