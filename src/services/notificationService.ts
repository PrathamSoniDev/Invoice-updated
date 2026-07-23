import { supabase } from "@/lib/supabase";
import {
  getCurrentCompanyId,
  getCurrentUserId,
  paginate,
} from "@/lib/database";

import type { Notification } from "@/types";


interface NotificationRow {
  id: string;
  companyId: string;
  userId: string | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
}

function transformNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    companyId: row.companyId,
    userId: row.userId || undefined,
    type: row.type as Notification["type"],
    title: row.title,
    message: row.message,
    isRead: row.isRead,
    readAt: row.readAt || undefined,
    createdAt: row.createdAt,
    data: row.data || undefined,
  };
}


export const notificationService = {
  async list(params?: {
    search?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("companyId", companyId)
      .or(`userId.eq.${userId},userId.is.null`)
      .order("createdAt", { ascending: false });      

    if (params?.search) {
      const search = params.search.trim();

      query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
    }

    if (params?.type && params.type !== "all") {
      query = query.eq("type", params.type);
    }

    const result = await paginate<NotificationRow>(query, page, limit);

    return {
      ...result,
      data: result.data.map(transformNotification),
    };
  },

  async getLatest(limit = 3): Promise<Notification[]> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("companyId", companyId)
      .or(`userId.eq.${userId},userId.is.null`)
      .order("createdAt", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data as NotificationRow[]).map(transformNotification);
  },

  async getUnreadCount(): Promise<number> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("companyId", companyId)
      .or(`userId.eq.${userId},userId.is.null`)
      .eq("isRead", false);

    if (error) throw error;

    return count ?? 0;
  },

  async markAsRead(id: string): Promise<boolean> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("notifications")
      .update({
        isRead: true,
        readAt: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("companyId", companyId)
      .or(`userId.eq.${userId},userId.is.null`);

    if (error) throw error;

    return true;
  },

  async markAllRead(): Promise<boolean> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("notifications")
      .update({
        isRead: true,
        readAt: new Date().toISOString(),
      })
      .eq("companyId", companyId)
      .or(`userId.eq.${userId},userId.is.null`)
      .eq("isRead", false);

    if (error) throw error;

    return true;
  },
};