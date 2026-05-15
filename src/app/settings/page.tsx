"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/shell";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [upgrading, setUpgrading] = useState(false);
  const role = session?.user?.role;
  const isStudent = role === "student";

  async function upgradeRole() {
    setUpgrading(true);
    try {
      const res = await fetch("/api/user/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "teacher" }),
      });
      if (res.ok) {
        router.push("/login?callbackUrl=/dashboard");
      }
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Manage your preferences and role.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium">Current Role</p>
              <p className="text-sm text-muted-foreground capitalize">{role}</p>
            </div>

            {isStudent && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Become a Teacher</p>
                    <p className="text-sm text-muted-foreground">
                      Upgrade to create assessments and share them with students. You will be asked to sign in again.
                    </p>
                  </div>
                </div>
                <Button onClick={upgradeRole} disabled={upgrading}>
                  {upgrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Upgrade to Teacher
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
