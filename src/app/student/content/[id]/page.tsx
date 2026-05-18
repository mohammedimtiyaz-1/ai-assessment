"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BookOpen, Calendar, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface ContentDetail {
  id: string;
  title: string;
  type: string;
  storage_ref: string;
  created_at: string;
}

interface QuizConfig {
  quizConfigurationId: string;
  questionCount: number;
  difficulty: string;
  questionType: string;
}

export default function ContentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState("5");
  const [questionType, setQuestionType] = useState("mcq");

  useEffect(() => {
    fetch(`/api/student/content?id=${params.id}`)
      .then((r) => {
        if (r.status === 401) {
          signOut({ redirect: false }).then(() => {
            router.push("/login");
          });
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
          return;
        }
        setLoading(false);
      });
  }, [params.id, router]);

  const handleGenerateQuiz = async () => {
    setGeneratingQuiz(true);
    try {
      const response = await fetch("/api/student/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: params.id,
          difficulty,
          questionCount: parseInt(questionCount),
          questionType,
        }),
      });

      if (response.status === 401) {
        // Sign out user and redirect to login
        await signOut({ redirect: false });
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate quiz");
      }

      const data: QuizConfig = await response.json();
      setQuizConfig(data);
      toast.success("Quiz generated successfully!");
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate quiz");
    } finally {
      setGeneratingQuiz(false);
    }
  };

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
          
          {quizConfig ? (
            <Link href={`/student/quiz?quizConfigurationId=${quizConfig.quizConfigurationId}`} className="w-full">
              <Button className="w-full">
                <ArrowRight className="mr-2 h-4 w-4" />
                Go to Quiz
              </Button>
            </Link>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Select value={questionType} onValueChange={setQuestionType}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                    <SelectItem value="essay">Essay</SelectItem>
                    <SelectItem value="fill-blanks">Fill in Blanks</SelectItem>
                    <SelectItem value="match-following">Match Following</SelectItem>
                    <SelectItem value="riddle">Riddle</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={questionCount} onValueChange={setQuestionCount}>
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="#" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerateQuiz}
                disabled={generatingQuiz}
                className="w-full"
              >
                {generatingQuiz ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Quiz
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
