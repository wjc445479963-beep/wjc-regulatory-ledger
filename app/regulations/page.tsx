import { ArrowLeft } from "lucide-react";
import LedgerClient from "../ledger-client";
import { ReturnToGardenLink } from "@/components/garden-navigation";

export default function RegulationsPage() {
  return <main className="min-h-screen bg-[#f6f8fb] text-slate-950"><header className="border-b border-slate-200/80 bg-[#10213d] text-white"><div className="mx-auto flex max-w-[1440px] items-center px-6 py-5 lg:px-10"><ReturnToGardenLink className="inline-flex items-center gap-2 text-sm text-slate-200 hover:text-white"><ArrowLeft className="size-4" />wjc的韭菜花园</ReturnToGardenLink></div></header><LedgerClient /><footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-7 text-xs text-slate-500 lg:px-10"><span>法规工作站 · wjc的韭菜花园</span><span>当前数据需要以官方发布页面为最终依据</span></div></footer></main>;
}
