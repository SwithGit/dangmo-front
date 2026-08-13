"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as PortOne from "@portone/browser-sdk/v2";
import { KSIC_DIVISIONS, REGION_OPTIONS, startupAge } from "../lib/profile-options";
import { consumeLoginMethod, rememberLoginMethod, trackEvent, trackPageView } from "../lib/analytics";

const LazyCommunityBoardView = lazy(() => import("./components/community-views").then((module) => ({ default: module.CommunityBoardView })));
const LazyCustomerSupportView = lazy(() => import("./components/community-views").then((module) => ({ default: module.CustomerSupportView })));

type View =
  | "explore"
  | "match"
  | "projects"
  | "budget"
  | "writing"
  | "profile"
  | "plan"
  | "notificationSettings"
  | "payment"
  | "operations"
  | "notices"
  | "bamboo"
  | "support";

type ProfileTab = "basic" | "business" | "logic";
type BudgetSource = "support" | "cash" | "inkind";

type ChecklistTemplateItem = {
  id: string;
  label: string;
  kind: "review" | "budget" | "document" | "submit";
};

type BudgetRules = {
  confirmed: boolean;
  supportMaxRatio: number | null;
  cashMinRatio: number | null;
  inkindMaxRatio: number | null;
  allowedCategories: string[];
  note: string;
};

type WritingTemplateItem = {
  id: string;
  topic: string;
  guide: string;
};

type Announcement = {
  id: string;
  sourceKey: string;
  dday: string;
  category: string;
  institution: string;
  region: string;
  title: string;
  score: number;
  reasons: string | string[];
  cautions?: string[];
  eligibilityStatus?: "eligible" | "review" | "ineligible";
  scoreBreakdown?: { purpose: number; stage: number; capability: number; preference: number };
  support: string;
  deadline: string;
  applyEndAt: string;
  search?: string;
  overview: string;
  eligibility?: string[];
  benefits?: string[];
  requiredDocuments?: string[];
  programPeriod?: string;
  applicationMethod?: string;
  contact?: string;
  publishedAt: string;
  sourceUrl: string;
  sourceLabel: string;
  sourceId?: "kstartup" | "bizinfo" | "custom" | "preview";
  status?: "open" | "closed";
  sourceCheckedAt?: string;
  tags?: string[];
  checklistTemplate?: ChecklistTemplateItem[];
  budgetRules?: BudgetRules;
  writingTemplate?: WritingTemplateItem[];
};

type CommunityPostSummary = {
  id: string;
  board: "notice" | "bamboo";
  title: string;
  excerpt: string;
  authorLabel: string;
  pinned: boolean;
  commentCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
};

type CommunityPostDetail = CommunityPostSummary & { content: string };

type CommunityComment = {
  id: string;
  content: string;
  authorLabel: string;
  mine: boolean;
  createdAt: string;
};

type CommunityListPayload = { posts: CommunityPostSummary[] };
type CommunityDetailPayload = { post: CommunityPostDetail; comments: CommunityComment[] };

type SupportCategory = "issue" | "suggestion" | "feedback" | "other";
type SupportStatus = "received" | "in_review" | "resolved" | "closed";
type SupportRequestItem = {
  id: string;
  category: SupportCategory;
  subject: string;
  content: string;
  status: SupportStatus;
  adminResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
type SupportPayload = { email: string; requests: SupportRequestItem[] };

type ProjectChecklist = Record<string, boolean>;

type SavedProject = {
  id: string;
  announcementKey: string;
  title: string;
  institution: string;
  sourceUrl: string;
  sourceLabel: string;
  support: string;
  applyEndAt: string;
  dday: string;
  category: string;
  region: string;
  deadline: string;
  status: "saved" | "preparing" | "completed";
  progress: number;
  checklist: ProjectChecklist;
  checklistItems: ChecklistTemplateItem[];
  budgetRules: BudgetRules;
  lastEditedAt: string | null;
};

type AnnouncementSourceStatus = {
  id: "kstartup" | "bizinfo";
  label: string;
  status: "connected" | "needs_key" | "error";
  count: number;
  message: string;
};

type AnnouncementFeedPayload = {
  announcements: Announcement[];
  sources: AnnouncementSourceStatus[];
  profileStatus: "approved" | "basic";
  personalized: boolean;
  recommendedTotal: number;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  generatedAt: string;
  sync?: { inserted: number; changed: number; total: number; syncedAt: string };
  notifications?: NotificationPayload;
};

type AnnouncementFeedRequest = {
  page: number;
  query: string;
  region: string;
  stages: string[];
  sort: "latest" | "deadline" | "title" | "match";
  mode?: "all" | "recommendations";
  audience?: "public" | "personalized";
};

type BasicProfileData = {
  id?: string;
  summary: string;
  stage: string;
  startupStatus: "pre" | "registered";
  establishedAt: string | null;
  industryCode: string;
  industryDetailCode: string | null;
  industry: string;
  region: string;
};

type CustomSource = {
  id: string;
  name: string;
  listingUrl: string;
  status: "active" | "paused" | "error" | "needs_review";
  lastCheckedAt: string | null;
  itemCount: number;
  lastError: string | null;
  createdAt: string;
};

type CustomSourcePayload = {
  sources: CustomSource[];
  feed?: AnnouncementFeedPayload | null;
};

type BudgetItem = {
  id: string;
  source: BudgetSource;
  category: string;
  name: string;
  amount: number;
};

type BudgetAllocationTargets = Record<BudgetSource, number>;

type BusinessDocument = {
  id: string;
  name: string;
  meta: string;
  status?: string;
};

type DocumentUploadState = {
  status: "idle" | "uploading" | "success" | "error";
  message: string;
};

type ProfileAnalysisRunState = {
  status: "idle" | "running" | "success" | "error";
  message: string;
};

type DraftSection = {
  id: string;
  topic: string;
  guide: string;
  content: string;
};

type PracticeBudgetWorkspace = {
  id: string;
  name: string;
  totalBudget: number;
  allocationTargets: BudgetAllocationTargets;
  items: BudgetItem[];
  createdAt: string;
  updatedAt: string;
};

type PracticeWritingWorkspace = {
  id: string;
  name: string;
  sections: DraftSection[];
  createdAt: string;
  updatedAt: string;
};

type BusinessProfileAnalysis = {
  summary: string;
  elevatorPitch: string;
  customers: string[];
  problems: string[];
  solutions: string[];
  businessModel: string[];
  stage: string;
  regions: string[];
  keywords: string[];
  evidence: Array<{
    documentName: string;
    location: string;
    fact: string;
    confidence: "high" | "medium" | "low";
  }>;
  meta: { provider: "openai" | "preview"; model: string; analyzedAt: string };
};

type BusinessProfileReview = {
  id: string;
  version: number;
  status: "draft" | "approved" | "superseded";
  analysis: BusinessProfileAnalysis;
  changes: {
    isFirstVersion: boolean;
    changedFields: string[];
    addedKeywords: string[];
    removedKeywords: string[];
  };
  sourceDocumentIds: string[];
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
};

type ProfileVersionSummary = {
  id: string;
  version: number;
  status: BusinessProfileReview["status"];
  summary: string;
  elevatorPitch: string;
  keywords: string[];
  sourceDocumentIds: string[];
  active: boolean;
  createdAt: string;
  approvedAt: string | null;
};

type AiRuntime = {
  provider: "openai" | "preview";
  profileModel: string;
  writingModel: string;
  dailyTokensUsed: number;
  dailyTokenLimit: number;
  profileAnalysesToday: number;
  profileDailyLimit: number;
};

type AiDraftOperation = "polish" | "evidence" | "generate";

type DraftRevision = {
  id: string;
  version: number;
  source: "manual" | "ai" | "restore";
  operation: string | null;
  creditSpent: number;
  createdAt: string;
};

type NotificationPreferences = {
  webEnabled: boolean;
  emailEnabled: boolean;
  reminderDays: number[];
  realtimeProEnabled: boolean;
};

type NotificationItem = {
  id: string;
  projectId: string | null;
  type: string;
  title: string;
  message: string;
  targetView: string;
  actionLabel: string;
  read: boolean;
  emailed: boolean;
  emailStatus?: string;
  createdAt: string;
};

type NotificationPayload = {
  items: NotificationItem[];
  unreadCount: number;
  preferences: NotificationPreferences;
  emailProviderConnected: boolean;
  plan: string;
};

type BillingProduct = {
  id: string;
  label: string;
  amount: number;
  credits: number;
  plan: string | null;
};

type BillingHistoryItem = {
  id: string;
  type: string;
  status: string;
  productId: string | null;
  amount: number;
  creditsDelta: number;
  plan: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type BillingPayload = {
  plan: string;
  credits: number;
  paidCredits: number;
  dailyFreeCredits: number;
  dailyFreeCreditCap: number;
  dailyFreeCreditAmount: number;
  dailyCreditGrantedOn: string | null;
  trialAvailable: boolean;
  trialEndsAt: string | null;
  checkoutConfigured: boolean;
  provider: string | null;
  readiness: {
    providerConfigured: boolean;
    checkoutConfigured: boolean;
    webhookConfigured: boolean;
    clientKeyConfigured: boolean;
    secretKeyConfigured: boolean;
    recurringConfigured: boolean;
    productsConfigured: boolean;
    webhookUrl: string;
    successUrl: string;
    failUrl: string;
    mode: "preparation" | "key-mismatch" | "sandbox-ready" | "live-ready";
  };
  products: BillingProduct[];
  history: BillingHistoryItem[];
  subscription: null | {
    id: string;
    provider: string;
    customerId: string | null;
    plan: string;
    status: string;
    nextBilledAt: string | null;
    cancelAt: string | null;
    canceledAt: string | null;
  };
  accessPass: null | {
    id: string;
    plan: string;
    status: string;
    startsAt: string | null;
    expiresAt: string | null;
    autoRenews: false;
  };
  refundRequests: Array<{
    id: string;
    billingEventId: string;
    reason: string;
    status: string;
    providerAdjustmentId: string | null;
    resolutionNote: string | null;
    createdAt: string;
    resolvedAt: string | null;
  }>;
};

type PortOneV2CheckoutPayload = {
  configured: true;
  provider: "portone_v2";
  storeId: string;
  channelKey: string;
  paymentId: string;
  orderName: string;
  amount: number;
  customerId: string;
  customerEmail: string;
  customerName: string;
  redirectUrl: string;
  webhookUrl: string;
};

type WorkspacePayload = {
  activeProjectId: string | null;
  user: {
    displayName: string;
    email: string;
    plan: string;
    aiCredits: number;
    development: boolean;
    authProvider: "google" | "kakao" | "chatgpt" | "preview";
    admin: boolean;
  };
  profile: {
    summary: string;
    stage: string;
    startupStatus: "pre" | "registered";
    establishedAt: string | null;
    industryCode: string | null;
    industryDetailCode: string | null;
    industry: string | null;
    region: string | null;
    analysis: BusinessProfileAnalysis | null;
    review: BusinessProfileReview | null;
    versions: ProfileVersionSummary[];
  };
  ai: AiRuntime;
  projects: SavedProject[];
  budgetItems: BudgetItem[];
  documents: BusinessDocument[];
  draftSections: DraftSection[];
  draftVersions: DraftRevision[];
};

type AuthProviderStatus = {
  origin: string;
  google: { configured: boolean; redirectUri: string; requirements: string[] };
  kakao: { configured: boolean; redirectUri: string; requirements: string[] };
};

type AutomationRun = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  trigger: string;
  progressPercent: number;
  progressStage: string;
  progressMessage: string | null;
  insertedCount: number;
  changedCount: number;
  recommendationCount: number;
  notificationCount: number;
  errorMessage: string | null;
  heartbeatAt: string | null;
  startedAt: string;
  finishedAt: string | null;
};

type AutomationStatus = {
  configured: {
    kstartup: boolean;
    bizinfo: boolean;
    ai: boolean;
    email: boolean;
    google: boolean;
    kakao: boolean;
    automation: boolean;
  };
  schedule: {
    label: string;
    timeZone: string;
    cron: string;
    nextRunAt: string;
  };
  runs: AutomationRun[];
};

type OperationsPayload = {
  authenticated: true;
  authorized: true;
  metrics: {
    users: number;
    approvedProfiles: number;
    documents: number;
    openAnnouncements: number;
    pendingReviews: number;
    failedRuns: number;
    staleAnnouncements: number;
    missingDeadlines: number;
    emailFailures: number;
    aiFailures: number;
    securityRejections: number;
  };
  connections: { kstartup: boolean; bizinfo: boolean; ai: boolean; email: boolean };
  sourceHealth: Array<{ source: string; totalCount: number; openCount: number; missingDeadlineCount: number; lastCheckedAt: string | null; stale: boolean }>;
  recovery: { lastSuccessfulRunAt: string | null; databaseBound: boolean; privateFileStorageBound: boolean; accountExportReady: boolean; auditRetentionDays: number; readNotificationRetentionDays: number };
  reviews: Array<{
    id: string;
    source: string;
    title: string;
    institution: string;
    sourceUrl: string;
    status: string;
    applyEndAt: string | null;
    sourceCheckedAt: string;
    reviewStatus: "pending" | "approved" | "flagged";
    note: string | null;
    reviewedAt: string | null;
  }>;
  reviewPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  runs: Array<Record<string, unknown>>;
  audits: Array<Record<string, unknown>>;
  community: {
    posts: Array<{
      id: string;
      board: "notice" | "bamboo";
      title: string;
      content: string;
      pinned: boolean;
      viewCount: number;
      commentCount: number;
      createdAt: string;
      updatedAt: string;
    }>;
    comments: Array<{
      id: string;
      postId: string;
      postTitle: string;
      content: string;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  supportRequests: Array<SupportRequestItem & {
    email: string;
    displayName: string;
  }>;
  coupons: Array<{
    id: string;
    code: string;
    credits: number;
    status: string;
    expiresAt: string | null;
    redeemedAt: string | null;
    redeemedBy: string | null;
    createdAt: string;
  }>;
  refundRequests: Array<{
    id: string;
    billingEventId: string;
    providerTransactionId: string | null;
    reason: string;
    status: string;
    providerAdjustmentId: string | null;
    resolutionNote: string | null;
    createdAt: string;
    resolvedAt: string | null;
    email: string;
    productId: string | null;
    amount: number;
    provider: string;
  }>;
  aiSafety: {
    tokensUsed24h: number;
    tokenLimit24h: number;
    requests24h: number;
    requestLimit24h: number;
    profileAnalyses24h: number;
    writingRequests24h: number;
    creditsSpent24h: number;
    failures7d: number;
    creditAnomalies: number;
    retryAttempts: number;
    models: Array<{ model: string; requests: number; tokens: number }>;
  };
  notificationHealth: {
    automationHealthy: boolean;
    lastSuccessfulRunAt: string | null;
    events24h: number;
    deadlineEvents7d: number;
    emailsSent7d: number;
    emailsFailed7d: number;
  };
  launch: {
    publicBetaChecks: Array<{ key: string; label: string; ready: boolean }>;
    publicBetaReady: boolean;
    paidLaunchChecks: Array<{ key: string; label: string; ready: boolean }>;
    supportEmail: string;
    funnel: {
      signedUp: number;
      profiled: number;
      savedAnnouncement: number;
      usedWritingAi: number;
      emailOptIn: number;
    };
  };
};

type CommunityAdminAction =
  | { action: "create-community-notice"; title: string; content: string; pinned: boolean }
  | { action: "update-community-post"; postId: string; title: string; content: string; pinned: boolean }
  | { action: "delete-community-post"; postId: string }
  | { action: "update-community-comment"; commentId: string; content: string }
  | { action: "delete-community-comment"; commentId: string };

type SupportAdminAction = {
  action: "update-support-request";
  supportRequestId: string;
  status: SupportStatus;
  adminResponse?: string;
};

const announcements: Announcement[] = [];

const defaultChecklistTemplate: ChecklistTemplateItem[] = [
  { id: "sourceReviewed", label: "공고 원문·자격조건 확인", kind: "review" },
  { id: "eligibilityProof", label: "신청 자격 증빙 준비", kind: "document" },
  { id: "budget", label: "사업비 편성안 작성", kind: "budget" },
  { id: "draft", label: "신청서 초안 작성", kind: "document" },
  { id: "submit", label: "최종 검토·제출", kind: "submit" },
];

const defaultBudgetRules: BudgetRules = {
  confirmed: false,
  supportMaxRatio: null,
  cashMinRatio: null,
  inkindMaxRatio: null,
  allowedCategories: ["인건비", "외주용역비", "재료비", "마케팅비"],
  note: "부담금 비율과 허용 세목은 공고 원문에서 최종 확인해주세요.",
};

const reasonText = (item: Announcement) => Array.isArray(item.reasons) ? item.reasons.join(" · ") : item.reasons;
const MIN_RECOMMENDATION_SCORE = 65;
const isRecommendedAnnouncement = (item: Announcement) => item.score >= MIN_RECOMMENDATION_SCORE;

const navGroups: Array<{
  label: string;
  items: Array<{ icon: string; label: string; view: View; badge?: string }>;
}> = [
  {
    label: "탐색",
    items: [
      { icon: "⌖", label: "지원사업 탐색", view: "explore" },
      { icon: "✦", label: "맞춤 추천", view: "match" },
    ],
  },
  {
    label: "준비",
    items: [
      { icon: "▣", label: "나의 사업", view: "projects" },
      { icon: "∑", label: "사업비 편성", view: "budget" },
      { icon: "✎", label: "서류작성 AI", view: "writing" },
    ],
  },
  {
    label: "커뮤니티",
    items: [
      { icon: "◈", label: "공지사항", view: "notices" },
      { icon: "♧", label: "대나무숲", view: "bamboo" },
      { icon: "?", label: "고객센터", view: "support" },
    ],
  },
];

const viewMeta: Record<View, { eyebrow: string; title: string }> = {
  explore: { eyebrow: "지원사업 탐색", title: "지원사업 전체보기" },
  match: { eyebrow: "AI 사업 프로필 기준", title: "맞춤 추천" },
  projects: { eyebrow: "저장 공고 · 준비 현황", title: "나의 사업" },
  budget: { eyebrow: "자동 계산 · 제약 검증", title: "사업비 편성" },
  writing: { eyebrow: "대주제별 초안 · AI 보강", title: "서류작성 AI" },
  profile: { eyebrow: "계정 · AI 사업 컨텍스트", title: "내 프로필" },
  plan: { eyebrow: "계정 · 이용권 관리", title: "요금제 및 사용량" },
  notificationSettings: { eyebrow: "채널 · 수신 기준", title: "알림 설정" },
  payment: { eyebrow: "결제 수단 · 이용 내역", title: "결제 관리" },
  operations: { eyebrow: "관리자 · 서비스 상태", title: "운영 관리" },
  notices: { eyebrow: "당모 소식 · 이용 안내", title: "공지사항" },
  bamboo: { eyebrow: "익명으로 나누는 창업 이야기", title: "대나무숲" },
  support: { eyebrow: "이슈 · 건의 · 피드백", title: "고객센터" },
};

const viewAnalyticsMeta: Record<View, { path: string; menuName: string }> = {
  explore: { path: "/app/explore", menuName: "지원사업 탐색" },
  match: { path: "/app/recommendations", menuName: "맞춤 추천" },
  projects: { path: "/app/projects", menuName: "나의 사업" },
  budget: { path: "/app/budget", menuName: "사업비 편성" },
  writing: { path: "/app/writing", menuName: "서류작성 AI" },
  profile: { path: "/app/profile/basic", menuName: "내 프로필" },
  plan: { path: "/app/plan", menuName: "요금제 및 사용량" },
  notificationSettings: { path: "/app/notifications", menuName: "알림 설정" },
  payment: { path: "/app/payment", menuName: "결제 관리" },
  operations: { path: "/app/operations", menuName: "운영 관리" },
  notices: { path: "/app/notices", menuName: "공지사항" },
  bamboo: { path: "/app/bamboo", menuName: "대나무숲" },
  support: { path: "/app/support", menuName: "고객센터" },
};

const profileAnalyticsMeta: Record<ProfileTab, { path: string; title: string; menuName: string }> = {
  basic: { path: "/app/profile/basic", title: "내 프로필 기본 정보", menuName: "내 프로필 · 기본 정보" },
  business: { path: "/app/profile/business", title: "AI 사업 프로필", menuName: "내 프로필 · AI 사업 프로필" },
  logic: { path: "/app/profile/logic", title: "맞춤 추천 기준", menuName: "내 프로필 · 추천 기준" },
};

function applicationRoute(pathname: string): { view: View; profileTab?: ProfileTab } {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const profileRoute = (Object.entries(profileAnalyticsMeta) as Array<[ProfileTab, (typeof profileAnalyticsMeta)[ProfileTab]]>)
    .find(([, meta]) => meta.path === normalizedPath);
  if (profileRoute) return { view: "profile", profileTab: profileRoute[0] };

  const viewRoute = (Object.entries(viewAnalyticsMeta) as Array<[View, (typeof viewAnalyticsMeta)[View]]>)
    .find(([, meta]) => meta.path === normalizedPath);
  if (viewRoute) return { view: viewRoute[0] };
  return { view: "explore" };
}

const practiceBudgetRules: BudgetRules = {
  confirmed: false,
  supportMaxRatio: null,
  cashMinRatio: null,
  inkindMaxRatio: null,
  allowedCategories: ["인건비", "외주용역비", "재료비", "마케팅비", "임차료", "장비 사용료"],
  note: "연습 모드에는 고정 비율이 없습니다. 지원금과 부담금을 원하는 구성으로 자유롭게 편성해보세요.",
};

const practiceBudgetPreset = (): BudgetItem[] => [
  { id: "practice-support-1", source: "support", category: "인건비", name: "", amount: 0 },
  { id: "practice-support-2", source: "support", category: "외주용역비", name: "", amount: 0 },
  { id: "practice-cash-1", source: "cash", category: "현금 부담 세목", name: "", amount: 0 },
  { id: "practice-inkind-1", source: "inkind", category: "현물 부담 세목", name: "", amount: 0 },
];

const emptyBudgetAllocationTargets = (): BudgetAllocationTargets => ({ support: 0, cash: 0, inkind: 0 });

const PRACTICE_BUDGET_STORAGE_KEY = "dangmo-practice-budgets-v5";
const LEGACY_PRACTICE_BUDGET_STORAGE_KEYS = ["dangmo-practice-budgets-v4", "dangmo-practice-budget-v3", "dangmo-practice-budget-v2"];

const initialDraftSections: DraftSection[] = [
  { id: "business-overview", topic: "사업 개요", guide: "사업의 목적, 핵심 고객, 제공 가치를 간결하게 작성하세요.", content: "당모는 여러 기관에 흩어진 창업지원사업을 한곳에서 탐색하고, 사용자의 창업 단계와 업종에 맞는 공고를 추천하는 서비스입니다." },
  { id: "problem-definition", topic: "문제 인식 및 필요성", guide: "고객이 겪는 문제와 기존 해결 방식의 한계를 근거와 함께 설명하세요.", content: "" },
  { id: "solution-plan", topic: "해결 방안 및 실행 계획", guide: "제품의 해결 방식, 차별점, 단계별 실행 계획을 작성하세요.", content: "" },
];

const practiceWritingPreset = (): DraftSection[] => [
  { id: "practice-overview", topic: "사업 개요", guide: "사업 목적, 핵심 고객과 제공 가치를 한 문단으로 정리해보세요.", content: "" },
  { id: "practice-problem", topic: "문제 인식 및 필요성", guide: "고객이 겪는 문제와 기존 해결 방식의 한계를 작성해보세요.", content: "" },
  { id: "practice-solution", topic: "해결 방안 및 실행 계획", guide: "제품·서비스의 해결 방식과 단계별 실행 계획을 작성해보세요.", content: "" },
  { id: "practice-market", topic: "목표시장 및 고객", guide: "목표시장 규모, 핵심 고객군과 초기 고객 확보 방법을 정리해보세요.", content: "" },
  { id: "practice-growth", topic: "수익모델 및 성장 전략", guide: "수익이 발생하는 구조와 시장 진입 이후 성장 계획을 작성해보세요.", content: "" },
  { id: "practice-team", topic: "팀 구성 및 실행 역량", guide: "대표자와 핵심 인력의 역할, 경험과 실행 역량을 작성해보세요.", content: "" },
];

const PRACTICE_WRITING_STORAGE_KEY = "dangmo-practice-writings-v3";
const LEGACY_PRACTICE_WRITING_STORAGE_KEYS = ["dangmo-practice-writing-v2", "dangmo-practice-writing-v1"];

const defaultWritingTemplate: WritingTemplateItem[] = initialDraftSections.map(({ id, topic, guide }) => ({ id, topic, guide }));

const defaultNotificationPreferences: NotificationPreferences = {
  webEnabled: true,
  emailEnabled: false,
  reminderDays: [7, 1],
  realtimeProEnabled: false,
};

const initialBilling: BillingPayload = {
  plan: "free",
  credits: 10,
  paidCredits: 0,
  dailyFreeCredits: 10,
  dailyFreeCreditCap: 10,
  dailyFreeCreditAmount: 1,
  dailyCreditGrantedOn: null,
  trialAvailable: true,
  trialEndsAt: null,
  checkoutConfigured: false,
  provider: null,
  readiness: {
    providerConfigured: false,
    checkoutConfigured: false,
    webhookConfigured: false,
    clientKeyConfigured: false,
    secretKeyConfigured: false,
    recurringConfigured: false,
    productsConfigured: true,
    webhookUrl: "https://dangmo.kr/api/billing/webhook",
    successUrl: "https://dangmo.kr/?payment=success",
    failUrl: "https://dangmo.kr/?payment=fail",
    mode: "preparation",
  },
  products: [
    { id: "credit_100", label: "AI 크레딧 100", amount: 15_900, credits: 100, plan: null },
    { id: "credit_300", label: "AI 크레딧 300", amount: 39_900, credits: 300, plan: null },
    { id: "credit_700", label: "AI 크레딧 700", amount: 79_900, credits: 700, plan: null },
    { id: "start_monthly", label: "당모 Start 30일 이용권", amount: 19_900, credits: 120, plan: "start" },
    { id: "pro_monthly", label: "당모 Pro 30일 이용권", amount: 39_900, credits: 360, plan: "pro" },
  ],
  history: [],
  subscription: null,
  accessPass: null,
  refundRequests: [],
};

const formatWon = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;
const ratio = (value: number, total: number) => (total > 0 ? (value / total) * 100 : 0);
const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function writingDocumentHtml(projectTitle: string, sections: DraftSection[]) {
  const title = projectTitle.trim() || "당모 사업계획서 초안";
  const body = sections.map((section, index) => `
    <section>
      <p class="number">${String(index + 1).padStart(2, "0")}</p>
      <h2>${escapeHtml(section.topic || "제목 없음")}</h2>
      ${section.guide ? `<p class="guide">작성 가이드 · ${escapeHtml(section.guide)}</p>` : ""}
      <div class="content">${escapeHtml(section.content || "미작성").replaceAll("\n", "<br>")}</div>
    </section>`).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page{size:A4;margin:22mm}body{font-family:Pretendard,"Noto Sans KR",Arial,sans-serif;color:#102a2d;line-height:1.75}h1{font-size:25px;margin:0 0 8px}header{padding-bottom:18px;border-bottom:2px solid #0f766e;margin-bottom:28px}header p,.guide{color:#607174}section{break-inside:avoid;margin:0 0 26px}h2{font-size:18px;margin:2px 0 8px}.number{color:#0f766e;font-weight:800;margin:0}.guide{font-size:12px;margin:0 0 12px}.content{font-size:14px;white-space:normal}footer{margin-top:40px;color:#7a898b;font-size:11px}</style></head><body><header><h1>${escapeHtml(title)}</h1><p>당모 서류작성 AI에서 내보낸 초안 · ${new Date().toLocaleDateString("ko-KR")}</p></header>${body}<footer>제출 전 공고 원문과 사실·수치를 반드시 최종 확인하세요.</footer></body></html>`;
}
type LegacyBudgetItem = Omit<BudgetItem, "category"> & { category?: string };

const isBudgetItem = (value: unknown): value is LegacyBudgetItem => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<LegacyBudgetItem>;
  return typeof item.id === "string"
    && ["support", "cash", "inkind"].includes(item.source ?? "")
    && (item.category === undefined || typeof item.category === "string")
    && typeof item.name === "string"
    && typeof item.amount === "number";
};

const normalizePracticeBudgetWorkspace = (value: unknown): PracticeBudgetWorkspace | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PracticeBudgetWorkspace>;
  if (typeof candidate.id !== "string"
    || typeof candidate.name !== "string"
    || typeof candidate.createdAt !== "string"
    || typeof candidate.updatedAt !== "string"
    || !Array.isArray(candidate.items)
    || !candidate.items.every(isBudgetItem)) return null;
  const normalizedItems = (candidate.items as LegacyBudgetItem[]).map((item) => item.category === undefined
    ? { ...item, category: item.name, name: "" }
    : { ...item, category: item.category });
  const sums = normalizedItems.reduce<BudgetAllocationTargets>((current, item) => ({
    ...current,
    [item.source]: current[item.source] + item.amount,
  }), emptyBudgetAllocationTargets());
  const storedTargets = candidate.allocationTargets;
  const allocationTargets = storedTargets
    && typeof storedTargets.support === "number"
    && typeof storedTargets.cash === "number"
    && typeof storedTargets.inkind === "number"
    ? storedTargets
    : sums;
  return {
    id: candidate.id,
    name: candidate.name,
    totalBudget: typeof candidate.totalBudget === "number"
      ? candidate.totalBudget
      : allocationTargets.support + allocationTargets.cash + allocationTargets.inkind,
    allocationTargets,
    items: normalizedItems,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };
};
const isDraftSection = (value: unknown): value is DraftSection => {
  if (!value || typeof value !== "object") return false;
  const section = value as Partial<DraftSection>;
  return typeof section.id === "string"
    && typeof section.topic === "string"
    && typeof section.guide === "string"
    && typeof section.content === "string";
};

async function responseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: (T & { error?: string }) | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as T & { error?: string };
    } catch {
      if (!response.ok) {
        const message = response.status === 413
          ? "파일 전송 크기가 너무 큽니다. 조각 업로드로 다시 시도해주세요."
          : text.trim() || "요청을 처리하지 못했습니다.";
        throw new Error(message);
      }
      throw new Error("서버 응답 형식을 확인하지 못했습니다.");
    }
  }
  if (!response.ok) throw new Error(payload?.error ?? "요청을 처리하지 못했습니다.");
  return (payload ?? {} as T) as T;
}

const defaultAnnouncementRequest: AnnouncementFeedRequest = {
  page: 1,
  query: "",
  region: "전체",
  stages: [],
  sort: "latest",
  mode: "all",
  audience: "public",
};

function announcementFeedUrl(request: AnnouncementFeedRequest) {
  const params = new URLSearchParams({
    page: String(request.page),
    pageSize: "50",
    query: request.query,
    region: request.region,
    sort: request.sort,
    mode: request.mode ?? "all",
    audience: request.audience ?? "public",
  });
  request.stages.forEach((stage) => params.append("stage", stage));
  if (request.mode === "recommendations") params.set("minScore", String(MIN_RECOMMENDATION_SCORE));
  return `/api/announcements?${params.toString()}`;
}

