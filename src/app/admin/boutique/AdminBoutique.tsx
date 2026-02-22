"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/products";
import {
  MODE_CATEGORIES,
  MODE_CLOTHING_SUBCATEGORIES,
  matchModeSubcategory,
  normalizeModeCategoryInput,
  mapUniverseCategory,
} from "@/lib/universe-categories";
import {
  colorToSwatch,
  getColorImages,
  normalizeColorImagesMap,
  normalizeColorName,
  parseColorList,
  type ColorImagesMap,
} from "@/lib/product-options";

type UniverseFilter = "all" | "mode" | "tout";
type SortBy = "category" | "name" | "price-asc" | "price-desc";
type FormMode = "create" | "edit";
type AdminView = "products" | "categories";

type ProductFormState = {
  name: string;
  price: string;
  category: string;
  subCategory: string;
  universe: "mode" | "tout";
  images: string[];
  description: string;
  color: string;
  colorImages: ColorImagesMap;
  sizes: string;
};

type CategoryInfo = {
  name: string;
  count: number;
};

type ModeSubcategoryInfo = {
  name: string;
  count: number;
};

const EMPTY_FORM: ProductFormState = {
  name: "",
  price: "",
  category: "",
  subCategory: "",
  universe: "mode",
  images: [],
  description: "",
  color: "",
  colorImages: {},
  sizes: "",
};

const COMMON_SIZE_OPTIONS = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "Unique",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
] as const;

const COMMON_COLOR_OPTIONS = [
  "Noir",
  "Blanc",
  "Gris",
  "Rouge",
  "Bleu",
  "Bleu marine",
  "Vert",
  "Kaki",
  "Beige",
  "Marron",
  "Rose",
  "Orange",
] as const;

