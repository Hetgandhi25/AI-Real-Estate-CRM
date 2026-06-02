import React, { useState, useEffect, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Star, Plus, Edit3, Trash2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Review } from "@/types";
import { reviewService } from '@/services';
import { queryKeys } from '@/api/query-keys';
import { useReviews, useCustomers, useQueryClient, useToast, useDebounce } from '@/hooks';
import { authGuard } from '@/lib/auth-guard';
import { ROUTES } from '@/constants/routes';

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`size-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function InteractiveStarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none transition-transform hover:scale-110"
          aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
        >
          <Star
            className={`size-7 ${star <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground">{value}/5</span>
    </div>
  );
}

export const Route = createFileRoute("/reviews")({
  beforeLoad: () => authGuard({ route: ROUTES.reviews }),
  head: () => ({ meta: [{ title: "Reviews — Ishan Technologies" }] }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: reviews = [], isLoading } = useReviews({ search: debouncedSearch || undefined });
  const { data: customers = [] } = useCustomers();

  const [open, setOpen] = useState(false);
  const [currentReview, setCurrentReview] = useState<Review | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [ratingValue, setRatingValue] = useState(5);
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load search from URL query parameter if any on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get("search");
    if (searchParam) {
      setSearch(searchParam);
    }
  }, []);

  const sorted = useMemo(
    () => [...reviews].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [reviews]
  );

  const avgRating = sorted.length
    ? (sorted.reduce((sum, r) => sum + r.rating, 0) / sorted.length).toFixed(1)
    : "—";

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: sorted.filter((r) => r.rating === star).length,
    pct: sorted.length ? Math.round((sorted.filter((r) => r.rating === star).length / sorted.length) * 100) : 0,
  }));

  const openNew = () => {
    setCurrentReview(null);
    setCustomerId(customers[0]?.id ?? "");
    setReviewerName("");
    setRatingValue(5);
    setComment("");
    setOpen(true);
  };

  const openEdit = (review: Review) => {
    setCurrentReview(review);
    setCustomerId(review.customerId);
    setReviewerName(review.reviewerName);
    setRatingValue(review.rating);
    setComment(review.comment);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!customerId || !reviewerName.trim() || !comment.trim()) {
      toast.error("Please complete all review fields.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        customerId,
        reviewerName: reviewerName.trim(),
        rating: ratingValue,
        comment: comment.trim(),
      };
      if (currentReview) {
        await reviewService.updateReview(currentReview.id, payload);
        toast.success("Review updated successfully");
      } else {
        await reviewService.createReview(payload);
        toast.success("Review added successfully");
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.reviews.list() });
      setOpen(false);
    } catch (error) {
      toast.fromApiError(error, "Failed to save review");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this review? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await reviewService.deleteReview(id);
      toast.success("Review deleted");
      await queryClient.invalidateQueries({ queryKey: queryKeys.reviews.list() });
    } catch (error) {
      toast.fromApiError(error, "Failed to delete review");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading reviews…" : `${reviews.length} customer review${reviews.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)]"
        >
          <Plus className="size-4" /> Add Review
        </button>
      </div>

      {/* Aggregate stats */}
      {sorted.length > 0 && (
        <div className="glass-card rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Average rating */}
          <div className="flex items-center gap-5">
            <div className="text-6xl font-extrabold tabular-nums text-amber-400 leading-none">{avgRating}</div>
            <div>
              <StarRating rating={Math.round(Number(avgRating))} />
              <p className="text-xs text-muted-foreground mt-1">{sorted.length} review{sorted.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          {/* Distribution */}
          <div className="space-y-1.5">
            {ratingDistribution.map(({ star, count, pct }) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 w-10 flex-shrink-0">
                  <span>{star}</span><Star className="size-3 fill-amber-400 text-amber-400" />
                </div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-right text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="glass-card rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <label htmlFor="review-search" className="sr-only">
            Search reviews
          </label>
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <input
            id="review-search"
            name="search"
            type="text"
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by customer, reviewer, comments..."
            className="w-full h-11 pl-10 pr-3 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </div>

      {/* Reviews list */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1.5fr_auto_2fr_auto] gap-4 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-muted">
          <span>Customer</span>
          <span>Reviewer</span>
          <span>Rating</span>
          <span>Comment</span>
          <span className="text-right">Actions</span>
        </div>
        {isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="grid grid-cols-[1.5fr_1.5fr_auto_2fr_auto] gap-4 px-5 py-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-16 ml-auto" />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <Star className="size-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-sm">No reviews yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add the first customer review to get started.</p>
            <button onClick={openNew} className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20">
              <Plus className="size-3.5" /> Add Review
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((review) => {
              const customer = customers.find((c) => c.id === review.customerId);
              return (
                <div key={review.id} className="grid grid-cols-[1.5fr_1.5fr_auto_2fr_auto] gap-4 px-5 py-4 text-sm items-center hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="font-medium truncate">{customer?.name ?? review.customerId.slice(0, 8)}</p>
                    {customer?.email && <p className="text-xs text-muted-foreground truncate">{customer.email}</p>}
                  </div>
                  <span className="font-medium truncate">{review.reviewerName}</span>
                  <StarRating rating={review.rating} />
                  <span className="text-muted-foreground text-xs line-clamp-2">{review.comment}</span>
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(review)}
                      className="inline-flex items-center justify-center rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Edit review"
                    >
                      <Edit3 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(review.id)}
                      disabled={deletingId === review.id}
                      className="inline-flex items-center justify-center rounded-lg border border-border p-1.5 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                      aria-label="Delete review"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{currentReview ? "Edit Review" : "Add Review"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-3">
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Customer</span>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm">
                <option value="">Select customer…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Reviewer Name</span>
              <input value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} placeholder="Full name of reviewer" className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm" />
            </label>
            <div className="space-y-2">
              <span className="text-sm font-medium block">Rating</span>
              <InteractiveStarRating value={ratingValue} onChange={setRatingValue} />
            </div>
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Review Comment</span>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="What did the customer say?" className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm resize-none" />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground">Cancel</button>
            <button type="button" disabled={isSaving} onClick={handleSave} className="rounded-xl bg-[image:var(--gradient-primary)] px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {isSaving ? "Saving…" : currentReview ? "Save Changes" : "Add Review"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ReviewsPage;