"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Plus } from "lucide-react";
import { ApiError, fetchJson } from "@/lib/fetch-json";

interface ContentItem {
  id: string;
  title: string;
  type: string;
  created_at: string;
}

interface ContentResponse {
  content: ContentItem[];
}

export default function TeacherContentPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchJson<ContentResponse>("/api/teacher/content")
      .then((data) => {
        if (!isMounted) return;
        setContent(data.content ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;

        if (err instanceof ApiError && err.status === 401) {
          setError("You must be signed in as a teacher to view the content library.");
        } else if (err instanceof ApiError && err.status === 403) {
          setError("Only teacher accounts can view this page.");
        } else {
          setError(err.message || "Unable to load content");
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-8 text-center">
          <h3 className="text-lg font-semibold">Cannot load content</h3>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const empty = content.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Library</h1>
          <p className="text-sm text-muted-foreground">Upload or reuse materials to generate assessments faster.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/teacher/assessments">
            <Button variant="outline">Create Assessment</Button>
          </Link>
          <Link href="/student/upload">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Upload Content
            </Button>
          </Link>
        </div>
      </div>

      {empty ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">No content uploaded yet</h3>
            <p className="text-sm text-muted-foreground">
              Upload course materials to build assessments automatically. You can reuse student uploads or upload as a teacher.
            </p>
            <div className="flex justify-center gap-2">
              <Link href="/student/upload">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Content
                </Button>
              </Link>
              <Link href="/teacher/assessments">
                <Button variant="outline">Create Assessment</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {content.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Type</span>
                  <span className="capitalize">{item.type || "Unknown"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Added</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-end">
                  <Link href={`/teacher/assessments/create?contentId=${item.id}`}>
                    <Button variant="ghost" size="sm">Use in assessment</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
