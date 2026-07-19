/**
 * Bilingual copy for the required dashboard surfaces (docs/dashboard.md §15,
 * Phase 5): nav, demo banner, the Bank Rate Simulator campaign form, the
 * impact-preview display block, client summary labels, and refusal/warning
 * messages. This is a small, hand-maintained dictionary — not the full
 * mobile i18n stack (i18next + AsyncStorage + RN reload semantics), which
 * has no equivalent need in a stateless server-rendered demo app. Insight
 * `titleKey`/`bodyKey` values are resolved against this same table so their
 * copy matches the mobile app exactly (see the `insight.*` keys).
 */
export type Locale = 'en' | 'ar'

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'ar']

const en = {
  'nav.title': 'Eltizamati Bank Simulator',
  'nav.subtitle': 'Demo institution and regulatory operations portal',
  'nav.overview': 'Overview',
  'nav.clients': 'Clients',
  'nav.portfolio': 'Portfolio',
  'nav.bankRateSimulator': 'Bank Rate Simulator',
  'nav.benchmarkSimulator': 'Benchmark Simulator',
  'nav.loanApplications': 'Loan Applications',
  'nav.communications': 'Communications',
  'nav.activityLog': 'Activity Log',
  'nav.demoSettings': 'Demo Settings',
  'nav.language': 'Language',

  'demoBanner.text': 'Demo environment — not an official bank or Central Bank system.',

  'bankRateSimulator.title': 'Bank Rate Simulator',
  'bankRateSimulator.subtitle':
    "Preview a rate change, then publish to append the real rate history, re-run the affected loans' calculations and insights, and queue notifications. Rate history is append-only — publishing never rewrites an existing rate period.",
  'bankRateSimulator.institution': 'Institution',
  'bankRateSimulator.selectInstitution': 'Select institution',
  'bankRateSimulator.allInstitutions': 'All institutions',
  'bankRateSimulator.newAnnualRate': 'New annual rate (%)',
  'bankRateSimulator.effectiveDate': 'Effective date',
  'bankRateSimulator.installmentPolicy': 'Installment policy',
  'bankRateSimulator.policyUnchanged': 'Unchanged installment (default)',
  'bankRateSimulator.policyRecalculated': 'Recalculated installment',
  'bankRateSimulator.policyUnknown': 'Unknown contract treatment',
  'bankRateSimulator.previewCampaign': 'Preview campaign',
  'bankRateSimulator.selectPrompt':
    'Select an institution and a new annual rate to preview eligible loans and their impact.',
  'bankRateSimulator.publishSection': 'Publish this campaign',
  'bankRateSimulator.campaignName': 'Campaign name',
  'bankRateSimulator.reason': 'Reason',
  'bankRateSimulator.sourceNote': 'Source note',
  'bankRateSimulator.sendEmail':
    "Send email notifications (only to recipients who consented, and subject to the current email mode)",
  'bankRateSimulator.publishButton': 'Publish campaign',
  'bankRateSimulator.excludedObligations': 'Excluded obligations',

  'impactPreview.narrative':
    'Your simulated interest rate increased while your monthly installment remained unchanged. A larger part of each payment now covers interest, leaving less to reduce the principal. Based on the available information, an estimated balance may remain at the original maturity date.',
  'impactPreview.currentRate': 'Current rate',
  'impactPreview.newRate': 'New rate',
  'impactPreview.installment': 'Monthly installment',
  'impactPreview.installmentPolicy': 'Installment policy',
  'impactPreview.previousInterest': 'Previous estimated interest portion',
  'impactPreview.newInterest': 'New estimated interest portion',
  'impactPreview.previousPrincipal': 'Previous estimated principal portion',
  'impactPreview.newPrincipal': 'New estimated principal portion',
  'impactPreview.contractualMaturity': 'Contractual maturity date',
  'impactPreview.projectedResidual': 'Projected residual at maturity',
  'impactPreview.residualRisk': 'Residual risk',
  'impactPreview.additionalInstallments': 'Estimated equivalent additional installments',
  'impactPreview.assumptions': 'Assumptions',
  'impactPreview.negativeAmortization': 'Negative amortization detected in {count} period(s).',
  'impactPreview.unavailable': 'Unavailable',

  'clientSummary.title': 'Profile',
  'clientSummary.language': 'Language',
  'clientSummary.primaryBank': 'Primary bank',
  'clientSummary.dataMode': 'Data mode',
  'clientSummary.updated': 'Updated',
  'clientSummary.backToClients': '← Back to clients',

  'warning.notAllowlisted': 'This client could not be found.',
  'warning.couldNotLoadData':
    'Could not load client data. Check Demo Settings for configuration state.',
  'warning.noProfile': 'No profile row exists for this user id.',
  'warning.impactUnavailable': 'Impact unavailable because the required contract inputs are missing.',

  'demo.badge': 'Demo',
  'demo.simulated': 'Simulated',
} as const

