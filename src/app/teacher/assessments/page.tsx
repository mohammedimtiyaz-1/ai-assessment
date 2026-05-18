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

  useEffect(() => {
    fetch("/api/teacher/assessments")
      .then((r) => r.json())
      .then((d) => {
        setAssessments(d.assessments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
        <Link href="/teacher/assessments/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Button>
        </Link>
      </div>

      {assessments.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No assessments yet</h3>
            <p className="text-sm text-muted-foreground mt-2">Create your first assessment to share with students.</p>
            <Link href="/teacher/assessments/create">
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create assessment
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {assessments.map((a) => (
          <Card 
            key={a.id} 
            className="cursor-pointer hover:bg-accent/50 transition-colors hover:shadow-md"
            onClick={() => window.location.href = `/teacher/assessments/${a.id}`}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex-1">
                <p className="font-medium hover:text-primary transition-colors">{a.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge 
                  className={
                    a.status === "created" ? "bg-blue-500 hover:bg-blue-600" :
                    a.status === "started" || a.status === "in_progress" ? "bg-green-500 hover:bg-green-600" :
                    a.status === "closed" ? "bg-red-500 hover:bg-red-600" :
                    "bg-gray-500 hover:bg-gray-600"
                  }
                >
                  {a.status === "created" ? "Created" : a.status === "started" || a.status === "in_progress" ? "In Progress" : a.status === "closed" ? "Closed" : a.status}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
