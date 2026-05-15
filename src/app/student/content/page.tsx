"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, FileQuestion, ArrowRight } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  type: string;
  created_at: string;
}

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/content")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.content || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className="flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                </div>
                <Badge variant="secondary">{item.type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Added {new Date(item.created_at).toLocaleDateString()}
              </p>
              <div className="mt-auto pt-4 flex gap-2">
                <Link href={`/student/quiz?contentId=${item.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <FileQuestion className="mr-2 h-3 w-3" />
                    Practice
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
