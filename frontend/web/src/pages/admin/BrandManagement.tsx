
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Upload,
  X,
  Tags,
  Eye,
  EyeOff,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface Brand {
  id: number;
  name: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  show_on_home: boolean;
  display_order: number;
}

interface BrandForm {
  name: string;
  description: string;
  logo_url: string;
  is_active: boolean;
  show_on_home: boolean;
  display_order: number;
}

const initialForm: BrandForm = {
  name: "",
  description: "",
  logo_url: "",
  is_active: true,
  show_on_home: true,
  display_order: 0,
};

export default function BrandManagement() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [form, setForm] = useState<BrandForm>(initialForm);

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleMoveBrand = async (
    brand: Brand,
    direction: "up" | "down"
    ) => {
    const sortedBrands = [...brands].sort(
        (a, b) =>
        a.display_order - b.display_order ||
        a.name.localeCompare(b.name)
    );

    const currentIndex = sortedBrands.findIndex(
        (item) => item.id === brand.id
    );

    const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= sortedBrands.length) {
        return;
    }

    const reorderedBrands = [...sortedBrands];

    const [movedBrand] = reorderedBrands.splice(currentIndex, 1);
    reorderedBrands.splice(targetIndex, 0, movedBrand);

    try {
        setError("");
        setMessage("");

        await Promise.all(
        reorderedBrands.map((item, index) =>
            api.put(`/brands/${item.id}`, {
            display_order: index,
            })
        )
        );

        setBrands(
        reorderedBrands.map((item, index) => ({
            ...item,
            display_order: index,
        }))
        );

        setMessage("Brand display order updated successfully.");
    } catch (err: any) {
        setError(
        err.response?.data?.detail ||
            "Failed to update brand display order."
        );

        fetchBrands();
    }
    };
  useEffect(() => {
    if (!authLoading && user && !["admin", "super_admin"].includes(user.role)) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && user && ["admin", "super_admin"].includes(user.role)) {
      fetchBrands();
    }
  }, [authLoading, user]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await api.get<Brand[]>("/brands/");
      setBrands(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  const filteredBrands = useMemo(() => {
    return brands.filter((brand) => {
      const matchesSearch =
        brand.name.toLowerCase().includes(search.toLowerCase()) ||
        (brand.description || "").toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && brand.is_active) ||
        (filter === "inactive" && !brand.is_active) ||
        (filter === "homepage" && brand.show_on_home);

      return matchesSearch && matchesFilter;
    });
  }, [brands, search, filter]);

  const openCreateModal = () => {
    setEditingBrand(null);
    setForm(initialForm);
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    setForm({
      name: brand.name,
      description: brand.description || "",
      logo_url: brand.logo_url || "",
      is_active: brand.is_active,
      show_on_home: brand.show_on_home,
      display_order: brand.display_order,
    });
    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving || uploading) return;
    setModalOpen(false);
    setEditingBrand(null);
    setForm(initialForm);
    setError("");
  };

  const handleUploadLogo = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG and WEBP images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      setError("");

      const data = new FormData();
      data.append("file", file);

      const response = await api.post(
        "/products/upload-image/?folder=brands",
        data,
        {
          headers: {
            "Content-Type": undefined,
          },
        }
      );

      setForm((prev) => ({
        ...prev,
        logo_url: response.data.image_url,
      }));
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to upload brand logo."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Brand name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        logo_url: form.logo_url.trim() || null,
        is_active: form.is_active,
        show_on_home: form.show_on_home,
        display_order: Number(form.display_order) || 0,
      };

      if (editingBrand) {
        await api.put(`/brands/${editingBrand.id}`, payload);
        setMessage("Brand updated successfully.");
      } else {
        await api.post("/brands/", payload);
        setMessage("Brand created successfully.");
      }

      setModalOpen(false);
      setEditingBrand(null);
      setForm(initialForm);

      await fetchBrands();
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Could not save brand."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleBrandStatus = async (brand: Brand) => {
    try {
      await api.put(`/brands/${brand.id}`, {
        is_active: !brand.is_active,
      });

      setBrands((prev) =>
        prev.map((item) =>
          item.id === brand.id
            ? { ...item, is_active: !item.is_active }
            : item
        )
      );

      setMessage(
        brand.is_active
          ? "Brand deactivated successfully."
          : "Brand activated successfully."
      );
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to update brand status."
      );
    }
  };

  const toggleHomepage = async (brand: Brand) => {
    try {
      await api.put(`/brands/${brand.id}`, {
        show_on_home: !brand.show_on_home,
      });

      setBrands((prev) =>
        prev.map((item) =>
          item.id === brand.id
            ? { ...item, show_on_home: !item.show_on_home }
            : item
        )
      );

      setMessage(
        brand.show_on_home
          ? "Brand hidden from homepage."
          : "Brand added to homepage."
      );
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to update homepage visibility."
      );
    }
  };

  const handleDelete = async (brand: Brand) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${brand.name}"?\n\nProducts linked to this brand will keep their brand name, but their brand relationship will be removed.`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/brands/${brand.id}`);

      setBrands((prev) =>
        prev.filter((item) => item.id !== brand.id)
      );

      setMessage("Brand deleted successfully.");
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to delete brand."
      );
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5EF] dark:bg-[#0E1A2B]">
        <RefreshCw className="animate-spin text-[#D6B875]" size={32} />
      </div>
    );
  }

  if (!user || !["admin", "super_admin"].includes(user.role)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F7F5EF] dark:bg-[#0E1A2B] p-4 md:p-6 lg:p-8 text-[#101B2D] dark:text-slate-100">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#D6B875]/20 text-[#A88943]">
              <Tags size={25} />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Brand Management
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage your store brands and homepage visibility.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#101B2D] dark:bg-[#D6B875] text-white dark:text-[#101B2D] font-semibold hover:opacity-90 transition"
        >
          <Plus size={19} />
          Add New Brand
        </button>
      </div>

      {/* ALERTS */}
      {message && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-4 text-green-700 dark:text-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage("")}>
            <X size={18} />
          </button>
        </div>
      )}

      {error && !modalOpen && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 text-red-700 dark:text-red-400">
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* STATISTICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Brands"
          value={brands.length}
          icon={<Tags size={21} />}
        />

        <StatCard
          title="Active Brands"
          value={brands.filter((b) => b.is_active).length}
          icon={<CheckCircle size={21} />}
        />

        <StatCard
          title="Homepage Brands"
          value={brands.filter((b) => b.show_on_home).length}
          icon={<Eye size={21} />}
        />
      </div>

      {/* SEARCH AND FILTER */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#F7F5EF] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#D6B875]"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-3 rounded-xl bg-[#F7F5EF] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none"
          >
            <option value="all">All Brands</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="homepage">Homepage Visible</option>
          </select>

          <button
            onClick={fetchBrands}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* BRAND LIST */}
      {filteredBrands.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
          <Tags size={42} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-semibold">No brands found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Try another search or create a new brand.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[850px]">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-sm">
                <tr>
                  <th className="px-5 py-4">Brand</th>
                  <th className="px-5 py-4">Display Order</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Homepage</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredBrands.map((brand) => (
                  <tr
                    key={brand.id}
                    className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                          {brand.logo_url ? (
                            <img
                              src={brand.logo_url}
                              alt={brand.name}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <ImageIcon
                              size={22}
                              className="text-slate-400"
                            />
                          )}
                        </div>

                        <div>
                          <p className="font-semibold">{brand.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[280px] truncate">
                            {brand.description || "No description"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-semibold min-w-8 text-center">
                        {brand.display_order}
                        </span>

                        <div className="flex flex-col gap-1">
                        <button
                            onClick={() => handleMoveBrand(brand, "up")}
                            disabled={
                            brands
                                .slice()
                                .sort((a, b) => a.display_order - b.display_order)
                                .findIndex((b) => b.id === brand.id) === 0
                            }
                            title="Move Up"
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ArrowUp size={15} />
                        </button>

                        <button
                            onClick={() => handleMoveBrand(brand, "down")}
                            disabled={
                            brands
                                .slice()
                                .sort((a, b) => a.display_order - b.display_order)
                                .findIndex((b) => b.id === brand.id) === brands.length - 1
                            }
                            title="Move Down"
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ArrowDown size={15} />
                        </button>
                        </div>
                    </div>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleBrandStatus(brand)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                          brand.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                        }`}
                      >
                        {brand.is_active ? (
                          <CheckCircle size={14} />
                        ) : (
                          <XCircle size={14} />
                        )}
                        {brand.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleHomepage(brand)}
                        title="Toggle homepage visibility"
                        className={`p-2 rounded-lg transition ${
                          brand.show_on_home
                            ? "text-green-600 bg-green-100 dark:bg-green-950/40 dark:text-green-400"
                            : "text-slate-400 bg-slate-100 dark:bg-slate-700"
                        }`}
                      >
                        {brand.show_on_home ? (
                          <Eye size={19} />
                        ) : (
                          <EyeOff size={19} />
                        )}
                      </button>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(brand)}
                          title="Edit brand"
                          className="p-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/60"
                        >
                          <Edit size={18} />
                        </button>

                        <button
                          onClick={() => handleDelete(brand)}
                          title="Delete brand"
                          className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/60"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
            Showing {filteredBrands.length} of {brands.length} brands
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">

            <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div>
                <h2 className="text-xl font-bold">
                  {editingBrand ? "Edit Brand" : "Create New Brand"}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Enter your brand information below.
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving || uploading}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-5">

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* BRAND LOGO */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Brand Logo
                </label>

                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                    {form.logo_url ? (
                      <img
                        src={form.logo_url}
                        alt="Brand logo preview"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <ImageIcon size={30} className="text-slate-400" />
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#101B2D] dark:bg-[#D6B875] text-white dark:text-[#101B2D] text-sm font-semibold cursor-pointer hover:opacity-90">
                      <Upload size={16} />
                      {uploading ? "Uploading..." : "Upload Logo"}

                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={handleUploadLogo}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>

                    {form.logo_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            logo_url: "",
                          }))
                        }
                        className="text-xs text-red-500 text-left"
                      >
                        Remove logo
                      </button>
                    )}

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      JPG, PNG or WEBP. Maximum 5 MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* BRAND NAME */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Brand Name *
                </label>

                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter brand name"
                  className="w-full px-4 py-3 rounded-xl bg-[#F7F5EF] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#D6B875]"
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Description
                </label>

                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Write a short brand description..."
                  className="w-full px-4 py-3 rounded-xl bg-[#F7F5EF] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#D6B875] resize-none"
                />
              </div>

              {/* DISPLAY ORDER */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Display Order
                </label>

                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      display_order: Number(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-[#F7F5EF] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#D6B875]"
                />

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Lower numbers appear first.
                </p>
              </div>

              {/* SETTINGS */}
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl bg-[#F7F5EF] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <div>
                    <p className="font-semibold text-sm">Active Brand</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Allow this brand to be used on the store.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        is_active: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 accent-[#D6B875]"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-[#F7F5EF] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <div>
                    <p className="font-semibold text-sm">
                      Show on Homepage
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Display this brand on the customer homepage.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={form.show_on_home}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        show_on_home: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 accent-[#D6B875]"
                  />
                </label>
              </div>

              {/* BUTTONS */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving || uploading}
                  className="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-600 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-5 py-3 rounded-xl bg-[#101B2D] dark:bg-[#D6B875] text-white dark:text-[#101B2D] font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingBrand
                    ? "Update Brand"
                    : "Create Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h2 className="text-2xl font-bold mt-2">{value}</h2>
        </div>

        <div className="p-3 rounded-xl bg-[#D6B875]/20 text-[#A88943]">
          {icon}
        </div>
      </div>
    </div>
  );
}
