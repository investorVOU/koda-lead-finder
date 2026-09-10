import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  ExternalLink,
  Globe,
  RefreshCw,
  Rocket,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

type PreviewMode =
  | "desktop"
  | "tablet"
  | "mobile";

type Device = {
  width: number;

  label: string;
};

const DEVICES: Record<
  PreviewMode,
  Device
> = {
  desktop: {
    width: 1440,
    label: "Desktop",
  },

  tablet: {
    width: 768,
    label: "Tablet",
  },

  mobile: {
    width: 390,
    label: "Mobile",
  },
};

function escapeScriptEnd(
  value: string,
) {
  return value.replace(
    /<\/script/gi,
    "<\\/script",
  );
}

function removeImports(
  source: string,
) {
  /*
   * Handles both:
   *
   * import { x } from "..."
   *
   * and multiline:
   *
   * import {
   *   x,
   * } from "...";
   */
  return source.replace(
    /import\s+(?:(?:[\w*\s{},]+)\s+from\s+)?["'][^"']+["'];?/g,
    "",
  );
}

function removeExports(
  source: string,
) {
  return source
    .replace(
      /export\s+default\s+function\s+/g,
      "function ",
    )
    .replace(
      /export\s+function\s+/g,
      "function ",
    )
    .replace(
      /export\s+default\s+/g,
      "",
    )
    .replace(
      /export\s+const\s+/g,
      "const ",
    )
    .replace(
      /export\s+let\s+/g,
      "let ",
    )
    .replace(
      /export\s+var\s+/g,
      "var ",
    );
}

function prepareModule(
  source: string,
) {
  return removeExports(
    removeImports(
      source,
    ),
  );
}

function normalizeAssetPath(
  value: string,
) {
  return value
    .replace(
      /^\.?\//,
      "",
    )
    .replace(
      /^\//,
      "",
    );
}

function buildLegacyPreviewDoc(
  files: Record<
    string,
    string
  >,
) {
  const html =
    files["index.html"] ||
    files["index.htm"];

  if (!html) {
    return null;
  }

  let doc =
    html.replace(
      /<link\s+[^>]*href=["']([^"'?#]+\.css)["'][^>]*\/?>/gi,
      (
        _,
        href: string,
      ) => {
        const key =
          normalizeAssetPath(
            href,
          );

        const css =
          files[key] ||
          files[href];

        return css
          ? `<style>${css}</style>`
          : "";
      },
    );

  doc =
    doc.replace(
      /<script\s+[^>]*src=["']([^"'?#]+\.js)["'][^>]*><\/script>/gi,
      (
        _,
        src: string,
      ) => {
        const key =
          normalizeAssetPath(
            src,
          );

        const js =
          files[key] ||
          files[src];

        return js
          ? `<script>${escapeScriptEnd(
              js,
            )}</script>`
          : "";
      },
    );

  return doc;
}

function buildReactPreviewDoc(
  files: Record<
    string,
    string
  >,
) {
  const appSource =
    files[
      "src/App.jsx"
    ];

  const siteSource =
    files[
      "src/data/site.js"
    ];

  if (
    !appSource ||
    !siteSource
  ) {
    return null;
  }

  const componentPaths =
    Object.keys(
      files,
    )
      .filter(
        (path) =>
          path.startsWith(
            "src/components/",
          ) &&
          path.endsWith(
            ".jsx",
          ),
      )
      .sort();

  const siteCode =
    prepareModule(
      siteSource,
    );

  const componentsCode =
    componentPaths
      .map(
        (path) =>
          prepareModule(
            files[path],
          ),
      )
      .join(
        "\n\n",
      );

  const appCode =
    prepareModule(
      appSource,
    );

  const css =
    files[
      "src/styles/global.css"
    ] ?? "";

  /*
   * Critical:
   *
   * Generated components normally import hooks such as:
   *
   * import { useState } from "react";
   *
   * We remove imports for the iframe preview, so expose those
   * hooks from the global React object manually.
   */
  const runtimeBindings = `
const {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useLayoutEffect,
  useContext,
  useReducer,
} = React;
`;

  const application =
    escapeScriptEnd(
      `
${runtimeBindings}

${siteCode}

${componentsCode}

${appCode}

const previewContainer =
  document.getElementById(
    "root",
  );

if (!previewContainer) {
  throw new Error(
    "Preview root element was not found.",
  );
}

const previewRoot =
  ReactDOM.createRoot(
    previewContainer,
  );

previewRoot.render(
  <App />
);
`,
    );

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <style>
    html,
    body,
    #root {
      width: 100%;
      min-height: 100%;
      margin: 0;
    }

    body {
      overflow-x: hidden;
    }

    ${css}

    #kodarai-preview-error {
      display: none;
      box-sizing: border-box;
      margin: 20px;
      padding: 16px;
      border: 1px solid #fecaca;
      border-radius: 12px;
      background: #fef2f2;
      color: #991b1b;
      font-family:
        ui-monospace,
        SFMono-Regular,
        Menlo,
        Monaco,
        Consolas,
        monospace;
      font-size: 12px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
  </style>
