"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/products";
import {
  mapModeCategory,
  mapUniverseCategory,
  MODE_CATEGORIES,
  UNIVERSE_CATEGORIES,
} from "@/lib/universe-categories";

type UniverseFilter = "all" | "mode" | "tout";
type SortBy = "category" | "name" | "price-asc" | "price-desc";
type FormMode = "create" | "edit";

type ProductFormState = {
  name: string;
  price: string;
  category: string;
  universe: "mode" | "tout";
  image: string;
  description: string;
  color: string;
  sizes: string;
};

type CategoryInfo = {
  name: string;
  count: number;
};

type QuickEditState = {
  price: string;
  category: string;
  universe: "mode" | "tout";
};

const EMPTY_FORM: ProductFormState = {
  name: "",
  price: "",
  category: "",
  universe: "mode",
  image: "",
  description: "",
  color: "",
  sizes: "",
};

function toSizes(raw: string): string[] | undefined {
  const items = raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function fromSizes(sizes?: string[]): string {
  return Array.isArray(sizes) ? sizes.join(", ") : "";
}

function toPayload(form: ProductFormState): Omit<Product, "id" | "slug"> {
  const price = parseInt(form.price, 10);
  if (Number.isNaN(price) || price < 0) {
    throw new Error("Prix invalide.");
  }

  const name = form.name.trim();
  const category = form.category.trim();
  const image = form.image.trim();
  const description = form.description.trim();

  if (!name || !category || !image || !description) {
    throw new Error("Tous les champs marqués * sont obligatoires.");
  }

  const payload: Omit<Product, "id" | "slug"> = {
    name,
    price,
    category: form.universe === "tout" ? mapUniverseCategory(category) : mapModeCategory(category),
    universe: form.universe,
    image,
    description,
  };

  const color = form.color.trim();
  if (color) payload.color = color;

  const sizes = toSizes(form.sizes);
  if (sizes) payload.sizes = sizes;

  return payload;
}

export default function AdminBoutique() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [universeFilter, setUniverseFilter] = useState<UniverseFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("category");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);

  const [newCategory, setNewCategory] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});

  const [quickEditingId, setQuickEditingId] = useState<string | null>(null);
  const [quickEdit, setQuickEdit] = useState<QuickEditState | null>(null);
  const [quickSavingId, setQuickSavingId] = useState<string | null>(null);
  const [quickEditError, setQuickEditError] = useState("");

  async function refreshAll(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/admin/products", { cache: "no-store" }),
        fetch("/api/admin/categories", { cache: "no-store" }),
      ]);

      if (productsRes.status === 401 || categoriesRes.status === 401) {
        window.location.href = "/admin";
        return;
      }

      const productsData = await productsRes.json().catch(() => []);
      const categoriesData = await categoriesRes.json().catch(() => []);

      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  function openCreateForm() {
    setFormMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setImageUploadError("");
    setImageUploading(false);
    setFormOpen(true);
  }

  function openEditForm(product: Product) {
    setFormMode("edit");
    setEditingId(product.id);
    setForm({
      name: product.name,
      price: String(product.price),
      category: product.category,
      universe: product.universe,
      image: product.image,
      description: product.description,
      color: product.color || "",
      sizes: fromSizes(product.sizes),
    });
    setFormError("");
    setImageUploadError("");
    setImageUploading(false);
    setFormOpen(true);
  }

  function openDuplicateForm(product: Product) {
    setFormMode("create");
    setEditingId(null);
    setForm({
      name: `${product.name} copie`,
      price: String(product.price),
      category: product.category,
      universe: product.universe,
      image: product.image,
      description: product.description,
      color: product.color || "",
      sizes: fromSizes(product.sizes),
    });
    setFormError("");
    setImageUploadError("");
    setImageUploading(false);
    setFormOpen(true);
  }

  async function handleImageUpload(file: File) {
    setImageUploadError("");
    setImageUploading(true);

    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        body,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data?.url !== "string") {
        setImageUploadError(data.error || "Upload image impossible.");
        return;
      }

      setForm((prev) => ({ ...prev, image: data.url }));
    } catch {
      setImageUploadError("Upload image impossible.");
    } finally {
      setImageUploading(false);
    }
  }

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleImageUpload(file);
    e.target.value = "";
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        await refreshAll(true);
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (imageUploading) {
      setFormError("Attendez la fin de l'upload image.");
      return;
    }

    setFormLoading(true);

    try {
      const payload = toPayload(form);
      const url = formMode === "edit" && editingId ? `/api/admin/products/${editingId}` : "/api/admin/products";
      const method = formMode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || "Erreur lors de l'enregistrement.");
        return;
      }

      setFormOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      setImageUploadError("");
      await refreshAll(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleCreateCategory() {
    const name = newCategory.trim();
    setCategoryError("");
    if (!name) {
      setCategoryError("Nom de catégorie requis.");
      return;
    }

    setCategoryLoading(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCategoryError(data.error || "Erreur lors de la création de catégorie.");
        return;
      }

      setNewCategory("");
      await refreshAll(true);
    } finally {
      setCategoryLoading(false);
    }
  }

  async function handleDeleteCategory(category: CategoryInfo) {
    setCategoryError("");

    const replacement = (replacements[category.name] || "").trim();
    if (category.count > 0 && !replacement) {
      setCategoryError(`La catégorie "${category.name}" contient des produits. Choisir une catégorie de remplacement.`);
      return;
    }

    if (!confirm(`Supprimer la catégorie "${category.name}" ?`)) return;

    setDeletingCategory(category.name);
    try {
      const res = await fetch(`/api/admin/categories/${encodeURIComponent(category.name)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(replacement ? { replacement } : {}),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCategoryError(data.error || "Erreur lors de la suppression de catégorie.");
        return;
      }

      setReplacements((prev) => {
        const next = { ...prev };
        delete next[category.name];
        return next;
      });

      await refreshAll(true);
    } finally {
      setDeletingCategory(null);
    }
  }

  async function handleRenameCategory(category: CategoryInfo) {
    const nextName = (renameDrafts[category.name] || category.name).trim();
    setCategoryError("");

    if (!nextName) {
      setCategoryError("Nouveau nom de catégorie requis.");
      return;
    }

    if (nextName === category.name) return;

    setRenamingCategory(category.name);
    try {
      const res = await fetch(`/api/admin/categories/${encodeURIComponent(category.name)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });

      if (res.status === 401) {
        window.location.href = "/admin";
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCategoryError(data.error || "Erreur lors du renommage de catégorie.");
        return;
      }

      setRenameDrafts((prev) => {
        const next = { ...prev };
        delete next[category.name];
        return next;
      });

      await refreshAll(true);
    } finally {
      setRenamingCategory(null);
    }
  }

  function openQuickEdit(product: Product) {
    setQuickEditingId(product.id);
    setQuickEdit({
      price: String(product.price),
      category: product.category,
      universe: product.universe,
    });
    setQuickEditError("");
  }

  function cancelQuickEdit() {
    setQuickEditingId(null);
    setQuickEdit(null);
    setQuickEditError("");
  }

  async function handleSaveQuickEdit(productId: string) {
    if (!quickEdit || quickEditingId !== productId) return;

    setQuickEditError("");
    const price = parseInt(quickEdit.price, 10);
    const rawCategory = quickEdit.category.trim();

    if (Number.isNaN(price) || price < 0) {
      setQuickEditError("Prix invalide.");
      return;
    }

    if (!rawCategory) {
      setQuickEditError("Catégorie requise.");
      return;
    }

    const mappedCategory =
      quickEdit.universe === "tout"
        ? mapUniverseCategory(rawCategory)
        : mapModeCategory(rawCategory);

    setQuickSavingId(productId);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price,
          universe: quickEdit.universe,
          category: mappedCategory,
        }),
      });

      if (res.status === 401) {
        window.location.href = "/admin";
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setQuickEditError(data.error || "Erreur lors de la mise à jour rapide.");
        return;
      }

      setQuickEditingId(null);
      setQuickEdit(null);
      await refreshAll(true);
    } finally {
      setQuickSavingId(null);
    }
  }

  const existingCategories = useMemo(() => categories.map((c) => c.name), [categories]);

  const modeCategoryOptions = useMemo(() => {
    const values = new Set<string>(MODE_CATEGORIES);
    for (const product of products) {
      if (product.universe === "mode") values.add(product.category);
    }
    return [...values].sort((a, b) => a.localeCompare(b, "fr"));
  }, [products]);

  const universeCategoryOptions = useMemo(() => {
    const values = new Set<string>(UNIVERSE_CATEGORIES);
    for (const product of products) {
      if (product.universe === "tout") values.add(product.category);
    }
    return [...values].sort((a, b) => a.localeCompare(b, "fr"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = products.filter((p) => {
      if (universeFilter !== "all" && p.universe !== universeFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.color || "").toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "fr");
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      const byCategory = a.category.localeCompare(b.category, "fr");
      return byCategory !== 0 ? byCategory : a.name.localeCompare(b.name, "fr");
    });

    return list;
  }, [products, query, universeFilter, sortBy]);

  const modeCount = products.filter((p) => p.universe === "mode").length;
  const toutCount = products.filter((p) => p.universe === "tout").length;
  const categoryCount = categories.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--foreground)]">Administration boutique</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Contrôle produits + catégories: créer, modifier, dupliquer, supprimer et filtrer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => refreshAll(true)}
            disabled={refreshing}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
          >
            {refreshing ? "Actualisation…" : "Actualiser"}
          </button>
          <Link
            href="/"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Voir le site
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            Déconnexion
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-deep)]"
          >
            Ajouter un produit
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Total produits</p>
          <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{products.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Univers</p>
          <p className="mt-2 text-sm text-[var(--foreground)]">
            Mode: <span className="font-semibold">{modeCount}</span> · Univers: <span className="font-semibold">{toutCount}</span>
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Catégories</p>
          <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{categoryCount}</p>
        </div>
      </div>

      <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Nouvelle catégorie</label>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Ex. Streetwear, Chaussures, Décoration"
              className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]"
            />
          </div>
          <button
            type="button"
            onClick={handleCreateCategory}
            disabled={categoryLoading}
            className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-70"
          >
            {categoryLoading ? "Ajout…" : "Créer catégorie"}
          </button>
        </div>

        {categoryError && <p className="mt-2 text-sm text-[var(--accent-deep)]">{categoryError}</p>}

        <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="bg-[var(--background)]">
                <th className="border-b border-[var(--border)] p-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Catégorie</th>
                <th className="border-b border-[var(--border)] p-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Produits</th>
                <th className="border-b border-[var(--border)] p-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Renommer</th>
                <th className="border-b border-[var(--border)] p-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Remplacer par</th>
                <th className="border-b border-[var(--border)] p-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-sm text-[var(--muted)]">Aucune catégorie.</td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.name} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3 text-sm font-medium text-[var(--foreground)]">{category.name}</td>
                    <td className="p-3 text-sm text-[var(--muted)]">{category.count}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={renameDrafts[category.name] ?? category.name}
                          onChange={(e) =>
                            setRenameDrafts((prev) => ({
                              ...prev,
                              [category.name]: e.target.value,
                            }))
                          }
                          className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameCategory(category)}
                          disabled={renamingCategory === category.name}
                          className="rounded border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
                        >
                          {renamingCategory === category.name ? "…" : "Renommer"}
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      {category.count > 0 ? (
                        <select
                          value={replacements[category.name] || ""}
                          onChange={(e) =>
                            setReplacements((prev) => ({
                              ...prev,
                              [category.name]: e.target.value,
                            }))
                          }
                          className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                        >
                          <option value="">Choisir…</option>
                          {categories
                            .filter((c) => c.name !== category.name)
                            .map((c) => (
                              <option key={c.name} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">Non requis</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category)}
                        disabled={deletingCategory === category.name}
                        className="rounded border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--accent-deep)] transition hover:border-[var(--accent-deep)] disabled:opacity-50"
                      >
                        {deletingCategory === category.name ? "…" : "Supprimer"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mb-6 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Recherche</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, slug, couleur, catégorie…"
            className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Univers</label>
          <select
            value={universeFilter}
            onChange={(e) => setUniverseFilter(e.target.value as UniverseFilter)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]"
          >
            <option value="all">Tous</option>
            <option value="mode">Mode</option>
            <option value="tout">Univers</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Tri</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]"
          >
            <option value="category">Catégorie</option>
            <option value="name">Nom (A-Z)</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
          </select>
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <h2 className="font-heading text-xl font-semibold text-[var(--foreground)]">
              {formMode === "edit" ? "Modifier le produit" : "Nouveau produit"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">Nom *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">Prix (F) *</label>
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--foreground)]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)]">Univers *</label>
                  <select
                    value={form.universe}
                    onChange={(e) => setForm((f) => ({ ...f, universe: e.target.value as "mode" | "tout" }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--foreground)]"
                  >
                    <option value="mode">Mode</option>
                    <option value="tout">Univers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)]">Catégorie *</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    required
                    list="category-list"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--foreground)]"
                  />
                  <datalist id="category-list">
                    {existingCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">Photo produit *</label>
                <div className="mt-1 rounded-lg border border-[var(--border)] p-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="block w-full text-sm text-[var(--foreground)] file:mr-3 file:rounded file:border file:border-[var(--border)] file:bg-[var(--background)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:uppercase file:tracking-[0.12em]"
                  />
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    JPG, PNG, WEBP ou AVIF. Taille max: 8MB.
                  </p>

                  {imageUploading && (
                    <p className="mt-2 text-xs font-medium text-[var(--muted)]">Upload en cours…</p>
                  )}
                  {imageUploadError && (
                    <p className="mt-2 text-xs text-[var(--accent-deep)]">{imageUploadError}</p>
                  )}

                  {form.image && (
                    <div className="mt-3">
                      <div className="relative h-24 w-24 overflow-hidden rounded border border-[var(--border)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.image} alt="" className="h-full w-full object-cover" />
                      </div>
                      <p className="mt-2 break-all text-[11px] text-[var(--muted)]">{form.image}</p>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, image: "" }))}
                        className="mt-2 rounded border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        Retirer l&apos;image
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  required
                  rows={3}
                  className="mt-1 w-full resize-y rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--foreground)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)]">Couleur</label>
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)]">Tailles (virgules)</label>
                  <input
                    type="text"
                    value={form.sizes}
                    onChange={(e) => setForm((f) => ({ ...f, sizes: e.target.value }))}
                    placeholder="S, M, L"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--foreground)]"
                  />
                </div>
              </div>

              {formError && <p className="text-sm text-[var(--accent-deep)]">{formError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formLoading || imageUploading}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
                >
                  {imageUploading
                    ? "Upload image…"
                    : formLoading
                      ? "Enregistrement…"
                      : formMode === "edit"
                        ? "Mettre à jour"
                        : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[var(--muted)]">Chargement…</p>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <p className="text-[var(--muted)]">Aucun produit trouvé avec ces filtres.</p>
          <button
            type="button"
            onClick={openCreateForm}
            className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Ajouter un produit
          </button>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-[var(--muted)]">
            Utilisez <span className="font-semibold">Rapide</span> pour modifier prix/catégorie/univers sans ouvrir la fiche complète.
          </p>
          {quickEditError && <p className="mb-2 text-sm text-[var(--accent-deep)]">{quickEditError}</p>}
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--background)]">
                  <th className="border-b border-[var(--border)] p-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Image</th>
                  <th className="border-b border-[var(--border)] p-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Nom</th>
                  <th className="border-b border-[var(--border)] p-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Prix</th>
                  <th className="border-b border-[var(--border)] p-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Catégorie</th>
                  <th className="border-b border-[var(--border)] p-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Univers</th>
                  <th className="border-b border-[var(--border)] p-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const rowQuickEdit = quickEditingId === p.id ? quickEdit : null;
                  const activeUniverse = rowQuickEdit?.universe ?? p.universe;
                  const categoryOptions = activeUniverse === "mode" ? modeCategoryOptions : universeCategoryOptions;

                  return (
                    <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="p-3">
                        <div className="relative h-14 w-14 overflow-hidden rounded bg-[var(--muted)]/20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.image} alt="" className="h-full w-full object-cover" />
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-[var(--foreground)]">{p.name}</p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">/{p.slug}</p>
                      </td>
                      <td className="p-3 text-sm text-[var(--foreground)]">
                        {rowQuickEdit ? (
                          <input
                            type="number"
                            min={0}
                            value={rowQuickEdit.price}
                            onChange={(e) =>
                              setQuickEdit((prev) => (prev ? { ...prev, price: e.target.value } : prev))
                            }
                            className="w-28 rounded border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                          />
                        ) : (
                          formatPrice(p.price)
                        )}
                      </td>
                      <td className="p-3 text-sm text-[var(--muted)]">
                        {rowQuickEdit ? (
                          <select
                            value={rowQuickEdit.category}
                            onChange={(e) =>
                              setQuickEdit((prev) => (prev ? { ...prev, category: e.target.value } : prev))
                            }
                            className="w-full min-w-40 rounded border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                          >
                            {categoryOptions.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        ) : (
                          p.category
                        )}
                      </td>
                      <td className="p-3 text-sm text-[var(--muted)]">
                        {rowQuickEdit ? (
                          <select
                            value={rowQuickEdit.universe}
                            onChange={(e) =>
                              setQuickEdit((prev) => {
                                if (!prev) return prev;
                                const universe = e.target.value as "mode" | "tout";
                                const mappedCategory =
                                  universe === "tout"
                                    ? mapUniverseCategory(prev.category)
                                    : mapModeCategory(prev.category);
                                return { ...prev, universe, category: mappedCategory };
                              })
                            }
                            className="rounded border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                          >
                            <option value="mode">Mode</option>
                            <option value="tout">Univers</option>
                          </select>
                        ) : (
                          p.universe
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/products/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          >
                            Voir
                          </Link>
                          {rowQuickEdit ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveQuickEdit(p.id)}
                                disabled={quickSavingId === p.id}
                                className="rounded border border-[var(--accent)] px-2.5 py-1 text-xs font-medium text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white disabled:opacity-60"
                              >
                                {quickSavingId === p.id ? "…" : "Sauver"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelQuickEdit}
                                className="rounded border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
                              >
                                Annuler
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openQuickEdit(p)}
                              className="rounded border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            >
                              Rapide
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditForm(p)}
                            className="rounded border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => openDuplicateForm(p)}
                            className="rounded border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          >
                            Dupliquer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="rounded border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--accent-deep)] transition hover:border-[var(--accent-deep)] disabled:opacity-50"
                          >
                            {deletingId === p.id ? "…" : "Supprimer"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
