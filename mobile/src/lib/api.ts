import * as SecureStore from "expo-secure-store";
import { File } from "expo-file-system";
import { Platform } from "react-native";

// Override with EXPO_PUBLIC_API_URL (e.g. http://<laptop-ip>:3000/api/v1) for local dev.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://agridrone-api-olnv.onrender.com/api/v1";

export type Role = "operator" | "farm_owner" | "admin";
export type User = { id: string; role: Role; fullName: string };
export type Me = User & { email: string; phone: string; avatarUrl: string | null };
export type Service = "Mapping" | "Monitoring" | "Surveying" | "Spraying";
export type VerificationStatus = "not_submitted" | "in_review" | "approved" | "rejected";
export type JobStatus = "open" | "on_hold" | "assigned" | "pending_confirmation" | "completed" | "cancelled" | "removed";

export const SERVICES: Service[] = ["Mapping", "Monitoring", "Surveying", "Spraying"];
// Mirrors the server: restricted services are held, never biddable.
export const isRestricted = (service: Service) => service === "Spraying";

export type Job = {
  id: string;
  title: string;
  service: Service;
  location: string;
  areaHa: number;
  preferredDate: string;
  budgetZar: number;
  brief: string;
  status: JobStatus;
  ownerId: string;
  postedBy: string;
  assignedOperatorId: string | null;
  assignedOperatorName: string | null;
  createdAt: string;
  completedAt: string | null;
  bidCount: number;
  reviewed: boolean;
  removedReason: string | null;
};

export type NotificationKind = "announcement" | "update" | "job" | "verification" | "review" | "report";
export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  jobId: string | null;
  createdAt: string;
  read: boolean;
};

export type Bid = {
  id: string;
  operatorId: string;
  operatorName: string;
  amountZar: number;
  days: number;
  message: string;
  status: "pending" | "accepted" | "declined";
};

export type OperatorProfile = {
  base: string;
  radiusKm: number;
  services: Service[];
  verificationStatus: VerificationStatus;
  rejectionReason: string | null;
  licenceAttached: boolean;
};

export type Review = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerFirstName: string;
  jobTitle: string;
  service: Service;
};

export type PilotProfile = {
  id: string;
  fullName: string;
  base: string;
  services: Service[];
  verificationStatus: VerificationStatus;
  averageRating: number | null;
  reviewCount: number;
  completedJobs: number;
  completed: { id: string; title: string; service: Service; areaHa: number; completedAt: string }[];
  reviews: Review[];
  portfolio: { id: string; url: string; caption: string | null; createdAt: string }[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const TOKEN_KEY = "agridrone.session";
let token: string | null = null;
let onUnauthorized: () => void = () => {};

// SecureStore is native-only; the browser preview (for development) falls back to localStorage.
const store =
  Platform.OS === "web"
    ? {
        getItemAsync: async (key: string) => localStorage.getItem(key),
        setItemAsync: async (key: string, value: string) => localStorage.setItem(key, value),
        deleteItemAsync: async (key: string) => localStorage.removeItem(key),
      }
    : SecureStore;

export const session = {
  async load(): Promise<{ token: string; user: User } | null> {
    const raw = await store.getItemAsync(TOKEN_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { token: string; user: User };
    token = saved.token;
    return saved;
  },
  async save(newToken: string, user: User) {
    token = newToken;
    await store.setItemAsync(TOKEN_KEY, JSON.stringify({ token: newToken, user }));
  },
  /** Keeps the saved name in step after the user edits their details. */
  async updateUser(user: User) {
    if (token) await store.setItemAsync(TOKEN_KEY, JSON.stringify({ token, user }));
  },
  async clear() {
    token = null;
    await store.deleteItemAsync(TOKEN_KEY);
  },
  setUnauthorizedHandler(handler: () => void) {
    onUnauthorized = handler;
  },
};

// Requests still running after SLOW_MS (e.g. the free Render server waking up)
// switch on the full-screen loading animation.
const SLOW_MS = 2500;
let slowCount = 0;
const slowListeners = new Set<(slow: boolean) => void>();

export function subscribeSlow(listener: (slow: boolean) => void) {
  slowListeners.add(listener);
  return () => {
    slowListeners.delete(listener);
  };
}

async function trackSlow<T>(request: Promise<T>): Promise<T> {
  let slow = false;
  const timer = setTimeout(() => {
    slow = true;
    if (++slowCount === 1) slowListeners.forEach((l) => l(true));
  }, SLOW_MS);
  try {
    return await request;
  } finally {
    clearTimeout(timer);
    if (slow && --slowCount === 0) slowListeners.forEach((l) => l(false));
  }
}

/** Fire-and-forget ping so the free server starts waking while the user reads Welcome. */
export function wakeServer() {
  fetch(API_URL + "/health").catch(() => {});
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await trackSlow(fetch(API_URL + path, {
      method: options.method ?? (options.body ? "POST" : "GET"),
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    }));
  } catch {
    throw new ApiError("Can't reach AgriDrone. Check your connection and try again.", 0);
  }

  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // An expired token on a signed-in request means the session is over.
    if (response.status === 401 && token) onUnauthorized();
    throw new ApiError(data?.error?.message ?? "Something went wrong. Please try again.", response.status);
  }
  return data as T;
}

export type PickedFile = { uri: string; name: string; mimeType: string };

/** Signed direct upload: the file goes phone → Cloudinary; the API secret stays on the server. */
export async function uploadFile(kind: "licence" | "portfolio" | "avatar", file: PickedFile): Promise<string> {
  const { uploadUrl, fields } = await api<{ uploadUrl: string; fields: Record<string, string | number> }>(
    kind === "avatar" ? "/me/avatar/upload-signature" : `/operators/me/${kind}/upload-signature`,
    { method: "POST" },
  );
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, String(value));
  if (Platform.OS === "web") {
    // Browsers need the real bytes; the picker gives a blob:/data: URL we can read back.
    const blob = await (await fetch(file.uri)).blob();
    form.append("file", blob, file.name);
  } else {
    // Expo's fetch rejects React Native's old { uri, name, type } parts; an expo-file-system File streams the bytes.
    form.append("file", new File(file.uri) as unknown as Blob, file.name);
  }

  let response: Response;
  try {
    response = await trackSlow(fetch(uploadUrl, { method: "POST", body: form }));
  } catch (e) {
    // Keep the low-level reason (e.g. "Network request failed") so failures can be diagnosed from a screenshot.
    const detail = e instanceof Error ? ` (${e.message})` : "";
    throw new ApiError(`Upload failed. Check your connection and try again.${detail}`, 0);
  }
  if (!response.ok) {
    // Cloudinary explains rejections (e.g. "Image file format heic not allowed").
    const reason = (await response.json().catch(() => null))?.error?.message;
    throw new ApiError(`Upload was rejected${reason ? `: ${reason}` : ""}. Use a PDF, JPG or PNG under 5 MB.`, response.status);
  }
  return String(fields.public_id);
}

export const formatZar = (amount: number) => `R ${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

const IMAGES: Record<Service, string> = {
  Mapping: "https://images.unsplash.com/photo-1500382017468-9049fed74703?auto=format&fit=crop&w=800&q=80",
  Monitoring: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80",
  Surveying: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80",
  Spraying: "https://images.unsplash.com/photo-1464226188480-7377c6fd07ae?auto=format&fit=crop&w=800&q=80",
};
/** Jobs have no photos yet, so each service gets a representative aerial image. */
export const serviceImage = (service: Service) => IMAGES[service];
