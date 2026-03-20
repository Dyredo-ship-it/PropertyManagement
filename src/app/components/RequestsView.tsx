// requestsview.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Wrench,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  getMaintenanceRequests,
  saveMaintenanceRequests,
  getTenants,
  type MaintenanceRequest,
} from "../utils/storage";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

export function RequestsView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "pending" | "in-progress" | "completed"
  >("all");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = () => {
    const allRequests = getMaintenanceRequests();
    if (user?.role === "tenant") {
      setRequests(allRequests.filter((r) => r.tenantId === user.id));
    } else {
      setRequests(allRequests);
    }
    setTenants(getTenants());
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => filter === "all" || r.status === filter);
  }, [requests, filter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (user?.role !== "tenant") return;

    const tenant = tenants.find((t) => t.email === user.email);
    if (!tenant) return;

    const newRequest: MaintenanceRequest = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      buildingId: tenant.buildingId,
      buildingName: tenant.buildingName,
      unit: tenant.unit,
      tenantId: user.id,
      tenantName: user.name,
      status: "pending",
      priority: formData.priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const allRequests = getMaintenanceRequests();
    saveMaintenanceRequests([...allRequests, newRequest]);

    setIsDialogOpen(false);
    setFormData({ title: "", description: "", priority: "medium" });
    loadData();
  };

  const handleStatusChange = (
    id: string,
    newStatus: MaintenanceRequest["status"],
  ) => {
    const allRequests = getMaintenanceRequests();
    const updated = allRequests.map((r) =>
      r.id === id
        ? { ...r, status: newStatus, updatedAt: new Date().toISOString() }
        : r,
    );
    saveMaintenanceRequests(updated);
    loadData();
  };

  const handleDelete = (id: string) => {
    if (confirm(t("confirmDeleteRequest"))) {
      const allRequests = getMaintenanceRequests();
      const updated = allRequests.filter((r) => r.id !== id);
      saveMaintenanceRequests(updated);
      loadData();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5" />;
      case "in-progress":
        return <AlertCircle className="w-5 h-5" />;
      case "completed":
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Wrench className="w-5 h-5" />;
    }
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "in-progress":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const getPriorityPill = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-gray-100 text-gray-600 border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl mb-2 text-[#171414]">
            {user?.role === "admin" ? t("maintenanceRequests") : t("myRequestsTitle")}
          </h1>
          <p className="text-[#6B6560]">
            {user?.role === "admin"
              ? t("requestsSub")
              : t("requestsSubTenant")}
          </p>
        </div>

        {user?.role === "tenant" && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#45553A] hover:bg-[#3a4930] text-white shrink-0">
                <Plus className="w-5 h-5 mr-2" />
                {t("newRequest")}
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-white border-[#E8E5DB] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-[#171414]">{t("newRequest")}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="title" className="text-[#171414]">{t("requestTitle")}</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                    placeholder="Ex: Robinet qui fuit a la cuisine"
                    className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-[#171414]">{t("requestDescription")}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                    placeholder="Decrivez le probleme en detail..."
                    rows={5}
                    className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="priority" className="text-[#171414]">{t("priority")}</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t("low")}</SelectItem>
                      <SelectItem value="medium">{t("medium")}</SelectItem>
                      <SelectItem value="high">{t("high")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-[#45553A] hover:bg-[#3a4930] text-white"
                  >
                    {t("submit")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1 border-[#E8E5DB] text-[#171414]"
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          className={filter === "all" ? "bg-[#45553A] hover:bg-[#3a4930] text-white" : "border-[#E8E5DB] text-[#171414]"}
        >
          {t("filterAll")}
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          onClick={() => setFilter("pending")}
          className={
            filter === "pending" ? "bg-[#45553A] hover:bg-[#3a4930] text-white" : "border-[#E8E5DB] text-[#171414]"
          }
        >
          {t("filterPending")}
        </Button>
        <Button
          variant={filter === "in-progress" ? "default" : "outline"}
          onClick={() => setFilter("in-progress")}
          className={
            filter === "in-progress"
              ? "bg-[#45553A] hover:bg-[#3a4930] text-white"
              : "border-[#E8E5DB] text-[#171414]"
          }
        >
          {t("filterInProgress")}
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          onClick={() => setFilter("completed")}
          className={
            filter === "completed" ? "bg-[#45553A] hover:bg-[#3a4930] text-white" : "border-[#E8E5DB] text-[#171414]"
          }
        >
          {t("filterCompleted")}
        </Button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <Card
            key={request.id}
            className="p-6 bg-white border border-[#E8E5DB] shadow-sm hover:border-[#45553A]/30 transition-colors rounded-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-4">
                  <div
                    className={[
                      "w-10 h-10 rounded-full flex items-center justify-center border",
                      getStatusPill(request.status),
                    ].join(" ")}
                  >
                    {getStatusIcon(request.status)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg truncate text-[#171414]">{request.title}</h3>

                      <span
                        className={[
                          "px-2 py-1 rounded-full text-xs border",
                          getStatusPill(request.status),
                        ].join(" ")}
                      >
                        {request.status === "pending" ? t("pending") : ""}
                        {request.status === "in-progress" ? t("inProgress") : ""}
                        {request.status === "completed" ? t("completed") : ""}
                      </span>

                      <span
                        className={[
                          "px-2 py-1 rounded-full text-xs border",
                          getPriorityPill(request.priority),
                        ].join(" ")}
                      >
                        {request.priority === "high" ? t("high") : ""}
                        {request.priority === "medium" ? t("medium") : ""}
                        {request.priority === "low" ? t("low") : ""}
                      </span>
                    </div>

                    <p className="text-[#6B6560] mb-3 leading-relaxed">
                      {request.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#6B6560]">
                      <span>
                        {request.buildingName} — {t("units")} {request.unit}
                      </span>
                      {user?.role === "admin" && (
                        <span>Par {request.tenantName}</span>
                      )}
                      <span>{t("createdOn")} {formatDate(request.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {user?.role === "admin" && (
                  <div className="mt-4 flex flex-wrap gap-2 pl-14">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(request.id, "pending")}
                      disabled={request.status === "pending"}
                      className="text-xs border-[#E8E5DB] text-[#171414]"
                    >
                      {t("pending")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleStatusChange(request.id, "in-progress")
                      }
                      disabled={request.status === "in-progress"}
                      className="text-xs border-[#E8E5DB] text-[#171414]"
                    >
                      {t("inProgress")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(request.id, "completed")}
                      disabled={request.status === "completed"}
                      className="text-xs border-[#E8E5DB] text-[#171414]"
                    >
                      {t("completed")}
                    </Button>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleDelete(request.id)}
                className="p-2 rounded-lg transition-colors hover:bg-red-50"
                title={t("confirmDeleteRequest")}
              >
                <Trash2 className="w-5 h-5 text-red-500" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <Card className="p-12 bg-white border border-[#E8E5DB] shadow-sm text-center mt-6 rounded-xl">
          <Wrench className="w-16 h-16 text-[#6B6560] mx-auto mb-4" />
          <h3 className="text-xl mb-2 text-[#171414]">{t("noRequests")}</h3>
          <p className="text-[#6B6560]">
            {filter === "all"
              ? user?.role === "admin"
                ? t("noRequestsAdmin")
                : t("noRequestsTenant")
              : `${t("noRequests")}`}
          </p>
        </Card>
      )}
    </div>
  );
}
