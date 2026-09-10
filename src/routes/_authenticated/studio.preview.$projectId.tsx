import {
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  Button,
} from "@/components/ui/button";

import {
  StudioLivePreview,
} from "@/components/studio/StudioLivePreview";

import {
  getStudioProject,
} from "@/lib/studio.functions";

import {
  parseStudioFiles,
  toStudioFileMap,
} from "@/lib/studio-files";

import {
  useAuth,
} from "@/lib/auth";

export const Route =
  createFileRoute(
    "/_authenticated/studio/preview/$projectId",
  )({
    head: () => ({
      meta: [
        {
          title:
            "Website Preview — Kodarai",
        },
      ],
    }),

    component:
      StudioBrowserPreview,
  });

type PreviewMode =
  | "desktop"
  | "tablet"
  | "mobile";

function StudioBrowserPreview() {
  const {
    projectId,
  } =
    useParams({
      from:
        "/_authenticated/studio/preview/$projectId",
    });

  const navigate =
    useNavigate();

  const {
    user,
  } =
    useAuth();

  const runGetProject =
    useServerFn(
      getStudioProject,
    );

  const [
    refreshKey,
    setRefreshKey,
  ] =
    useState(0);

  const [
    mode,
    setMode,
  ] =
    useState<PreviewMode>(
      "desktop",
    );

  const {
    data,
    isLoading,
  } =
    useQuery({
      queryKey: [
        "studio-preview-project",
        projectId,
      ],

      queryFn:
        () =>
          runGetProject({
            data: {
              id:
                projectId,
            },
          }),

      enabled:
        Boolean(
          user &&
          projectId,
        ),
    });

  const project =
    data &&
    "project" in data
      ? data.project
      : null;

  const files =
    useMemo(
      () => {
        if (!project) {
          return {};
        }

        return toStudioFileMap(
          parseStudioFiles(
            project.files_json,
          ),
        );
      },

      [
        project,
        refreshKey,
      ],
    );

  const deploymentUrl =
    project?.deployment_url ??
    null;

  if (
    isLoading ||
    !project
  ) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#090c0e]">
        <Loader2 className="size-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#090c0e] text-zinc-100">
      {/* Browser toolbar */}

      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.07] bg-[#0d1013] px-2 sm:px-4">
        <button
          type="button"
          onClick={() =>
            navigate({
              to:
                "/studio/$projectId",

              params: {
                projectId,
              },
            })
          }
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-100"
          title="Back to Studio"
        >
          <ArrowLeft className="size-4" />
        </button>

        <div className="hidden h-5 w-px bg-white/[0.07] sm:block" />

        {/* Address bar */}

        <div className="flex h-9 min-w-0 flex-1 items-center rounded-xl border border-white/[0.07] bg-black/25 px-3">
          <span className="mr-2 size-1.5 shrink-0 rounded-full bg-emerald-400" />

          <span className="truncate font-mono text-[11px] text-zinc-500">
            {deploymentUrl
              ? deploymentUrl.replace(
                  /^https?:\/\//,
                  "",
                )
              : `preview.kodarai.xyz/${projectId}`}
          </span>
        </div>

        {/* Device controls */}

        <div className="hidden items-center rounded-xl border border-white/[0.07] bg-white/[0.025] p-1 md:flex">
          <DeviceButton
            active={
              mode ===
              "desktop"
            }
            onClick={() =>
              setMode(
                "desktop",
              )
            }
            title="Desktop"
          >
            <Monitor className="size-3.5" />
          </DeviceButton>

          <DeviceButton
            active={
              mode ===
              "tablet"
            }
            onClick={() =>
              setMode(
                "tablet",
              )
            }
            title="Tablet"
          >
            <Tablet className="size-3.5" />
          </DeviceButton>

          <DeviceButton
            active={
              mode ===
              "mobile"
            }
            onClick={() =>
              setMode(
                "mobile",
              )
            }
            title="Mobile"
          >
            <Smartphone className="size-3.5" />
          </DeviceButton>
        </div>

        <button
          type="button"
          onClick={() =>
            setRefreshKey(
              (value) =>
                value + 1,
            )
          }
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-zinc-100"
        >
          <RefreshCw className="size-4" />
        </button>

        {deploymentUrl && (
          <a
            href={
              deploymentUrl
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-emerald-400 transition hover:bg-emerald-500/10"
          >
            <ExternalLink className="size-4" />
          </a>
        )}
      </header>

      {/* Mobile viewport switcher */}

      <div className="grid h-12 shrink-0 grid-cols-3 border-b border-white/[0.06] bg-[#0b0e11] px-3 md:hidden">
        <MobileDeviceButton
          active={
            mode ===
            "desktop"
          }
          onClick={() =>
            setMode(
              "desktop",
            )
          }
        >
          Desktop
        </MobileDeviceButton>

        <MobileDeviceButton
          active={
            mode ===
            "tablet"
          }
          onClick={() =>
            setMode(
              "tablet",
            )
          }
        >
          Tablet
        </MobileDeviceButton>

        <MobileDeviceButton
          active={
            mode ===
            "mobile"
          }
          onClick={() =>
            setMode(
              "mobile",
            )
          }
        >
          Mobile
        </MobileDeviceButton>
      </div>

      <div
        key={
          `${refreshKey}-${mode}`
        }
        className="min-h-0 flex-1"
      >
        <StudioLivePreview
          files={
            files
          }
          deploymentUrl={
            deploymentUrl
          }
          fileCount={
            Object.keys(
              files,
            ).length
          }
          onDeploy={() =>
            navigate({
              to:
                "/studio/$projectId",

              params: {
                projectId,
              },
            })
          }
        />
      </div>
    </div>
  );
}

function DeviceButton({
  active,
  onClick,
  title,
  children,
}: {
  active:
    boolean;

  onClick:
    () => void;

  title:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={
        title
      }
      onClick={
        onClick
      }
      className={`flex size-7 items-center justify-center rounded-lg transition ${
        active
          ? "bg-white/10 text-zinc-100"
          : "text-zinc-600 hover:text-zinc-300"
      }`}
    >
      {
        children
      }
    </button>
  );
}

function MobileDeviceButton({
  active,
  onClick,
  children,
}: {
  active:
    boolean;

  onClick:
    () => void;

  children:
    React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`relative text-[11px] font-medium ${
        active
          ? "text-emerald-400"
          : "text-zinc-600"
      }`}
    >
      {
        children
      }

      {active && (
        <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-emerald-400" />
      )}
    </button>
  );
}
