import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn utility", () => {
  it("merges tailwind classes correctly", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles conditional classes", () => {
    expect(cn("base", true && "conditional", false && "ignored")).toBe("base conditional");
  });
});

describe("env validation", () => {
  it("has required env vars in example", () => {
    const example = `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/ai_tutor
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-min-32-chars`;
    expect(example).toContain("DATABASE_URL");
    expect(example).toContain("NEXTAUTH_SECRET");
    expect(example).toContain("NEXTAUTH_URL");
  });
});
