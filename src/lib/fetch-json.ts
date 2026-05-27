import { logger } from "./logger";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  let payload: any = null;

  try {
    payload = await response.json();
  } catch (error) {
    logger.warn({ error }, "Failed to parse JSON response");
  }

  if (!response.ok) {
    const message = payload?.error || `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as T;
}
