"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileQuestion, ArrowRight } from "lucide-react";

interface Assessment {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/teacher/assessments")
      .then((r) => r.json())
      .then((d) => {
        setAssessments(d.assessments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function createAssessment() {
    const title = window.prompt("Assessment title:");
    if (!title) return;
    setCreating(true);
    try {
      const res = await fetch("/api/teacher/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (res.ok) {
        setAssessments((prev) => [{ id: data.id, title: data.title, status: data.status, created_at: new Date().toISOString() }, ...prev]);
      }
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assessments</h1>
        <Button onClick={createAssessment} disabled={creating}>
          <Plus className="mr-2 h-4 w-4" />
          {creating ? "Creating..." : "Create"}
        </Button>
      </div>

      {assessments.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No assessments yet</h3>
            <p className="text-sm text-muted-foreground mt-2">Create your first assessment to share with students.</p>
            <Button className="mt-4" onClick={createAssessment} disabled={creating}>
              {creating ? "Creating..." : "Create assessment"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {assessments.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={a.status === "published" ? "default" : "secondary"}>{a.status}</Badge>
                <Link href={`/teacher/assessments/${a.id}`}>
                  <Button variant="ghost" size="sm">
                    Open <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
