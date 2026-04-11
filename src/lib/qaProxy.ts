function getRequiredEnv(name: "QA_RUNNER_BASE_URL" | "QA_RUNNER_TOKEN") {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : "";
}

export function getQaRunnerBase() {
  return getRequiredEnv("QA_RUNNER_BASE_URL");
}

export function getQaRunnerToken() {
  return getRequiredEnv("QA_RUNNER_TOKEN");
}

export async function qaRunnerFetch(path: string, init?: RequestInit) {
  const base = getQaRunnerBase().replace(/\/$/, "");
  const token = getQaRunnerToken();

  if (!base) {
    return new Response(JSON.stringify({ error: "QA runner is not configured on the server." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  const headers = new Headers(init?.headers ?? {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json");

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      status: res.status,
      headers: { "Content-Type": contentType || "application/octet-stream" },
    });
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    return new Response(JSON.stringify(data ?? { error: `Runner request failed (${res.status})` }), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
