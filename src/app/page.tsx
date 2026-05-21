"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { GraduationCap, Brain, Zap, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-purple-500/30 overflow-hidden relative font-sans">
      {/* Colorful Gradient Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[120px]" />
      <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-600/20 blur-[140px]" />
      <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-cyan-600/20 blur-[120px]" />

      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-indigo-400">
          <Sparkles className="h-8 w-8" />
          <span className="text-2xl font-bold tracking-tight text-white">AI Tutor</span>
        </div>
        <nav className="flex items-center gap-4">
          <Button asChild variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="text-center max-w-3xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block py-1.5 px-4 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-sm font-semibold mb-6 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              The Future of Learning is Here
            </span>
            <h1 className="text-6xl font-extrabold tracking-tight text-white leading-tight">
              Master any topic with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400">
                AI-Powered Learning
              </span>
            </h1>
            <p className="mt-6 text-xl text-slate-400 leading-relaxed">
              Upload your materials, generate personalized practice exams, and get intelligent feedback to learn faster and retain more.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center gap-4 pt-4"
          >
            <Button size="lg" asChild className="gap-2">
              <Link href="/student/dashboard">
                I'm a Student <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild className="gap-2">
              <Link href="/teacher/dashboard">
                I'm a Teacher <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </motion.div>
        </div>

        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Brain, title: "Smart Generation", desc: "Instantly create quizzes from PDFs, slides, and notes.", color: "text-fuchsia-400", bg: "bg-fuchsia-500/10 border-fuchsia-500/20" },
            { icon: Zap, title: "Instant Feedback", desc: "Get detailed explanations for every right and wrong answer.", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
            { icon: GraduationCap, title: "Track Progress", desc: "Visualize your strengths and focus on weak points.", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
            >
              <GlassCard className="p-8 h-full">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border ${feature.bg}`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
