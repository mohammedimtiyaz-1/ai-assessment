"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, ArrowRight } from "lucide-react";

interface Attempt {
  id: string;
  assessmentTitle: string;
  score: number | null;
  finishedAt: string | null;
  status: string;
}

const CHART_WIDTH = 440;
const CHART_HEIGHT = 200;

export default function HistoryPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/history")
      .then((r) => r.json())
      .then((d) => {
        setAttempts(d.attempts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    const completed = attempts
      .filter((attempt) => attempt.status === "completed" && attempt.score != null)
      .slice()
      .reverse();
    if (completed.length === 0) return null;
    const maxScore = Math.max(...completed.map((a) => a.score!));
    const minScore = Math.min(...completed.map((a) => a.score!));
    const range = Math.max(1, maxScore - minScore);
    const points = completed.map((attempt, index) => {
      const x = (index / (completed.length - 1 || 1)) * CHART_WIDTH;
      const y = CHART_HEIGHT - ((attempt.score! - minScore) / range) * CHART_HEIGHT;
      return { x, y, score: attempt.score!, label: attempt.finishedAt };
    });
    return { points, maxScore, minScore };
  }, [attempts]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Attempt History</h1>
      {chartData && (
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">Recent Performance</p>
              <Badge variant="outline">Score %</Badge>
            </div>
            <div className="w-full h-48">
              <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full h-full">
                <defs>
                  <linearGradient id="chart-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={`M0 ${CHART_HEIGHT} ${chartData.points
                    .map((point, index) => `${index === 0 ? "L" : "L"}${point.x} ${point.y}`)
                    .join(" ")} L${CHART_WIDTH} ${CHART_HEIGHT}`}
                  fill="url(#chart-gradient)"
                />
                <path
                  d={`M${chartData.points
                    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
                    .join(" ")}`}
                  stroke="#818cf8"
                  strokeWidth={2}
                  fill="none"
                />
                {chartData.points.map((point, index) => (
                  <circle key={point.x + index} cx={point.x} cy={point.y} r={4} fill="#38bdf8" stroke="white" strokeWidth={2} />
                ))}
              </svg>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Low score: {chartData.minScore}%</span>
              <span>High score: {chartData.maxScore}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {attempts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No attempts yet</h3>
            <p className="text-sm text-muted-foreground mt-2">Complete a quiz to see your history here.</p>
            <Link href="/student/quiz" className="mt-4">
              <Button>Start a quiz</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {attempts.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{a.assessmentTitle || "Practice session"}</p>
                <p className="text-xs text-muted-foreground">
                  {a.finishedAt ? new Date(a.finishedAt).toLocaleString() : "In progress"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={a.status === "completed" ? "default" : "secondary"}>
                  {a.status}
                </Badge>
                {a.score != null && <span className="text-sm font-bold">{a.score}%</span>}
                {a.status === "completed" && (
                  <Link href={`/quiz/${a.id}/results`}>
                    <Button variant="ghost" size="sm">View Results</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
