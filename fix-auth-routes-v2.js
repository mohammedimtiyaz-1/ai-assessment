const fs = require('fs');
const path = require('path');

const files = [
  'src/app/api/assessments/[id]/start/route.ts',
  'src/app/api/student/content/route.ts',
  'src/app/api/user/role/route.ts',
  'src/app/api/user/profile/route.ts',
  'src/app/api/sessions/[sessionId]/submit/route.ts',
  'src/app/api/teacher/assessments/[id]/link/route.ts',
  'src/app/api/teacher/assessments/[id]/route.ts',
  'src/app/api/teacher/assessments/[id]/report/route.ts',
];

for (const file of files) {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP (not found): ${file}`);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Skip if already using withAuth everywhere
  if (!content.includes('auth(') || content.includes('next-auth')) {
    console.log(`SKIP (no auth() or has next-auth): ${file}`);
    continue;
  }

  // Replace import
  content = content.replace(
    /import \{ auth \} from "@\/lib\/auth";\n/,
    'import { withAuth } from "@/lib/api-auth";\n'
  );

  // Replace NextResponse import to include NextRequest
  if (!content.includes('NextRequest')) {
    content = content.replace(
      /import \{ NextResponse \} from "next\/server";\n/,
      'import { NextRequest, NextResponse } from "next/server";\n'
    );
  }

  // Remove the auth import if it still exists (in case it was named differently)
  content = content.replace(/import \{ auth \} from "@\/lib\/auth";\n/g, '');

  // Replace auth check patterns and wrapper
  // Pattern: auth(async (req) => {\n  if (!req.auth?.user?.id) return ...;\n  ...
  content = content.replace(
    /export const (GET|POST|PATCH|DELETE) = auth\(async \(req\) => \{\n  if \(!req\.auth\?\.user\?\.id\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\n  const ([a-zA-Z0-9_]+) = req\.auth\.user\.([a-zA-Z0-9_]+);/g,
    'export const $1 = withAuth(async (req: NextRequest, user) => {\n  const $2 = user.$3;'
  );

  // Pattern: auth(async (req) => {\n  if (!req.auth?.user) return ...;\n  const userId = req.auth.user.id;
  content = content.replace(
    /export const (GET|POST|PATCH|DELETE) = auth\(async \(req\) => \{\n  if \(!req\.auth\?\.user\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\n  const userId = req\.auth\.user\.id;\n/,
    'export const $1 = withAuth(async (req: NextRequest, user) => {\n  const userId = user.id;\n'
  );

  // Pattern: auth(async (req) => {\n  const userId = req.auth.user.id; (no explicit check)
  content = content.replace(
    /export const (GET|POST|PATCH|DELETE) = auth\(async \(req\) => \{\n  const userId = req\.auth\.user\.id;\n/,
    'export const $1 = withAuth(async (req: NextRequest, user) => {\n  const userId = user.id;\n'
  );

  // Replace remaining req.auth.user.id with user.id
  content = content.replace(/req\.auth\.user\.id/g, 'user.id');
  // Replace remaining req.auth.user.role with user.role
  content = content.replace(/req\.auth\.user\.role/g, 'user.role');
  // Replace remaining req.auth.user with user
  content = content.replace(/req\.auth\.user/g, 'user');

  // Remove duplicate blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(fullPath, content);
  console.log(`FIXED: ${file}`);
}

console.log('Done!');
