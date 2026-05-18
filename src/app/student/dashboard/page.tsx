"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, FileQuestion, BookOpen, TrendingUp, ArrowRight, FileText, PlayCircle, Sparkles, Clock, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface DashboardData {
  userName: string;
  contentCount: number;
  attemptCount: number;
  completedCount: number;
  inProgressCount: number;
  accuracy: number | null;
  quickAction?: { label: string; href: string };
  recentContent: {
    id: string;
    title: string;
    type: string;
    progress?: number;
    score?: number;
    status?: string;
  }[];
  recentAttempts?: { id: string; assessmentTitle: string; score: number | null; finishedAt: string; status: string }[];
}

type KpiCard = {
  label: string;
  value?: number | string;
  icon: LucideIcon;
  color: string;
  bg: string;
  action?: {
    label: string;
    href: string;
  };
};

export default function StudentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const empty = !data || data.contentCount === 0;
  const userName = data?.userName || "Student";

  const baseKpis: KpiCard[] = [
    { label: "Materials Uploaded", value: data?.contentCount ?? 0, icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Exams Completed", value: data?.completedCount ?? 0, icon: BookOpen, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
    { label: "In Progress", value: data?.inProgressCount ?? 0, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    { label: "Avg. Accuracy", value: data?.accuracy != null ? `${data.accuracy}%` : "—", icon: Target, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  ];
  const quickActionKpi: KpiCard[] = data?.quickAction
    ? [
        {
          label: data.quickAction.label,
          icon: PlayCircle,
          color: "text-fuchsia-400",
          bg: "bg-fuchsia-500/10 border-fuchsia-500/20",
          action: data.quickAction,
        },
      ]
    : [];
  const kpis = [...baseKpis, ...quickActionKpi];

  const handleContentClick = (item: any) => {
    if (item.status === 'completed') {
      toast.success("Retake Quiz?", {
        description: "You have already completed this quiz. Would you like to retake it? Your previous score will be saved.",
        action: {
          label: "Retake",
          onClick: () => router.push(`/student/content/${item.id}`),
        },
      });
    } else if (item.status === 'in progress') {
      // Navigate to continue the quiz - need to find the active session
      router.push(`/student/quiz?quizConfigurationId=${item.id}`);
    } else {
      // to do - navigate to generate quiz
      router.push(`/student/content/${item.id}`);
    }
  };

  const attemptHistory = data?.recentAttempts ?? [];
  const retakeGroups = attemptHistory.reduce<Record<string, number>>((acc, attempt) => {
    acc[attempt.assessmentTitle] = (acc[attempt.assessmentTitle] || 0) + 1;
    return acc;
  }, {});
  const retakeCount = Object.values(retakeGroups).reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const latestAttempt = attemptHistory[0];

  const recentContent = data?.recentContent?.map((c, i) => {
    // Determine status based on progress and score
    let status: 'to do' | 'in progress' | 'completed';
    if (c.score !== undefined && c.score !== null) {
      status = 'completed';
    } else if (c.progress === 0) {
      status = 'to do';
    } else {
      status = 'in progress';
    }

    return {
      ...c,
      progress: c.progress ?? 100,
      score: c.score,
      status,
    };
  }) || [];

  return (
    <div className="space-y-8 text-slate-200">
      {/* Header Area */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome back, {userName}! 👋</h1>
          <p className="text-slate-400 mt-1">You're doing great. Let's keep the momentum going.</p>
        </div>
        <Link href="/student/upload">
          <Button className="gap-2">
            <Upload className="w-5 h-5" /> Upload Content
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <GlassCard className="p-6 flex items-center gap-4 h-28">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${kpi.bg} shrink-0`}>
                <kpi.icon className={`w-7 h-7 ${kpi.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-400 truncate">{kpi.label}</p>
                {kpi.action ? (
                  <Link href={kpi.action.href}>
                    <Button variant="outline" size="sm" className="mt-2">
                      {kpi.action.label}
                    </Button>
                  </Link>
                ) : (
                  <p className="text-2xl font-bold text-white mt-1">{kpi.value}</p>
                )}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {empty && (
        <GlassCard className="border-dashed">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-slate-500 mb-4" />
            <h3 className="text-lg font-semibold text-white">No content yet</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-md">
              Upload your first study material to generate practice questions and track your progress.
            </p>
            <Link href="/student/upload" className="mt-4">
              <Button>Upload your first content</Button>
            </Link>
          </div>
        </GlassCard>
      )}

      {!empty && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Recent Content</h2>
              <Link href="/student/content">
                <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300">View All</Button>
              </Link>
            </div>
            
            <div className="space-y-4">
              {recentContent.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                  <GlassCard 
                    className="p-5 flex items-center justify-between group cursor-pointer bg-slate-900/50 hover:bg-slate-800/80 transition-colors"
                    onClick={() => handleContentClick(item)}
                  >
                    <div className="flex items-center gap-4 w-1/2">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors border border-slate-700">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">{item.title}</h4>
                        <p className="text-xs text-slate-500">{item.type} • <span className="capitalize">{item.status}</span></p>
                      </div>
                    </div>
                    
                    <div className="flex-1 px-8">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-400">Progress</span>
                        <span className="text-slate-500">{item.progress}%</span>
                      </div>
                      <ProgressBar progress={item.progress} color={item.progress === 100 ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-indigo-400 to-purple-400'} />
                    </div>

                    <div className="w-24 text-right">
                      {item.score ? (
                        <Badge variant="green">{item.score}% Score</Badge>
                      ) : (
                        <Badge variant="blue">In Progress</Badge>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sidebar Insights */}
          <div className="space-y-6">
            <GlassCard className="p-6 bg-gradient-to-br from-indigo-900/80 via-purple-900/80 to-fuchsia-900/80 border-purple-500/30">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-fuchsia-300" /> AI Insight
              </h3>
              <p className="text-indigo-100/80 text-sm leading-relaxed mb-4">
                You're making good progress! Keep practicing to improve your accuracy and master new topics.
              </p>
              <Link href="/student/quiz">
                <Button variant="secondary" className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20">
                  Start Practice Quiz
                </Button>
              </Link>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="font-bold text-white mb-4">Recommended Next Steps</h3>
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">1</div>
                  <div>
                    <h5 className="font-medium text-slate-200 text-sm">Upload more content</h5>
                    <p className="text-xs text-slate-500">Add study materials to generate quizzes.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">2</div>
                  <div>
                    <h5 className="font-medium text-slate-200 text-sm">Practice regularly</h5>
                    <p className="text-xs text-slate-500">Daily practice improves retention.</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}
