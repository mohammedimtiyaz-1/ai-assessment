"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Share2, BarChart3, CheckCircle, Loader2, Sparkles, Clock, Copy, FileText, Settings, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";

interface AssessmentDetail {
  id: string;
  title: string;
  description: string;
  ai_note: string | null;
  status: string;
  config: Record<string, any>;
  links: { token: string; active: boolean; accessCode?: string }[];
  linkedContent: { id: string; title: string; type: string }[];
  questionCount?: number;
  submissionCount?: number;
  joinedCount?: number;
}

export default function AssessmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [starting, setStarting] = useState(false);
  const [activeLink, setActiveLink] = useState<{ token: string; accessCode: string } | null>(null);
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch(`/api/teacher/assessments/${params.id}`).then((r) => r.json()),
    ])
      .then(([assessmentData]) => {
        setData(assessmentData);
        setQuestionCount(assessmentData.questionCount || 0);
        // Set active link if exists
        const activeLinkData = assessmentData.links?.find((l: any) => l.active);
        setActiveLink(activeLinkData ? { token: activeLinkData.token, accessCode: activeLinkData.accessCode } : null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  async function startAssignment() {
    setStarting(true);
    try {
      const res = await fetch(`/api/teacher/assessments/${params.id}/link`, { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setActiveLink({ token: d.token, accessCode: d.accessCode });
        setData((prev) =>
          prev ? { ...prev, links: [...prev.links, { token: d.token, accessCode: d.accessCode, active: true }] } : prev
        );
      }
    } finally {
      setStarting(false);
    }
  }

  async function startAssessment() {
    setSaving(true);
    try {
      const res = await fetch(`/api/teacher/assessments/${params.id}/start`, {
        method: "POST",
      });
      if (res.ok) {
        setData((prev) => prev ? { ...prev, status: "started" } : prev);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function closeAssessment() {
    setSaving(true);
    try {
      const res = await fetch(`/api/teacher/assessments/${params.id}/close`, {
        method: "POST",
      });
      if (res.ok) {
        setData((prev) => prev ? { ...prev, status: "closed" } : prev);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
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
            <Badge 
              className={
                data.status === "created" ? "bg-blue-500 hover:bg-blue-600" :
                data.status === "started" || data.status === "in_progress" ? "bg-green-500 hover:bg-green-600" :
                data.status === "closed" ? "bg-red-500 hover:bg-red-600" :
                "bg-gray-500 hover:bg-gray-600"
              }
            >
              {data.status === "created" ? "Created" :
               data.status === "started" || data.status === "in_progress" ? "In Progress" : 
               data.status === "closed" ? "Closed" : 
               data.status}
            </Badge>
          </div>
        </div>
      </div>

      <Card variant="gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Info className="h-4 w-4" /> Status & Next Steps
          </CardTitle>
          <CardDescription className="text-white/80">Current status and recommended actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white/10 backdrop-blur rounded-lg border border-white/20">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                data.status === "created" ? "bg-blue-300" :
                data.status === "started" || data.status === "in_progress" ? "bg-green-300" :
                data.status === "closed" ? "bg-red-300" : "bg-slate-300"
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Current Status: <span className="capitalize">{data.status === "created" ? "Created" : data.status === "started" || data.status === "in_progress" ? "In Progress" : data.status === "closed" ? "Closed" : data.status}</span></p>
                <p className="text-xs text-white/70 mt-1">
                  {data.status === "created" ? "Assessment is ready. Generate an access token to share with students and start the assessment." :
                   data.status === "started" || data.status === "in_progress" ? "Assessment is active. Students can now take the quiz. Monitor progress and close when ready." :
                   data.status === "closed" ? "Assessment is closed. No new submissions accepted. View the report to see results." :
                   "Unknown status"}
                </p>
              </div>
            </div>
            <div className="p-3 bg-white/10 backdrop-blur border border-white/20 rounded-lg">
              <p className="text-sm font-medium text-white">Recommended Next Steps:</p>
              <ul className="text-xs text-white/90 mt-2 space-y-1">
                {data.status === "created" && (
                  <>
                    <li>• Generate an access token to share with students</li>
                    <li>• Start the assessment when ready</li>
                  </>
                )}
                {(data.status === "started" || data.status === "in_progress") && (
                  <>
                    <li>• Share the access code or link with students</li>
                    <li>• Monitor student progress in real-time</li>
                    <li>• Close the assessment when all students have completed</li>
                  </>
                )}
                {data.status === "closed" && (
                  <>
                    <li>• View the detailed assessment report</li>
                    <li>• Analyze student performance and results</li>
                    <li>• Create a new assessment if needed</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BarChart3 className="h-4 w-4" /> Assessment Progress
          </CardTitle>
          <CardDescription className="text-white/80">Track your assessment setup and deployment progress.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between flex-wrap gap-2">
            {[
              { step: 1, label: "Questions", done: (data.questionCount || 0) > 0 },
              { step: 2, label: "Token", done: !!activeLink },
              { step: 3, label: "Start", done: data.status === "started" || data.status === "in_progress" },
              { step: 4, label: "Submitted", done: (data.submissionCount || 0) > 0 },
              { step: 5, label: "Close", done: data.status === "closed" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  item.done ? "bg-white text-purple-600" : "bg-white/20 text-white"
                }`}>
                  {item.done ? <CheckCircle className="h-4 w-4" /> : item.step}
                </div>
                <span className={`text-sm ${item.done ? "text-white font-medium" : "text-white/70"}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card variant="gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Share2 className="h-4 w-4" /> Generate Access Token
          </CardTitle>
          <CardDescription className="text-white/80">Generate an access token to share with students.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!activeLink ? (
            <Button onClick={startAssignment} disabled={starting} className="w-full bg-white text-purple-600 hover:bg-white/90 font-semibold">
              {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {starting ? "Generating..." : "Generate Access Token"}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-white/10 backdrop-blur border border-white/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <p className="text-sm font-medium text-white">Access token generated successfully</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/70">Access Code:</span>
                    <code className="text-sm font-mono bg-white/20 px-2 py-1 rounded border border-white/30 text-white">{activeLink.accessCode}</code>
                    <Button size="sm" variant="ghost" onClick={() => {
                      navigator.clipboard.writeText(activeLink.accessCode);
                      toast.success("Access code copied to clipboard");
                    }} className="text-white hover:bg-white/20">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/70">Share Link:</span>
                    <code className="text-xs font-mono bg-white/20 px-2 py-1 rounded border border-white/30 text-white flex-1 truncate">{`${window.location.origin}/a/${activeLink.token}`}</code>
                    <Button size="sm" variant="ghost" onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/a/${activeLink.token}`);
                      toast.success("Share link copied to clipboard");
                    }} className="text-white hover:bg-white/20">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Settings className="h-4 w-4" /> Assessment Configuration
          </CardTitle>
          <CardDescription className="text-white/80">View and manage assessment settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white/10 backdrop-blur rounded-lg border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-white" />
                <span className="text-xs text-white/70">Questions</span>
              </div>
              <div className="text-2xl font-bold text-white">{data.questionCount || 0}</div>
            </div>
            <div className="p-4 bg-white/10 backdrop-blur rounded-lg border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-white" />
                <span className="text-xs text-white/70">Time Limit</span>
              </div>
              <div className="text-2xl font-bold text-white">{Math.floor((data.config?.timeLimitSec || 0) / 60)}m</div>
            </div>
            <div className="p-4 bg-white/10 backdrop-blur rounded-lg border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4 text-white" />
                <span className="text-xs text-white/70">Difficulty</span>
              </div>
              <div className="text-2xl font-bold text-white capitalize">{data.config?.difficulty || 'N/A'}</div>
            </div>
            <div className="p-4 bg-white/10 backdrop-blur rounded-lg border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-white" />
                <span className="text-xs text-white/70">Questionnaire Type</span>
              </div>
              <div className="text-sm font-medium text-white capitalize">
                {data.config?.formats?.map((f: string) => f.replace('_', ' ')).join(', ') || 'N/A'}
              </div>
            </div>
          </div>
          {data.linkedContent && data.linkedContent.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-sm text-white/70 mb-2">Linked Content:</p>
              <div className="space-y-2">
                {data.linkedContent.map((content) => (
                  <div key={content.id} className="flex items-center gap-2 p-2 bg-white/10 backdrop-blur rounded border border-white/20">
                    <FileText className="h-4 w-4 text-white" />
                    <span className="text-sm text-white">{content.title}</span>
                    <Badge variant="outline" className="ml-auto border-white/30 text-white">{content.type}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BarChart3 className="h-4 w-4" /> Student Progress
          </CardTitle>
          <CardDescription className="text-white/80">Track student participation and submissions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-500/30 to-indigo-500/30 backdrop-blur rounded-lg border border-white/20">
              <div className="text-3xl font-bold text-white">{data.joinedCount || 0}</div>
              <p className="text-xs text-white/70 mt-1">Students Joined</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-500/30 to-emerald-500/30 backdrop-blur rounded-lg border border-white/20">
              <div className="text-3xl font-bold text-white">{data.submissionCount || 0}</div>
              <p className="text-xs text-white/70 mt-1">Completed</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 backdrop-blur rounded-lg border border-white/20">
              <div className="text-3xl font-bold text-white">
                {(data.joinedCount || 0) > 0 ? Math.round(((data.submissionCount || 0) / (data.joinedCount || 1)) * 100) : 0}%
              </div>
              <p className="text-xs text-white/70 mt-1">Completion Rate</p>
            </div>
          </div>
          {((data.joinedCount || 0) > 0 || (data.submissionCount || 0) > 0) && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <Link href={`/teacher/assessments/${params.id}/report`}>
                <Button variant="outline" size="sm" className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Detailed Report
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {activeLink && data.status !== "closed" && (
        <Card variant="gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Share2 className="h-4 w-4" /> {data.status === "started" || data.status === "in_progress" ? "Close Assessment" : "Start Assessment"}
            </CardTitle>
            <CardDescription className="text-white/80">
              {data.status === "started" || data.status === "in_progress"
                ? "Close this assessment to stop accepting submissions."
                : "Start this assessment to allow students to see questions."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.status === "started" || data.status === "in_progress" ? (
              <Button
                onClick={closeAssessment}
                disabled={saving}
                className="w-full bg-white text-red-600 hover:bg-white/90 font-semibold"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                {saving ? "Closing..." : "Close Assessment"}
              </Button>
            ) : (
              <Button
                onClick={startAssessment}
                disabled={saving}
                className="w-full bg-white text-purple-600 hover:bg-white/90 font-semibold"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {saving ? "Starting..." : "Start Assessment"}
              </Button>
            )}
            {saved && (
              <div className="flex items-center gap-1 text-sm text-white mt-2 justify-center">
                <CheckCircle className="h-4 w-4" />
                {data.status === "started" || data.status === "in_progress" ? "Assessment started successfully" : "Assessment closed successfully"}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data.status === "closed" && (
        <Link href={`/teacher/assessments/${params.id}/report`}>
        <Button className="w-full bg-white text-purple-600 hover:bg-white/90 font-semibold">
          <BarChart3 className="mr-2 h-4 w-4" />
          View Report
        </Button>
      </Link>
      )}
    </div>
  );
}