const ar: Record<keyof typeof en, string> = {
  'nav.title': 'محاكي البنك الإلتزاماتي',
  'nav.subtitle': 'بوابة عرض تجريبية لعمليات المؤسسة المالية والجهة الرقابية',
  'nav.overview': 'نظرة عامة',
  'nav.clients': 'العملاء',
  'nav.portfolio': 'المحفظة',
  'nav.bankRateSimulator': 'محاكي تغيير سعر الفائدة',
  'nav.benchmarkSimulator': 'محاكي سعر المرجع',
  'nav.loanApplications': 'طلبات القروض',
  'nav.communications': 'المراسلات',
  'nav.activityLog': 'سجل النشاط',
  'nav.demoSettings': 'إعدادات العرض التجريبي',
  'nav.language': 'اللغة',

  'demoBanner.text': 'بيئة عرض تجريبية — ليست نظام بنك رسمي أو نظام تابعًا للبنك المركزي.',

  'bankRateSimulator.title': 'محاكي تغيير سعر الفائدة',
  'bankRateSimulator.subtitle':
    'عاين تغيير سعر الفائدة، ثم انشر لإضافة سجل السعر الفعلي، وإعادة حساب القروض المتأثرة ومؤشراتها، وجدولة الإشعارات. سجل الأسعار يُضاف إليه فقط — النشر لا يعيد كتابة أي فترة سعر موجودة أبدًا.',
  'bankRateSimulator.institution': 'المؤسسة',
  'bankRateSimulator.selectInstitution': 'اختر المؤسسة',
  'bankRateSimulator.allInstitutions': 'جميع المؤسسات',
  'bankRateSimulator.newAnnualRate': 'السعر السنوي الجديد (%)',
  'bankRateSimulator.effectiveDate': 'تاريخ السريان',
  'bankRateSimulator.installmentPolicy': 'سياسة القسط',
  'bankRateSimulator.policyUnchanged': 'قسط ثابت بدون تغيير (افتراضي)',
  'bankRateSimulator.policyRecalculated': 'إعادة احتساب القسط',
  'bankRateSimulator.policyUnknown': 'معالجة العقد غير معروفة',
  'bankRateSimulator.previewCampaign': 'معاينة الحملة',
  'bankRateSimulator.selectPrompt': 'اختر مؤسسة وسعرًا سنويًا جديدًا لمعاينة القروض المؤهلة وأثرها.',
  'bankRateSimulator.publishSection': 'نشر هذه الحملة',
  'bankRateSimulator.campaignName': 'اسم الحملة',
  'bankRateSimulator.reason': 'السبب',
  'bankRateSimulator.sourceNote': 'ملاحظة المصدر',
  'bankRateSimulator.sendEmail':
    'إرسال إشعارات بالبريد الإلكتروني (فقط للمستلمين الذين وافقوا، ووفقًا لوضع البريد الحالي)',
  'bankRateSimulator.publishButton': 'نشر الحملة',
  'bankRateSimulator.excludedObligations': 'الالتزامات المستبعدة',

  'impactPreview.narrative':
    'ارتفع سعر الفائدة المحاكى لديك بينما بقي القسط الشهري دون تغيير. أصبح جزء أكبر من كل دفعة يغطي الفائدة، مما يترك جزءًا أقل لتخفيض أصل الدين. بناءً على المعلومات المتاحة، قد يتبقى رصيد تقديري عند تاريخ الاستحقاق الأصلي.',
  'impactPreview.currentRate': 'السعر الحالي',
  'impactPreview.newRate': 'السعر الجديد',
  'impactPreview.installment': 'القسط الشهري',
  'impactPreview.installmentPolicy': 'سياسة القسط',
  'impactPreview.previousInterest': 'جزء الفائدة التقديري السابق',
  'impactPreview.newInterest': 'جزء الفائدة التقديري الجديد',
  'impactPreview.previousPrincipal': 'جزء أصل الدين التقديري السابق',
  'impactPreview.newPrincipal': 'جزء أصل الدين التقديري الجديد',
  'impactPreview.contractualMaturity': 'تاريخ الاستحقاق التعاقدي',
  'impactPreview.projectedResidual': 'الرصيد المتوقع عند الاستحقاق',
  'impactPreview.residualRisk': 'مخاطرة رصيد متبقٍ',
  'impactPreview.additionalInstallments': 'عدد الأقساط الإضافية التقديرية المكافئة',
  'impactPreview.assumptions': 'الافتراضات',
  'impactPreview.negativeAmortization': 'تم رصد استهلاك سلبي في {count} فترة/فترات.',
  'impactPreview.unavailable': 'غير متاح',

  'clientSummary.title': 'الملف الشخصي',
  'clientSummary.language': 'اللغة',
  'clientSummary.primaryBank': 'البنك الرئيسي',
  'clientSummary.dataMode': 'وضع البيانات',
  'clientSummary.updated': 'آخر تحديث',
  'clientSummary.backToClients': '→ العودة إلى العملاء',

  'warning.notAllowlisted': 'تعذّر العثور على هذا العميل.',
  'warning.couldNotLoadData':
    'تعذر تحميل بيانات العميل. تحقق من إعدادات العرض التجريبي لمعرفة حالة التهيئة.',
  'warning.noProfile': 'لا يوجد سجل ملف شخصي لمعرّف المستخدم هذا.',
  'warning.impactUnavailable': 'الأثر غير متاح لأن مدخلات العقد المطلوبة غير متوفرة.',

  'demo.badge': 'تجريبي',
  'demo.simulated': 'محاكى',
}

const dictionaries: Record<Locale, Record<keyof typeof en, string>> = { en, ar }

export type TranslationKey = keyof typeof en

export function t(locale: Locale, key: TranslationKey, params?: Record<string, string | number>): string {
  const template = dictionaries[locale][key]
  if (params === undefined) return template
  return Object.entries(params).reduce(
    (result, [paramKey, value]) => result.replaceAll(`{${paramKey}}`, String(value)),
    template,
  )
}
