"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Root error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="flex flex-col items-center py-12">
          <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
          {error.digest && (
            <p className="mt-1 text-xs text-muted-foreground">Digest: {error.digest}</p>
          )}
          <Button onClick={reset} className="mt-6">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
