"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Brain, Zap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isStudent = role === "student";
  const isTeacher = ["teacher", "admin", "super_admin"].includes(role || "");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between px-6 border-b">
        <div className="flex items-center gap-2 font-bold text-lg">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span>AI Assessment</span>
        </div>
        <nav className="flex items-center gap-4">
          {session ? (
            <Button asChild>
              <Link href={isTeacher ? "/dashboard" : "/student/dashboard"}>Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 py-24 lg:py-32">
          <div className="mx-auto max-w-5xl text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold tracking-tight sm:text-6xl"
            >
              Learn Smarter with{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI-Powered
              </span>{" "}
              Assessments
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
            >
              Upload your study materials, generate practice questions, and track your progress with intelligent quizzes tailored to your content.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
            >
              {session ? (
                <>
                  <Button asChild size="lg">
                    <Link href={isTeacher ? "/dashboard" : "/student/dashboard"}>
                      Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  {isStudent && (
                    <Button asChild size="lg" variant="outline">
                      <Link href="/student/upload">Upload Content</Link>
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/signup">Get Started</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/login">Sign In</Link>
                  </Button>
                </>
              )}
            </motion.div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {[
              { icon: Brain, title: "AI Question Generation", desc: "Turn any material into practice questions automatically." },
              { icon: Zap, title: "Adaptive Quizzes", desc: "Sessions adapt to your knowledge gaps and learning pace." },
              { icon: GraduationCap, title: "Progress Tracking", desc: "Visual insights into your strengths and weak areas." },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="p-6">
                    <f.icon className="h-8 w-8 text-primary mb-4" />
                    <h3 className="text-lg font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
