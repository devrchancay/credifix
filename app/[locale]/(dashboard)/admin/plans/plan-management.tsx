"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Tables } from "@/types/database";

type Plan = Tables<"plans">;

interface StripePrice {
  id: string;
  product_name: string;
  amount: number;
  currency: string;
  interval: string;
  interval_count: number;
}

interface LimitEntry {
  key: string;
  value: string;
}

interface PlanFormData {
  name: string;
  slug: string;
  description: string;
  stripe_monthly_price_id: string;
  stripe_yearly_price_id: string;
  features: string[];
  limits: LimitEntry[];
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
}

const NONE_VALUE = "__none__";

const emptyForm: PlanFormData = {
  name: "",
  slug: "",
  description: "",
  stripe_monthly_price_id: "",
  stripe_yearly_price_id: "",
  features: [""],
  limits: [],
  is_active: true,
  is_popular: false,
  sort_order: 0,
};

function planToForm(plan: Plan): PlanFormData {
  const features = Array.isArray(plan.features)
    ? (plan.features as string[])
    : [];
  const limitsObj =
    plan.limits && typeof plan.limits === "object" && !Array.isArray(plan.limits)
      ? (plan.limits as Record<string, unknown>)
      : {};
  const limits = Object.entries(limitsObj).map(([key, value]) => ({
    key,
    value: String(value),
  }));

  return {
    name: plan.name,
    slug: plan.slug,
    description: plan.description ?? "",
    stripe_monthly_price_id: plan.stripe_monthly_price_id ?? "",
    stripe_yearly_price_id: plan.stripe_yearly_price_id ?? "",
    features: features.length > 0 ? features : [""],
    limits,
    is_active: plan.is_active,
    is_popular: plan.is_popular,
    sort_order: plan.sort_order,
  };
}

function formatPrice(price: StripePrice): string {
  const amount = price.amount.toLocaleString("en-US", {
    style: "currency",
    currency: price.currency,
  });
  let suffix = `/${price.interval}`;
  if (price.interval === "month" && price.interval_count === 1) {
    suffix = "/mo";
  } else if (price.interval === "year" || (price.interval === "month" && price.interval_count > 1)) {
    suffix = "/yr";
  }
  return `${price.product_name} — ${amount}${suffix}`;
}

function groupByProduct(prices: StripePrice[]) {
  const groups: Record<string, StripePrice[]> = {};
  for (const price of prices) {
    if (!groups[price.product_name]) {
      groups[price.product_name] = [];
    }
    groups[price.product_name].push(price);
  }
  return groups;
}

