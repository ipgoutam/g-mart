import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Eye, EyeOff, Loader2, MessageSquare, Search, Star, X } from "lucide-react";
import api from "../../services/api";

type ReviewStatus = "pending" | "approved" | "rejected" | "hidden";

interface Review {
  id: number;
  user_id: number;
  product_id: number;
  rating: number;
  review_text?: string | null;
  status: ReviewStatus | string;
  created_at?: string;
  updated_at?: string;
  product_name?: string;
  customer_name?: string;
  user_name?: string;
  customer_email?: string;
  product?: { id?: number; name?: string };
  user?: { id?: number; full_name?: string; name?: string; email?: string };
}

type FilterStatus = "all" | ReviewStatus;

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 dark:bg-amber-900/30 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700 dark:text-red-300",
  hidden: "bg-gray-200 text-gray-700 dark:text-slate-200",
};

function getReviews(data: unknown): Review[] {
  if (Array.isArray(data)) return data as Review[];
  if (data && typeof data === "object") {
    const value = data as Record<string, unknown>;
    for (const key of ["reviews", "items", "results"]) {
      if (Array.isArray(value[key])) return value[key] as Review[];
    }
  }
  return [];
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/product-details/admin/reviews");
      setReviews(getReviews(response.data));
    } catch (err: any) {
      console.error("Failed to load product reviews:", err);
      setError(
        err?.response?.data?.detail ||
          "Unable to load reviews. Please refresh and try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const updateStatus = async (
    reviewId: number,
    status: Exclude<ReviewStatus, "pending">
  ) => {
    setUpdatingId(reviewId);
    setError("");
    try {
      await api.patch(
        `/product-details/admin/reviews/${reviewId}/moderation`,
        { status }
      );
      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId ? { ...review, status } : review
        )
      );
    } catch (err: any) {
      console.error("Failed to moderate review:", err);
      setError(
        err?.response?.data?.detail ||
          "Could not update this review. Please try again."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = useMemo(
    () => ({
      total: reviews.length,
      pending: reviews.filter((review) => review.status === "pending").length,
      approved: reviews.filter((review) => review.status === "approved").length,
      rejected: reviews.filter((review) => review.status === "rejected").length,
      hidden: reviews.filter((review) => review.status === "hidden").length,
    }),
    [reviews]
  );

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reviews.filter((review) => {
      const matchesStatus = filter === "all" || review.status === filter;
      const productName =
        review.product_name || review.product?.name || `Product #${review.product_id}`;
      const customerName =
        review.customer_name ||
        review.user_name ||
        review.user?.full_name ||
        review.user?.name ||
        `Customer #${review.user_id}`;
      const matchesSearch =
        !query ||
        productName.toLowerCase().includes(query) ||
        customerName.toLowerCase().includes(query) ||
        (review.customer_email || review.user?.email || "")
          .toLowerCase()
          .includes(query) ||
        (review.review_text || "").toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [reviews, filter, search]);

  const statCards = [
    { label: "Total reviews", value: counts.total, color: "text-[#101B2D]" },
    { label: "Pending", value: counts.pending, color: "text-amber-700 dark:text-amber-300" },
    { label: "Approved", value: counts.approved, color: "text-green-700 dark:text-green-300" },
    { label: "Rejected / Hidden", value: counts.rejected + counts.hidden, color: "text-gray-600" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-[#B39752]">
          Product management
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#101B2D] dark:text-slate-100 sm:text-3xl">
          Product Reviews
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          Review customer feedback and approve, reject, or hide submitted reviews.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 sm:text-sm">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search product, customer, or review..."
            className="w-full rounded-lg border border-gray-200 dark:border-slate-700 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#D6B875]"
          />
        </div>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as FilterStatus)}
          className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm outline-none focus:border-[#D6B875]"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="hidden">Hidden</option>
        </select>
        <button
          type="button"
          onClick={() => void loadReviews()}
          className="rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-[#101B2D] dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-16 text-sm text-gray-500 dark:text-slate-400">
          <Loader2 size={20} className="mr-2 animate-spin" />
          Loading reviews...
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-16 text-center">
          <MessageSquare size={34} className="mx-auto text-gray-300 dark:text-slate-500" />
          <h2 className="mt-3 font-semibold text-[#101B2D] dark:text-slate-100">No reviews found</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {reviews.length === 0
              ? "Customer reviews will appear here when submitted."
              : "Try changing your search or status filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const productName =
              review.product_name || review.product?.name || `Product #${review.product_id}`;
            const customerName =
              review.customer_name ||
              review.user_name ||
              review.user?.full_name ||
              review.user?.name ||
              `Customer #${review.user_id}`;
            const busy = updatingId === review.id;

            return (
              <article key={review.id} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#101B2D] dark:text-slate-100">{productName}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      By {customerName}
                      {(review.customer_email || review.user?.email) &&
                        ` · ${review.customer_email || review.user?.email}`}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[review.status] || statusStyles.pending}`}>
                    {review.status}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      size={17}
                      className={index < review.rating ? "fill-[#D6B875] text-[#D6B875]" : "text-gray-300"}
                    />
                  ))}
                  <span className="ml-2 text-xs text-gray-500 dark:text-slate-400">{review.rating}/5</span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-slate-200 dark:text-slate-200">
                  {review.review_text?.trim() || "No written comment."}
                </p>
                <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
                  Submitted: {formatDate(review.created_at)}
                  {review.updated_at && review.updated_at !== review.created_at
                    ? ` · Updated: ${formatDate(review.updated_at)}`
                    : ""}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 dark:border-slate-700 pt-4">
                  {review.status !== "approved" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void updateStatus(review.id, "approved")}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Approve
                    </button>
                  )}
                  {review.status !== "rejected" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void updateStatus(review.id, "rejected")}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <X size={14} />
                      Reject
                    </button>
                  )}
                  {review.status !== "hidden" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void updateStatus(review.id, "hidden")}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-slate-200 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
                    >
                      <EyeOff size={14} />
                      Hide
                    </button>
                  )}
                  {review.status === "hidden" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void updateStatus(review.id, "approved")}
                      className="inline-flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-800/60 px-3 py-2 text-xs font-semibold text-green-700 dark:text-green-300 dark:text-green-300 hover:bg-green-50 disabled:opacity-50"
                    >
                      <Eye size={14} />
                      Approve and publish
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Reviews;

