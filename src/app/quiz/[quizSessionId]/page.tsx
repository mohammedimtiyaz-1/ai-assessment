"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, ChevronLeft, ChevronRight } from "lucide-react";

interface Question {
  id: string;
  body: string;
  answers: { key: string; text: string }[];
}

interface SessionData {
  id: string;
  questions: Question[];
  timeLimitSec: number | null;
  status: string;
  startedAt: string;
}

export default function QuizRuntimePage({ params }: { params: { quizSessionId: string } }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${params.quizSessionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          router.push("/student/dashboard");
          return;
        }
        setSession(d);
        if (d.timeLimitSec) {
          const elapsed = Math.floor((Date.now() - new Date(d.startedAt).getTime()) / 1000);
          setTimeLeft(Math.max(0, d.timeLimitSec - elapsed));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.quizSessionId, router]);

  useEffect(() => {
    if (timeLeft == null || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev == null || prev <= 1) {
          clearInterval(interval);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const submit = useCallback(async () => {
    if (!session) return;
    setSubmitting(true);
    const res = await fetch(`/api/sessions/${session.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    if (res.ok) {
      router.push("/student/history");
    } else {
      setSubmitting(false);
    }
  }, [session, answers, router]);

  useEffect(() => {
    if (expired) submit();
  }, [expired, submit]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold">Session not found</h2>
        <Button onClick={() => router.push("/student/dashboard")} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const q = session.questions[currentIndex];
  const total = session.questions.length;
  const progress = ((currentIndex + 1) / total) * 100;
  const answeredCount = Object.keys(answers).length;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Quiz</h1>
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {total}
          </p>
        </div>
        {timeLeft != null && (
          <div className={`flex items-center gap-2 text-sm font-medium ${timeLeft < 60 ? "text-destructive" : ""}`}>
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <Progress value={progress} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base leading-relaxed">{q.body}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {q.answers.map((a) => (
            <button
              key={a.key}
              onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: a.key }))}
              className={`w-full rounded-lg border p-4 text-left text-sm transition-colors hover:bg-accent ${
                answers[q.id] === a.key ? "border-primary bg-primary/10" : ""
              }`}
            >
              <span className="font-semibold mr-2">{a.key}.</span>
              {a.text}
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Previous
        </Button>

        <Badge variant="secondary">
          {answeredCount}/{total} answered
        </Badge>

        {currentIndex < total - 1 ? (
          <Button onClick={() => setCurrentIndex((i) => i + 1)}>
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={submitting || expired}>
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        )}
      </div>
    </div>
  );
}
