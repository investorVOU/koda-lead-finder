import {
  STUDIO_CREDIT_COSTS,
  getStudioCreditLimit,
  type StudioCreditAction,
} from "@/lib/billing";

import {
  supabaseAdmin,
} from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db =
  supabaseAdmin as any;

export const WEBSITE_BUILD_CREDIT_COST =
  STUDIO_CREDIT_COSTS
    .website_build;

export const AI_EDIT_CREDIT_COST =
  STUDIO_CREDIT_COSTS
    .ai_edit;

export type StudioCreditBalance = {
  active: boolean;

  plan: string;

  used: number;

  limit:
    | number
    | null;

  remaining:
    | number
    | null;
};

function monthStartIso() {
  const now =
    new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
}

export async function getStudioCreditBalance(
  userId: string,
): Promise<StudioCreditBalance> {
  const {
    data: subscription,
  } =
    await supabaseAdmin
      .from(
        "subscriptions",
      )
      .select(
        "plan,status",
      )
      .eq(
        "user_id",
        userId,
      )
      .maybeSingle();

  const subscriptionRow =
    subscription as {
      plan?: string;

      status?: string;
    } | null;

  const active =
    Boolean(
      subscriptionRow &&
        [
          "active",
          "canceling",
        ].includes(
          subscriptionRow
            ?.status ??
            "",
        ),
    );

  const plan =
    active
      ? subscriptionRow
          ?.plan ??
        "none"
      : "none";

  const limit =
    active
      ? getStudioCreditLimit(
          plan,
        )
      : 0;

  const {
    data: rows,
    error,
  } =
    await db
      .from(
        "studio_credit_usage",
      )
      .select(
        "credits",
      )
      .eq(
        "user_id",
        userId,
      )
      .gte(
        "created_at",
        monthStartIso(),
      );

  if (error) {
    throw new Error(
      "Could not read Studio credit balance.",
    );
  }

  const used =
    (
      rows ?? []
    ).reduce(
      (
        total: number,
        row: {
          credits?: number;
        },
      ) =>
        total +
        Number(
          row.credits ??
            0,
        ),
      0,
    );

  return {
    active,

    plan,

    used,

    limit,

    remaining:
      limit === null
        ? null
        : Math.max(
            limit -
              used,
            0,
          ),
  };
}

export async function canSpendStudioCredits(
  userId: string,

  cost: number,
) {
  const balance =
    await getStudioCreditBalance(
      userId,
    );

  if (!balance.active) {
    return {
      allowed: false,
      balance,
    };
  }

  if (
    balance.limit ===
    null
  ) {
    return {
      allowed: true,
      balance,
    };
  }

  return {
    allowed:
      (
        balance.remaining ??
        0
      ) >= cost,

    balance,
  };
}

export async function consumeStudioCredits(
  input: {
    userId: string;

    projectId: string;

    action:
      StudioCreditAction;

    cost: number;
  },
): Promise<{
  success: boolean;

  usageId:
    | string
    | null;

  used: number;

  remaining:
    | number
    | null;
}> {
  const {
    data: subscription,
  } =
    await supabaseAdmin
      .from(
        "subscriptions",
      )
      .select(
        "plan,status",
      )
      .eq(
        "user_id",
        input.userId,
      )
      .maybeSingle();

  const sub =
    subscription as {
      plan?: string;

      status?: string;
    } | null;

  const active =
    Boolean(
      sub &&
        [
          "active",
          "canceling",
        ].includes(
          sub.status ??
            "",
        ),
    );

  if (!active) {
    return {
      success: false,

      usageId: null,

      used: 0,

      remaining: 0,
    };
  }

  const limit =
    getStudioCreditLimit(
      sub?.plan,
    );

  const {
    data,
    error,
  } =
    await db.rpc(
      "consume_studio_credits",
      {
        p_user_id:
          input.userId,

        p_project_id:
          input.projectId,

        p_action:
          input.action,

        p_cost:
          input.cost,

        p_limit:
          limit,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
        "Could not consume Studio credits.",
    );
  }

  const row =
    Array.isArray(data)
      ? data[0]
      : data;

  return {
    success:
      Boolean(
        row?.success,
      ),

    usageId:
      row?.usage_id ??
      null,

    used:
      Number(
        row?.used ??
          0,
      ),

    remaining:
      row?.remaining ===
        null ||
      row?.remaining ===
        undefined
        ? null
        : Number(
            row.remaining,
          ),
  };
}

export async function refundStudioCreditUsage(
  usageId:
    | string
    | null,
) {
  if (!usageId) {
    return;
  }

  const {
    error,
  } =
    await db
      .from(
        "studio_credit_usage",
      )
      .delete()
      .eq(
        "id",
        usageId,
      );

  if (error) {
    console.error(
      "[Studio credits] Could not refund usage:",
      error.message,
    );
  }
}
