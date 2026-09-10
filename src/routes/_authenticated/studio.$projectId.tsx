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
  useState,
  useEffect,
  useRef,
  lazy,
  Suspense,
} from "react";

import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  toast,
} from "sonner";

import {
  formatDistanceToNow,
} from "date-fns";

import {
  ArrowLeft,
  Rocket,
  History,
  Send,
  ExternalLink,
  FileCode,
  FileJson,
  FileType2,
  File,
  X,
  Loader2,
  Code2,
  Eye,
  FolderGit2,
  Pencil,
  MessageSquare,
  Check,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

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
  getStudioProject,
  listStudioMessages,
  createStudioMessage,
  listStudioSnapshots,
  updateStudioProject,
  createStudioSnapshot,
  saveStudioFiles,
  undoLastBusinessWebsiteEdit,
  deployBusinessWebsite,
  getBusinessWebsiteDeploymentStatus,
  type StudioMessage,
  type StudioSnapshot,
} from "@/lib/studio.functions";

import {
  generateBusinessWebsite,
  applyBusinessWebsiteEdit,
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
      Builder,
  });

/* -------------------------------------------------------------------------- */
/*                                STREAM TYPES                                */
/* -------------------------------------------------------------------------- */

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

      fullContent?:
        string;

      summary?:
        string;

      fileChanges?:
        FileChange[];

      filesChanged?:
        string[];
    }
  | {
      type:
        "error";

      error:
        string;
    };

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function applyStructuredChanges(
  current:
    Record<
      string,
      string
    >,

  changes:
    FileChange[],
): Record<
  string,
  string
> {
  const result = {
    ...current,
  };

  for (
    const {
      path,
      action,
      content,
    } of changes
  ) {
    if (
      action ===
      "delete"
    ) {
      delete result[
        path
      ];
    } else {
      result[
        path
      ] =
        content;
    }
  }

  return result;
}

const CHAT_PLACEHOLDERS =
  [
    "Ask Studio to build something...",

    "Add a dark mode toggle...",

    "Create a contact form with validation...",

    "Add a WhatsApp floating button...",

    "Build a services section with icons...",

    "Fix the layout on mobile...",

    "Make the header sticky on scroll...",

    "Add a Google Maps embed...",
  ];

const QUICK_STARTS =
  [
    {
      label:
        "Add hero section",

      prompt:
        "Add a stunning hero section with a headline, subheading, and call-to-action button.",
    },

    {
      label:
        "Contact section",

      prompt:
        "Add a contact section with phone, email, WhatsApp button, and a simple enquiry form.",
    },

    {
      label:
        "Make mobile-friendly",

      prompt:
        "Make the site fully responsive and mobile-friendly with a hamburger menu.",
    },

    {
      label:
        "Improve speed",

      prompt:
        "Optimize the website for performance: lazy load images, clean up unused styles, and improve loading speed.",
    },
  ];

/* -------------------------------------------------------------------------- */
/*                                  BUILDER                                   */
/* -------------------------------------------------------------------------- */

