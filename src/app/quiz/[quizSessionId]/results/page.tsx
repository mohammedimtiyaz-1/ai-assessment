"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle, XCircle, Clock, Trophy, Target } from "lucide-react";

interface Question {
  id: string;
  body: string;
  answers: { key: string; text: string }[];
  correctAnswer: string;
  userAnswer: string | null;
  isCorrect: boolean;
}

interface QuizResults {
  sessionId: string;
  score: number;
  correctCount: number;
  total: number;
  timeTaken: number | null;
  startedAt: string;
  finishedAt: string;
  questions: Question[];
}

export default function QuizResultsPage({ params }: { params: { quizSessionId: string } }) {
  const router = useRouter();
  const [results, setResults] = useState<QuizResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sessions/${params.quizSessionId}/results`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          router.push("/student/dashboard");
          return;
        }
        setResults(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.quizSessionId, router]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-muted-foreground">Results not found.</p>
        <Link href="/student/history" className="mt-4">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to History
          </Button>
        </Link>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/student/history">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to History
        </Button>
      </Link>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Your Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-center">{results.score}%</div>
            <p className="text-sm text-muted-foreground text-center mt-2">
              {results.correctCount} of {results.total} correct
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-center">
              {Math.round((results.correctCount / results.total) * 100)}%
            </div>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Question accuracy
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              Time Taken
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-center">
              {results.timeTaken ? formatTime(results.timeTaken) : "—"}
            </div>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Total duration
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Question Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.questions.map((q, index) => (
            <div key={q.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Q{index + 1}</Badge>
                    {q.isCorrect ? (
                      <Badge variant="default" className="bg-green-500">Correct</Badge>
                    ) : (
                      <Badge variant="destructive">Incorrect</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium">{q.body}</p>
                </div>
                {q.isCorrect ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" />
                )}
              </div>

              <div className="space-y-2 pl-4">
                {q.answers.map((a) => (
                  <div
                    key={a.key}
                    className={`text-sm p-2 rounded border ${
                      a.key === q.correctAnswer
                        ? "bg-green-500/10 border-green-500 text-green-700 dark:text-green-400"
                        : a.key === q.userAnswer && !q.isCorrect
                        ? "bg-red-500/10 border-red-500 text-red-700 dark:text-red-400"
                        : "bg-muted/30"
                    }`}
                  >
                    <span className="font-semibold mr-2">{a.key}.</span>
                    {a.text}
                    {a.key === q.correctAnswer && (
                      <span className="ml-2 text-xs">(Correct answer)</span>
                    )}
                    {a.key === q.userAnswer && (
                      <span className="ml-2 text-xs">(Your answer)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-center gap-4">
        <Link href="/student/quiz" className="flex-1">
          <Button variant="outline" className="w-full">
            Take Another Quiz
          </Button>
        </Link>
        <Link href="/student/dashboard" className="flex-1">
          <Button className="w-full">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
