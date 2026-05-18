"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, CheckCircle, BookOpen } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function CreateAssessmentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionTypes, setQuestionTypes] = useState<string[]>(["mcq"]);
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(15);
  const [requireLogin, setRequireLogin] = useState(true);
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [availableContent, setAvailableContent] = useState<{ id: string; title: string; type: string }[]>([]);
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
  ];

  function handleQuestionTypeToggle(type: string) {
    setQuestionTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  useEffect(() => {
    fetch("/api/teacher/content")
      .then((r) => r.json())
      .then((d) => setAvailableContent(d.content || []))
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Validation
    if (!title || title.trim().length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }

    if (title.length > 200) {
      toast.error("Title must be less than 200 characters");
      return;
    }

    if (!selectedContent) {
      toast.error("Please select content to generate questions from");
      return;
    }

    if (questionCount < 1 || questionCount > 100) {
      toast.error("Number of questions must be between 1 and 100");
      return;
    }

    if (timeLimit < 1 || timeLimit > 180) {
      toast.error("Time limit must be between 1 and 180 minutes");
      return;
    }

    if (questionTypes.length === 0) {
      toast.error("Please select at least one question type");
      return;
    }

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

        // Attach content if selected
        if (selectedContent) {
          await fetch(`/api/teacher/assessments/${data.id}/content`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contentId: selectedContent }),
          });

          // Auto-generate questions
          await fetch(`/api/teacher/assessments/${data.id}/generate-questions`, {
            method: "POST",
          });
        }

        toast.success("Assessment created successfully!");
        setDone(true);
        setTimeout(() => router.push(`/teacher/assessments/${data.id}`), 1000);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to create assessment");
        setCreating(false);
      }
    } catch (error) {
      toast.error("An error occurred while creating the assessment");
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/teacher/assessments">
            <Button variant="ghost" size="icon" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Create Assessment</h1>
        </div>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-white">New Assessment</CardTitle>
            <CardDescription className="text-white/80">Create a new assessment to share with students</CardDescription>
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
              <Label>Content *</Label>
              <div className="flex flex-wrap gap-2">
                {availableContent.map((content) => (
                  <button
                    key={content.id}
                    type="button"
                    onClick={() => setSelectedContent(content.id)}
                    className={`px-4 py-2 rounded-md border-2 transition-all ${
                      selectedContent === content.id
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-medium"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>{content.title}</span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select content to automatically generate questions from. Questions will be created when you click Create Assessment.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Question Difficulty</Label>
              <div className="flex flex-wrap gap-2">
                {difficultyOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDifficulty(opt.value)}
                    className={`px-4 py-2 rounded-md border-2 transition-all ${
                      difficulty === opt.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-medium"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Questionnaire Type</Label>
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
                className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Require Login</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRequireLogin(true)}
                  className={`px-4 py-2 rounded-md border-2 transition-all ${
                    requireLogin
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-medium"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setRequireLogin(false)}
                  className={`px-4 py-2 rounded-md border-2 transition-all ${
                    !requireLogin
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-medium"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <Button type="submit" disabled={creating} className="w-full bg-white text-purple-600 hover:bg-white/90 font-semibold">
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Assessment
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
