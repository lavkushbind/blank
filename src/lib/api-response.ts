/** Read API JSON without exposing proxy/login HTML or JSON parser errors to users. */
export async function readApiResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  const unavailable = "Service is temporarily unavailable. Please try again shortly.";
  if (!/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(contentType)) {
    if (response.status === 401 || response.redirected) {
      throw new Error("Your session could not be verified. Please sign in again.");
    }
    throw new Error(unavailable);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(unavailable);
  }
  if (body === null || typeof body !== "object") {
    throw new Error(unavailable);
  }
  // Preserve JSON error payloads so callers can handle their API's status codes.
  return body;
}
