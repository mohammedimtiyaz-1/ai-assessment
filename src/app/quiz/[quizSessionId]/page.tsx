"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  body: string;
  answers: { key: string; text: string }[];
  question_type?: string;
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

  const submit = useCallback(async () => {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/quiz/${session.id}/results`);
      } else {
        console.error("Failed to submit:", data);
        setSubmitting(false);
      }
    } catch (error) {
      console.error("Error submitting:", error);
      setSubmitting(false);
    }
  }, [session, answers, router]);

  const handleQuit = useCallback(async () => {
    toast("Are you sure you want to quit? Your current answers will be submitted.", {
      action: {
        label: "Cancel",
        onClick: () => toast.dismiss(),
      },
      cancel: {
        label: "Quit & Submit",
        onClick: async () => {
          if (!session) return;
          setSubmitting(true);
          const res = await fetch(`/api/sessions/${session.id}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers }),
          });
          if (res.ok) {
            router.push(`/quiz/${session.id}/results`);
          } else {
            setSubmitting(false);
            toast.error("Failed to submit quiz");
          }
        },
      },
    });
  }, [session, answers, router]);

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
          // Immediately submit and redirect to results when time expires
          if (session) {
            submit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, session, submit]);

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
        <div className="flex items-center gap-4">
          {timeLeft != null && (
            <div className={`flex items-center gap-2 text-sm font-medium ${timeLeft < 60 ? "text-destructive" : ""}`}>
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQuit}
            disabled={submitting}
          >
            <X className="h-4 w-4 mr-2" />
            Quit
          </Button>
        </div>
      </div>

      <Progress value={progress} />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-base leading-relaxed flex-1">{q.body}</CardTitle>
            {q.question_type && (
              <Badge variant="outline" className="ml-2 capitalize">
                {q.question_type.replace('-', ' ')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {q.question_type === 'essay' ? (
            <Textarea
              placeholder="Type your answer here..."
              value={answers[q.id] || ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              className="min-h-[200px]"
            />
          ) : q.question_type === 'fill-blanks' ? (
            <FillInBlanksInput
              question={q}
              value={answers[q.id] || ''}
              onChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
            />
          ) : q.question_type === 'match-following' ? (
            <MatchFollowingInput
              question={q}
              value={answers[q.id] || ''}
              onChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
            />
          ) : (
            // Default MCQ and riddle rendering
            q.answers.map((a) => (
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
            ))
          )}
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

function FillInBlanksInput({ question, value, onChange }: { question: Question; value: string; onChange: (value: string) => void }) {
  // Parse the question body to find [BLANK] markers
  const parts = question.body.split('[BLANK]');
  const blankCount = parts.length - 1;
  
  // Parse current value as comma-separated answers
  const currentAnswers = value ? value.split(',').map(a => a.trim()) : [];
  
  const handleBlankChange = (index: number, answer: string) => {
    const newAnswers = [...currentAnswers];
    newAnswers[index] = answer;
    onChange(newAnswers.join(','));
  };

  return (
    <div className="space-y-4">
      {parts.map((part, index) => (
        <div key={index} className="inline-flex items-center gap-2 flex-wrap">
          <span>{part}</span>
          {index < blankCount && (
            <input
              type="text"
              value={currentAnswers[index] || ''}
              onChange={(e) => handleBlankChange(index, e.target.value)}
              className="border rounded px-3 py-2 w-32 text-sm"
              placeholder={`Blank ${index + 1}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function MatchFollowingInput({ question, value, onChange }: { question: Question; value: string; onChange: (value: string) => void }) {
  // For match-following, we'll use a simple selection interface
  // The answers array contains alternating left and right items
  const pairs: Array<{ left: { key: string; text: string }; right: { key: string; text: string } }> = [];
  for (let i = 0; i < question.answers.length; i += 2) {
    if (i + 1 < question.answers.length) {
      pairs.push({
        left: question.answers[i],
        right: question.answers[i + 1],
      });
    }
  }

  const currentMatches = value ? value.split(',').reduce((acc, pair) => {
    const [left, right] = pair.split('-');
    if (left && right) acc[left] = right;
    return acc;
  }, {} as Record<string, string>) : {};

  const handleMatch = (leftKey: string, rightKey: string) => {
    const newMatches = { ...currentMatches, [leftKey]: rightKey };
    onChange(Object.entries(newMatches).map(([k, v]) => `${k}-${v}`).join(','));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">Match the items from Column A with Column B:</p>
      <div className="grid grid-cols-2 gap-4">
        {pairs.map((pair, index) => (
          <div key={index} className="space-y-2">
            <div className="p-3 border rounded bg-secondary/50">
              <span className="font-semibold">{pair.left.key}.</span> {pair.left.text}
            </div>
            <div className="p-3 border rounded">
              <select
                value={currentMatches[pair.left.key] || ''}
                onChange={(e) => handleMatch(pair.left.key, e.target.value)}
                className="w-full bg-transparent"
              >
                <option value="">Select match</option>
                {pairs.map((p) => (
                  <option key={p.right.key} value={p.right.key}>
                    {p.right.key}. {p.right.text}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