</head>

<body>
  <div id="root"></div>

  <pre id="kodarai-preview-error"></pre>

  <script>
    window.addEventListener(
      "error",
      function (event) {
        var element =
          document.getElementById(
            "kodarai-preview-error"
          );

        if (!element) {
          return;
        }

        element.style.display =
          "block";

        element.textContent =
          "Preview error:\\n\\n" +
          (
            event.error &&
            event.error.stack
              ? event.error.stack
              : event.message
          );
      }
    );

    window.addEventListener(
      "unhandledrejection",
      function (event) {
        var element =
          document.getElementById(
            "kodarai-preview-error"
          );

        if (!element) {
          return;
        }

        element.style.display =
          "block";

        element.textContent =
          "Preview error:\\n\\n" +
          String(
            event.reason &&
            event.reason.stack
              ? event.reason.stack
              : event.reason
          );
      }
    );
  </script>

  <script
    crossorigin
    src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"
  ></script>

  <script
    crossorigin
    src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"
  ></script>

  <script
    src="https://unpkg.com/@babel/standalone@7.26.9/babel.min.js"
  ></script>

  <script
    type="text/babel"
    data-presets="react"
  >
    ${application}
  </script>
</body>
</html>`;
}

function buildPreviewDoc(
  files: Record<
    string,
    string
  >,
) {
  const reactDoc =
    buildReactPreviewDoc(
      files,
    );

  if (reactDoc) {
    return reactDoc;
  }

  return buildLegacyPreviewDoc(
    files,
  );
}

export function StudioLivePreview({
  files,
  deploymentUrl,
  onDeploy,
  fileCount,
}: {
  files: Record<
    string,
    string
  >;

  deploymentUrl:
    | string
    | null;

  onDeploy:
    () => void;

  fileCount:
    number;
}) {
  const [
    refreshKey,
    setRefreshKey,
  ] =
    useState(0);

  const [
    previewMode,
    setPreviewMode,
  ] =
    useState<PreviewMode>(
      "desktop",
    );

  const [
    viewportSize,
    setViewportSize,
  ] =
    useState({
      width: 0,
      height: 0,
    });

  const previewAreaRef =
    useRef<
      HTMLDivElement | null
    >(null);

  const previewDoc =
    useMemo(
      () =>
        buildPreviewDoc(
          files,
        ),
      [files],
    );

  const filesSignature =
    useMemo(
      () =>
        JSON.stringify(
          files,
        ),
      [files],
    );

  const previousSignature =
    useRef(
      filesSignature,
    );

  useEffect(
    () => {
      if (
        previousSignature.current ===
        filesSignature
      ) {
        return;
      }

      previousSignature.current =
        filesSignature;

      setRefreshKey(
        (current) =>
          current + 1,
      );
    },
    [filesSignature],
  );

  useEffect(
    () => {
      const element =
        previewAreaRef.current;

      if (!element) {
        return;
      }

      const update =
        () => {
          const rect =
            element.getBoundingClientRect();

          setViewportSize({
            width:
              rect.width,
            height:
              rect.height,
          });
        };

      update();

      const observer =
        new ResizeObserver(
          update,
        );

      observer.observe(
        element,
      );

      return () =>
        observer.disconnect();
    },
    [],
  );

  const device =
    DEVICES[
      previewMode
    ];

  const availableWidth =
    Math.max(
      viewportSize.width -
        24,
      1,
    );

  /*
   * Never shrink the actual iframe viewport.
   *
   * The website always sees exactly:
   *
   * Mobile  = 390px
   * Tablet  = 768px
   * Desktop = 1440px
   *
   * We only visually scale the iframe shell.
   */
  const scale =
    Math.min(
      1,
      availableWidth /
        device.width,
    );

  const visualWidth =
    device.width *
    scale;

  const visualHeight =
    Math.max(
      viewportSize.height -
        24,
      200,
    );

  const iframeHeight =
    Math.max(
      visualHeight /
        Math.max(
          scale,
          0.01,
        ),
      760,
    );

  if (!previewDoc) {
    return (
      <div className="relative flex h-full flex-1 flex-col items-center justify-center overflow-hidden bg-[#101013] px-6">
        <div className="flex max-w-[310px] flex-col items-center text-center">
          <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03]">
            <AlertTriangle className="size-5 text-zinc-600" />
          </div>

          <p className="text-sm font-medium text-zinc-200">
            Preview unavailable
          </p>

          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Studio needs either
            a React project with
            src/App.jsx and
            src/data/site.js, or
            a legacy index.html
            project.
          </p>

          <p className="mt-3 font-mono text-[10px] text-zinc-700">
            {fileCount} project
            file
            {fileCount === 1
              ? ""
              : "s"}
          </p>

          {deploymentUrl ? (
            <a
              href={
                deploymentUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5"
            >
              <Button
                size="sm"
                variant="outline"
                className="gap-2 border-white/10 bg-transparent text-xs text-zinc-300"
              >
                <ExternalLink className="size-3.5" />

                Open live site
              </Button>
            </a>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={
                onDeploy
              }
              disabled={
                fileCount ===
                0
              }
              className="mt-5 gap-2 border-white/10 bg-transparent text-xs text-zinc-300"
            >
              <Rocket className="size-3.5" />

              Publish
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col bg-[#101013]">
      {/* Browser toolbar */}

      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#17171b] px-3">
        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="size-2.5 rounded-full bg-red-400/80" />
          <span className="size-2.5 rounded-full bg-yellow-400/80" />
          <span className="size-2.5 rounded-full bg-green-400/80" />
        </div>

        <div className="flex h-6 min-w-0 flex-1 items-center rounded-md border border-white/[0.05] bg-[#0f0f12] px-2.5">
          <Globe className="mr-1.5 size-3 shrink-0 text-zinc-600" />

          <span className="truncate font-mono text-[10px] text-zinc-500">
            {deploymentUrl
              ? deploymentUrl.replace(
                  /^https?:\/\//,
                  "",
                )
              : "preview — kodarai studio"}
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            setRefreshKey(
              (current) =>
                current + 1,
            )
          }
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-white/5 hover:text-zinc-300"
          title="Refresh preview"
        >
          <RefreshCw className="size-3.5" />
        </button>

        {deploymentUrl && (
          <a
            href={
              deploymentUrl
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-white/5 hover:text-emerald-400"
          >
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      {/* Device selector */}

      <div className="flex h-11 shrink-0 items-center justify-center border-b border-white/[0.06] bg-[#131317] px-2">
        <div className="inline-flex rounded-lg bg-white/[0.035] p-1">
          {(
            [
              "desktop",
              "tablet",
              "mobile",
            ] as const
          ).map(
            (mode) => (
              <button
                key={
                  mode
                }
                type="button"
                onClick={() =>
                  setPreviewMode(
                    mode,
                  )
                }
                className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  previewMode ===
                  mode
                    ? "bg-white/10 text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {
                  DEVICES[
                    mode
                  ].label
                }
              </button>
            ),
          )}
        </div>
      </div>

      {/* Preview stage */}

      <div
        ref={
          previewAreaRef
        }
        className="relative flex min-h-0 min-w-0 flex-1 overflow-auto bg-[#242429] p-3"
      >
        <div
          className="relative mx-auto shrink-0 overflow-hidden bg-white shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
          style={{
            width:
              visualWidth,
            height:
              visualHeight,
          }}
        >
          <div
            style={{
              width:
                device.width,
              height:
                iframeHeight,
              transform:
                `scale(${scale})`,
              transformOrigin:
                "top left",
            }}
          >
            <iframe
              key={`${refreshKey}-${previewMode}`}
              srcDoc={
                previewDoc
              }
              title={`${device.label} website preview`}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              className="block border-0 bg-white"
              style={{
                width:
                  device.width,
                height:
                  iframeHeight,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
