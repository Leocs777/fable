import { l } from "@/lib/i18n";

export type PurchasePlan = "subscription" | "single";
export type EntitlementKey = "deep_report";

export type PurchaseProduct = {
  plan: PurchasePlan;
  productId: string;
  entitlement: EntitlementKey;
  title: string;
  price: string;
  body: string;
};

export type PurchaseResult = {
  plan: PurchasePlan;
  productId: string;
  entitlement: EntitlementKey;
  reportId: string;
  transactionId: string;
  active: boolean;
  sandbox: boolean;
};

const DEEP_REPORT_PRODUCT_DEFS: Array<Omit<PurchaseProduct, "title" | "body"> & { title: Parameters<typeof l>[0]; body: Parameters<typeof l>[0] }> = [
  {
    plan: "subscription",
    productId: "com.founders.fable.deep.monthly",
    entitlement: "deep_report",
    title: { zh: "月度订阅", en: "Monthly" },
    price: "$9.99",
    body: { zh: "无限查看深度报告与追问", en: "Unlimited deep reports and follow-ups" },
  },
  {
    plan: "single",
    productId: "com.founders.fable.deep.single",
    entitlement: "deep_report",
    title: { zh: "单次报告", en: "Single report" },
    price: "$2.99",
    body: { zh: "解锁本次卦象完整解释", en: "Unlock this full reading" },
  },
];

let subscriptionActive = false;
const unlockedReports = new Set<string>();

export function listDeepReportProducts(): PurchaseProduct[] {
  return DEEP_REPORT_PRODUCT_DEFS.map(localizeProduct);
}

export function getDeepReportProduct(plan: PurchasePlan): PurchaseProduct {
  const product = DEEP_REPORT_PRODUCT_DEFS.find((item) => item.plan === plan);
  if (!product) throw new Error(`unknown purchase plan: ${plan}`);
  return localizeProduct(product);
}

export function hasDeepReportAccess(reportId: string | null): boolean {
  if (subscriptionActive) return true;
  if (!reportId) return false;
  return unlockedReports.has(reportId);
}

export async function purchaseDeepReport(plan: PurchasePlan, reportId: string): Promise<PurchaseResult> {
  const product = getDeepReportProduct(plan);
  await wait(420);
  if (plan === "subscription") {
    subscriptionActive = true;
  } else {
    unlockedReports.add(reportId);
  }

  return {
    plan,
    productId: product.productId,
    entitlement: product.entitlement,
    reportId,
    transactionId: `sandbox-${Date.now()}-${product.productId}`,
    active: true,
    sandbox: true,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function localizeProduct(product: (typeof DEEP_REPORT_PRODUCT_DEFS)[number]): PurchaseProduct {
  return {
    ...product,
    title: l(product.title),
    body: l(product.body),
  };
}
