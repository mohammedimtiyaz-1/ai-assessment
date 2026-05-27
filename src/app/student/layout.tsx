import { AppShell } from "@/components/layout/shell";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <AppShell mode="student">{children}</AppShell>;
}
