"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Share2, BarChart3 } from "lucide-react";

interface AssessmentDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  config: Record<string, any>;
  links: { token: string; active: boolean }[];
}

export default function AssessmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/teacher/assessments/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
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
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{data.description || "No description provided."}</p>
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

      <Link href={`/teacher/assessments/${params.id}/report`}>
        <Button variant="outline" className="w-full">
          <BarChart3 className="mr-2 h-4 w-4" />
          View Report
        </Button>
      </Link>
    </div>
  );
}
