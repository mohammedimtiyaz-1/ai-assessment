"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function CreateAssessmentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [difficulty, setDifficulty] = useState("mixed");
  const [questionTypes, setQuestionTypes] = useState<string[]>(["mcq"]);
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(15);
  const [requireLogin, setRequireLogin] = useState(true);
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);

  const questionTypeOptions = [
    { value: "mcq", label: "Multiple Choice" },
    { value: "fill_blanks", label: "Fill in the Blanks" },
    { value: "true_false", label: "True/False" },
    { value: "short_answer", label: "Short Answer" },
    { value: "essay", label: "Essay" },
    { value: "riddle", label: "Riddle" },
  ];

  const difficultyOptions = [
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
    { value: "mixed", label: "Mixed" },
  ];

  function handleQuestionTypeToggle(type: string) {
    setQuestionTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title) return;
    setCreating(true);

    const config = {
      questionCount,
      difficulty,
      formats: questionTypes,
      timeLimitSec: timeLimit * 60,
      allowedAttempts: 3,
      resultVisibility: "immediate_full",
      requireLogin,
      randomized: false,
      sameQuestions: true,
    };

    try {
      const res = await fetch("/api/teacher/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          aiNote,
          config,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDone(true);
        setTimeout(() => router.push(`/teacher/assessments/${data.id}`), 1000);
      } else {
        setCreating(false);
      }
    } catch {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/teacher/assessments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Create Assessment</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Assessment</CardTitle>
          <CardDescription>Create a new assessment to share with students</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="Enter assessment title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Enter a description for this assessment"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiNote">AI Note (Additional Context)</Label>
              <Textarea
                id="aiNote"
                value={aiNote}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiNote(e.target.value)}
                placeholder="Provide additional information for AI to consider when generating questions"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This helps the AI understand specific topics, focus areas, or context for question generation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Question Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficultyOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Question Types</Label>
              <div className="grid grid-cols-2 gap-3">
                {questionTypeOptions.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={opt.value}
                      checked={questionTypes.includes(opt.value)}
                      onCheckedChange={() => handleQuestionTypeToggle(opt.value)}
                    />
                    <Label htmlFor={opt.value} className="text-sm font-normal">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="questionCount">Number of Questions</Label>
              <Input
                id="questionCount"
                type="number"
                min={1}
                max={100}
                value={questionCount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuestionCount(parseInt(e.target.value) || 10)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                min={1}
                max={180}
                value={timeLimit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTimeLimit(parseInt(e.target.value) || 15)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="requireLogin"
                checked={requireLogin}
                onCheckedChange={(checked: boolean) => setRequireLogin(checked)}
              />
              <Label htmlFor="requireLogin" className="text-sm font-normal">
                Require students to login before taking assessment
              </Label>
            </div>

            {creating && !done && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating assessment...
              </div>
            )}

            {done && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Assessment created! Redirecting...
              </div>
            )}

            <Button type="submit" disabled={creating || !title || questionTypes.length === 0} className="w-full">
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Assessment
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
