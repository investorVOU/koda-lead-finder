import {
  createServerFn,
} from "@tanstack/react-start";

import {
  z,
} from "zod";

import {
  requireSupabaseAuth,
} from "@/integrations/supabase/auth-middleware";

import {
  supabaseAdmin,
} from "@/integrations/supabase/client.server";

import {
  hasPaidSubscription,
} from "@/lib/subscription.server";

import {
  applyStudioFileChanges,
  parseStudioFiles,
  serializeStudioFiles,
} from "@/lib/studio-files";

import {
  generateBusinessWebsiteSpec,
  generateWebsiteEdit,
} from "@/lib/website-builder.server";

import {
  buildBusinessWebsiteFiles,
} from "@/lib/website-react-project";

import type {
  BusinessWebsiteInput,
} from "@/lib/website-templates";

import {
  AI_EDIT_CREDIT_COST,
  WEBSITE_BUILD_CREDIT_COST,
  canSpendStudioCredits,
  consumeStudioCredits,
  refundStudioCreditUsage,
} from "@/lib/studio-credits.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db =
  supabaseAdmin as any;

async function findOwnedStudioProject(
  projectId: string,

  userId: string,
) {
  const {
    data: project,
  } =
    await db
      .from(
        "studio_projects",
      )
      .select("*")
      .eq(
        "id",
        projectId,
      )
      .eq(
        "user_id",
        userId,
      )
      .maybeSingle();

  return project as
    | Record<
        string,
        unknown
      >
    | null;
}

function businessFromProject(
  project:
    Record<
      string,
      unknown
    >,
): BusinessWebsiteInput {
  try {
    const parsed =
      JSON.parse(
        String(
          project.business_details_json ??
            "{}",
        ),
      ) as BusinessWebsiteInput;

    return parsed;
  } catch {
    return {
      name:
        String(
          project.business_name ??
            project.name ??
            "",
        ),

      category:
        typeof project.business_category ===
        "string"
          ? project.business_category
          : null,
    };
  }
}

function limitMessage(
  input: {
    remaining:
      | number
      | null;

    required:
      number;
  },
) {
  if (
    input.remaining ===
    null
  ) {
    return "";
  }

  return `This action needs ${input.required} Studio credits, but you only have ${input.remaining} remaining this month.`;
}

