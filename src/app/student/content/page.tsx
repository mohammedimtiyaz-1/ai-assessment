"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BookOpen, Calendar, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ContentItem {
  id: string;
  title: string;
  type: string;
  created_at: string;
}

interface QuizConfig {
  quizConfigurationId: string;
  questionCount: number;
  difficulty: string;
  questionType: string;
}

export default function ContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const newId = searchParams.get("newId");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingQuiz, setGeneratingQuiz] = useState<string | null>(null);
  const [quizConfigs, setQuizConfigs] = useState<Record<string, QuizConfig>>({});
  const [difficulty, setDifficulty] = useState<Record<string, string>>({});
  const [questionCount, setQuestionCount] = useState<Record<string, string>>({});
  const [questionType, setQuestionType] = useState<Record<string, string>>({});
  const newItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/student/content")
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
        setItems(d.content || []);
        setLoading(false);
      })
      .catch((error) => {
        if (error.message === 'Unauthorized') {
          return;
        }
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    if (newId && !loading && items.length > 0) {
      const newItem = items.find(item => item.id === newId);
      if (newItem) {
        toast.success(`"${newItem.title}" uploaded successfully!`);
        if (newItemRef.current) {
          newItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [newId, loading, items]);

  const handleGenerateQuiz = async (contentId: string) => {
    setGeneratingQuiz(contentId);
    try {
      const response = await fetch("/api/student/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          difficulty: difficulty[contentId] || "medium",
          questionCount: parseInt(questionCount[contentId] || "5"),
          questionType: questionType[contentId] || "mcq",
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
      setQuizConfigs((prev) => ({ ...prev, [contentId]: data }));
      toast.success("Quiz generated successfully!");
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate quiz");
    } finally {
      setGeneratingQuiz(null);
    }
  };

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Content</h1>
        <Link href="/student/upload">
          <Button>Upload New</Button>
        </Link>
      </div>

      {items.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No content yet</h3>
            <p className="text-sm text-muted-foreground mt-2">Upload your first study material to get started.</p>
            <Link href="/student/upload" className="mt-4">
              <Button>Upload content</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {items.map((item) => {
          const isNew = item.id === newId;
          return (
            <Card 
              key={item.id} 
              ref={isNew ? newItemRef : null}
              className={`flex flex-col min-h-[300px] transition-all duration-500 ${
                isNew ? "border-primary ring-2 ring-primary/20 shadow-lg" : ""
              }`}
            >
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <Link href={`/student/content/${item.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-base">{item.title}</h3>
                    </Link>
                    {isNew && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 mt-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Just Uploaded
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary">{item.type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Added {new Date(item.created_at).toLocaleDateString()}
                </p>
              
              {quizConfigs[item.id] ? (
                <div className="mt-auto pt-4">
                  <Link href={`/student/quiz?quizConfigurationId=${quizConfigs[item.id].quizConfigurationId}`} className="w-full">
                    <Button className="w-full">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Go to Quiz
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="mt-auto pt-4 space-y-2">
                  <div className="flex gap-2">
                    <Select
                      value={questionType[item.id] || "mcq"}
                      onValueChange={(value) => setQuestionType((prev) => ({ ...prev, [item.id]: value }))}
                    >
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
                    <Select
                      value={difficulty[item.id] || "medium"}
                      onValueChange={(value) => setDifficulty((prev) => ({ ...prev, [item.id]: value }))}
                    >
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
                    <Select
                      value={questionCount[item.id] || "5"}
                      onValueChange={(value) => setQuestionCount((prev) => ({ ...prev, [item.id]: value }))}
                    >
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
                    onClick={() => handleGenerateQuiz(item.id)}
                    disabled={generatingQuiz === item.id}
                    className="w-full"
                    variant="default"
                  >
                    {generatingQuiz === item.id ? (
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
        );
      })}
      </div>
    </div>
  );
}
