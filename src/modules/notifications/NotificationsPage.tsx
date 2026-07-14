import { useEffect, useState } from "react";

import { Bell, Eye } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { FilterBar } from "@/components/common/FilterBar";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Pagination } from "@/components/common/Pagination";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { notificationService } from "@/services/notificationService";

import type { Notification } from "@/types";

import { formatDate } from "@/utils";

import { toast } from "sonner";

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const limit = 10;

  useEffect(() => {
    loadNotifications();
  }, [page, search, typeFilter]);

  async function loadNotifications() {
    try {
      setLoading(true);

      const res = await notificationService.list({
        page,
        limit,
        search,
        type: typeFilter,
      });

      setNotifications(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(id: string) {
    try {
      await notificationService.markAsRead(id);

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                isRead: true,
                readAt: new Date().toISOString(),
              }
            : item,
        ),
      );

      toast.success("Notification marked as read");
    } catch (err) {
      console.error(err);
      toast.error("Unable to update notification");
    }
  }

  const columns: Column<Notification>[] = [
    {
      key: "title",
      header: "Notification",
      cell: (row) => (
        <div className="space-y-1">
          <p className="font-medium">{row.title}</p>

          <p className="text-sm text-muted-foreground">{row.message}</p>
        </div>
      ),
    },

    {
      key: "type",
      header: "Category",

      cell: (row) => (
        <Badge variant="outline">{row.type.replace("_", " ")}</Badge>
      ),
    },

    {
      key: "status",
      header: "Status",

      cell: (row) =>
        row.isRead ? (
          <Badge>Read</Badge>
        ) : (
          <Badge variant="secondary">Unread</Badge>
        ),
    },

    {
      key: "date",
      header: "Created",

      cell: (row) => (
        <span className="text-sm">{formatDate(row.createdAt, "short")}</span>
      ),
    },

    {
      key: "action",
      header: "",

      cell: (row) => (
        <Button
          variant="ghost"
          size="icon"
          disabled={row.isRead}
          onClick={(e) => {
            e.stopPropagation();

            handleMarkAsRead(row.id);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="View and manage all your notifications"
        icon={Bell}
      />

      <Card className="shadow-soft">
        <div className="border-b p-4">
          <FilterBar
            search={{
              value: search,
              onChange: (value) => {
                setSearch(value);
                setPage(1);
              },
              placeholder: "Search notifications...",
            }}
            filters={[
              {
                label: "Category",
                value: typeFilter,
                onChange: (value) => {
                  setTypeFilter(value);
                  setPage(1);
                },
                options: [
                  {
                    label: "All Notifications",
                    value: "all",
                  },
                  {
                    label: "Invoice Paid",
                    value: "invoice_paid",
                  },
                  {
                    label: "Invoice Overdue",
                    value: "invoice_overdue",
                  },
                  {
                    label: "Payment Received",
                    value: "payment_received",
                  },
                  {
                    label: "Payment Failed",
                    value: "payment_failed",
                  },
                  {
                    label: "Customer Created",
                    value: "customer_created",
                  },
                  {
                    label: "Settings Updated",
                    value: "settings_updated",
                  },
                ],
              },
            ]}
          />
        </div>

        <DataTable
          columns={columns}
          data={notifications}
          isLoading={loading}
          onRowClick={(row) => {
            if (!row.isRead) {
              handleMarkAsRead(row.id);
            }
          }}
          emptyTitle="No notifications found"
          emptyDescription="You're all caught up."
        />

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}
