export async function register() {
  // Validate server environment variables when the server starts.
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./lib/env");
}
