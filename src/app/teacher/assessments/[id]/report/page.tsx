"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BarChart3 } from "lucide-react";

interface ReportData {
  assessmentTitle: string;
  totalAttempts: number;
  completions: number;
  averageScore: number;
  studentResults: { name: string; score: number | null; finishedAt: string | null }[];
}

export default function ReportPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/teacher/assessments/${params.id}/report`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/teacher/assessments/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Report: {data?.assessmentTitle}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.totalAttempts ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.completions ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.averageScore ?? "—"}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.studentResults?.length === 0 && (
            <p className="text-sm text-muted-foreground">No attempts yet.</p>
          )}
          {data?.studentResults?.map((s, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{s.name || "Guest"}</p>
                <p className="text-xs text-muted-foreground">
                  {s.finishedAt ? new Date(s.finishedAt).toLocaleString() : "In progress"}
                </p>
              </div>
              <Badge variant={s.score != null ? "default" : "secondary"}>
                {s.score != null ? `${s.score}%` : "—"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
