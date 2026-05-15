"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BookOpen, FileQuestion, Calendar } from "lucide-react";

interface ContentDetail {
  id: string;
  title: string;
  type: string;
  storage_ref: string;
  created_at: string;
}

export default function ContentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetch(`/api/student/content?id=${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        setContent(d.content?.[0] || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  async function startPractice() {
    setStarting(true);
    try {
      const res = await fetch("/api/student/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: params.id }),
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
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Content not found.</p>
        <Link href="/student/content" className="mt-4 inline-block">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to content
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/student/content">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>{content.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{content.type}</Badge>
                <span className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  {new Date(content.created_at).toLocaleDateString()}
                </span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {content.storage_ref && (
            <p className="text-sm text-muted-foreground">
              Storage: <code className="text-xs bg-secondary px-1 py-0.5 rounded">{content.storage_ref}</code>
            </p>
          )}
          <Button onClick={startPractice} disabled={starting} className="w-full">
            <FileQuestion className="mr-2 h-4 w-4" />
            {starting ? "Starting..." : "Start Practice"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
