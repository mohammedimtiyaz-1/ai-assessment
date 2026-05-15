"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ArrowRight, AlertTriangle } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  type: string;
}

function QuizEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contentId = searchParams.get("contentId");
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetch("/api/student/content")
      .then((r) => r.json())
      .then((d) => {
        setContent(d.content || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function startPractice(targetContentId?: string) {
    setStarting(true);
    try {
      const res = await fetch("/api/student/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: targetContentId || contentId }),
      });
      const data = await res.json();
      if (res.ok && data.sessionId) {
        router.push(`/quiz/${data.sessionId}`);
      } else {
        setStarting(false);
      }
    } catch {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Practice Quiz</h1>

      {content.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No content available</h3>
            <p className="text-sm text-muted-foreground mt-2">Upload content first to generate practice questions.</p>
            <Link href="/student/upload" className="mt-4">
              <Button>Upload content</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {content.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{item.title}</CardTitle>
                <Badge variant="secondary">{item.type}</Badge>
              </div>
              <CardDescription>Use this content to generate a practice session.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => startPractice(item.id)}
                disabled={starting}
                className="w-full"
              >
                Start Practice <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function QuizEntryPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    }>
      <QuizEntryForm />
    </Suspense>
  );
}
