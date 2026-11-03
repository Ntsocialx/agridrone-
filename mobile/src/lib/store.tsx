import { createContext, useContext, useState, type ReactNode } from "react";

// Demo-only, in-memory state. Nothing here is persisted or sent to a server;
// all names, places and amounts are synthetic.

export type Role = "operator" | "owner";
export type Service = "Mapping" | "Monitoring" | "Spraying" | "Surveying";
export type VerificationStatus = "not_submitted" | "in_review" | "approved" | "rejected";

export const SERVICES: Service[] = ["Mapping", "Monitoring", "Surveying", "Spraying"];

// Restricted/high-risk services stay on compliance hold: visible, but no bidding
// or assignment until an approved policy and evidence review exist (docs/AGENTS.md).
export const RESTRICTED_SERVICES: Service[] = ["Spraying"];
export const isRestricted = (service: Service) => RESTRICTED_SERVICES.includes(service);

export type Job = {
  id: string;
  title: string;
  service: Service;
  location: string;
  areaHa: number;
  date: string;
  budget: number;
  brief: string;
  postedBy: string;
  image: string;
};

export type Bid = {
  id: string;
  jobId: string;
  operator: string;
  amount: number;
  days: number;
  message: string;
  flightHours: number;
  distanceKm: number;
};

export type Application = {
  id: string;
  name: string;
  base: string;
  submitted: string;
  services: Service[];
  status: VerificationStatus;
  reason?: string;
};

export type Profile = {
  role: Role;
  name: string;
  base: string;
  radiusKm: string;
  services: Service[];
  verification: VerificationStatus;
};

const FIELD_IMAGE = "https://images.unsplash.com/photo-1500382017468-9049fed74703?auto=format&fit=crop&w=800&q=80";

const INITIAL_JOBS: Job[] = [
  {
    id: "j1",
    title: "Maize crop health analysis",
    service: "Mapping",
    location: "Demo Farm A, Western Cape",
    areaHa: 120,
    date: "2026-11-18",
    budget: 4500,
    brief: "Multispectral survey of maize blocks to flag crop stress. NDVI map and short findings report expected.",
    postedBy: "Demo Farm Owner A",
    image: FIELD_IMAGE,
  },
  {
    id: "j2",
    title: "Vineyard canopy monitoring",
    service: "Monitoring",
    location: "Demo Farm B, Western Cape",
    areaHa: 45,
    date: "2026-11-24",
    budget: 6200,
    brief: "Fortnightly canopy imagery across three vineyard blocks for the rest of the season.",
    postedBy: "Demo Farm Owner B",
    image: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "j3",
    title: "Wheat field fungicide application",
    service: "Spraying",
    location: "Demo Farm C, Western Cape",
    areaHa: 80,
    date: "2026-12-02",
    budget: 9800,
    brief: "Aerial fungicide application on wheat. Product and rate to be confirmed with the agronomist.",
    postedBy: "Demo Farm Owner C",
    image: "https://images.unsplash.com/photo-1464226188480-7377c6fd07ae?auto=format&fit=crop&w=800&q=80",
  },
];

const INITIAL_BIDS: Bid[] = [
  { id: "b1", jobId: "j1", operator: "Demo Operator 1", amount: 4200, days: 3, message: "Can fly early next week with a multispectral sensor.", flightHours: 340, distanceKm: 18 },
  { id: "b2", jobId: "j1", operator: "Demo Operator 2", amount: 4650, days: 2, message: "Includes a follow-up flight two weeks later.", flightHours: 520, distanceKm: 42 },
];

const INITIAL_APPLICATIONS: Application[] = [
  { id: "a1", name: "Demo Applicant 1", base: "Western Cape", submitted: "2026-10-30", services: ["Mapping", "Surveying"], status: "in_review" },
  { id: "a2", name: "Demo Applicant 2", base: "Free State", submitted: "2026-11-01", services: ["Monitoring"], status: "in_review" },
  { id: "a3", name: "Demo Applicant 3", base: "Gauteng", submitted: "2026-10-21", services: ["Mapping"], status: "approved" },
];

type Store = {
  profile: Profile;
  jobs: Job[];
  bids: Bid[];
  applications: Application[];
  selectedBids: Record<string, string>;
  updateProfile: (patch: Partial<Profile>) => void;
  submitForVerification: (details: Pick<Profile, "base" | "radiusKm" | "services">) => void;
  postJob: (job: Omit<Job, "id" | "postedBy" | "image">) => string;
  placeBid: (bid: Omit<Bid, "id" | "operator" | "flightHours" | "distanceKm">) => void;
  selectBid: (jobId: string, bidId: string) => void;
  decide: (applicationId: string, status: "approved" | "rejected", reason?: string) => void;
};

const StoreContext = createContext<Store | null>(null);

let nextId = 100;
const newId = (prefix: string) => `${prefix}${nextId++}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>({
    role: "operator",
    name: "",
    base: "",
    radiusKm: "50",
    services: [],
    verification: "not_submitted",
  });
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [bids, setBids] = useState(INITIAL_BIDS);
  const [applications, setApplications] = useState(INITIAL_APPLICATIONS);
  const [selectedBids, setSelectedBids] = useState<Record<string, string>>({});

  const store: Store = {
    profile,
    jobs,
    bids,
    applications,
    selectedBids,
    updateProfile: (patch) => setProfile((p) => ({ ...p, ...patch })),
    submitForVerification: (details) => {
      setProfile((p) => ({ ...p, ...details, verification: "in_review" }));
      setApplications((list) => [
        {
          id: "me",
          name: profile.name || "You (demo)",
          base: details.base,
          submitted: new Date().toISOString().slice(0, 10),
          services: details.services,
          status: "in_review",
        },
        ...list.filter((a) => a.id !== "me"),
      ]);
    },
    postJob: (job) => {
      const id = newId("j");
      setJobs((list) => [{ ...job, id, postedBy: profile.name || "You (demo)", image: FIELD_IMAGE }, ...list]);
      return id;
    },
    placeBid: (bid) =>
      setBids((list) => [
        ...list,
        { ...bid, id: newId("b"), operator: profile.name || "You (demo)", flightHours: 0, distanceKm: 0 },
      ]),
    selectBid: (jobId, bidId) => setSelectedBids((s) => ({ ...s, [jobId]: bidId })),
    decide: (applicationId, status, reason) => {
      setApplications((list) => list.map((a) => (a.id === applicationId ? { ...a, status, reason } : a)));
      // The demo applicant "me" is the local operator, so mirror the decision on their profile.
      if (applicationId === "me") setProfile((p) => ({ ...p, verification: status }));
    },
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}

// Manual grouping keeps output identical across Hermes/web Intl implementations.
export const formatZar = (amount: number) => `R ${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
