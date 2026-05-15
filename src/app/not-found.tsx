import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="flex flex-col items-center py-12">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <p className="mt-4 text-lg text-muted-foreground">Page not found</p>
          <Link href="/" className="mt-6">
            <Button>Go home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
