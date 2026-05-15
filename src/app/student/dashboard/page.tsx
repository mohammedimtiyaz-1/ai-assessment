"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, FileQuestion, BookOpen, TrendingUp, ArrowRight } from "lucide-react";

interface DashboardData {
  contentCount: number;
  attemptCount: number;
  accuracy: number | null;
  recentContent: { id: string; title: string; type: string }[];
  recentAttempts: { id: string; assessmentTitle: string; score: number | null; finishedAt: string }[];
}

export default function StudentDashboardPage() {
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const empty = !data || data.contentCount === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Student Dashboard</h1>
        <Link href="/student/upload">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Content
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.contentCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.attemptCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.accuracy != null ? `${data.accuracy}%` : "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quick Action</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/student/quiz">
              <Button variant="outline" size="sm">
                <FileQuestion className="mr-2 h-4 w-4" />
                Practice
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {empty && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No content yet</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Upload your first study material to generate practice questions and track your progress.
            </p>
            <Link href="/student/upload" className="mt-4">
              <Button>Upload your first content</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!empty && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.recentContent?.length === 0 && (
                <p className="text-sm text-muted-foreground">No content yet.</p>
              )}
              {data?.recentContent?.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{c.title}</span>
                  </div>
                  <Badge variant="secondary">{c.type}</Badge>
                </div>
              ))}
              <Link href="/student/content">
                <Button variant="ghost" size="sm" className="w-full">
                  View all <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Attempts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.recentAttempts?.length === 0 && (
                <p className="text-sm text-muted-foreground">No attempts yet. Start a practice quiz!</p>
              )}
              {data?.recentAttempts?.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{a.assessmentTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.finishedAt ? new Date(a.finishedAt).toLocaleDateString() : "In progress"}
                    </p>
                  </div>
                  <Badge variant={a.score != null ? "default" : "secondary"}>
                    {a.score != null ? `${a.score}%` : "—"}
                  </Badge>
                </div>
              ))}
              <Link href="/student/history">
                <Button variant="ghost" size="sm" className="w-full">
                  View history <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
