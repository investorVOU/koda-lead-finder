import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
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

type Device =
  {
    width: number;

    label: string;
  };

const DEVICES:
  Record<
    PreviewMode,
    Device
  > = {
  desktop: {
    width: 1440,

    label:
      "Desktop",
  },

  tablet: {
    width: 768,

    label:
      "Tablet",
  },

  mobile: {
    width: 390,

    label:
      "Mobile",
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

function removeModuleSyntax(
  source: string,
) {
  return source
    .split("\n")
    .filter(
      (line) =>
        !line
          .trim()
          .startsWith(
            "import ",
          ),
    )
    .join("\n")
    .replace(
      /export\s+default\s+function\s+/g,
      "function ",
    )
    .replace(
      /export\s+function\s+/g,
      "function ",
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

function buildLegacyPreviewDoc(
  files:
    Record<
      string,
      string
    >,
) {
  const html =
    files[
      "index.html"
    ] ||
    files[
      "index.htm"
    ];

  if (!html) {
    return null;
  }

  let doc =
    html.replace(
      /<link\s+[^>]*href="([^"?#]+\.css)"[^>]*\/?>/gi,

      (
        _,
        href: string,
      ) => {
        const key =
          href.replace(
            /^\.?\//,
            "",
          );

        const css =
          files[
            key
          ] ||
          files[
            href
          ];

        return css
          ? `<style>${css}</style>`
          : "";
      },
    );

  doc =
    doc.replace(
      /<script\s+[^>]*src="([^"?#]+\.js)"[^>]*><\/script>/gi,

      (
        _,
        src: string,
      ) => {
        const key =
          src.replace(
            /^\.?\//,
            "",
          );

        const js =
          files[
            key
          ] ||
          files[
            src
          ];

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
  files:
    Record<
      string,
      string
    >,
) {
  if (
    !files[
      "src/App.jsx"
    ] ||
    !files[
      "src/data/site.js"
    ]
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

  const data =
    removeModuleSyntax(
      files[
        "src/data/site.js"
      ],
    );

  const components =
    componentPaths
      .map(
        (path) =>
          removeModuleSyntax(
            files[
              path
            ],
          ),
      )
      .join(
        "\n\n",
      );

  const app =
    removeModuleSyntax(
      files[
        "src/App.jsx"
      ],
    );

  const css =
    files[
      "src/styles/global.css"
    ] ??
    "";

  const appScript =
    escapeScriptEnd(
      `
${data}

${components}

${app}

const previewRoot =
  ReactDOM.createRoot(
    document.getElementById(
      "root",
    ),
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
      min-height: 100%;
    }

    ${css}
  </style>
</head>

<body>
  <div id="root"></div>

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
    ${appScript}
  </script>
</body>
</html>`;
}

function buildPreviewDoc(
  files:
    Record<
      string,
      string
    >,
) {
  const react =
    buildReactPreviewDoc(
      files,
    );

  if (react) {
    return react;
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
  files:
    Record<
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
    useRef<HTMLDivElement | null>(
      null,
    );

  const previewDoc =
    useMemo(
      () =>
        buildPreviewDoc(
          files,
        ),

      [files],
    );

  const filesJson =
    JSON.stringify(
      files,
    );

  const previousFilesJson =
    useRef(
      filesJson,
    );

  useEffect(
    () => {
      if (
        previousFilesJson.current !==
        filesJson
      ) {
        previousFilesJson.current =
          filesJson;

        setRefreshKey(
          (current) =>
            current + 1,
        );
      }
    },

    [filesJson],
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

  /*
   * The iframe always keeps the real device width.
   *
   * If Kodarai Studio itself is narrower,
   * we visually scale the entire device preview.
   *
   * The CSS inside the website still sees:
   *
   * Mobile = 390px
   * Tablet = 768px
   * Desktop = 1440px
   */
  const availableWidth =
    Math.max(
      viewportSize.width -
        24,
      1,
    );

  const scale =
    Math.min(
      1,
      availableWidth /
        device.width,
    );

  const renderedWidth =
    device.width *
    scale;

  const iframeHeight =
    Math.max(
      600,
      (
        viewportSize.height -
        24
      ) /
        Math.max(
          scale,
          0.01,
        ),
    );

  if (previewDoc) {
    return (
      <div className="flex h-full flex-col bg-[#0f0f12]">
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/5 bg-[#1a1a20] px-3">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />

            <div className="h-3 w-3 rounded-full bg-[#febc2e]" />

            <div className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>

          <div className="mx-1 flex h-6 flex-1 items-center rounded-md border border-white/5 bg-[#0f0f12] px-3">
            <Globe className="mr-1.5 h-3 w-3 shrink-0 text-zinc-600" />

            <span className="truncate font-mono text-[11px] text-zinc-500">
              {deploymentUrl
                ? deploymentUrl.replace(
                    /^https?:\/\//,
                    "",
                  )
                : "preview — kodarai studio"}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() =>
                setRefreshKey(
                  (current) =>
                    current +
                    1,
                )
              }
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-white/5 hover:text-zinc-300"
              title="Refresh preview"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            {deploymentUrl && (
              <a
                href={
                  deploymentUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-500 transition-colors hover:bg-white/5"
                title="Open live site"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        <div className="flex h-10 shrink-0 items-center justify-center gap-1 border-b border-white/5 bg-[#15151b] px-2">
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
                className={`rounded-md px-3 py-1.5 text-[10px] font-medium transition-colors ${
                  previewMode ===
                  mode
                    ? "bg-white/10 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
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

        <div
          ref={
            previewAreaRef
          }
          className="relative flex-1 overflow-auto bg-[#202025] p-3"
        >
          <div
            className="mx-auto overflow-hidden bg-white shadow-2xl"
            style={{
              width:
                renderedWidth,

              height:
                Math.max(
                  viewportSize.height -
                    24,
                  1,
                ),
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
                className="border-0"
                style={{
                  width:
                    device.width,

                  height:
                    iframeHeight,
                }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#0f0f12]">
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #fff 1px, transparent 1px)",

          backgroundSize:
            "28px 28px",
        }}
      />

      <div className="relative z-10 flex max-w-xs flex-col items-center px-6 text-center">
        {deploymentUrl ? (
          <>
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
              <Globe className="h-8 w-8 text-emerald-400" />
            </div>

            <h3 className="mb-1.5 text-sm font-semibold text-zinc-100">
              Live on the web
            </h3>

            <p className="mb-5 break-all font-mono text-[11px] leading-relaxed text-zinc-500">
              {deploymentUrl.replace(
                "https://",
                "",
              )}
            </p>

            <a
              href={
                deploymentUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button className="h-9 w-full gap-2 bg-emerald-500 text-xs font-medium text-white hover:bg-emerald-600">
                <ExternalLink className="h-3.5 w-3.5" />

                Open live site
              </Button>
            </a>
          </>
        ) : (
          <>
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02]">
              <Globe className="h-7 w-7 text-zinc-600" />
            </div>

            <h3 className="mb-2 text-sm font-semibold text-zinc-200">
              No preview yet
            </h3>

            <p className="mb-6 text-xs leading-relaxed text-zinc-500">
              {fileCount >
              0
                ? `${fileCount} project files are available, but Studio could not create a preview.`
                : "Generate a website and the live preview will appear here."}
            </p>

            <Button
              onClick={
                onDeploy
              }
              variant="outline"
              className="h-9 w-full gap-2 border-white/10 bg-transparent text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            >
              <Rocket className="h-3.5 w-3.5" />

              Deploy to Vercel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