export const generateBusinessWebsite =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .inputValidator(
      (data) =>
        z.object({
          project_id:
            z.string()
              .uuid(),
        }).parse(
          data,
        ),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        if (
          !(
            await hasPaidSubscription(
              context.userId,
            )
          )
        ) {
          return {
            error:
              "plan_required",

            message:
              "Choose a paid plan to generate a website.",
          } as const;
        }

        const capacity =
          await canSpendStudioCredits(
            context.userId,
            WEBSITE_BUILD_CREDIT_COST,
          );

        if (
          !capacity.allowed
        ) {
          return {
            error:
              "studio_credits_exhausted",

            message:
              limitMessage({
                remaining:
                  capacity.balance
                    .remaining,

                required:
                  WEBSITE_BUILD_CREDIT_COST,
              }) ||
              "You don't have enough Studio credits to generate this website.",
          } as const;
        }

        const project =
          await findOwnedStudioProject(
            data.project_id,
            context.userId,
          );

        if (!project) {
          return {
            error:
              "not_found",

            message:
              "Website project not found.",
          } as const;
        }

        const business =
          businessFromProject(
            project,
          );

        if (
          !business.name
        ) {
          return {
            error:
              "invalid_business",

            message:
              "This project is missing business information.",
          } as const;
        }

        await db
          .from(
            "studio_projects",
          )
          .update({
            status:
              "generating",

            generation_status:
              "generating",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            data.project_id,
          )
          .eq(
            "user_id",
            context.userId,
          );

        let usageId:
          | string
          | null = null;

        try {
          /*
           * No credits are charged yet.
           *
           * Gemini/Groq + image resolution must succeed first.
           */
          const specification =
            await generateBusinessWebsiteSpec(
              business,
            );

          const files =
            buildBusinessWebsiteFiles(
              business,
              specification,
            );

          /*
           * Generation has succeeded.
           *
           * Now atomically confirm the user still has
           * sufficient credits and charge them.
           */
          const creditResult =
            await consumeStudioCredits(
              {
                userId:
                  context.userId,

                projectId:
                  data.project_id,

                action:
                  "website_build",

                cost:
                  WEBSITE_BUILD_CREDIT_COST,
              },
            );

          if (
            !creditResult.success
          ) {
            await db
              .from(
                "studio_projects",
              )
              .update({
                status:
                  "draft",

                generation_status:
                  "idle",

                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                data.project_id,
              )
              .eq(
                "user_id",
                context.userId,
              );

            return {
              error:
                "studio_credits_exhausted",

              message:
                "You no longer have enough Studio credits to complete this website.",
            } as const;
          }

          usageId =
            creditResult.usageId;

          const {
            error:
              saveError,
          } =
            await db
              .from(
                "studio_projects",
              )
              .update({
                files_json:
                  serializeStudioFiles(
                    files,
                  ),

                theme_json:
                  JSON.stringify(
                    specification.theme,
                  ),

                template:
                  specification.template,

                status:
                  "ready",

                generation_status:
                  "ready",

                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                data.project_id,
              )
              .eq(
                "user_id",
                context.userId,
              );

          if (
            saveError
          ) {
            await refundStudioCreditUsage(
              usageId,
            );

            usageId =
              null;

            throw new Error(
              "Could not save generated website files.",
            );
          }

          await db
            .from(
              "studio_messages",
            )
            .insert([
              {
                project_id:
                  data.project_id,

                role:
                  "user",

                content:
                  "Generate a professional business website from this lead.",
              },

              {
                project_id:
                  data.project_id,

                role:
                  "assistant",

                content:
                  `Your React website is ready. ${WEBSITE_BUILD_CREDIT_COST} Studio credits were used.`,

                file_changes:
                  JSON.stringify(
                    files.map(
                      (
                        file,
                      ) => ({
                        path:
                          file.path,

                        action:
                          "create",
                      }),
                    ),
                  ),
              },
            ]);

          return {
            files,

            theme:
              specification.theme,

            studioCredits: {
              charged:
                WEBSITE_BUILD_CREDIT_COST,

              remaining:
                creditResult.remaining,
            },
          } as const;
        } catch (
          error
        ) {
          if (
            usageId
          ) {
            await refundStudioCreditUsage(
              usageId,
            );
          }

          await db
            .from(
              "studio_projects",
            )
            .update({
              status:
                "failed",

              generation_status:
                "failed",

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              data.project_id,
            )
            .eq(
              "user_id",
              context.userId,
            );

          return {
            error:
              "generation_failed",

            message:
              error instanceof
              Error
                ? error.message
                : "Website generation failed.",
          } as const;
        }
      },
    );

export const applyBusinessWebsiteEdit =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .inputValidator(
      (data) =>
        z.object({
          project_id:
            z.string()
              .uuid(),

          request:
            z.string()
              .min(3)
              .max(
                2000,
              ),
        }).parse(
          data,
        ),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        if (
          !(
            await hasPaidSubscription(
              context.userId,
            )
          )
        ) {
          return {
            error:
              "plan_required",

            message:
              "Choose a paid plan to use AI edits.",
          } as const;
        }

        const capacity =
          await canSpendStudioCredits(
            context.userId,
            AI_EDIT_CREDIT_COST,
          );

        if (
          !capacity.allowed
        ) {
          return {
            error:
              "studio_credits_exhausted",

            message:
              "You've used all of your Studio credits for this month.",
          } as const;
        }

        const project =
          await findOwnedStudioProject(
            data.project_id,
            context.userId,
          );

        if (!project) {
          return {
            error:
              "not_found",

            message:
              "Website project not found.",
          } as const;
        }

        const files =
          parseStudioFiles(
            String(
              project.files_json ??
                "",
            ),
          );

        if (
          files.length ===
          0
        ) {
          return {
            error:
              "no_files",

            message:
              "Generate the website before editing it.",
          } as const;
        }

        const business =
          businessFromProject(
            project,
          );

        let usageId:
          | string
          | null = null;

        try {
          /*
           * Generate the edit first.
           *
           * Failed AI generations do not cost credits.
           */
          const result =
            await generateWebsiteEdit(
              {
                request:
                  data.request,

                business,

                files,
              },
            );

          const nextFiles =
            applyStudioFileChanges(
              files,
              result.changes,
            );

          if (
            !nextFiles.some(
              (file) =>
                file.path ===
                "index.html",
            )
          ) {
            throw new Error(
              "The edit would remove index.html.",
            );
          }

          const creditResult =
            await consumeStudioCredits(
              {
                userId:
                  context.userId,

                projectId:
                  data.project_id,

                action:
                  "ai_edit",

                cost:
                  AI_EDIT_CREDIT_COST,
              },
            );

          if (
            !creditResult.success
          ) {
            return {
              error:
                "studio_credits_exhausted",

              message:
                "You don't have enough Studio credits to apply this edit.",
            } as const;
          }

          usageId =
            creditResult.usageId;

          await db
            .from(
              "studio_snapshots",
            )
            .insert({
              project_id:
                data.project_id,

              label:
                `Before: ${data.request.slice(
                  0,
                  150,
                )}`,

              files_json:
                serializeStudioFiles(
                  files,
                ),

              files_count:
                files.length,
            });

          const {
            error:
              saveError,
          } =
            await db
              .from(
                "studio_projects",
              )
              .update({
                files_json:
                  serializeStudioFiles(
                    nextFiles,
                  ),

                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                data.project_id,
              )
              .eq(
                "user_id",
                context.userId,
              );

          if (
            saveError
          ) {
            await refundStudioCreditUsage(
              usageId,
            );

            usageId =
              null;

            throw new Error(
              "Could not save the website edit.",
            );
          }

          await db
            .from(
              "studio_messages",
            )
            .insert([
              {
                project_id:
                  data.project_id,

                role:
                  "user",

                content:
                  data.request,
              },

              {
                project_id:
                  data.project_id,

                role:
                  "assistant",

                content:
                  result.summary,

                file_changes:
                  JSON.stringify(
                    result.changes.map(
                      (
                        change,
                      ) => ({
                        path:
                          change.path,

                        action:
                          change.action,
                      }),
                    ),
                  ),
              },
            ]);

          return {
            files:
              nextFiles,

            summary:
              result.summary,

            studioCredits: {
              charged:
                AI_EDIT_CREDIT_COST,

              remaining:
                creditResult.remaining,
            },
          } as const;
        } catch (
          error
        ) {
          if (
            usageId
          ) {
            await refundStudioCreditUsage(
              usageId,
            );
          }

          return {
            error:
              "edit_failed",

            message:
              error instanceof
              Error
                ? error.message
                : "Could not apply this website edit.",
          } as const;
        }
      },
    );
