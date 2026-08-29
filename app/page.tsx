import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Gamepad2,
  Heart,
  Leaf,
  LockKeyhole,
  MoonStar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { GardenAnchorLink, HomeScrollRestorer, RememberGardenPositionLink } from "@/components/garden-navigation";
import { sitePath } from "@/lib/site-path";
import { SITE_VERSION } from "@/lib/site-version";

type Tone = "moss" | "sky" | "rose" | "violet";

const modules: Array<{
  href: string;
  title: string;
  eyebrow: string;
  description: string;
  icon: typeof BookOpenCheck;
  featured?: boolean;
  tone: Tone;
}> = [
  {
    href: "/regulations",
    title: "法规工作站",
    eyebrow: "主路",
    description: "公开法规、标准与版本变化，慢慢查清楚，放心往前走。",
    icon: BookOpenCheck,
    featured: true,
    tone: "moss",
  },
  {
    href: "/games",
    title: "轻松一下",
    eyebrow: "晒太阳的小空地",
    description: "工作间隙来玩一会儿，给脑子浇点水。",
    icon: Gamepad2,
    tone: "sky",
  },
  {
    href: "/pet",
    title: "宠物空间",
    eyebrow: "有小伙伴在",
    description: "小宠物在这里等你，偶尔路过，偶尔撒个娇。",
    icon: Heart,
    tone: "rose",
  },
  {
    href: "/secret-garden",
    title: "秘密花园",
    eyebrow: "篱笆后面",
    description: "绕过篱笆，看看藏在里面的小小惊喜。",
    icon: LockKeyhole,
    tone: "violet",
  },
];

const toneClasses: Record<Tone, string> = {
  moss: "bg-[#dcebc7] text-[#46734b]",
  sky: "bg-[#d9edf0] text-[#397080]",
  rose: "bg-[#f5dfd5] text-[#aa655c]",
  violet: "bg-[#e8e0ef] text-[#716184]",
};

