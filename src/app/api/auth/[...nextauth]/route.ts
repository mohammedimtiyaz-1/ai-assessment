import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";
import { logger } from "@/lib/logger";

const handler = async (req: any, res: any) => {
  logger.info({ method: req.method, url: req.url }, "NextAuth handler called");
  return NextAuth({
    ...authOptions,
    debug: true,
  })(req, res);
};

export { handler as GET, handler as POST };