export default function Home() {
  const pathname = usePathname();
  const initialRoute = applicationRoute(pathname);
  const [view, setView] = useState<View>(initialRoute.view);
  const [profileTab, setProfileTab] = useState<ProfileTab>(initialRoute.profileTab ?? "business");
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState(["전체"]);
  const [announcementFeed, setAnnouncementFeed] = useState<Announcement[]>(announcements);
  const [recommendedAnnouncementFeed, setRecommendedAnnouncementFeed] = useState<Announcement[]>([]);
  const [recommendationCount, setRecommendationCount] = useState(0);
  const [recommendationPagination, setRecommendationPagination] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 1 });
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const recommendationPageCacheRef = useRef(new Map<number, AnnouncementFeedPayload>());
  const recommendationRequestCacheRef = useRef(new Map<number, Promise<AnnouncementFeedPayload>>());
  const [announcementPagination, setAnnouncementPagination] = useState({ page: 1, pageSize: 50, total: announcements.length, totalPages: 1 });
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const announcementRequestRef = useRef<AnnouncementFeedRequest>(defaultAnnouncementRequest);
  const [announcementSources, setAnnouncementSources] = useState<AnnouncementSourceStatus[]>([]);
  const [, setRecommendationProfileStatus] = useState<"approved" | "basic">("basic");
  const [saved, setSaved] = useState<string[]>([]);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [activeProjectTitle, setActiveProjectTitle] = useState("선택한 공고 없음");
  const [activeBudgetRules, setActiveBudgetRules] = useState<BudgetRules>(defaultBudgetRules);
  const [detail, setDetail] = useState<Announcement | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const announcementDetailCacheRef = useRef(new Map<string, Announcement>());
  const announcementDetailRequestRef = useRef(new Map<string, Promise<Announcement>>());
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [emailProviderConnected, setEmailProviderConnected] = useState(false);
  const [aiCredits, setAiCredits] = useState(3);
  const [isPro, setIsPro] = useState(false);
  const [billing, setBilling] = useState<BillingPayload>(initialBilling);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [practiceBudgetWorkspaces, setPracticeBudgetWorkspaces] = useState<PracticeBudgetWorkspace[]>([]);
  const [practiceBudgetActiveId, setPracticeBudgetActiveId] = useState("");
  const [practiceBudgetStorageReady, setPracticeBudgetStorageReady] = useState(false);
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [documentUploadState, setDocumentUploadState] = useState<DocumentUploadState>({ status: "idle", message: "" });
  const [profileAnalysisRunState, setProfileAnalysisRunState] = useState<ProfileAnalysisRunState>({ status: "idle", message: "" });
  const [profileAnalysisElapsedSeconds, setProfileAnalysisElapsedSeconds] = useState(0);
  const [draftSections, setDraftSections] = useState<DraftSection[]>(initialDraftSections);
  const [draftVersions, setDraftVersions] = useState<DraftRevision[]>([]);
  const [writingAiRun, setWritingAiRun] = useState<{ sectionId: string; operation: AiDraftOperation } | null>(null);
  const [practiceWritingWorkspaces, setPracticeWritingWorkspaces] = useState<PracticeWritingWorkspace[]>([]);
  const [practiceWritingActiveId, setPracticeWritingActiveId] = useState("");
  const [practiceWritingStorageReady, setPracticeWritingStorageReady] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [authProvider, setAuthProvider] = useState<WorkspacePayload["user"]["authProvider"]>("preview");
  const [authProviders, setAuthProviders] = useState<AuthProviderStatus | null>(null);
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus | null>(null);
  const [operations, setOperations] = useState<OperationsPayload | null>(null);
  const [operationsState, setOperationsState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [profileSummary, setProfileSummary] = useState("창업기업이 지원사업을 발견하고 신청을 끝낼 때까지 돕는 AI 공고 비서");
  const [basicProfile, setBasicProfile] = useState<BasicProfileData>({
    summary: "창업기업이 지원사업을 발견하고 신청을 끝낼 때까지 돕는 AI 공고 비서",
    stage: "예비창업",
    startupStatus: "pre",
    establishedAt: null,
    industryCode: "62",
    industryDetailCode: null,
    industry: "컴퓨터 프로그래밍, 시스템 통합 및 관리업",
    region: "서울",
  });
  const [customSources, setCustomSources] = useState<CustomSource[]>([]);
  const [sourceManagerOpen, setSourceManagerOpen] = useState(false);
  const [profileAnalysis, setProfileAnalysis] = useState<BusinessProfileAnalysis | null>(null);
  const [profileReview, setProfileReview] = useState<BusinessProfileReview | null>(null);
  const [profileVersions, setProfileVersions] = useState<ProfileVersionSummary[]>([]);
  const [aiRuntime, setAiRuntime] = useState<AiRuntime>({
    provider: "preview",
    profileModel: "gpt-5.6-luna",
    writingModel: "gpt-5.6-luna",
    dailyTokensUsed: 0,
    dailyTokenLimit: 250_000,
    profileAnalysesToday: 0,
    profileDailyLimit: 5,
  });
  const [workspaceState, setWorkspaceState] = useState<"loading" | "ready" | "auth" | "error">("loading");
  const [activity, setActivity] = useState("");
  const [syncRun, setSyncRun] = useState<AutomationRun | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const route = applicationRoute(pathname);
      setView(route.view);
      if (route.profileTab) setProfileTab(route.profileTab);
      if (route.view !== "budget") setPracticeBudgetActiveId("");
      if (route.view !== "writing") setPracticeWritingActiveId("");
      setActiveProjectId("");
      setNotificationOpen(false);
      setAccountOpen(false);
      setLoginDialogOpen(false);
      setDetail(null);
    });
    return () => { active = false; };
  }, [pathname]);

  const applyAnnouncementFeed = useCallback((feed: AnnouncementFeedPayload) => {
    setAnnouncementFeed(feed.announcements);
    setAnnouncementSources(feed.sources);
    setRecommendationProfileStatus(feed.profileStatus);
    setRecommendationCount(feed.recommendedTotal);
    setAnnouncementPagination(feed.pagination);
  }, []);

  const loadAnnouncementPage = useCallback(async (request: AnnouncementFeedRequest) => {
    announcementRequestRef.current = request;
    setAnnouncementLoading(true);
    try {
      const feed = await responseJson<AnnouncementFeedPayload>(await fetch(announcementFeedUrl(request), {
        headers: { Accept: "application/json" },
      }));
      applyAnnouncementFeed(feed);
    } finally {
      setAnnouncementLoading(false);
    }
  }, [applyAnnouncementFeed]);

  const applyRecommendationFeed = useCallback((feed: AnnouncementFeedPayload) => {
    setRecommendedAnnouncementFeed(feed.announcements);
    setRecommendationPagination(feed.pagination);
    setRecommendationCount(feed.pagination.total);
  }, []);

  const requestRecommendationPage = useCallback((page = 1) => {
    const normalizedPage = Math.max(1, Math.trunc(page));
    const cached = recommendationPageCacheRef.current.get(normalizedPage);
    if (cached) return Promise.resolve(cached);
    const pending = recommendationRequestCacheRef.current.get(normalizedPage);
    if (pending) return pending;
    const request = fetch(announcementFeedUrl({
        page,
        query: "",
        region: "전체",
        stages: [],
        sort: "match",
        mode: "recommendations",
        audience: "personalized",
      }), { headers: { Accept: "application/json" } })
      .then((response) => responseJson<AnnouncementFeedPayload>(response))
      .then((feed) => {
        recommendationPageCacheRef.current.set(normalizedPage, feed);
        return feed;
      })
      .finally(() => recommendationRequestCacheRef.current.delete(normalizedPage));
    recommendationRequestCacheRef.current.set(normalizedPage, request);
    return request;
  }, []);

  const loadRecommendationPage = useCallback(async (page = 1) => {
    const normalizedPage = Math.max(1, Math.trunc(page));
    const cached = recommendationPageCacheRef.current.get(normalizedPage);
    if (cached) {
      applyRecommendationFeed(cached);
      return;
    }
    setRecommendationLoading(true);
    try {
      applyRecommendationFeed(await requestRecommendationPage(normalizedPage));
    } finally {
      setRecommendationLoading(false);
    }
  }, [applyRecommendationFeed, requestRecommendationPage]);

  const invalidateRecommendationCache = useCallback(() => {
    recommendationPageCacheRef.current.clear();
    recommendationRequestCacheRef.current.clear();
  }, []);

  const meta = viewMeta[view];
  const activePracticeBudget = practiceBudgetWorkspaces.find((workspace) => workspace.id === practiceBudgetActiveId) ?? null;
  const activePracticeWriting = practiceWritingWorkspaces.find((workspace) => workspace.id === practiceWritingActiveId) ?? null;
  const guestMode = workspaceState === "auth";
  const syncBusy = syncRun?.status === "queued" || syncRun?.status === "running";
  const hasGuestPractice = guestMode && (practiceBudgetWorkspaces.length > 0 || practiceWritingWorkspaces.length > 0);
  const authProviderLabel = ({ google: "Google", kakao: "카카오", chatgpt: "ChatGPT", preview: "미리보기" } as const)[authProvider];
  const accountDisplayName = workspaceState === "loading"
    ? "계정 불러오는 중"
    : displayName.trim() || (workspaceState === "auth" ? "로그인이 필요해요" : "계정 정보 없음");
  const accountInitial = workspaceState === "loading" ? "…" : displayName.trim().slice(0, 1) || "?";
  const accountMeta = workspaceState === "loading"
    ? "잠시만 기다려주세요"
    : workspaceState === "auth"
      ? "공고 탐색은 로그인 없이 가능해요"
      : `${authProviderLabel} 로그인 · 사업자료 ${documents.length}건`;
  const logoutHref = authProvider === "chatgpt"
    ? "/signout-with-chatgpt?return_to=%2F"
    : "/api/auth/logout";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get("payment");
    if (paymentResult !== "portone-v2-return" && paymentResult !== "fail") return;
    let active = true;
    queueMicrotask(() => { if (active) setView("payment"); });
    const clearPaymentQuery = () => window.history.replaceState({}, "", window.location.pathname + window.location.hash);

    if (paymentResult === "portone-v2-return") {
      const paymentId = params.get("paymentId");
      const code = params.get("code");
      if (!paymentId || code) {
        queueMicrotask(() => { if (active) setActivity(params.get("message") || "결제가 완료되지 않았습니다."); });
        clearPaymentQuery();
        return;
      }
      queueMicrotask(() => { if (active) setActivity("PortOne 결제 승인과 이용권·크레딧 반영을 확인하고 있어요."); });
      void fetch("/api/billing/portone/v2/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      }).then((response) => responseJson<{ completed: boolean; billing: BillingPayload }>(response)).then((payload) => {
        if (!active) return;
        setBilling(payload.billing);
        setAiCredits(payload.billing.credits);
        setIsPro(payload.billing.plan === "pro");
        setActivity("결제가 완료되어 30일 이용권 또는 AI 크레딧이 반영됐습니다.");
      }).catch((error) => {
        if (active) setActivity(error instanceof Error ? error.message : "PortOne 결제를 확인하지 못했습니다.");
      }).finally(clearPaymentQuery);
    } else {
      const orderId = params.get("orderId");
      const code = params.get("code") ?? undefined;
      const message = params.get("message") ?? undefined;
      queueMicrotask(() => { if (active) setActivity(code === "PAY_PROCESS_CANCELED" ? "결제를 취소했습니다." : message || "결제가 완료되지 않았습니다."); });
      if (orderId) {
        void fetch("/api/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "fail-checkout", orderId, code, message }),
        }).then((response) => responseJson<BillingPayload>(response)).then((payload) => { if (active) setBilling(payload); }).catch(() => { /* Failure is already visible to the user. */ });
      }
      clearPaymentQuery();
    }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!syncRun || (syncRun.status !== "queued" && syncRun.status !== "running")) return;
    let active = true;
    const poll = () => {
      void fetch("/api/automation/status", { headers: { Accept: "application/json" } })
        .then((response) => responseJson<AutomationStatus>(response))
        .then((status) => {
          if (!active) return;
          setAutomationStatus(status);
          const nextRun = status.runs.find((run) => run.id === syncRun.id);
          if (nextRun) setSyncRun(nextRun);
        })
        .catch(() => {
          if (active) setActivity("업데이트는 서버에서 계속 진행 중이에요. 잠시 후 상태를 다시 확인할게요.");
        });
    };
    poll();
    const timer = window.setInterval(poll, 1200);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [syncRun?.id, syncRun?.status]);

  useEffect(() => {
    if (!syncRun || (syncRun.status !== "completed" && syncRun.status !== "failed")) return;
    let active = true;
    let closeTimer = 0;
    if (syncRun.status === "failed") {
      queueMicrotask(() => {
        if (active) setActivity(syncRun.progressMessage || syncRun.errorMessage || "공고 업데이트를 완료하지 못했어요.");
      });
      return () => { active = false; };
    }

    void Promise.allSettled([
      fetch(announcementFeedUrl(announcementRequestRef.current), { headers: { Accept: "application/json" } })
        .then((response) => responseJson<AnnouncementFeedPayload>(response)),
      fetch("/api/notifications", { headers: { Accept: "application/json" } })
        .then((response) => responseJson<NotificationPayload>(response)),
      fetch("/api/sources", { headers: { Accept: "application/json" } })
        .then((response) => responseJson<CustomSourcePayload>(response)),
    ]).then(([feedResult, notificationResult, sourceResult]) => {
      if (!active) return;
      if (feedResult.status === "fulfilled") {
        applyAnnouncementFeed(feedResult.value);
      }
      if (notificationResult.status === "fulfilled") {
        setNotifications(notificationResult.value.items);
        setUnreadCount(notificationResult.value.unreadCount);
        setNotificationPreferences(notificationResult.value.preferences);
        setEmailProviderConnected(notificationResult.value.emailProviderConnected);
      }
      if (sourceResult.status === "fulfilled") setCustomSources(sourceResult.value.sources);
      setActivity(syncRun.progressMessage || "전체 공고 업데이트 완료");
      closeTimer = window.setTimeout(() => {
        setSyncRun((current) => current?.id === syncRun.id ? null : current);
      }, 6000);
    });
    return () => {
      active = false;
      if (closeTimer) window.clearTimeout(closeTimer);
    };
  }, [applyAnnouncementFeed, syncRun?.id, syncRun?.status]);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/providers", { headers: { Accept: "application/json" } })
      .then((response) => responseJson<AuthProviderStatus>(response))
      .then((providers) => { if (active) setAuthProviders(providers); })
      .catch(() => { /* Login setup guidance remains visible when status cannot be loaded. */ });
    const feedPromise = fetch(announcementFeedUrl(defaultAnnouncementRequest), { headers: { Accept: "application/json" } })
      .then((response) => responseJson<AnnouncementFeedPayload>(response))
      .catch(() => null);
    void feedPromise.then((feed) => {
        if (!active) return;
        if (feed) applyAnnouncementFeed(feed);
      });
    const loginError = new URLSearchParams(window.location.search).get("auth_error");
    if (loginError) {
      const provider = loginError.startsWith("kakao") ? "카카오" : loginError.startsWith("google") ? "Google" : "SSO";
      queueMicrotask(() => {
        if (active) setActivity(loginError.endsWith("not-configured")
          ? `${provider} 로그인 키 등록이 필요합니다.`
          : `${provider} 로그인을 완료하지 못했습니다.`);
      });
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    }
    fetch("/api/workspace", { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (response.status === 401) {
          if (active) setWorkspaceState("auth");
          return null;
        }
        return responseJson<WorkspacePayload>(response);
      })
      .then(async (workspace) => {
        if (!active || !workspace) return;
        setDisplayName(workspace.user.displayName);
        setIsAdmin(workspace.user.admin);
        setAuthProvider(workspace.user.authProvider);
        setAiCredits(workspace.user.aiCredits);
        setIsPro(workspace.user.plan === "pro");
        setProfileSummary(workspace.profile.summary);
        setBasicProfile({
          summary: workspace.profile.summary,
          stage: workspace.profile.stage,
          startupStatus: workspace.profile.startupStatus,
          establishedAt: workspace.profile.establishedAt,
          industryCode: workspace.profile.industryCode ?? "62",
          industryDetailCode: workspace.profile.industryDetailCode,
          industry: workspace.profile.industry ?? "컴퓨터 프로그래밍, 시스템 통합 및 관리업",
          region: workspace.profile.region ?? "서울",
        });
        setProfileAnalysis(workspace.profile.analysis);
        setProfileReview(workspace.profile.review);
        setProfileVersions(workspace.profile.versions);
        setAiRuntime(workspace.ai);
        setProjects(workspace.projects);
        void feedPromise.then((initialFeed) => {
          if (!active || !initialFeed) return;
          setSaved(initialFeed.announcements
            .filter((announcement) => workspace.projects.some((project) => project.announcementKey === announcement.sourceKey))
            .map((announcement) => announcement.id));
        });
        setActiveProjectId("");
        setActiveProjectTitle("선택한 공고 없음");
        setActiveBudgetRules(defaultBudgetRules);
        setBudgetItems([]);
        setDocuments(workspace.documents);
        setDraftSections(initialDraftSections);
        setDraftVersions([]);
        setWorkspaceState("ready");
        const [notificationResult, billingResult, automationResult, sourceResult] = await Promise.allSettled([
          fetch("/api/notifications", { headers: { Accept: "application/json" } })
            .then((response) => responseJson<NotificationPayload>(response)),
          fetch("/api/billing", { headers: { Accept: "application/json" } })
            .then((response) => responseJson<BillingPayload>(response)),
          fetch("/api/automation/status", { headers: { Accept: "application/json" } })
            .then((response) => responseJson<AutomationStatus>(response)),
          fetch("/api/sources", { headers: { Accept: "application/json" } })
            .then((response) => responseJson<CustomSourcePayload>(response)),
        ]);
        if (!active) return;
        if (notificationResult.status === "fulfilled") {
          setNotifications(notificationResult.value.items);
          setUnreadCount(notificationResult.value.unreadCount);
          setNotificationPreferences(notificationResult.value.preferences);
          setEmailProviderConnected(notificationResult.value.emailProviderConnected);
        }
        if (billingResult.status === "fulfilled") {
          setBilling(billingResult.value);
          setAiCredits(billingResult.value.credits);
          setIsPro(billingResult.value.plan === "pro");
        } else {
          setActivity(billingResult.reason instanceof Error
            ? billingResult.reason.message
            : "결제 설정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        }
        if (automationResult.status === "fulfilled") {
          setAutomationStatus(automationResult.value);
          const activeRun = automationResult.value.runs.find((run) => run.status === "queued" || run.status === "running");
          if (activeRun) setSyncRun(activeRun);
        }
        if (sourceResult.status === "fulfilled") setCustomSources(sourceResult.value.sources);
      })
      .catch(() => {
        if (active) setWorkspaceState("error");
      });
    return () => { active = false; };
  }, [applyAnnouncementFeed]);

  useEffect(() => {
    if (workspaceState === "loading") return;
    if (workspaceState !== "ready") {
      queueMicrotask(() => {
        setPracticeBudgetWorkspaces([]);
        setPracticeBudgetActiveId("");
        setPracticeBudgetStorageReady(true);
      });
      return;
    }
    try {
      const stored = window.localStorage.getItem(PRACTICE_BUDGET_STORAGE_KEY)
        ?? LEGACY_PRACTICE_BUDGET_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
      if (!stored) return;
      const parsed = JSON.parse(stored) as unknown;
      const storedWorkspaces = Array.isArray(parsed)
        ? parsed.map(normalizePracticeBudgetWorkspace)
        : null;
      if (storedWorkspaces && storedWorkspaces.every((workspace) => workspace !== null)) {
        queueMicrotask(() => setPracticeBudgetWorkspaces(storedWorkspaces as PracticeBudgetWorkspace[]));
      } else {
        const storedItems = Array.isArray(parsed)
          ? parsed
          : parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown }).items)
            ? (parsed as { items: unknown[] }).items
            : null;
        if (!storedItems?.every(isBudgetItem)) return;
        const normalizedItems = storedItems.map((item) => item.category === undefined
          ? { ...item, category: item.name, name: "" }
          : { ...item, category: item.category });
        const updatedAt = !Array.isArray(parsed) && parsed && typeof parsed === "object" && typeof (parsed as { updatedAt?: unknown }).updatedAt === "string"
          ? (parsed as { updatedAt: string }).updatedAt
          : new Date().toISOString();
        const sums = normalizedItems.reduce<BudgetAllocationTargets>((current, item) => ({
          ...current,
          [item.source]: current[item.source] + item.amount,
        }), emptyBudgetAllocationTargets());
        queueMicrotask(() => setPracticeBudgetWorkspaces([{
          id: crypto.randomUUID(),
          name: "기존 사업비 연습",
          totalBudget: sums.support + sums.cash + sums.inkind,
          allocationTargets: sums,
          items: normalizedItems,
          createdAt: updatedAt,
          updatedAt,
        }]));
      }
    } catch {
      window.localStorage.removeItem(PRACTICE_BUDGET_STORAGE_KEY);
    } finally {
      LEGACY_PRACTICE_BUDGET_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
      queueMicrotask(() => setPracticeBudgetStorageReady(true));
    }
  }, [workspaceState]);

  useEffect(() => {
    if (view !== "match" || workspaceState !== "ready") return;
    void loadRecommendationPage(1).catch((error) => {
      setActivity(error instanceof Error ? error.message : "맞춤 추천을 불러오지 못했습니다.");
    });
  }, [loadRecommendationPage, view, workspaceState]);

  useEffect(() => {
    if (workspaceState !== "ready") return;
    void requestRecommendationPage(1).catch(() => {
      /* The visible recommendation view reports retryable request failures. */
    });
  }, [requestRecommendationPage, workspaceState]);

  useEffect(() => {
    if (workspaceState !== "ready") return;
    const method = consumeLoginMethod();
    if (method) trackEvent("login", { method });
  }, [workspaceState]);

  useEffect(() => {
    if (workspaceState !== "ready" || !practiceBudgetStorageReady) return;
    window.localStorage.setItem(PRACTICE_BUDGET_STORAGE_KEY, JSON.stringify(practiceBudgetWorkspaces));
  }, [workspaceState, practiceBudgetStorageReady, practiceBudgetWorkspaces]);

  useEffect(() => {
    if (workspaceState === "loading") return;
    if (workspaceState !== "ready") {
      queueMicrotask(() => {
        setPracticeWritingWorkspaces([]);
        setPracticeWritingActiveId("");
        setPracticeWritingStorageReady(true);
      });
      return;
    }
    try {
      const stored = window.localStorage.getItem(PRACTICE_WRITING_STORAGE_KEY)
        ?? LEGACY_PRACTICE_WRITING_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
      if (!stored) return;
      const parsed = JSON.parse(stored) as unknown;
      const storedWorkspaces = Array.isArray(parsed) && parsed.every((workspace) => {
        if (!workspace || typeof workspace !== "object") return false;
        const candidate = workspace as Partial<PracticeWritingWorkspace>;
        return typeof candidate.id === "string"
          && typeof candidate.name === "string"
          && typeof candidate.createdAt === "string"
          && typeof candidate.updatedAt === "string"
          && Array.isArray(candidate.sections)
          && candidate.sections.length > 0
          && candidate.sections.every(isDraftSection);
      }) ? parsed as PracticeWritingWorkspace[] : null;
      if (storedWorkspaces) {
        queueMicrotask(() => setPracticeWritingWorkspaces(storedWorkspaces));
      } else {
        const storedSections = Array.isArray(parsed)
          ? parsed
          : parsed && typeof parsed === "object" && Array.isArray((parsed as { sections?: unknown }).sections)
            ? (parsed as { sections: unknown[] }).sections
            : null;
        if (!storedSections?.length || !storedSections.every(isDraftSection)) return;
        const updatedAt = !Array.isArray(parsed) && parsed && typeof parsed === "object" && typeof (parsed as { updatedAt?: unknown }).updatedAt === "string"
          ? (parsed as { updatedAt: string }).updatedAt
          : new Date().toISOString();
        queueMicrotask(() => setPracticeWritingWorkspaces([{ id: crypto.randomUUID(), name: "기존 서류작성 연습", sections: storedSections, createdAt: updatedAt, updatedAt }]));
      }
    } catch {
      window.localStorage.removeItem(PRACTICE_WRITING_STORAGE_KEY);
    } finally {
      LEGACY_PRACTICE_WRITING_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
      queueMicrotask(() => setPracticeWritingStorageReady(true));
    }
  }, [workspaceState]);

  useEffect(() => {
    if (workspaceState !== "ready" || !practiceWritingStorageReady) return;
    window.localStorage.setItem(PRACTICE_WRITING_STORAGE_KEY, JSON.stringify(practiceWritingWorkspaces));
  }, [workspaceState, practiceWritingStorageReady, practiceWritingWorkspaces]);

  useEffect(() => {
    if (!hasGuestPractice) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "게스트 모드에서는 작성된 내용이 저장되지 않습니다.";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [hasGuestPractice]);

  useEffect(() => {
    if (!activity) return;
    const toastTimer = window.setTimeout(() => {
      setActivity((current) => current === activity ? "" : current);
    }, 5_000);
    return () => window.clearTimeout(toastTimer);
  }, [activity]);

  useEffect(() => {
    if (profileAnalysisRunState.status !== "running") return;
    const timer = window.setInterval(() => setProfileAnalysisElapsedSeconds((seconds) => seconds + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [profileAnalysisRunState.status]);

  useEffect(() => {
    if (!detail) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetail(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detail]);

  useEffect(() => {
    if (!loginDialogOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLoginDialogOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [loginDialogOpen]);

  const runActivity = async (label: string, action: () => Promise<void>) => {
    setActivity(`${label} 중…`);
    try {
      await action();
      setActivity(`${label} 완료`);
    } catch (error) {
      setActivity(error instanceof Error ? error.message : `${label} 실패`);
    }
  };

  const openLoginDialog = () => {
    trackEvent("login_prompt_open", { view_name: view });
    setLoginDialogOpen(true);
    setAccountOpen(false);
    setNotificationOpen(false);
  };

  const navigate = (nextView: View, nextProfileTab?: ProfileTab) => {
    const resolvedProfileTab = nextProfileTab ?? profileTab;
    const targetPath = nextView === "profile"
      ? profileAnalyticsMeta[resolvedProfileTab].path
      : viewAnalyticsMeta[nextView].path;
    const changed = nextView !== view || (nextView === "profile" && resolvedProfileTab !== profileTab);
    if (changed) {
      const analyticsMeta = nextView === "profile"
        ? profileAnalyticsMeta[resolvedProfileTab]
        : { ...viewAnalyticsMeta[nextView], title: viewMeta[nextView].title };
      trackPageView(analyticsMeta.path, `${analyticsMeta.title} | 당모`, analyticsMeta.menuName);
    }
    trackEvent("view_change", { view_name: nextView, profile_tab: nextProfileTab });
    if (nextView !== "budget") setPracticeBudgetActiveId("");
    if (nextView !== "writing") setPracticeWritingActiveId("");
    setActiveProjectId("");
    setView(nextView);
    if (nextProfileTab) setProfileTab(nextProfileTab);
    if (pathname !== targetPath) window.history.pushState({}, "", targetPath);
    setNotificationOpen(false);
    setAccountOpen(false);
    setLoginDialogOpen(false);
    setDetail(null);
  };

  const loadAnnouncementDetail = useCallback(async (announcement: Announcement) => {
    if (announcement.eligibility && announcement.benefits && announcement.requiredDocuments) return announcement;
    const cached = announcementDetailCacheRef.current.get(announcement.id);
    if (cached) return cached;
    const pending = announcementDetailRequestRef.current.get(announcement.id);
    if (pending) return pending;
    const request = fetch(`/api/announcements/${encodeURIComponent(announcement.id)}`, {
      headers: { Accept: "application/json" },
    })
      .then((response) => responseJson<{ announcement: Announcement }>(response))
      .then((payload) => {
        announcementDetailCacheRef.current.set(announcement.id, payload.announcement);
        return payload.announcement;
      })
      .finally(() => announcementDetailRequestRef.current.delete(announcement.id));
    announcementDetailRequestRef.current.set(announcement.id, request);
    return request;
  }, []);

  const openAnnouncementDetail = (announcement: Announcement) => {
    trackEvent("view_announcement", {
      announcement_id: announcement.sourceKey,
      source: announcement.sourceLabel,
      category: announcement.category,
      region: announcement.region,
    });
    const cached = announcementDetailCacheRef.current.get(announcement.id);
    setDetail(cached ?? announcement);
    setDetailLoading(!cached && !(announcement.eligibility && announcement.benefits && announcement.requiredDocuments));
    void loadAnnouncementDetail(announcement)
      .then((fullAnnouncement) => {
        setDetail((current) => current?.id === announcement.id ? fullAnnouncement : current);
      })
      .catch((error: unknown) => {
        setActivity(error instanceof Error ? error.message : "공고 상세 정보를 불러오지 못했습니다.");
      })
      .finally(() => setDetailLoading(false));
  };

  const closeAnnouncementDetail = () => {
    setDetail(null);
    setDetailLoading(false);
  };

  const toggleFilter = (filter: string) => {
    if (filter === "전체") {
      setActiveFilters(["전체"]);
      return;
    }
    setActiveFilters((current) => {
      const next = current.filter((item) => item !== "전체");
      const toggled = next.includes(filter)
        ? next.filter((item) => item !== filter)
        : [...next, filter];
      return toggled.length ? toggled : ["전체"];
    });
  };

  const announcementSnapshot = (announcement: Announcement) => ({
    sourceKey: announcement.sourceKey,
    title: announcement.title,
    institution: announcement.institution,
    sourceUrl: announcement.sourceUrl,
    sourceLabel: announcement.sourceLabel,
    support: announcement.support,
    applyEndAt: announcement.applyEndAt,
    dday: announcement.dday,
    category: announcement.category,
    region: announcement.region,
    overview: announcement.overview,
    deadline: announcement.deadline,
    eligibility: announcement.eligibility ?? [],
    benefits: announcement.benefits ?? [],
    requiredDocuments: announcement.requiredDocuments ?? [],
    programPeriod: announcement.programPeriod ?? "공고 원문 확인",
    applicationMethod: announcement.applicationMethod ?? "공고 원문 확인",
    contact: announcement.contact ?? announcement.institution,
    publishedAt: announcement.publishedAt,
    tags: announcement.tags ?? [announcement.category],
    checklistTemplate: announcement.checklistTemplate ?? defaultChecklistTemplate,
    budgetRules: announcement.budgetRules ?? defaultBudgetRules,
    writingTemplate: announcement.writingTemplate ?? defaultWritingTemplate,
  });

  const upsertProject = (project: SavedProject) => {
    setProjects((current) => current.some((item) => item.id === project.id)
      ? current.map((item) => item.id === project.id ? project : item)
      : [...current, project]);
  };

  const saveAnnouncement = async (announcement: Announcement, mode: "saved" | "preparing") => {
    const fullAnnouncement = await loadAnnouncementDetail(announcement);
    const payload = await responseJson<{ project: SavedProject }>(await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcement: announcementSnapshot(fullAnnouncement), mode }),
    }));
    upsertProject(payload.project);
    setSaved((current) => current.includes(announcement.id) ? current : [...current, announcement.id]);
    return payload.project;
  };

  const toggleSaved = async (id: string) => {
    const announcement = announcementFeed.find((item) => item.id === id)
      ?? recommendedAnnouncementFeed.find((item) => item.id === id);
    if (!announcement) return;
    const existingProject = projects.find((item) => item.announcementKey === announcement.sourceKey);
    const alreadySaved = saved.includes(id) || Boolean(existingProject);
    await runActivity(alreadySaved ? "저장 공고 삭제" : "공고 저장", async () => {
      if (!alreadySaved) {
        await saveAnnouncement(announcement, "saved");
        trackEvent("save_announcement", {
          announcement_id: announcement.sourceKey,
          source: announcement.sourceLabel,
          category: announcement.category,
        });
        return;
      }
      if (!existingProject) return;
      await responseJson(await fetch(`/api/projects?projectId=${encodeURIComponent(existingProject.id)}`, { method: "DELETE" }));
      setProjects((current) => current.filter((item) => item.id !== existingProject.id));
      setSaved((current) => current.filter((item) => item !== id));
      trackEvent("remove_saved_announcement", { announcement_id: announcement.sourceKey });
    });
  };

  const startProject = async (announcement: Announcement) => {
    await runActivity("사업 준비 시작", async () => {
      const project = await saveAnnouncement(announcement, "preparing");
      setActiveProjectId(project.id);
      setActiveProjectTitle(project.title);
      setActiveBudgetRules(project.budgetRules);
      trackEvent("start_preparation", {
        announcement_id: announcement.sourceKey,
        source: announcement.sourceLabel,
        category: announcement.category,
      });
      navigate("projects");
    });
  };

  const updateChecklist = async (projectId: string, key: keyof ProjectChecklist) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    const checklist = { ...project.checklist, [key]: !project.checklist[key] };
    await runActivity("준비 현황 저장", async () => {
      const payload = await responseJson<{ project: SavedProject }>(await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, checklist }),
      }));
      upsertProject(payload.project);
    });
  };

  const openProjectWorkspace = async (project: SavedProject, nextView: "budget" | "writing") => {
    await runActivity("사업 작업공간 불러오기", async () => {
      const workspace = await responseJson<WorkspacePayload>(
        await fetch(`/api/workspace?projectId=${encodeURIComponent(project.id)}`, { headers: { Accept: "application/json" } }),
      );
      navigate(nextView);
      setActiveProjectId(project.id);
      setActiveProjectTitle(project.title);
      setActiveBudgetRules(project.budgetRules);
      setBudgetItems(workspace.budgetItems);
      setDraftSections(workspace.draftSections);
      setDraftVersions(workspace.draftVersions);
      setProjects(workspace.projects);
    });
  };

  const closeProjectWorkspace = () => {
    setActiveProjectId("");
    setActiveProjectTitle("선택한 공고 없음");
    setActiveBudgetRules(defaultBudgetRules);
    setBudgetItems([]);
    setDraftSections(initialDraftSections);
    setDraftVersions([]);
  };

  const syncAnnouncements = async () => {
    if (workspaceState !== "ready") {
      openLoginDialog();
      return;
    }
    if (syncBusy) {
      setActivity("이미 전체 공고 업데이트가 진행 중이에요.");
      return;
    }
    try {
      const payload = await responseJson<{
        runId: string;
        execute: boolean;
        alreadyRunning: boolean;
        run: AutomationRun;
      }>(await fetch("/api/automation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "manual" }),
      }));
      setSyncRun(payload.run);
      setActivity(payload.alreadyRunning
        ? "진행 중인 업데이트 상태를 이어서 보여드릴게요."
        : "전체 공고 업데이트를 시작했어요.");
      trackEvent("announcement_sync_started", { run_id: payload.runId });
    } catch (error) {
      setActivity(error instanceof Error ? error.message : "전체 공고 업데이트를 시작하지 못했어요.");
    }
  };

  const saveBasicProfile = async (next: BasicProfileData) => {
    await runActivity("기본 프로필 저장", async () => {
      const payload = await responseJson<{ profile: BasicProfileData; feed: AnnouncementFeedPayload | null }>(await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "profile",
          startupStatus: next.startupStatus,
          establishedAt: next.startupStatus === "registered" ? next.establishedAt : null,
          industryCode: next.industryCode,
          industryDetailCode: next.industryDetailCode,
          region: next.region,
        }),
      }));
      setBasicProfile(payload.profile);
      if (payload.feed) applyAnnouncementFeed(payload.feed);
    });
  };

  const applyCustomSourcePayload = (payload: CustomSourcePayload) => {
    setCustomSources(payload.sources);
    if (payload.feed) applyAnnouncementFeed(payload.feed);
  };

  const addCustomSourceAction = async (input: { name: string; listingUrl: string; confirmed: boolean }) => {
    let succeeded = false;
    await runActivity("공고 출처 연결", async () => {
      const payload = await responseJson<CustomSourcePayload>(await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }));
      applyCustomSourcePayload(payload);
      succeeded = true;
    });
    return succeeded;
  };

  const updateCustomSourceAction = async (sourceId: string, action: "sync" | "pause" | "resume") => {
    await runActivity(action === "sync" ? "공고 출처 확인" : "공고 출처 설정", async () => {
      const payload = await responseJson<CustomSourcePayload>(await fetch("/api/sources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, action }),
      }));
      applyCustomSourcePayload(payload);
    });
  };

  const removeCustomSourceAction = async (sourceId: string) => {
    await runActivity("공고 출처 삭제", async () => {
      const payload = await responseJson<CustomSourcePayload>(await fetch(`/api/sources?sourceId=${encodeURIComponent(sourceId)}`, { method: "DELETE" }));
      setCustomSources(payload.sources);
    });
  };

  const addBudgetItem = (source: BudgetSource) => {
    setBudgetItems((current) => [
      ...current,
      { id: crypto.randomUUID(), source, category: "새 비목", name: "", amount: 0 },
    ]);
  };

  const updateBudgetItem = (id: string, patch: Partial<BudgetItem>) => {
    setBudgetItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const removeBudgetItem = (id: string) => {
    setBudgetItems((current) => current.filter((item) => item.id !== id));
  };

  const startPracticeBudget = (name: string) => {
    const now = new Date().toISOString();
    const workspace: PracticeBudgetWorkspace = {
      id: crypto.randomUUID(),
      name: name.trim() || `사업비 연습 ${practiceBudgetWorkspaces.length + 1}`,
      totalBudget: 0,
      allocationTargets: emptyBudgetAllocationTargets(),
      items: practiceBudgetPreset(),
      createdAt: now,
      updatedAt: now,
    };
    setPracticeBudgetWorkspaces((current) => [...current, workspace]);
    setPracticeBudgetActiveId(workspace.id);
    trackEvent("budget_created", { mode: guestMode ? "guest_practice" : "practice" });
    if (guestMode) setActivity("게스트 모드에서는 작성 내용이 저장되지 않으며, 사이트를 나가면 삭제됩니다.");
  };

  const closePracticeBudget = () => {
    setPracticeBudgetActiveId("");
    if (guestMode) setActivity("게스트 모드에서는 작성된 내용이 저장되지 않습니다. 로그인하면 계속 보관할 수 있어요.");
  };

  const resetPracticeBudget = () => {
    if (!practiceBudgetActiveId) return;
    const updatedAt = new Date().toISOString();
    setPracticeBudgetWorkspaces((current) => current.map((workspace) => workspace.id === practiceBudgetActiveId
      ? { ...workspace, totalBudget: 0, allocationTargets: emptyBudgetAllocationTargets(), items: practiceBudgetPreset(), updatedAt }
      : workspace));
    setActivity("연습용 프리셋을 다시 불러왔습니다.");
  };

  const renamePracticeBudget = (workspaceId: string, name: string) => {
    const nextName = name.trim();
    if (!nextName) return;
    setPracticeBudgetWorkspaces((current) => current.map((workspace) => workspace.id === workspaceId
      ? { ...workspace, name: nextName, updatedAt: new Date().toISOString() }
      : workspace));
    setActivity("연습 카드 이름을 변경했습니다.");
  };

  const clearPracticeBudget = (workspaceId = practiceBudgetActiveId) => {
    const target = practiceBudgetWorkspaces.find((workspace) => workspace.id === workspaceId);
    if (!target || !window.confirm(`\"${target.name}\" 연습 카드와 입력한 세목을 모두 삭제할까요?`)) return;
    setPracticeBudgetWorkspaces((current) => current.filter((workspace) => workspace.id !== workspaceId));
    if (practiceBudgetActiveId === workspaceId) setPracticeBudgetActiveId("");
    setActivity("연습용 편성안을 삭제했습니다.");
  };

  const addPracticeBudgetItem = (source: BudgetSource) => {
    if (!practiceBudgetActiveId) return;
    const updatedAt = new Date().toISOString();
    setPracticeBudgetWorkspaces((current) => current.map((workspace) => workspace.id === practiceBudgetActiveId
      ? { ...workspace, items: [...workspace.items, { id: crypto.randomUUID(), source, category: "새 비목", name: "", amount: 0 }], updatedAt }
      : workspace));
  };

  const updatePracticeBudgetItem = (id: string, patch: Partial<BudgetItem>) => {
    if (!practiceBudgetActiveId) return;
    const updatedAt = new Date().toISOString();
    setPracticeBudgetWorkspaces((current) => current.map((workspace) => workspace.id === practiceBudgetActiveId
      ? { ...workspace, items: workspace.items.map((item) => item.id === id ? { ...item, ...patch } : item), updatedAt }
      : workspace));
  };

  const updatePracticeBudgetTargets = (patch: { totalBudget?: number; allocationTargets?: Partial<BudgetAllocationTargets> }) => {
    if (!practiceBudgetActiveId) return;
    const updatedAt = new Date().toISOString();
    setPracticeBudgetWorkspaces((current) => current.map((workspace) => workspace.id === practiceBudgetActiveId
      ? {
        ...workspace,
        totalBudget: patch.totalBudget ?? workspace.totalBudget,
        allocationTargets: { ...workspace.allocationTargets, ...patch.allocationTargets },
        updatedAt,
      }
      : workspace));
  };

  const removePracticeBudgetItem = (id: string) => {
    if (!practiceBudgetActiveId) return;
    const updatedAt = new Date().toISOString();
    setPracticeBudgetWorkspaces((current) => current.map((workspace) => workspace.id === practiceBudgetActiveId
      ? { ...workspace, items: workspace.items.filter((item) => item.id !== id), updatedAt }
      : workspace));
  };

  const saveBudgetItems = () => runActivity("사업비 저장", async () => {
    await responseJson(await fetch("/api/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Dangmo-Project-Id": activeProjectId },
      body: JSON.stringify({ kind: "budget", items: budgetItems }),
    }));
    trackEvent("budget_saved", {
      item_count: budgetItems.length,
      total_amount: budgetItems.reduce((sum, item) => sum + item.amount, 0),
    });
  });

  const saveDraftContent = () => runActivity("서류 초안 저장", async () => {
    const payload = await responseJson<{ revision: DraftRevision }>(await fetch("/api/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Dangmo-Project-Id": activeProjectId },
      body: JSON.stringify({ kind: "drafts", sections: draftSections }),
    }));
    setDraftVersions((current) => [payload.revision, ...current].slice(0, 10));
    trackEvent("document_draft_saved", { section_count: draftSections.length });
  });

  const restoreDraft = (revisionId: string) => runActivity("초안 버전 복원", async () => {
    const payload = await responseJson<{ sections: DraftSection[]; revision: DraftRevision }>(await fetch("/api/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Dangmo-Project-Id": activeProjectId },
      body: JSON.stringify({ kind: "draft-restore", revisionId }),
    }));
    setDraftSections(payload.sections);
    setDraftVersions((current) => [payload.revision, ...current].slice(0, 10));
  });

  const updateDraftSection = (id: string, patch: Partial<DraftSection>) => {
    setDraftSections((current) => current.map((section) => section.id === id ? { ...section, ...patch } : section));
  };

  const addDraftSection = () => {
    setDraftSections((current) => [...current, {
      id: crypto.randomUUID(),
      topic: "새 대주제",
      guide: "이 항목에서 평가자가 확인해야 할 내용을 적어주세요.",
      content: "",
    }]);
  };

  const removeDraftSection = (id: string) => {
    setDraftSections((current) => current.length > 1 ? current.filter((section) => section.id !== id) : current);
  };

  const startPracticeWriting = (name: string) => {
    const now = new Date().toISOString();
    const workspace: PracticeWritingWorkspace = {
      id: crypto.randomUUID(),
      name: name.trim() || `서류작성 연습 ${practiceWritingWorkspaces.length + 1}`,
      sections: practiceWritingPreset(),
      createdAt: now,
      updatedAt: now,
    };
    setPracticeWritingWorkspaces((current) => [...current, workspace]);
    setPracticeWritingActiveId(workspace.id);
    trackEvent("document_workspace_created", { mode: guestMode ? "guest_practice" : "practice" });
    if (guestMode) setActivity("게스트 모드에서는 작성 내용이 저장되지 않으며, 사이트를 나가면 삭제됩니다.");
  };

  const closePracticeWriting = () => {
    setPracticeWritingActiveId("");
    if (guestMode) setActivity("게스트 모드에서는 작성된 내용이 저장되지 않습니다. 로그인하면 계속 보관할 수 있어요.");
  };

  const resetPracticeWriting = () => {
    if (!window.confirm("작성한 연습 내용을 지우고 기본 대주제를 다시 불러올까요?")) return;
    if (!practiceWritingActiveId) return;
    const updatedAt = new Date().toISOString();
    setPracticeWritingWorkspaces((current) => current.map((workspace) => workspace.id === practiceWritingActiveId
      ? { ...workspace, sections: practiceWritingPreset(), updatedAt }
      : workspace));
    setActivity("서류작성 연습 프리셋을 다시 불러왔습니다.");
  };

  const renamePracticeWriting = (workspaceId: string, name: string) => {
    const nextName = name.trim();
    if (!nextName) return;
    setPracticeWritingWorkspaces((current) => current.map((workspace) => workspace.id === workspaceId
      ? { ...workspace, name: nextName, updatedAt: new Date().toISOString() }
      : workspace));
    setActivity("연습 카드 이름을 변경했습니다.");
  };

  const clearPracticeWriting = (workspaceId = practiceWritingActiveId) => {
    const target = practiceWritingWorkspaces.find((workspace) => workspace.id === workspaceId);
    if (!target || !window.confirm(`\"${target.name}\" 연습 카드와 입력한 내용을 모두 삭제할까요?`)) return;
    setPracticeWritingWorkspaces((current) => current.filter((workspace) => workspace.id !== workspaceId));
    if (practiceWritingActiveId === workspaceId) setPracticeWritingActiveId("");
    setActivity("연습용 서류 초안을 삭제했습니다.");
  };

  const updatePracticeWritingSection = (id: string, patch: Partial<DraftSection>) => {
    if (!practiceWritingActiveId) return;
    const updatedAt = new Date().toISOString();
    setPracticeWritingWorkspaces((current) => current.map((workspace) => workspace.id === practiceWritingActiveId
      ? { ...workspace, sections: workspace.sections.map((section) => section.id === id ? { ...section, ...patch } : section), updatedAt }
      : workspace));
  };

  const addPracticeWritingSection = () => {
    if (!practiceWritingActiveId) return;
    const updatedAt = new Date().toISOString();
    setPracticeWritingWorkspaces((current) => current.map((workspace) => workspace.id === practiceWritingActiveId
      ? { ...workspace, sections: [...workspace.sections, { id: crypto.randomUUID(), topic: "새 대주제", guide: "이 항목에서 설명할 핵심 내용을 자유롭게 정리해보세요.", content: "" }], updatedAt }
      : workspace));
  };

  const removePracticeWritingSection = (id: string) => {
    if (!practiceWritingActiveId) return;
    const updatedAt = new Date().toISOString();
    setPracticeWritingWorkspaces((current) => current.map((workspace) => workspace.id === practiceWritingActiveId && workspace.sections.length > 1
      ? { ...workspace, sections: workspace.sections.filter((section) => section.id !== id), updatedAt }
      : workspace));
  };

  const addDocuments = async (files: FileList | null) => {
    const selectedFiles = files ? Array.from(files) : [];
    if (!selectedFiles.length) return;
    const maximumBytes = 30 * 1024 * 1024;
    const allowedExtensions = new Set(["pdf", "ppt", "pptx", "doc", "docx", "rtf", "odt", "xls", "xlsx", "csv", "tsv", "txt", "md"]);
    const invalidFile = selectedFiles.find((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      return !allowedExtensions.has(extension) || file.size > maximumBytes || file.size === 0;
    });
    const validationMessage = selectedFiles.length > 5
      ? "한 번에 최대 5개까지 추가할 수 있습니다."
      : invalidFile
        ? `${invalidFile.name}: 지원 형식, 빈 파일 여부와 30MB 제한을 확인해주세요.`
        : "";
    if (validationMessage) {
      setDocumentUploadState({ status: "error", message: validationMessage });
      setActivity(validationMessage);
      return;
    }

    setDocumentUploadState({ status: "uploading", message: `${selectedFiles.length}개 자료를 나누어 안전하게 업로드하고 있어요.` });
    setActivity("사업자료 업로드 중…");
    try {
      const uploadedDocuments: BusinessDocument[] = [];
      for (let fileIndex = 0; fileIndex < selectedFiles.length; fileIndex += 1) {
        const file = selectedFiles[fileIndex];
        const session = await responseJson<{ documentId: string; uploadId: string; chunkSize: number }>(
          await fetch("/api/documents/chunks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
          }),
        );
        const chunkCount = Math.ceil(file.size / session.chunkSize);
        try {
          for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
            const start = chunkIndex * session.chunkSize;
            const chunk = file.slice(start, Math.min(start + session.chunkSize, file.size));
            const overallPercent = Math.round(((fileIndex + ((chunkIndex + 1) / chunkCount)) / selectedFiles.length) * 100);
            setDocumentUploadState({ status: "uploading", message: `${file.name} 업로드 중 · ${overallPercent}%` });
            await responseJson(
              await fetch(`/api/documents/chunks?uploadId=${encodeURIComponent(session.uploadId)}&chunkIndex=${chunkIndex}`, {
                method: "PUT",
                headers: { "Content-Type": "application/octet-stream" },
                body: chunk,
              }),
            );
          }
          const completed = await responseJson<{ document: BusinessDocument }>(
            await fetch("/api/documents/chunks", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                documentId: session.documentId,
                uploadId: session.uploadId,
                name: file.name,
                type: file.type,
                size: file.size,
                chunkCount,
              }),
            }),
          );
          uploadedDocuments.push(completed.document);
        } catch (error) {
          await fetch(`/api/documents/chunks?uploadId=${encodeURIComponent(session.uploadId)}&chunkCount=${chunkCount}`, { method: "DELETE" }).catch(() => undefined);
          throw error;
        }
      }
      setDocuments((current) => [...uploadedDocuments, ...current]);
      setProfileAnalysisRunState({ status: "idle", message: "" });
      setProfileAnalysisElapsedSeconds(0);
      const message = `${uploadedDocuments.length}개 자료를 추가했습니다. 전체 자료 분석을 실행할 수 있어요.`;
      setDocumentUploadState({ status: "success", message });
      setActivity("사업자료 업로드 완료");
    } catch (error) {
      const message = error instanceof Error ? error.message : "사업자료를 업로드하지 못했습니다.";
      setDocumentUploadState({ status: "error", message });
      setActivity(message);
    }
  };

  const removeDocument = async (id: string) => {
    await runActivity("사업자료 삭제", async () => {
      await responseJson(await fetch(`/api/documents/${encodeURIComponent(id)}`, { method: "DELETE" }));
      setDocuments((current) => current.filter((document) => document.id !== id));
      setProfileAnalysisRunState({ status: "idle", message: "" });
      setProfileAnalysisElapsedSeconds(0);
    });
  };

  const analyzeProfile = async () => {
    if (profileAnalysisRunState.status === "running") return;
    setProfileAnalysisElapsedSeconds(0);
    setProfileAnalysisRunState({ status: "running", message: "업로드된 사업자료를 OpenAI에 전달하고 내용을 분석하고 있어요." });
    setActivity("AI 사업 프로필 분석 시작");
    try {
      const payload = await responseJson<{ summary: string; analysis: BusinessProfileAnalysis; review: BusinessProfileReview }>(
        await fetch("/api/ai/profile", { method: "POST" }),
      );
      setProfileReview(payload.review);
      setProfileVersions((current) => [
        {
          id: payload.review.id,
          version: payload.review.version,
          status: payload.review.status,
          summary: payload.review.analysis.summary,
          elevatorPitch: payload.review.analysis.elevatorPitch,
          keywords: payload.review.analysis.keywords.slice(0, 5),
          sourceDocumentIds: payload.review.sourceDocumentIds,
          active: false,
          createdAt: payload.review.createdAt,
          approvedAt: payload.review.approvedAt,
        },
        ...current.filter((version) => version.status !== "draft" && version.id !== payload.review.id),
      ].slice(0, 20));
      if (payload.analysis.meta.provider === "openai") {
        setAiRuntime((current) => ({
          ...current,
          profileAnalysesToday: current.profileAnalysesToday + 1,
        }));
      }
      setDocuments((current) => current.map((document) => ({ ...document, status: "analyzed", meta: document.meta.replace("업로드 완료", "AI 분석 완료") })));
      setProfileAnalysisRunState({ status: "success", message: `AI 분석이 완료되어 v${payload.review.version} 검토본을 만들었습니다.` });
      setActivity("AI 사업 프로필 분석 완료");
      trackEvent("ai_profile_analyzed", {
        provider: payload.analysis.meta.provider,
        profile_version: payload.review.version,
        document_count: payload.review.sourceDocumentIds.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "사업자료를 분석하지 못했습니다.";
      setProfileAnalysisRunState({ status: "error", message });
      setActivity(message);
    }
  };

  const updateProfileReviewAnalysis = (patch: Partial<BusinessProfileAnalysis>) => {
    setProfileReview((current) => current
      ? { ...current, analysis: { ...current.analysis, ...patch } }
      : current);
  };

  const persistProfileReview = async (approve: boolean) => {
    if (!profileReview) return;
    await runActivity(approve ? "AI 사업 프로필 승인" : "검토 내용 저장", async () => {
      const payload = await responseJson<{
        summary: string;
        analysis: BusinessProfileAnalysis | null;
        review: BusinessProfileReview;
        card: ProfileVersionSummary | null;
        approved: boolean;
      }>(await fetch("/api/profile/review", {
        method: approve ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: profileReview.id,
          analysis: profileReview.analysis,
        }),
      }));
      setProfileReview(payload.approved ? null : payload.review);
      if (!payload.approved) {
        setProfileVersions((current) => current.map((version) => version.id === payload.review.id
          ? {
              ...version,
              summary: payload.review.analysis.summary,
              elevatorPitch: payload.review.analysis.elevatorPitch,
              keywords: payload.review.analysis.keywords.slice(0, 5),
            }
          : version));
      }
      if (payload.approved && payload.analysis) {
        invalidateRecommendationCache();
        if (payload.card) {
          setProfileVersions((current) => [
            payload.card!,
            ...current.filter((version) => version.id !== payload.card!.id)
              .map((version) => ({ ...version, active: false })),
          ].slice(0, 20));
        }
        setProfileAnalysis(payload.analysis);
        setProfileSummary(payload.summary);
        const feed = await responseJson<AnnouncementFeedPayload>(
          await fetch(announcementFeedUrl(defaultAnnouncementRequest), { headers: { Accept: "application/json" } }),
        );
        applyAnnouncementFeed(feed);
      }
    });
  };

  const cancelProfileReview = async () => {
    if (!profileReview) return;
    if (!window.confirm("새 AI 프로필 검토를 취소할까요? 분석 결과 카드는 삭제되지만 업로드한 원본 자료는 유지됩니다.")) return;
    await runActivity("AI 프로필 검토 취소", async () => {
      const payload = await responseJson<{ cancelledVersionId: string }>(await fetch("/api/profile/review", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: profileReview.id }),
      }));
      setProfileReview(null);
      setProfileVersions((current) => current.filter((version) => version.id !== payload.cancelledVersionId));
      setProfileAnalysisRunState({ status: "idle", message: "" });
      setProfileAnalysisElapsedSeconds(0);
    });
  };

  const selectProfileVersion = async (versionId: string) => {
    const selected = profileVersions.find((version) => version.id === versionId);
    if (!selected || selected.active) return;
    await runActivity("추천 프로필 변경", async () => {
      const payload = await responseJson<{
        activeVersionId: string;
        summary: string;
        analysis: BusinessProfileAnalysis;
      }>(await fetch("/api/profile/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      }));
      setProfileVersions((current) => current.map((version) => ({
        ...version,
        active: version.id === payload.activeVersionId,
      })));
      setProfileAnalysis(payload.analysis);
      setProfileSummary(payload.summary);
      invalidateRecommendationCache();
      const feed = await responseJson<AnnouncementFeedPayload>(
        await fetch(announcementFeedUrl(defaultAnnouncementRequest), { headers: { Accept: "application/json" } }),
      );
      applyAnnouncementFeed(feed);
    });
  };

  const deleteProfileVersion = async (versionId: string) => {
    const selected = profileVersions.find((version) => version.id === versionId);
    if (!selected || selected.status === "draft") return;
    const message = selected.active
      ? "현재 추천에 사용 중인 프로필을 삭제할까요? 남은 프로필이 있으면 최신 카드로 자동 전환됩니다."
      : "이 AI 사업 프로필 카드를 삭제할까요? 삭제한 분석 결과는 복구할 수 없습니다.";
    if (!window.confirm(message)) return;
    await runActivity("AI 사업 프로필 삭제", async () => {
      const payload = await responseJson<{
        deletedVersionId: string;
        activeChanged: boolean;
        activeVersionId: string | null;
        summary: string;
        analysis: BusinessProfileAnalysis | null;
      }>(await fetch("/api/profile/active", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      }));
      setProfileVersions((current) => current
        .filter((version) => version.id !== payload.deletedVersionId)
        .map((version) => ({ ...version, active: version.id === payload.activeVersionId })));
      if (payload.activeChanged) {
        invalidateRecommendationCache();
        setProfileAnalysis(payload.analysis);
        setProfileSummary(payload.summary);
        const feed = await responseJson<AnnouncementFeedPayload>(
          await fetch(announcementFeedUrl(defaultAnnouncementRequest), { headers: { Accept: "application/json" } }),
        );
        applyAnnouncementFeed(feed);
      }
    });
  };

  const runWritingAi = async (sectionId: string, operation: AiDraftOperation) => {
    if (writingAiRun) return;
    setWritingAiRun({ sectionId, operation });
    try {
      await runActivity("AI 초안 작업", async () => {
        const section = draftSections.find((item) => item.id === sectionId);
        if (!section) throw new Error("작성 카드를 찾을 수 없습니다.");
        const response = await fetch("/api/ai/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Dangmo-Project-Id": activeProjectId },
          body: JSON.stringify({ operation, section }),
        });
        if (response.status === 402) {
          navigate("plan");
          throw new Error("AI 크레딧이 부족해 충전 화면으로 이동했습니다.");
        }
        const payload = await responseJson<{ content: string; credits: number; sectionId: string; revision: DraftRevision }>(response);
        updateDraftSection(payload.sectionId, { content: payload.content });
        setAiCredits(payload.credits);
        setBilling((current) => ({ ...current, credits: payload.credits }));
        setDraftVersions((current) => [payload.revision, ...current].slice(0, 10));
        trackEvent("document_draft_generated", { operation });
      });
    } finally {
      setWritingAiRun(null);
    }
  };

  const applyNotificationPayload = (payload: NotificationPayload) => {
    setNotifications(payload.items);
    setUnreadCount(payload.unreadCount);
    setNotificationPreferences(payload.preferences);
    setEmailProviderConnected(payload.emailProviderConnected);
  };

  const markAllNotifications = () => runActivity("알림 모두 읽음", async () => {
    const payload = await responseJson<NotificationPayload>(await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read-all" }),
    }));
    applyNotificationPayload(payload);
  });

  const openNotification = (notification: NotificationItem) => runActivity("알림 확인", async () => {
    const payload = await responseJson<NotificationPayload>(await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", notificationId: notification.id }),
    }));
    applyNotificationPayload(payload);
    const nextView = (["explore", "match", "projects", "budget", "writing"] as View[])
      .includes(notification.targetView as View)
      ? notification.targetView as View
      : "projects";
    navigate(nextView);
  });

  const saveNotificationSettings = () => runActivity("알림 설정 저장", async () => {
    const payload = await responseJson<NotificationPayload>(await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "settings", ...notificationPreferences }),
    }));
    applyNotificationPayload(payload);
  });

  const sendTestEmail = () => runActivity("알림 시험 메일 발송", async () => {
    const payload = await responseJson<{ sent: true; recipient: string }>(await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test-email" }),
    }));
    if (!payload.sent) throw new Error("시험 메일 발송 결과를 확인하지 못했습니다.");
    const refreshed = await responseJson<NotificationPayload>(await fetch("/api/notifications", {
      headers: { Accept: "application/json" },
    }));
    applyNotificationPayload(refreshed);
  });

  const loadOperations = async (reviewPage = operations?.reviewPagination.page ?? 1) => {
    setOperationsState("loading");
    try {
      const payload = await responseJson<OperationsPayload>(await fetch(`/api/admin/operations?reviewPage=${reviewPage}`, {
        headers: { Accept: "application/json" },
      }));
      setOperations(payload);
      setOperationsState("ready");
    } catch {
      setOperationsState("error");
    }
  };

  const reviewAnnouncementAction = (announcementId: string, status: "pending" | "approved" | "flagged") => runActivity("공고 검수 저장", async () => {
    await responseJson(await fetch("/api/admin/operations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "review-announcement", announcementId, status }),
    }));
    await loadOperations(1);
  });

  const bulkReviewAnnouncementAction = (announcementIds: string[], status: "pending" | "approved" | "flagged") => runActivity("선택 공고 일괄 검수", async () => {
    await responseJson(await fetch("/api/admin/operations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulk-review-announcements", announcementIds, status }),
    }));
    await loadOperations(1);
  });

  const manageCouponAction = (input:
    | { action: "create-credit-coupon"; code: string; credits: number; expiresAt?: string }
    | { action: "disable-credit-coupon"; couponId: string }) => runActivity("크레딧 쿠폰 저장", async () => {
    await responseJson(await fetch("/api/admin/operations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
    await loadOperations();
  });

  const resolveRefundAction = (refundRequestId: string, decision: "approve" | "reject", note?: string) => runActivity("환불 요청 처리", async () => {
    await responseJson(await fetch("/api/admin/operations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve-refund-request", refundRequestId, decision, note }),
    }));
    await loadOperations();
  });

  const manageCommunityAction = (input: CommunityAdminAction) => runActivity("커뮤니티 운영 저장", async () => {
    await responseJson(await fetch("/api/admin/operations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
    await loadOperations();
  });

  const manageSupportAction = (input: SupportAdminAction) => runActivity("고객 문의 처리", async () => {
    await responseJson(await fetch("/api/admin/operations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
    await loadOperations();
  });

  const runAutomationAction = async () => {
    await syncAnnouncements();
  };

  const deleteAccountAction = () => runActivity("계정 및 자료 삭제", async () => {
    const payload = await responseJson<{ deleted: true; logoutUrl: string }>(await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: deleteConfirmation }),
    }));
    window.location.assign(payload.logoutUrl);
  });

  const startCheckout = (productId: string) => runActivity("결제 준비", async () => {
    const payload = await responseJson<
      | { configured: false; message: string }
      | PortOneV2CheckoutPayload
    >(await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "checkout", productId }),
    }));
    if (!payload.configured) throw new Error(payload.message);
    if (payload.provider === "portone_v2") {
      const payment = await PortOne.requestPayment({
        storeId: payload.storeId,
        channelKey: payload.channelKey,
        paymentId: payload.paymentId,
        orderName: payload.orderName,
        totalAmount: payload.amount,
        currency: "KRW",
        payMethod: "CARD",
        customer: {
          customerId: payload.customerId,
          email: payload.customerEmail,
          fullName: payload.customerName,
        },
        redirectUrl: payload.redirectUrl,
        noticeUrls: [payload.webhookUrl],
      });
      if (!payment) return;
      if (payment.code) {
        await fetch("/api/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "fail-checkout", orderId: payload.paymentId, code: payment.code, message: payment.message }),
        });
        throw new Error(payment.message || `결제창 오류가 발생했습니다. (${payment.code})`);
      }
      const confirmed = await responseJson<{ completed: boolean; billing: BillingPayload }>(await fetch("/api/billing/portone/v2/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.paymentId }),
      }));
      setBilling(confirmed.billing);
      setAiCredits(confirmed.billing.credits);
      setIsPro(confirmed.billing.plan === "pro");
      return;
    }
  });

  const redeemPromotionAction = (code: string) => runActivity("프로모션 크레딧 적용", async () => {
    const payload = await responseJson<{ creditsAdded: number; billing: BillingPayload }>(await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "redeem-promotion", code }),
    }));
    setBilling(payload.billing);
    setAiCredits(payload.billing.credits);
  });

  const requestRefundAction = (billingEventId: string, reason: string) => runActivity("환불 요청 접수", async () => {
    const payload = await responseJson<{ requestId: string; billing: BillingPayload }>(await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "request-refund", billingEventId, reason }),
    }));
    setBilling(payload.billing);
    setAiCredits(payload.billing.credits);
  });

  return (
    <div className="dm-page">
      <section className="dm-app" aria-label="당모 지원사업 탐색">
        <aside className="dm-sidebar" aria-label="주 메뉴">
          <div>
            <button className="dm-brand" type="button" onClick={() => navigate("explore")}> 
              <img className="dm-brand-logo" src="/dangmo-icon.png" alt="" aria-hidden="true" />
              <span className="dm-brand-divider" aria-hidden="true" />
              <strong className="dm-brand-title">당모-당신의 사업공모</strong>
            </button>

            <nav className="dm-nav">
              {navGroups.filter((group) => group.label !== "커뮤니티" || workspaceState === "ready").map((group) => (
                <div className="dm-nav-group" key={group.label}>
                  <span className="dm-nav-label">{group.label}</span>
                  {group.items.map((item) => (
                    <button
                      className={view === item.view ? "dm-nav-item is-selected" : "dm-nav-item"}
                      type="button"
                      key={item.label}
                      aria-current={view === item.view ? "page" : undefined}
                      onClick={() => navigate(item.view)}
                    >
                      <span className="dm-nav-icon" aria-hidden="true">{item.icon}</span>
                      <span>{item.label}</span>
                      {item.view === "match"
                        ? <span className="dm-badge" aria-label={workspaceState === "auth" ? "맞춤 추천 로그인 필요" : `맞춤 추천 ${recommendationCount}건`}>{workspaceState === "loading" ? "…" : workspaceState === "auth" ? "로그인" : recommendationCount.toLocaleString("ko-KR")}</span>
                        : item.badge ? <span className="dm-badge">{item.badge}</span> : null}
                    </button>
                  ))}
                </div>
              ))}
            </nav>
          </div>

          <div className="dm-sidebar-bottom">
            <aside className="dm-account-menu" aria-label="계정 메뉴" hidden={!accountOpen}>
              {workspaceState === "auth" ? <div className="dm-account-login">
                <span className="dm-avatar" aria-hidden="true">?</span>
                <div><strong>로그인하고 당모를 이어서 사용하세요</strong><p>공고 저장, 맞춤 추천, 사업비·서류 작성 내용을 안전하게 보관할 수 있어요.</p></div>
                <div className="dm-account-login-actions">
                  <button className="dm-primary-button dm-login-entry" type="button" onClick={openLoginDialog}>로그인하기</button>
                </div>
                <div className="dm-account-legal"><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보처리방침</Link><Link href="/ai-policy">AI 처리 안내</Link></div>
              </div> : <>
                <div className="dm-account-summary">
                  <span className="dm-avatar" aria-hidden="true">{accountInitial}</span>
                  <div><strong>{accountDisplayName}</strong><small>{accountMeta}</small></div>
                  <span className="dm-badge">{isPro ? "Pro" : "Free"}</span>
                </div>
                <div className="dm-account-actions">
                  <button type="button" onClick={() => navigate("profile", "basic")}>내 프로필 <span>{basicProfile.stage}</span></button>
                  <button type="button" onClick={() => navigate("profile", "business")}>AI 사업 프로필 <span>학습됨</span></button>
                  <button type="button" onClick={() => navigate("plan")}>요금제 및 사용량 <span>AI {aiCredits}</span></button>
                  <button type="button" onClick={() => navigate("notificationSettings")}>알림 설정</button>
                  {isAdmin ? <button type="button" onClick={() => { navigate("operations"); void loadOperations(); }}>운영 관리 <span>관리자</span></button> : null}
                  <button type="button" onClick={() => navigate("payment")}>결제 관리</button>
                  <button type="button" onClick={() => { window.location.href = logoutHref; }}>로그아웃</button>
                  <div className="dm-account-legal"><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보처리방침</Link><Link href="/ai-policy">AI 처리 안내</Link></div>
                </div>
              </>}
            </aside>

            <button
              className="dm-profile"
              type="button"
              aria-expanded={accountOpen}
              onClick={() => {
                setAccountOpen((open) => !open);
                setNotificationOpen(false);
              }}
            >
              <span className="dm-avatar" aria-hidden="true">{accountInitial}</span>
              <span><strong>{accountDisplayName}</strong><small>{workspaceState === "loading" ? "계정 확인 중" : workspaceState === "auth" ? "로그인하고 작업 저장하기" : `${isPro ? "Pro" : "Free"} · AI ${aiCredits}`}</small></span>
              <b aria-hidden="true">{accountOpen ? "⌄" : "⌃"}</b>
            </button>
          </div>
        </aside>

        <main className="dm-main" id="main-content">
          <header className="dm-header">
            <div><p>{meta.eyebrow}</p><h1>{meta.title}</h1></div>
            <div className="dm-header-actions">
              <button
                className="dm-mobile-profile"
                type="button"
                aria-label="계정 메뉴"
                aria-expanded={accountOpen}
                onClick={() => {
                  setAccountOpen((open) => !open);
                  setNotificationOpen(false);
                }}
              >
                <span className="dm-avatar" aria-hidden="true">{accountInitial}</span>
              </button>
              <button
                className="dm-notification-trigger"
                type="button"
                aria-label={`알림 ${unreadCount}개`}
                aria-expanded={notificationOpen}
                onClick={() => {
                  setNotificationOpen((open) => !open);
                  setAccountOpen(false);
                }}
              >
                <span className="dm-bell" aria-hidden="true" />
                {unreadCount > 0 ? <span className="dm-notification-count">{unreadCount}</span> : null}
              </button>
              <button
                className={`dm-primary-button dm-sync-button${syncBusy ? " is-running" : ""}`}
                type="button"
                disabled={syncBusy}
                aria-busy={syncBusy}
                onClick={() => void syncAnnouncements()}
              >
                <span className="dm-refresh-icon" aria-hidden="true" />
                {syncBusy ? `${syncRun?.progressPercent ?? 0}% 업데이트 중` : "전체 공고 업데이트"}
              </button>
            </div>
          </header>

          {syncRun ? <section
            className={`dm-sync-progress-card is-${syncRun.status}`}
            role="status"
            aria-live="polite"
            aria-label="전체 공고 업데이트 진행 상태"
          >
            <div className="dm-sync-progress-head">
              <span className="dm-sync-progress-icon" aria-hidden="true">↻</span>
              <div>
                <strong>{syncRun.status === "completed"
                  ? "전체 공고 업데이트 완료"
                  : syncRun.status === "failed"
                    ? "업데이트 확인이 필요해요"
                    : "최신 지원사업을 업데이트하고 있어요"}</strong>
                <p>{syncRun.progressMessage || "업데이트 작업을 준비하고 있어요."}</p>
              </div>
              <b>{syncRun.status === "failed" ? "!" : `${syncRun.progressPercent}%`}</b>
            </div>
            <div className="dm-sync-progress-track" aria-hidden="true">
              <span style={{ width: `${Math.max(2, syncRun.progressPercent)}%` }} />
            </div>
            <div className="dm-sync-progress-steps" aria-label="업데이트 단계">
              {[
                { label: "공식 출처", threshold: 12 },
                { label: "공고 저장", threshold: 30 },
                { label: "추가 출처", threshold: 55 },
                { label: "추천·알림", threshold: 72 },
              ].map((step) => <span
                className={syncRun.progressPercent >= step.threshold ? "is-done" : ""}
                key={step.label}
              ><i aria-hidden="true">{syncRun.progressPercent >= step.threshold ? "✓" : "·"}</i>{step.label}</span>)}
            </div>
            <footer>
              <div className="dm-sync-progress-notice">
                <small>{syncBusy
                  ? "다른 메뉴를 둘러보거나 창을 닫아도 서버에서 계속 진행돼요."
                  : syncRun.status === "completed"
                    ? `새 공고 ${syncRun.insertedCount}건 · 변경 ${syncRun.changedCount}건을 반영했어요.`
                    : "출처 연결 상태를 확인한 뒤 다시 시도해주세요."}</small>
                {syncRun.status === "completed" && syncRun.errorMessage
                  ? <span>{syncRun.errorMessage}</span>
                  : null}
              </div>
              {!syncBusy ? <div className="dm-inline-actions">
                {syncRun.status === "failed"
                  ? <button className="dm-primary-button" type="button" onClick={() => {
                    setSyncRun(null);
                    void syncAnnouncements();
                  }}>다시 시도</button>
                  : null}
                <button className="dm-button" type="button" onClick={() => setSyncRun(null)}>닫기</button>
              </div> : null}
            </footer>
          </section> : null}

          <aside className="dm-account-menu dm-account-menu-mobile" aria-label="모바일 계정 메뉴" hidden={!accountOpen}>
            {workspaceState === "auth" ? <div className="dm-account-login">
              <span className="dm-avatar" aria-hidden="true">?</span>
              <div><strong>로그인하고 당모를 이어서 사용하세요</strong><p>공고 저장, 맞춤 추천, 사업비·서류 작성 내용을 안전하게 보관할 수 있어요.</p></div>
              <div className="dm-account-login-actions">
                <button className="dm-primary-button dm-login-entry" type="button" onClick={openLoginDialog}>로그인하기</button>
              </div>
              <div className="dm-account-legal"><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보처리방침</Link><Link href="/ai-policy">AI 처리 안내</Link></div>
            </div> : <>
              <div className="dm-account-summary">
                <span className="dm-avatar" aria-hidden="true">{accountInitial}</span>
                <div><strong>{accountDisplayName}</strong><small>{accountMeta}</small></div>
                <span className="dm-badge">{isPro ? "Pro" : "Free"}</span>
              </div>
              <div className="dm-account-actions">
                <button type="button" onClick={() => navigate("profile", "basic")}>내 프로필 <span>{basicProfile.stage}</span></button>
                <button type="button" onClick={() => navigate("profile", "business")}>AI 사업 프로필 <span>학습됨</span></button>
                <button type="button" onClick={() => navigate("plan")}>요금제 및 사용량 <span>AI {aiCredits}</span></button>
                <button type="button" onClick={() => navigate("notificationSettings")}>알림 설정</button>
                {isAdmin ? <button type="button" onClick={() => { navigate("operations"); void loadOperations(); }}>운영 관리 <span>관리자</span></button> : null}
                <button type="button" onClick={() => navigate("payment")}>결제 관리</button>
                <button type="button" onClick={() => { window.location.href = logoutHref; }}>로그아웃</button>
                <div className="dm-account-legal"><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보처리방침</Link><Link href="/ai-policy">AI 처리 안내</Link></div>
              </div>
            </>}
          </aside>

          {workspaceState === "auth" && !["explore", "match", "projects", "budget", "writing"].includes(view) ? (
            <aside className="dm-auth-banner">
              <span><strong>로그인이 필요합니다</strong><small>사업자료와 작성 내용을 안전하게 저장하려면 SSO로 로그인해주세요.</small></span>
              <div className="dm-auth-actions">
                <button className="dm-primary-button dm-login-entry" type="button" onClick={openLoginDialog}>로그인하기</button>
              </div>
            </aside>
          ) : null}
          {workspaceState === "error" ? <aside className="dm-auth-banner is-error"><span><strong>저장 공간을 연결하지 못했습니다</strong><small>화면은 사용할 수 있지만 새로고침하면 변경 내용이 사라질 수 있어요.</small></span></aside> : null}
          {workspaceState === "loading" ? <div className="dm-sync-state" role="status">내 작업공간을 불러오는 중…</div> : null}

          <aside className="dm-notification-panel" aria-label="알림 목록" hidden={!notificationOpen}>
            <div className="dm-notification-head">
              <div><strong>알림</strong><small>{unreadCount > 0 ? `미확인 ${unreadCount}개` : "모두 확인"}</small></div>
              <button type="button" disabled={unreadCount === 0} onClick={() => void markAllNotifications()}>모두 읽음</button>
            </div>
            <div className="dm-notification-list">
              {notifications.length ? notifications.map((notification) => (
                <article className={notification.read ? "is-read" : ""} key={notification.id}>
                  <span className="dm-unread-dot" />
                  <div><strong>{notification.title}</strong><p>{notification.message}</p><small>{new Date(notification.createdAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}{notification.emailed ? " · 이메일 발송" : notification.emailStatus === "failed" ? " · 이메일 전송 실패" : ""}</small></div>
                  <button type="button" onClick={() => void openNotification(notification)}>{notification.actionLabel}</button>
                </article>
              )) : <div className="dm-empty-notification">새 알림이 없습니다.<br />저장한 공고의 D-7·D-1에 준비 상태를 알려드려요.</div>}
            </div>
            <button className="dm-notification-settings" type="button" onClick={() => navigate("notificationSettings")}>알림 설정</button>
          </aside>

          {view === "explore" ? (
            <ExploreView
              announcements={announcementFeed}
              pagination={announcementPagination}
              loading={announcementLoading}
              onPageChange={loadAnnouncementPage}
              sources={announcementSources}
              customSources={customSources}
              query={query}
              setQuery={setQuery}
              activeFilters={activeFilters}
              toggleFilter={toggleFilter}
              saved={saved}
              savedSourceKeys={projects.map((project) => project.announcementKey)}
              toggleSaved={toggleSaved}
              onDetail={openAnnouncementDetail}
              onManageSources={() => setSourceManagerOpen(true)}
            />
          ) : null}
          {view === "match" ? workspaceState === "auth"
            ? <GuestMatchView onLogin={openLoginDialog} />
            : <MatchView navigate={navigate} profileAnalysis={profileAnalysis} announcements={recommendedAnnouncementFeed} total={recommendationCount} pagination={recommendationPagination} loading={recommendationLoading} onPageChange={loadRecommendationPage} onDetail={openAnnouncementDetail} />
          : null}
          {view === "notices" && workspaceState === "ready" ? <Suspense fallback={<MenuLoadingState label="공지사항" />}><LazyCommunityBoardView key="notice" board="notice" /></Suspense> : null}
          {view === "bamboo" && workspaceState === "ready" ? <Suspense fallback={<MenuLoadingState label="대나무숲" />}><LazyCommunityBoardView key="bamboo" board="bamboo" /></Suspense> : null}
          {view === "support" && workspaceState === "ready" ? <Suspense fallback={<MenuLoadingState label="고객센터" />}><LazyCustomerSupportView /></Suspense> : null}
          {view === "projects" ? (
            <ProjectsView
              projects={projects}
              updateChecklist={updateChecklist}
              openWorkspace={openProjectWorkspace}
              navigate={navigate}
            />
          ) : null}
          {view === "budget" ? (
            activeProjectId ? (
              <BudgetView
                projectTitle={activeProjectTitle}
                rules={activeBudgetRules}
                items={budgetItems}
                addItem={addBudgetItem}
                updateItem={updateBudgetItem}
                removeItem={removeBudgetItem}
                save={saveBudgetItems}
                close={closeProjectWorkspace}
              />
            ) : activePracticeBudget ? (
              <BudgetView
                projectTitle={activePracticeBudget.name}
                rules={practiceBudgetRules}
                items={activePracticeBudget.items}
                addItem={addPracticeBudgetItem}
                updateItem={updatePracticeBudgetItem}
                removeItem={removePracticeBudgetItem}
                totalBudgetTarget={activePracticeBudget.totalBudget}
                allocationTargets={activePracticeBudget.allocationTargets}
                updateTargets={updatePracticeBudgetTargets}
                practice
                guestMode={guestMode}
                close={closePracticeBudget}
                reset={resetPracticeBudget}
                clear={() => clearPracticeBudget(activePracticeBudget.id)}
              />
            ) : <div className="dm-view-stack"><ProjectWorkspaceLibrary projects={projects} mode="budget" openWorkspace={openProjectWorkspace} navigate={navigate} /><BudgetPracticeLanding workspaces={practiceBudgetWorkspaces} start={startPracticeBudget} open={setPracticeBudgetActiveId} rename={renamePracticeBudget} clear={clearPracticeBudget} navigate={navigate} guestMode={guestMode} /></div>
          ) : null}
          {view === "writing" ? (
            activeProjectId ? (
              <WritingView
                projectTitle={activeProjectTitle}
                sections={draftSections}
                versions={draftVersions}
                updateSection={updateDraftSection}
                addSection={addDraftSection}
                removeSection={removeDraftSection}
                credits={aiCredits}
                runAi={runWritingAi}
                aiRun={writingAiRun}
                activeProfileSummary={profileSummary}
                restoreVersion={restoreDraft}
                save={saveDraftContent}
                navigate={navigate}
                close={closeProjectWorkspace}
              />
            ) : activePracticeWriting ? (
              <WritingView
                projectTitle={activePracticeWriting.name}
                sections={activePracticeWriting.sections}
                versions={[]}
                updateSection={updatePracticeWritingSection}
                addSection={addPracticeWritingSection}
                removeSection={removePracticeWritingSection}
                practice
                guestMode={guestMode}
                close={closePracticeWriting}
                reset={resetPracticeWriting}
                clear={() => clearPracticeWriting(activePracticeWriting.id)}
              />
            ) : <div className="dm-view-stack"><ProjectWorkspaceLibrary projects={projects} mode="writing" openWorkspace={openProjectWorkspace} navigate={navigate} /><WritingPracticeLanding workspaces={practiceWritingWorkspaces} start={startPracticeWriting} open={setPracticeWritingActiveId} rename={renamePracticeWriting} clear={clearPracticeWriting} navigate={navigate} guestMode={guestMode} /></div>
          ) : null}
          {view === "profile" ? (
            <ProfileView
              tab={profileTab}
              setTab={(tab) => navigate("profile", tab)}
              documents={documents}
              documentUploadState={documentUploadState}
              profileAnalysisRunState={profileAnalysisRunState}
              profileAnalysisElapsedSeconds={profileAnalysisElapsedSeconds}
              addDocuments={addDocuments}
              removeDocument={removeDocument}
              analyzeProfile={analyzeProfile}
              profileSummary={profileSummary}
              basicProfile={basicProfile}
              profileAnalysis={profileAnalysis}
              profileReview={profileReview}
              profileVersions={profileVersions}
              aiRuntime={aiRuntime}
              updateReview={updateProfileReviewAnalysis}
              saveReview={() => persistProfileReview(false)}
              approveReview={() => persistProfileReview(true)}
              cancelReview={cancelProfileReview}
              selectProfile={selectProfileVersion}
              deleteProfile={deleteProfileVersion}
              saveBasicProfile={saveBasicProfile}
              deleteOpen={deleteAccountOpen}
              setDeleteOpen={setDeleteAccountOpen}
              deleteConfirmation={deleteConfirmation}
              setDeleteConfirmation={setDeleteConfirmation}
              deleteAccount={deleteAccountAction}
              navigate={navigate}
            />
          ) : null}
          {view === "plan" ? (
            <PlanView
              billing={billing}
              checkout={startCheckout}
              redeemPromotion={redeemPromotionAction}
              navigate={navigate}
            />
          ) : null}
          {view === "notificationSettings" ? <NotificationSettingsView preferences={notificationPreferences} setPreferences={setNotificationPreferences} isPro={isPro} emailProviderConnected={emailProviderConnected} automationStatus={automationStatus} save={saveNotificationSettings} sendTestEmail={sendTestEmail} navigate={navigate} /> : null}
          {view === "payment" ? <PaymentView billing={billing} checkout={startCheckout} requestRefund={requestRefundAction} navigate={navigate} /> : null}
          {view === "operations" ? <TabbedOperationsView payload={operations} state={operationsState} refresh={loadOperations} review={reviewAnnouncementAction} bulkReview={bulkReviewAnnouncementAction} manageCoupon={manageCouponAction} resolveRefund={resolveRefundAction} manageCommunity={manageCommunityAction} manageSupport={manageSupportAction} runAutomation={runAutomationAction} sendTestEmail={sendTestEmail} /> : null}

          <SiteFooter />

          {sourceManagerOpen ? (
            <CustomSourceManager
              sources={customSources}
              guestMode={guestMode}
              onLogin={openLoginDialog}
              close={() => setSourceManagerOpen(false)}
              addSource={addCustomSourceAction}
              updateSource={updateCustomSourceAction}
              removeSource={removeCustomSourceAction}
            />
          ) : null}

          {detail ? (
            <>
              <button className="dm-detail-backdrop dm-announcement-detail-backdrop" type="button" aria-label="공고 상세 닫기" onClick={closeAnnouncementDetail} />
              <aside className="dm-detail dm-announcement-detail" role="dialog" aria-modal="true" aria-labelledby="announcement-detail-title">
                <header className="dm-detail-head">
                  <div><span className="dm-badge">{detail.dday}</span><span className="dm-detail-category">{detail.category}</span></div>
                  <button type="button" aria-label="상세 닫기" onClick={closeAnnouncementDetail}>×</button>
                </header>

                <div className="dm-detail-scroll">
                  <section className="dm-detail-title">
                    <p>{detail.institution} · {detail.region} · 등록 {detail.publishedAt}</p>
                    <h2 id="announcement-detail-title">{detail.title}</h2>
                    <p>{detail.overview}</p>
                    {detailLoading ? <span className="dm-detail-inline-loading" role="status">세부 자격·지원 내용을 불러오고 있어요…</span> : null}
                  </section>

                  <div className="dm-detail-facts" aria-label="공고 핵심 정보">
                    <div><span>지원 규모</span><strong>{detail.support}</strong></div>
                    <div><span>접수 마감</span><strong>{detail.deadline.replace("접수 ", "")}</strong></div>
                    <div><span>지원 지역</span><strong>{detail.region}</strong></div>
                  </div>

                  {workspaceState === "auth" ? (
                    <section className="dm-detail-login-hook" aria-label="로그인 후 맞춤 분석 안내">
                      <span className="dm-detail-login-icon" aria-hidden="true">✦</span>
                      <div><strong>내 사업과 이 공고가 얼마나 잘 맞을까요?</strong><p>로그인하면 창업연차·업종·지역과 AI 사업 프로필을 비교해 자격조건, 적합도와 추천 근거를 계산해드려요.</p></div>
                      <div className="dm-detail-login-actions">
                        <button className="dm-primary-button dm-login-entry" type="button" onClick={openLoginDialog}>로그인하고 적합도 확인</button>
                      </div>
                    </section>
                  ) : <>
                    <section className="dm-detail-match">
                      <div><span>{detail.eligibilityStatus === "eligible" ? "자격조건 충족" : detail.eligibilityStatus === "ineligible" ? "자격조건 불일치" : "추가 확인 필요"} · 내 프로필 적합도</span><strong>{detail.score}%</strong></div>
                      <div className="dm-progress" aria-label={`적합도 ${detail.score}%`}><span style={{ width: `${detail.score}%` }} /></div>
                      <p>{reasonText(detail)}</p>
                    </section>

                    {detail.scoreBreakdown ? (
                      <section className="dm-detail-section">
                        <h3>추천 점수 근거</h3>
                        <div className="dm-score-breakdown">
                          <div><span>사업목적</span><strong>{detail.scoreBreakdown.purpose}/40</strong></div>
                          <div><span>성장단계</span><strong>{detail.scoreBreakdown.stage}/25</strong></div>
                          <div><span>실행역량</span><strong>{detail.scoreBreakdown.capability}/20</strong></div>
                          <div><span>선호조건</span><strong>{detail.scoreBreakdown.preference}/15</strong></div>
                        </div>
                      </section>
                    ) : null}

                    {detail.cautions?.length ? (
                      <aside className="dm-detail-cautions"><strong>신청 전 확인할 조건</strong>{detail.cautions.map((caution) => <p key={caution}>• {caution}</p>)}</aside>
                    ) : null}
                  </>}

                  <DetailListSection title="지원 대상" items={detail.eligibility ?? []} />
                  <DetailListSection title="지원 내용" items={detail.benefits ?? []} />

                  <section className="dm-detail-section">
                    <h3>신청 안내</h3>
                    <dl className="dm-detail-definition">
                      <div><dt>사업 기간</dt><dd>{detail.programPeriod ?? "공고 원문 확인"}</dd></div>
                      <div><dt>신청 방법</dt><dd>{detail.applicationMethod ?? "공고 원문 확인"}</dd></div>
                      <div><dt>문의처</dt><dd>{detail.contact ?? detail.institution}</dd></div>
                    </dl>
                  </section>

                  <DetailListSection title="준비 서류" items={detail.requiredDocuments ?? []} numbered />

                  <aside className="dm-detail-notice">
                    <strong>신청 전 최종 확인</strong>
                    <p>당모의 요약 정보는 준비를 돕기 위한 내용입니다. 자격조건·제출양식·마감시간은 반드시 기관 원문에서 확인해주세요.</p>
                  </aside>
                </div>

                <footer className="dm-detail-actions">
                  <a className="dm-button" href={detail.sourceUrl} target="_blank" rel="noreferrer">{detail.sourceLabel} ↗</a>
                  {workspaceState === "auth"
                    ? <button className="dm-primary-button" type="button" onClick={openLoginDialog}>로그인 후 저장하기</button>
                    : <button className="dm-primary-button" type="button" onClick={() => void startProject(detail)}>저장하고 준비 시작</button>}
                </footer>
              </aside>
            </>
          ) : null}
          {loginDialogOpen ? <LoginDialog authProviders={authProviders} close={() => setLoginDialogOpen(false)} /> : null}
          {activity ? <div className="dm-save-toast" role="status" aria-live="polite">{activity}</div> : null}
        </main>
      </section>
    </div>
  );
}

