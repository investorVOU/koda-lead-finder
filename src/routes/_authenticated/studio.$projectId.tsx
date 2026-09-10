import {
  createFileRoute,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  formatDistanceToNow,
} from "date-fns";

import {
  toast,
} from "sonner";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Eye,
  File,
  FileCode,
  FileJson,
  FileType2,
  Folder,
  FolderOpen,
  History,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Rocket,
  Save,
  Send,
  X,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  StudioLivePreview,
} from "@/components/studio/StudioLivePreview";

import {
  useAuth,
} from "@/lib/auth";

import {
  supabase,
} from "@/integrations/supabase/client";

import {
  useAnimatedPlaceholder,
} from "@/hooks/use-animated-placeholder";

import {
  useIsMobile,
} from "@/hooks/use-mobile";

import {
  createStudioMessage,
  createStudioSnapshot,
  deployBusinessWebsite,
  getBusinessWebsiteDeploymentStatus,
  getStudioProject,
  listStudioMessages,
  listStudioSnapshots,
  saveStudioFiles,
  undoLastBusinessWebsiteEdit,
  updateStudioProject,
  type StudioMessage,
  type StudioSnapshot,
} from "@/lib/studio.functions";

import {
  applyBusinessWebsiteEdit,
  generateBusinessWebsite,
} from "@/lib/studio-builder-v2.functions";

import {
  fromStudioFileMap,
  isSafeStudioPath,
  parseStudioFiles,
  toStudioFileMap,
} from "@/lib/studio-files";

const MonacoEditor =
  lazy(
    () =>
      import(
        "@monaco-editor/react"
      ),
  );

export const Route =
  createFileRoute(
    "/_authenticated/studio/$projectId",
  )({
    head: () => ({
      meta: [
        {
          title:
            "Studio Builder — Kodarai",
        },
      ],
    }),

    validateSearch: (
      search: Record<
        string,
        unknown
      >,
    ) => ({
      generate:
        search.generate ===
        "1"
          ? "1"
          : undefined,
    }),

    component:
      StudioBuilder,
  });

type FileAction =
  | "create"
  | "update"
  | "delete";

type FileChange = {
  path: string;

  action:
    FileAction;

  content: string;
};

type StreamEvent =
  | {
      type:
        "progress";
    }
  | {
      type:
        "text";

      text:
        string;
    }
  | {
      type:
        "files";

      fileChanges:
        FileChange[];
    }
  | {
      type:
        "done";

      summary?:
        string;

      fileChanges?:
        FileChange[];
    }
  | {
      type:
        "error";

      error:
        string;
    };

type MobileTab =
  | "chat"
  | "code"
  | "preview"
  | "deploy";

type TreeNode = {
  name: string;

  path: string;

  kind:
    | "file"
    | "folder";

  children:
    TreeNode[];
};

const CHAT_PLACEHOLDERS = [
  "Make the hero feel more premium...",
  "Add a gallery section...",
  "Change the color scheme...",
  "Improve the mobile layout...",
  "Add a WhatsApp call to action...",
];

const QUICK_ACTIONS = [
  "Make the hero section more modern",
  "Add a contact form",
  "Change the color scheme",
  "Add a gallery section",
];

const REQUIRED_FILES =
  new Set([
    "index.html",
    "package.json",
    "src/main.jsx",
    "src/App.jsx",
  ]);

function applyStructuredChanges(
  current:
    Record<
      string,
      string
    >,

  changes:
    FileChange[],
) {
  const next = {
    ...current,
  };

  for (
    const change of
    changes
  ) {
    if (
      change.action ===
      "delete"
    ) {
      delete next[
        change.path
      ];
    } else {
      next[
        change.path
      ] =
        change.content;
    }
  }

  return next;
}

function buildTree(
  paths: string[],
): TreeNode[] {
  const root:
    TreeNode[] =
    [];

  for (
    const fullPath of
    [...paths].sort()
  ) {
    const parts =
      fullPath.split(
        "/",
      );

    let level =
      root;

    let currentPath =
      "";

    parts.forEach(
      (
        part,
        index,
      ) => {
        currentPath =
          currentPath
            ? `${currentPath}/${part}`
            : part;

        const isFile =
          index ===
          parts.length -
            1;

        let node =
          level.find(
            (item) =>
              item.name ===
                part &&
              item.kind ===
                (
                  isFile
                    ? "file"
                    : "folder"
                ),
          );

        if (!node) {
          node = {
            name:
              part,

            path:
              currentPath,

            kind:
              isFile
                ? "file"
                : "folder",

            children:
              [],
          };

          level.push(
            node,
          );
        }

        level =
          node.children;
      },
    );
  }

  const sort =
    (
      nodes:
        TreeNode[],
    ) => {
      nodes.sort(
        (
          a,
          b,
        ) => {
          if (
            a.kind !==
            b.kind
          ) {
            return a.kind ===
              "folder"
              ? -1
              : 1;
          }

          return a.name.localeCompare(
            b.name,
          );
        },
      );

      nodes.forEach(
        (node) =>
          sort(
            node.children,
          ),
      );
    };

  sort(
    root,
  );

  return root;
}

