import { ArrowLeft } from "lucide-react";
import { getChatGPTUser, chatGPTSignInPath, chatGPTSignOutPath } from "../chatgpt-auth";
import LedgerClient, { type LedgerUser } from "../ledger-client";
import { ReturnToGardenLink } from "@/components/garden-navigation";

export const dynamic = "force-dynamic";

export default async function RegulationsPage() {
  const user = await getChatGPTUser();
  const ledgerUser: LedgerUser | null = user ? { displayName: user.displayName, email: user.email, signOutHref: chatGPTSignOutPath("/regulations") } : null;
  return <main className="min-h-screen bg-[#f6f8fb] text-slate-950"><header className="border-b border-slate-200/80 bg-[#10213d] text-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 lg:px-10"><ReturnToGardenLink className="inline-flex items-center gap-2 text-sm text-slate-200 hover:text-white"><ArrowLeft className="size-4" />wjc的韭菜花园</ReturnToGardenLink>{ledgerUser ? <a href={ledgerUser.signOutHref} className="rounded-lg border border-white/20 px-3 py-2 text-sm">{ledgerUser.displayName} · 退出</a> : <a href={chatGPTSignInPath("/regulations")} target="_top" className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#10213d]">登录管理</a>}</div></header><LedgerClient user={ledgerUser} /><footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-7 text-xs text-slate-500 lg:px-10"><span>法规工作站 · wjc的韭菜花园</span><span>当前数据需要以官方发布页面为最终依据</span></div></footer></main>;
}
