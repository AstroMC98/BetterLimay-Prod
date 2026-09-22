import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useParams } from "react-router-dom";

import { ErrorBoundary } from "../components/errors/ErrorBoundary";
import { RootLayout } from "../components/layout/RootLayout";
import { HomePage } from "../pages/HomePage";
import {
  FeatureDisabledPage,
  NotFoundPage,
  OfflinePage,
} from "../pages/PortalStatusPages";
import type { DisabledFeature } from "../pages/PortalStatusPages";
import {
  ServiceCategoryPage,
  ServiceDetailPage,
  ServicesPage,
} from "../pages/ServicePages";
import {
  ElectedOfficialsPage,
  GovernmentBranchPage,
  GovernmentBranchRoute,
  GovernmentPage,
} from "../pages/GovernmentPages";
import { SearchPage } from "../pages/SearchPage";
import { LegislationDetailPage, LegislationPage } from "../pages/LegislationPages";
import { StatisticsPage, TransparencyPage } from "../pages/TransparencyPages";
import {
  AboutPage,
  AccessibilityPage,
  ContributePage,
  FaqPage,
  LegalPage,
  NewsPage,
  PrivacyPage,
  ReportPage,
  SitemapPage,
  TermsPage,
} from "../pages/SupportPages";

export const MVP_ROUTE_PATHS = [
  "/",
  "/services",
  "/services/:category",
  "/services/:category/:slug",
  "/search",
  "/government",
  "/government/executive",
  "/government/legislative",
  "/government/ex-officio",
  "/government/departments",
  "/government/barangays",
  "/government/elected-officials",
  "/executive",
  "/elected-officials",
  "/departments",
  "/barangays",
  "/about",
  "/legal",
  "/legal/privacy",
  "/legal/terms",
  "/offline",
  "/legislation",
  "/legislation/:id",
  "/transparency",
  "/statistics",
  "/news",
  "/report",
  "/contribute",
  "/faq",
  "/accessibility",
  "/privacy",
  "/terms",
  "/sitemap",
  "/feature-disabled/:feature",
  "*",
] as const;

function isDisabledFeature(value: string | undefined): value is DisabledFeature {
  return ["legislation", "transparency", "statistics", "news", "reports"].includes(
    value ?? "",
  );
}

function DynamicFeatureDisabledRoute() {
  const { feature } = useParams();

  if (!isDisabledFeature(feature)) {
    return <NotFoundPage />;
  }

  return <FeatureDisabledPage feature={feature} />;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorBoundary>{<NotFoundPage />}</ErrorBoundary>,
    children: [
      { index: true, element: <HomePage /> },
      { path: "services", element: <ServicesPage /> },
      { path: "services/:category", element: <ServiceCategoryPage /> },
      { path: "services/:category/:slug", element: <ServiceDetailPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "government", element: <GovernmentPage /> },
      { path: "government/:branch", element: <GovernmentBranchRoute /> },
      { path: "executive", element: <GovernmentBranchPage branch="executive" /> },
      { path: "elected-officials", element: <ElectedOfficialsPage /> },
      { path: "departments", element: <GovernmentBranchPage branch="departments" /> },
      { path: "barangays", element: <GovernmentBranchPage branch="barangays" /> },
      {
        path: "about",
        element: <AboutPage />,
      },
      {
        path: "legal",
        element: <LegalPage />,
      },
      {
        path: "legal/privacy",
        element: <PrivacyPage path="/legal/privacy" />,
      },
      {
        path: "legal/terms",
        element: <TermsPage path="/legal/terms" />,
      },
      { path: "offline", element: <OfflinePage /> },
      { path: "legislation", element: <LegislationPage /> },
      { path: "legislation/:id", element: <LegislationDetailPage /> },
      { path: "transparency", element: <TransparencyPage /> },
      { path: "statistics", element: <StatisticsPage /> },
      { path: "news", element: <NewsPage /> },
      { path: "report", element: <ReportPage /> },
      { path: "contribute", element: <ContributePage /> },
      { path: "faq", element: <FaqPage /> },
      { path: "accessibility", element: <AccessibilityPage /> },
      { path: "privacy", element: <PrivacyPage /> },
      { path: "terms", element: <TermsPage /> },
      { path: "sitemap", element: <SitemapPage /> },
      {
        path: "feature-disabled/:feature",
        element: <DynamicFeatureDisabledRoute />,
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
