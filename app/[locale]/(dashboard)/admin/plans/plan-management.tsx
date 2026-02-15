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
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
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

interface PlanFormData {
  name: string;
  slug: string;
  description: string;
  stripe_monthly_price_id: string;
  stripe_yearly_price_id: string;
  features: string;
  limits: string;
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
  features: "[]",
  limits: "{}",
  is_active: true,
  is_popular: false,
  sort_order: 0,
};

function planToForm(plan: Plan): PlanFormData {
  return {
    name: plan.name,
    slug: plan.slug,
    description: plan.description ?? "",
    stripe_monthly_price_id: plan.stripe_monthly_price_id ?? "",
    stripe_yearly_price_id: plan.stripe_yearly_price_id ?? "",
    features: JSON.stringify(plan.features, null, 2),
    limits: JSON.stringify(plan.limits, null, 2),
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
      let parsedFeatures;
      let parsedLimits;

      try {
        parsedFeatures = JSON.parse(form.features);
      } catch {
        toast.error("Invalid JSON in features");
        setSaving(false);
        return;
      }

      try {
        parsedLimits = JSON.parse(form.limits);
      } catch {
        toast.error("Invalid JSON in limits");
        setSaving(false);
        return;
      }

      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        stripe_monthly_price_id: form.stripe_monthly_price_id || null,
        stripe_yearly_price_id: form.stripe_yearly_price_id || null,
        features: parsedFeatures,
        limits: parsedLimits,
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
              <Label htmlFor="features">{t("features")}</Label>
              <Input
                id="features"
                value={form.features}
                onChange={(e) =>
                  setForm({ ...form, features: e.target.value })
                }
                placeholder={t("featuresPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="limits">{t("limits")}</Label>
              <Input
                id="limits"
                value={form.limits}
                onChange={(e) => setForm({ ...form, limits: e.target.value })}
                placeholder={t("limitsPlaceholder")}
              />
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