function SiteFooter() {
  return <footer className="dm-app-footer">
    <div><strong>© 2026 Team. DM. All rights reserved.</strong><span>당모-당신의 사업공모</span></div>
    <nav aria-label="서비스 정책"><Link href="/business">서비스 소개</Link><Link href="/pricing">요금 안내</Link><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보처리방침</Link><Link href="/ai-policy">AI 처리 안내</Link><Link href="/refund-policy">환불 정책</Link><a href="mailto:sseung.chip@gmail.com">문의</a></nav>
  </footer>;
}

function LoginDialog({ authProviders, close }: { authProviders: AuthProviderStatus | null; close: () => void }) {
  return (
    <>
      <button className="dm-login-dialog-backdrop" type="button" aria-label="로그인 창 닫기" onClick={close} />
      <section className="dm-login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-dialog-title">
        <header>
          <img src="/dangmo-icon.png" alt="" aria-hidden="true" />
          <button type="button" aria-label="로그인 창 닫기" onClick={close}>×</button>
        </header>
        <div className="dm-login-dialog-copy">
          <span>당모 계정</span>
          <h2 id="login-dialog-title">로그인 방법을 선택해주세요.</h2>
          <p>공고 저장, 맞춤 추천과 작성 내용을 안전하게 이어서 관리할 수 있어요.</p>
        </div>
        <div className="dm-login-dialog-options">
          {authProviders?.google.configured
            ? <Link className="dm-sso-button is-google" href="/api/auth/start/google?return_to=%2F" onClick={() => rememberLoginMethod("google")}><b aria-hidden="true">G</b> Google로 계속하기</Link>
            : <span className="dm-sso-button is-google is-disabled" title="Google OAuth 키 등록 필요"><b aria-hidden="true">G</b> Google · 설정 대기</span>}
          {authProviders?.kakao.configured
            ? <Link className="dm-sso-button is-kakao" href="/api/auth/start/kakao?return_to=%2F" onClick={() => rememberLoginMethod("kakao")}><b aria-hidden="true">K</b> 카카오로 계속하기</Link>
            : <span className="dm-sso-button is-kakao is-disabled" title="카카오 OAuth 키 등록 필요"><b aria-hidden="true">K</b> 카카오 · 설정 대기</span>}
        </div>
        <small>로그인하면 이용약관과 개인정보처리방침에 동의하게 됩니다.</small>
      </section>
    </>
  );
}