export function PlanManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stripePrices, setStripePrices] = useState<StripePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanFormData>(emptyForm);
  const t = useTranslations("admin.plans");

  useEffect(() => {
    fetchPlans();
    fetchStripePrices();
  }, []);

  async function fetchPlans() {
    try {
      const res = await fetch("/api/admin/plans");
      const data = await res.json();

      if (res.ok) {
        setPlans(data.plans);
      } else {
        toast.error("Failed to fetch plans");
      }
    } catch {
      toast.error("Failed to fetch plans");
    } finally {
      setLoading(false);
    }
  }

  async function fetchStripePrices() {
    try {
      const res = await fetch("/api/admin/plans/stripe-prices");
      const data = await res.json();

      if (res.ok) {
        setStripePrices(data.prices);
      }
    } catch {
      // Stripe prices are optional, don't block the UI
    }
  }

  function openCreate() {
    setEditingPlan(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditingPlan(plan);
    setForm(planToForm(plan));
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const features = form.features.filter((f) => f.trim() !== "");
      const limits: Record<string, number> = {};
      for (const entry of form.limits) {
        if (entry.key.trim()) {
          limits[entry.key.trim()] = Number(entry.value) || 0;
        }
      }

      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        stripe_monthly_price_id: form.stripe_monthly_price_id || null,
        stripe_yearly_price_id: form.stripe_yearly_price_id || null,
        features,
        limits,
        is_active: form.is_active,
        is_popular: form.is_popular,
        sort_order: Number(form.sort_order),
      };

      const url = editingPlan
        ? `/api/admin/plans/${editingPlan.id}`
        : "/api/admin/plans";
      const method = editingPlan ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (editingPlan) {
          setPlans((prev) =>
            prev.map((p) => (p.id === editingPlan.id ? data.plan : p))
          );
        } else {
          setPlans((prev) => [...prev, data.plan]);
        }
        setDialogOpen(false);
        toast.success(editingPlan ? "Plan updated" : "Plan created");
      } else {
        toast.error("Failed to save plan");
      }
    } catch {
      toast.error("Failed to save plan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(plan: Plan) {
    if (!confirm(t("confirmDelete"))) return;

    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== plan.id));
        toast.success("Plan deleted");
      } else {
        toast.error("Failed to delete plan");
      }
    } catch {
      toast.error("Failed to delete plan");
    }
  }

  async function toggleActive(plan: Plan) {
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !plan.is_active }),
      });

      if (res.ok) {
        const data = await res.json();
        setPlans((prev) =>
          prev.map((p) => (p.id === plan.id ? data.plan : p))
        );
      } else {
        toast.error("Failed to update plan");
      }
    } catch {
      toast.error("Failed to update plan");
    }
  }

  const priceGroups = groupByProduct(stripePrices);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <a
            href="https://dashboard.stripe.com/products"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            {t("managePricesInStripe")}
          </a>
        </Button>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("newPlan")}
        </Button>
      </div>

      {plans.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          {t("noPlans")}
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("slug")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("popular")}</TableHead>
                <TableHead>{t("sortOrder")}</TableHead>
                <TableHead>{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {plan.slug}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={plan.is_active ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleActive(plan)}
                    >
                      {plan.is_active ? t("active") : t("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {plan.is_popular && (
                      <Badge variant="outline">{t("popular")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{plan.sort_order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(plan)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(plan)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? t("editPlan") : t("newPlan")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("name")}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">{t("slug")}</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("description")}</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("monthlyPrice")}</Label>
                <Select
                  value={form.stripe_monthly_price_id || NONE_VALUE}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      stripe_monthly_price_id:
                        value === NONE_VALUE ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        stripePrices.length === 0
                          ? t("loadingPrices")
                          : t("selectPrice")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>
                      {t("nonePrice")}
                    </SelectItem>
                    {Object.entries(priceGroups).map(
                      ([productName, prices]) => (
                        <SelectGroup key={productName}>
                          <SelectLabel>{productName}</SelectLabel>
                          {prices.map((price) => (
                            <SelectItem key={price.id} value={price.id}>
                              {formatPrice(price)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("yearlyPrice")}</Label>
                <Select
                  value={form.stripe_yearly_price_id || NONE_VALUE}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      stripe_yearly_price_id:
                        value === NONE_VALUE ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        stripePrices.length === 0
                          ? t("loadingPrices")
                          : t("selectPrice")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>
                      {t("nonePrice")}
                    </SelectItem>
                    {Object.entries(priceGroups).map(
                      ([productName, prices]) => (
                        <SelectGroup key={productName}>
                          <SelectLabel>{productName}</SelectLabel>
                          {prices.map((price) => (
                            <SelectItem key={price.id} value={price.id}>
                              {formatPrice(price)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("features")}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      features: [...form.features, ""],
                    })
                  }
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {t("addFeature")}
                </Button>
              </div>
              <div className="space-y-2">
                {form.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => {
                        const updated = [...form.features];
                        updated[index] = e.target.value;
                        setForm({ ...form, features: updated });
                      }}
                      placeholder={t("featurePlaceholder")}
                    />
                    {form.features.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          const updated = form.features.filter(
                            (_, i) => i !== index
                          );
                          setForm({ ...form, features: updated });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("limits")}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      limits: [...form.limits, { key: "", value: "" }],
                    })
                  }
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {t("addLimit")}
                </Button>
              </div>
              <div className="space-y-2">
                {form.limits.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={entry.key}
                      onChange={(e) => {
                        const updated = [...form.limits];
                        updated[index] = { ...entry, key: e.target.value };
                        setForm({ ...form, limits: updated });
                      }}
                      placeholder={t("limitKeyPlaceholder")}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={entry.value}
                      onChange={(e) => {
                        const updated = [...form.limits];
                        updated[index] = { ...entry, value: e.target.value };
                        setForm({ ...form, limits: updated });
                      }}
                      placeholder={t("limitValuePlaceholder")}
                      className="w-24"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        const updated = form.limits.filter(
                          (_, i) => i !== index
                        );
                        setForm({ ...form, limits: updated });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sort_order">{t("sortOrder")}</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm({ ...form, is_active: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{t("active")}</span>
                </label>
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_popular}
                    onChange={(e) =>
                      setForm({ ...form, is_popular: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{t("popular")}</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "..."
                  : editingPlan
                    ? t("updatePlan")
                    : t("createPlan")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
