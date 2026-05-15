"use client";

import { useEffect, useState } from "react";
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