function MenuLoadingState({ label }: { label: string }) {
  return <div className="dm-menu-loading" role="status"><span aria-hidden="true" /><strong>{label}을 불러오는 중…</strong></div>;
}

function DetailListSection({ title, items, numbered = false }: { title: string; items: string[]; numbered?: boolean }) {
  const List = numbered ? "ol" : "ul";
  return (
    <section className="dm-detail-section">
      <h3>{title}</h3>
      <List className={numbered ? "is-numbered" : ""}>{items.map((item) => <li key={item}>{item}</li>)}</List>
    </section>
  );
}

function ExploreView({
  announcements,
  pagination,
  loading,
  onPageChange,
  sources,
  customSources,
  query,
  setQuery,
  activeFilters,
  toggleFilter,
  saved,
  savedSourceKeys,
  toggleSaved,
  onDetail,
  onManageSources,
}: {
  announcements: Announcement[];
  pagination: AnnouncementFeedPayload["pagination"];
  loading: boolean;
  onPageChange: (request: AnnouncementFeedRequest) => Promise<void>;
  sources: AnnouncementSourceStatus[];
  customSources: CustomSource[];
  query: string;
  setQuery: (value: string) => void;
  activeFilters: string[];
  toggleFilter: (filter: string) => void;
  saved: string[];
  savedSourceKeys: string[];
  toggleSaved: (id: string) => void;
  onDetail: (announcement: Announcement) => void;
  onManageSources: () => void;
}) {
  const [sortBy, setSortBy] = useState<"latest" | "deadline" | "title">("latest");
  const [regionFilter, setRegionFilter] = useState("전체");
  const requestStarted = useRef(false);
  useEffect(() => {
    const searchTerm = query.trim();
    if (!searchTerm) return;
    const timer = window.setTimeout(() => trackEvent("search", { search_term: searchTerm.slice(0, 80) }), 800);
    return () => window.clearTimeout(timer);
  }, [query]);
  const requestPage = useCallback(async (page: number) => {
    await onPageChange({
      page,
      query: query.trim(),
      region: regionFilter,
      stages: activeFilters.filter((filter) => filter !== "전체"),
      sort: sortBy,
      mode: "all",
    });
    window.requestAnimationFrame(() => {
      document.getElementById("feed-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [activeFilters, onPageChange, query, regionFilter, sortBy]);

  useEffect(() => {
    if (!requestStarted.current) {
      requestStarted.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      void requestPage(1);
    }, query.trim() ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [activeFilters, query, regionFilter, requestPage, sortBy]);

  const pageStart = pagination.total ? ((pagination.page - 1) * pagination.pageSize) + 1 : 0;
  const pageEnd = Math.min(pagination.page * pagination.pageSize, pagination.total);
  return (
    <div className="dm-content">
      <div className="dm-explore-toolbar">
        <label className="dm-search-label"><span className="dm-search-icon" aria-hidden="true">⌕</span><span className="sr-only">지원사업 검색</span><input type="search" placeholder="공고명, 기관, 키워드 검색" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>Ctrl K</kbd></label>
        <div className="dm-explore-filters" aria-label="지원사업 필터">
          <div className="dm-filter-group"><span>창업 단계</span><div className="dm-filters">{["전체", "예비", "초기", "도약"].map((filter) => <button className={activeFilters.includes(filter) ? "is-selected" : ""} type="button" key={filter} aria-pressed={activeFilters.includes(filter)} onClick={() => toggleFilter(filter)}>{filter}</button>)}</div></div>
          <label className="dm-region-filter"><span>지역</span><span className="dm-select-shell"><select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}><option value="전체">전체 지역</option><option value="전국">전국</option>{REGION_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></span></label>
        </div>
      </div>
      <section className="dm-source-strip" aria-label="공고 출처 연결 상태">
        <div><strong>공고 출처</strong><span>연동된 출처의 진행 중 공고를 빠짐없이 모아 보여드려요.</span></div>
        <div className="dm-source-actions">
          <div>{sources.length ? sources.map((source) => <span className={`is-${source.status}`} key={source.id}>{source.label} · {source.status === "connected" ? source.count ? `${source.count}건` : "연결됨" : source.status === "error" ? "연결 확인" : "인증키 필요"}</span>) : <span className="is-review">공고 출처 연결 필요</span>}{customSources.map((source) => <span className={`is-${source.status === "active" ? "connected" : source.status}`} key={source.id}>{source.name} · {source.status === "active" ? `${source.itemCount}건` : source.status === "paused" ? "일시정지" : "확인 필요"}</span>)}</div>
          <button className="dm-button" type="button" onClick={onManageSources}>＋ 출처 관리</button>
        </div>
      </section>
      <div className="dm-explore-workspace">
      <section className="dm-feed-section" aria-labelledby="feed-heading">
        <div className="dm-section-head"><div><h2 id="feed-heading">전체 공고 <span>{pagination.total.toLocaleString("ko-KR")}</span></h2><p>연결된 출처에서 수집한 진행 중 공고를 검색하고 조건별로 확인하세요.</p>{pagination.total ? <small className="dm-feed-range">{pageStart.toLocaleString("ko-KR")}–{pageEnd.toLocaleString("ko-KR")}건 표시 · 페이지당 최대 {pagination.pageSize}건</small> : null}</div><label><span className="sr-only">정렬</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as "latest" | "deadline" | "title")}><option value="latest">최신순</option><option value="deadline">마감 임박순</option><option value="title">공고명순</option></select></label></div>
        <div className="dm-feed" aria-busy={loading}>
          {announcements.map((item) => {
            const isSaved = saved.includes(item.id) || savedSourceKeys.includes(item.sourceKey);
            return <article className="dm-feed-item" key={item.id}><button className="dm-feed-open" type="button" aria-haspopup="dialog" onClick={() => onDetail(item)}><span className="dm-item-top"><span><span className="dm-badge">{item.dday}</span><span className="dm-category-badge">{item.category}</span></span><span>{item.institution} · {item.region}</span></span><strong>{item.title}</strong><span className="dm-announcement-overview">{item.overview}</span><span className="dm-item-meta"><span>{item.support}</span><span>{item.deadline}</span><span className="dm-feed-detail-hint">상세 보기 →</span></span></button><button className={isSaved ? "dm-save is-saved" : "dm-save"} type="button" aria-pressed={isSaved} onClick={() => toggleSaved(item.id)}>{isSaved ? "저장됨" : "저장"}</button></article>;
          })}
        </div>
        {!loading && pagination.total === 0 ? <div className="dm-empty"><strong>{query.trim() || activeFilters.some((filter) => filter !== "전체") || regionFilter !== "전체" ? "선택한 조건의 공고가 없어요." : "표시할 실제 공고가 아직 없어요."}</strong><p>{query.trim() || activeFilters.some((filter) => filter !== "전체") || regionFilter !== "전체" ? "검색어, 창업 단계 또는 지역을 바꾸어 다시 확인해보세요." : "전체 공고 업데이트를 실행하거나 공고 출처 관리에서 원하는 사이트를 연결해주세요."}</p></div> : null}
        {pagination.totalPages > 1 ? <nav className="dm-feed-pagination" aria-label="지원사업 공고 페이지">
          <button type="button" disabled={loading || pagination.page === 1} onClick={() => void requestPage(pagination.page - 1)}>이전</button>
          {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((page) => <button className={page === pagination.page ? "is-current" : ""} type="button" disabled={loading} aria-current={page === pagination.page ? "page" : undefined} key={page} onClick={() => void requestPage(page)}>{page}</button>)}
          <button type="button" disabled={loading || pagination.page === pagination.totalPages} onClick={() => void requestPage(pagination.page + 1)}>다음</button>
        </nav> : null}
      </section>
      </div>
    </div>
  );
}

function CustomSourceManager({
  sources,
  guestMode,
  onLogin,
  close,
  addSource,
  updateSource,
  removeSource,
}: {
  sources: CustomSource[];
  guestMode: boolean;
  onLogin: () => void;
  close: () => void;
  addSource: (input: { name: string; listingUrl: string; confirmed: boolean }) => Promise<boolean>;
  updateSource: (sourceId: string, action: "sync" | "pause" | "resume") => Promise<void>;
  removeSource: (sourceId: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState("");
  const statusLabel = {
    active: "수집 중",
    paused: "일시정지",
    error: "연결 확인",
    needs_review: "연동 검토 필요",
  } as const;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("add");
    const succeeded = await addSource({ name, listingUrl, confirmed });
    setBusy("");
    if (succeeded) {
      setName("");
      setListingUrl("");
      setConfirmed(false);
    }
  };

  const run = async (sourceId: string, action: "sync" | "pause" | "resume") => {
    setBusy(`${sourceId}:${action}`);
    await updateSource(sourceId, action);
    setBusy("");
  };

  const remove = async (source: CustomSource) => {
    if (!window.confirm(`${source.name} 출처와 여기서 수집한 공고를 삭제할까요?`)) return;
    setBusy(`${source.id}:remove`);
    await removeSource(source.id);
    setBusy("");
  };

  return (
    <>
      <button className="dm-detail-backdrop" type="button" aria-label="공고 출처 관리 닫기" onClick={close} />
      <aside className="dm-source-manager" role="dialog" aria-modal="true" aria-labelledby="source-manager-title">
        <header>
          <div><span className="dm-badge">Custom source</span><h2 id="source-manager-title">공고 출처 관리</h2><p>{guestMode ? "개인 출처 연결은 로그인 후 계정에 안전하게 저장됩니다." : "K-Startup·기업마당 외 공개 공고 목록을 내 계정에 추가합니다."}</p></div>
          <button type="button" aria-label="닫기" onClick={close}>×</button>
        </header>

        {guestMode ? <section className="dm-source-login-gate">
          <img src="/dangmo-icon.png" alt="" aria-hidden="true" />
          <div><span>개인 맞춤 출처</span><h3>로그인하고 원하는 공고 사이트를 연결하세요.</h3><p>기관·협회·지자체의 공개 공고 목록을 등록하면 당모가 매일 새 공고를 확인해 한곳에 모아드려요.</p></div>
          <div className="dm-source-login-actions">
            <button className="dm-primary-button dm-login-entry" type="button" onClick={onLogin}>로그인하고 출처 연결하기</button>
          </div>
          <small>연결한 출처와 수집 설정은 본인 계정에서만 확인할 수 있습니다.</small>
        </section> : <>
        <form className="dm-source-form" onSubmit={submit}>
          <label><span>사이트·기관 이름</span><input value={name} maxLength={60} placeholder="예: 서울경제진흥원" onChange={(event) => setName(event.target.value)} /></label>
          <label><span>공고 목록 페이지 URL</span><input type="url" value={listingUrl} placeholder="https://기관주소/공고목록" onChange={(event) => setListingUrl(event.target.value)} /></label>
          <label className="dm-source-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>로그인 없이 공개된 페이지이며, 사이트 이용조건과 자동 수집 가능 여부를 확인했습니다.</span></label>
          <div className="dm-source-guide"><strong>자동 연결 범위</strong><p>공개 HTTPS 목록의 공고 링크를 매일 확인합니다. 로그인·캡차·자바스크립트 전용 페이지, 첨부파일만 있는 게시판은 별도 관리자 연동이 필요합니다.</p></div>
          <button className="dm-primary-button" type="submit" disabled={!name.trim() || !listingUrl.trim() || !confirmed || busy === "add"}>{busy === "add" ? "연결 확인 중…" : "등록하고 연결 확인"}</button>
        </form>

        <section className="dm-source-list">
          <div className="dm-profile-section-head"><div><h2>내가 추가한 출처</h2><p>최대 10개 · 계정별 비공개 설정</p></div><span className="dm-badge">{sources.length}개</span></div>
          {sources.length ? sources.map((source) => (
            <article key={source.id}>
              <div className="dm-source-list-main"><span className={`dm-runtime-badge is-${source.status}`}>{statusLabel[source.status]}</span><strong>{source.name}</strong><a href={source.listingUrl} target="_blank" rel="noreferrer">목록 원문 ↗</a><small>{source.lastCheckedAt ? `최근 확인 ${new Date(source.lastCheckedAt).toLocaleString("ko-KR")} · 공고 ${source.itemCount}건` : "아직 확인 전"}</small>{source.lastError ? <p>{source.lastError}</p> : null}</div>
              <div className="dm-source-list-actions">
                <button className="dm-button" type="button" disabled={busy.startsWith(source.id)} onClick={() => void run(source.id, "sync")}>지금 확인</button>
                <button className="dm-button" type="button" disabled={busy.startsWith(source.id)} onClick={() => void run(source.id, source.status === "paused" ? "resume" : "pause")}>{source.status === "paused" ? "재개" : "일시정지"}</button>
                <button className="dm-remove-row" type="button" disabled={busy.startsWith(source.id)} onClick={() => void remove(source)}>삭제</button>
              </div>
            </article>
          )) : <div className="dm-empty-row">추가한 출처가 없습니다. 자주 확인하는 기관의 공고 목록 URL을 등록해보세요.</div>}
        </section>
        </>}
      </aside>
    </>
  );
}

const communityDate = (value: string, detail = false) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "방금 전";
  return date.toLocaleString("ko-KR", detail
    ? { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "2-digit", day: "2-digit" });
};

const supportCategoryLabel: Record<SupportCategory, string> = {
  issue: "오류·이슈",
  suggestion: "기능 건의",
  feedback: "서비스 피드백",
  other: "기타 문의",
};

const supportStatusLabel: Record<SupportStatus, string> = {
  received: "접수",
  in_review: "검토중",
  resolved: "답변 완료",
  closed: "종료",
};

function LegacyCustomerSupportView() {
  const [payload, setPayload] = useState<SupportPayload | null>(null);
  const [category, setCategory] = useState<SupportCategory>("issue");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    try {
      const next = await responseJson<SupportPayload>(await fetch("/api/support", {
        headers: { Accept: "application/json" },
      }));
      setPayload(next);
      setStatus("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "문의 내역을 불러오지 못했습니다.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subject.trim() || !content.trim() || status === "saving") return;
    setStatus("saving");
    setMessage("");
    try {
      const next = await responseJson<SupportPayload>(await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, subject, content }),
      }));
      setPayload(next);
      setSubject("");
      setContent("");
      setExpandedId(next.requests[0]?.id ?? "");
      setMessage("문의가 접수되었습니다. 운영팀 답변은 이 화면에서 확인할 수 있어요.");
      setStatus("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "문의를 접수하지 못했습니다.");
      setStatus("error");
    }
  };

  const pendingCount = payload?.requests.filter((item) => item.status === "received" || item.status === "in_review").length ?? 0;
  const resolvedCount = payload?.requests.filter((item) => item.status === "resolved" || item.status === "closed").length ?? 0;

  return <div className="dm-support-page">
    <section className="dm-support-hero">
      <div><span>DANGMO SUPPORT</span><h2>사용하면서 발견한 점을 당모에 알려주세요.</h2><p>오류·이슈, 기능 건의와 서비스 피드백을 남기면 운영팀이 확인하고 이 화면을 통해 답변드립니다.</p></div>
      <a href="mailto:sseung.chip@gmail.com">긴급 문의 · sseung.chip@gmail.com</a>
    </section>

    <div className="dm-support-layout">
      <form className="dm-support-form" onSubmit={submit}>
        <div className="dm-support-section-head"><div><span>새 문의</span><h2>어떤 도움이 필요하신가요?</h2></div><small>평일 기준 순차 답변</small></div>
        <label><span>문의 유형</span><select value={category} onChange={(event) => setCategory(event.target.value as SupportCategory)}>{Object.entries(supportCategoryLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>제목</span><input value={subject} maxLength={120} placeholder="문의 내용을 한 줄로 알려주세요." onChange={(event) => setSubject(event.target.value)} /></label>
        <label><span>내용</span><textarea value={content} maxLength={5_000} rows={10} placeholder="발생한 상황, 기대한 동작, 개선 제안을 구체적으로 적어주시면 빠르게 확인할 수 있어요." onChange={(event) => setContent(event.target.value)} /></label>
        <div className="dm-support-form-bottom"><small>{content.length.toLocaleString("ko-KR")} / 5,000자 · 문의 계정 {payload?.email ?? "가입 이메일"}</small><button className="dm-primary-button" type="submit" disabled={!subject.trim() || !content.trim() || status === "saving"}>{status === "saving" ? "접수 중…" : "문의 접수하기"}</button></div>
        {message ? <p className={status === "error" ? "dm-support-message is-error" : "dm-support-message"} role="status">{message}</p> : null}
      </form>

      <section className="dm-support-history">
        <div className="dm-support-section-head"><div><span>내 문의</span><h2>처리 현황</h2></div><button className="dm-button" type="button" disabled={status === "loading"} onClick={() => void loadRequests()}>↻ 새로고침</button></div>
        <div className="dm-support-summary"><div><span>답변 대기</span><strong>{pendingCount}건</strong></div><div><span>답변 완료</span><strong>{resolvedCount}건</strong></div></div>
        {status === "loading" && !payload ? <div className="dm-support-empty">문의 내역을 불러오는 중…</div> : null}
        {payload?.requests.length ? <div className="dm-support-request-list">{payload.requests.map((item) => {
          const expanded = expandedId === item.id;
          return <article className={expanded ? "is-expanded" : ""} key={item.id}>
            <button type="button" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? "" : item.id)}>
              <span><b>{supportCategoryLabel[item.category]}</b><i className={`is-${item.status}`}>{supportStatusLabel[item.status]}</i></span>
              <strong>{item.subject}</strong>
              <small>{communityDate(item.createdAt, true)}<em>{expanded ? "접기 ↑" : "내용 보기 ↓"}</em></small>
            </button>
            {expanded ? <div className="dm-support-request-body"><section><h3>문의 내용</h3><p>{item.content}</p></section>{item.adminResponse ? <section className="is-response"><h3>당모 운영팀 답변</h3><p>{item.adminResponse}</p><small>{item.respondedAt ? communityDate(item.respondedAt, true) : "답변 완료"}</small></section> : <section className="is-waiting"><h3>운영팀이 내용을 확인하고 있어요.</h3><p>답변이 등록되면 이 화면에서 확인할 수 있습니다.</p></section>}</div> : null}
          </article>;
        })}</div> : status !== "loading" ? <div className="dm-support-empty"><strong>아직 접수한 문의가 없습니다.</strong><span>왼쪽 양식에서 첫 문의를 남겨주세요.</span></div> : null}
      </section>
    </div>
  </div>;
}

function LegacyCommunityBoardView({ board }: { board: "notice" | "bamboo" }) {
  const [posts, setPosts] = useState<CommunityPostSummary[]>([]);
  const [selected, setSelected] = useState<CommunityPostDetail | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [error, setError] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [comment, setComment] = useState("");

  const loadPosts = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const payload = await responseJson<CommunityListPayload>(await fetch(`/api/community?board=${board}`, { headers: { Accept: "application/json" } }));
      setPosts(payload.posts);
      setStatus("ready");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "게시판을 불러오지 못했습니다.");
      setStatus("error");
    }
  }, [board]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/community?board=${board}`, { headers: { Accept: "application/json" } })
      .then((response) => responseJson<CommunityListPayload>(response))
      .then((payload) => {
        if (cancelled) return;
        setPosts(payload.posts);
        setStatus("ready");
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        setError(nextError instanceof Error ? nextError.message : "게시판을 불러오지 못했습니다.");
        setStatus("error");
      });
    return () => { cancelled = true; };
  }, [board]);

  const openPost = async (postId: string) => {
    setStatus("loading");
    setError("");
    try {
      const payload = await responseJson<CommunityDetailPayload>(await fetch(`/api/community?postId=${encodeURIComponent(postId)}`, { headers: { Accept: "application/json" } }));
      setSelected(payload.post);
      setComments(payload.comments);
      setStatus("ready");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "게시글을 불러오지 못했습니다.");
      setStatus("error");
    }
  };

  const submitPost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !content.trim() || status === "saving") return;
    setStatus("saving");
    setError("");
    try {
      const payload = await responseJson<CommunityDetailPayload>(await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "post", title, content }),
      }));
      setTitle("");
      setContent("");
      setComposeOpen(false);
      setSelected(payload.post);
      setComments(payload.comments);
      setStatus("ready");
      void loadPosts();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "게시글을 저장하지 못했습니다.");
      setStatus("error");
    }
  };

  const submitComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !comment.trim() || status === "saving") return;
    setStatus("saving");
    setError("");
    try {
      const payload = await responseJson<CommunityDetailPayload>(await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", postId: selected.id, content: comment }),
      }));
      setSelected(payload.post);
      setComments(payload.comments);
      setComment("");
      setStatus("ready");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "댓글을 저장하지 못했습니다.");
      setStatus("error");
    }
  };

  if (selected) {
    return <div className="dm-community-page dm-community-detail">
      <button className="dm-community-back" type="button" onClick={() => { setSelected(null); setComments([]); setError(""); void loadPosts(); }}>← {board === "notice" ? "공지사항" : "대나무숲"} 목록</button>
      <article className="dm-community-article">
        <header>
          <div className="dm-community-tags"><span>{board === "notice" ? "공지사항" : "대나무숲"}</span>{selected.pinned ? <b>고정</b> : null}</div>
          <h2>{selected.title}</h2>
          <p><strong>{selected.authorLabel}</strong><span>{communityDate(selected.createdAt, true)}</span><span>조회 {selected.viewCount.toLocaleString("ko-KR")}</span></p>
        </header>
        <div className="dm-community-body">{selected.content}</div>
      </article>
      {board === "bamboo" ? <section className="dm-community-comments" aria-labelledby="community-comments-title">
        <div className="dm-community-comments-head"><h2 id="community-comments-title">댓글 <strong>{comments.length}</strong></h2><p>서로의 상황과 선택을 존중하는 댓글을 남겨주세요.</p></div>
        <form className="dm-community-comment-form" onSubmit={submitComment}>
          <span className="dm-community-anonymous-avatar" aria-hidden="true">익</span>
          <label><span className="sr-only">댓글 내용</span><textarea value={comment} maxLength={1_000} rows={3} placeholder="익명으로 댓글을 남겨보세요." onChange={(event) => setComment(event.target.value)} /></label>
          <button className="dm-primary-button" type="submit" disabled={!comment.trim() || status === "saving"}>{status === "saving" ? "등록 중…" : "댓글 등록"}</button>
        </form>
        {error ? <p className="dm-community-error" role="alert">{error}</p> : null}
        <div className="dm-community-comment-list">
          {comments.length ? comments.map((item) => <article key={item.id}><span className="dm-community-anonymous-avatar" aria-hidden="true">익</span><div><p><strong>{item.authorLabel}</strong>{item.mine ? <b>내 댓글</b> : null}<time>{communityDate(item.createdAt, true)}</time></p><div>{item.content}</div></div></article>) : <div className="dm-community-empty-comment">첫 댓글을 남겨보세요.</div>}
        </div>
      </section> : null}
    </div>;
  }

  return <div className="dm-community-page">
    <section className="dm-community-hero">
      <div><span>{board === "notice" ? "DANGMO NOTICE" : "DANGMO BAMBOO"}</span><h2>{board === "notice" ? "당모의 새로운 소식과 이용 안내" : "혼자 품고 있던 창업 고민을 익명으로 나눠보세요."}</h2><p>{board === "notice" ? "서비스 업데이트와 꼭 확인해야 할 내용을 전해드립니다." : "사업 아이템, 지원사업 준비와 서류 작성 과정의 경험을 편하게 나누는 공간입니다."}</p></div>
      {board === "bamboo" ? <button className="dm-primary-button" type="button" onClick={() => setComposeOpen((open) => !open)}>{composeOpen ? "작성 닫기" : "＋ 글쓰기"}</button> : null}
    </section>

    {composeOpen && board === "bamboo" ? <form className="dm-community-compose" onSubmit={submitPost}>
      <div><span className="dm-badge">익명 작성</span><h2>대나무숲에 이야기 남기기</h2><p>이름과 이메일은 다른 사용자에게 표시되지 않습니다.</p></div>
      <label><span>제목</span><input value={title} maxLength={120} placeholder="어떤 이야기를 나누고 싶나요?" onChange={(event) => setTitle(event.target.value)} /></label>
      <label><span>내용</span><textarea value={content} maxLength={5_000} rows={9} placeholder="상황과 고민을 편하게 적어주세요. 개인정보와 연락처는 제외해주세요." onChange={(event) => setContent(event.target.value)} /></label>
      <div className="dm-community-compose-actions"><small>{content.length.toLocaleString("ko-KR")} / 5,000자</small><button className="dm-button" type="button" onClick={() => setComposeOpen(false)}>취소</button><button className="dm-primary-button" type="submit" disabled={!title.trim() || !content.trim() || status === "saving"}>{status === "saving" ? "게시 중…" : "익명으로 게시하기"}</button></div>
      {error ? <p className="dm-community-error" role="alert">{error}</p> : null}
    </form> : null}

    <section className="dm-community-list" aria-live="polite">
      {status === "loading" ? <div className="dm-community-loading">게시글을 불러오는 중…</div> : null}
      {status === "error" && !composeOpen ? <div className="dm-community-loading is-error">{error}<button className="dm-button" type="button" onClick={() => void loadPosts()}>다시 불러오기</button></div> : null}
      {status !== "loading" && posts.length ? posts.map((post) => <button className="dm-community-card" type="button" key={post.id} onClick={() => void openPost(post.id)}>
        <span className="dm-community-card-top"><span>{board === "notice" ? "공지" : "익명"}</span>{post.pinned ? <b>고정</b> : null}</span>
        <strong>{post.title}</strong>
        <p>{post.excerpt}</p>
        <span className="dm-community-card-meta"><b>{post.authorLabel}</b><time>{communityDate(post.createdAt)}</time><span>댓글 {post.commentCount}</span><span>조회 {post.viewCount}</span><em>읽어보기 →</em></span>
      </button>) : null}
      {status === "ready" && !posts.length ? <div className="dm-community-loading"><strong>{board === "notice" ? "등록된 공지사항이 없습니다." : "아직 작성된 이야기가 없습니다."}</strong><span>{board === "bamboo" ? "첫 번째 이야기를 편하게 남겨보세요." : "새 소식이 등록되면 이곳에서 알려드릴게요."}</span></div> : null}
    </section>
    {board === "bamboo" ? <p className="dm-community-policy">대나무숲은 로그인 사용자만 이용할 수 있으며, 모든 글과 댓글은 익명으로 표시됩니다. 개인정보·광고·비방·권리 침해 내용은 운영 정책에 따라 제한될 수 있습니다.</p> : null}
  </div>;
}

function MatchView({ navigate, profileAnalysis, announcements, total, pagination, loading, onPageChange, onDetail }: { navigate: (view: View, tab?: ProfileTab) => void; profileAnalysis: BusinessProfileAnalysis | null; announcements: Announcement[]; total: number; pagination: AnnouncementFeedPayload["pagination"]; loading: boolean; onPageChange: (page: number) => Promise<void>; onDetail: (announcement: Announcement) => void }) {
  const profileLabel = profileAnalysis
    ? `${profileAnalysis.keywords.slice(0, 3).join(" · ")} · 근거 ${profileAnalysis.evidence.length}건 반영`
    : "기본 프로필만 반영 중입니다. AI 사업 프로필을 승인하면 추천 근거가 정교해져요.";
  const eligibleCount = announcements.filter((announcement) => announcement.eligibilityStatus === "eligible").length;
  const reviewCount = announcements.filter((announcement) => announcement.eligibilityStatus === "review").length;
  const strongCount = announcements.filter((announcement) => announcement.eligibilityStatus !== "ineligible" && announcement.score >= 85).length;
  return (
    <div className="dm-view-stack dm-match-page">
      <section className="dm-match-summary">
        <div className="dm-section-head">
          <div><span className="dm-match-kicker">실시간 추천 현황</span><h2>추천 공고 <strong>{total.toLocaleString("ko-KR")}건</strong></h2><p>마감 전 공고 중 내 사업과의 적합도가 {MIN_RECOMMENDATION_SCORE}% 이상인 결과만 모았습니다.</p></div>
          <button className="dm-button" type="button" onClick={() => navigate("profile", "logic")}>추천 기준 관리</button>
        </div>
        <div className="dm-match-metrics" aria-label="맞춤 추천 요약">
          <div><span>자격 충족</span><strong>{eligibleCount.toLocaleString("ko-KR")}건</strong><small>바로 상세 검토할 공고</small></div>
          <div><span>추가 확인 필요</span><strong>{reviewCount.toLocaleString("ko-KR")}건</strong><small>증빙·세부 조건 확인</small></div>
          <div><span>강력 추천</span><strong>{strongCount.toLocaleString("ko-KR")}건</strong><small>적합도 85점 이상</small></div>
          <div><span>추천 기준</span><strong>{profileAnalysis ? "AI 사업 프로필" : "기본 프로필"}</strong><small>{profileLabel}</small></div>
        </div>
      </section>
      <section className="dm-match-results">
        <div className="dm-match-results-head"><div><h2>전체 추천 결과</h2><p>적합도 {MIN_RECOMMENDATION_SCORE}% 이상 공고를 자격 판정과 점수 순으로 정렬했습니다.</p></div><span>{pagination.total ? `${((pagination.page - 1) * pagination.pageSize) + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} / ${pagination.total.toLocaleString("ko-KR")}건` : "0건"}</span></div>
        <div className="dm-placeholder dm-match-list" aria-busy={loading}>
          {announcements.length ? announcements.map((announcement, index) => <RecommendationRow key={announcement.id} title={announcement.title} meta={`${announcement.institution} · ${announcement.region} · ${announcement.dday} · ${announcement.support}`} badge={announcement.eligibilityStatus === "eligible" ? "자격 충족" : announcement.eligibilityStatus === "ineligible" ? "자격 불일치" : "확인 필요"} reason={announcement.scoreBreakdown ? `사업목적 ${announcement.scoreBreakdown.purpose}/40 · 성장단계 ${announcement.scoreBreakdown.stage}/25 · 실행역량 ${announcement.scoreBreakdown.capability}/20` : reasonText(announcement)} score={`${announcement.score}% · ${announcement.score >= 85 ? "강력 추천" : "추천"}`} primary={index === 0 && announcement.eligibilityStatus !== "ineligible"} onClick={() => onDetail(announcement)} />) : loading ? <div className="dm-empty-row">저장된 추천 결과를 불러오는 중…</div> : <div className="dm-empty-row">적합도 {MIN_RECOMMENDATION_SCORE}% 이상인 마감 전 공고가 아직 없습니다. 프로필을 보완하거나 전체 공고 업데이트 후 다시 확인해주세요.</div>}
        </div>
        {pagination.totalPages > 1 ? <nav className="dm-feed-pagination" aria-label="맞춤 추천 페이지"><button type="button" disabled={loading || pagination.page === 1} onClick={() => void onPageChange(pagination.page - 1)}>이전</button>{Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((page) => <button className={page === pagination.page ? "is-current" : ""} type="button" disabled={loading} aria-current={page === pagination.page ? "page" : undefined} key={page} onClick={() => void onPageChange(page)}>{page}</button>)}<button type="button" disabled={loading || pagination.page === pagination.totalPages} onClick={() => void onPageChange(pagination.page + 1)}>다음</button></nav> : null}
      </section>
    </div>
  );
}

function GuestMatchView({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="dm-match-guest">
      <section className="dm-match-guest-panel" aria-labelledby="guest-match-title">
        <span className="dm-match-guest-icon" aria-hidden="true">✦</span>
        <div className="dm-match-guest-copy">
          <span>나만을 위한 지원사업 추천</span>
          <h2 id="guest-match-title">내 사업과 딱 맞는 공고만<br />빠르게 골라보세요.</h2>
          <p>로그인하면 창업연차·업종·지역과 AI 사업 프로필을 기준으로<br />현재 모집 중인 공고의 자격과 적합도를 개인별로 계산해드려요.</p>
        </div>
        <div className="dm-match-guest-benefits" aria-label="맞춤 추천 주요 기능">
          <div><b>01</b><strong>자격조건 먼저 확인</strong><span>신청 가능한 공고부터 살펴봐요.</span></div>
          <div><b>02</b><strong>추천 근거까지 제공</strong><span>왜 잘 맞는지 항목별로 확인해요.</span></div>
          <div><b>03</b><strong>준비 일정까지 연결</strong><span>저장 후 D-day와 작성 현황을 관리해요.</span></div>
        </div>
        <div className="dm-match-guest-actions">
          <button className="dm-primary-button dm-login-entry" type="button" onClick={onLogin}>로그인하고 맞춤 추천 시작</button>
        </div>
        <small>공고 전체보기는 로그인 없이도 이용할 수 있어요.</small>
      </section>
    </div>
  );
}

function RecommendationRow({ title, meta, badge, reason, score, primary, onClick }: { title: string; meta: string; badge: string; reason: string; score: string; primary?: boolean; onClick?: () => void }) {
  return <article className="dm-placeholder-row dm-recommendation-row"><div><strong>{title}</strong><p className="dm-recommendation-meta">{meta}</p><div className="dm-match-reasons"><span className="dm-badge">{badge}</span><small><b>추천 근거</b>{reason}</small></div></div><div className="dm-recommendation-score"><span>프로필 적합도</span><strong className="dm-match-score">{score}</strong></div><button className={primary ? "dm-primary-button" : "dm-button"} type="button" onClick={onClick}>{primary ? "준비 시작" : "상세 보기"}</button></article>;
}

const practiceUpdatedLabel = (value: string) => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "최근 수정";
};

function PracticeNameForm({ initialName, label, submitLabel, onSubmit, onCancel }: { initialName: string; label: string; submitLabel: string; onSubmit: (name: string) => void; onCancel?: () => void }) {
  const [name, setName] = useState(initialName);
  return <form className="dm-practice-name-form" onSubmit={(event) => { event.preventDefault(); const nextName = name.trim(); if (nextName) onSubmit(nextName); }}><label><span>{label}</span><input autoFocus value={name} maxLength={40} onChange={(event) => setName(event.target.value)} placeholder="연습 카드 이름을 입력하세요" /></label><div><button className="dm-primary-button" type="submit" disabled={!name.trim()}>{submitLabel}</button>{onCancel ? <button className="dm-button" type="button" onClick={onCancel}>취소</button> : null}</div></form>;
}

function ProjectWorkspaceLibrary({ projects, mode, openWorkspace, navigate }: { projects: SavedProject[]; mode: "budget" | "writing"; openWorkspace: (project: SavedProject, view: "budget" | "writing") => Promise<void>; navigate: (view: View) => void }) {
  const budgetMode = mode === "budget";
  const title = budgetMode ? "사업별 사업비 편성안" : "사업별 서류작성 AI";
  const description = budgetMode
    ? "저장한 공고마다 별도의 편성안이 만들어집니다. 카드를 열어 해당 사업의 세목과 금액만 수정하세요."
    : "저장한 공고마다 별도의 서류 초안이 만들어집니다. 카드를 열어 해당 사업의 작성 항목과 AI 기록을 이어가세요.";
  return <section className="dm-practice-library dm-project-workspace-library"><div className="dm-section-head"><div><h2>{title} {projects.length}개</h2><p>{description}</p></div><button className="dm-button" type="button" onClick={() => navigate("explore")}>＋ 공고 더 찾기</button></div>{projects.length ? <div className="dm-practice-card-grid">{projects.map((project) => { const completed = project.checklistItems.filter((item) => project.checklist[item.id]).length; const progressLabel = budgetMode ? (project.checklist.budget ? "편성안 작성됨" : "편성 전") : (project.checklist.draft ? "초안 작성됨" : "작성 전"); return <article className="dm-practice-card dm-project-workspace-card" key={`${mode}-${project.id}`}><button className="dm-practice-card-open" type="button" onClick={() => void openWorkspace(project, mode)} aria-label={`${project.title} ${budgetMode ? "사업비 편성안" : "서류 초안"} 열기`}><span className="dm-practice-card-icon" aria-hidden="true">{budgetMode ? "∑" : "✎"}</span><span className="dm-practice-card-content"><span><b>{project.title}</b><small>{project.institution} · {project.region}</small></span><strong>{progressLabel}</strong><small>{project.dday} · 준비 단계 {completed}/{project.checklistItems.length} · {project.support}</small></span><span className="dm-practice-card-enter">{budgetMode ? "편성하기" : "작성하기"} →</span></button></article>; })}</div> : <div className="dm-empty"><strong>연결할 사업이 아직 없어요.</strong><p>지원사업 탐색에서 공고를 저장하면 이곳에 사업별 카드가 자동으로 만들어집니다.</p><button className="dm-primary-button" type="button" onClick={() => navigate("explore")}>공고 탐색하기</button></div>}</section>;
}

function BudgetPracticeLanding({ workspaces, start, open, rename, clear, navigate, guestMode }: { workspaces: PracticeBudgetWorkspace[]; start: (name: string) => void; open: (workspaceId: string) => void; rename: (workspaceId: string, name: string) => void; clear: (workspaceId: string) => void; navigate: (view: View) => void; guestMode: boolean }) {
  const [creating, setCreating] = useState(workspaces.length === 0);
  const [renamingId, setRenamingId] = useState("");
  if (!workspaces.length) return <div className="dm-empty dm-budget-practice-empty"><span className="dm-budget-practice-icon" aria-hidden="true">∑</span><strong>공고 없이 사업비를 먼저 편성해볼 수 있어요.</strong><p>서로 다른 목적의 연습 카드를 여러 개 만들고, 지원금·현금 부담금·현물 부담금의 구성을 자유롭게 비교해보세요.<br />{guestMode ? "게스트 연습은 현재 탭에서만 유지되며, 사이트를 나가거나 새로고침하면 삭제됩니다." : "연습 데이터는 이 브라우저에 보관되며 카드별로 이어서 작성하거나 삭제할 수 있습니다."}</p><PracticeNameForm initialName="사업비 연습 1" label="첫 연습 카드 이름" submitLabel="연습 카드 만들기" onSubmit={start} /><button className="dm-button dm-practice-find-button" type="button" onClick={() => navigate("explore")}>실제 공고 찾기</button></div>;
  return <div className="dm-practice-library"><div className="dm-section-head"><div><h2>사업비 연습 카드 {workspaces.length}개</h2><p>{guestMode ? "게스트 작성 내용은 이 탭을 닫거나 새로고침하면 삭제됩니다." : "목적별로 연습 카드를 만들고, 카드를 선택해 마지막 편성안을 이어서 작성하세요."}</p></div><div className="dm-inline-actions"><button className="dm-primary-button" type="button" onClick={() => setCreating(true)}>＋ 새 연습 만들기</button><button className="dm-button" type="button" onClick={() => navigate("explore")}>실제 공고 찾기</button></div></div>{creating ? <PracticeNameForm key={`budget-create-${workspaces.length}`} initialName={`사업비 연습 ${workspaces.length + 1}`} label="새 사업비 연습 카드 이름" submitLabel="만들고 시작" onSubmit={start} onCancel={() => setCreating(false)} /> : null}<div className="dm-practice-card-grid">{workspaces.map((workspace) => { const assignedTotal = workspace.items.reduce((sum, item) => sum + item.amount, 0); const enteredCount = workspace.items.filter((item) => item.amount > 0).length; const balance = workspace.totalBudget - assignedTotal; return <article className="dm-practice-card" key={workspace.id}><button className="dm-practice-card-open" type="button" onClick={() => open(workspace.id)} aria-label={`${workspace.name} 이어서 열기`}><span className="dm-practice-card-icon" aria-hidden="true">∑</span><span className="dm-practice-card-content"><span><b>{workspace.name}</b><small>{guestMode ? "게스트 임시 저장" : "브라우저 자동 저장"}</small></span><strong>편성 {formatWon(assignedTotal)} / 총 {formatWon(workspace.totalBudget)}</strong><small>잔액 {formatWon(balance)} · 입력 세목 {enteredCount}/{workspace.items.length}개 · 최근 수정 {practiceUpdatedLabel(workspace.updatedAt)}</small></span><span className="dm-practice-card-enter">이어하기 →</span></button><div className="dm-practice-card-actions"><button className="dm-button" type="button" onClick={() => setRenamingId(workspace.id)}>이름 변경</button><button className="dm-danger-outline" type="button" onClick={() => clear(workspace.id)}>삭제</button></div>{renamingId === workspace.id ? <PracticeNameForm key={`budget-rename-${workspace.id}`} initialName={workspace.name} label="사업비 연습 카드 이름" submitLabel="이름 저장" onSubmit={(name) => { rename(workspace.id, name); setRenamingId(""); }} onCancel={() => setRenamingId("")} /> : null}</article>; })}</div></div>;
}

function WritingPracticeLanding({ workspaces, start, open, rename, clear, navigate, guestMode }: { workspaces: PracticeWritingWorkspace[]; start: (name: string) => void; open: (workspaceId: string) => void; rename: (workspaceId: string, name: string) => void; clear: (workspaceId: string) => void; navigate: (view: View) => void; guestMode: boolean }) {
  const [creating, setCreating] = useState(workspaces.length === 0);
  const [renamingId, setRenamingId] = useState("");
  if (!workspaces.length) return <div className="dm-empty dm-budget-practice-empty dm-writing-practice-empty"><span className="dm-budget-practice-icon" aria-hidden="true">✎</span><strong>공고 없이 사업계획서 구조를 먼저 연습할 수 있어요.</strong><p>아이템이나 공고 유형별로 여러 초안 카드를 만들고, 공통 대주제 6개를 바탕으로 각각 작성해보세요.<br />{guestMode ? "게스트 연습은 현재 탭에서만 유지되며, 사이트를 나가거나 새로고침하면 삭제됩니다." : "연습 내용은 이 브라우저에 자동 보관되며 카드별로 이어서 작성하거나 삭제할 수 있습니다."}</p><PracticeNameForm initialName="서류작성 연습 1" label="첫 연습 카드 이름" submitLabel="연습 카드 만들기" onSubmit={start} /><button className="dm-button dm-practice-find-button" type="button" onClick={() => navigate("explore")}>실제 공고 찾기</button></div>;
  return <div className="dm-practice-library"><div className="dm-section-head"><div><h2>서류작성 연습 카드 {workspaces.length}개</h2><p>{guestMode ? "게스트 작성 내용은 이 탭을 닫거나 새로고침하면 삭제됩니다." : "아이템이나 목적별 초안을 나누어 만들고, 카드를 선택해 이어서 작성하세요."}</p></div><div className="dm-inline-actions"><button className="dm-primary-button" type="button" onClick={() => setCreating(true)}>＋ 새 연습 만들기</button><button className="dm-button" type="button" onClick={() => navigate("explore")}>실제 공고 찾기</button></div></div>{creating ? <PracticeNameForm key={`writing-create-${workspaces.length}`} initialName={`서류작성 연습 ${workspaces.length + 1}`} label="새 서류작성 연습 카드 이름" submitLabel="만들고 시작" onSubmit={start} onCancel={() => setCreating(false)} /> : null}<div className="dm-practice-card-grid">{workspaces.map((workspace) => { const completed = workspace.sections.filter((section) => section.content.trim()).length; return <article className="dm-practice-card" key={workspace.id}><button className="dm-practice-card-open" type="button" onClick={() => open(workspace.id)} aria-label={`${workspace.name} 이어서 열기`}><span className="dm-practice-card-icon" aria-hidden="true">✎</span><span className="dm-practice-card-content"><span><b>{workspace.name}</b><small>{guestMode ? "게스트 임시 저장" : "브라우저 자동 저장"}</small></span><strong>작성 완료 {completed}/{workspace.sections.length}</strong><small>대주제 {workspace.sections.length}개 · 최근 수정 {practiceUpdatedLabel(workspace.updatedAt)}</small></span><span className="dm-practice-card-enter">이어쓰기 →</span></button><div className="dm-practice-card-actions"><button className="dm-button" type="button" onClick={() => setRenamingId(workspace.id)}>이름 변경</button><button className="dm-danger-outline" type="button" onClick={() => clear(workspace.id)}>삭제</button></div>{renamingId === workspace.id ? <PracticeNameForm key={`writing-rename-${workspace.id}`} initialName={workspace.name} label="서류작성 연습 카드 이름" submitLabel="이름 저장" onSubmit={(name) => { rename(workspace.id, name); setRenamingId(""); }} onCancel={() => setRenamingId("")} /> : null}</article>; })}</div></div>;
}

function ProjectsView({ projects, updateChecklist, openWorkspace, navigate }: { projects: SavedProject[]; updateChecklist: (projectId: string, key: keyof ProjectChecklist) => Promise<void>; openWorkspace: (project: SavedProject, view: "budget" | "writing") => Promise<void>; navigate: (view: View) => void }) {
  const preparingCount = projects.filter((project) => project.status !== "completed").length;
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const toggleProject = (projectId: string) => setExpandedProjects((current) => current.includes(projectId)
    ? current.filter((id) => id !== projectId)
    : [...current, projectId]);
  return (
    <div className="dm-view-stack">
      <div className="dm-section-head">
        <div><h2>준비 중인 공고 {preparingCount}개</h2><p>저장한 공고마다 확인·사업비·서류작성·제출 현황을 이어서 관리해요.</p></div>
        <button className="dm-button" type="button" onClick={() => navigate("explore")}>＋ 공고 더 찾기</button>
      </div>
      {projects.length ? (
        <div className="dm-project-grid">
          {projects.map((project) => {
            const expanded = expandedProjects.includes(project.id);
            const completedSteps = project.checklistItems.filter((item) => project.checklist[item.id]).length;
            const nextStep = project.checklistItems.find((item) => !project.checklist[item.id]);
            const detailsId = `project-details-${project.id}`;
            return (
              <article className={expanded ? "dm-project-card is-expanded" : "dm-project-card"} key={project.id}>
                <div className="dm-project-summary-row">
                  <div className="dm-project-summary-main">
                    <div className="dm-project-card-head">
                      <div><span className="dm-badge">{project.dday}</span><span className="dm-detail-category">{project.category}</span><span className={`dm-project-status is-${project.status}`}>{project.status === "completed" ? "준비 완료" : project.status === "preparing" ? "준비 중" : "저장됨"}</span></div>
                    </div>
                    <div className="dm-project-title">
                      <p>{project.institution} · {project.region}</p>
                      <h3>{project.title}</h3>
                      <span>{project.support} · {project.deadline}</span>
                    </div>
                  </div>
                  <div className="dm-project-summary-side">
                    <span><strong>{completedSteps}/{project.checklistItems.length}</strong> 단계 완료</span>
                    <button className="dm-project-toggle" type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={() => toggleProject(project.id)}>
                      <span>{expanded ? "접기" : "펼치기"}</span><b aria-hidden="true">⌄</b>
                    </button>
                  </div>
                </div>
                {expanded ? (
                  <div className="dm-project-accordion" id={detailsId}>
                    <section className="dm-project-progress" aria-label={`준비 진행률 ${project.progress}%`}>
                      <div><span>준비 진행률 · {nextStep ? `다음 단계: ${nextStep.label}` : "모든 단계 완료"}</span><strong>{project.progress}%</strong></div>
                      <div className="dm-progress"><span style={{ width: `${project.progress}%` }} /></div>
                    </section>
                    <div className="dm-project-checklist" aria-label="준비 체크리스트">
                      {project.checklistItems.map((item, index) => (
                        <button className={project.checklist[item.id] ? "is-done" : ""} type="button" aria-pressed={Boolean(project.checklist[item.id])} key={item.id} onClick={() => void updateChecklist(project.id, item.id)}>
                          <span aria-hidden="true">{project.checklist[item.id] ? "✓" : index + 1}</span>{item.label}
                        </button>
                      ))}
                    </div>
                    <footer className="dm-project-actions">
                      <a className="dm-button" href={project.sourceUrl} target="_blank" rel="noreferrer">공고 원문 ↗</a>
                      <button className="dm-button" type="button" onClick={() => void openWorkspace(project, "budget")}>사업비 작성</button>
                      <button className="dm-primary-button" type="button" onClick={() => void openWorkspace(project, "writing")}>서류 작성</button>
                    </footer>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="dm-empty"><strong>저장한 공고가 아직 없어요.</strong><p>지원사업 탐색에서 관심 공고를 저장하면 준비 체크리스트가 만들어집니다.</p><button className="dm-primary-button" type="button" onClick={() => navigate("explore")}>공고 탐색하기</button></div>
      )}
    </div>
  );
}

function BudgetView({ projectTitle, rules, items, addItem, updateItem, removeItem, save, totalBudgetTarget, allocationTargets, updateTargets, practice = false, guestMode = false, close, reset, clear }: { projectTitle: string; rules: BudgetRules; items: BudgetItem[]; addItem: (source: BudgetSource) => void; updateItem: (id: string, patch: Partial<BudgetItem>) => void; removeItem: (id: string) => void; save?: () => void; totalBudgetTarget?: number; allocationTargets?: BudgetAllocationTargets; updateTargets?: (patch: { totalBudget?: number; allocationTargets?: Partial<BudgetAllocationTargets> }) => void; practice?: boolean; guestMode?: boolean; close?: () => void; reset?: () => void; clear?: () => void }) {
  const sums = { support: 0, cash: 0, inkind: 0 };
  items.forEach((item) => { sums[item.source] += item.amount; });
  const assignedTotal = sums.support + sums.cash + sums.inkind;
  const plannedTotal = practice ? totalBudgetTarget ?? 0 : assignedTotal;
  const plannedAllocations = practice ? allocationTargets ?? emptyBudgetAllocationTargets() : sums;
  const allocationTotal = plannedAllocations.support + plannedAllocations.cash + plannedAllocations.inkind;
  const allocationBalance = plannedTotal - allocationTotal;
  const sourceLabels: Record<BudgetSource, string> = { support: "지원금", cash: "현금 부담금", inkind: "현물 부담금" };
  const overAllocatedSources = (["support", "cash", "inkind"] as BudgetSource[])
    .filter((source) => sums[source] > plannedAllocations[source]);
  const violations: string[] = [];
  if (rules.supportMaxRatio !== null && ratio(sums.support, assignedTotal) > rules.supportMaxRatio + 0.001) violations.push(`지원금 ${ratio(sums.support, assignedTotal).toFixed(1)}%`);
  if (rules.cashMinRatio !== null && assignedTotal > 0 && ratio(sums.cash, assignedTotal) + 0.001 < rules.cashMinRatio) violations.push(`현금 ${ratio(sums.cash, assignedTotal).toFixed(1)}%`);
  if (rules.inkindMaxRatio !== null && ratio(sums.inkind, assignedTotal) > rules.inkindMaxRatio + 0.001) violations.push(`현물 ${ratio(sums.inkind, assignedTotal).toFixed(1)}%`);
  const ruleSummary = [
    rules.supportMaxRatio !== null ? `지원금 ${rules.supportMaxRatio}% 이하` : null,
    rules.cashMinRatio !== null ? `현금 ${rules.cashMinRatio}% 이상` : null,
    rules.inkindMaxRatio !== null ? `현물 ${rules.inkindMaxRatio}% 이하` : null,
  ].filter(Boolean).join(" / ");

  const allocationStatus = plannedTotal <= 0
    ? "총 사업비와 재원별 배정액을 먼저 입력해주세요."
    : allocationBalance < 0
      ? `총 사업비보다 ${formatWon(Math.abs(allocationBalance))} 초과 배정됐습니다.`
      : overAllocatedSources.length
        ? `${overAllocatedSources.map((source) => sourceLabels[source]).join("·")} 세목 편성액이 재원 배정액을 초과했습니다.`
      : allocationBalance > 0
        ? `재원에 아직 배정하지 않은 금액이 ${formatWon(allocationBalance)} 남았습니다.`
        : "총 사업비 전액을 재원별로 배정했습니다.";
  const hasPracticeOverage = allocationBalance < 0 || overAllocatedSources.length > 0;

  return (
    <div className="dm-view-stack">
      <div className="dm-section-head">
        <div><h2>{projectTitle} 편성안 <span className="dm-free-label">{practice ? "연습" : "무료"}</span></h2><p>{practice ? "총 사업비와 재원별 목표액을 먼저 정한 뒤, 세목별 사용액과 남은 금액을 확인하세요." : "재원별 세목을 입력하면 총사업비 대비 비율과 공고 기준을 자동으로 확인해요."}</p></div>
        <div className="dm-budget-head-actions">{practice ? <><button className="dm-button" type="button" onClick={close}>← 연습 목록</button><button className="dm-button" type="button" onClick={reset}>프리셋 다시 불러오기</button><button className="dm-danger-outline" type="button" onClick={clear}>연습 종료·전체 삭제</button></> : <><button className="dm-button" type="button" onClick={close}>← 편성안 목록</button><button className="dm-primary-button" type="button" onClick={save}>편성안 저장</button></>}</div>
      </div>
      <section className="dm-budget" aria-label="사업비 편성 계산기">
        {practice ? <div className="dm-budget-practice-banner"><strong>{guestMode ? "게스트 연습 모드" : "연습용 프리셋"}</strong><span>{guestMode ? "작성 내용은 현재 탭에서만 유지되며, 사이트를 나가거나 새로고침하면 삭제됩니다." : "고정 비율 없이 총액과 재원별 목표액을 자유롭게 정할 수 있습니다."}</span></div> : null}
        {practice && updateTargets ? (
          <section className="dm-budget-target-panel" aria-labelledby="budget-target-title">
            <div className="dm-budget-target-title"><span>01</span><div><strong id="budget-target-title">편성 기준 금액 설정</strong><small>총 사업비와 지원금·부담금의 배정 목표액을 입력하세요.</small></div></div>
            <div className="dm-budget-target-grid">
              <BudgetTargetField label="총 사업비" value={plannedTotal} helper="전체 편성 한도" onChange={(value) => updateTargets({ totalBudget: value })} />
              <BudgetTargetField label="지원금 배정액" value={plannedAllocations.support} helper={`${ratio(plannedAllocations.support, plannedTotal).toFixed(1)}%`} onChange={(value) => updateTargets({ allocationTargets: { support: value } })} />
              <BudgetTargetField label="현금 부담금 배정액" value={plannedAllocations.cash} helper={`${ratio(plannedAllocations.cash, plannedTotal).toFixed(1)}%`} onChange={(value) => updateTargets({ allocationTargets: { cash: value } })} />
              <BudgetTargetField label="현물 부담금 배정액" value={plannedAllocations.inkind} helper={`${ratio(plannedAllocations.inkind, plannedTotal).toFixed(1)}%`} onChange={(value) => updateTargets({ allocationTargets: { inkind: value } })} />
            </div>
            <div className={allocationBalance < 0 ? "dm-budget-target-balance is-over" : "dm-budget-target-balance"}><span>재원 배정 합계 <strong>{formatWon(allocationTotal)}</strong></span><span>{allocationBalance < 0 ? "초과 배정" : "미배정 잔액"} <strong>{formatWon(Math.abs(allocationBalance))}</strong></span></div>
          </section>
        ) : null}
        <div className="dm-budget-overview">
          <BudgetStat label="총 사업비" value={formatWon(plannedTotal)} caption={practice ? `세목 편성 ${formatWon(assignedTotal)}` : undefined} />
          <BudgetStat label="지원금" value={formatWon(plannedAllocations.support)} percentage={ratio(plannedAllocations.support, plannedTotal)} caption={practice ? `세목 편성 ${formatWon(sums.support)}` : undefined} />
          <BudgetStat label="현금 부담금" value={formatWon(plannedAllocations.cash)} percentage={ratio(plannedAllocations.cash, plannedTotal)} caption={practice ? `세목 편성 ${formatWon(sums.cash)}` : undefined} />
          <BudgetStat label="현물 부담금" value={formatWon(plannedAllocations.inkind)} percentage={ratio(plannedAllocations.inkind, plannedTotal)} caption={practice ? `세목 편성 ${formatWon(sums.inkind)}` : undefined} />
        </div>
        <div className={practice ? hasPracticeOverage ? "dm-budget-check is-error" : "dm-budget-check" : !rules.confirmed ? "dm-budget-check is-review" : violations.length ? "dm-budget-check is-error" : "dm-budget-check"}>{practice ? allocationStatus : !rules.confirmed ? rules.note : violations.length ? `기준 확인 필요 · ${violations.join(" · ")}` : `공고 기준 충족 · ${ruleSummary}`}</div>
        <div className="dm-budget-categories"><span>추천 세목</span>{rules.allowedCategories.map((category) => <small key={category}>{category}</small>)}</div>
        <div className="dm-budget-grid-head" aria-hidden="true"><span>비목</span><span>세목·산출근거</span><span>금액</span><span>총사업비 비율</span><span /></div>
        {(["support", "cash", "inkind"] as BudgetSource[]).map((source) => <BudgetGroup key={source} source={source} items={items.filter((item) => item.source === source)} total={plannedTotal} allocationTarget={plannedAllocations[source]} showBalance={practice} addItem={addItem} updateItem={updateItem} removeItem={removeItem} />)}
      </section>
    </div>
  );
}

function BudgetTargetField({ label, value, helper, onChange }: { label: string; value: number; helper: string; onChange: (value: number) => void }) {
  return <label className="dm-budget-target-field"><span>{label}<small>{helper}</small></span><div><input inputMode="numeric" value={value.toLocaleString("ko-KR")} onFocus={(event) => event.currentTarget.select()} onChange={(event) => onChange(Number(event.target.value.replace(/[^0-9]/g, "")) || 0)} /><b>원</b></div></label>;
}

function BudgetStat({ label, value, percentage, caption }: { label: string; value: string; percentage?: number; caption?: string }) {
  return <div className="dm-budget-stat"><div className="dm-budget-stat-head"><span>{label}</span>{percentage !== undefined ? <small>{percentage.toFixed(1)}%</small> : null}</div><strong>{value}</strong>{caption ? <em>{caption}</em> : null}</div>;
}

function BudgetGroup({ source, items, total, allocationTarget, showBalance, addItem, updateItem, removeItem }: { source: BudgetSource; items: BudgetItem[]; total: number; allocationTarget: number; showBalance: boolean; addItem: (source: BudgetSource) => void; updateItem: (id: string, patch: Partial<BudgetItem>) => void; removeItem: (id: string) => void }) {
  const labels: Record<BudgetSource, string> = { support: "지원금", cash: "현금 부담금", inkind: "현물 부담금" };
  const assigned = items.reduce((sum, item) => sum + item.amount, 0);
  const balance = allocationTarget - assigned;
  return <section className="dm-budget-group"><div className="dm-budget-group-head"><div className="dm-budget-group-summary"><strong>{labels[source]}</strong>{showBalance ? <small>편성 {formatWon(assigned)} / 배정 {formatWon(allocationTarget)} <b className={balance < 0 ? "is-over" : ""}>{balance < 0 ? "초과" : "잔액"} {formatWon(Math.abs(balance))}</b></small> : null}</div><button className="dm-button" type="button" onClick={() => addItem(source)}>＋ 세목 추가</button></div>{showBalance ? <div className="dm-budget-group-progress" aria-label={`${labels[source]} 편성률 ${ratio(assigned, allocationTarget).toFixed(0)}%`}><span className={balance < 0 ? "is-over" : ""} style={{ width: `${Math.min(100, ratio(assigned, allocationTarget))}%` }} /></div> : null}<div className="dm-budget-rows">{items.map((item, index) => { const balanceAfterItem = allocationTarget - items.slice(0, index + 1).reduce((sum, current) => sum + current.amount, 0); return <div className="dm-budget-row-wrap" key={item.id}><div className="dm-budget-row"><label><span className="sr-only">비목</span><input value={item.category} placeholder="예: 인건비" onChange={(event) => updateItem(item.id, { category: event.target.value })} /></label><label><span className="sr-only">세목 및 산출근거</span><input value={item.name} placeholder="예: 300만원 × 100% × 5개월" onChange={(event) => updateItem(item.id, { name: event.target.value })} /></label><label><span className="sr-only">금액</span><input inputMode="numeric" value={item.amount.toLocaleString("ko-KR")} onFocus={(event) => event.currentTarget.select()} onChange={(event) => updateItem(item.id, { amount: Number(event.target.value.replace(/[^0-9]/g, "")) || 0 })} /></label><output>{ratio(item.amount, total).toFixed(1)}%</output><button className="dm-remove-row" type="button" aria-label={`${item.category || "세목"} 삭제`} onClick={() => removeItem(item.id)}>×</button></div>{showBalance ? <small className={balanceAfterItem < 0 ? "dm-budget-row-balance is-over" : "dm-budget-row-balance"}>입력 후 {labels[source]} 잔액 <strong>{formatWon(balanceAfterItem)}</strong></small> : null}</div>; })}</div></section>;
}

function WritingView({ projectTitle, sections, versions, updateSection, addSection, removeSection, credits = 0, runAi, aiRun = null, activeProfileSummary = "", restoreVersion, save, navigate, practice = false, guestMode = false, close, reset, clear }: { projectTitle: string; sections: DraftSection[]; versions: DraftRevision[]; updateSection: (id: string, patch: Partial<DraftSection>) => void; addSection: () => void; removeSection: (id: string) => void; credits?: number; runAi?: (sectionId: string, operation: AiDraftOperation) => void; aiRun?: { sectionId: string; operation: AiDraftOperation } | null; activeProfileSummary?: string; restoreVersion?: (revisionId: string) => void; save?: () => void; navigate?: (view: View, profileTab?: ProfileTab) => void; practice?: boolean; guestMode?: boolean; close?: () => void; reset?: () => void; clear?: () => void }) {
  const completed = sections.filter((section) => section.content.trim().length > 0).length;
  const progress = Math.round((completed / Math.max(1, sections.length)) * 100);
  const exportWord = () => {
    const html = `\ufeff${writingDocumentHtml(projectTitle, sections)}`;
    const url = URL.createObjectURL(new Blob([html], { type: "application/msword;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${projectTitle.replace(/[\\/:*?"<>|]/g, " ").trim() || "당모 사업계획서 초안"}.doc`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const exportPdf = () => {
    const popup = window.open("", "dangmo-writing-export");
    if (!popup) return;
    popup.opener = null;
    popup.document.open();
    popup.document.write(writingDocumentHtml(projectTitle, sections));
    popup.document.close();
    window.setTimeout(() => {
      popup.focus();
      popup.print();
    }, 250);
  };

  return (
    <div className="dm-writing-page">
      <section className="dm-writing-summary">
        <div>
          <span className="dm-badge">{practice ? "연습용 프리셋" : `작성 항목 ${sections.length}개`}</span>
          <h2>{practice ? "연습용 서류 초안" : `${projectTitle} 서류 초안`}</h2>
          <p>{practice ? "공통 사업계획서 대주제를 바탕으로 작성 구조와 내용을 자유롭게 연습해보세요." : "필요한 항목을 카드로 추가하고, 각 카드에서 AI 도움을 받을 수 있어요."}</p>
        </div>
        <div className="dm-writing-progress">
          <span>작성 완료 {completed}/{sections.length}</span>
          <div className="dm-progress"><span style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="dm-inline-actions">{practice ? <><button className="dm-button" type="button" onClick={close}>← 연습 목록</button><button className="dm-button" type="button" onClick={reset}>프리셋 다시 불러오기</button><button className="dm-danger-outline" type="button" onClick={clear}>연습 종료·전체 삭제</button></> : <><button className="dm-button" type="button" onClick={close}>← 서류 목록</button><span className="dm-badge">AI 크레딧 {credits}개</span><button className="dm-button" type="button" onClick={() => navigate?.("plan")}>충전</button><button className="dm-button" type="button" onClick={exportWord}>Word 내보내기</button><button className="dm-button" type="button" onClick={exportPdf}>PDF 저장·인쇄</button><button className="dm-primary-button" type="button" onClick={save}>전체 저장</button></>}</div>
      </section>

      {practice ? <section className="dm-writing-practice-banner"><strong>{guestMode ? "게스트 서류작성 연습" : "서류작성 연습 프리셋"}</strong><span>{guestMode ? "작성 내용은 현재 탭에서만 유지되며, 사이트를 나가거나 새로고침하면 삭제됩니다." : "입력 내용은 이 브라우저에 자동 보관됩니다. AI 보강과 버전 이력은 실제 공고를 저장한 뒤 사용할 수 있어요."}</span></section> : <section className="dm-writing-profile-context"><span>AI 작성 기준 프로필</span><strong>{activeProfileSummary || "기본 사업 정보"}</strong><button className="dm-button" type="button" onClick={() => navigate?.("profile", "business")}>프로필 변경</button></section>}

      {!practice ? <section className="dm-draft-history" aria-label="초안 버전 이력">
        <div><strong>버전 이력</strong><small>저장하거나 AI를 사용할 때마다 자동으로 기록돼요.</small></div>
        <div className="dm-draft-history-list">
          {versions.map((version, index) => (
            <button type="button" key={version.id} disabled={index === 0} onClick={() => restoreVersion?.(version.id)}>
              <strong>v{version.version}</strong>
              <span>{version.source === "ai" ? `AI ${version.operation ?? "작성"}` : version.source === "restore" ? "복원본" : "직접 저장"}</span>
              <small>{new Date(version.createdAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</small>
            </button>
          ))}
        </div>
      </section> : null}

      <div className="dm-writing-card-list">
        {sections.map((section, index) => (
          <article className="dm-writing-card" key={section.id}>
            <header className="dm-writing-card-head">
              <span className="dm-writing-card-number">{String(index + 1).padStart(2, "0")}</span>
              <label>
                <span>대주제</span>
                <input value={section.topic} onChange={(event) => updateSection(section.id, { topic: event.target.value })} />
              </label>
              <button className="dm-remove-row" type="button" aria-label={`${section.topic} 카드 삭제`} disabled={sections.length === 1} onClick={() => removeSection(section.id)}>×</button>
            </header>
            <label className="dm-writing-guide">
              <span>작성 가이드</span>
              <input value={section.guide} onChange={(event) => updateSection(section.id, { guide: event.target.value })} />
            </label>
            <label className="dm-field-label" htmlFor={`writing-${section.id}`}>내 초안</label>
            <textarea className="dm-writing-box" id={`writing-${section.id}`} rows={7} placeholder={`${section.topic}에 대한 내용을 자유롭게 작성하세요.`} value={section.content} onChange={(event) => updateSection(section.id, { content: event.target.value })} />
            <footer className="dm-writing-card-foot">
              <small>{section.content.length.toLocaleString("ko-KR")}자</small>
              {practice ? <span className="dm-writing-practice-ai-note">직접 작성 연습 · AI 보강은 실제 공고 준비에서 이용</span> : <div className="dm-writing-actions" aria-live="polite"><button className="dm-button" type="button" disabled={Boolean(aiRun)} aria-busy={aiRun?.sectionId === section.id && aiRun.operation === "polish"} onClick={() => runAi?.(section.id, "polish")}>{aiRun?.sectionId === section.id && aiRun.operation === "polish" ? "다듬는 중…" : "문장 다듬기 · 1"}</button><button className="dm-button" type="button" disabled={Boolean(aiRun)} aria-busy={aiRun?.sectionId === section.id && aiRun.operation === "evidence"} onClick={() => runAi?.(section.id, "evidence")}>{aiRun?.sectionId === section.id && aiRun.operation === "evidence" ? "근거 확인 중…" : "근거 보강 · 2"}</button><button className="dm-primary-button" type="button" disabled={Boolean(aiRun)} aria-busy={aiRun?.sectionId === section.id && aiRun.operation === "generate"} onClick={() => runAi?.(section.id, "generate")}>{aiRun?.sectionId === section.id && aiRun.operation === "generate" ? "초안 생성 중…" : "AI 초안 · 3"}</button></div>}
            </footer>
          </article>
        ))}
      </div>

      <button className="dm-add-writing-card" type="button" onClick={addSection}><span>＋</span><strong>대주제 카드 추가</strong><small>사업계획서 항목을 자유롭게 추가할 수 있어요</small></button>
    </div>
  );
}

function ProfileView({ tab, setTab, documents, documentUploadState, profileAnalysisRunState, profileAnalysisElapsedSeconds, addDocuments, removeDocument, analyzeProfile, profileSummary, basicProfile, profileAnalysis, profileReview, profileVersions, aiRuntime, updateReview, saveReview, approveReview, cancelReview, selectProfile, deleteProfile, saveBasicProfile, deleteOpen, setDeleteOpen, deleteConfirmation, setDeleteConfirmation, deleteAccount, navigate }: { tab: ProfileTab; setTab: (tab: ProfileTab) => void; documents: BusinessDocument[]; documentUploadState: DocumentUploadState; profileAnalysisRunState: ProfileAnalysisRunState; profileAnalysisElapsedSeconds: number; addDocuments: (files: FileList | null) => Promise<void>; removeDocument: (id: string) => Promise<void>; analyzeProfile: () => Promise<void>; profileSummary: string; basicProfile: BasicProfileData; profileAnalysis: BusinessProfileAnalysis | null; profileReview: BusinessProfileReview | null; profileVersions: ProfileVersionSummary[]; aiRuntime: AiRuntime; updateReview: (patch: Partial<BusinessProfileAnalysis>) => void; saveReview: () => Promise<void>; approveReview: () => Promise<void>; cancelReview: () => Promise<void>; selectProfile: (versionId: string) => Promise<void>; deleteProfile: (versionId: string) => Promise<void>; saveBasicProfile: (next: BasicProfileData) => Promise<void>; deleteOpen: boolean; setDeleteOpen: (value: boolean) => void; deleteConfirmation: string; setDeleteConfirmation: (value: string) => void; deleteAccount: () => void; navigate: (view: View) => void }) {
  const profileBadge = profileReview?.status === "draft" ? "검토 필요" : profileVersions.length ? `${profileVersions.length}개` : "연결됨";
  return (
    <div className="dm-profile-page">
      <nav className="dm-profile-tabs" aria-label="프로필 메뉴">
        <button className={tab === "basic" ? "is-selected" : ""} type="button" onClick={() => setTab("basic")}>기본 정보</button>
        <button className={tab === "business" ? "is-selected" : ""} type="button" onClick={() => setTab("business")}>AI 사업 프로필 <span className="dm-badge">{profileBadge}</span></button>
        <button className={tab === "logic" ? "is-selected" : ""} type="button" onClick={() => setTab("logic")}>추천 기준</button>
      </nav>
      {tab === "basic" ? <BasicProfile key={`${basicProfile.startupStatus}:${basicProfile.establishedAt}:${basicProfile.industryCode}:${basicProfile.industryDetailCode}:${basicProfile.region}`} profile={basicProfile} save={saveBasicProfile} /> : null}
      {tab === "business" ? (
        <BusinessProfile
          documents={documents}
          documentUploadState={documentUploadState}
          profileAnalysisRunState={profileAnalysisRunState}
          profileAnalysisElapsedSeconds={profileAnalysisElapsedSeconds}
          addDocuments={addDocuments}
          removeDocument={removeDocument}
          analyzeProfile={analyzeProfile}
          profileSummary={profileSummary}
          profileAnalysis={profileAnalysis}
          profileReview={profileReview}
          profileVersions={profileVersions}
          aiRuntime={aiRuntime}
          updateReview={updateReview}
          saveReview={saveReview}
          approveReview={approveReview}
          cancelReview={cancelReview}
          selectProfile={selectProfile}
          deleteProfile={deleteProfile}
          navigate={navigate}
        />
      ) : null}
      {tab === "logic" ? <RecommendationLogic /> : null}
      <AccountDeletionPanel deleteOpen={deleteOpen} setDeleteOpen={setDeleteOpen} confirmation={deleteConfirmation} setConfirmation={setDeleteConfirmation} deleteAccount={deleteAccount} />
    </div>
  );
}

function BasicProfile({ profile, save }: { profile: BasicProfileData; save: (next: BasicProfileData) => Promise<void> }) {
  const [draft, setDraft] = useState(profile);
  const [industryQuery, setIndustryQuery] = useState("");
  const age = startupAge(draft.startupStatus === "registered" ? draft.establishedAt : null);
  const selectedDivision = KSIC_DIVISIONS.find((item) => item.code === draft.industryCode) ?? KSIC_DIVISIONS.find((item) => item.code === "62")!;
  const normalizedQuery = industryQuery.trim().toLocaleLowerCase("ko-KR");
  const matchedDivisions = normalizedQuery
    ? KSIC_DIVISIONS.filter((item) => `${item.code} ${item.name} ${item.sectionName}`.toLocaleLowerCase("ko-KR").includes(normalizedQuery))
    : KSIC_DIVISIONS;
  const grouped = KSIC_DIVISIONS.reduce<Record<string, typeof KSIC_DIVISIONS>>((result, item) => {
    const key = `${item.section} · ${item.sectionName}`;
    result[key] = [...(result[key] ?? []), item];
    return result;
  }, {});
  const canSave = draft.startupStatus === "pre" || Boolean(draft.establishedAt);
  const selectIndustry = (division: (typeof KSIC_DIVISIONS)[number]) => {
    setDraft((current) => ({ ...current, industryCode: division.code, industry: division.name, industryDetailCode: null }));
    setIndustryQuery("");
  };

  return (
    <section className="dm-profile-panel dm-basic-profile">
      <div className="dm-section-head">
        <div><h2>기본 정보</h2><p>직접 입력한 창업연차·업종·지역을 공고 자격 판정에 가장 먼저 적용합니다.</p></div>
        <button className="dm-primary-button" type="button" disabled={!canSave} onClick={() => void save({ ...draft, stage: age.label, establishedAt: draft.startupStatus === "registered" ? draft.establishedAt : null, industry: selectedDivision.name, industryDetailCode: null })}>저장하고 추천 다시 계산</button>
      </div>

      <div className="dm-basic-summary">
        <div><span>현재 창업연차</span><strong>{age.label}</strong><small>{draft.startupStatus === "registered" && draft.establishedAt ? `개업일 ${draft.establishedAt}` : "사업자등록 전"}</small></div>
        <div><span>대표 업종</span><strong>KSIC {draft.industryCode}</strong><small>{selectedDivision.name}</small></div>
        <div><span>사업장 소재지</span><strong>{REGION_OPTIONS.find((item) => item.value === draft.region)?.label ?? draft.region}</strong><small>지역 제한 공고 판정 기준</small></div>
      </div>

      <div className="dm-profile-form-grid">
        <fieldset className="dm-profile-field is-wide">
          <legend>창업연차</legend>
          <div className="dm-segmented" aria-label="사업자등록 상태">
            <button className={draft.startupStatus === "pre" ? "is-selected" : ""} type="button" aria-pressed={draft.startupStatus === "pre"} onClick={() => setDraft((current) => ({ ...current, startupStatus: "pre", establishedAt: null }))}>예비창업</button>
            <button className={draft.startupStatus === "registered" ? "is-selected" : ""} type="button" aria-pressed={draft.startupStatus === "registered"} onClick={() => setDraft((current) => ({ ...current, startupStatus: "registered" }))}>사업자 보유</button>
          </div>
          {draft.startupStatus === "registered" ? <label className="dm-profile-control"><span>개업일 · 사업자등록증 기준</span><input type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={draft.establishedAt ?? ""} onChange={(event) => setDraft((current) => ({ ...current, establishedAt: event.target.value || null }))} /><small>입력한 날짜로 1년차·2년차를 자동 계산하고 ‘업력 3년 이내’ 조건을 판정합니다.</small></label> : <p className="dm-field-help">사업자등록 전으로 저장되며 예비창업자 전용 공고를 우선 판정합니다.</p>}
        </fieldset>

        <fieldset className="dm-profile-field is-wide">
          <legend>업종 · 제11차 한국표준산업분류</legend>
          <div className="dm-ksic-grid">
            <div className="dm-profile-control dm-industry-search"><label htmlFor="industry-search">코드·업종명 검색</label><input id="industry-search" type="search" value={industryQuery} placeholder="예: 62, 소프트웨어, 연구개발" role="combobox" aria-autocomplete="list" aria-expanded={Boolean(normalizedQuery)} aria-controls="industry-search-results" onChange={(event) => setIndustryQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && matchedDivisions[0]) { event.preventDefault(); selectIndustry(matchedDivisions[0]); } }} />{normalizedQuery ? <div className="dm-industry-results" id="industry-search-results" role="listbox" aria-label="업종 검색 결과">{matchedDivisions.length ? matchedDivisions.slice(0, 8).map((item) => <button type="button" role="option" aria-selected={item.code === draft.industryCode} key={item.code} onClick={() => selectIndustry(item)}><strong>{item.code}</strong><span>{item.name}</span><small>{item.sectionName}</small></button>) : <p>일치하는 표준산업분류가 없습니다. 코드 또는 업종명을 다시 입력해주세요.</p>}</div> : null}<small>검색 결과를 선택하면 상단 대표 업종에 즉시 반영됩니다.</small></div>
            <label className="dm-profile-control"><span>대표 업종 중분류</span><span className="dm-select-shell"><select value={draft.industryCode} onChange={(event) => { const division = KSIC_DIVISIONS.find((item) => item.code === event.target.value); if (division) setDraft((current) => ({ ...current, industryCode: division.code, industry: division.name, industryDetailCode: null })); }}>{Object.entries(grouped).map(([label, items]) => <optgroup label={label} key={label}>{items.map((item) => <option value={item.code} key={item.code}>{item.code} · {item.name}</option>)}</optgroup>)}</select></span></label>
          </div>
        </fieldset>

        <fieldset className="dm-profile-field is-wide">
          <legend>사업장 소재지</legend>
          <label className="dm-profile-control"><span>주 사업장 시·도</span><span className="dm-select-shell"><select value={draft.region} onChange={(event) => setDraft((current) => ({ ...current, region: event.target.value }))}>{REGION_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></span><small>지역 이전 예정이 아니라 현재 사업자등록 주소를 기준으로 선택해주세요.</small></label>
        </fieldset>
      </div>
      <div className="dm-logic-note"><strong>추천 적용 순서</strong><p>기본 정보의 창업연차·KSIC 업종·지역 → 승인된 AI 사업 프로필 → 공고 원문의 추가 자격조건 순으로 비교합니다.</p></div>
    </section>
  );
}