function Builder() {
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

  const queryClient =
    useQueryClient();

  const isMobile =
    useIsMobile();

  const runGetProject =
    useServerFn(
      getStudioProject,
    );

  const runListMessages =
    useServerFn(
      listStudioMessages,
    );

  const runCreateMessage =
    useServerFn(
      createStudioMessage,
    );

  const runListSnapshots =
    useServerFn(
      listStudioSnapshots,
    );

  const runUpdateProject =
    useServerFn(
      updateStudioProject,
    );

  const runCreateSnapshot =
    useServerFn(
      createStudioSnapshot,
    );

  /*
   * Builder V2:
   *
   * - React/Vite websites
   * - 10 credits per website
   * - 1 credit per AI edit
   */
  const runGenerateWebsite =
    useServerFn(
      generateBusinessWebsite,
    );

  const runApplyWebsiteEdit =
    useServerFn(
      applyBusinessWebsiteEdit,
    );

  const runSaveFiles =
    useServerFn(
      saveStudioFiles,
    );

  const runUndoEdit =
    useServerFn(
      undoLastBusinessWebsiteEdit,
    );

  /* ------------------------------------------------------------------------ */
  /*                                   DATA                                   */
  /* ------------------------------------------------------------------------ */

  const {
    data:
      projectRes,
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
        !!user &&
        !!projectId,
    });

  const project =
    projectRes &&
    "project" in
      projectRes
      ? projectRes.project
      : null;

  const {
    data:
      messagesRes,

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
        !!user &&
        !!projectId,
    });

  const messages:
    StudioMessage[] =
      messagesRes
        ?.messages ??
      [];

  const {
    data:
      snapshotsRes,

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
        !!user &&
        !!projectId,
    });

  const snapshots:
    StudioSnapshot[] =
      snapshotsRes
        ?.snapshots ??
      [];

  /* ------------------------------------------------------------------------ */
  /*                              LOCAL STATE                                 */
  /* ------------------------------------------------------------------------ */

  const [
    projectName,
    setProjectName,
  ] =
    useState("");

  const [
    isEditingName,
    setIsEditingName,
  ] =
    useState(
      false,
    );

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
    deploymentUrl,
    setDeploymentUrl,
  ] =
    useState<
      string | null
    >(null);

  const [
    showDeploy,
    setShowDeploy,
  ] =
    useState(
      false,
    );

  const [
    mobileTab,
    setMobileTab,
  ] =
    useState<
      | "chat"
      | "code"
      | "preview"
    >(
      "chat",
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
    optimisticMessages,
    setOptimisticMessages,
  ] =
    useState<
      StudioMessage[]
    >([]);

  const allMessages =
    [
      ...messages,
      ...optimisticMessages,
    ];

  /* ------------------------------------------------------------------------ */
  /*                                 EFFECTS                                  */
  /* ------------------------------------------------------------------------ */

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
        !isEditingName
      ) {
        setProjectName(
          project.name,
        );
      }

      if (
        project.deployment_url
      ) {
        setDeploymentUrl(
          project.deployment_url,
        );
      }

      try {
        const parsed =
          toStudioFileMap(
            parseStudioFiles(
              project.files_json,
            ),
          );

        setFiles(
          parsed,
        );

        const paths =
          Object.keys(
            parsed,
          );

        if (
          paths.length >
            0 &&
          !currentFile
        ) {
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
            preferred,
          );

          setOpenFiles([
            preferred,
          ]);
        }
      } catch {
        setFiles({});
      }
    },

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      project?.id,
      project?.files_json,
      project?.name,
      project?.deployment_url,
    ],
  );

  /*
   * Projects created by the generic Studio creation flow
   * may contain an initial prompt in sessionStorage.
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

      if (
        stored
      ) {
        sessionStorage.removeItem(
          `studio_initial_prompt_${projectId}`,
        );

        const timeout =
          setTimeout(
            () =>
              handleSend(
                stored,
              ),

            800,
          );

        return () =>
          clearTimeout(
            timeout,
          );
      }
    },

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      projectId,
      user,
      messages.length,
    ],
  );

  /*
   * Automatic business website generation.
   *
   * This is triggered by:
   *
   * /studio/:id?generate=1
   *
   * Builder V2 now charges Studio credits server-side
   * only after successful generation.
   */
  useEffect(
    () => {
      if (
        (
          generate !==
            "1" &&
          project
            ?.generation_status !==
            "idle"
        ) ||
        !project ||
        project.template !==
          "business-website" ||
        project
          .generation_status ===
          "ready" ||
        isStreaming
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
          (
            result,
          ) => {
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

            const preferred =
              mapped[
                "src/App.jsx"
              ] !==
              undefined
                ? "src/App.jsx"
                : result
                    .files[0]
                    ?.path;

            if (
              preferred
            ) {
              handleFileSelect(
                preferred,
              );
            }

            const remaining =
              result
                .studioCredits
                ?.remaining;

            if (
              remaining ===
              null
            ) {
              toast.success(
                "Website generated — Agency Studio credits are unlimited.",
              );
            } else if (
              typeof remaining ===
              "number"
            ) {
              toast.success(
                `Website generated — ${result.studioCredits.charged} Studio credits used. ${remaining} remaining.`,
              );
            } else {
              toast.success(
                "Website generated — it is ready to preview.",
              );
            }

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
          },
        )
        .catch(
          () => {
            if (
              !cancelled
            ) {
              toast.error(
                "Website generation failed. Please try again.",
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

  /* ------------------------------------------------------------------------ */
  /*                              PROJECT NAME                                */
  /* ------------------------------------------------------------------------ */

  const handleNameBlur =
    async () => {
      setIsEditingName(
        false,
      );

      if (
        !projectName.trim() ||
        projectName ===
          project?.name
      ) {
        return;
      }

      await runUpdateProject({
        data: {
          id:
            projectId,

          name:
            projectName.trim(),
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

  /* ------------------------------------------------------------------------ */
  /*                              FILE EDITING                                */
  /* ------------------------------------------------------------------------ */

  const handleManualFileChange =
    (
      path: string,

      content: string,
    ) => {
      setFiles(
        (
          current,
        ) => ({
          ...current,

          [path]:
            content,
        }),
      );
    };

  const handleCreateFile =
    () => {
      const path =
        window
          .prompt(
            "New file path (for example: src/components/NewSection.jsx)",
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
          "Use a new, relative file path without .. or backslashes.",
        );

        return;
      }

      setFiles(
        (
          current,
        ) => ({
          ...current,

          [path]:
            "",
        }),
      );

      handleFileSelect(
        path,
      );
    };

  const handleDeleteFile =
    (
      path: string,
    ) => {
      if (
        path ===
        "index.html"
      ) {
        toast.error(
          "index.html is required by the Vite project.",
        );

        return;
      }

      if (
        path ===
        "package.json"
      ) {
        toast.error(
          "package.json is required by the React/Vite project.",
        );

        return;
      }

      if (
        path ===
          "src/main.jsx" ||
        path ===
          "src/App.jsx"
      ) {
        toast.error(
          `${path} is required by the React website.`,
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
        (
          current,
        ) => {
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
        (
          current,
        ) =>
          current.filter(
            (
              file,
            ) =>
              file !==
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

  const handleRenameFile =
    (
      path: string,
    ) => {
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
        path ===
          "index.html" ||
        path ===
          "package.json" ||
        path ===
          "src/main.jsx" ||
        path ===
          "src/App.jsx"
      ) {
        toast.error(
          `${path} is a required project file and cannot be renamed.`,
        );

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
          "Use a new, relative file path without .. or backslashes.",
        );

        return;
      }

      setFiles(
        (
          current,
        ) => {
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
        (
          current,
        ) =>
          current.map(
            (
              file,
            ) =>
              file ===
              path
                ? nextPath
                : file,
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

  const handleSaveFiles =
    async () => {
      setIsSaving(
        true,
      );

      try {
        const result =
          await runSaveFiles(
            {
              data: {
                project_id:
                  projectId,

                files:
                  fromStudioFileMap(
                    files,
                  ),
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

        toast.success(
          "Website saved.",
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
          "Could not save the website.",
        );
      } finally {
        setIsSaving(
          false,
        );
      }
    };

  const handleUndo =
    async () => {
      try {
        const result =
          await runUndoEdit(
            {
              data: {
                project_id:
                  projectId,
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

        setFiles(
          toStudioFileMap(
            result.files,
          ),
        );

        toast.success(
          "Last AI edit undone.",
        );

        queryClient.invalidateQueries(
          {
            queryKey: [
              "studio-project",
              projectId,
            ],
          },
        );

        refetchSnapshots();
      } catch {
        toast.error(
          "Could not undo the last edit.",
        );
      }
    };

  /* ------------------------------------------------------------------------ */
  /*                            FILE NAVIGATION                               */
  /* ------------------------------------------------------------------------ */

  const handleFileSelect =
    (
      path: string,
    ) => {
      if (
        !openFiles.includes(
          path,
        )
      ) {
        setOpenFiles(
          (
            previous,
          ) => [
            ...previous,
            path,
          ],
        );
      }

      setCurrentFile(
        path,
      );

      if (
        isMobile
      ) {
        setMobileTab(
          "code",
        );
      }
    };

  const closeFile =
    (
      event:
        React.MouseEvent,

      path: string,
    ) => {
      event.stopPropagation();

      const next =
        openFiles.filter(
          (
            item,
          ) =>
            item !==
            path,
        );

      setOpenFiles(
        next,
      );

      if (
        currentFile ===
        path
      ) {
        setCurrentFile(
          next.length >
            0
            ? next[
                next.length -
                  1
              ]
            : null,
        );
      }
    };

  /* ------------------------------------------------------------------------ */
  /*                            AI GENERATION                                 */
  /* ------------------------------------------------------------------------ */

  const handleSend =
    async (
      promptText:
        string,
    ) => {
      if (
        !promptText.trim() ||
        isStreaming ||
        !user
      ) {
        return;
      }

      /*
       * Business website projects use Builder V2.
       *
       * Initial build = 10 Studio credits.
       * AI edits      = 1 Studio credit.
       *
       * Credit enforcement happens server-side.
       */
      if (
        project?.template ===
        "business-website"
      ) {
        setIsStreaming(
          true,
        );

        try {
          if (
            Object.keys(
              files,
            ).length ===
            0
          ) {
            const result =
              await runGenerateWebsite(
                {
                  data: {
                    project_id:
                      projectId,
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

            const preferred =
              mapped[
                "src/App.jsx"
              ] !==
              undefined
                ? "src/App.jsx"
                : result
                    .files[0]
                    ?.path;

            if (
              preferred
            ) {
              handleFileSelect(
                preferred,
              );
            }

            const remaining =
              result
                .studioCredits
                ?.remaining;

            if (
              remaining ===
              null
            ) {
              toast.success(
                "Website generated — Agency Studio credits are unlimited.",
              );
            } else if (
              typeof remaining ===
              "number"
            ) {
              toast.success(
                `Website generated — ${result.studioCredits.charged} Studio credits used. ${remaining} remaining.`,
              );
            } else {
              toast.success(
                "Website generated — it is ready to preview.",
              );
            }
          } else {
            const result =
              await runApplyWebsiteEdit(
                {
                  data: {
                    project_id:
                      projectId,

                    request:
                      promptText,
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

            setFiles(
              toStudioFileMap(
                result.files,
              ),
            );

            const remaining =
              result
                .studioCredits
                ?.remaining;

            if (
              remaining ===
              null
            ) {
              toast.success(
                "Website updated.",
              );
            } else if (
              typeof remaining ===
              "number"
            ) {
              toast.success(
                `Website updated — 1 Studio credit used. ${remaining} remaining.`,
              );
            } else {
              toast.success(
                "Website updated.",
              );
            }
          }

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

          refetchMessages();

          refetchSnapshots();
        } catch {
          toast.error(
            "Could not update this website. Please try again.",
          );
        } finally {
          setIsStreaming(
            false,
          );
        }

        return;
      }

      /*
       * Legacy/general Studio projects still use
       * the generic SSE generation route.
       */
      const tempUserMsg:
        StudioMessage = {
        id:
          `temp_${Date.now()}`,

        project_id:
          projectId,

        role:
          "user",

        content:
          promptText,

        file_changes:
          null,

        created_at:
          new Date().toISOString(),
      };

      setOptimisticMessages(
        (
          previous,
        ) => [
          ...previous,
          tempUserMsg,
        ],
      );

      await runCreateMessage({
        data: {
          project_id:
            projectId,

          role:
            "user",

          content:
            promptText,
        },
      });

      queryClient.invalidateQueries(
        {
          queryKey: [
            "studio-messages",
            projectId,
          ],
        },
      );

      let leadContext:
        | {
            businessName:
              string;

            category:
              string;

            city:
              string;

            phone?:
              string;
          }
        | undefined;

      const storedLead =
        sessionStorage.getItem(
          `studio_lead_context_${projectId}`,
        );

      if (
        storedLead
      ) {
        try {
          leadContext =
            JSON.parse(
              storedLead,
            );
        } catch {
          // Ignore invalid session data.
        }
      }

      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      const token =
        session?.access_token;

      if (!token) {
        toast.error(
          "Not authenticated.",
        );

        return;
      }

      setIsStreaming(
        true,
      );

      const tempAsstId =
        `streaming_${Date.now()}`;

      setOptimisticMessages(
        (
          previous,
        ) => [
          ...previous,

          {
            id:
              tempAsstId,

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

      const historyForAI =
        [
          ...messages,
          tempUserMsg,
        ]
          .filter(
            (
              message,
            ) =>
              message.id !==
              tempAsstId,
          )
          .slice(
            -10,
          )
          .map(
            (
              message,
            ) => ({
              role:
                message.role as
                  | "user"
                  | "assistant",

              content:
                message.content,
            }),
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
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  projectId,

                  messages:
                    historyForAI,

                  files,

                  currentFile:
                    currentFile ??
                    undefined,

                  leadContext,
                }),
            },
          );

        if (
          !response.ok
        ) {
          const error =
            await response
              .json()
              .catch(
                () => ({
                  error:
                    "Unknown error",
                }),
              );

          if (
            error.error ===
            "limit_reached"
          ) {
            toast.error(
              error.message ??
                "Monthly AI limit reached. Upgrade to continue.",
            );
          } else {
            toast.error(
              error.error ||
                error.message ||
                "Generation failed. Please try again.",
            );
          }

          setOptimisticMessages(
            (
              previous,
            ) =>
              previous.filter(
                (
                  message,
                ) =>
                  message.id !==
                    tempAsstId &&
                  message.id !==
                    tempUserMsg.id,
              ),
          );

          return;
        }

        if (
          !response.body
        ) {
          toast.error(
            "AI returned an empty response.",
          );

          return;
        }

        const reader =
          response.body.getReader();

        const decoder =
          new TextDecoder();

        let finalSummary =
          "";

        let finalFileChanges:
          FileChange[] =
          [];

        let sawError =
          false;

        while (
          true
        ) {
          const {
            value,
            done,
          } =
            await reader.read();

          if (
            done
          ) {
            break;
          }

          const chunk =
            decoder.decode(
              value,
              {
                stream:
                  true,
              },
            );

          for (
            const line of
            chunk.split(
              "\n",
            )
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
                ) as StreamEvent;
            } catch {
              continue;
            }

            if (
              event.type ===
              "progress"
            ) {
              continue;
            }

            if (
              event.type ===
              "text"
            ) {
              finalSummary =
                event.text;

              setOptimisticMessages(
                (
                  previous,
                ) =>
                  previous.map(
                    (
                      message,
                    ) =>
                      message.id ===
                      tempAsstId
                        ? {
                            ...message,

                            content:
                              finalSummary,
                          }
                        : message,
                  ),
              );
            }

            if (
              event.type ===
              "files"
            ) {
              finalFileChanges =
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
                finalSummary =
                  event.summary;
              }

              if (
                event.fileChanges
              ) {
                finalFileChanges =
                  event.fileChanges;
              }
            }

            if (
              event.type ===
              "error"
            ) {
              sawError =
                true;

              console.error(
                "Studio generate stream error:",
                event.error,
              );
            }
          }
        }

        if (
          sawError &&
          !finalSummary &&
          finalFileChanges.length ===
            0
        ) {
          toast.error(
            "Generation failed. Please try again.",
          );

          setOptimisticMessages(
            (
              previous,
            ) =>
              previous.filter(
                (
                  message,
                ) =>
                  message.id !==
                    tempAsstId &&
                  message.id !==
                    tempUserMsg.id,
              ),
          );

          return;
        }

        const newFiles =
          applyStructuredChanges(
            files,
            finalFileChanges,
          );

        setFiles(
          newFiles,
        );

        if (
          finalFileChanges.length >
          0
        ) {
          handleFileSelect(
            finalFileChanges[
              0
            ].path,
          );
        }

        const summaryText =
          finalSummary ||
          "Done — I updated the site.";

        const changesMarker =
          finalFileChanges.length >
          0
            ? JSON.stringify(
                finalFileChanges.map(
                  (
                    file,
                  ) => ({
                    path:
                      file.path,

                    action:
                      file.action,
                  }),
                ),
              )
            : null;

        await runCreateMessage({
          data: {
            project_id:
              projectId,

            role:
              "assistant",

            content:
              summaryText,

            file_changes:
              changesMarker,
          },
        });

        await runUpdateProject({
          data: {
            id:
              projectId,

            files_json:
              JSON.stringify(
                newFiles,
              ),
          },
        });

        if (
          changesMarker
        ) {
          await runCreateSnapshot(
            {
              data: {
                project_id:
                  projectId,

                label:
                  promptText.slice(
                    0,
                    80,
                  ),

                files_json:
                  JSON.stringify(
                    newFiles,
                  ),

                files_count:
                  Object.keys(
                    newFiles,
                  ).length,
              },
            },
          );

          refetchSnapshots();
        }

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
              "studio-projects",
            ],
          },
        );
      } catch (
        error
      ) {
        console.error(
          "Studio generate error:",
          error,
        );

        toast.error(
          "Could not reach AI. Check your connection.",
        );
      } finally {
        setIsStreaming(
          false,
        );

        setOptimisticMessages(
          (
            previous,
          ) =>
            previous.filter(
              (
                message,
              ) =>
                message.id !==
                  tempAsstId &&
                message.id !==
                  tempUserMsg.id,
            ),
        );

        refetchMessages();
      }
    };

  const fileCount =
    Object.keys(
      files,
    ).length;

  /* ------------------------------------------------------------------------ */
  /*                                  RENDER                                  */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0f0f12] text-foreground">
      {/* Top bar */}

      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-white/5 bg-[#0f0f12]/95 px-3 backdrop-blur-sm">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            onClick={() =>
              navigate({
                to:
                  "/studio",
              })
            }
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
            title="Back to Studio"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="h-4 w-px shrink-0 bg-white/8" />

          <div className="flex shrink-0 select-none items-center gap-1.5">
            <span className="flex size-6 items-center justify-center rounded-lg border border-primary/20 bg-primary/15 font-mono text-[10px] font-semibold text-primary">
              K
            </span>

            <span className="hidden text-xs font-semibold tracking-tight text-zinc-300 sm:block">
              Studio
            </span>
          </div>

          <div className="hidden h-4 w-px shrink-0 bg-white/8 sm:block" />

          <div className="flex min-w-0 items-center gap-1">
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={
                    projectName
                  }
                  onChange={(
                    event,
                  ) =>
                    setProjectName(
                      event
                        .target
                        .value,
                    )
                  }
                  onBlur={
                    handleNameBlur
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      handleNameBlur();
                    }

                    if (
                      event.key ===
                      "Escape"
                    ) {
                      setIsEditingName(
                        false,
                      );

                      setProjectName(
                        project?.name ??
                          "",
                      );
                    }
                  }}
                  autoFocus
                  className="w-[140px] rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-sm font-medium text-zinc-100 outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/10 sm:w-[200px]"
                />

                <button
                  onClick={
                    handleNameBlur
                  }
                  className="flex h-6 w-6 items-center justify-center rounded text-emerald-400 transition-colors hover:bg-emerald-500/10"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() =>
                  setIsEditingName(
                    true,
                  )
                }
                className="group flex max-w-[120px] items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-white/5 sm:max-w-[220px]"
                title="Click to rename project"
              >
                <span className="truncate text-sm font-medium text-zinc-200">
                  {project
                    ?.name ||
                    "Loading…"}
                </span>

                <Pencil className="h-3 w-3 shrink-0 text-zinc-700 transition-colors group-hover:text-zinc-400" />
              </button>
            )}
          </div>

          {isStreaming && (
            <div className="ml-1 hidden shrink-0 items-center gap-1.5 sm:flex">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />

              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:120ms]" />

              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:240ms]" />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={
              handleSaveFiles
            }
            disabled={
              isSaving ||
              fileCount ===
                0
            }
            className="h-8 border-white/10 bg-transparent px-2 text-xs text-zinc-200 hover:bg-white/5 sm:px-3"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>

          {project?.template ===
            "business-website" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={
                handleUndo
              }
              className="hidden h-8 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-100 sm:inline-flex"
            >
              Undo AI edit
            </Button>
          )}

          {deploymentUrl ? (
            <a
              href={
                deploymentUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/5 hover:text-emerald-300 sm:flex"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />

                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>

              Live

              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <div className="hidden items-center gap-1.5 px-2 text-xs text-zinc-600 sm:flex">
              <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" />

              <span>
                Draft
              </span>
            </div>
          )}

          <Button
            size="sm"
            onClick={() =>
              setShowDeploy(
                true,
              )
            }
            className="h-8 gap-1.5 bg-primary px-3 text-xs text-white shadow-md shadow-primary/20 transition-all hover:bg-primary/90"
          >
            <Rocket className="h-3.5 w-3.5" />

            <span className="hidden font-medium sm:inline">
              Publish
            </span>
          </Button>
        </div>
      </header>

      {/* Main workspace */}

      {isMobile ? (
        <MobileLayout
          projectId={
            projectId
          }
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
          deploymentUrl={
            deploymentUrl
          }
          allMessages={
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
          onFileSelect={
            handleFileSelect
          }
          onCloseFile={
            closeFile
          }
          onFileChange={
            handleManualFileChange
          }
          onCreateFile={
            handleCreateFile
          }
          onDeleteFile={
            handleDeleteFile
          }
          onRenameFile={
            handleRenameFile
          }
          onSend={
            handleSend
          }
          onDeploy={() =>
            setShowDeploy(
              true,
            )
          }
        />
      ) : (
        <DesktopLayout
          files={
            files
          }
          currentFile={
            currentFile
          }
          openFiles={
            openFiles
          }
          deploymentUrl={
            deploymentUrl
          }
          allMessages={
            allMessages
          }
          snapshots={
            snapshots
          }
          isStreaming={
            isStreaming
          }
          fileCount={
            fileCount
          }
          mounted={
            mounted
          }
          onFileSelect={
            handleFileSelect
          }
          onCloseFile={
            closeFile
          }
          onFileChange={
            handleManualFileChange
          }
          onCreateFile={
            handleCreateFile
          }
          onDeleteFile={
            handleDeleteFile
          }
          onRenameFile={
            handleRenameFile
          }
          onSend={
            handleSend
          }
          onDeploy={() =>
            setShowDeploy(
              true,
            )
          }
        />
      )}

      {/* Mobile Studio tabs */}

      {isMobile && (
        <nav className="flex h-16 shrink-0 items-center gap-1 border-t border-white/5 bg-[#0f0f12] px-2">
          {(
            [
              {
                id:
                  "chat" as const,

                icon:
                  MessageSquare,

                label:
                  "Chat",
              },

              {
                id:
                  "code" as const,

                icon:
                  Code2,

                label:
                  "Code",
              },

              {
                id:
                  "preview" as const,

                icon:
                  Eye,

                label:
                  "Preview",
              },
            ] as const
          ).map(
            (
              tab,
            ) => (
              <button
                key={
                  tab.id
                }
                onClick={() =>
                  setMobileTab(
                    tab.id,
                  )
                }
                className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 transition-all ${
                  mobileTab ===
                  tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                <tab.icon className="h-5 w-5" />

                <span className="text-[10px] font-medium">
                  {
                    tab.label
                  }
                </span>
              </button>
            ),
          )}
        </nav>
      )}

      {showDeploy && (
        <DeploySheet
          projectId={
            projectId
          }
          projectName={
            project?.name ||
            ""
          }
          fileCount={
            fileCount
          }
          onClose={() =>
            setShowDeploy(
              false,
            )
          }
          onDeployed={(
            url,
          ) => {
            setDeploymentUrl(
              url,
            );

            setShowDeploy(
              false,
            );
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               DESKTOP LAYOUT                               */
/* -------------------------------------------------------------------------- */

function DesktopLayout({
  files,
  currentFile,
  openFiles,
  deploymentUrl,
  allMessages,
  snapshots,
  isStreaming,
  fileCount,
  mounted,
  onFileSelect,
  onCloseFile,
  onFileChange,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onSend,
  onDeploy,
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

  deploymentUrl:
    string | null;

  allMessages:
    StudioMessage[];

  snapshots:
    StudioSnapshot[];

  isStreaming:
    boolean;

  fileCount:
    number;

  mounted:
    boolean;

  onFileSelect:
    (
      path:
        string,
    ) => void;

  onCloseFile:
    (
      event:
        React.MouseEvent,

      path:
        string,
    ) => void;

  onFileChange:
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

  onDeploy:
    () => void;
}) {
  return (
    <div className="flex-1 overflow-hidden">
      <ResizablePanelGroup
        orientation="horizontal"
        className="h-full"
      >
        <ResizablePanel
          defaultSize={
            34
          }
          minSize={
            26
          }
          maxSize={
            46
          }
          className="flex min-h-0 flex-col"
        >
          <ChatPanel
            allMessages={
              allMessages
            }
            isStreaming={
              isStreaming
            }
            onSend={
              onSend
            }
          />
        </ResizablePanel>

        <ResizableHandle className="w-px cursor-col-resize bg-white/5 transition-colors duration-200 hover:bg-primary/30" />

        <ResizablePanel
          defaultSize={
            66
          }
          minSize={
            40
          }
          className="flex min-h-0 flex-col"
        >
          <WorkspacePanel
            files={
              files
            }
            currentFile={
              currentFile
            }
            openFiles={
              openFiles
            }
            deploymentUrl={
              deploymentUrl
            }
            snapshots={
              snapshots
            }
            fileCount={
              fileCount
            }
            mounted={
              mounted
            }
            onFileSelect={
              onFileSelect
            }
            onCloseFile={
              onCloseFile
            }
            onFileChange={
              onFileChange
            }
            onCreateFile={
              onCreateFile
            }
            onDeleteFile={
              onDeleteFile
            }
            onRenameFile={
              onRenameFile
            }
            onDeploy={
              onDeploy
            }
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                MOBILE LAYOUT                               */
/* -------------------------------------------------------------------------- */

function MobileLayout({
  files,
  currentFile,
  openFiles,
  tab,
  deploymentUrl,
  allMessages,
  snapshots,
  isStreaming,
  mounted,
  onFileSelect,
  onCloseFile,
  onFileChange,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onSend,
  onDeploy,
}: {
  projectId:
    string;

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
    | "chat"
    | "code"
    | "preview";

  deploymentUrl:
    string | null;

  allMessages:
    StudioMessage[];

  snapshots:
    StudioSnapshot[];

  isStreaming:
    boolean;

  mounted:
    boolean;

  onFileSelect:
    (
      path:
        string,
    ) => void;

  onCloseFile:
    (
      event:
        React.MouseEvent,

      path:
        string,
    ) => void;

  onFileChange:
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

  onDeploy:
    () => void;
}) {
  return (
    <div className="flex-1 overflow-hidden">
      {tab ===
        "chat" && (
        <ChatPanel
          allMessages={
            allMessages
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
        <div className="flex h-full flex-col bg-[#09090b]">
          {openFiles.length >
            0 && (
            <div
              className="flex shrink-0 overflow-x-auto border-b border-white/5 bg-[#0f0f12]"
              style={{
                scrollbarWidth:
                  "none",
              }}
            >
              {openFiles.map(
                (
                  path,
                ) => (
                  <div
                    key={
                      path
                    }
                    onClick={() =>
                      onFileSelect(
                        path,
                      )
                    }
                    className={`group flex h-9 shrink-0 cursor-pointer items-center border-r border-white/5 px-3 font-mono text-xs transition-colors ${
                      currentFile ===
                      path
                        ? "border-t border-t-primary bg-[#09090b] text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <FileIcon
                      path={
                        path
                      }
                      className="mr-1.5 h-3.5 w-3.5"
                    />

                    {path
                      .split(
                        "/",
                      )
                      .pop()}

                    <button
                      onClick={(
                        event,
                      ) =>
                        onCloseFile(
                          event,
                          path,
                        )
                      }
                      className="ml-2 text-zinc-600 transition-colors hover:text-zinc-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ),
              )}
            </div>
          )}

          {mounted &&
          currentFile &&
          files[
            currentFile
          ] !==
            undefined ? (
            <div className="flex-1">
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
                    ] ||
                    ""
                  }
                  onChange={(
                    value,
                  ) =>
                    onFileChange(
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

                    fontSize:
                      13,

                    fontFamily:
                      "monospace",

                    padding: {
                      top:
                        12,
                    },

                    scrollBeyondLastLine:
                      false,

                    automaticLayout:
                      true,
                  }}
                />
              </Suspense>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <FilesTab
                files={
                  files
                }
                onFileSelect={
                  onFileSelect
                }
                onCreateFile={
                  onCreateFile
                }
                onDeleteFile={
                  onDeleteFile
                }
                onRenameFile={
                  onRenameFile
                }
              />
            </div>
          )}
        </div>
      )}

      {tab ===
        "preview" && (
        <div className="flex h-full flex-col">
          <StudioLivePreview
            files={
              files
            }
            deploymentUrl={
              deploymentUrl
            }
            onDeploy={
              onDeploy
            }
            fileCount={
              Object.keys(
                files,
              ).length
            }
          />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 CHAT PANEL                                 */
/* -------------------------------------------------------------------------- */

function ChatPanel({
  allMessages,
  isStreaming,
  onSend,
}: {
  allMessages:
    StudioMessage[];

  isStreaming:
    boolean;

  onSend:
    (
      prompt:
        string,
    ) => void;
}) {
  const [
    prompt,
    setPrompt,
  ] =
    useState("");

  const placeholder =
    useAnimatedPlaceholder(
      CHAT_PLACEHOLDERS,
      2800,
    );

  const messagesEndRef =
    useRef<HTMLDivElement>(
      null,
    );

  const textareaRef =
    useRef<HTMLTextAreaElement>(
      null,
    );

  useEffect(
    () => {
      messagesEndRef.current?.scrollIntoView(
        {
          behavior:
            "smooth",
        },
      );
    },

    [
      allMessages,
    ],
  );

  const handleSend =
    () => {
      if (
        !prompt.trim() ||
        isStreaming
      ) {
        return;
      }

      onSend(
        prompt.trim(),
      );

      setPrompt("");
    };

  const handleQuickStart =
    (
      value: string,
    ) => {
      onSend(
        value,
      );
    };

  return (
    <div className="flex h-full flex-col bg-[#0d0d10]">
      <div
        className="flex-1 overflow-y-auto"
        style={{
          scrollbarWidth:
            "thin",

          scrollbarColor:
            "rgba(255,255,255,0.07) transparent",
        }}
      >
        {allMessages.length ===
        0 ? (
          <ChatEmptyState
            onQuickStart={
              handleQuickStart
            }
            isStreaming={
              isStreaming
            }
          />
        ) : (
          <div className="space-y-6 px-4 py-5">
            {allMessages.map(
              (
                message,
              ) => (
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
                messagesEndRef
              }
            />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/5 bg-[#0d0d10] p-3">
        <div
          className={`relative rounded-xl border transition-all duration-200 ${
            isStreaming
              ? "border-primary/20 bg-white/[0.02]"
              : "border-white/8 bg-white/[0.02] focus-within:border-primary/30"
          }`}
        >
          <Textarea
            ref={
              textareaRef
            }
            value={
              prompt
            }
            onChange={(
              event,
            ) =>
              setPrompt(
                event.target
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
                ) &&
                prompt.trim() &&
                !isStreaming
              ) {
                event.preventDefault();

                handleSend();
              }
            }}
            placeholder={
              isStreaming
                ? "Studio is writing…"
                : placeholder
            }
            className="min-h-[80px] max-h-[180px] resize-none border-0 bg-transparent px-4 py-3.5 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0"
            disabled={
              isStreaming
            }
          />

          <div className="flex items-center justify-between px-3 pb-3">
            <span className="select-none text-[11px] text-zinc-700">
              ⌘↵ to send
            </span>

            <Button
              size="sm"
              onClick={
                handleSend
              }
              disabled={
                !prompt.trim() ||
                isStreaming
              }
              className="h-8 gap-1.5 bg-primary px-4 text-xs font-medium text-white shadow-md shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-30"
            >
              {isStreaming ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />

                  Writing…
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />

                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              CHAT EMPTY STATE                              */
/* -------------------------------------------------------------------------- */

function ChatEmptyState({
  onQuickStart,
  isStreaming,
}: {
  onQuickStart:
    (
      prompt:
        string,
    ) => void;

  isStreaming:
    boolean;
}) {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 py-8">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 font-mono text-sm font-semibold tracking-[0.18em] text-primary shadow-xl shadow-primary/10">
        01
      </div>

      <h3 className="mb-1.5 text-sm font-semibold text-zinc-100">
        What are we
        building?
      </h3>

      <p className="mb-7 max-w-[220px] text-center text-xs leading-relaxed text-zinc-500">
        Describe a website
        or pick a quick
        action to get
        started.
      </p>

      <div className="w-full max-w-[280px] space-y-2">
        {QUICK_STARTS.map(
          (
            quickStart,
            index,
          ) => (
            <button
              key={
                quickStart.label
              }
              onClick={() =>
                !isStreaming &&
                onQuickStart(
                  quickStart.prompt,
                )
              }
              disabled={
                isStreaming
              }
              className="group flex w-full items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3 text-left transition-all hover:border-white/10 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="shrink-0 font-mono text-[10px] text-zinc-600">
                {String(
                  index +
                    1,
                ).padStart(
                  2,
                  "0",
                )}
              </span>

              <span className="flex-1 text-xs font-medium text-zinc-400 transition-colors group-hover:text-zinc-200">
                {
                  quickStart.label
                }
              </span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              MESSAGE BUBBLE                                */
/* -------------------------------------------------------------------------- */

function MessageBubble({
  message,
  isStreaming,
}: {
  message:
    StudioMessage;

  isStreaming:
    boolean;
}) {
  const isUser =
    message.role ===
    "user";

  const isEmpty =
    !message.content;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] break-words rounded-2xl rounded-tr-md border border-primary/20 bg-primary/15 px-4 py-3 text-sm leading-relaxed text-zinc-100">
          {
            message.content
          }
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-mono text-[10px] font-semibold text-primary">
        K
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        {isEmpty &&
        isStreaming ? (
          <div className="flex items-center gap-1.5 py-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-600 [animation-delay:0ms]" />

            <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-600 [animation-delay:150ms]" />

            <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-600 [animation-delay:300ms]" />
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300">
            {
              message.content
            }
          </div>
        )}

        {message.file_changes && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/8 px-2.5 py-1.5 text-[11px] font-medium text-emerald-400">
            <FileCode className="h-3 w-3" />

            Files updated
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             WORKSPACE PANEL                                */
/* -------------------------------------------------------------------------- */

function WorkspacePanel({
  files,
  currentFile,
  openFiles,
  deploymentUrl,
  snapshots,
  fileCount,
  mounted,
  onFileSelect,
  onCloseFile,
  onDeploy,
  onFileChange,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
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

  deploymentUrl:
    string | null;

  snapshots:
    StudioSnapshot[];

  fileCount:
    number;

  mounted:
    boolean;

  onFileSelect:
    (
      path:
        string,
    ) => void;

  onCloseFile:
    (
      event:
        React.MouseEvent,

      path:
        string,
    ) => void;

  onFileChange:
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

  onDeploy:
    () => void;
}) {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState<
      | "preview"
      | "code"
      | "files"
      | "history"
    >(
      "preview",
    );

  const tabs =
    [
      {
        id:
          "preview" as const,

        icon:
          Eye,

        label:
          "Preview",
      },

      {
        id:
          "code" as const,

        icon:
          Code2,

        label:
          "Code",
      },

      {
        id:
          "files" as const,

        icon:
          FolderGit2,

        label:
          "Files",
      },

      {
        id:
          "history" as const,

        icon:
          History,

        label:
          "History",
      },
    ];

  return (
    <div className="flex h-full flex-col bg-[#0f0f12]">
      <div className="flex h-10 shrink-0 items-center border-b border-white/5 bg-[#0f0f12] px-1">
        <div className="flex h-full flex-1 items-center">
          {tabs.map(
            (
              tab,
            ) => (
              <button
                key={
                  tab.id
                }
                onClick={() =>
                  setActiveTab(
                    tab.id,
                  )
                }
                className={`relative flex h-full items-center gap-1.5 px-3.5 text-xs font-medium transition-colors ${
                  activeTab ===
                  tab.id
                    ? "text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />

                {
                  tab.label
                }

                {activeTab ===
                  tab.id && (
                  <span className="absolute bottom-0 left-2 right-2 h-px rounded-full bg-primary" />
                )}
              </button>
            ),
          )}
        </div>

        {deploymentUrl && (
          <a
            href={
              deploymentUrl
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 pr-3 text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>

            Live

            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab ===
          "preview" && (
          <StudioLivePreview
            files={
              files
            }
            deploymentUrl={
              deploymentUrl
            }
            onDeploy={
              onDeploy
            }
            fileCount={
              fileCount
            }
          />
        )}

        {activeTab ===
          "code" && (
          <div className="flex h-full flex-col bg-[#09090b]">
            {openFiles.length >
              0 && (
              <div
                className="flex shrink-0 overflow-x-auto border-b border-white/5 bg-[#0f0f12]"
                style={{
                  scrollbarWidth:
                    "none",
                }}
              >
                {openFiles.map(
                  (
                    path,
                  ) => (
                    <div
                      key={
                        path
                      }
                      onClick={() =>
                        onFileSelect(
                          path,
                        )
                      }
                      className={`group flex h-9 shrink-0 cursor-pointer items-center border-r border-white/5 px-3.5 font-mono text-xs transition-colors ${
                        currentFile ===
                        path
                          ? "border-t border-t-primary bg-[#09090b] text-zinc-100"
                          : "text-zinc-500 hover:bg-white/3 hover:text-zinc-300"
                      }`}
                    >
                      <FileIcon
                        path={
                          path
                        }
                        className="mr-1.5 h-3.5 w-3.5"
                      />

                      {path
                        .split(
                          "/",
                        )
                        .pop()}

                      <button
                        onClick={(
                          event,
                        ) =>
                          onCloseFile(
                            event,
                            path,
                          )
                        }
                        className="ml-2.5 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ),
                )}
              </div>
            )}

            <div className="relative flex-1 overflow-hidden">
              {mounted &&
              currentFile &&
              files[
                currentFile
              ] !==
                undefined ? (
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
                      ] ||
                      ""
                    }
                    onChange={(
                      value,
                    ) =>
                      onFileChange(
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

                      fontSize:
                        13,

                      fontFamily:
                        "Geist Mono, JetBrains Mono, monospace",

                      padding: {
                        top:
                          16,
                      },

                      scrollBeyondLastLine:
                        false,

                      lineHeight:
                        24,

                      smoothScrolling:
                        true,

                      cursorBlinking:
                        "smooth",

                      automaticLayout:
                        true,
                    }}
                  />
                </Suspense>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <Code2 className="mb-3 h-10 w-10 text-zinc-800" />

                  <p className="text-sm text-zinc-600">
                    Select a
                    file from
                    the Files
                    tab
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab ===
          "files" && (
          <FilesTab
            files={
              files
            }
            onFileSelect={(
              path,
            ) => {
              onFileSelect(
                path,
              );

              setActiveTab(
                "code",
              );
            }}
            onCreateFile={
              onCreateFile
            }
            onDeleteFile={
              onDeleteFile
            }
            onRenameFile={
              onRenameFile
            }
          />
        )}

        {activeTab ===
          "history" && (
          <HistoryTab
            snapshots={
              snapshots
            }
          />
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  FILES TAB                                 */
/* -------------------------------------------------------------------------- */

function FilesTab({
  files,
  onFileSelect,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
}: {
  files:
    Record<
      string,
      string
    >;

  onFileSelect:
    (
      path:
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
}) {
  const paths =
    Object.keys(
      files,
    ).sort();

  const protectedFiles =
    new Set([
      "index.html",
      "package.json",
      "src/main.jsx",
      "src/App.jsx",
    ]);

  return (
    <div
      className="h-full overflow-y-auto bg-[#0f0f12]"
      style={{
        scrollbarWidth:
          "thin",

        scrollbarColor:
          "rgba(255,255,255,0.07) transparent",
      }}
    >
      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Project files
        </span>

        <button
          type="button"
          onClick={
            onCreateFile
          }
          className="rounded px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10"
        >
          New file
        </button>
      </div>

      {paths.length ===
      0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <FolderGit2 className="mb-3 h-10 w-10 text-zinc-800" />

          <p className="max-w-[180px] text-xs leading-relaxed text-zinc-600">
            No files yet
            — ask Studio
            to build
            something.
          </p>
        </div>
      ) : (
        <div className="mt-1 space-y-px px-1 pb-3">
          {paths.map(
            (
              path,
            ) => {
              const parts =
                path.split(
                  "/",
                );

              const name =
                parts.pop() ||
                path;

              const protectedFile =
                protectedFiles.has(
                  path,
                );

              return (
                <div
                  key={
                    path
                  }
                  onClick={() =>
                    onFileSelect(
                      path,
                    )
                  }
                  className="group flex cursor-pointer items-center rounded-md py-1.5 transition-colors hover:bg-white/5"
                  style={{
                    paddingLeft:
                      `${parts.length * 14 + 10}px`,

                    paddingRight:
                      "10px",
                  }}
                >
                  <FileIcon
                    path={
                      path
                    }
                    className="mr-2 h-3.5 w-3.5 shrink-0"
                  />

                  <span className="truncate font-mono text-[12px] text-zinc-500 transition-colors group-hover:text-zinc-200">
                    {
                      name
                    }
                  </span>

                  {!protectedFile && (
                    <div className="ml-auto hidden items-center gap-1 group-hover:flex">
                      <button
                        type="button"
                        onClick={(
                          event,
                        ) => {
                          event.stopPropagation();

                          onRenameFile(
                            path,
                          );
                        }}
                        className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
                      >
                        Rename
                      </button>

                      <button
                        type="button"
                        onClick={(
                          event,
                        ) => {
                          event.stopPropagation();

                          onDeleteFile(
                            path,
                          );
                        }}
                        className="rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 HISTORY TAB                                */
/* -------------------------------------------------------------------------- */

function HistoryTab({
  snapshots,
}: {
  snapshots:
    StudioSnapshot[];
}) {
  return (
    <div
      className="h-full overflow-y-auto bg-[#0f0f12] p-4"
      style={{
        scrollbarWidth:
          "thin",

        scrollbarColor:
          "rgba(255,255,255,0.07) transparent",
      }}
    >
      <div className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
        Snapshots
      </div>

      {snapshots.length ===
      0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <History className="mb-3 h-10 w-10 text-zinc-800" />

          <p className="max-w-[180px] text-xs leading-relaxed text-zinc-600">
            Each AI edit
            creates a
            snapshot you
            can browse
            here.
          </p>
        </div>
      ) : (
        <div className="relative space-y-5 border-l border-white/6 pl-4">
          {snapshots.map(
            (
              snapshot,
            ) => (
              <div
                key={
                  snapshot.id
                }
                className="group relative"
              >
                <div className="absolute -left-[17px] top-1 h-2.5 w-2.5 rounded-full border-2 border-zinc-700 bg-[#0f0f12] transition-colors group-hover:border-primary" />

                <p className="line-clamp-2 text-sm font-medium leading-snug text-zinc-300">
                  {
                    snapshot.label
                  }
                </p>

                <p className="mt-1 text-[11px] text-zinc-600">
                  {formatDistanceToNow(
                    new Date(
                      snapshot.created_at,
                    ),
                    {
                      addSuffix:
                        true,
                    },
                  )}

                  <span className="mx-1.5 text-zinc-700">
                    ·
                  </span>

                  {
                    snapshot.files_count
                  }{" "}
                  file
                  {snapshot.files_count !==
                  1
                    ? "s"
                    : ""}
                </p>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                DEPLOY SHEET                                */
/* -------------------------------------------------------------------------- */

function DeploySheet({
  projectId,
  projectName,
  fileCount,
  onClose,
  onDeployed,
}: {
  projectId:
    string;

  projectName:
    string;

  fileCount:
    number;

  onClose:
    () => void;

  onDeployed:
    (
      url:
        string,
    ) => void;
}) {
  const [
    deploying,
    setDeploying,
  ] =
    useState(
      false,
    );

  const [
    waitingForDeployment,
    setWaitingForDeployment,
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

  const runDeploy =
    useServerFn(
      deployBusinessWebsite,
    );

  const runDeploymentStatus =
    useServerFn(
      getBusinessWebsiteDeploymentStatus,
    );

  useEffect(
    () => {
      if (
        !waitingForDeployment
      ) {
        return;
      }

      let cancelled =
        false;

      const checkStatus =
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
              setWaitingForDeployment(
                false,
              );

              setError(
                result.message ||
                  "Could not check the website status.",
              );

              return;
            }

            const url =
              (
                result as {
                  url?: unknown;
                }
              ).url;

            if (
              result.status ===
                "ready" &&
              typeof url ===
                "string"
            ) {
              setWaitingForDeployment(
                false,
              );

              toast.success(
                "Your website is live!",
              );

              onDeployed(
                url,
              );

              return;
            }

            if (
              result.status ===
              "error"
            ) {
              setWaitingForDeployment(
                false,
              );

              const detail =
                (
                  result as {
                    detail?: unknown;
                  }
                ).detail;

              setError(
                typeof detail ===
                  "string"
                  ? detail
                  : "Vercel could not build this website.",
              );
            }
          } catch {
            if (
              !cancelled
            ) {
              setWaitingForDeployment(
                false,
              );

              setError(
                "Could not check the website status. Try again shortly.",
              );
            }
          }
        };

      void checkStatus();

      const interval =
        window.setInterval(
          () =>
            void checkStatus(),

          5000,
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
      onDeployed,
      projectId,
      runDeploymentStatus,
      waitingForDeployment,
    ],
  );

  const handleDeploy =
    async () => {
      setDeploying(
        true,
      );

      setError(
        null,
      );

      try {
        const data =
          await runDeploy(
            {
              data: {
                project_id:
                  projectId,
              },
            },
          );

        if (
          "error" in
          data
        ) {
          setError(
            data.error ===
            "vercel_not_configured"
              ? "Kodarai's managed publishing service has not been configured yet."
              : data.message ||
                  "Deployment failed.",
          );

          return;
        }

        if (
          data.status ===
            "ready" &&
          data.url
        ) {
          toast.success(
            "Your website is live!",
          );

          onDeployed(
            data.url,
          );
        } else {
          setWaitingForDeployment(
            true,
          );
        }
      } catch {
        setError(
          "Network error. Try again.",
        );
      } finally {
        setDeploying(
          false,
        );
      }
    };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={
          onClose
        }
      />

      <div className="relative w-full max-w-md rounded-2xl border border-white/8 bg-[#18181f] p-6 shadow-2xl shadow-black/50">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/5">
              <svg
                viewBox="0 0 76 65"
                className="h-4 w-4 fill-zinc-50"
              >
                <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
              </svg>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Publish
                Website
              </h2>

              <p className="mt-0.5 max-w-[200px] truncate text-xs text-zinc-500">
                {
                  projectName
                }
              </p>
            </div>
          </div>

          <button
            onClick={
              onClose
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 space-y-2.5">
          <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/3 p-3.5">
            <span className="text-sm text-zinc-400">
              Project
              files
            </span>

            <span className="font-mono text-sm font-medium text-zinc-100">
              {
                fileCount
              }
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/3 p-3.5">
            <span className="text-sm text-zinc-400">
              Framework
            </span>

            <span className="text-xs text-zinc-500">
              React +
              Vite
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/3 p-3.5">
            <span className="text-sm text-zinc-400">
              Publishing
            </span>

            <span className="text-xs text-zinc-500">
              Managed by
              Kodarai
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {
              error
            }
          </div>
        )}

        <Button
          onClick={
            handleDeploy
          }
          disabled={
            deploying ||
            waitingForDeployment ||
            fileCount ===
              0
          }
          className="h-10 w-full gap-2 bg-zinc-50 font-semibold text-zinc-950 shadow-lg shadow-black/30 transition-all hover:bg-white"
        >
          {deploying ||
          waitingForDeployment ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />

              {waitingForDeployment
                ? "Building React website…"
                : "Publishing…"}
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />

              Publish
              Website
            </>
          )}
        </Button>

        <p className="mt-3 text-center text-xs text-zinc-600">
          No GitHub or
          Vercel account
          is needed.
          Kodarai
          publishes
          through its
          managed
          deployment
          service.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              SHARED HELPERS                                */
/* -------------------------------------------------------------------------- */

function FileIcon({
  path,
  className,
}: {
  path:
    string;

  className?:
    string;
}) {
  if (
    /\.(tsx?|jsx?)$/.test(
      path,
    )
  ) {
    return (
      <FileCode
        className={`${className ?? ""} text-blue-400`}
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
        className={`${className ?? ""} text-yellow-400`}
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
        className={`${className ?? ""} text-emerald-400`}
      />
    );
  }

  return (
    <File
      className={`${className ?? ""} text-zinc-500`}
    />
  );
}

function EditorSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-[#09090b]">
      <Loader2 className="size-5 animate-spin text-zinc-700" />
    </div>
  );
}
