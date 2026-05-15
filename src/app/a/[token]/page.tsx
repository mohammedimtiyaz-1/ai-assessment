"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Loader2, Clock, ListChecks } from "lucide-react";

interface ResolvedAssessment {
  id: string;
  title: string;
  description: string;
  config: {
    timeLimitSec?: number;
    allowedAttempts?: number;
    resultVisibility?: string;
    requireLogin?: boolean;
  };
  requireLogin: boolean;
  hasAccessCode: boolean;
}

export default function PublicAssessmentPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [resolved, setResolved] = useState<ResolvedAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [guestName, setGuestName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  useEffect(() => {
    fetch(`/api/public/assessments/resolve?token=${encodeURIComponent(params.token)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Invalid link");
        return r.json();
      })
      .then((d) => {
        setResolved(d);
        setLoading(false);
      })
      .catch(() => {
        setError("This link is invalid, expired, or no longer available.");
        setLoading(false);
      });
  }, [params.token]);

  async function onStart() {
    if (!resolved) return;
    setStarting(true);
    setStartError("");
    try {
      const res = await fetch(`/api/assessments/${resolved.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: params.token,
          name: guestName || undefined,
          accessCode: accessCode || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.sessionId) {
        router.push(`/quiz/${data.sessionId}`);
      } else {
        setStartError(data.error || "Could not start assessment.");
        setStarting(false);
      }
    } catch {
      setStartError("Something went wrong.");
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="flex flex-col items-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-bold">Link Unavailable</h2>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = resolved?.config || {};

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{resolved?.title}</CardTitle>
          <CardDescription>{resolved?.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {config.timeLimitSec && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.floor(config.timeLimitSec / 60)} min
              </Badge>
            )}
            <Badge variant="secondary" className="flex items-center gap-1">
              <ListChecks className="h-3 w-3" />
              {config.resultVisibility?.replace(/_/g, " ")}
            </Badge>
          </div>

          {resolved?.requireLogin && (
            <div className="rounded-md bg-secondary p-4 text-sm text-center">
              This assessment requires you to{" "}
              <Link href={`/login?callbackUrl=/a/${params.token}`} className="text-primary font-medium underline">
                sign in
              </Link>{" "}
              before starting.
            </div>
          )}

          {!resolved?.requireLogin && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="guestName">Your Name</Label>
                <Input
                  id="guestName"
                  placeholder="Enter your name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                />
              </div>
              {resolved?.hasAccessCode && (
                <div className="space-y-2">
                  <Label htmlFor="accessCode">Access Code</Label>
                  <Input
                    id="accessCode"
                    placeholder="Enter access code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
          )}

          {startError && <p className="text-sm text-destructive">{startError}</p>}

          {!resolved?.requireLogin && (
            <Button
              onClick={onStart}
              disabled={starting || !guestName || (resolved?.hasAccessCode ? !accessCode : false)}
              className="w-full"
            >
              {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Start Assessment
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
