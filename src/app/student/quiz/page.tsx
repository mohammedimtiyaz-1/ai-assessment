"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ArrowRight, AlertTriangle, CheckCircle } from "lucide-react";

interface QuizConfiguration {
  id: string;
  content_id: string;
  difficulty: string;
  question_type: string;
  question_count: number;
  question_ids: string[];
  generated_at: string;
}

interface ContentItem {
  id: string;
  title: string;
  type: string;
}

function QuizEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizConfigurationId = searchParams.get("quizConfigurationId");
  const contentId = searchParams.get("contentId");
  
  const [quizConfig, setQuizConfig] = useState<QuizConfiguration | null>(null);
  const [content, setContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (quizConfigurationId) {
      // Fetch quiz configuration
      fetch(`/api/student/quizzes/${quizConfigurationId}`)
        .then((r) => {
          if (r.status === 401) {
            router.push('/login');
            throw new Error('Unauthorized');
          }
          return r.json();
        })
        .then((d) => {
          setQuizConfig(d.quizConfig);
          // Fetch content details
          return fetch(`/api/student/content?id=${d.quizConfig.content_id}`);
        })
        .then((r) => {
          if (r.status === 401) {
            router.push('/login');
            throw new Error('Unauthorized');
          }
          return r.json();
        })
        .then((d) => {
          setContent(d.content?.[0] || null);
          setLoading(false);
        })
        .catch((error) => {
          if (error.message === 'Unauthorized') {
            // Already redirected
            return;
          }
          console.error('Error fetching quiz config:', error);
          setLoading(false);
        });
    } else {
      // Fall back to old behavior - show all content
      fetch("/api/student/content")
        .then((r) => {
          if (r.status === 401) {
            router.push('/login');
            throw new Error('Unauthorized');
          }
          return r.json();
        })
        .then((d) => {
          setContent(d.content || []);
          setLoading(false);
        })
        .catch((error) => {
          if (error.message === 'Unauthorized') {
            // Already redirected
            return;
          }
          console.error('Error fetching content:', error);
          setLoading(false);
        });
    }
  }, [quizConfigurationId, router]);

  const startPractice = useCallback(async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/student/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          quizConfigurationId: quizConfig?.id,
          contentId: quizConfig?.content_id 
        }),
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (res.ok && data.sessionId) {
        router.push(`/quiz/${data.sessionId}`);
      } else {
        console.error("Failed to start practice:", data);
        setStarting(false);
      }
    } catch (error) {
      console.error("Error starting practice:", error);
      setStarting(false);
    }
  }, [quizConfig, router]);

  const startPracticeWithContent = useCallback(async (targetContentId?: string) => {
    setStarting(true);
    try {
      const res = await fetch("/api/student/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: targetContentId || contentId }),
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (res.ok && data.sessionId) {
        router.push(`/quiz/${data.sessionId}`);
      } else {
        console.error("Failed to start practice:", data);
        setStarting(false);
      }
    } catch (error) {
      console.error("Error starting practice:", error);
      setStarting(false);
    }
  }, [contentId, router]);

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

  // Show generated quiz details
  if (quizConfig && content) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/student/content" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to content
          </Link>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{content.title}</CardTitle>
                <CardDescription className="mt-2">
                  Practice quiz with {quizConfig.question_count} questions
                </CardDescription>
              </div>
              <Badge variant="outline" className="capitalize">
                {quizConfig.difficulty}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Quiz generated successfully</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{quizConfig.question_type.toUpperCase()}</Badge>
                <span className="text-muted-foreground">• {quizConfig.question_count} questions</span>
              </div>
            </div>
            
            <Button
              onClick={startPractice}
              disabled={starting}
              size="lg"
              className="w-full"
            >
              {starting ? "Starting..." : "Start Quiz"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback: show all content (old behavior)
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Practice Quiz</h1>

      {Array.isArray(content) && content.length === 0 && (
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

      {Array.isArray(content) && (
        <div className="grid gap-4 md:grid-cols-2">
          {content.map((item: ContentItem) => (
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
                  onClick={() => startPracticeWithContent(item.id)}
                  disabled={starting}
                  className="w-full"
                >
                  Start Practice <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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