function StudioBuilder() {
  const {
    projectId,
  } =
    useParams({
      from:
        "/_authenticated/studio/$projectId",
    });

  const {
    generate,
  } =
    useSearch({
      from:
        "/_authenticated/studio/$projectId",
    });

  const navigate =
    useNavigate();

  const {
    user,
  } =
    useAuth();

  const isMobile =
    useIsMobile();

  const queryClient =
    useQueryClient();

  const runGetProject =
    useServerFn(
      getStudioProject,
    );

  const runListMessages =
    useServerFn(
      listStudioMessages,
    );

  const runListSnapshots =
    useServerFn(
      listStudioSnapshots,
    );

  const runCreateMessage =
    useServerFn(
      createStudioMessage,
    );

  const runCreateSnapshot =
    useServerFn(
      createStudioSnapshot,
    );

  const runUpdateProject =
    useServerFn(
      updateStudioProject,
    );

  const runSaveFiles =
    useServerFn(
      saveStudioFiles,
    );

  const runUndo =
    useServerFn(
      undoLastBusinessWebsiteEdit,
    );

  const runGenerateWebsite =
    useServerFn(
      generateBusinessWebsite,
    );

  const runEditWebsite =
    useServerFn(
      applyBusinessWebsiteEdit,
    );

  const runDeploy =
    useServerFn(
      deployBusinessWebsite,
    );

  const runDeploymentStatus =
    useServerFn(
      getBusinessWebsiteDeploymentStatus,
    );

  const {
    data:
      projectResponse,
  } =
    useQuery({
      queryKey: [
        "studio-project",
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
    projectResponse &&
    "project" in
      projectResponse
      ? projectResponse.project
      : null;

  const {
    data:
      messageResponse,

    refetch:
      refetchMessages,
  } =
    useQuery({
      queryKey: [
        "studio-messages",
        projectId,
      ],

      queryFn:
        () =>
          runListMessages({
            data: {
              project_id:
                projectId,
            },
          }),

      enabled:
        Boolean(
          user &&
          projectId,
        ),
    });

  const messages:
    StudioMessage[] =
      messageResponse
        ?.messages ??
      [];

  const {
    data:
      snapshotResponse,

    refetch:
      refetchSnapshots,
  } =
    useQuery({
      queryKey: [
        "studio-snapshots",
        projectId,
      ],

      queryFn:
        () =>
          runListSnapshots({
            data: {
              project_id:
                projectId,
            },
          }),

      enabled:
        Boolean(
          user &&
          projectId,
        ),
    });

  const snapshots:
    StudioSnapshot[] =
      snapshotResponse
        ?.snapshots ??
      [];

  const [
    files,
    setFiles,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    projectName,
    setProjectName,
  ] =
    useState("");

  const [
    editingName,
    setEditingName,
  ] =
    useState(
      false,
    );

  const [
    currentFile,
    setCurrentFile,
  ] =
    useState<
      string | null
    >(null);

  const [
    openFiles,
    setOpenFiles,
  ] =
    useState<
      string[]
    >([]);

  const [
    mobileTab,
    setMobileTab,
  ] =
    useState<MobileTab>(
      "chat",
    );

  const [
    filesOpen,
    setFilesOpen,
  ] =
    useState(
      false,
    );

  const [
    mounted,
    setMounted,
  ] =
    useState(
      false,
    );

  const [
    isStreaming,
    setIsStreaming,
  ] =
    useState(
      false,
    );

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(
      false,
    );

  const [
    showDeploy,
    setShowDeploy,
  ] =
    useState(
      false,
    );

  const [
    deploymentUrl,
    setDeploymentUrl,
  ] =
    useState<
      string | null
    >(null);

  const [
    optimisticMessages,
    setOptimisticMessages,
  ] =
    useState<
      StudioMessage[]
    >([]);

  const allMessages = [
    ...messages,
    ...optimisticMessages,
  ];

  const fileCount =
    Object.keys(
      files,
    ).length;

  const reactProject =
    Boolean(
      files[
        "src/App.jsx"
      ],
    );

  /*
   * Once generation finishes the backend stores
   * "restaurant", "salon", etc. in project.template.
   *
   * Therefore do NOT rely only on
   * project.template === "business-website"
   * when deciding whether to use Builder V2.
   */
  const kodaraiWebsite =
    Boolean(
      reactProject ||
      project?.template ===
        "business-website",
    );

  useEffect(
    () => {
      setMounted(
        true,
      );
    },
    [],
  );

  useEffect(
    () => {
      if (!project) {
        return;
      }

      if (
        !editingName
      ) {
        setProjectName(
          project.name,
        );
      }

      setDeploymentUrl(
        project.deployment_url ??
          null,
      );

      const mapped =
        toStudioFileMap(
          parseStudioFiles(
            project.files_json,
          ),
        );

      setFiles(
        mapped,
      );

      const paths =
        Object.keys(
          mapped,
        );

      if (
        paths.length ===
        0
      ) {
        return;
      }

      const preferred =
        paths.includes(
          "src/App.jsx",
        )
          ? "src/App.jsx"
          : paths.includes(
                "index.html",
              )
            ? "index.html"
            : paths[0];

      setCurrentFile(
        (current) =>
          current &&
          paths.includes(
            current,
          )
            ? current
            : preferred,
      );

      /*
       * Do not make App.jsx look like the only file.
       * Open the three most useful project files first.
       */
      const initialOpen = [
        "src/App.jsx",
        "src/data/site.js",
        "src/styles/global.css",
      ].filter(
        (path) =>
          paths.includes(
            path,
          ),
      );

      setOpenFiles(
        (current) => {
          const stillValid =
            current.filter(
              (path) =>
                paths.includes(
                  path,
                ),
            );

          if (
            stillValid.length >
            0
          ) {
            return stillValid;
          }

          return initialOpen.length >
            0
            ? initialOpen
            : [
                preferred,
              ];
        },
      );
    },
    [
      project?.id,
      project?.files_json,
      project?.name,
      project?.deployment_url,
      editingName,
    ],
  );

  /*
   * Auto-generate a project opened from Finder.
   */
  useEffect(
    () => {
      if (
        !project ||
        project.generation_status ===
          "ready" ||
        isStreaming
      ) {
        return;
      }

      if (
        project.template !==
          "business-website"
      ) {
        return;
      }

      if (
        generate !==
          "1" &&
        project.generation_status !==
          "idle"
      ) {
        return;
      }

      let cancelled =
        false;

      setIsStreaming(
        true,
      );

      runGenerateWebsite({
        data: {
          project_id:
            projectId,
        },
      })
        .then(
          (result) => {
            if (
              cancelled
            ) {
              return;
            }

            if (
              "error" in
              result
            ) {
              toast.error(
                result.message,
              );

              return;
            }

            const mapped =
              toStudioFileMap(
                result.files,
              );

            setFiles(
              mapped,
            );

            const paths =
              Object.keys(
                mapped,
              );

            const preferred =
              paths.includes(
                "src/App.jsx",
              )
                ? "src/App.jsx"
                : paths[0];

            if (
              preferred
            ) {
              setCurrentFile(
                preferred,
              );

              setOpenFiles(
                [
                  "src/App.jsx",
                  "src/data/site.js",
                  "src/styles/global.css",
                ].filter(
                  (path) =>
                    paths.includes(
                      path,
                    ),
                ),
              );
            }

            setMobileTab(
              "preview",
            );

            const remaining =
              result
                .studioCredits
                ?.remaining;

            toast.success(
              remaining ===
              null
                ? "Website ready — Studio credits are unlimited."
                : typeof remaining ===
                    "number"
                  ? `Website ready — ${result.studioCredits.charged} Studio credits used. ${remaining} remaining.`
                  : "Website ready.",
            );

            queryClient.invalidateQueries(
              {
                queryKey: [
                  "studio-project",
                  projectId,
                ],
              },
            );

            queryClient.invalidateQueries(
              {
                queryKey: [
                  "studio-messages",
                  projectId,
                ],
              },
            );

            queryClient.invalidateQueries(
              {
                queryKey: [
                  "studio-usage",
                ],
              },
            );

            void refetchMessages();
          },
        )
        .catch(
          () => {
            if (
              !cancelled
            ) {
              toast.error(
                "Website generation failed.",
              );
            }
          },
        )
        .finally(
          () => {
            if (
              !cancelled
            ) {
              setIsStreaming(
                false,
              );
            }
          },
        );

      return () => {
        cancelled =
          true;
      };
    },

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      generate,
      project?.id,
      project?.generation_status,
    ],
  );

  /*
   * Initial prompts used by generic Studio projects.
   */
  useEffect(
    () => {
      if (
        !projectId ||
        !user ||
        messages.length >
          0 ||
        isStreaming
      ) {
        return;
      }

      const stored =
        sessionStorage.getItem(
          `studio_initial_prompt_${projectId}`,
        );

      if (!stored) {
        return;
      }

      sessionStorage.removeItem(
        `studio_initial_prompt_${projectId}`,
      );

      const timeout =
        window.setTimeout(
          () =>
            void handleSend(
              stored,
            ),
          700,
        );

      return () =>
        window.clearTimeout(
          timeout,
        );
    },

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      projectId,
      user,
      messages.length,
    ],
  );

  const saveProjectName =
    async () => {
      setEditingName(
        false,
      );

      const value =
        projectName.trim();

      if (
        !value ||
        value ===
          project?.name
      ) {
        return;
      }

      await runUpdateProject({
        data: {
          id:
            projectId,

          name:
            value,
        },
      });

      queryClient.invalidateQueries(
        {
          queryKey: [
            "studio-project",
            projectId,
          ],
        },
      );

      queryClient.invalidateQueries(
        {
          queryKey: [
            "studio-projects",
          ],
        },
      );
    };

  const selectFile =
    (
      path: string,
    ) => {
      setCurrentFile(
        path,
      );

      setOpenFiles(
        (current) =>
          current.includes(
            path,
          )
            ? current
            : [
                ...current,
                path,
              ],
      );

      if (
        isMobile
      ) {
        setFilesOpen(
          false,
        );

        setMobileTab(
          "code",
        );
      }
    };

  const closeFile =
    (
      event:
        ReactMouseEvent<
          HTMLElement
        >,

      path: string,
    ) => {
      event.stopPropagation();

      setOpenFiles(
        (current) => {
          const next =
            current.filter(
              (item) =>
                item !==
                path,
            );

          if (
            currentFile ===
            path
          ) {
            setCurrentFile(
              next[
                next.length -
                  1
              ] ??
                null,
            );
          }

          return next;
        },
      );
    };

  const createFile =
    () => {
      const path =
        window
          .prompt(
            "New file path",
            "src/components/NewSection.jsx",
          )
          ?.trim();

      if (!path) {
        return;
      }

      if (
        !isSafeStudioPath(
          path,
        ) ||
        files[
          path
        ] !==
          undefined
      ) {
        toast.error(
          "Use a new safe relative file path.",
        );

        return;
      }

      setFiles(
        (current) => ({
          ...current,

          [path]:
            "",
        }),
      );

      selectFile(
        path,
      );
    };

  const deleteFile =
    (
      path: string,
    ) => {
      if (
        REQUIRED_FILES.has(
          path,
        )
      ) {
        toast.error(
          `${path} is required.`,
        );

        return;
      }

      if (
        !window.confirm(
          `Delete ${path}?`,
        )
      ) {
        return;
      }

      setFiles(
        (current) => {
          const next = {
            ...current,
          };

          delete next[
            path
          ];

          return next;
        },
      );

      setOpenFiles(
        (current) =>
          current.filter(
            (item) =>
              item !==
              path,
          ),
      );

      if (
        currentFile ===
        path
      ) {
        setCurrentFile(
          null,
        );
      }
    };

  const renameFile =
    (
      path: string,
    ) => {
      if (
        REQUIRED_FILES.has(
          path,
        )
      ) {
        toast.error(
          `${path} is required and cannot be renamed.`,
        );

        return;
      }

      const nextPath =
        window
          .prompt(
            "Rename file",
            path,
          )
          ?.trim();

      if (
        !nextPath ||
        nextPath ===
          path
      ) {
        return;
      }

      if (
        !isSafeStudioPath(
          nextPath,
        ) ||
        files[
          nextPath
        ] !==
          undefined
      ) {
        toast.error(
          "Use a new safe relative file path.",
        );

        return;
      }

      setFiles(
        (current) => {
          const next = {
            ...current,

            [nextPath]:
              current[
                path
              ],
          };

          delete next[
            path
          ];

          return next;
        },
      );

      setOpenFiles(
        (current) =>
          current.map(
            (item) =>
              item ===
              path
                ? nextPath
                : item,
          ),
      );

      if (
        currentFile ===
        path
      ) {
        setCurrentFile(
          nextPath,
        );
      }
    };

  const saveFiles =
    async () => {
      setIsSaving(
        true,
      );

      try {
        const result =
          await runSaveFiles({
            data: {
              project_id:
                projectId,

              files:
                fromStudioFileMap(
                  files,
                ),
            },
          });

        if (
          "error" in
          result
        ) {
          toast.error(
            result.message,
          );

          return;
        }

        toast.success(
          "Project saved.",
        );

        queryClient.invalidateQueries(
          {
            queryKey: [
              "studio-project",
              projectId,
            ],
          },
        );
      } catch {
        toast.error(
          "Could not save project.",
        );
      } finally {
        setIsSaving(
          false,
        );
      }
    };

  const undoEdit =
    async () => {
      try {
        const result =
          await runUndo({
            data: {
              project_id:
                projectId,
            },
          });

        if (
          "error" in
          result
        ) {
          toast.error(
            result.message,
          );

          return;
        }

        setFiles(
          toStudioFileMap(
            result.files,
          ),
        );

        toast.success(
          "Last AI edit undone.",
        );

        void refetchSnapshots();

        queryClient.invalidateQueries(
          {
            queryKey: [
              "studio-project",
              projectId,
            ],
          },
        );
      } catch {
        toast.error(
          "Could not undo the edit.",
        );
      }
    };

  const sendBusinessEdit =
    async (
      prompt: string,
    ) => {
      setIsStreaming(
        true,
      );

      try {
        const result =
          fileCount ===
          0
            ? await runGenerateWebsite(
                {
                  data: {
                    project_id:
                      projectId,
                  },
                },
              )
            : await runEditWebsite(
                {
                  data: {
                    project_id:
                      projectId,

                    request:
                      prompt,
                  },
                },
              );

        if (
          "error" in
          result
        ) {
          toast.error(
            result.message,
          );

          return;
        }

        const mapped =
          toStudioFileMap(
            result.files,
          );

        setFiles(
          mapped,
        );

        const paths =
          Object.keys(
            mapped,
          );

        if (
          paths.includes(
            "src/App.jsx",
          )
        ) {
          setCurrentFile(
            "src/App.jsx",
          );
        }

        setOpenFiles(
          [
            "src/App.jsx",
            "src/data/site.js",
            "src/styles/global.css",
          ].filter(
            (path) =>
              paths.includes(
                path,
              ),
          ),
        );

        const remaining =
          result
            .studioCredits
            ?.remaining;

        toast.success(
          "summary" in
          result
            ? typeof remaining ===
                "number"
              ? `Website updated — ${remaining} Studio credits remaining.`
              : "Website updated."
            : typeof remaining ===
                "number"
              ? `Website generated — ${remaining} Studio credits remaining.`
              : "Website generated.",
        );

        void refetchMessages();
        void refetchSnapshots();

        queryClient.invalidateQueries(
          {
            queryKey: [
              "studio-project",
              projectId,
            ],
          },
        );

        queryClient.invalidateQueries(
          {
            queryKey: [
              "studio-usage",
            ],
          },
        );
      } catch {
        toast.error(
          "Could not update this website.",
        );
      } finally {
        setIsStreaming(
          false,
        );
      }
    };

  const sendGenericMessage =
    async (
      prompt: string,
    ) => {
      const temporaryUser:
        StudioMessage = {
        id:
          `temporary-user-${Date.now()}`,

        project_id:
          projectId,

        role:
          "user",

        content:
          prompt,

        file_changes:
          null,

        created_at:
          new Date().toISOString(),
      };

      setOptimisticMessages(
        (current) => [
          ...current,
          temporaryUser,
        ],
      );

      await runCreateMessage({
        data: {
          project_id:
            projectId,

          role:
            "user",

          content:
            prompt,
        },
      });

      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (
        !session?.access_token
      ) {
        toast.error(
          "Not authenticated.",
        );

        return;
      }

      setIsStreaming(
        true,
      );

      const temporaryAssistantId =
        `temporary-assistant-${Date.now()}`;

      setOptimisticMessages(
        (current) => [
          ...current,

          {
            id:
              temporaryAssistantId,

            project_id:
              projectId,

            role:
              "assistant",

            content:
              "",

            file_changes:
              null,

            created_at:
              new Date().toISOString(),
          },
        ],
      );

      try {
        const response =
          await fetch(
            "/api/studio/generate",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${session.access_token}`,
              },

              body:
                JSON.stringify({
                  projectId,

                  files,

                  currentFile:
                    currentFile ??
                    undefined,

                  messages:
                    [
                      ...messages,
                      temporaryUser,
                    ]
                      .slice(
                        -10,
                      )
                      .map(
                        (message) => ({
                          role:
                            message.role,

                          content:
                            message.content,
                        }),
                      ),
                }),
            },
          );

        if (
          !response.ok ||
          !response.body
        ) {
          throw new Error(
            "Generation failed.",
          );
        }

        const reader =
          response.body.getReader();

        const decoder =
          new TextDecoder();

        let buffer =
          "";

        let assistantText =
          "";

        let changes:
          FileChange[] =
          [];

        while (
          true
        ) {
          const {
            value,
            done,
          } =
            await reader.read();

          if (done) {
            break;
          }

          buffer +=
            decoder.decode(
              value,
              {
                stream:
                  true,
              },
            );

          const lines =
            buffer.split(
              "\n",
            );

          buffer =
            lines.pop() ??
            "";

          for (
            const line of
            lines
          ) {
            if (
              !line.startsWith(
                "data: ",
              )
            ) {
              continue;
            }

            let event:
              StreamEvent;

            try {
              event =
                JSON.parse(
                  line.slice(
                    6,
                  ),
                );
            } catch {
              continue;
            }

            if (
              event.type ===
              "text"
            ) {
              assistantText =
                event.text;

              setOptimisticMessages(
                (current) =>
                  current.map(
                    (message) =>
                      message.id ===
                      temporaryAssistantId
                        ? {
                            ...message,

                            content:
                              assistantText,
                          }
                        : message,
                  ),
              );
            }

            if (
              event.type ===
              "files"
            ) {
              changes =
                event.fileChanges ??
                [];
            }

            if (
              event.type ===
              "done"
            ) {
              if (
                event.summary
              ) {
                assistantText =
                  event.summary;
              }

              if (
                event.fileChanges
              ) {
                changes =
                  event.fileChanges;
              }
            }

            if (
              event.type ===
              "error"
            ) {
              throw new Error(
                event.error,
              );
            }
          }
        }

        const nextFiles =
          applyStructuredChanges(
            files,
            changes,
          );

        setFiles(
          nextFiles,
        );

        if (
          changes[
            0
          ]?.path
        ) {
          selectFile(
            changes[
              0
            ].path,
          );
        }

        const finalText =
          assistantText ||
          "Done — the project was updated.";

        await runCreateMessage({
          data: {
            project_id:
              projectId,

            role:
              "assistant",

            content:
              finalText,

            file_changes:
              changes.length
                ? JSON.stringify(
                    changes.map(
                      (change) => ({
                        path:
                          change.path,

                        action:
                          change.action,
                      }),
                    ),
                  )
                : null,
          },
        });

        await runUpdateProject({
          data: {
            id:
              projectId,

            files_json:
              JSON.stringify(
                nextFiles,
              ),
          },
        });

        if (
          changes.length
        ) {
          await runCreateSnapshot({
            data: {
              project_id:
                projectId,

              label:
                prompt.slice(
                  0,
                  80,
                ),

              files_json:
                JSON.stringify(
                  nextFiles,
                ),

              files_count:
                Object.keys(
                  nextFiles,
                ).length,
            },
          });
        }

        void refetchMessages();
        void refetchSnapshots();
      } catch (
        error
      ) {
        toast.error(
          error instanceof
          Error
            ? error.message
            : "Studio generation failed.",
        );
      } finally {
        setIsStreaming(
          false,
        );

        setOptimisticMessages(
          (current) =>
            current.filter(
              (message) =>
                message.id !==
                  temporaryUser.id &&
                message.id !==
                  temporaryAssistantId,
            ),
        );
      }
    };

  const handleSend =
    async (
      prompt: string,
    ) => {
      const clean =
        prompt.trim();

      if (
        !clean ||
        isStreaming ||
        !user
      ) {
        return;
      }

      /*
       * React project = Kodarai website, even if project.template
       * has already changed to restaurant/salon/etc.
       */
      if (
        kodaraiWebsite
      ) {
        await sendBusinessEdit(
          clean,
        );

        return;
      }

      await sendGenericMessage(
        clean,
      );
    };

  if (!project) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#080b0d]">
        <Loader2 className="size-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#080b0d] text-zinc-100">
      <StudioHeader
        projectName={
          projectName
        }
        editingName={
          editingName
        }
        isSaving={
          isSaving
        }
        isStreaming={
          isStreaming
        }
        deploymentUrl={
          deploymentUrl
        }
        onBack={() =>
          navigate({
            to:
              "/studio",
          })
        }
        onNameChange={
          setProjectName
        }
        onStartRename={() =>
          setEditingName(
            true,
          )
        }
        onCancelRename={() => {
          setEditingName(
            false,
          );

          setProjectName(
            project.name,
          );
        }}
        onSaveName={
          saveProjectName
        }
        onSave={
          saveFiles
        }
        onPublish={() =>
          setShowDeploy(
            true,
          )
        }
      />

      {isMobile ? (
        <MobileStudio
          files={
            files
          }
          currentFile={
            currentFile
          }
          openFiles={
            openFiles
          }
          tab={
            mobileTab
          }
          filesOpen={
            filesOpen
          }
          messages={
            allMessages
          }
          isStreaming={
            isStreaming
          }
          mounted={
            mounted
          }
          deploymentUrl={
            deploymentUrl
          }
          reactProject={
            reactProject
          }
          onTabChange={
            setMobileTab
          }
          onToggleFiles={() =>
            setFilesOpen(
              (current) =>
                !current,
            )
          }
          onCloseFiles={() =>
            setFilesOpen(
              false,
            )
          }
          onSelectFile={
            selectFile
          }
          onCloseFile={
            closeFile
          }
          onChangeFile={(
            path,
            content,
          ) =>
            setFiles(
              (current) => ({
                ...current,

                [path]:
                  content,
              }),
            )
          }
          onCreateFile={
            createFile
          }
          onDeleteFile={
            deleteFile
          }
          onRenameFile={
            renameFile
          }
          onSend={
            handleSend
          }
          onPublish={() =>
            setShowDeploy(
              true,
            )
          }
          onUndo={
            undoEdit
          }
        />
      ) : (
        <DesktopStudio
          files={
            files
          }
          currentFile={
            currentFile
          }
          openFiles={
            openFiles
          }
          messages={
            allMessages
          }
          snapshots={
            snapshots
          }
          isStreaming={
            isStreaming
          }
          mounted={
            mounted
          }
          deploymentUrl={
            deploymentUrl
          }
          reactProject={
            reactProject
          }
          onSelectFile={
            selectFile
          }
          onCloseFile={
            closeFile
          }
          onChangeFile={(
            path,
            content,
          ) =>
            setFiles(
              (current) => ({
                ...current,

                [path]:
                  content,
              }),
            )
          }
          onCreateFile={
            createFile
          }
          onDeleteFile={
            deleteFile
          }
          onRenameFile={
            renameFile
          }
          onSend={
            handleSend
          }
          onPublish={() =>
            setShowDeploy(
              true,
            )
          }
          onUndo={
            undoEdit
          }
        />
      )}

      {showDeploy && (
        <DeployDialog
          projectId={
            projectId
          }
          projectName={
            projectName
          }
          fileCount={
            fileCount
          }
          reactProject={
            reactProject
          }
          runDeploy={
            runDeploy
          }
          runDeploymentStatus={
            runDeploymentStatus
          }
          onClose={() =>
            setShowDeploy(
              false,
            )
          }
          onReady={(
            url,
          ) => {
            setDeploymentUrl(
              url,
            );

            setShowDeploy(
              false,
            );

            queryClient.invalidateQueries(
              {
                queryKey: [
                  "studio-project",
                  projectId,
                ],
              },
            );
          }}
        />
      )}
    </div>
  );
}

function StudioHeader({
  projectName,
  editingName,
  deploymentUrl,
  isSaving,
  isStreaming,
  onBack,
  onNameChange,
  onStartRename,
  onCancelRename,
  onSaveName,
  onSave,
  onPublish,
}: {
  projectName:
    string;

  editingName:
    boolean;

  deploymentUrl:
    string | null;

  isSaving:
    boolean;

  isStreaming:
    boolean;

  onBack:
    () => void;

  onNameChange:
    (
      value:
        string,
    ) => void;

  onStartRename:
    () => void;

  onCancelRename:
    () => void;

  onSaveName:
    () => void;

  onSave:
    () => void;

  onPublish:
    () => void;
}) {
  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-[#080b0d] px-3 sm:h-[82px] sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={
            onBack
          }
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-100"
        >
          <ArrowLeft className="size-4" />
        </button>

        <div className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-lg font-bold text-[#04120c] sm:flex">
          K°
        </div>

        <div className="min-w-0">
          {editingName ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={
                  projectName
                }
                onChange={(
                  event,
                ) =>
                  onNameChange(
                    event
                      .target
                      .value,
                  )
                }
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    onSaveName();
                  }

                  if (
                    event.key ===
                    "Escape"
                  ) {
                    onCancelRename();
                  }
                }}
                className="h-9 w-[180px] rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-zinc-100 outline-none focus:border-emerald-500/40"
              />

              <button
                type="button"
                onClick={
                  onSaveName
                }
                className="flex size-8 items-center justify-center rounded-lg text-emerald-400 hover:bg-emerald-500/10"
              >
                <Check className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={
                onStartRename
              }
              className="group flex max-w-[205px] items-center gap-2 text-left sm:max-w-[380px]"
            >
              <span className="truncate text-[15px] font-semibold tracking-[-0.02em] text-zinc-100">
                {projectName ||
                  "Untitled website"}
              </span>

              <Pencil className="size-3.5 shrink-0 text-zinc-700 transition group-hover:text-zinc-400" />
            </button>
          )}

          <div className="mt-1 flex items-center gap-2">
            <span
              className={`size-1.5 rounded-full ${
                isStreaming
                  ? "animate-pulse bg-amber-400"
                  : deploymentUrl
                    ? "bg-emerald-400"
                    : "bg-zinc-700"
              }`}
            />

            <span className="text-[10px] text-zinc-600">
              {isStreaming
                ? "KodarAI is working"
                : deploymentUrl
                  ? "Live website"
                  : "Draft project"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={
            onSave
          }
          disabled={
            isSaving
          }
          className="h-9 gap-2 border-white/[0.08] bg-white/[0.025] px-3 text-xs text-zinc-300 hover:bg-white/[0.05]"
        >
          {isSaving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}

          <span className="hidden sm:inline">
            Save
          </span>
        </Button>

        <Button
          size="sm"
          onClick={
            onPublish
          }
          className="h-9 gap-2 bg-emerald-500 px-3 text-xs font-semibold text-[#04120c] hover:bg-emerald-400 sm:px-4"
        >
          <Rocket className="size-3.5" />

          <span className="hidden sm:inline">
            Deploy
          </span>
        </Button>
      </div>
    </header>
  );
}

function DesktopStudio({
  files,
  currentFile,
  openFiles,
  messages,
  snapshots,
  isStreaming,
  mounted,
  deploymentUrl,
  reactProject,
  onSelectFile,
  onCloseFile,
  onChangeFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onSend,
  onPublish,
  onUndo,
}: {
  files:
    Record<
      string,
      string
    >;

  currentFile:
    string | null;

  openFiles:
    string[];

  messages:
    StudioMessage[];

  snapshots:
    StudioSnapshot[];

  isStreaming:
    boolean;

  mounted:
    boolean;

  deploymentUrl:
    string | null;

  reactProject:
    boolean;

  onSelectFile:
    (
      path:
        string,
    ) => void;

  onCloseFile:
    (
      event:
        ReactMouseEvent<
          HTMLElement
        >,

      path:
        string,
    ) => void;

  onChangeFile:
    (
      path:
        string,

      content:
        string,
    ) => void;

  onCreateFile:
    () => void;

  onDeleteFile:
    (
      path:
        string,
    ) => void;

  onRenameFile:
    (
      path:
        string,
    ) => void;

  onSend:
    (
      prompt:
        string,
    ) => void;

  onPublish:
    () => void;

  onUndo:
    () => void;
}) {
  const [
    sidebar,
    setSidebar,
  ] =
    useState<
      | "files"
      | "chat"
      | "history"
    >(
      "files",
    );

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(360px,1fr)_minmax(400px,0.95fr)] overflow-hidden bg-[#080b0d]">
      {/* Left panel */}

      <aside className="flex min-h-0 flex-col border-r border-white/[0.06] bg-[#0b0e11]">
        <div className="flex h-11 shrink-0 items-center border-b border-white/[0.06] p-1.5">
          {(
            [
              [
                "files",
                "Files",
              ],

              [
                "chat",
                "Chat",
              ],

              [
                "history",
                "History",
              ],
            ] as const
          ).map(
            ([
              id,
              label,
            ]) => (
              <button
                key={
                  id
                }
                type="button"
                onClick={() =>
                  setSidebar(
                    id,
                  )
                }
                className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
                  sidebar ===
                  id
                    ? "bg-white/[0.07] text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {
                  label
                }
              </button>
            ),
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {sidebar ===
            "files" && (
            <FileExplorer
              files={
                files
              }
              currentFile={
                currentFile
              }
              onSelect={
                onSelectFile
              }
              onCreate={
                onCreateFile
              }
              onDelete={
                onDeleteFile
              }
              onRename={
                onRenameFile
              }
            />
          )}

          {sidebar ===
            "chat" && (
            <ChatPanel
              messages={
                messages
              }
              isStreaming={
                isStreaming
              }
              onSend={
                onSend
              }
              compact
            />
          )}

          {sidebar ===
            "history" && (
            <HistoryPanel
              snapshots={
                snapshots
              }
            />
          )}
        </div>
      </aside>

      {/* Code */}

      <section className="flex min-h-0 min-w-0 flex-col border-r border-white/[0.06] bg-[#090c0f]">
        <EditorTabs
          openFiles={
            openFiles
          }
          currentFile={
            currentFile
          }
          onSelect={
            onSelectFile
          }
          onClose={
            onCloseFile
          }
        />

        <div className="min-h-0 flex-1">
          <CodeEditor
            files={
              files
            }
            currentFile={
              currentFile
            }
            mounted={
              mounted
            }
            onChange={
              onChangeFile
            }
          />
        </div>

        <div className="flex h-9 shrink-0 items-center justify-between border-t border-white/[0.05] bg-[#0b0e11] px-3">
          <div className="flex items-center gap-3 text-[10px] text-zinc-600">
            <span>
              {
                Object.keys(
                  files,
                ).length
              }{" "}
              files
            </span>

            <span>
              {reactProject
                ? "React (Vite)"
                : "Static"}
            </span>
          </div>

          <button
            type="button"
            onClick={
              onUndo
            }
            className="text-[10px] text-zinc-600 transition hover:text-zinc-300"
          >
            Undo AI edit
          </button>
        </div>
      </section>

      {/* Live preview */}

      <section className="flex min-h-0 min-w-0 flex-col bg-[#0b0e11]">
        <StudioLivePreview
          files={
            files
          }
          deploymentUrl={
            deploymentUrl
          }
          onDeploy={
            onPublish
          }
          fileCount={
            Object.keys(
              files,
            ).length
          }
        />
      </section>
    </div>
  );
}

function MobileStudio({
  files,
  currentFile,
  openFiles,
  tab,
  filesOpen,
  messages,
  isStreaming,
  mounted,
  deploymentUrl,
  reactProject,
  onTabChange,
  onToggleFiles,
  onCloseFiles,
  onSelectFile,
  onCloseFile,
  onChangeFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onSend,
  onPublish,
  onUndo,
}: {
  files:
    Record<
      string,
      string
    >;

  currentFile:
    string | null;

  openFiles:
    string[];

  tab:
    MobileTab;

  filesOpen:
    boolean;

  messages:
    StudioMessage[];

  isStreaming:
    boolean;

  mounted:
    boolean;

  deploymentUrl:
    string | null;

  reactProject:
    boolean;

  onTabChange:
    (
      tab:
        MobileTab,
    ) => void;

  onToggleFiles:
    () => void;

  onCloseFiles:
    () => void;

  onSelectFile:
    (
      path:
        string,
    ) => void;

  onCloseFile:
    (
      event:
        ReactMouseEvent<
          HTMLElement
        >,

      path:
        string,
    ) => void;

  onChangeFile:
    (
      path:
        string,

      content:
        string,
    ) => void;

  onCreateFile:
    () => void;

  onDeleteFile:
    (
      path:
        string,
    ) => void;

  onRenameFile:
    (
      path:
        string,
    ) => void;

  onSend:
    (
      prompt:
        string,
    ) => void;

  onPublish:
    () => void;

  onUndo:
    () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#080b0d]">
      <MobileTabs
        tab={
          tab
        }
        onChange={
          onTabChange
        }
      />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {tab ===
          "chat" && (
          <ChatPanel
            messages={
              messages
            }
            isStreaming={
              isStreaming
            }
            onSend={
              onSend
            }
          />
        )}

        {tab ===
          "code" && (
          <div className="flex h-full min-h-0 flex-col bg-[#090c0f]">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#0b0e11] px-2">
              <button
                type="button"
                onClick={
                  onToggleFiles
                }
                className="flex h-8 items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 text-[11px] text-zinc-400"
              >
                <Folder className="size-3.5 text-blue-400" />

                Files
              </button>

              <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-zinc-500">
                {currentFile ??
                  "Select a file"}
              </span>

              <button
                type="button"
                onClick={
                  onUndo
                }
                className="px-2 text-[10px] text-zinc-600"
              >
                Undo
              </button>
            </div>

            <EditorTabs
              openFiles={
                openFiles
              }
              currentFile={
                currentFile
              }
              onSelect={
                onSelectFile
              }
              onClose={
                onCloseFile
              }
            />

            <div className="min-h-0 flex-1">
              <CodeEditor
                files={
                  files
                }
                currentFile={
                  currentFile
                }
                mounted={
                  mounted
                }
                onChange={
                  onChangeFile
                }
              />
            </div>

            <div className="flex h-8 shrink-0 items-center justify-between border-t border-white/[0.05] px-3 text-[9px] text-zinc-700">
              <span>
                {
                  Object.keys(
                    files,
                  ).length
                }{" "}
                files
              </span>

              <span>
                {reactProject
                  ? "React (Vite)"
                  : "Static"}
              </span>
            </div>

            {filesOpen && (
              <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-[2px]">
                <div className="absolute inset-x-2 bottom-2 top-3 flex flex-col overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0b0e11] shadow-2xl">
                  <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
                    <span className="text-sm font-semibold text-zinc-100">
                      Files
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={
                          onCreateFile
                        }
                        className="flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/5"
                      >
                        <Plus className="size-4" />
                      </button>

                      <button
                        type="button"
                        onClick={
                          onCloseFiles
                        }
                        className="flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/5"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <FileExplorer
                      files={
                        files
                      }
                      currentFile={
                        currentFile
                      }
                      onSelect={
                        onSelectFile
                      }
                      onCreate={
                        onCreateFile
                      }
                      onDelete={
                        onDeleteFile
                      }
                      onRename={
                        onRenameFile
                      }
                      hideHeader
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab ===
          "preview" && (
          <StudioLivePreview
            files={
              files
            }
            deploymentUrl={
              deploymentUrl
            }
            onDeploy={
              onPublish
            }
            fileCount={
              Object.keys(
                files,
              ).length
            }
          />
        )}

        {tab ===
          "deploy" && (
          <MobileDeploy
            fileCount={
              Object.keys(
                files,
              ).length
            }
            reactProject={
              reactProject
            }
            deploymentUrl={
              deploymentUrl
            }
            onPublish={
              onPublish
            }
          />
        )}
      </div>
    </div>
  );
}

function MobileTabs({
  tab,
  onChange,
}: {
  tab:
    MobileTab;

  onChange:
    (
      tab:
        MobileTab,
    ) => void;
}) {
  const items = [
    {
      id:
        "chat" as const,

      label:
        "Chat",

      icon:
        MessageSquare,
    },

    {
      id:
        "code" as const,

      label:
        "Code",

      icon:
        Code2,
    },

    {
      id:
        "preview" as const,

      label:
        "Preview",

      icon:
        Eye,
    },

    {
      id:
        "deploy" as const,

      label:
        "Deploy",

      icon:
        Rocket,
    },
  ];

  return (
    <nav className="grid h-16 shrink-0 grid-cols-4 border-b border-white/[0.06] bg-[#080b0d] px-2">
      {items.map(
        (item) => (
          <button
            key={
              item.id
            }
            type="button"
            onClick={() =>
              onChange(
                item.id,
              )
            }
            className={`relative flex flex-col items-center justify-center gap-1 text-[10px] transition ${
              tab ===
              item.id
                ? "text-emerald-400"
                : "text-zinc-600"
            }`}
          >
            <item.icon className="size-[18px]" />

            {
              item.label
            }

            {tab ===
              item.id && (
              <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-emerald-400" />
            )}
          </button>
        ),
      )}
    </nav>
  );
}

function ChatPanel({
  messages,
  isStreaming,
  onSend,
  compact = false,
}: {
  messages:
    StudioMessage[];

  isStreaming:
    boolean;

  onSend:
    (
      prompt:
        string,
    ) => void;

  compact?: boolean;
}) {
  const [
    prompt,
    setPrompt,
  ] =
    useState("");

  const placeholder =
    useAnimatedPlaceholder(
      CHAT_PLACEHOLDERS,
      2600,
    );

  const bottomRef =
    useRef<
      HTMLDivElement | null
    >(null);

  useEffect(
    () => {
      bottomRef.current?.scrollIntoView(
        {
          behavior:
            "smooth",
        },
      );
    },
    [
      messages.length,
      isStreaming,
    ],
  );

  const send =
    () => {
      const clean =
        prompt.trim();

      if (
        !clean ||
        isStreaming
      ) {
        return;
      }

      setPrompt("");

      onSend(
        clean,
      );
    };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0b0e11]">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {messages.length ===
        0 ? (
          <div className={`mx-auto flex h-full max-w-[330px] flex-col justify-center ${
            compact
              ? "px-2"
              : "px-3"
          }`}>
            <div className="mb-5 flex size-10 items-center justify-center rounded-xl border border-emerald-500/15 bg-emerald-500/[0.07] font-semibold text-emerald-400">
              K
            </div>

            <h2 className={`${compact
              ? "text-base"
              : "text-2xl"
            } font-semibold tracking-[-0.035em] text-zinc-100`}>
              Let&apos;s improve
              your website
            </h2>

            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Describe what
              you want changed.
              Kodarai will
              update the
              project files.
            </p>

            <div className="mt-5 space-y-2">
              {QUICK_ACTIONS.map(
                (action) => (
                  <button
                    key={
                      action
                    }
                    type="button"
                    disabled={
                      isStreaming
                    }
                    onClick={() =>
                      onSend(
                        action,
                      )
                    }
                    className="w-full rounded-full border border-white/[0.09] px-3 py-2 text-left text-[11px] text-zinc-300 transition hover:border-emerald-500/25 hover:bg-emerald-500/[0.04]"
                  >
                    {
                      action
                    }
                  </button>
                ),
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map(
              (message) => (
                <MessageBubble
                  key={
                    message.id
                  }
                  message={
                    message
                  }
                  isStreaming={
                    isStreaming
                  }
                />
              ),
            )}

            <div
              ref={
                bottomRef
              }
            />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/[0.06] p-3">
        <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.035] p-2 focus-within:border-emerald-500/30">
          <Textarea
            value={
              prompt
            }
            onChange={(
              event,
            ) =>
              setPrompt(
                event
                  .target
                  .value,
              )
            }
            onKeyDown={(
              event,
            ) => {
              if (
                event.key ===
                  "Enter" &&
                (
                  event.metaKey ||
                  event.ctrlKey
                )
              ) {
                event.preventDefault();

                send();
              }
            }}
            disabled={
              isStreaming
            }
            placeholder={
              isStreaming
                ? "KodarAI is working…"
                : placeholder
            }
            className="min-h-[72px] resize-none border-0 bg-transparent px-2 py-2 text-sm text-zinc-100 placeholder:text-zinc-700 focus-visible:ring-0"
          />

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={
                send
              }
              disabled={
                !prompt.trim() ||
                isStreaming
              }
              className="size-9 rounded-full bg-emerald-500 p-0 text-[#04120c] hover:bg-emerald-400"
            >
              {isStreaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming,
}: {
  message:
    StudioMessage;

  isStreaming:
    boolean;
}) {
  if (
    message.role ===
    "user"
  ) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-br-md bg-emerald-500/10 px-3 py-2.5 text-xs leading-5 text-zinc-200">
          {
            message.content
          }
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-emerald-500/15 bg-emerald-500/[0.07] text-[10px] font-semibold text-emerald-400">
        K
      </div>

      <div className="min-w-0 flex-1">
        {!message.content &&
        isStreaming ? (
          <div className="flex gap-1 py-2">
            <span className="size-1.5 animate-bounce rounded-full bg-zinc-600" />

            <span className="size-1.5 animate-bounce rounded-full bg-zinc-600 [animation-delay:120ms]" />

            <span className="size-1.5 animate-bounce rounded-full bg-zinc-600 [animation-delay:240ms]" />
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-xs leading-5 text-zinc-400">
            {
              message.content
            }
          </p>
        )}
      </div>
    </div>
  );
}

function EditorTabs({
  openFiles,
  currentFile,
  onSelect,
  onClose,
}: {
  openFiles:
    string[];

  currentFile:
    string | null;

  onSelect:
    (
      path:
        string,
    ) => void;

  onClose:
    (
      event:
        ReactMouseEvent<
          HTMLElement
        >,

      path:
        string,
    ) => void;
}) {
  return (
    <div
      className="flex h-10 shrink-0 overflow-x-auto border-b border-white/[0.06] bg-[#0b0e11]"
      style={{
        scrollbarWidth:
          "none",
      }}
    >
      {openFiles.map(
        (path) => (
          <button
            key={
              path
            }
            type="button"
            onClick={() =>
              onSelect(
                path,
              )
            }
            className={`group flex h-full shrink-0 items-center border-r border-white/[0.05] px-3 font-mono text-[11px] transition ${
              currentFile ===
              path
                ? "border-t border-t-emerald-400 bg-[#090c0f] text-zinc-100"
                : "text-zinc-600 hover:bg-white/[0.02] hover:text-zinc-300"
            }`}
          >
            <FileIcon
              path={
                path
              }
              className="mr-1.5 size-3.5"
            />

            {path
              .split(
                "/",
              )
              .pop()}

            <span
              role="button"
              tabIndex={
                0
              }
              onClick={(
                event,
              ) =>
                onClose(
                  event,
                  path,
                )
              }
              className="ml-2 rounded p-0.5 text-zinc-700 opacity-0 group-hover:opacity-100"
            >
              <X className="size-3" />
            </span>
          </button>
        ),
      )}
    </div>
  );
}

function CodeEditor({
  files,
  currentFile,
  mounted,
  onChange,
}: {
  files:
    Record<
      string,
      string
    >;

  currentFile:
    string | null;

  mounted:
    boolean;

  onChange:
    (
      path:
        string,

      content:
        string,
    ) => void;
}) {
  if (!mounted) {
    return (
      <EditorSkeleton />
    );
  }

  if (
    !currentFile ||
    files[
      currentFile
    ] ===
      undefined
  ) {
    return (
      <div className="flex h-full items-center justify-center bg-[#090c0f]">
        <div className="text-center">
          <Code2 className="mx-auto mb-3 size-8 text-zinc-800" />

          <p className="text-xs text-zinc-600">
            Select a file
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <EditorSkeleton />
      }
    >
      <MonacoEditor
        key={
          currentFile
        }
        height="100%"
        path={
          currentFile
        }
        value={
          files[
            currentFile
          ]
        }
        onChange={(
          value,
        ) =>
          onChange(
            currentFile,

            value ??
              "",
          )
        }
        theme="vs-dark"
        options={{
          minimap: {
            enabled:
              false,
          },

          automaticLayout:
            true,

          fontSize:
            13,

          lineHeight:
            23,

          fontFamily:
            "Geist Mono, JetBrains Mono, SFMono-Regular, Menlo, monospace",

          padding: {
            top:
              14,
          },

          scrollBeyondLastLine:
            false,

          smoothScrolling:
            true,

          cursorBlinking:
            "smooth",

          wordWrap:
            "off",
        }}
      />
    </Suspense>
  );
}

function FileExplorer({
  files,
  currentFile,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  hideHeader = false,
}: {
  files:
    Record<
      string,
      string
    >;

  currentFile:
    string | null;

  onSelect:
    (
      path:
        string,
    ) => void;

  onCreate:
    () => void;

  onDelete:
    (
      path:
        string,
    ) => void;

  onRename:
    (
      path:
        string,
    ) => void;

  hideHeader?: boolean;
}) {
  const tree =
    useMemo(
      () =>
        buildTree(
          Object.keys(
            files,
          ),
        ),
      [files],
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!hideHeader && (
        <div className="flex h-10 shrink-0 items-center justify-between px-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
            Files
          </span>

          <button
            type="button"
            onClick={
              onCreate
            }
            className="flex size-7 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-white/5 hover:text-zinc-300"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-3">
        {tree.length ===
        0 ? (
          <div className="px-4 py-10 text-center text-xs text-zinc-700">
            No files yet
          </div>
        ) : (
          tree.map(
            (node) => (
              <TreeItem
                key={
                  node.path
                }
                node={
                  node
                }
                currentFile={
                  currentFile
                }
                depth={
                  0
                }
                onSelect={
                  onSelect
                }
                onDelete={
                  onDelete
                }
                onRename={
                  onRename
                }
              />
            ),
          )
        )}
      </div>
    </div>
  );
}

function TreeItem({
  node,
  currentFile,
  depth,
  onSelect,
  onDelete,
  onRename,
}: {
  node:
    TreeNode;

  currentFile:
    string | null;

  depth:
    number;

  onSelect:
    (
      path:
        string,
    ) => void;

  onDelete:
    (
      path:
        string,
    ) => void;

  onRename:
    (
      path:
        string,
    ) => void;
}) {
  const [
    open,
    setOpen,
  ] =
    useState(
      true,
    );

  if (
    node.kind ===
    "folder"
  ) {
    return (
      <div>
        <button
          type="button"
          onClick={() =>
            setOpen(
              (current) =>
                !current,
            )
          }
          className="flex h-8 w-full items-center rounded-md pr-2 text-left text-[11px] text-zinc-500 transition hover:bg-white/[0.035] hover:text-zinc-300"
          style={{
            paddingLeft:
              `${
                8 +
                depth *
                  12
              }px`,
          }}
        >
          {open ? (
            <ChevronDown className="mr-1 size-3 shrink-0" />
          ) : (
            <ChevronRight className="mr-1 size-3 shrink-0" />
          )}

          {open ? (
            <FolderOpen className="mr-1.5 size-3.5 shrink-0 text-blue-400" />
          ) : (
            <Folder className="mr-1.5 size-3.5 shrink-0 text-blue-400" />
          )}

          <span className="truncate">
            {
              node.name
            }
          </span>
        </button>

        {open &&
          node.children.map(
            (child) => (
              <TreeItem
                key={
                  child.path
                }
                node={
                  child
                }
                currentFile={
                  currentFile
                }
                depth={
                  depth +
                  1
                }
                onSelect={
                  onSelect
                }
                onDelete={
                  onDelete
                }
                onRename={
                  onRename
                }
              />
            ),
          )}
      </div>
    );
  }

  const protectedFile =
    REQUIRED_FILES.has(
      node.path,
    );

  return (
    <div
      className={`group flex h-8 items-center rounded-md pr-1 transition ${
        currentFile ===
        node.path
          ? "bg-white/[0.07]"
          : "hover:bg-white/[0.035]"
      }`}
      style={{
        paddingLeft:
          `${
            24 +
            depth *
              12
          }px`,
      }}
    >
      <button
        type="button"
        onClick={() =>
          onSelect(
            node.path,
          )
        }
        className="flex min-w-0 flex-1 items-center text-left"
      >
        <FileIcon
          path={
            node.path
          }
          className="mr-1.5 size-3.5 shrink-0"
        />

        <span
          className={`truncate font-mono text-[11px] ${
            currentFile ===
            node.path
              ? "text-zinc-100"
              : "text-zinc-500"
          }`}
        >
          {
            node.name
          }
        </span>
      </button>

      {!protectedFile && (
        <div className="hidden shrink-0 items-center group-hover:flex">
          <button
            type="button"
            onClick={() =>
              onRename(
                node.path,
              )
            }
            className="rounded p-1 text-zinc-700 hover:bg-white/5 hover:text-zinc-300"
          >
            <Pencil className="size-3" />
          </button>

          <button
            type="button"
            onClick={() =>
              onDelete(
                node.path,
              )
            }
            className="rounded p-1 text-zinc-700 hover:bg-red-500/10 hover:text-red-400"
          >
            <X className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function HistoryPanel({
  snapshots,
}: {
  snapshots:
    StudioSnapshot[];
}) {
  return (
    <div className="h-full overflow-y-auto px-3 py-4">
      {snapshots.length ===
      0 ? (
        <div className="py-10 text-center">
          <History className="mx-auto mb-3 size-7 text-zinc-800" />

          <p className="text-xs text-zinc-700">
            No snapshots
            yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {snapshots.map(
            (snapshot) => (
              <div
                key={
                  snapshot.id
                }
                className="border-l border-white/[0.07] pl-3"
              >
                <p className="line-clamp-2 text-[11px] leading-4 text-zinc-400">
                  {
                    snapshot.label
                  }
                </p>

                <p className="mt-1 text-[9px] text-zinc-700">
                  {formatDistanceToNow(
                    new Date(
                      snapshot.created_at,
                    ),
                    {
                      addSuffix:
                        true,
                    },
                  )}
                </p>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function MobileDeploy({
  fileCount,
  reactProject,
  deploymentUrl,
  onPublish,
}: {
  fileCount:
    number;

  reactProject:
    boolean;

  deploymentUrl:
    string | null;

  onPublish:
    () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto bg-[#0b0e11] px-5 py-8">
      <div className="w-full max-w-[340px]">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-[20px] border border-white/[0.07] bg-white/[0.035]">
          <Rocket className="size-7 text-zinc-200" />
        </div>

        <h2 className="text-center text-2xl font-semibold tracking-[-0.04em] text-zinc-100">
          Ready to
          publish?
        </h2>

        <p className="mx-auto mt-2 max-w-[280px] text-center text-sm leading-6 text-zinc-500">
          Deploy the
          website and
          share it with
          your client.
        </p>

        <div className="mt-7 overflow-hidden rounded-2xl border border-white/[0.07]">
          <StatusRow
            label="Project files"
            value={`${fileCount} files`}
          />

          <StatusRow
            label="Framework"
            value={
              reactProject
                ? "React + Vite"
                : "Static"
            }
          />

          <StatusRow
            label="Status"
            value={
              deploymentUrl
                ? "Live"
                : fileCount >
                    0
                  ? "Ready"
                  : "Waiting"
            }
          />
        </div>

        <Button
          onClick={
            onPublish
          }
          disabled={
            fileCount ===
            0
          }
          className="mt-6 h-12 w-full rounded-xl bg-emerald-500 font-semibold text-[#04120c] hover:bg-emerald-400"
        >
          <Rocket className="mr-2 size-4" />

          Publish to web
        </Button>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5 last:border-b-0">
      <span className="text-xs text-zinc-500">
        {
          label
        }
      </span>

      <span className="text-xs font-medium text-zinc-300">
        {
          value
        }
      </span>
    </div>
  );
}

function DeployDialog({
  projectId,
  projectName,
  fileCount,
  reactProject,
  runDeploy,
  runDeploymentStatus,
  onClose,
  onReady,
}: {
  projectId:
    string;

  projectName:
    string;

  fileCount:
    number;

  reactProject:
    boolean;

  runDeploy:
    (
      input:
        any,
    ) =>
      Promise<any>;

  runDeploymentStatus:
    (
      input:
        any,
    ) =>
      Promise<any>;

  onClose:
    () => void;

  onReady:
    (
      url:
        string,
    ) => void;
}) {
  const [
    publishing,
    setPublishing,
  ] =
    useState(
      false,
    );

  const [
    checking,
    setChecking,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  useEffect(
    () => {
      if (!checking) {
        return;
      }

      let cancelled =
        false;

      const check =
        async () => {
          try {
            const result =
              await runDeploymentStatus(
                {
                  data: {
                    project_id:
                      projectId,
                  },
                },
              );

            if (
              cancelled
            ) {
              return;
            }

            if (
              "error" in
              result
            ) {
              setChecking(
                false,
              );

              setError(
                result.message,
              );

              return;
            }

            if (
              result.status ===
                "ready" &&
              typeof result.url ===
                "string"
            ) {
              setChecking(
                false,
              );

              toast.success(
                "Website published.",
              );

              onReady(
                result.url,
              );

              return;
            }

            if (
              result.status ===
              "error"
            ) {
              setChecking(
                false,
              );

              setError(
                result.detail ||
                  "Vercel could not build this project.",
              );
            }
          } catch {
            if (
              !cancelled
            ) {
              setChecking(
                false,
              );

              setError(
                "Could not check deployment status.",
              );
            }
          }
        };

      void check();

      const interval =
        window.setInterval(
          () =>
            void check(),
          4500,
        );

      return () => {
        cancelled =
          true;

        window.clearInterval(
          interval,
        );
      };
    },
    [
      checking,
      projectId,
      runDeploymentStatus,
      onReady,
    ],
  );

  const publish =
    async () => {
      setPublishing(
        true,
      );

      setError(
        null,
      );

      try {
        const result =
          await runDeploy({
            data: {
              project_id:
                projectId,
            },
          });

        if (
          "error" in
          result
        ) {
          setError(
            result.message ||
              "Deployment failed.",
          );

          return;
        }

        if (
          result.status ===
            "ready" &&
          result.url
        ) {
          toast.success(
            "Website published.",
          );

          onReady(
            result.url,
          );

          return;
        }

        setChecking(
          true,
        );
      } catch {
        setError(
          "Could not publish this website.",
        );
      } finally {
        setPublishing(
          false,
        );
      }
    };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="Close"
        onClick={
          onClose
        }
        className="absolute inset-0"
      />

      <div className="relative z-10 w-full max-w-[430px] rounded-t-[26px] border border-white/[0.08] bg-[#101418] p-5 shadow-2xl sm:rounded-[22px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-zinc-100">
              Publish website
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              {
                projectName
              }
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="flex size-8 items-center justify-center rounded-full text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.07]">
          <StatusRow
            label="Files"
            value={`${fileCount}`}
          />

          <StatusRow
            label="Framework"
            value={
              reactProject
                ? "React + Vite"
                : "Static"
            }
          />
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/15 bg-red-500/[0.06] px-3 py-2.5 text-xs leading-5 text-red-300">
            {
              error
            }
          </div>
        )}

        <Button
          onClick={
            publish
          }
          disabled={
            publishing ||
            checking ||
            fileCount ===
              0
          }
          className="mt-5 h-11 w-full rounded-xl bg-emerald-500 font-semibold text-[#04120c] hover:bg-emerald-400"
        >
          {publishing ||
          checking ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />

              {checking
                ? "Building website…"
                : "Publishing…"}
            </>
          ) : (
            <>
              <Rocket className="mr-2 size-4" />

              Publish to web
            </>
          )}
        </Button>

        <div className="h-[max(2px,env(safe-area-inset-bottom))] sm:hidden" />
      </div>
    </div>
  );
}

function FileIcon({
  path,
  className = "",
}: {
  path:
    string;

  className?:
    string;
}) {
  if (
    /\.(jsx?|tsx?)$/i.test(
      path,
    )
  ) {
    return (
      <FileCode
        className={`${className} text-cyan-400`}
      />
    );
  }

  if (
    path.endsWith(
      ".json",
    )
  ) {
    return (
      <FileJson
        className={`${className} text-amber-400`}
      />
    );
  }

  if (
    path.endsWith(
      ".css",
    )
  ) {
    return (
      <FileType2
        className={`${className} text-blue-400`}
      />
    );
  }

  return (
    <File
      className={`${className} text-zinc-500`}
    />
  );
}

function EditorSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-[#090c0f]">
      <Loader2 className="size-5 animate-spin text-zinc-700" />
    </div>
  );
}
