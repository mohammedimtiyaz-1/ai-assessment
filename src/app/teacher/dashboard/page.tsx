"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileQuestion, Plus, ArrowRight } from "lucide-react";
import { fetchJson } from "@/lib/fetch-json";

interface DashboardData {
  assessmentCount: number;
  totalAttempts: number;
  publishedCount: number;
  recentAssessments: { id: string; title: string; status: string }[];
}

export default function TeacherDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchJson<DashboardData>("/api/teacher/dashboard")
      .then((d) => {
        if (!isMounted) return;
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Unable to load dashboard");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-8 text-center">
          <h3 className="text-lg font-semibold">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <Link href="/teacher/assessments">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Assessment
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.assessmentCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.publishedCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.totalAttempts ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Assessments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.recentAssessments?.length === 0 && (
            <p className="text-sm text-muted-foreground">No assessments yet.</p>
          )}
          {data?.recentAssessments?.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <FileQuestion className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{a.title}</span>
              </div>
              <Badge variant={a.status === "published" ? "default" : "secondary"}>{a.status}</Badge>
            </div>
          ))}
          <Link href="/teacher/assessments">
            <Button variant="ghost" size="sm" className="w-full">
              View all <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