export default function Home() {
  return (
    <main className="garden-page min-h-screen text-[#183b2d]">
      <HomeScrollRestorer />
      <header className="garden-header relative overflow-hidden text-[#f5f3e8]">
        <div className="garden-header-glow" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 lg:px-10">
          <Link href={sitePath("/")} className="group flex items-center gap-3" aria-label="返回花园首页">
            <div className="flex size-11 items-center justify-center rounded-[18px] bg-[#d8e9bd] text-[#315c3c] shadow-[0_8px_24px_rgba(8,33,20,0.2)] transition group-hover:-rotate-3">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="text-[15px] font-semibold tracking-wide">wjc的韭菜花园</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#b9cda9]">
                法规笔记 · 小小乐趣
              </div>
            </div>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-[#c1d1bb] md:flex" aria-label="花园导航">
            <GardenAnchorLink targetId="modules" className="transition hover:text-white">花园地图</GardenAnchorLink>
            <GardenAnchorLink targetId="about" className="transition hover:text-white">关于这里</GardenAnchorLink>
          </nav>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-[#abc39f]/30 bg-[#ffffff0b] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[#cfddc9]">
              欢迎来逛
            </span>
            <span className="relative -right-1 -top-1 font-serif text-[11px] italic font-medium tracking-[0.08em] text-[#b9cda9]" aria-label={`网站版本 ${SITE_VERSION}`}>
              {SITE_VERSION}
            </span>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-[1440px] px-6 pb-12 pt-8 lg:px-10 lg:pb-20 lg:pt-12">
        <div className="garden-vine garden-vine-top" aria-hidden="true">
          <Leaf className="size-7" />
          <Leaf className="size-5 rotate-45" />
          <Leaf className="size-8 -rotate-12" />
        </div>

        <section className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12">
          <div className="relative z-10 flex flex-col justify-center py-8 lg:py-12">
            <p className="garden-script mb-16 text-3xl text-[#70986a] md:mb-20 md:text-4xl">come in, stay awhile</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={sitePath("/regulations")}
                className="inline-flex items-center gap-2 rounded-full bg-[#376947] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(55,105,71,0.2)] transition hover:-translate-y-0.5 hover:bg-[#2e5b3c]"
              >
                进入法规工作站 <ArrowRight className="size-4" />
              </Link>
              <GardenAnchorLink
                targetId="modules"
                className="inline-flex items-center gap-2 rounded-full border border-[#b8d0ae] bg-[#f7f6ed]/80 px-5 py-3 text-sm font-semibold text-[#4d7252] transition hover:-translate-y-0.5 hover:border-[#7ea77a]"
              >
                逛逛花园 <Leaf className="size-4" />
              </GardenAnchorLink>
            </div>
            <div className="mt-9 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-[#789178]">
              <span className="garden-stamp"><Sparkles className="size-3.5" /> 安静的小角落</span>
            </div>
          </div>

          <div className="garden-photo relative min-h-[360px] overflow-hidden rounded-[42px] border border-[#d5d6b9] bg-[#193c2d] shadow-[0_22px_60px_rgba(41,78,48,0.2)] lg:min-h-[530px]">
            <img src={sitePath("/garden-banner.png")} alt="黄昏时的花园" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#102e25]/55 via-transparent to-[#d9e6b1]/10" />
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
              <div>
                <p className="garden-script text-2xl text-[#f5eab6]">take the long way home</p>
                <p className="mt-2 text-xs uppercase tracking-[0.15em] text-white/70">a few paths, one small garden</p>
              </div>
              <MoonStar className="mb-1 size-7 text-[#f5eab6]" />
            </div>
          </div>
        </section>

        <section id="modules" className="relative mt-20 scroll-mt-8 lg:mt-28">
          <div className="garden-vine garden-vine-side" aria-hidden="true"><Leaf className="size-8 rotate-[-35deg]" /><Leaf className="size-5 rotate-12" /></div>
           <img src={sitePath("/garden-notes.png")} alt="" aria-hidden="true" className="garden-accent garden-accent-image garden-accent-notes" />
           <img src={sitePath("/garden-fireflies.png")} alt="" aria-hidden="true" className="garden-accent garden-accent-image garden-accent-fireflies" />
           <img src={sitePath("/garden-arch-depth.png")} alt="" aria-hidden="true" className="garden-accent garden-accent-image garden-accent-path" />
          <div className="relative z-10 mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mt-1 text-sm font-medium tracking-[0.18em] text-[#70986a]">花园地图</p>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[#66806a]">每条小路都有自己的去处，有些只是绕得稍微远一点。</p>
          </div>
          <div className="relative z-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map(({ href, title, eyebrow, description, icon: Icon, featured, tone }) => (
              <RememberGardenPositionLink
                href={href}
                key={href}
                className={`garden-card group relative overflow-hidden rounded-[28px] border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(57,97,61,0.13)] ${featured ? "border-[#b7cfaa] bg-[#eff5e4] md:col-span-2 xl:col-span-2" : "border-[#d9dfc9] bg-[#f8f8ef]/90"}`}
              >
                <div className="absolute -right-5 -top-8 size-28 rounded-full border border-[#b7cfaa]/30" aria-hidden="true" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className={`flex size-12 items-center justify-center rounded-[17px] ${toneClasses[tone]}`}><Icon className="size-5" /></div>
                  <ArrowRight className="size-5 text-[#9ab19a] transition group-hover:translate-x-1 group-hover:text-[#4b8056]" />
                </div>
                <p className="relative mt-7 text-[10px] font-semibold tracking-[0.2em] text-[#79927b]">{eyebrow}</p>
                <h3 className="relative mt-2 text-xl font-semibold text-[#285238]">{title}</h3>
                <p className="relative mt-3 max-w-xl text-sm leading-6 text-[#66806a]">{description}</p>
                {featured && <span className="relative mt-6 inline-flex items-center gap-1.5 rounded-full border border-[#a8c49b] px-3 py-1 text-xs font-medium text-[#4d7d53]"><Leaf className="size-3" /> 主入口</span>}
              </RememberGardenPositionLink>
            ))}
          </div>
        </section>

        <section id="about" className="garden-note relative mt-20 scroll-mt-8 overflow-hidden rounded-[30px] border border-[#d6dec4] p-6 md:p-9 lg:mt-28">
          <div className="absolute -right-10 -top-14 size-44 rounded-full border border-[#b7cfaa]/40" aria-hidden="true" />
          <div className="relative grid gap-7 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <p className="garden-script text-2xl text-[#70986a]">门边的小纸条</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#244d36] md:text-4xl">花园不大，刚刚好。</h2>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-[#d6dec4] bg-[#e7eedb]/70">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-6 py-7 text-[11px] uppercase tracking-[0.14em] text-[#6f896f] lg:px-10">
          <span>留给自己的轻松时间</span>
          <span>公开参考 · 个人花园</span>
        </div>
      </footer>
    </main>
  );
}
