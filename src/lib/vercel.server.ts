import { createHash } from "node:crypto";

import type { StudioFile } from "@/lib/studio-files";

const API_BASE = "https://api.vercel.com";

type VercelProject = {
  id: string;

  name: string;
};

type VercelDeployment = {
  id: string;

  url?: string;

  readyState?: "INITIALIZING" | "BUILDING" | "READY" | "ERROR" | "CANCELED" | string;

  errorMessage?: string;

  alias?: string[];
};

export type VercelDomainVerification = {
  type: string;
  domain: string;
  value: string;
  reason?: string;
};

export type VercelProjectDomain = {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  verification?: VercelDomainVerification[];
};

export type VercelDomainConfiguration = {
  configuredBy?: "A" | "CNAME" | "http" | "dns-01" | null | string;
  acceptedChallenges?: string[];
  recommendedIPv4?: Array<{ rank?: number; value?: string[] }>;
  recommendedCNAME?: Array<{ rank?: number; value?: string }>;
  misconfigured?: boolean;
};

export class VercelApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "VercelApiError";
  }
}

function token(): string {
  const value = process.env.VERCEL_TOKEN;

  if (!value) {
    throw new Error("Vercel is not configured. Ask an administrator to set VERCEL_TOKEN.");
  }

  return value;
}

function withTeam(path: string): string {
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!teamId) {
    return `${API_BASE}${path}`;
  }

  return `${API_BASE}${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(teamId)}`;
}

async function request<T>(
  path: string,

  init?: RequestInit,
): Promise<T> {
  const response = await fetch(withTeam(path), {
    ...init,

    headers: {
      Authorization: `Bearer ${token()}`,

      ...(init?.headers ?? {}),
    },

    signal: AbortSignal.timeout(30_000),
  });

  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: {
      message?: string;
    };

    message?: string;
  };

  if (!response.ok) {
    throw new VercelApiError(
      payload.error?.message || payload.message || `Vercel API failed (${response.status}).`,
      response.status,
    );
  }

  return payload;
}

function projectName(slug: string): string {
  return `kodarai-${slug}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, 52);
}

export async function createVercelProject(
  slug: string,

  existingId?: string | null,

  existingName?: string | null,
): Promise<VercelProject> {
  if (existingId && existingName) {
    return {
      id: existingId,

      name: existingName,
    };
  }

  const name = projectName(slug);

  try {
    return await request<VercelProject>("/v9/projects", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        name,
      }),
    });
  } catch (error) {
    const response = await fetch(withTeam(`/v9/projects/${encodeURIComponent(name)}`), {
      headers: {
        Authorization: `Bearer ${token()}`,
      },

      signal: AbortSignal.timeout(30_000),
    });

    if (response.ok) {
      return (await response.json()) as VercelProject;
    }

    throw error;
  }
}

async function uploadFile(file: StudioFile): Promise<{
  file: string;

  sha: string;

  size: number;
}> {
  const bytes = new TextEncoder().encode(file.content);

  const sha = createHash("sha1").update(bytes).digest("hex");

  const response = await fetch(withTeam("/v2/now/files"), {
    method: "POST",

    headers: {
      Authorization: `Bearer ${token()}`,

      "Content-Type": "application/octet-stream",

      "x-vercel-digest": sha,
    },

    body: bytes,

    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: {
        message?: string;
      };

      message?: string;
    };

    throw new Error(
      payload.error?.message ||
        payload.message ||
        `Vercel file upload failed (${response.status}).`,
    );
  }

  return {
    file: file.path,

    sha,

    size: bytes.byteLength,
  };
}

function isViteProject(files: StudioFile[]) {
  const paths = new Set(files.map((file) => file.path));

  return (
    paths.has("package.json") &&
    (paths.has("vite.config.js") || paths.has("vite.config.ts") || paths.has("vite.config.mjs"))
  );
}

export async function deployToVercel(input: {
  projectName: string;

  files: StudioFile[];
}): Promise<VercelDeployment> {
  if (!input.files.some((file) => file.path === "index.html")) {
    throw new Error("A website project needs index.html before it can be published.");
  }

  const vite = isViteProject(input.files);

  const files = await Promise.all(input.files.map(uploadFile));

  return request<VercelDeployment>("/v13/deployments?forceNew=1", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      name: input.projectName,

      files,

      target: "production",

      projectSettings: vite
        ? {
            framework: "vite",

            buildCommand: "npm run build",

            installCommand: "npm install",

            outputDirectory: "dist",

            nodeVersion: "22.x",
          }
        : {
            framework: null,
          },
    }),
  });
}

export async function getVercelDeployment(id: string): Promise<VercelDeployment> {
  return request<VercelDeployment>(`/v13/deployments/${encodeURIComponent(id)}`);
}

export async function getVercelDeploymentLogs(id: string): Promise<string> {
  const logs = await request<
    Array<{
      text?: string;
    }>
  >(`/v3/deployments/${encodeURIComponent(id)}/events?direction=backward&limit=30`);

  return logs
    .map((entry) => entry.text)
    .filter(Boolean)
    .join("\n")
    .slice(-4000);
}

export async function waitForVercelDeployment(
  id: string,

  timeoutMs = 95_000,
): Promise<VercelDeployment> {
  const started = Date.now();

  let latest = await getVercelDeployment(id);

  while (Date.now() - started < timeoutMs) {
    if (latest.readyState === "READY") {
      return latest;
    }

    if (latest.readyState === "ERROR" || latest.readyState === "CANCELED") {
      const logs = await getVercelDeploymentLogs(id).catch(() => "");

      throw new Error(logs || latest.errorMessage || "Vercel could not build this website.");
    }

    await new Promise((resolve) => setTimeout(resolve, 2500));

    latest = await getVercelDeployment(id);
  }

  return latest;
}

export function publicVercelUrl(deployment: VercelDeployment): string | null {
  const hostname = deployment.alias?.[0] || deployment.url;

  return hostname ? `https://${hostname.replace(/^https?:\/\//, "")}` : null;
}

export async function addVercelProjectDomain(
  projectId: string,
  domain: string,
): Promise<VercelProjectDomain> {
  return request<VercelProjectDomain>(`/v10/projects/${encodeURIComponent(projectId)}/domains`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: domain }),
  });
}

export async function getVercelProjectDomain(
  projectId: string,
  domain: string,
): Promise<VercelProjectDomain> {
  return request<VercelProjectDomain>(
    `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`,
  );
}

export async function verifyVercelProjectDomain(
  projectId: string,
  domain: string,
): Promise<VercelProjectDomain> {
  return request<VercelProjectDomain>(
    `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}/verify`,
    { method: "POST", headers: { "Content-Type": "application/json" } },
  );
}

export async function getVercelDomainConfiguration(
  projectId: string,
  domain: string,
): Promise<VercelDomainConfiguration> {
  return request<VercelDomainConfiguration>(
    `/v6/domains/${encodeURIComponent(domain)}/config?projectIdOrName=${encodeURIComponent(projectId)}`,
  );
}

export async function removeVercelProjectDomain(projectId: string, domain: string): Promise<void> {
  await request<unknown>(
    `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`,
    { method: "DELETE", headers: { "Content-Type": "application/json" } },
  );
}
