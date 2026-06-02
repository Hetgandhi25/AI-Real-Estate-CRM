import { apiDelete, apiGet, apiPost, apiPut } from "@/api";
import { API_ENDPOINTS } from "@/api/endpoints";
import { env } from "@/config";
import type { Review } from "@/types";

const createMockReview = (payload: Partial<Review>, id = `mock-${Date.now()}`): Review => ({
  id,
  customerId: payload.customerId ?? "mock-customer-id",
  reviewerName: payload.reviewerName ?? "Mock Reviewer",
  rating: payload.rating ?? 5,
  comment: payload.comment ?? "Excellent service and fast turnaround.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export async function getReviews(filters?: { search?: string }): Promise<Review[]> {
  if (env.VITE_MOCK_AUTH) {
    return [
      createMockReview({ customerId: "cust-1", reviewerName: "Madeline O.", rating: 5, comment: "Great communication and support." }),
      createMockReview({ customerId: "cust-2", reviewerName: "Rafael G.", rating: 4, comment: "Smooth closing process." }),
    ];
  }

  return apiGet<Review[]>(API_ENDPOINTS.reviews.list, {
    params: filters,
  });
}

export async function createReview(payload: Partial<Review>): Promise<Review> {
  if (env.VITE_MOCK_AUTH) {
    return createMockReview(payload);
  }

  return apiPost<Review, Partial<Review>>(API_ENDPOINTS.reviews.create, payload);
}

export async function updateReview(id: string, payload: Partial<Review>): Promise<Review> {
  if (env.VITE_MOCK_AUTH) {
    return createMockReview({ ...payload, id } as Partial<Review>, id);
  }

  return apiPut<Review, Partial<Review>>(API_ENDPOINTS.reviews.update(id), payload);
}

export async function deleteReview(id: string): Promise<void> {
  if (env.VITE_MOCK_AUTH) {
    return;
  }

  return apiDelete<void>(API_ENDPOINTS.reviews.delete(id));
}
