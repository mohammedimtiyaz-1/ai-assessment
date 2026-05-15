"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Zap, BookOpen } from "lucide-react";

interface ProgressData {
  totalAttempts: number;
  averageScore: number;
  completionRate: number;
  weakAreas: string[];
  recentTrend: { date: string; score: number }[];
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/progress")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const empty = !data || data.totalAttempts === 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Progress</h1>

      {empty && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No progress data yet</h3>
            <p className="text-sm text-muted-foreground mt-2">Complete quizzes to see your progress analytics.</p>
          </CardContent>
        </Card>
      )}

      {!empty && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" /> Average Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data!.averageScore}%</div>
                <Progress value={data!.averageScore} className="mt-3" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Completion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data!.completionRate}%</div>
                <Progress value={data!.completionRate} className="mt-3" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Total Attempts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data!.totalAttempts}</div>
              </CardContent>
            </Card>
          </div>

          {data!.weakAreas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Areas to Improve</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {data!.weakAreas.map((area) => (
                  <span key={area} className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                    {area}
                  </span>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
