"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Headphones, LockKeyhole, Music2, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const hiddenDoors = [
  { title: "第一扇门", description: "一处只留给熟悉这座花园的人声音档案。", href: "https://music.163.com/#/song?id=493289403&market=baiduqk", icon: Music2, tone: "bg-rose-300/15 text-rose-200" },
  { title: "第二扇门", description: "另一处隐藏入口，打开前请保持一点好奇心。", href: "https://c6.y.qq.com/base/fcgi-bin/u?__=gmxc6Sxb9deP", icon: Headphones, tone: "bg-cyan-300/15 text-cyan-200" },
];

export default function SecretGardenPage() {
  const [answer, setAnswer] = useState("");
  const [entered, setEntered] = useState(false);
  const [error, setError] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = answer.trim().replace(/\s/g, "").toLowerCase();
    if (["wjc666", "666"].includes(normalized)) { setEntered(true); setError(false); } else setError(true);
  }

  return <main className="min-h-screen bg-[#10172c] text-white"><header className="border-b border-white/10 bg-[#10172c] px-6 py-5"><div className="mx-auto max-w-[1080px]"><Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft className="size-4" />返回 wjc的韭菜花园</Link></div></header><div className="mx-auto max-w-[1080px] px-6 py-12 lg:py-16"><section className="relative overflow-hidden rounded-3xl border border-indigo-300/20 bg-gradient-to-br from-[#202958] via-[#24224b] to-[#17233d] p-8 shadow-2xl md:p-12"><div className="absolute -right-16 -top-16 size-48 rounded-full bg-fuchsia-400/15 blur-3xl" /><div className="absolute -bottom-20 left-20 size-56 rounded-full bg-cyan-300/10 blur-3xl" /><div className="relative max-w-2xl"><div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-indigo-200"><LockKeyhole className="size-6" /></div><p className="mt-7 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200">A hidden corner</p><h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">秘密花园</h1><p className="mt-5 text-base leading-8 text-slate-300">有些东西不必写在门牌上。先回答一个只属于这座花园的小问题，试试看能不能找到入口。</p>{!entered ? <form onSubmit={handleSubmit} className="mt-8 max-w-md rounded-2xl border border-white/10 bg-black/15 p-5"><label htmlFor="garden-answer" className="text-sm font-medium text-white">问题：这座花园的口令是什么？</label><div className="mt-4 flex gap-2"><Input id="garden-answer" value={answer} onChange={(event) => { setAnswer(event.target.value); setError(false); }} placeholder="输入口令" autoComplete="off" className="border-white/15 bg-white/10 text-white placeholder:text-slate-400" /><Button type="submit" className="bg-indigo-500 text-white hover:bg-indigo-400">推门</Button></div>{error && <p className="mt-3 text-sm text-rose-300">门没有打开，再试一次。</p>}<p className="mt-3 text-xs text-slate-400">提示：它藏在花园门牌里。</p></form> : <div className="mt-8 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5"><div className="flex items-center gap-2 text-emerald-200"><Sparkles className="size-4" />门已经打开</div><p className="mt-2 text-sm text-slate-300">欢迎进入这片私藏角落，下面是两扇隐藏的门。</p></div>}</div></section>{entered && <section className="mt-6 grid gap-4 md:grid-cols-2">{hiddenDoors.map(({ title, description, href, icon: Icon, tone }) => <a key={href} href={href} target="_blank" rel="noreferrer" className="group rounded-2xl border border-white/10 bg-white/[0.06] p-6 transition hover:-translate-y-1 hover:bg-white/[0.1]"><div className={`flex size-11 items-center justify-center rounded-xl ${tone}`}><Icon className="size-5" /></div><div className="mt-5 flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p></div><ArrowUpRight className="size-5 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" /></div><span className="mt-6 inline-flex rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300">打开隐藏入口</span></a>)}</section>}<p className="mt-7 text-xs leading-6 text-slate-500">这是趣味门禁，不是安全密码；真正的私密内容以后再增加独立权限。</p><Link href="/" className="mt-5 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">回到花园入口 <ArrowRight className="size-4" /></Link></div><footer className="border-t border-white/10 px-6 py-7 text-center text-xs text-slate-500">wjc的韭菜花园 · 秘密花园</footer></main>;
}