function BusinessProfile({ documents, documentUploadState, profileAnalysisRunState, profileAnalysisElapsedSeconds, addDocuments, removeDocument, analyzeProfile, profileSummary, profileAnalysis, profileReview, profileVersions, aiRuntime, updateReview, saveReview, approveReview, cancelReview, selectProfile, deleteProfile, navigate }: { documents: BusinessDocument[]; documentUploadState: DocumentUploadState; profileAnalysisRunState: ProfileAnalysisRunState; profileAnalysisElapsedSeconds: number; addDocuments: (files: FileList | null) => Promise<void>; removeDocument: (id: string) => Promise<void>; analyzeProfile: () => Promise<void>; profileSummary: string; profileAnalysis: BusinessProfileAnalysis | null; profileReview: BusinessProfileReview | null; profileVersions: ProfileVersionSummary[]; aiRuntime: AiRuntime; updateReview: (patch: Partial<BusinessProfileAnalysis>) => void; saveReview: () => Promise<void>; approveReview: () => Promise<void>; cancelReview: () => Promise<void>; selectProfile: (versionId: string) => Promise<void>; deleteProfile: (versionId: string) => Promise<void>; navigate: (view: View) => void }) {
  const analysis = profileReview?.analysis ?? profileAnalysis;
  const isDraft = profileReview?.status === "draft";
  const analysisStatus = profileAnalysisRunState.status === "running"
    ? `AI 분석 중 · ${profileAnalysisElapsedSeconds}초`
    : isDraft
    ? `v${profileReview.version} 검토 필요`
    : profileAnalysis
      ? "승인 프로필 적용 중"
      : "분석 대기";
  const confidenceLabel = { high: "높음", medium: "보통", low: "확인 필요" } as const;
  const listText = (values: string[] | undefined, fallback: string) => values?.length ? values.join(" · ") : fallback;
  const splitLines = (value: string) => [...new Set(value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];
  const tokenRatio = Math.min(100, Math.round((aiRuntime.dailyTokensUsed / Math.max(1, aiRuntime.dailyTokenLimit)) * 100));
  const tokenUsageStatus = tokenRatio >= 100 ? "보호 한도 도달" : tokenRatio >= 80 ? "한도 접근" : "정상";
  const tokenUsageLabel = `${aiRuntime.dailyTokensUsed.toLocaleString("ko-KR")} / ${aiRuntime.dailyTokenLimit.toLocaleString("ko-KR")} 토큰`;
  const formatProfileDate = (value: string | null) => value
    ? new Date(value).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    : "승인일 확인 중";

  const openEvidence = (document: BusinessDocument, location: string) => {
    const page = location.match(/(\d+)\s*(?:페이지|쪽|p\.?)/i)?.[1];
    const hash = page && document.name.toLowerCase().endsWith(".pdf") ? `#page=${page}` : "";
    window.open(`/api/documents/${encodeURIComponent(document.id)}${hash}`, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="dm-profile-panel">
      <div className="dm-ai-profile-hero">
        <div>
          <div className="dm-inline-actions">
            <span className="dm-badge">{analysisStatus}</span>
            <span className={`dm-runtime-badge is-${aiRuntime.provider}`}>{aiRuntime.provider === "openai" ? "실제 AI 연결" : "미리보기 모드"}</span>
            <small>{aiRuntime.provider === "openai" ? aiRuntime.profileModel : "AI 인증키 연결 전"}</small>
          </div>
          <h2>{isDraft ? "새 AI 사업 프로필을 검토해주세요" : analysis ? "선택한 사업 프로필로 추천하고 있어요" : "내 사업을 이해하는 AI 프로필을 만들어보세요"}</h2>
          <p>{aiRuntime.provider === "openai" ? "새 분석은 기존 프로필을 덮어쓰지 않고 독립 카드로 저장됩니다. 승인 후 원하는 프로필을 추천 기준으로 선택할 수 있어요." : "파일 업로드·보관은 실제로 동작하며, AI 인증키 연결 전 분석은 문서명 기반 미리보기로 생성됩니다."}</p>
        </div>
        <button className="dm-button" type="button" aria-busy={profileAnalysisRunState.status === "running"} disabled={!documents.length || documentUploadState.status === "uploading" || profileAnalysisRunState.status === "running"} onClick={() => void analyzeProfile()}>{profileAnalysisRunState.status === "running" ? `AI 분석 중 · ${profileAnalysisElapsedSeconds}초` : aiRuntime.provider === "openai" ? (profileVersions.length ? "새 프로필 분석" : "첫 프로필 분석") : "미리보기 분석"}</button>
      </div>

      <section className="dm-ai-runtime-grid" aria-label="AI 운영 상태">
        <div><span>분석 엔진</span><strong>{aiRuntime.provider === "openai" ? "운영 연결" : "키 등록 대기"}</strong><small>{aiRuntime.provider === "openai" ? profileAnalysisRunState.status === "running" ? "실제 문서 분석 실행 중" : profileAnalysisRunState.status === "success" ? "최근 분석 완료" : profileAnalysisRunState.status === "error" ? "분석 오류 확인 필요" : "실제 문서 분석 준비 완료" : "현재 결과는 미리보기"}</small></div>
        <div><span>오늘 프로필 분석</span><strong>{aiRuntime.profileAnalysesToday}/{aiRuntime.profileDailyLimit}회</strong><small>운영 모델 호출 기준</small></div>
        <div><span>최근 24시간 AI 사용량</span><strong>{tokenRatio}% · {tokenUsageStatus}</strong><div className="dm-progress" aria-label={`${tokenUsageLabel} 사용`}><span style={{ width: `${tokenRatio}%` }} /></div><small>{tokenUsageLabel} · 프로필 분석과 서류작성 AI의 과도한 반복 호출을 막는 보호 한도</small></div>
      </section>

      {profileAnalysisRunState.status !== "idle" ? (
        <section className={`dm-analysis-run is-${profileAnalysisRunState.status}`} role="status" aria-live="polite" aria-busy={profileAnalysisRunState.status === "running"}>
          <div className="dm-analysis-run-head">
            <span className="dm-analysis-spinner" aria-hidden="true" />
            <div>
              <strong>{profileAnalysisRunState.status === "running" ? "AI가 사업자료를 실제로 분석하고 있어요" : profileAnalysisRunState.status === "success" ? "AI 분석이 완료됐어요" : "AI 분석을 완료하지 못했어요"}</strong>
              <p>{profileAnalysisRunState.message}</p>
            </div>
            {profileAnalysisRunState.status === "running" ? <b>{profileAnalysisElapsedSeconds}초 경과</b> : profileAnalysisRunState.status === "error" ? <div className="dm-inline-actions">{profileAnalysisRunState.message.includes("크레딧") ? <a className="dm-button" href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noreferrer">OpenAI 결제 설정</a> : null}<button className="dm-button" type="button" onClick={() => void analyzeProfile()}>다시 분석</button></div> : <span className="dm-badge">검토본 생성 완료</span>}
          </div>
          <div className="dm-analysis-track" aria-hidden="true"><span /></div>
          <ol className="dm-analysis-steps">
            <li className="is-complete"><span>1</span><div><strong>요청 접수</strong><small>분석 요청을 서버에 전달했어요.</small></div></li>
            <li className={profileAnalysisRunState.status === "success" ? "is-complete" : profileAnalysisRunState.status === "error" ? "is-error" : "is-current"}><span>2</span><div><strong>문서 전송·AI 해석</strong><small>{profileAnalysisRunState.status === "running" ? "페이지와 표의 내용을 읽고 있어요." : profileAnalysisRunState.status === "success" ? "원본 자료 분석을 마쳤어요." : "오류 내용을 확인해주세요."}</small></div></li>
            <li className={profileAnalysisRunState.status === "success" ? "is-complete" : "is-pending"}><span>3</span><div><strong>검토본 생성</strong><small>{profileAnalysisRunState.status === "success" ? "승인 전 검토할 새 버전을 만들었어요." : "AI 해석이 끝나면 자동으로 생성돼요."}</small></div></li>
          </ol>
        </section>
      ) : null}

      <section className="dm-profile-section">
        <div className="dm-profile-section-head">
          <div><h2>사업자료</h2><p>사업계획서·IR·회사소개서 PDF, PowerPoint, Word, Excel · 파일당 최대 30MB</p></div>
          <span className="dm-badge">{documents.length}개</span>
        </div>
        <label className={`dm-upload-field ${documentUploadState.status === "uploading" ? "is-uploading" : ""}`} htmlFor="business-document-files" aria-busy={documentUploadState.status === "uploading"}>
          <span>{documentUploadState.status === "uploading" ? "사업자료 업로드 중…" : "＋ 사업자료 추가"}</span>
          <small>한 번에 최대 5개 · 파일당 30MB</small>
          <input id="business-document-files" type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.rtf,.odt,.xls,.xlsx,.csv,.tsv,.txt,.md" multiple disabled={documentUploadState.status === "uploading" || profileAnalysisRunState.status === "running"} aria-describedby="document-upload-help" onChange={(event) => { const selected = event.currentTarget.files; void addDocuments(selected); event.currentTarget.value = ""; }} />
        </label>
        <p className={`dm-upload-feedback is-${documentUploadState.status}`} id="document-upload-help" role="status">{documentUploadState.message || "PDF, Word, PowerPoint, Excel과 텍스트 자료를 추가할 수 있습니다."}</p>
        {documents.length ? (
          <div className="dm-document-list">
            {documents.map((document) => (
              <article className="dm-document-row" key={document.id}>
                <span className="dm-file-icon" aria-hidden="true">文</span>
                <div><strong>{document.name}</strong><small>{document.meta}</small></div>
                <span className="dm-badge">{document.status === "analyzed" ? "분석 완료" : "업로드 완료"}</span>
                <div>
                  <button className="dm-button" type="button" disabled={profileAnalysisRunState.status === "running"} onClick={() => void analyzeProfile()}>{profileAnalysisRunState.status === "running" ? "분석 중" : "분석"}</button>
                  <button className="dm-remove-row" type="button" disabled={profileAnalysisRunState.status === "running"} aria-label={`${document.name} 삭제`} onClick={() => void removeDocument(document.id)}>×</button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="dm-empty-row">PDF, Word, PowerPoint 또는 Excel 사업자료를 추가해 주세요.</div>}
      </section>

      <section className="dm-profile-section dm-profile-library">
        <div className="dm-profile-section-head">
          <div><h2>내 AI 사업 프로필</h2><p>분석 결과마다 독립 카드가 생성됩니다. 선택한 카드 한 개만 맞춤 추천과 서류작성에 적용돼요.</p></div>
          <span className="dm-badge">{profileVersions.length}개 프로필</span>
        </div>
        {profileVersions.length ? (
          <div className="dm-profile-card-list">
            {profileVersions.map((version) => {
              const sourceNames = version.sourceDocumentIds
                .map((id) => documents.find((document) => document.id === id)?.name)
                .filter((name): name is string => Boolean(name));
              return (
                <article className={`dm-profile-card ${version.active ? "is-active" : ""} ${version.status === "draft" ? "is-draft" : ""}`} key={version.id}>
                  <div className="dm-profile-card-marker" aria-hidden="true">{version.active ? "✓" : version.status === "draft" ? "…" : version.version}</div>
                  <div className="dm-profile-card-body">
                    <div className="dm-profile-card-meta">
                      <span>{version.active ? "현재 추천 프로필" : version.status === "draft" ? "새 분석 · 검토 필요" : `AI 프로필 ${version.version}`}</span>
                      <small>{formatProfileDate(version.approvedAt ?? version.createdAt)} · 자료 {sourceNames.length || version.sourceDocumentIds.length}개</small>
                    </div>
                    <h3>{version.summary}</h3>
                    <p>{version.elevatorPitch}</p>
                    {sourceNames.length ? <small className="dm-profile-card-sources">분석 자료 · {sourceNames.join(" · ")}</small> : null}
                    <div className="dm-profile-card-keywords">{version.keywords.map((keyword) => <span key={`${version.id}-${keyword}`}>{keyword}</span>)}</div>
                  </div>
                  <div className="dm-profile-card-actions">
                    <button className={version.active ? "dm-active-profile-button" : "dm-button"} type="button" disabled={version.active} aria-pressed={version.active} onClick={() => { if (version.status === "draft") document.getElementById("profile-review")?.scrollIntoView({ behavior: "smooth", block: "start" }); else void selectProfile(version.id); }}>{version.active ? "추천에 적용 중" : version.status === "draft" ? "분석 내용 검토" : "이 프로필로 추천"}</button>
                    {version.status !== "draft" ? <button className="dm-profile-delete-button" type="button" aria-label={`${version.summary} 프로필 삭제`} onClick={() => void deleteProfile(version.id)}>삭제</button> : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : <div className="dm-empty-profile-library"><strong>아직 저장된 AI 사업 프로필이 없어요.</strong><span>자료를 분석하고 검토를 완료하면 첫 프로필 카드가 만들어집니다.</span></div>}
      </section>

      {isDraft ? (
        <section className="dm-profile-section dm-change-review">
          <div className="dm-profile-section-head">
            <div><h2>{profileReview.changes.isFirstVersion ? "첫 프로필 검토" : "이전 승인본과 달라진 내용"}</h2><p>변경된 항목을 확인한 후 승인하면 추천과 서류작성에 반영됩니다.</p></div>
            <span className="dm-badge">{profileReview.changes.changedFields.length}개 항목</span>
          </div>
          <div className="dm-change-chips">
            {profileReview.changes.changedFields.map((field) => <span key={field}>{field}</span>)}
          </div>
          {profileReview.changes.addedKeywords.length || profileReview.changes.removedKeywords.length ? (
            <div className="dm-keyword-diff">
              {profileReview.changes.addedKeywords.map((keyword) => <span className="is-added" key={`add-${keyword}`}>＋ {keyword}</span>)}
              {profileReview.changes.removedKeywords.map((keyword) => <span className="is-removed" key={`remove-${keyword}`}>－ {keyword}</span>)}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="dm-profile-section" id="profile-review">
        <div className="dm-profile-section-head">
          <div><h2>{isDraft ? "새 AI 프로필 검토" : "선택한 AI 사업 프로필"}</h2><p>{isDraft ? "검토를 완료하면 기존 카드와 별개인 새 프로필 카드로 저장됩니다." : "현재 맞춤 추천과 서류작성에 사용 중인 프로필의 상세 내용입니다."}</p></div>
          <span className="dm-badge">{isDraft ? "승인 전" : profileAnalysis ? "추천에 적용 중" : "기본 프로필"}</span>
        </div>
        {isDraft && analysis ? (
          <div className="dm-review-form">
            <label className="dm-review-field is-wide"><span>한 줄 요약</span><input value={analysis.summary} onChange={(event) => updateReview({ summary: event.target.value })} /></label>
            <label className="dm-review-field is-wide"><span>사업 설명</span><textarea rows={4} value={analysis.elevatorPitch} onChange={(event) => updateReview({ elevatorPitch: event.target.value })} /></label>
            <ReviewListField label="핵심 고객" value={analysis.customers} placeholder="고객군을 한 줄에 하나씩 입력" onChange={(value) => updateReview({ customers: splitLines(value) })} />
            <ReviewListField label="해결 문제" value={analysis.problems} placeholder="문제를 한 줄에 하나씩 입력" onChange={(value) => updateReview({ problems: splitLines(value) })} />
            <ReviewListField label="솔루션" value={analysis.solutions} placeholder="솔루션을 한 줄에 하나씩 입력" onChange={(value) => updateReview({ solutions: splitLines(value) })} />
            <ReviewListField label="수익 모델" value={analysis.businessModel} placeholder="수익 모델을 한 줄에 하나씩 입력" onChange={(value) => updateReview({ businessModel: splitLines(value) })} />
            <label className="dm-review-field"><span>현재 단계</span><input value={analysis.stage} onChange={(event) => updateReview({ stage: event.target.value })} /></label>
            <ReviewListField label="우선 지역" value={analysis.regions} placeholder="지역을 한 줄에 하나씩 입력" rows={2} onChange={(value) => updateReview({ regions: splitLines(value) })} />
            <label className="dm-review-field is-wide"><span>추천 키워드</span><textarea rows={2} value={analysis.keywords.join("\n")} onChange={(event) => updateReview({ keywords: splitLines(event.target.value) })} /></label>
          </div>
        ) : (
          <div className="dm-business-overview">
            <span>한 줄 요약</span>
            <h2>{analysis?.summary ?? profileSummary}</h2>
            <p>{analysis?.elevatorPitch ?? "기관별로 흩어진 공고를 통합하고, 사업 아이템과 자격을 비교해 추천한 뒤 사업비 편성·서류작성 AI·마감 관리를 연결하는 SaaS입니다."}</p>
            <dl className="dm-summary-grid">
              <div><dt>핵심 고객</dt><dd>{listText(analysis?.customers, "예비·초기 창업자, 소규모 창업팀")}</dd></div>
              <div><dt>해결 문제</dt><dd>{listText(analysis?.problems, "공고 탐색·자격 판단·신청 준비의 높은 시간 비용")}</dd></div>
              <div><dt>솔루션</dt><dd>{listText(analysis?.solutions, "맞춤 추천 · AI 초안 · 사업비 검증 · D-day 비서")}</dd></div>
              <div><dt>수익 모델</dt><dd>{listText(analysis?.businessModel, "AI 크레딧 + 공고 비서 Pro 30일 이용권")}</dd></div>
              <div><dt>현재 단계</dt><dd>{analysis?.stage || "MVP 화면·기능 설계, 초기 검증 단계"}</dd></div>
              <div><dt>우선 지역</dt><dd>{listText(analysis?.regions, "서울 · 전국 · 온라인 서비스")}</dd></div>
            </dl>
            <div className="dm-keywords">
              {(analysis?.keywords?.length ? analysis.keywords : ["AI", "SaaS", "GovTech", "창업지원", "업무자동화"]).map((keyword) => <span className="dm-badge" key={keyword}>{keyword}</span>)}
            </div>
          </div>
        )}
        {isDraft ? (
          <div className="dm-profile-actions"><span>승인 전까지 기존 추천 프로필은 변경되지 않습니다.</span><div className="dm-inline-actions"><button className="dm-cancel-review-button" type="button" onClick={() => void cancelReview()}>검토 취소</button><button className="dm-button" type="button" onClick={() => void saveReview()}>수정 내용 저장</button><button className="dm-primary-button" type="button" onClick={() => void approveReview()}>검토 완료 · 추천에 사용</button></div></div>
        ) : <div className="dm-profile-actions"><span>선택한 프로필을 추천·서류 작성에 사용 중</span><button className="dm-primary-button" type="button" onClick={() => navigate("match")}>맞춤 추천 확인</button></div>}
      </section>

      {analysis?.evidence.length ? (
        <section className="dm-profile-section">
          <div className="dm-profile-section-head">
            <div><h2>자료 근거</h2><p>항목을 누르면 원본 자료를 열어 페이지·슬라이드 위치를 확인할 수 있어요.</p></div>
            <span className="dm-badge">{analysis.evidence.length}건</span>
          </div>
          <div className="dm-evidence-list">
            {analysis.evidence.map((evidence, index) => {
              const sourceDocument = documents.find((document) => document.name === evidence.documentName);
              return (
              <button className="dm-evidence-row" type="button" disabled={!sourceDocument} onClick={() => { if (sourceDocument) openEvidence(sourceDocument, evidence.location); }} key={`${evidence.documentName}-${evidence.location}-${index}`}>
                <header><strong>{evidence.documentName}</strong><span className={`dm-confidence is-${evidence.confidence}`}>신뢰도 {confidenceLabel[evidence.confidence]}</span></header>
                <small>{evidence.location}</small>
                <p>{evidence.fact}</p>
                <span className="dm-evidence-action">{sourceDocument ? "원문 열기 ↗" : "원본 자료 없음"}</span>
              </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function ReviewListField({ label, value, placeholder, rows = 3, onChange }: { label: string; value: string[]; placeholder: string; rows?: number; onChange: (value: string) => void }) {
  return <label className="dm-review-field"><span>{label}</span><textarea rows={rows} value={value.join("\n")} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function RecommendationLogic() {
  const weights = [["사업목적·아이템", 40], ["성장단계·자금용도", 25], ["실행역량·증빙", 20], ["사용자 선호", 15]] as const;
  return <section className="dm-profile-panel"><div className="dm-section-head"><div><h2>맞춤 추천 로직</h2><p>자격 탈락 공고는 점수 계산 전에 제외하고, 추천마다 근거와 확인할 정보를 함께 보여줍니다.</p></div><button className="dm-primary-button" type="button" disabled>rules-v1 자동 적용</button></div><ol className="dm-logic-steps"><li><strong>자료 구조화</strong><span>사업계획서·IR에서 고객, 문제, 기술, BM, 실적, 팀, 자금용도를 추출하고 출처 페이지를 연결</span></li><li><strong>신청 자격 하드 필터</strong><span>업력·사업자 상태·지역·연령·매출·중복수혜·제외업종을 먼저 판정하며 불명확하면 확인 필요로 보류</span></li><li><strong>공고 목적과 사업 아이템 적합도</strong><span>정책 목적, 지원 분야, 요구성과와 사업 요약의 의미 유사도를 비교</span></li><li><strong>실행 가능성과 선호 반영</strong><span>보유 실적·팀·기술 성숙도·자금용도와 저장·열람·제외 피드백을 반영</span></li></ol><section className="dm-profile-section"><div className="dm-profile-section-head"><div><h2>적합도 점수 · 100점</h2><p>하드 필터 통과 후 계산되는 기본 가중치입니다.</p></div><span className="dm-badge">80점 이상 강력 추천</span></div><div className="dm-score-list">{weights.map(([label, score]) => <div className="dm-score-row" key={label}><span>{label}</span><div className="dm-progress"><span style={{ width: `${(score / 40) * 100}%` }} /></div><output>{score}점</output></div>)}</div></section><div className="dm-logic-note"><strong>신뢰도 안전장치</strong><p>자료에 없는 사실은 추정하지 않고 감점 또는 확인 질문으로 전환합니다. 적합 근거, 감점 사유, 원문 출처를 함께 노출합니다.</p></div></section>;
}

function PlanView({ billing, checkout, redeemPromotion, navigate }: { billing: BillingPayload; checkout: (productId: string) => void; redeemPromotion: (code: string) => Promise<void>; navigate: (view: View) => void }) {
  const [promotionCode, setPromotionCode] = useState("");
  const [promotionSubmitting, setPromotionSubmitting] = useState(false);
  const creditProducts = billing.products.filter((product) => product.plan === null);
  const planProducts = Object.fromEntries(billing.products.filter((product) => product.plan).map((product) => [product.plan, product]));
  const currentPlanLabel = billing.plan === "pro" ? "Pro" : billing.plan === "start" ? "Start" : "Free";
  const plans = [
    {
      id: "free",
      name: "Free",
      price: 0,
      credits: "가입 10 + 매일 1",
      description: "공고 탐색과 직접 작성부터 가볍게 시작",
      features: ["사업비 편성·서류 카드 직접 작성", "AI 사업 프로필 1개", "무료 크레딧 잔액 최대 10", "기본 맞춤 추천·웹 알림"],
      featured: false,
    },
    {
      id: "start",
      name: "Start",
      price: planProducts.start?.amount ?? 19_900,
      credits: `30일 이용권마다 ${planProducts.start?.credits ?? 120} 크레딧`,
      description: "지원사업 한 건을 끝까지 준비하는 창업자",
      features: ["AI 초안·피드백 약 1건 분량", "AI 사업 프로필 최대 2개", "맞춤 공고 이메일 요약", "D-7·D-3·D-1 준비 알림"],
      featured: true,
    },
    {
      id: "pro",
      name: "Pro",
      price: planProducts.pro?.amount ?? 39_900,
      credits: `30일 이용권마다 ${planProducts.pro?.credits ?? 360} 크레딧`,
      description: "여러 사업과 공고를 동시에 관리하는 팀",
      features: ["AI 초안·피드백 약 3건 분량", "AI 사업 프로필 최대 5개", "맞춤 공고 감지 즉시 이메일", "D-14·7·3·1 진단·누락 확인"],
      featured: false,
    },
  ] as const;
  const providerName = "PortOne";
  const checkoutNote = billing.readiness.mode === "live-ready"
    ? `${providerName} 운영 결제가 연결되어 있습니다. Start·Pro는 자동결제가 아닌 수동 갱신형 30일 이용권이며, 만료 7일·3일·1일 전에 이메일로 안내합니다.`
    : billing.readiness.mode === "sandbox-ready"
      ? `현재 ${providerName} 테스트 결제로 크레딧과 30일 이용권 구매 흐름을 확인할 수 있습니다. 실제 과금은 발생하지 않습니다.`
      : "결제 기능은 운영 심사 후 열립니다. 요금과 크레딧 정책은 지금부터 확인할 수 있습니다.";

  return <div className="dm-plan-page">
    <section className="dm-plan-section dm-plan-hero dm-credit-wallet">
      <div>
        <span className="dm-badge">{currentPlanLabel} 이용 중</span>
        <h2>AI 크레딧 {billing.credits}개를 사용할 수 있어요</h2>
        <p>무료 크레딧부터 먼저 사용하고, 부족한 사용량은 플랜 크레딧과 충전 크레딧으로 이어집니다.</p>
      </div>
      <div className="dm-credit-wallet-grid" aria-label="AI 크레딧 보유 현황">
        <span><small>매일 무료</small><strong>{billing.dailyFreeCredits}</strong><em>/ {billing.dailyFreeCreditCap}</em></span>
        <span><small>플랜·충전</small><strong>{billing.paidCredits}</strong><em>크레딧</em></span>
        <span><small>전체 사용 가능</small><strong>{billing.credits}</strong><em>크레딧</em></span>
      </div>
    </section>

    <div className="dm-daily-credit-note"><strong>매일 {billing.dailyFreeCreditAmount}크레딧 무료 충전</strong><span>한국 시간 기준 하루 한 번, 무료 잔액은 최대 {billing.dailyFreeCreditCap}까지 보유할 수 있어요. 가입 시 10크레딧이 바로 제공됩니다.</span></div>

    <section className="dm-plan-section dm-promotion-section">
      <div className="dm-plan-section-head"><div><h2>프로모션 코드</h2><p>당모에서 발행한 일회용 쿠폰 코드를 입력하면 프로모션 크레딧이 즉시 추가됩니다.</p></div><span className="dm-badge">1회 사용</span></div>
      <form className="dm-promotion-form" onSubmit={async (event) => {
        event.preventDefault();
        if (!promotionCode.trim() || promotionSubmitting) return;
        setPromotionSubmitting(true);
        try {
          await redeemPromotion(promotionCode);
          setPromotionCode("");
        } finally {
          setPromotionSubmitting(false);
        }
      }}>
        <label><span className="sr-only">프로모션 코드</span><input value={promotionCode} maxLength={32} autoComplete="off" placeholder="예: DANGMO-WELCOME" onChange={(event) => setPromotionCode(event.target.value.toUpperCase())} /></label>
        <button className="dm-primary-button" type="submit" disabled={!promotionCode.trim() || promotionSubmitting}>{promotionSubmitting ? "적용 중…" : "크레딧 받기"}</button>
      </form>
      <p className="dm-provider-note">쿠폰은 계정에 귀속되며, 사용 완료·만료·중지된 코드는 다시 사용할 수 없습니다.</p>
    </section>

    <section className="dm-plan-section">
      <div className="dm-plan-section-head"><div><h2>나에게 맞는 30일 플랜</h2><p>직접 작성은 무료입니다. Start·Pro는 자동 구독이 아닌 1회 결제 이용권이며, 만료 후 직접 갱신합니다.</p></div><span className="dm-badge">자동결제 없음</span></div>
      <div className="dm-pricing-grid">
        {plans.map((plan) => {
          const current = billing.plan === plan.id;
          return <article className={`dm-pricing-card${plan.featured ? " is-featured" : ""}${current ? " is-current" : ""}`} key={plan.id}>
            <header><div><span>{plan.name}</span>{plan.featured ? <b>추천</b> : null}</div><p>{plan.description}</p></header>
            <div className="dm-plan-price"><strong>{plan.price ? `${plan.price.toLocaleString("ko-KR")}원` : "0원"}</strong><small>{plan.price ? "/ 30일" : "계속 무료"}</small></div>
            <div className="dm-plan-credits">{plan.credits}</div>
            <ul>{plan.features.map((feature) => <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>
            <button className={plan.featured ? "dm-primary-button" : "dm-button"} type="button" disabled={plan.id === "free" || !billing.checkoutConfigured} onClick={() => plan.id !== "free" && planProducts[plan.id] && checkout(planProducts[plan.id].id)}>
              {plan.id === "free" ? "Free 기본 제공" : billing.checkoutConfigured ? current ? "30일 연장" : `${plan.name} 30일 시작` : "결제 연결 대기"}
            </button>
          </article>;
        })}
      </div>
    </section>

    <section className="dm-plan-section">
      <div className="dm-plan-section-head"><div><h2>AI 작업별 크레딧</h2><p>원하는 문항에만 AI를 사용하고, 직접 작성·수정·저장은 무료로 이용할 수 있어요.</p></div><strong>사용 시에만 차감</strong></div>
      <div className="dm-credit-cost-grid">
        <article><span>초안 생성</span><strong>8</strong><small>AI 프로필과 작성 가이드 기반</small></article>
        <article><span>문장 피드백·근거 보강</span><strong>3</strong><small>논리·근거·누락 항목 점검</small></article>
        <article><span>문장 다듬기</span><strong>5</strong><small>문맥과 표현을 제출용으로 정리</small></article>
      </div>
    </section>

    <section className="dm-plan-section">
      <div className="dm-plan-section-head"><div><h2>크레딧 추가 충전</h2><p>이용권 크레딧이 부족할 때 필요한 만큼만 한 번 더 충전하세요.</p></div><strong>{billing.paidCredits}개 보유</strong></div>
      <div className="dm-credit-options">{creditProducts.map((product) => <div key={product.id}><span><strong>{product.label}</strong><small>1회 결제 · 크레딧당 약 {Math.round(product.amount / product.credits).toLocaleString("ko-KR")}원</small></span><button className="dm-button" type="button" disabled={!billing.checkoutConfigured} onClick={() => checkout(product.id)}>{product.amount.toLocaleString("ko-KR")}원</button></div>)}</div>
      <p className="dm-provider-note">{checkoutNote}</p>
    </section>
    <button className="dm-button dm-plan-payment" type="button" onClick={() => navigate("payment")}>결제 수단 및 결제 내역</button>
  </div>;
}

function PlanFeature({ title, description }: { title: string; description: string }) {
  return <div className="dm-plan-feature"><span aria-hidden="true">✓</span><span><strong>{title}</strong><small>{description}</small></span></div>;
}

function NotificationSettingsView({ preferences, setPreferences, isPro, emailProviderConnected, automationStatus, save, sendTestEmail, navigate }: { preferences: NotificationPreferences; setPreferences: (value: NotificationPreferences) => void; isPro: boolean; emailProviderConnected: boolean; automationStatus: AutomationStatus | null; save: () => void; sendTestEmail: () => void; navigate: (view: View) => void }) {
  const toggleDay = (day: number) => setPreferences({ ...preferences, reminderDays: preferences.reminderDays.includes(day) ? preferences.reminderDays.filter((item) => item !== day) : [...preferences.reminderDays, day] });
  const lastRun = automationStatus?.runs[0];
  return <div className="dm-settings-list"><section className="dm-plan-section"><div className="dm-plan-section-head"><div><h2>기본 알림</h2><p>무료 요금제에서도 웹 알림과 D-7·D-1 준비 진단을 받을 수 있어요.</p></div><span className="dm-badge">Free</span></div><Toggle label="웹 알림 사용" checked={preferences.webEnabled} onChange={(checked) => setPreferences({ ...preferences, webEnabled: checked })} /><Toggle label="D-7 준비 상태 확인" checked={preferences.reminderDays.includes(7)} onChange={() => toggleDay(7)} /><Toggle label="D-1 최종 확인" checked={preferences.reminderDays.includes(1)} onChange={() => toggleDay(1)} /><Toggle label={`이메일 알림${emailProviderConnected ? "" : " · 공급자 연결 대기"}`} checked={preferences.emailEnabled} disabled={!emailProviderConnected} onChange={(checked) => setPreferences({ ...preferences, emailEnabled: checked })} />{emailProviderConnected ? <button className="dm-button dm-test-email" type="button" onClick={sendTestEmail}>내 계정으로 시험 메일 보내기</button> : <p className="dm-provider-note">Resend 발신 도메인과 API 키를 연결하면 여기서 실제 수신까지 시험할 수 있습니다.</p>}</section><section className="dm-plan-section"><div className="dm-plan-section-head"><div><h2>지능형 공고 비서</h2><p>마감 전 준비 상태와 공고 변경을 더 촘촘하게 확인합니다.</p></div><span className="dm-badge">Pro</span></div><Toggle label="맞춤 공고·공고 변경 감지" checked={preferences.realtimeProEnabled} disabled={!isPro} onChange={(checked) => setPreferences({ ...preferences, realtimeProEnabled: checked })} /><Toggle label="D-14 준비 시작" checked={preferences.reminderDays.includes(14)} disabled={!isPro} onChange={() => toggleDay(14)} /><Toggle label="D-3 누락 항목 확인" checked={preferences.reminderDays.includes(3)} disabled={!isPro} onChange={() => toggleDay(3)} /><Toggle label="D-day 제출 확인" checked={preferences.reminderDays.includes(0)} disabled={!isPro} onChange={() => toggleDay(0)} /><PlanFeature title="준비 상태 진단" description="체크리스트·미작성 문항·사업비 입력 상태를 알림에 함께 표시" />{!isPro ? <button className="dm-primary-button" type="button" onClick={() => navigate("plan")}>공고 비서 Pro 보기</button> : null}</section><section className="dm-plan-section"><div className="dm-plan-section-head"><div><h2>운영 연결 상태</h2><p>공고 수집 → 추천 재계산 → 알림 생성이 하루 한 번 실행됩니다.</p></div><span className={lastRun?.status === "completed" ? "dm-runtime-badge is-openai" : "dm-runtime-badge"}>{lastRun?.status === "completed" ? "정상 실행" : "설정 확인"}</span></div><div className="dm-operation-grid"><OperationState label="K-Startup API" ready={Boolean(automationStatus?.configured.kstartup)} /><OperationState label="기업마당 API" ready={Boolean(automationStatus?.configured.bizinfo)} /><OperationState label="AI 분석" ready={Boolean(automationStatus?.configured.ai)} /><OperationState label="이메일 발송" ready={Boolean(automationStatus?.configured.email)} /><OperationState label="매일 오전 9시 자동 실행" ready={Boolean(automationStatus?.configured.automation)} /><OperationState label="Google·카카오 SSO" ready={Boolean(automationStatus?.configured.google && automationStatus?.configured.kakao)} /></div>{automationStatus?.schedule ? <p className="dm-operation-summary">다음 실행 {new Date(automationStatus.schedule.nextRunAt).toLocaleString("ko-KR")} · {automationStatus.schedule.timeZone}</p> : null}{lastRun ? <p className="dm-operation-summary">최근 {new Date(lastRun.startedAt).toLocaleString("ko-KR")} · 공고 {lastRun.insertedCount}건 추가 · 추천 {lastRun.recommendationCount}건 · 알림 {lastRun.notificationCount}건</p> : <p className="dm-provider-note">첫 자동 실행 전입니다. 자동 실행 보안 키를 배포 환경에 등록하면 일정이 활성화됩니다.</p>}</section><button className="dm-primary-button" type="button" onClick={save}>알림 설정 저장</button></div>;
}

function OperationState({ label, ready }: { label: string; ready: boolean }) {
  return <div><span>{label}</span><b className={ready ? "is-ready" : ""}>{ready ? "연결됨" : "키 등록 대기"}</b></div>;
}

function Toggle({ label, checked, disabled = false, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return <label className={disabled ? "dm-toggle is-disabled" : "dm-toggle"}><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /><span aria-hidden="true" /><b>{label}</b></label>;
}

function billingStatusLabel(status: string) {
  if (status === "paid") return "결제 완료";
  if (status === "granted") return "적용 완료";
  if (status === "failed" || status === "aborted" || status === "canceled") return "결제 실패";
  if (status === "expired") return "시간 만료";
  if (status === "processing") return "승인 반영 중";
  return "결제 대기";
}

function PaymentView({ billing, checkout, requestRefund, navigate }: { billing: BillingPayload; checkout: (productId: string) => void; requestRefund: (billingEventId: string, reason: string) => Promise<void>; navigate: (view: View) => void }) {
  const [refundTarget, setRefundTarget] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const creditProducts = billing.products.filter((product) => product.plan === null);
  const providerName = "PortOne";
  const isLive = billing.readiness.mode === "live-ready";
  const isSandbox = billing.readiness.mode === "sandbox-ready";
  const checkoutDescription = isLive
    ? `${providerName} 운영 결제가 연결되어 아래 결제는 실제로 과금됩니다.`
    : isSandbox
      ? `${providerName} 샌드박스 결제창을 열 수 있습니다. 실제 과금은 발생하지 않습니다.`
      : billing.readiness.mode === "key-mismatch"
        ? "샌드박스와 운영 키 환경이 일치하지 않아 결제를 차단했습니다."
        : "현재 결제를 이용할 수 없습니다. 잠시 후 다시 확인해주세요.";
  const checkoutBadge = isLive ? "운영 결제" : isSandbox ? "테스트 결제" : billing.readiness.mode === "key-mismatch" ? "점검 중" : "이용 불가";
  const refundableEvents = billing.history.filter((item) => item.status === "paid"
    && item.creditsDelta > 0
    && item.metadata.provider === "portone_v2");
  const refundRequestByEvent = new Map(billing.refundRequests.map((item) => [item.billingEventId, item]));
  const accessPassProduct = billing.accessPass
    ? billing.products.find((product) => product.plan === billing.accessPass?.plan)
    : null;

  return <div className="dm-settings-list">
    <section className="dm-plan-section">
      <div className="dm-plan-section-head"><div><h2>AI 크레딧 단건결제</h2><p>{checkoutDescription}</p></div><span className={billing.checkoutConfigured ? "dm-runtime-badge is-openai" : "dm-runtime-badge"}>{checkoutBadge}</span></div>
      <div className="dm-credit-options">{creditProducts.map((product) => <div key={product.id}><span><strong>{product.label}</strong><small>{product.credits}크레딧 · 1회 결제</small></span><button className="dm-button" type="button" disabled={!billing.checkoutConfigured} onClick={() => checkout(product.id)}>{product.amount.toLocaleString("ko-KR")}원</button></div>)}</div>
    </section>
    <section className="dm-plan-section">
      <div className="dm-plan-section-head"><div><h2>30일 이용권 관리</h2><p>자동결제되지 않습니다. 만료 7일·3일·1일 전에 이메일로 안내하며, 계속 이용하려면 직접 갱신해주세요.</p></div><span className={billing.accessPass?.status === "active" ? "dm-runtime-badge is-openai" : "dm-runtime-badge"}>{billing.accessPass?.status === "active" ? "이용 중" : "활성 이용권 없음"}</span></div>
      {billing.accessPass ? <div className="dm-subscription-card"><div><strong>{billing.accessPass.plan === "pro" ? "Pro" : "Start"} 30일 이용권</strong><span>{billing.accessPass.expiresAt ? `${new Date(billing.accessPass.expiresAt).toLocaleDateString("ko-KR")} 만료 · 자동 갱신 없음` : "만료일 확인 중"}</span></div>{accessPassProduct ? <button className="dm-primary-button" type="button" disabled={!billing.checkoutConfigured} onClick={() => checkout(accessPassProduct.id)}>30일 직접 갱신</button> : null}</div> : <div className="dm-empty-row">Start 또는 Pro 30일 이용권을 구매하면 만료일과 갱신 상태를 이곳에서 확인할 수 있습니다.</div>}
    </section>
    <section className="dm-plan-section"><div className="dm-plan-section-head"><div><h2>최근 결제·체험 내역</h2><p>결제 확인과 크레딧 반영 상태를 서버 원장 기준으로 표시합니다.</p></div></div>{billing.history.length ? <div className="dm-billing-history">{billing.history.map((item) => <article key={item.id}><div><strong>{item.productId === "pro_trial_14d" ? "Pro 14일 무료 체험" : billing.products.find((product) => product.id === item.productId)?.label ?? item.type}</strong><small>{new Date(item.createdAt).toLocaleString("ko-KR")}</small></div><span>{billingStatusLabel(item.status)}</span><strong>{item.amount ? `${item.amount.toLocaleString("ko-KR")}원` : "0원"}</strong></article>)}</div> : <div className="dm-empty-row">최근 결제 내역이 없습니다.</div>}</section>
    <section className="dm-plan-section">
      <div className="dm-plan-section-head"><div><h2>환불 요청</h2><p>결제 후 7일 이내이면서 지급된 유료 크레딧을 사용하지 않은 결제는 운영 검토를 요청할 수 있습니다.</p></div><Link className="dm-button" href="/refund-policy">환불 정책 보기</Link></div>
      {refundableEvents.length ? <div className="dm-refund-list">{refundableEvents.map((item) => {
        const existingRequest = refundRequestByEvent.get(item.id);
        return <article key={item.id}><div><strong>{billing.products.find((product) => product.id === item.productId)?.label ?? item.type}</strong><small>{new Date(item.createdAt).toLocaleString("ko-KR")} · {item.amount.toLocaleString("ko-KR")}원</small></div>{existingRequest ? <span className="dm-badge">{existingRequest.status === "pending" ? "검토 대기" : existingRequest.status === "processing" ? "결제사 처리 중" : existingRequest.status === "approved" ? "환불 승인" : "요청 반려"}</span> : <button className="dm-button" type="button" onClick={() => { setRefundTarget(item.id); setRefundReason(""); }}>환불 검토 요청</button>}</article>;
      })}</div> : <div className="dm-empty-row">환불을 요청할 수 있는 결제 내역이 없습니다.</div>}
      {refundTarget ? <form className="dm-refund-form" onSubmit={async (event) => { event.preventDefault(); await requestRefund(refundTarget, refundReason); setRefundTarget(null); setRefundReason(""); }}><label><span>환불 사유</span><textarea rows={3} value={refundReason} placeholder="환불 요청 사유를 10자 이상 입력해주세요." onChange={(event) => setRefundReason(event.target.value)} /></label><div><button className="dm-button" type="button" onClick={() => setRefundTarget(null)}>취소</button><button className="dm-primary-button" type="submit" disabled={refundReason.trim().length < 10}>요청 제출</button></div></form> : null}
    </section>
    <button className="dm-button" type="button" onClick={() => navigate("plan")}>← 요금제 및 사용량으로 돌아가기</button>
  </div>;
}

function AccountDeletionPanel({ deleteOpen, setDeleteOpen, confirmation, setConfirmation, deleteAccount }: { deleteOpen: boolean; setDeleteOpen: (value: boolean) => void; confirmation: string; setConfirmation: (value: string) => void; deleteAccount: () => void }) {
  return <section className="dm-plan-section dm-danger-zone dm-profile-danger-zone"><div className="dm-plan-section-head"><div><h2>회원 탈퇴</h2><p>프로필, 업로드 원본, 저장 공고, 사업비, 초안, 알림과 사용 이력이 모두 삭제됩니다.</p></div><span>되돌릴 수 없음</span></div>{deleteOpen ? <div className="dm-delete-confirm"><label><span>계속하려면 <strong>회원탈퇴</strong>를 입력하세요.</span><input value={confirmation} autoComplete="off" onChange={(event) => setConfirmation(event.target.value)} /></label><div><button className="dm-button" type="button" onClick={() => { setDeleteOpen(false); setConfirmation(""); }}>취소</button><button className="dm-danger-button" type="button" disabled={confirmation !== "회원탈퇴"} onClick={deleteAccount}>계정과 모든 자료 삭제</button></div></div> : <button className="dm-danger-outline" type="button" onClick={() => setDeleteOpen(true)}>탈퇴 절차 시작</button>}</section>;
}

function SecurityView({ email, authProvider, authProviders, documentCount, deleteOpen, setDeleteOpen, confirmation, setConfirmation, deleteAccount }: { email: string; authProvider: string; authProviders: AuthProviderStatus | null; documentCount: number; deleteOpen: boolean; setDeleteOpen: (value: boolean) => void; confirmation: string; setConfirmation: (value: string) => void; deleteAccount: () => void }) {
  return <div className="dm-settings-list"><section className="dm-plan-section"><div className="dm-plan-section-head"><div><h2>내 계정과 데이터</h2><p>현재 계정에 저장된 프로필·공고·사업비·초안·사용 이력을 직접 관리할 수 있어요.</p></div><span className="dm-runtime-badge is-openai">보호됨</span></div><dl className="dm-security-account"><div><dt>로그인 계정</dt><dd>{email}</dd></div><div><dt>로그인 방식</dt><dd>{authProvider} SSO</dd></div><div><dt>업로드 자료</dt><dd>{documentCount}건</dd></div></dl><a className="dm-button dm-data-export" href="/api/account/data" download>내 데이터 JSON으로 내보내기</a></section><section className="dm-plan-section"><div className="dm-plan-section-head"><div><h2>Google·카카오 로그인 운영 준비</h2><p>서버의 PKCE·state·nonce·서명 검증은 준비되어 있으며, 각 개발자 콘솔의 앱 키와 콜백 등록만 남았습니다.</p></div><span className={authProviders?.google.configured && authProviders?.kakao.configured ? "dm-runtime-badge is-openai" : "dm-runtime-badge"}>{authProviders?.google.configured && authProviders?.kakao.configured ? "운영 연결" : "콘솔 설정 필요"}</span></div><div className="dm-auth-provider-grid"><AuthProviderCard name="Google" provider={authProviders?.google ?? null} /><AuthProviderCard name="카카오" provider={authProviders?.kakao ?? null} /></div><p className="dm-provider-note">개발자 콘솔에는 화면에 표시된 콜백 주소를 한 글자도 바꾸지 않고 등록하고, 키는 브라우저 코드가 아닌 배포 환경 변수에만 저장하세요.</p></section><section className="dm-plan-section"><div className="dm-plan-section-head"><div><h2>개인정보·AI 처리 안내</h2><p>당모 MVP에서 데이터가 사용되는 범위를 명확히 안내합니다.</p></div><span className="dm-badge">운영 기준</span></div><div className="dm-policy-grid"><article><strong>서비스 저장</strong><p>사업자료 원본은 계정별 비공개 저장소에 보관하며, 프로필·초안·사업비·알림 설정은 계정 소유 데이터로 관리합니다.</p></article><article><strong>AI 처리</strong><p>사용자가 AI 분석 또는 서류 작성을 실행할 때 필요한 자료와 입력만 설정된 AI 공급자에 전달합니다.</p></article><article><strong>접근 통제</strong><p>사용자 데이터 API는 로그인 세션과 소유권을 확인하고, 운영 화면은 서버 관리자 허용 목록을 추가로 검증합니다.</p></article><article><strong>삭제와 로그</strong><p>탈퇴 시 계정 데이터와 업로드 원본을 삭제하며, 보안 감사 기록은 최대 90일 보관합니다.</p></article></div><div className="dm-policy-links"><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보처리방침</Link><Link href="/ai-policy">AI 문서 처리 안내</Link></div><p className="dm-policy-caution">운영 주체 Team. DM · 개인정보 보호책임자 백승훈 · 문의 sseung.chip@gmail.com</p></section><section className="dm-plan-section dm-danger-zone"><div className="dm-plan-section-head"><div><h2>계정 탈퇴</h2><p>프로필, 업로드 원본, 저장 공고, 사업비, 초안, 알림과 사용 이력이 삭제됩니다.</p></div><span>되돌릴 수 없음</span></div>{deleteOpen ? <div className="dm-delete-confirm"><label><span>계속하려면 <strong>회원탈퇴</strong>를 입력하세요.</span><input value={confirmation} autoComplete="off" onChange={(event) => setConfirmation(event.target.value)} /></label><div><button className="dm-button" type="button" onClick={() => { setDeleteOpen(false); setConfirmation(""); }}>취소</button><button className="dm-danger-button" type="button" disabled={confirmation !== "회원탈퇴"} onClick={deleteAccount}>계정과 모든 자료 삭제</button></div></div> : <button className="dm-danger-outline" type="button" onClick={() => setDeleteOpen(true)}>탈퇴 절차 시작</button>}</section></div>;
}

function AuthProviderCard({ name, provider }: { name: string; provider: AuthProviderStatus["google"] | null }) {
  return <article><div><strong>{name} SSO</strong><span className={provider?.configured ? "is-ready" : ""}>{provider?.configured ? "키 연결됨" : "키 등록 대기"}</span></div><label><span>리디렉션 URI</span><code>{provider?.redirectUri ?? "설정 정보를 불러오는 중…"}</code></label><ul>{(provider?.requirements ?? ["개발자 콘솔 앱 생성", "콜백 주소 등록", "환경 변수에 키 저장"]).map((item) => <li key={item}>{item}</li>)}</ul></article>;
}

type CommunityEditor =
  | { type: "post"; id: string | null; board: "notice" | "bamboo"; title: string; content: string; pinned: boolean }
  | { type: "comment"; id: string; postTitle: string; content: string };

function CommunityOperationsPanel({ community, manage }: { community: OperationsPayload["community"]; manage: (input: CommunityAdminAction) => Promise<void> }) {
  const [editor, setEditor] = useState<CommunityEditor | null>(null);
  const [saving, setSaving] = useState(false);
  const notices = community.posts.filter((post) => post.board === "notice");
  const bambooPosts = community.posts.filter((post) => post.board === "bamboo");

  const saveEditor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;
    setSaving(true);
    try {
      if (editor.type === "comment") {
        await manage({ action: "update-community-comment", commentId: editor.id, content: editor.content });
      } else if (editor.id) {
        await manage({ action: "update-community-post", postId: editor.id, title: editor.title, content: editor.content, pinned: editor.pinned });
      } else {
        await manage({ action: "create-community-notice", title: editor.title, content: editor.content, pinned: editor.pinned });
      }
      setEditor(null);
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (post: OperationsPayload["community"]["posts"][number]) => {
    if (!window.confirm(`‘${post.title}’ 게시글을 삭제할까요? 삭제 후 게시판에서 바로 숨겨집니다.`)) return;
    await manage({ action: "delete-community-post", postId: post.id });
    if (editor?.type === "post" && editor.id === post.id) setEditor(null);
  };

  const deleteComment = async (comment: OperationsPayload["community"]["comments"][number]) => {
    if (!window.confirm("이 댓글을 삭제할까요? 삭제 후 대나무숲에서 바로 숨겨집니다.")) return;
    await manage({ action: "delete-community-comment", commentId: comment.id });
    if (editor?.type === "comment" && editor.id === comment.id) setEditor(null);
  };

  const postRow = (post: OperationsPayload["community"]["posts"][number]) => <article className="dm-community-admin-row" key={post.id}>
    <div><span>{post.board === "notice" ? "공지" : "익명 글"}{post.pinned ? " · 고정" : ""}</span><strong>{post.title}</strong><p>{post.content}</p><small>{new Date(post.createdAt).toLocaleString("ko-KR")} · 조회 {post.viewCount.toLocaleString("ko-KR")} · 댓글 {post.commentCount.toLocaleString("ko-KR")}</small></div>
    <div className="dm-community-admin-actions"><button className="dm-button" type="button" onClick={() => setEditor({ type: "post", id: post.id, board: post.board, title: post.title, content: post.content, pinned: post.pinned })}>수정</button><button className="dm-danger-outline" type="button" onClick={() => void deletePost(post)}>삭제</button></div>
  </article>;

  return <section className="dm-plan-section dm-community-admin">
    <div className="dm-plan-section-head"><div><h2>커뮤니티 운영</h2><p>공지사항을 발행하고 대나무숲의 글·댓글을 관리합니다. 이 기능은 관리자에게만 표시됩니다.</p></div><button className="dm-primary-button" type="button" onClick={() => setEditor({ type: "post", id: null, board: "notice", title: "", content: "", pinned: false })}>+ 새 공지 작성</button></div>
    {editor ? <form className="dm-community-admin-editor" onSubmit={saveEditor}>
      <div><strong>{editor.type === "comment" ? "댓글 수정" : editor.id ? `${editor.board === "notice" ? "공지사항" : "대나무숲 글"} 수정` : "새 공지사항"}</strong>{editor.type === "comment" ? <small>{editor.postTitle}</small> : null}</div>
      {editor.type === "post" ? <label><span>제목</span><input value={editor.title} maxLength={120} required onChange={(event) => setEditor({ ...editor, title: event.target.value })} /></label> : null}
      <label><span>내용</span><textarea value={editor.content} maxLength={editor.type === "comment" ? 1_000 : 5_000} rows={editor.type === "comment" ? 4 : 8} required onChange={(event) => setEditor({ ...editor, content: event.target.value })} /></label>
      {editor.type === "post" && editor.board === "notice" ? <label className="dm-community-admin-check"><input type="checkbox" checked={editor.pinned} onChange={(event) => setEditor({ ...editor, pinned: event.target.checked })} /><span>목록 상단에 고정</span></label> : null}
      <div className="dm-community-admin-editor-actions"><button className="dm-button" type="button" onClick={() => setEditor(null)}>취소</button><button className="dm-primary-button" type="submit" disabled={saving}>{saving ? "저장 중…" : editor.type === "post" && !editor.id ? "공지 발행" : "수정 저장"}</button></div>
    </form> : null}
    <div className="dm-community-admin-grid">
      <section><div className="dm-community-admin-title"><h3>공지사항</h3><span>{notices.length}건</span></div><div className="dm-community-admin-list">{notices.length ? notices.map(postRow) : <div className="dm-empty-row">등록된 공지사항이 없습니다.</div>}</div></section>
      <section><div className="dm-community-admin-title"><h3>대나무숲 글</h3><span>{bambooPosts.length}건</span></div><div className="dm-community-admin-list">{bambooPosts.length ? bambooPosts.map(postRow) : <div className="dm-empty-row">등록된 대나무숲 글이 없습니다.</div>}</div></section>
    </div>
    <section className="dm-community-admin-comments"><div className="dm-community-admin-title"><h3>대나무숲 댓글</h3><span>{community.comments.length}건</span></div><div className="dm-community-admin-comment-list">{community.comments.length ? community.comments.map((comment) => <article key={comment.id}><div><span>{comment.postTitle}</span><p>{comment.content}</p><small>{new Date(comment.createdAt).toLocaleString("ko-KR")}</small></div><div className="dm-community-admin-actions"><button className="dm-button" type="button" onClick={() => setEditor({ type: "comment", id: comment.id, postTitle: comment.postTitle, content: comment.content })}>수정</button><button className="dm-danger-outline" type="button" onClick={() => void deleteComment(comment)}>삭제</button></div></article>) : <div className="dm-empty-row">등록된 댓글이 없습니다.</div>}</div></section>
  </section>;
}

function SupportOperationsPanel({ requests, manage }: { requests: OperationsPayload["supportRequests"]; manage: (input: SupportAdminAction) => Promise<void> }) {
  const [filter, setFilter] = useState<"all" | SupportStatus>("all");
  const [editor, setEditor] = useState<{ id: string; status: SupportStatus; response: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const visible = filter === "all" ? requests : requests.filter((item) => item.status === filter);
  const openCount = requests.filter((item) => item.status === "received" || item.status === "in_review").length;

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;
    setSaving(true);
    try {
      await manage({
        action: "update-support-request",
        supportRequestId: editor.id,
        status: editor.status,
        adminResponse: editor.response,
      });
      setEditor(null);
    } finally {
      setSaving(false);
    }
  };

  return <section className="dm-plan-section dm-support-admin">
    <div className="dm-plan-section-head"><div><h2>고객 문의</h2><p>이슈·기능 건의·피드백을 확인하고 답변과 처리 상태를 관리합니다.</p></div><span className={openCount ? "dm-badge" : "dm-runtime-badge is-openai"}>{openCount ? `처리 대기 ${openCount}` : "모두 처리"}</span></div>
    <div className="dm-support-admin-filters" role="group" aria-label="고객 문의 상태 필터">{([
      ["all", "전체"],
      ["received", "신규 접수"],
      ["in_review", "검토중"],
      ["resolved", "답변 완료"],
      ["closed", "종료"],
    ] as const).map(([value, label]) => <button className={filter === value ? "is-selected" : ""} type="button" key={value} onClick={() => setFilter(value)}>{label}<b>{value === "all" ? requests.length : requests.filter((item) => item.status === value).length}</b></button>)}</div>
    <div className="dm-support-admin-list">{visible.length ? visible.map((item) => <article key={item.id}>
      <header><div><span>{supportCategoryLabel[item.category]}</span><i className={`is-${item.status}`}>{supportStatusLabel[item.status]}</i></div><small>{new Date(item.createdAt).toLocaleString("ko-KR")}</small></header>
      <h3>{item.subject}</h3>
      <p>{item.content}</p>
      <dl><div><dt>문의자</dt><dd>{item.displayName}</dd></div><div><dt>이메일</dt><dd>{item.email}</dd></div></dl>
      {item.adminResponse ? <aside><strong>현재 답변</strong><p>{item.adminResponse}</p>{item.respondedAt ? <small>{new Date(item.respondedAt).toLocaleString("ko-KR")}</small> : null}</aside> : null}
      {editor?.id === item.id ? <form className="dm-support-admin-editor" onSubmit={save}>
        <label><span>처리 상태</span><select value={editor.status} onChange={(event) => setEditor({ ...editor, status: event.target.value as SupportStatus })}><option value="received">접수</option><option value="in_review">검토중</option><option value="resolved">답변 완료</option><option value="closed">종료</option></select></label>
        <label><span>고객 답변</span><textarea value={editor.response} maxLength={5_000} rows={6} placeholder="사용자가 고객센터 화면에서 확인할 답변을 작성해주세요." onChange={(event) => setEditor({ ...editor, response: event.target.value })} /></label>
        <div><button className="dm-button" type="button" onClick={() => setEditor(null)}>취소</button><button className="dm-primary-button" type="submit" disabled={saving || (editor.status === "resolved" && !editor.response.trim())}>{saving ? "저장 중…" : "답변·상태 저장"}</button></div>
      </form> : <div className="dm-support-admin-actions">
        {item.status === "received" ? <button className="dm-button" type="button" onClick={() => void manage({ action: "update-support-request", supportRequestId: item.id, status: "in_review" })}>검토 시작</button> : null}
        <button className="dm-primary-button" type="button" onClick={() => setEditor({ id: item.id, status: item.status === "received" ? "in_review" : item.status, response: item.adminResponse ?? "" })}>{item.adminResponse ? "답변 수정" : "답변 작성"}</button>
      </div>}
    </article>) : <div className="dm-empty-row">선택한 상태의 고객 문의가 없습니다.</div>}</div>
  </section>;
}

function OperationsReadinessPanel({ payload, runAutomation, sendTestEmail }: { payload: OperationsPayload; runAutomation: () => Promise<void>; sendTestEmail: () => Promise<void> | void }) {
  const tokenRate = Math.min(100, Math.round((payload.aiSafety.tokensUsed24h / Math.max(payload.aiSafety.tokenLimit24h, 1)) * 100));
  const requestRate = Math.min(100, Math.round((payload.aiSafety.requests24h / Math.max(payload.aiSafety.requestLimit24h, 1)) * 100));
  const funnelItems = [
    ["가입", payload.launch.funnel.signedUp],
    ["AI 프로필", payload.launch.funnel.profiled],
    ["공고 저장", payload.launch.funnel.savedAnnouncement],
    ["서류작성 AI", payload.launch.funnel.usedWritingAi],
    ["메일 수신", payload.launch.funnel.emailOptIn],
  ] as const;

  return <div className="dm-ops-readiness-grid">
    <section className="dm-plan-section dm-ops-readiness-section">
      <div className="dm-plan-section-head"><div><h2>AI 운영 안전장치</h2><p>사용자별 한도와 서비스 전체 한도를 함께 적용하고, 실패한 서류작성 요청의 크레딧은 자동 복구합니다.</p></div><span className={payload.aiSafety.creditAnomalies ? "dm-runtime-badge" : "dm-runtime-badge is-openai"}>{payload.aiSafety.creditAnomalies ? `원장 확인 ${payload.aiSafety.creditAnomalies}건` : "원장 정상"}</span></div>
      <div className="dm-ops-safety-meter"><div><span>24시간 토큰</span><strong>{payload.aiSafety.tokensUsed24h.toLocaleString("ko-KR")} / {payload.aiSafety.tokenLimit24h.toLocaleString("ko-KR")}</strong></div><div className="dm-ops-progress"><span style={{ width: `${tokenRate}%` }} /></div></div>
      <div className="dm-ops-safety-meter"><div><span>24시간 요청</span><strong>{payload.aiSafety.requests24h.toLocaleString("ko-KR")} / {payload.aiSafety.requestLimit24h.toLocaleString("ko-KR")}</strong></div><div className="dm-ops-progress"><span style={{ width: `${requestRate}%` }} /></div></div>
      <div className="dm-ops-kpi-grid">
        <article><span>프로필 분석</span><strong>{payload.aiSafety.profileAnalyses24h.toLocaleString("ko-KR")}</strong><small>최근 24시간</small></article>
        <article><span>서류작성 요청</span><strong>{payload.aiSafety.writingRequests24h.toLocaleString("ko-KR")}</strong><small>최근 24시간</small></article>
        <article><span>사용 크레딧</span><strong>{payload.aiSafety.creditsSpent24h.toLocaleString("ko-KR")}</strong><small>최근 24시간</small></article>
        <article><span>AI 실패</span><strong>{payload.aiSafety.failures7d.toLocaleString("ko-KR")}</strong><small>최근 7일</small></article>
      </div>
      <div className="dm-ops-model-list"><strong>최근 7일 모델 사용</strong>{payload.aiSafety.models.length ? payload.aiSafety.models.map((item) => <span key={item.model}>{item.model}<b>{item.requests.toLocaleString("ko-KR")}회 · {item.tokens.toLocaleString("ko-KR")} tokens</b></span>) : <small>아직 집계된 모델 사용량이 없습니다.</small>}</div>
      <p className="dm-operation-summary">일시 오류는 최대 {payload.aiSafety.retryAttempts}회 재시도하며, 한도 초과 시 신규 AI 호출만 안전하게 중단합니다.</p>
    </section>

    <section className="dm-plan-section dm-ops-readiness-section">
      <div className="dm-plan-section-head"><div><h2>자동화·알림 검증</h2><p>공고 수집부터 추천, D-day·준비상태 알림과 이메일 발송까지 한 번에 점검합니다.</p></div><span className={payload.notificationHealth.automationHealthy ? "dm-runtime-badge is-openai" : "dm-runtime-badge"}>{payload.notificationHealth.automationHealthy ? "정상" : "점검 필요"}</span></div>
      <div className="dm-ops-kpi-grid">
        <article><span>24시간 알림</span><strong>{payload.notificationHealth.events24h.toLocaleString("ko-KR")}</strong><small>앱 알림 생성</small></article>
        <article><span>7일 마감 알림</span><strong>{payload.notificationHealth.deadlineEvents7d.toLocaleString("ko-KR")}</strong><small>D-day·작성 점검</small></article>
        <article><span>7일 이메일</span><strong>{payload.notificationHealth.emailsSent7d.toLocaleString("ko-KR")}</strong><small>발송 완료</small></article>
        <article><span>이메일 실패</span><strong>{payload.notificationHealth.emailsFailed7d.toLocaleString("ko-KR")}</strong><small>최근 7일</small></article>
      </div>
      <p className="dm-operation-summary">최근 정상 실행 {payload.notificationHealth.lastSuccessfulRunAt ? new Date(payload.notificationHealth.lastSuccessfulRunAt).toLocaleString("ko-KR") : "없음"}</p>
      <div className="dm-ops-action-row"><button className="dm-primary-button" type="button" onClick={() => void runAutomation()}>지금 전체 점검 실행</button><button className="dm-button" type="button" onClick={() => void sendTestEmail()}>내 계정 시험 메일</button></div>
      <p className="dm-provider-note">전체 점검은 공식 공고를 다시 수집하고 추천·마감·준비상태 알림을 생성합니다. 시험 메일은 현재 관리자 계정으로만 발송됩니다.</p>
    </section>

    <section className="dm-plan-section dm-ops-launch-section">
      <div className="dm-plan-section-head"><div><h2>공개 베타 출시 준비</h2><p>무료 공개 베타와 유료 결제 출시 조건을 분리해서 확인합니다.</p></div><span className={payload.launch.publicBetaReady ? "dm-runtime-badge is-openai" : "dm-runtime-badge"}>{payload.launch.publicBetaReady ? "베타 준비 완료" : "설정 보완 필요"}</span></div>
      <div className="dm-launch-checks">{payload.launch.publicBetaChecks.map((item) => <div className={item.ready ? "dm-launch-check is-ready" : "dm-launch-check"} key={item.key}><span>{item.ready ? "✓" : "!"}</span><strong>{item.label}</strong></div>)}</div>
      <div className="dm-plan-section-head dm-ops-subhead"><div><h3>유료 출시 조건</h3><p>토스페이먼츠 운영 키와 결제 승인·웹훅, 30일 이용권 만료 이메일을 모두 확인한 뒤 활성화합니다.</p></div></div>
      <div className="dm-launch-checks">{payload.launch.paidLaunchChecks.map((item) => <div className={item.ready ? "dm-launch-check is-ready" : "dm-launch-check"} key={item.key}><span>{item.ready ? "✓" : "!"}</span><strong>{item.label}</strong></div>)}</div>
      <div className="dm-plan-section-head dm-ops-subhead"><div><h3>초기 이용 퍼널</h3><p>가입 후 프로필·공고 저장·AI 작성으로 이어지는 흐름입니다.</p></div><small>{payload.launch.supportEmail || "문의 메일 등록 필요"}</small></div>
      <div className="dm-launch-funnel">{funnelItems.map(([label, value], index) => <article key={label}><span>{index + 1}</span><div><small>{label}</small><strong>{value.toLocaleString("ko-KR")}명</strong></div></article>)}</div>
    </section>
  </div>;
}

function OfficialReviewPanel({ payload, review, bulkReview }: { payload: OperationsPayload; review: (announcementId: string, status: "pending" | "approved" | "flagged") => void; bulkReview: (announcementIds: string[], status: "pending" | "approved" | "flagged") => Promise<void> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const visibleIds = payload.reviews.map((item) => item.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const applyBulk = async (status: "approved" | "flagged") => {
    await bulkReview(selected, status);
    setSelected([]);
  };
  return <section className="dm-plan-section">
    <div className="dm-plan-section-head"><div><h2>공식 공고 검수</h2><p>체크한 공고를 한 번에 승인하거나 확인 필요 상태로 분류합니다.</p></div><span className="dm-badge">대기 {payload.metrics.pendingReviews}</span></div>
    {payload.reviews.length ? <div className="dm-review-bulkbar"><label><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : visibleIds)} /><span>현재 목록 전체 선택</span></label><strong>{selected.length}건 선택</strong><button className="dm-button" type="button" disabled={!selected.length} onClick={() => void applyBulk("flagged")}>선택 확인 필요</button><button className="dm-primary-button" type="button" disabled={!selected.length} onClick={() => void applyBulk("approved")}>선택 전체 검수</button></div> : null}
    <div className="dm-review-queue">{payload.reviews.length ? payload.reviews.map((item) => <article className={selected.includes(item.id) ? "is-selected" : ""} key={item.id}><label className="dm-review-check"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /><span className="sr-only">{item.title} 선택</span></label><div className="dm-review-queue-main"><span><b>{item.source}</b> · {item.institution}</span><strong>{item.title}</strong><small>{item.applyEndAt ? `마감 ${item.applyEndAt}` : "마감일 확인 필요"} · 최근 수집 {new Date(item.sourceCheckedAt).toLocaleString("ko-KR")}</small></div><span className={`dm-review-status is-${item.reviewStatus}`}>{item.reviewStatus === "approved" ? "승인" : item.reviewStatus === "flagged" ? "확인 필요" : "검수 대기"}</span><div className="dm-review-actions"><a className="dm-button" href={item.sourceUrl} target="_blank" rel="noreferrer">원문 ↗</a><button className="dm-button" type="button" disabled={item.reviewStatus === "flagged"} onClick={() => review(item.id, "flagged")}>확인 필요</button><button className="dm-primary-button" type="button" disabled={item.reviewStatus === "approved"} onClick={() => review(item.id, "approved")}>승인</button></div></article>) : <div className="dm-empty-row">공식 API 키가 연결되면 검수할 공고가 표시됩니다.</div>}</div>
  </section>;
}

function CouponOperationsPanel({ coupons, manage }: { coupons: OperationsPayload["coupons"]; manage: (input: { action: "create-credit-coupon"; code: string; credits: number; expiresAt?: string } | { action: "disable-credit-coupon"; couponId: string }) => Promise<void> }) {
  const [code, setCode] = useState("");
  const [credits, setCredits] = useState(30);
  const [expiresAt, setExpiresAt] = useState("");
  const issue = async (event: FormEvent) => {
    event.preventDefault();
    await manage({ action: "create-credit-coupon", code, credits, expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59+09:00`).toISOString() : undefined });
    setCode("");
  };
  return <section className="dm-plan-section">
    <div className="dm-plan-section-head"><div><h2>크레딧 쿠폰 발행</h2><p>직접 만든 일회용 코드에 프로모션 크레딧과 만료일을 설정합니다.</p></div><span className="dm-badge">활성 {coupons.filter((item) => item.status === "active").length}</span></div>
    <form className="dm-coupon-form" onSubmit={issue}><label><span>쿠폰 코드</span><input value={code} maxLength={32} placeholder="DANGMO-WELCOME" onChange={(event) => setCode(event.target.value.toUpperCase().replace(/\s+/g, ""))} /></label><label><span>지급 크레딧</span><input type="number" min={1} max={10000} value={credits} onChange={(event) => setCredits(Number(event.target.value))} /></label><label><span>사용 만료일 · 선택</span><input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label><button className="dm-primary-button" type="submit" disabled={!/^[A-Z0-9_-]{4,32}$/.test(code) || !Number.isSafeInteger(credits) || credits < 1}>쿠폰 발행</button></form>
    <div className="dm-coupon-list">{coupons.length ? coupons.map((coupon) => <article key={coupon.id}><code>{coupon.code}</code><strong>{coupon.credits} 크레딧</strong><span className={`dm-review-status is-${coupon.status === "active" ? "approved" : coupon.status === "redeemed" ? "pending" : "flagged"}`}>{coupon.status === "active" ? "사용 가능" : coupon.status === "redeemed" ? "사용 완료" : coupon.status === "expired" ? "만료" : "중지"}</span><small>{coupon.redeemedBy ? `${coupon.redeemedBy} · ${coupon.redeemedAt ? new Date(coupon.redeemedAt).toLocaleString("ko-KR") : "사용"}` : coupon.expiresAt ? `${new Date(coupon.expiresAt).toLocaleDateString("ko-KR")}까지` : "만료일 없음"}</small>{coupon.status === "active" ? <button className="dm-danger-outline" type="button" onClick={() => void manage({ action: "disable-credit-coupon", couponId: coupon.id })}>중지</button> : null}</article>) : <div className="dm-empty-row">발행한 쿠폰이 없습니다.</div>}</div>
  </section>;
}

type OperationsTab = "overview" | "reviews" | "billing" | "community" | "support";

function PaginatedOfficialReviewPanel({ payload, review, bulkReview, changePage }: { payload: OperationsPayload; review: (announcementId: string, status: "pending" | "approved" | "flagged") => void; bulkReview: (announcementIds: string[], status: "pending" | "approved" | "flagged") => Promise<void>; changePage: (page: number) => Promise<void> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const pagination = payload.reviewPagination;
  const visibleIds = payload.reviews.map((item) => item.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const pageNumbers = Array.from({ length: pagination.totalPages }, (_, index) => index + 1);
  const start = pagination.total ? ((pagination.page - 1) * pagination.pageSize) + 1 : 0;
  const end = Math.min(pagination.total, pagination.page * pagination.pageSize);

  useEffect(() => setSelected([]), [pagination.page]);

  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const applyBulk = async (status: "approved" | "flagged") => {
    await bulkReview(selected, status);
    setSelected([]);
  };

  return <section className="dm-plan-section">
    <div className="dm-plan-section-head"><div><h2>공식 공고 검수</h2><p>아직 승인되지 않은 진행 공고만 50개씩 표시합니다. 승인 완료·종료 공고는 검수 목록에서 제외됩니다.</p></div><span className={payload.metrics.pendingReviews ? "dm-badge" : "dm-runtime-badge is-openai"}>{payload.metrics.pendingReviews ? `처리 대기 ${payload.metrics.pendingReviews}` : "검수 완료"}</span></div>
    <div className="dm-review-page-summary"><strong>전체 {pagination.total.toLocaleString("ko-KR")}건</strong><span>{start.toLocaleString("ko-KR")}–{end.toLocaleString("ko-KR")}건 표시 · 페이지 {pagination.page}/{pagination.totalPages}</span></div>
    {payload.reviews.length ? <div className="dm-review-bulkbar"><label><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : visibleIds)} /><span>현재 페이지 전체 선택</span></label><strong>{selected.length}건 선택</strong><button className="dm-button" type="button" disabled={!selected.length} onClick={() => void applyBulk("flagged")}>선택 확인 필요</button><button className="dm-primary-button" type="button" disabled={!selected.length} onClick={() => void applyBulk("approved")}>선택 전체 승인</button></div> : null}
    <div className="dm-review-queue">{payload.reviews.length ? payload.reviews.map((item) => <article className={selected.includes(item.id) ? "is-selected" : ""} key={item.id}><label className="dm-review-check"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /><span className="sr-only">{item.title} 선택</span></label><div className="dm-review-queue-main"><span><b>{item.source}</b> · {item.institution}</span><strong>{item.title}</strong><small>{item.applyEndAt ? `마감 ${item.applyEndAt}` : "마감일 확인 필요"} · 최근 수집 {new Date(item.sourceCheckedAt).toLocaleString("ko-KR")}</small></div><span className={`dm-review-status is-${item.reviewStatus}`}>{item.reviewStatus === "approved" ? "승인" : item.reviewStatus === "flagged" ? "확인 필요" : "검수 대기"}</span><div className="dm-review-actions"><a className="dm-button" href={item.sourceUrl} target="_blank" rel="noreferrer">원문 ↗</a><button className="dm-button" type="button" disabled={item.reviewStatus === "flagged"} onClick={() => review(item.id, "flagged")}>확인 필요</button><button className="dm-primary-button" type="button" disabled={item.reviewStatus === "approved"} onClick={() => review(item.id, "approved")}>승인</button></div></article>) : <div className="dm-empty-row">현재 검수할 진행 공고가 없습니다.</div>}</div>
    {pagination.totalPages > 1 ? <nav className="dm-review-pagination" aria-label="공식 공고 검수 페이지"><button type="button" disabled={pagination.page === 1} onClick={() => void changePage(pagination.page - 1)}>이전</button>{pageNumbers.map((page) => <button className={page === pagination.page ? "is-current" : ""} type="button" aria-current={page === pagination.page ? "page" : undefined} key={page} onClick={() => void changePage(page)}>{page}</button>)}<button type="button" disabled={pagination.page === pagination.totalPages} onClick={() => void changePage(pagination.page + 1)}>다음</button></nav> : null}
  </section>;
}

function OperationsOverviewPanel({ payload, runAutomation, sendTestEmail }: { payload: OperationsPayload; runAutomation: () => Promise<void>; sendTestEmail: () => Promise<void> | void }) {
  return <div className="dm-operations-tab-content">
    <OperationsReadinessPanel payload={payload} runAutomation={runAutomation} sendTestEmail={sendTestEmail} />
    <section className="dm-plan-section"><div className="dm-plan-section-head"><div><h2>운영 연결</h2><p>키 자체는 노출하지 않고 활성화 여부만 표시합니다.</p></div></div><div className="dm-operation-grid"><OperationState label="K-Startup" ready={payload.connections.kstartup} /><OperationState label="기업마당" ready={payload.connections.bizinfo} /><OperationState label="AI 분석" ready={payload.connections.ai} /><OperationState label="이메일" ready={payload.connections.email} /><OperationState label="D1 데이터베이스" ready={payload.recovery.databaseBound} /><OperationState label="R2 비공개 파일" ready={payload.recovery.privateFileStorageBound} /></div></section>
    <section className="dm-plan-section"><div className="dm-plan-section-head"><div><h2>수집 출처 상태</h2><p>36시간 이상 갱신되지 않은 출처와 마감일 누락을 우선 확인합니다.</p></div><span className={payload.sourceHealth.some((item) => item.stale) ? "dm-runtime-badge" : "dm-runtime-badge is-openai"}>{payload.sourceHealth.some((item) => item.stale) ? "확인 필요" : "정상"}</span></div><div className="dm-operation-grid">{payload.sourceHealth.map((item) => <div className="dm-operation-state" key={item.source}><span>{item.source}</span><strong>{item.stale ? "수집 지연" : `진행 ${item.openCount}건`}</strong><small>전체 {item.totalCount} · 마감일 확인 {item.missingDeadlineCount}<br />{item.lastCheckedAt ? new Date(item.lastCheckedAt).toLocaleString("ko-KR") : "수집 이력 없음"}</small></div>)}</div><p className="dm-operation-summary">최근 정상 자동 실행 {payload.recovery.lastSuccessfulRunAt ? new Date(payload.recovery.lastSuccessfulRunAt).toLocaleString("ko-KR") : "없음"} · 감사 로그 {payload.recovery.auditRetentionDays}일 · 읽은 알림 {payload.recovery.readNotificationRetentionDays}일 보관</p></section>
    <div className="dm-operations-columns"><section className="dm-plan-section"><div className="dm-plan-section-head"><div><h2>자동 실행 이력</h2><p>일일 수집·추천·알림 처리 결과</p></div></div><div className="dm-ops-log">{payload.runs.length ? payload.runs.map((run) => <article key={String(run.id)}><span className={`is-${String(run.status)}`}>{String(run.status) === "completed" ? "완료" : String(run.status) === "failed" ? "오류" : "실행 중"}</span><div><strong>{new Date(String(run.started_at)).toLocaleString("ko-KR")}</strong><small>추가 {Number(run.inserted_count ?? 0)} · 변경 {Number(run.changed_count ?? 0)} · 추천 {Number(run.recommendation_count ?? 0)} · 알림 {Number(run.notification_count ?? 0)}</small>{run.error_message ? <p>{String(run.error_message)}</p> : null}</div></article>) : <div className="dm-empty-row">아직 실행 이력이 없습니다.</div>}</div></section><section className="dm-plan-section"><div className="dm-plan-section-head"><div><h2>보안 감사 기록</h2><p>AI·업로드·알림·내보내기·삭제 기록</p></div></div><div className="dm-ops-log">{payload.audits.length ? payload.audits.map((audit) => <article key={String(audit.id)}><span className={`is-${String(audit.severity)}`}>{String(audit.actor_role) === "admin" ? "관리자" : String(audit.actor_role) === "system" ? "시스템" : "사용자"}</span><div><strong>{String(audit.action)}</strong><small>{String(audit.entity_type)} · {new Date(String(audit.created_at)).toLocaleString("ko-KR")}</small></div></article>) : <div className="dm-empty-row">기록된 주요 작업이 없습니다.</div>}</div></section></div>
  </div>;
}

function TabbedOperationsView({ payload, state, refresh, review, bulkReview, manageCoupon, resolveRefund, manageCommunity, manageSupport, runAutomation, sendTestEmail }: { payload: OperationsPayload | null; state: "idle" | "loading" | "ready" | "error"; refresh: (reviewPage?: number) => Promise<void>; review: (announcementId: string, status: "pending" | "approved" | "flagged") => void; bulkReview: (announcementIds: string[], status: "pending" | "approved" | "flagged") => Promise<void>; manageCoupon: (input: { action: "create-credit-coupon"; code: string; credits: number; expiresAt?: string } | { action: "disable-credit-coupon"; couponId: string }) => Promise<void>; resolveRefund: (refundRequestId: string, decision: "approve" | "reject", note?: string) => Promise<void>; manageCommunity: (input: CommunityAdminAction) => Promise<void>; manageSupport: (input: SupportAdminAction) => Promise<void>; runAutomation: () => Promise<void>; sendTestEmail: () => Promise<void> | void }) {
  const [activeTab, setActiveTab] = useState<OperationsTab>("overview");
  if (state === "loading" || state === "idle") return <div className="dm-sync-state" role="status">운영 현황을 불러오는 중…</div>;
  if (state === "error" || !payload) return <div className="dm-empty"><strong>운영 현황을 불러오지 못했습니다.</strong><p>관리자 권한과 연결 상태를 확인해주세요.</p><button className="dm-button" type="button" onClick={() => void refresh()}>다시 불러오기</button></div>;

  const metricItems = [["전체 사용자", payload.metrics.users], ["진행 공고", payload.metrics.openAnnouncements], ["검수 대기", payload.metrics.pendingReviews], ["지연 출처", payload.metrics.staleAnnouncements], ["마감일 확인", payload.metrics.missingDeadlines], ["7일 자동화 오류", payload.metrics.failedRuns], ["7일 이메일 실패", payload.metrics.emailFailures], ["7일 AI 실패", payload.metrics.aiFailures], ["업로드 차단", payload.metrics.securityRejections]] as const;
  const tabs: Array<{ id: OperationsTab; label: string; count?: number }> = [
    { id: "overview", label: "운영 현황" },
    { id: "reviews", label: "공식 공고 검수", count: payload.metrics.pendingReviews },
    { id: "billing", label: "결제·쿠폰", count: payload.refundRequests.filter((item) => item.status === "pending").length },
    { id: "community", label: "커뮤니티", count: payload.community.posts.length },
    { id: "support", label: "고객 문의", count: payload.supportRequests.filter((item) => item.status === "received" || item.status === "in_review").length },
  ];

  return <div className="dm-operations-page">
    <section className="dm-operations-hero"><div><span className="dm-badge">Admin</span><h2>서비스 운영 상태</h2><p>공고 검수, 서비스 상태, 결제·쿠폰, 커뮤니티와 고객 문의를 주제별로 관리합니다.</p></div><button className="dm-button" type="button" onClick={() => void refresh(payload.reviewPagination.page)}>↻ 새로고침</button></section>
    <div className="dm-operations-metrics">{metricItems.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value.toLocaleString("ko-KR")}</strong></div>)}</div>
    <nav className="dm-operations-tabs" role="tablist" aria-label="운영 관리 주제">{tabs.map((tab) => <button className={activeTab === tab.id ? "is-selected" : ""} type="button" role="tab" aria-selected={activeTab === tab.id} key={tab.id} onClick={() => setActiveTab(tab.id)}><span>{tab.label}</span>{typeof tab.count === "number" ? <b>{tab.count.toLocaleString("ko-KR")}</b> : null}</button>)}</nav>
    <div role="tabpanel" className="dm-operations-panel">
      {activeTab === "overview" ? <OperationsOverviewPanel payload={payload} runAutomation={runAutomation} sendTestEmail={sendTestEmail} /> : null}
      {activeTab === "reviews" ? <PaginatedOfficialReviewPanel payload={payload} review={review} bulkReview={bulkReview} changePage={refresh} /> : null}
      {activeTab === "billing" ? <div className="dm-operations-tab-content"><CouponOperationsPanel coupons={payload.coupons} manage={manageCoupon} /><RefundOperationsPanel requests={payload.refundRequests} resolve={resolveRefund} /></div> : null}
      {activeTab === "community" ? <CommunityOperationsPanel community={payload.community} manage={manageCommunity} /> : null}
      {activeTab === "support" ? <SupportOperationsPanel requests={payload.supportRequests} manage={manageSupport} /> : null}
    </div>
  </div>;
}

function RefundOperationsPanel({ requests, resolve }: { requests: OperationsPayload["refundRequests"]; resolve: (refundRequestId: string, decision: "approve" | "reject", note?: string) => Promise<void> }) {
  return <section className="dm-plan-section"><div className="dm-plan-section-head"><div><h2>결제 환불 검토</h2><p>사용자가 접수한 요청을 확인한 뒤 연결된 결제사에 전체 환불하거나 반려합니다.</p></div><span className="dm-badge">대기 {requests.filter((item) => item.status === "pending").length}</span></div><div className="dm-refund-admin-list">{requests.length ? requests.map((item) => <article key={item.id}><div><strong>{item.email}</strong><span>{item.productId ?? "결제"} · {item.amount.toLocaleString("ko-KR")}원 · {item.provider === "portone_v1" ? "PortOne" : item.provider === "toss" ? "토스페이먼츠" : "Paddle"}</span><p>{item.reason}</p><small>{new Date(item.createdAt).toLocaleString("ko-KR")}</small></div><span className={`dm-review-status is-${item.status === "pending" ? "flagged" : item.status === "approved" ? "approved" : "pending"}`}>{item.status === "pending" ? "검토 대기" : item.status === "processing" ? "결제사 승인 대기" : item.status === "approved" ? "환불 승인" : "반려"}</span>{item.status === "pending" ? <div className="dm-review-actions"><button className="dm-button" type="button" onClick={() => void resolve(item.id, "reject", "운영 검토 결과 환불 조건을 충족하지 않았습니다.")}>반려</button><button className="dm-primary-button" type="button" onClick={() => void resolve(item.id, "approve")}>환불 승인 요청</button></div> : null}</article>) : <div className="dm-empty-row">접수된 환불 요청이 없습니다.</div>}</div></section>;
}

function OperationsView({ payload, state, refresh, review, bulkReview, manageCoupon, resolveRefund, manageCommunity, runAutomation, sendTestEmail }: { payload: OperationsPayload | null; state: "idle" | "loading" | "ready" | "error"; refresh: () => Promise<void>; review: (announcementId: string, status: "pending" | "approved" | "flagged") => void; bulkReview: (announcementIds: string[], status: "pending" | "approved" | "flagged") => Promise<void>; manageCoupon: (input: { action: "create-credit-coupon"; code: string; credits: number; expiresAt?: string } | { action: "disable-credit-coupon"; couponId: string }) => Promise<void>; resolveRefund: (refundRequestId: string, decision: "approve" | "reject", note?: string) => Promise<void>; manageCommunity: (input: CommunityAdminAction) => Promise<void>; runAutomation: () => Promise<void>; sendTestEmail: () => Promise<void> | void }) {
  if (state === "loading" || state === "idle") return <div className="dm-sync-state" role="status">운영 현황을 불러오는 중…</div>;
  if (state === "error" || !payload) return <div className="dm-empty"><strong>운영 현황을 불러오지 못했습니다.</strong><p>관리자 권한과 연결 상태를 확인해주세요.</p><button className="dm-button" type="button" onClick={() => void refresh()}>다시 불러오기</button></div>;
  const metricItems = [["전체 사용자", payload.metrics.users], ["진행 공고", payload.metrics.openAnnouncements], ["검수 대기", payload.metrics.pendingReviews], ["수집 지연", payload.metrics.staleAnnouncements], ["마감일 확인", payload.metrics.missingDeadlines], ["7일 자동화 오류", payload.metrics.failedRuns], ["7일 이메일 실패", payload.metrics.emailFailures], ["7일 AI 실패", payload.metrics.aiFailures], ["업로드 차단", payload.metrics.securityRejections]] as const;
  return <div className="dm-operations-page"><section className="dm-operations-hero"><div><span className="dm-badge">Admin</span><h2>서비스 운영 상태</h2><p>공고 수집, 알림·AI 실패, 결제·쿠폰과 보안 상태를 한곳에서 확인합니다.</p></div><button className="dm-button" type="button" onClick={() => void refresh()}>↻ 새로고침</button></section><div className="dm-operations-metrics">{metricItems.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value.toLocaleString("ko-KR")}</strong></div>)}</div><OperationsReadinessPanel payload={payload} runAutomation={runAutomation} sendTestEmail={sendTestEmail} /><OfficialReviewPanel payload={payload} review={review} bulkReview={bulkReview} /><CouponOperationsPanel coupons={payload.coupons} manage={manageCoupon} /><RefundOperationsPanel requests={payload.refundRequests} resolve={resolveRefund} /><CommunityOperationsPanel community={payload.community} manage={manageCommunity} /><section className="dm-plan-section"><div className="dm-plan-section-head"><div><h2>운영 연결</h2><p>키 자체는 노출하지 않고 활성화 여부만 표시합니다.</p></div></div><div className="dm-operation-grid"><OperationState label="K-Startup" ready={payload.connections.kstartup} /><OperationState label="기업마당" ready={payload.connections.bizinfo} /><OperationState label="AI 분석" ready={payload.connections.ai} /><OperationState label="이메일" ready={payload.connections.email} /><OperationState label="D1 데이터베이스" ready={payload.recovery.databaseBound} /><OperationState label="R2 비공개 파일" ready={payload.recovery.privateFileStorageBound} /></div></section><section className="dm-plan-section"><div className="dm-plan-section-head"><div><h2>수집 출처 상태</h2><p>36시간 이상 갱신되지 않은 출처와 마감일 누락을 우선 확인합니다.</p></div><span className={payload.sourceHealth.some((item) => item.stale) ? "dm-runtime-badge" : "dm-runtime-badge is-openai"}>{payload.sourceHealth.some((item) => item.stale) ? "확인 필요" : "정상"}</span></div><div className="dm-operation-grid">{payload.sourceHealth.map((item) => <div className="dm-operation-state" key={item.source}><span>{item.source}</span><strong>{item.stale ? "수집 지연" : `진행 ${item.openCount}건`}</strong><small>전체 {item.totalCount} · 마감일 확인 {item.missingDeadlineCount}<br />{item.lastCheckedAt ? new Date(item.lastCheckedAt).toLocaleString("ko-KR") : "수집 이력 없음"}</small></div>)}</div><p className="dm-operation-summary">최근 정상 자동 실행 {payload.recovery.lastSuccessfulRunAt ? new Date(payload.recovery.lastSuccessfulRunAt).toLocaleString("ko-KR") : "없음"} · 감사 로그 {payload.recovery.auditRetentionDays}일 · 읽은 알림 {payload.recovery.readNotificationRetentionDays}일 보관</p></section><div className="dm-operations-columns"><section className="dm-plan-section"><div className="dm-plan-section-head"><div><h2>자동 실행 이력</h2><p>일일 수집·추천·알림 처리 결과</p></div></div><div className="dm-ops-log">{payload.runs.length ? payload.runs.map((run) => <article key={String(run.id)}><span className={`is-${String(run.status)}`}>{String(run.status) === "completed" ? "완료" : String(run.status) === "failed" ? "오류" : "실행 중"}</span><div><strong>{new Date(String(run.started_at)).toLocaleString("ko-KR")}</strong><small>추가 {Number(run.inserted_count ?? 0)} · 변경 {Number(run.changed_count ?? 0)} · 추천 {Number(run.recommendation_count ?? 0)} · 알림 {Number(run.notification_count ?? 0)}</small>{run.error_message ? <p>{String(run.error_message)}</p> : null}</div></article>) : <div className="dm-empty-row">아직 실행 이력이 없습니다.</div>}</div></section><section className="dm-plan-section"><div className="dm-plan-section-head"><div><h2>보안 감사 기록</h2><p>AI·업로드·알림·내보내기·삭제 기록</p></div></div><div className="dm-ops-log">{payload.audits.length ? payload.audits.map((audit) => <article key={String(audit.id)}><span className={`is-${String(audit.severity)}`}>{String(audit.actor_role) === "admin" ? "관리자" : String(audit.actor_role) === "system" ? "시스템" : "사용자"}</span><div><strong>{String(audit.action)}</strong><small>{String(audit.entity_type)} · {new Date(String(audit.created_at)).toLocaleString("ko-KR")}</small></div></article>) : <div className="dm-empty-row">기록된 주요 작업이 없습니다.</div>}</div></section></div></div>;
}