function toSizes(raw: string): string[] | undefined {
  const items = raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function uniqueColors(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = normalizeColorName(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(trimmed);
  }

  return output;
}

function uniqueImageUrls(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
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
  const subCategory = form.subCategory.trim();
  const images = form.images.map((img) => img.trim()).filter(Boolean);
  const description = form.description.trim();

  if (!name || !category || images.length === 0 || !description) {
    throw new Error("Tous les champs marqués * sont obligatoires.");
  }

  const modeCategory = form.universe === "mode" ? normalizeModeCategoryInput(category) : "";
  const requiresModeSubcategory = form.universe === "mode" && modeCategory === "Vêtements";
  if (requiresModeSubcategory && !subCategory) {
    throw new Error("Choisissez une sous-categorie pour Vêtements.");
  }

  const productCategory =
    form.universe === "tout"
      ? mapUniverseCategory(category)
      : requiresModeSubcategory
        ? subCategory
        : modeCategory;

  const payload: Omit<Product, "id" | "slug"> = {
    name,
    price,
    category: productCategory,
    universe: form.universe,
    image: images[0],
    images,
    description,
  };

  const colors = uniqueColors(parseColorList(form.color));
  payload.color = colors.join(", ");
  const colorImages: ColorImagesMap = {};
  for (const color of colors) {
    const imagesForColor = uniqueImageUrls(getColorImages(form.colorImages, color));
    if (imagesForColor.length > 0) {
      colorImages[color] = imagesForColor;
    }
  }
  payload.colorImages = colorImages;

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
  const [productsError, setProductsError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [colorDraft, setColorDraft] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);

  const [newCategory, setNewCategory] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [modeSubcategories, setModeSubcategories] = useState<ModeSubcategoryInfo[]>([]);
  const [newModeSubcategory, setNewModeSubcategory] = useState("");
  const [modeSubcategoryError, setModeSubcategoryError] = useState("");
  const [modeSubcategoryLoading, setModeSubcategoryLoading] = useState(false);
  const [deletingModeSubcategory, setDeletingModeSubcategory] = useState<string | null>(null);
  const [renamingModeSubcategory, setRenamingModeSubcategory] = useState<string | null>(null);
  const [modeSubcategoryRenameDrafts, setModeSubcategoryRenameDrafts] = useState<Record<string, string>>({});
  const [adminView, setAdminView] = useState<AdminView>("products");

  async function refreshAll(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [productsRes, categoriesRes, modeSubcategoriesRes] = await Promise.all([
        fetch("/api/admin/products", { cache: "no-store" }),
        fetch("/api/admin/categories", { cache: "no-store" }),
        fetch("/api/admin/mode-subcategories", { cache: "no-store" }),
      ]);

      if (productsRes.status === 401 || categoriesRes.status === 401 || modeSubcategoriesRes.status === 401) {
        window.location.href = "/admin";
        return;
      }

      const productsData = await productsRes.json().catch(() => []);
      const categoriesData = await categoriesRes.json().catch(() => []);
      const modeSubcategoriesData = await modeSubcategoriesRes.json().catch(() => []);

      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setModeSubcategories(Array.isArray(modeSubcategoriesData) ? modeSubcategoriesData : []);
      setProductsError("");
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
    setColorDraft("");
    setFormError("");
    setImageUploadError("");
    setImageUploading(false);
    setFormOpen(true);
  }

  function openEditForm(product: Product) {
    const images = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [product.image];
    const knownModeSubcategories = modeSubcategories.map((item) => item.name);
    const modeSubCategory =
      product.universe === "mode" ? matchModeSubcategory(product.category, knownModeSubcategories) : null;

    setFormMode("edit");
    setEditingId(product.id);
    setForm({
      name: product.name,
      price: String(product.price),
      category:
        product.universe === "mode"
          ? modeSubCategory
            ? "Vêtements"
            : normalizeModeCategoryInput(product.category)
          : product.category,
      subCategory: modeSubCategory ?? "",
      universe: product.universe,
      images,
      description: product.description,
      color: product.color || "",
      colorImages: normalizeColorImagesMap(product.colorImages),
      sizes: fromSizes(product.sizes),
    });
    setColorDraft("");
    setFormError("");
    setImageUploadError("");
    setImageUploading(false);
    setFormOpen(true);
  }

  async function handleImageUpload(file: File): Promise<string | null> {
    setImageUploadError("");

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
        return null;
      }

      return data.url;
    } catch {
      setImageUploadError("Upload image impossible.");
      return null;
    }
  }

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImageUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        const url = await handleImageUpload(file);
        if (url) uploadedUrls.push(url);
      }
      if (uploadedUrls.length > 0) {
        setForm((prev) => ({
          ...prev,
          images: Array.from(new Set([...prev.images, ...uploadedUrls])),
        }));
      }
    } finally {
      setImageUploading(false);
    }

    e.target.value = "";
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    setProductsError("");
    setDeletingId(id);

    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.status === 401) {
        window.location.href = "/admin";
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProductsError(data.error || "Suppression impossible.");
        return;
      }

      await refreshAll(true);
    } catch {
      setProductsError("Erreur reseau pendant la suppression du produit.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (imageUploading) {
      setFormError("Attendez la fin de l'upload des images.");
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
      setColorDraft("");
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

    if (category.count > 0) {
      setCategoryError(`Impossible de supprimer "${category.name}" car cette catégorie contient des produits.`);
      return;
    }

    if (!confirm(`Supprimer la catégorie "${category.name}" ?`)) return;

    setDeletingCategory(category.name);
    try {
      const res = await fetch(`/api/admin/categories/${encodeURIComponent(category.name)}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCategoryError(data.error || "Erreur lors de la suppression de catégorie.");
        return;
      }

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

  async function handleCreateModeSubcategory() {
    const name = newModeSubcategory.trim();
    setModeSubcategoryError("");
    if (!name) {
      setModeSubcategoryError("Nom de sous-categorie requis.");
      return;
    }

    setModeSubcategoryLoading(true);
    try {
      const res = await fetch("/api/admin/mode-subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setModeSubcategoryError(data.error || "Erreur lors de la création de sous-catégorie.");
        return;
      }

      setNewModeSubcategory("");
      await refreshAll(true);
    } finally {
      setModeSubcategoryLoading(false);
    }
  }

  async function handleDeleteModeSubcategory(subcategory: ModeSubcategoryInfo) {
    setModeSubcategoryError("");
    const confirmMessage =
      subcategory.count > 0
        ? `Supprimer la sous-categorie "${subcategory.name}" ? Les produits lies passeront dans "Vêtements" sans sous-categorie.`
        : `Supprimer la sous-categorie "${subcategory.name}" ?`;
    if (!confirm(confirmMessage)) return;

    setDeletingModeSubcategory(subcategory.name);
    try {
      const res = await fetch(`/api/admin/mode-subcategories/${encodeURIComponent(subcategory.name)}`, {
        method: "DELETE",
      });

      if (res.status === 401) {
        window.location.href = "/admin";
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setModeSubcategoryError(data.error || "Erreur lors de la suppression de sous-catégorie.");
        return;
      }

      await refreshAll(true);
    } finally {
      setDeletingModeSubcategory(null);
    }
  }

  async function handleRenameModeSubcategory(subcategory: ModeSubcategoryInfo) {
    const nextName = (modeSubcategoryRenameDrafts[subcategory.name] || subcategory.name).trim();
    setModeSubcategoryError("");

    if (!nextName) {
      setModeSubcategoryError("Nouveau nom de sous-categorie requis.");
      return;
    }

    if (nextName === subcategory.name) return;

    setRenamingModeSubcategory(subcategory.name);
    try {
      const res = await fetch(`/api/admin/mode-subcategories/${encodeURIComponent(subcategory.name)}`, {
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
        setModeSubcategoryError(data.error || "Erreur lors du renommage de sous-catégorie.");
        return;
      }

      setModeSubcategoryRenameDrafts((prev) => {
        const next = { ...prev };
        delete next[subcategory.name];
        return next;
      });

      await refreshAll(true);
    } finally {
      setRenamingModeSubcategory(null);
    }
  }

  function toggleFormSize(size: string) {
    setForm((prev) => {
      const current = toSizes(prev.sizes) || [];
      const next = current.includes(size)
        ? current.filter((value) => value !== size)
        : [...current, size];
      return { ...prev, sizes: next.join(", ") };
    });
  }

  const existingCategories = useMemo(() => categories.map((c) => c.name), [categories]);
  const formColorOptions = useMemo(() => parseColorList(form.color), [form.color]);
  const formSizeOptions = useMemo(() => toSizes(form.sizes) || [], [form.sizes]);
  const modeSubcategoryOptions = useMemo(() => {
    const values = modeSubcategories.map((item) => item.name).filter(Boolean);
    const uniqueValues = Array.from(new Set(values));
    if (uniqueValues.length === 0) {
      return [...MODE_CLOTHING_SUBCATEGORIES];
    }
    const currentSubcategory = form.subCategory.trim();
    if (currentSubcategory && !uniqueValues.includes(currentSubcategory)) {
      uniqueValues.unshift(currentSubcategory);
    }
    return uniqueValues;
  }, [modeSubcategories, form.subCategory]);
  const isModeClothingCategory = form.universe === "mode" && normalizeModeCategoryInput(form.category) === "Vêtements";

  function setFormColors(colors: string[]) {
    const next = uniqueColors(colors);
    setForm((prev) => {
      const nextColorImages: ColorImagesMap = {};

      for (const color of next) {
        const images = uniqueImageUrls(getColorImages(prev.colorImages, color));
        if (images.length > 0) {
          nextColorImages[color] = images;
        }
      }

      return {
        ...prev,
        color: next.join(", "),
        colorImages: nextColorImages,
      };
    });
  }

  function addColor(rawColor: string) {
    const values = parseColorList(rawColor);
    if (values.length === 0) return;
    setFormColors([...formColorOptions, ...values]);
    setColorDraft("");
  }

  function removeColor(color: string) {
    const key = normalizeColorName(color);
    setFormColors(formColorOptions.filter((value) => normalizeColorName(value) !== key));
  }

  function togglePresetColor(color: string) {
    const key = normalizeColorName(color);
    const exists = formColorOptions.some((value) => normalizeColorName(value) === key);
    if (exists) {
      removeColor(color);
      return;
    }
    addColor(color);
  }

  async function handleColorImageFileChange(color: string, e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImageUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        const url = await handleImageUpload(file);
        if (url) uploadedUrls.push(url);
      }

      if (uploadedUrls.length > 0) {
        setForm((prev) => {
          const current = getColorImages(prev.colorImages, color);
          const merged = uniqueImageUrls([...current, ...uploadedUrls]);
          const normalized = normalizeColorName(color);
          const nextMap = { ...prev.colorImages };

          for (const key of Object.keys(nextMap)) {
            if (normalizeColorName(key) === normalized) {
              delete nextMap[key];
            }
          }
          if (merged.length > 0) {
            nextMap[color] = merged;
          }

          return { ...prev, colorImages: nextMap };
        });
      }
    } finally {
      setImageUploading(false);
      e.target.value = "";
    }
  }

  function removeColorImage(color: string, index: number) {
    setForm((prev) => {
      const current = getColorImages(prev.colorImages, color);
      const nextImages = current.filter((_, imageIndex) => imageIndex !== index);
      const normalized = normalizeColorName(color);
      const nextMap = { ...prev.colorImages };

      for (const key of Object.keys(nextMap)) {
        if (normalizeColorName(key) === normalized) {
          delete nextMap[key];
        }
      }
      if (nextImages.length > 0) {
        nextMap[color] = nextImages;
      }

      return { ...prev, colorImages: nextMap };
    });
  }

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = products.filter((p) => {
      if (universeFilter !== "all" && p.universe !== universeFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.color || "").toLowerCase().includes(q) ||
        Object.keys(p.colorImages || {}).some((color) => color.toLowerCase().includes(q))
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
            Contrôle produits + catégories: créer, modifier, supprimer et filtrer.
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
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Boutique</p>
          <p className="mt-2 text-sm text-[var(--foreground)]">
            Mode: <span className="font-semibold">{modeCount}</span> · Univers: <span className="font-semibold">{toutCount}</span>
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Catégories</p>
          <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{categoryCount}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAdminView("products")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
              adminView === "products"
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Produits ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setAdminView("categories")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
              adminView === "categories"
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Catégories ({categoryCount})
          </button>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Vue active: <span className="font-semibold text-[var(--foreground)]">{adminView === "products" ? "Produits" : "Catégories"}</span>
        </p>
      </div>

      {adminView === "categories" && (
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

        {loading ? (
          <p className="mt-4 text-sm text-[var(--muted)]">Chargement des catégories…</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="bg-[var(--background)]">
                  <th className="border-b border-[var(--border)] p-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Catégorie</th>
                  <th className="border-b border-[var(--border)] p-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Produits</th>
                  <th className="border-b border-[var(--border)] p-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Renommer</th>
                  <th className="border-b border-[var(--border)] p-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-sm text-[var(--muted)]">Aucune catégorie.</td>
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
        )}

        <div className="mt-8 border-t border-[var(--border)] pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Nouvelle sous-catégorie vêtements
              </label>
              <input
                type="text"
                value={newModeSubcategory}
                onChange={(e) => setNewModeSubcategory(e.target.value)}
                placeholder="Ex. Jogging, Body, Casquette"
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]"
              />
            </div>
            <button
              type="button"
              onClick={handleCreateModeSubcategory}
              disabled={modeSubcategoryLoading}
              className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-70"
            >
              {modeSubcategoryLoading ? "Ajout…" : "Créer sous-catégorie"}
            </button>
          </div>

          {modeSubcategoryError && (
            <p className="mt-2 text-sm text-[var(--accent-deep)]">{modeSubcategoryError}</p>
          )}

          {loading ? (
            <p className="mt-4 text-sm text-[var(--muted)]">Chargement des sous-catégories…</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="bg-[var(--background)]">
                    <th className="border-b border-[var(--border)] p-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      Sous-catégorie
                    </th>
                    <th className="border-b border-[var(--border)] p-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      Produits
                    </th>
                    <th className="border-b border-[var(--border)] p-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      Renommer
                    </th>
                    <th className="border-b border-[var(--border)] p-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {modeSubcategories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-sm text-[var(--muted)]">
                        Aucune sous-catégorie vêtements.
                      </td>
                    </tr>
                  ) : (
                    modeSubcategories.map((subcategory) => (
                      <tr key={subcategory.name} className="border-b border-[var(--border)] last:border-0">
                        <td className="p-3 text-sm font-medium text-[var(--foreground)]">
                          {subcategory.name}
                        </td>
                        <td className="p-3 text-sm text-[var(--muted)]">{subcategory.count}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={modeSubcategoryRenameDrafts[subcategory.name] ?? subcategory.name}
                              onChange={(e) =>
                                setModeSubcategoryRenameDrafts((prev) => ({
                                  ...prev,
                                  [subcategory.name]: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameModeSubcategory(subcategory)}
                              disabled={renamingModeSubcategory === subcategory.name}
                              className="rounded border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
                            >
                              {renamingModeSubcategory === subcategory.name ? "…" : "Renommer"}
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteModeSubcategory(subcategory)}
                            disabled={deletingModeSubcategory === subcategory.name}
                            className="rounded border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--accent-deep)] transition hover:border-[var(--accent-deep)] disabled:opacity-50"
                          >
                            {deletingModeSubcategory === subcategory.name ? "…" : "Supprimer"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      )}

      {adminView === "products" && (
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
      )}

      {adminView === "products" && productsError && (
        <p className="mb-4 rounded-lg border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-3 py-2 text-sm text-[var(--accent-deep)]">
          {productsError}
        </p>
      )}

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
                    onChange={(e) => {
                      const nextUniverse = e.target.value as "mode" | "tout";
                      setForm((f) => ({
                        ...f,
                        universe: nextUniverse,
                        category: "",
                        subCategory: "",
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--foreground)]"
                  >
                    <option value="mode">Mode</option>
                    <option value="tout">Univers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)]">Catégorie *</label>
                  {form.universe === "mode" ? (
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          category: e.target.value,
                          subCategory: e.target.value === "Vêtements" ? f.subCategory : "",
                        }))
                      }
                      required
                      className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--foreground)]"
                    >
                      <option value="">Choisir</option>
                      {MODE_CATEGORIES.map((categoryOption) => (
                        <option key={categoryOption} value={categoryOption}>
                          {categoryOption}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
                {isModeClothingCategory && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)]">Sous-catégorie vêtement *</label>
                    <select
                      value={form.subCategory}
                      onChange={(e) => setForm((f) => ({ ...f, subCategory: e.target.value }))}
                      required
                      className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--foreground)]"
                    >
                      <option value="">Choisir</option>
                      {modeSubcategoryOptions.map((subCategoryOption) => (
                        <option key={subCategoryOption} value={subCategoryOption}>
                          {subCategoryOption}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">Photos produit *</label>
                <div className="mt-1 rounded-lg border border-[var(--border)] p-3">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageFileChange}
                    className="block w-full text-sm text-[var(--foreground)] file:mr-3 file:rounded file:border file:border-[var(--border)] file:bg-[var(--background)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:uppercase file:tracking-[0.12em]"
                  />
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    JPG, PNG, WEBP ou AVIF. Taille max: 8MB par image. Vous pouvez en selectionner plusieurs.
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    La premiere image sera utilisee comme image principale.
                  </p>

                  {imageUploading && (
                    <p className="mt-2 text-xs font-medium text-[var(--muted)]">Upload des images en cours…</p>
                  )}
                  {imageUploadError && (
                    <p className="mt-2 text-xs text-[var(--accent-deep)]">{imageUploadError}</p>
                  )}

                  {form.images.length > 0 && (
                    <div className="mt-3">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {form.images.map((img, idx) => (
                          <div key={`${img}-${idx}`} className="rounded border border-[var(--border)] p-1.5">
                            <div className="relative h-24 w-full overflow-hidden rounded bg-[var(--background)]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img} alt="" className="h-full w-full object-cover" />
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                                {idx === 0 ? "Principale" : `Photo ${idx + 1}`}
                              </span>
                              <div className="flex items-center gap-1">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setForm((f) => {
                                        const selected = f.images[idx];
                                        if (!selected) return f;
                                        const rest = f.images.filter((_, imageIndex) => imageIndex !== idx);
                                        return { ...f, images: [selected, ...rest] };
                                      })
                                    }
                                    className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                                  >
                                    Principale
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((f) => ({
                                      ...f,
                                      images: f.images.filter((_, imageIndex) => imageIndex !== idx),
                                    }))
                                  }
                                  className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                                >
                                  Retirer
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)]">
                    Couleurs (plusieurs possibles)
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={colorDraft}
                      onChange={(e) => setColorDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addColor(colorDraft);
                        }
                      }}
                      placeholder="Ex. Noir ou #111111"
                      className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--foreground)]"
                    />
                    <button
                      type="button"
                      onClick={() => addColor(colorDraft)}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      Ajouter
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    Entrez une couleur puis cliquez sur &quot;Ajouter&quot;. Codes HEX acceptes (ex. #111111).
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {COMMON_COLOR_OPTIONS.map((color) => {
                      const selected = formColorOptions.some(
                        (value) => normalizeColorName(value) === normalizeColorName(color)
                      );
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => togglePresetColor(color)}
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
                            selected
                              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                              : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                          }`}
                        >
                          {color}
                        </button>
                      );
                    })}
                  </div>
                  {formColorOptions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formColorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => removeColor(color)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        >
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-black/15"
                            style={{ backgroundColor: colorToSwatch(color) }}
                            aria-hidden
                          />
                          {color}
                          <span className="text-[10px] leading-none">×</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {formColorOptions.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Images par couleur (optionnel)
                      </p>
                      {formColorOptions.map((color, colorIndex) => {
                        const colorImages = getColorImages(form.colorImages, color);
                        const colorInputId = `color-images-${normalizeColorName(color).replace(/[^a-z0-9]+/g, "-")}-${colorIndex}`;

                        return (
                          <div
                            key={`color-images-${color}`}
                            className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
                          >
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--foreground)]">
                                <span
                                  className="h-3.5 w-3.5 rounded-full border border-black/15"
                                  style={{ backgroundColor: colorToSwatch(color) }}
                                  aria-hidden
                                />
                                {color}
                              </span>
                              <label
                                htmlFor={colorInputId}
                                className="cursor-pointer rounded border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                              >
                                Ajouter images
                              </label>
                              <input
                                id={colorInputId}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                  void handleColorImageFileChange(color, e);
                                }}
                                className="hidden"
                              />
                            </div>

                            {colorImages.length === 0 ? (
                              <p className="text-[11px] text-[var(--muted)]">
                                Aucune image specifique pour cette couleur.
                              </p>
                            ) : (
                              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {colorImages.map((img, imageIndex) => (
                                  <div
                                    key={`${color}-${img}-${imageIndex}`}
                                    className="rounded border border-[var(--border)] bg-white p-1"
                                  >
                                    <div className="relative h-16 w-full overflow-hidden rounded">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={img} alt="" className="h-full w-full object-cover" />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeColorImage(color, imageIndex)}
                                      className="mt-1 w-full rounded border border-[var(--border)] px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                                    >
                                      Retirer
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {formColorOptions.length === 0 && (
                    <p className="mt-2 text-[11px] text-[var(--muted)]">
                      Aucune couleur ajoutee.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)]">
                    Tailles
                  </label>
                  <input
                    type="text"
                    value={form.sizes}
                    onChange={(e) => setForm((f) => ({ ...f, sizes: e.target.value }))}
                    placeholder="Ex. S, M, L"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--foreground)]"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {COMMON_SIZE_OPTIONS.map((size) => {
                      const selected = formSizeOptions.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleFormSize(size)}
                          className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition ${
                            selected
                              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                              : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
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
                    ? "Upload images…"
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

      {adminView === "products" && (
        loading ? (
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
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3">
                      <div className="relative h-14 w-14 overflow-hidden rounded bg-[var(--muted)]/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.images?.[0] || p.image} alt="" className="h-full w-full object-cover" />
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-[var(--foreground)]">{p.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">/{p.slug}</p>
                    </td>
                    <td className="p-3 text-sm text-[var(--foreground)]">{formatPrice(p.price)}</td>
                    <td className="p-3 text-sm text-[var(--muted)]">{p.category}</td>
                    <td className="p-3 text-sm text-[var(--muted)]">{p.universe}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(p)}
                          className="rounded border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        >
                          Modifier
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
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
