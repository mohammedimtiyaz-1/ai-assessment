import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardRedirect() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }
  
  const userRole = session.user?.role;
  
  if (userRole === "teacher") {
    redirect("/teacher/dashboard");
  } else {
    redirect("/student/dashboard");
  }
}
