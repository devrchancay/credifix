import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/roles";

interface TopUser {
  userId: string;
  name: string;
  email: string;
  messageCount: number;
  fileCount: number;
  tokenCount: number;
}

async function getDashboardStats() {
  const supabase = createAdminClient();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  // Run queries in parallel
  const [
    usersResult,
    subsResult,
    convsResult,
    totalMsgsResult,
    todayMsgsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "trialing"]),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase
      .from("messages")
      .select("conversation_id, role, tokens_used, attachments, created_at")
      .gte("created_at", todayISO),
  ]);

  const totalUsers = usersResult.count ?? 0;
  const activeSubscriptions = subsResult.count ?? 0;
  const totalConversations = convsResult.count ?? 0;
  const totalMessages = totalMsgsResult.count ?? 0;

  // Process today's messages
  const todayMessages = todayMsgsResult.data ?? [];
  let todayMessageCount = 0;
  let todayFileCount = 0;
  let todayTokenCount = 0;

  // Track per-user stats
  const userStatsMap = new Map<
    string,
    { conversationIds: Set<string>; messages: number; files: number; tokens: number }
  >();

  // We need conversation -> user mapping for today's messages
  const conversationIds = [
    ...new Set(todayMessages.map((m) => m.conversation_id)),
  ];

  let convUserMap = new Map<string, string>();
  if (conversationIds.length > 0) {
    // Batch fetch conversation owners
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, user_id")
      .in("id", conversationIds);

    if (convs) {
      convUserMap = new Map(convs.map((c) => [c.id, c.user_id]));
    }
  }

  for (const msg of todayMessages) {
    if (msg.role === "user") {
      todayMessageCount++;
      const attachments = msg.attachments as Array<unknown> | null;
      const fileCount = Array.isArray(attachments) ? attachments.length : 0;
      todayFileCount += fileCount;

      const userId = convUserMap.get(msg.conversation_id);
      if (userId) {
        const stats = userStatsMap.get(userId) ?? {
          conversationIds: new Set(),
          messages: 0,
          files: 0,
          tokens: 0,
        };
        stats.messages++;
        stats.files += fileCount;
        userStatsMap.set(userId, stats);
      }
    }

    if (msg.role === "assistant" && msg.tokens_used) {
      todayTokenCount += msg.tokens_used;

      const userId = convUserMap.get(msg.conversation_id);
      if (userId) {
        const stats = userStatsMap.get(userId) ?? {
          conversationIds: new Set(),
          messages: 0,
          files: 0,
          tokens: 0,
        };
        stats.tokens += msg.tokens_used;
        userStatsMap.set(userId, stats);
      }
    }
  }

  // Get top users by message count
  const topUserIds = [...userStatsMap.entries()]
    .sort((a, b) => b[1].messages - a[1].messages)
    .slice(0, 10)
    .map(([id]) => id);

  let topUsers: TopUser[] = [];
  if (topUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", topUserIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p])
    );

    topUsers = topUserIds.map((id) => {
      const profile = profileMap.get(id);
      const stats = userStatsMap.get(id)!;
      return {
        userId: id,
        name: profile?.full_name ?? "Unknown",
        email: profile?.email ?? "",
        messageCount: stats.messages,
        fileCount: stats.files,
        tokenCount: stats.tokens,
      };
    });
  }

  return {
    totalUsers,
    activeSubscriptions,
    totalConversations,
    totalMessages,
    todayMessageCount,
    todayFileCount,
    todayTokenCount,
    topUsers,
  };
}

export default async function DashboardPage() {
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    redirect("/credit-analysis");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user?.id
    ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
    : { data: null };

  const t = await getTranslations("dashboard");
  const firstName = profile?.full_name?.split(" ")[0] ?? "Admin";

  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("welcome", { name: firstName })}
        </p>
      </div>

      {/* Global stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.totalUsers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.activeSubscriptions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.activeSubscriptions}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.totalConversations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalConversations}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.totalMessages")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalMessages}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's usage */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.todayMessages")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayMessageCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.todayFiles")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayFileCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.tokensUsed")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.todayTokenCount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top users table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("stats.topUsers")}</CardTitle>
          <CardDescription>{t("stats.title")}</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("stats.noActivity")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("stats.user")}</TableHead>
                  <TableHead className="text-right">
                    {t("stats.messages")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("stats.files")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("stats.tokens")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topUsers.map((u) => (
                  <TableRow key={u.userId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {u.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {u.messageCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {u.fileCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {u.tokenCount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
