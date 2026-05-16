const fs = require('fs');
const path = require('path');

const files = [
  'src/app/api/student/content/route.ts',
  'src/app/api/student/dashboard/route.ts',
  'src/app/api/student/sessions/route.ts',
  'src/app/api/student/history/route.ts',
  'src/app/api/student/progress/route.ts',
  'src/app/api/user/role/route.ts',
  'src/app/api/user/profile/route.ts',
  'src/app/api/sessions/[sessionId]/submit/route.ts',
  'src/app/api/teacher/assessments/route.ts',
  'src/app/api/teacher/assessments/[id]/link/route.ts',
  'src/app/api/teacher/assessments/[id]/route.ts',
  'src/app/api/teacher/assessments/[id]/report/route.ts',
  'src/app/api/teacher/dashboard/route.ts',
  'src/app/api/assessments/[id]/start/route.ts',
];

for (const file of files) {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP (not found): ${file}`);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Skip if already using withAuth
  if (content.includes('withAuth')) {
    console.log(`SKIP (already withAuth): ${file}`);
    continue;
  }

  // Replace import
  content = content.replace(
    /import \{ auth \} from "@\/lib\/auth";\n/,
    'import { withAuth } from "@/lib/api-auth";\n'
  );

  // Replace NextResponse import to include NextRequest
  content = content.replace(
    /import \{ NextResponse \} from "next\/server";\n/,
    'import { NextRequest, NextResponse } from "next/server";\n'
  );

  // Replace auth wrapper patterns
  // Pattern 1: export const GET = auth(async (req) => {
  content = content.replace(
    /export const (GET|POST|PATCH|DELETE) = auth\(async \(req\) => \{\n  if \(!req\.auth\?\.user\?\.id\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\n  const userId = req\.auth\.user\.id;\n/,
    'export const $1 = withAuth(async (req: NextRequest, user) => {\n  const userId = user.id;\n'
  );

  // Pattern 2: Some files have req.auth.user without the explicit check
  content = content.replace(
    /export const (GET|POST|PATCH|DELETE) = auth\(async \(req\) => \{\n  if \(!req\.auth\?\.user\?\.id\) return NextResponse\.json\(\{ error: ["']Unauthorized["'] \}, \{ status: 401 \}\);\n  const \{ data: \{ session }\} = req\.auth;\n  const userId = session\.user\.id;\n/,
    'export const $1 = withAuth(async (req: NextRequest, user) => {\n  const userId = user.id;\n'
  );

  // Pattern 3: Simple auth wrapper without explicit check
  content = content.replace(
    /export const (GET|POST|PATCH|DELETE) = auth\(async \(req\) => \{\n  const userId = req\.auth\.user\.id;\n/,
    'export const $1 = withAuth(async (req: NextRequest, user) => {\n  const userId = user.id;\n'
  );

  // Pattern 4: if (!req.auth?.user) return 401
  content = content.replace(
    /export const (GET|POST|PATCH|DELETE) = auth\(async \(req\) => \{\n  if \(!req\.auth\?\.user\) return NextResponse\.json\(\{ error: ["']Unauthorized["'] \}, \{ status: 401 \}\);\n  const userId = req\.auth\.user\.id;\n/,
    'export const $1 = withAuth(async (req: NextRequest, user) => {\n  const userId = user.id;\n'
  );

  fs.writeFileSync(fullPath, content);
  console.log(`FIXED: ${file}`);
}

console.log('Done!');
