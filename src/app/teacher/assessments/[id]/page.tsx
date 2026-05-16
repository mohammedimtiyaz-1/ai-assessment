"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Share2, BarChart3, Save, CheckCircle, Loader2, BookOpen, Sparkles } from "lucide-react";

interface AssessmentDetail {
  id: string;
  title: string;
  description: string;
  ai_note: string | null;
  status: string;
  config: Record<string, any>;
  links: { token: string; active: boolean }[];
  linkedContent: { id: string; title: string; type: string }[];
}

export default function AssessmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingConfig, setEditingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [description, setDescription] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [availableContent, setAvailableContent] = useState<{ id: string; title: string; type: string }[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [configTimeLimit, setConfigTimeLimit] = useState(15);
  const [configRequireLogin, setConfigRequireLogin] = useState(true);
  const [configResultVisibility, setConfigResultVisibility] = useState("immediate");

  useEffect(() => {
    Promise.all([
      fetch(`/api/teacher/assessments/${params.id}`).then((r) => r.json()),
      fetch("/api/teacher/content").then((r) => r.json()),
    ])
      .then(([assessmentData, contentData]) => {
        setData(assessmentData);
        setDescription(assessmentData.description || "");
        setAiNote(assessmentData.ai_note || "");
        setAvailableContent(contentData.content || []);
        setConfigTimeLimit(assessmentData.config?.timeLimitSec ? Math.floor(assessmentData.config.timeLimitSec / 60) : 15);
        setConfigRequireLogin(assessmentData.config?.requireLogin ?? true);
        setConfigResultVisibility(assessmentData.config?.resultVisibility || "immediate");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  async function createLink() {
    const res = await fetch(`/api/teacher/assessments/${params.id}/link`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setData((prev) =>
        prev ? { ...prev, links: [...prev.links, { token: d.token, active: true }] } : prev
      );
    }
  }

  async function attachContent(contentId: string) {
    setAttaching(true);
    try {
      const res = await fetch(`/api/teacher/assessments/${params.id}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId }),
      });
      if (res.ok) {
        const content = availableContent.find((c) => c.id === contentId);
        if (content) {
          setData((prev) =>
            prev ? { ...prev, linkedContent: [...prev.linkedContent, content] } : prev
          );
        }
      }
    } finally {
      setAttaching(false);
    }
  }

  async function detachContent(contentId: string) {
    try {
      const res = await fetch(`/api/teacher/assessments/${params.id}/content/${contentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setData((prev) =>
          prev ? { ...prev, linkedContent: prev.linkedContent.filter((c) => c.id !== contentId) } : prev
        );
      }
    } catch (error) {
      console.error("Error detaching content:", error);
    }
  }

  async function generateQuestions() {
    if (!data?.linkedContent || data.linkedContent.length === 0) {
      alert("Please attach content first before generating questions.");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`/api/teacher/assessments/${params.id}/generate-questions`, {
        method: "POST",
      });
      const result = await res.json();
      if (res.ok) {
        setQuestionCount(result.questionsGenerated);
        alert(`Successfully generated ${result.questionsGenerated} questions!`);
        // Refresh assessment data to get updated status
        const updatedAssessment = await fetch(`/api/teacher/assessments/${params.id}`).then((r) => r.json());
        setData(updatedAssessment);
      } else {
        alert(result.error || "Failed to generate questions");
      }
    } catch (error) {
      console.error("Error generating questions:", error); // Keep for UI error handling
      alert("Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  }

  async function saveChanges() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/teacher/assessments/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, aiNote }),
      });
      if (res.ok) {
        setData((prev) => prev ? { ...prev, description, ai_note: aiNote || null } : prev);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/teacher/assessments/${params.id}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeLimitSec: configTimeLimit * 60,
          requireLogin: configRequireLogin,
          resultVisibility: configResultVisibility,
        }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                config: {
                  ...prev.config,
                  timeLimitSec: configTimeLimit * 60,
                  requireLogin: configRequireLogin,
                  resultVisibility: configResultVisibility,
                },
              }
            : prev
        );
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        setEditingConfig(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Assessment not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/teacher/assessments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{data.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={data.status === "published" ? "default" : "secondary"}>{data.status}</Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Description</CardTitle>
            {!editing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <div className="space-y-4">
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
              <div className="flex items-center gap-2">
                <Button onClick={saveChanges} disabled={saving} size="sm">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)} disabled={saving} size="sm">
                  Cancel
                </Button>
                {saved && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Saved
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{data.description || "No description provided."}</p>
              {data.ai_note && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">AI Note</Label>
                  <p className="text-sm text-muted-foreground italic">{data.ai_note}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Configuration</CardTitle>
            {!editingConfig && (
              <Button variant="ghost" size="sm" onClick={() => setEditingConfig(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingConfig ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  value={configTimeLimit}
                  onChange={(e) => setConfigTimeLimit(parseInt(e.target.value) || 15)}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resultVisibility">Result Visibility</Label>
                <select
                  id="resultVisibility"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={configResultVisibility}
                  onChange={(e) => setConfigResultVisibility(e.target.value)}
                >
                  <option value="immediate">Show Immediately</option>
                  <option value="after_completion">After Completion</option>
                  <option value="never">Never</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requireLogin"
                  checked={configRequireLogin}
                  onCheckedChange={(checked) => setConfigRequireLogin(checked as boolean)}
                />
                <Label htmlFor="requireLogin">Require Login</Label>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={saveConfig} disabled={saving} size="sm">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={() => setEditingConfig(false)} disabled={saving} size="sm">
                  Cancel
                </Button>
                {saved && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Saved
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Time Limit:</span>
                <span className="font-medium">{data?.config?.timeLimitSec ? Math.floor(data.config.timeLimitSec / 60) + " min" : "No limit"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Result Visibility:</span>
                <span className="font-medium">{data?.config?.resultVisibility?.replace(/_/g, " ") || "Immediate"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Require Login:</span>
                <span className="font-medium">{data?.config?.requireLogin ? "Yes" : "No"}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4" /> Share Links
          </CardTitle>
          <CardDescription>Create and manage public links for this assessment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.links.map((link) => (
            <div key={link.token} className="flex items-center justify-between rounded-md border p-3">
              <code className="text-xs">{typeof window !== "undefined" ? `${window.location.origin}/a/${link.token}` : `/a/${link.token}`}</code>
              <Badge variant={link.active ? "default" : "secondary"}>{link.active ? "Active" : "Inactive"}</Badge>
            </div>
          ))}
          <Button onClick={createLink} variant="outline">
            Generate new link
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Linked Content
          </CardTitle>
          <CardDescription>Attach content to generate questions for this assessment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data?.linkedContent && data.linkedContent.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Attached Content</Label>
              <div className="space-y-2">
                {data.linkedContent.map((content) => (
                  <div key={content.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{content.title}</span>
                    </div>
                    <Badge variant="secondary">{content.type}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Attach Content</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={attaching}
              onChange={(e) => e.target.value && attachContent(e.target.value)}
              defaultValue=""
            >
              <option value="">Select content to attach...</option>
              {availableContent
                .filter((c) => !data?.linkedContent?.some((lc) => lc.id === c.id))
                .map((content) => (
                  <option key={content.id} value={content.id}>
                    {content.title}
                  </option>
                ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Question Generation
          </CardTitle>
          <CardDescription>Generate AI questions from attached content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Questions Generated</p>
              <p className="text-xs text-muted-foreground">
                {questionCount > 0 ? `${questionCount} questions ready` : "No questions generated yet"}
              </p>
            </div>
            <Button onClick={generateQuestions} disabled={generating || !data?.linkedContent?.length}>
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {generating ? "Generating..." : "Generate Questions"}
            </Button>
          </div>
          {data?.linkedContent && data.linkedContent.length === 0 && (
            <p className="text-xs text-muted-foreground">Attach content first to generate questions.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> Readiness Status
          </CardTitle>
          <CardDescription>Check if this assessment is ready to publish.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Content Attached</span>
            {data?.linkedContent && data.linkedContent.length > 0 ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <span className="text-muted-foreground">Pending</span>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Questions Generated</span>
            {questionCount > 0 ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <span className="text-muted-foreground">Pending</span>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Configuration Set</span>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          {data?.linkedContent && data.linkedContent.length > 0 && questionCount > 0 ? (
            <Badge variant="default" className="w-full justify-center">Ready to Publish</Badge>
          ) : (
            <Badge variant="secondary" className="w-full justify-center">Not Ready</Badge>
          )}
        </CardContent>
      </Card>

      <Link href={`/teacher/assessments/${params.id}/report`}>
        <Button variant="outline" className="w-full">
          <BarChart3 className="mr-2 h-4 w-4" />
          View Report
        </Button>
      </Link>
    </div>
  );
}
