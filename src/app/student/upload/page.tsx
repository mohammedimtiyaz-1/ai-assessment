"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, File, CheckCircle, Loader2, FileText } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [uploadType, setUploadType] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState("");
  const [title, setTitle] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const onDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      if (!title) setTitle(e.dataTransfer.files[0].name);
    }
  }, [title]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    if (uploadType === "file" && !file) return;
    if (uploadType === "text" && !textContent.trim()) return;

    setUploading(true);
    setProgress(20);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("type", uploadType);

    if (uploadType === "file" && file) {
      formData.append("file", file);
    } else if (uploadType === "text") {
      formData.append("textContent", textContent);
    }

    try {
      setProgress(60);
      setGenerating(true);
      const res = await fetch("/api/student/content", { method: "POST", body: formData });
      const data = await res.json();
      
      if (res.ok) {
        setProgress(100);
        
        if (data.warning) {
          setWarning(data.warning);
          setGenerating(false);
          setUploading(false);
          return;
        }
        
        setDone(true);
        setTimeout(() => router.push(`/student/content?newId=${data.id}`), 1000);
      } else {
        setError(data.error || "Failed to upload content");
        setUploading(false);
        setGenerating(false);
      }
    } catch {
      setError("Failed to upload content. Please try again.");
      setUploading(false);
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Upload Content</h1>
      <Card>
        <CardHeader>
          <CardTitle>Add Study Material</CardTitle>
          <CardDescription>Upload a file or paste text content to generate practice questions.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <Tabs value={uploadType} onValueChange={(v) => setUploadType(v as "file" | "text")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">Upload File</TabsTrigger>
                <TabsTrigger value="text">Paste Text</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4">
                <div
                  onDragEnter={onDrag}
                  onDragLeave={onDrag}
                  onDragOver={onDrag}
                  onDrop={onDrop}
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                    dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                  }`}
                >
                  <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground text-center">
                    Drag and drop a file here, or{" "}
                    <label className="text-primary cursor-pointer hover:underline">
                      browse
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setFile(f);
                            if (!title) setTitle(f.name);
                          }
                        }}
                      />
                    </label>
                  </p>
                  {file && (
                    <div className="mt-4 flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm">
                      <File className="h-4 w-4" />
                      <span>{file.name}</span>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="textContent">Content</Label>
                  <Textarea
                    id="textContent"
                    value={textContent}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTextContent(e.target.value)}
                    placeholder="Paste your study material text here..."
                    rows={12}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste notes, articles, or any text content you want to generate questions from.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="Enter a title for this content"
                required
              />
            </div>

            {uploading && !done && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">
                  {generating ? "Generating quiz questions..." : "Uploading..."}
                </p>
              </div>
            )}

            {done && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                Content uploaded successfully! Redirecting...
              </div>
            )}

            <Button
              type="submit"
              disabled={uploading || !title || (uploadType === "file" && !file) || (uploadType === "text" && !textContent.trim())}
              className="w-full"
            >
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {uploadType === "file" ? "Upload File" : "Save Content"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
