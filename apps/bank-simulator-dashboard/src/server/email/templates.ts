/**
 * Rate-change demo notification templates (docs/dashboard.md §11 "Email
 * templates" + the variable-rate correction "## Email wording"). EN and AR
 * built together per AI_AGENT_RULES §8. Never includes complete payment
 * history, full balance, account numbers, phone number, national ID, other
 * obligations, authentication links, passwords, or risk labels.
 */

export interface RateChangeEmailParams {
  readonly obligationNickname: string
  readonly oldRatePercent: string
  readonly newRatePercent: string
  readonly effectiveDate: string
  readonly projectedResidualAmount: string | undefined
  readonly currency: string
}

export interface RenderedEmail {
  readonly subject: string
  readonly text: string
}

export function renderRateChangeEmail(
  locale: 'en' | 'ar',
  params: RateChangeEmailParams,
): RenderedEmail {
  return locale === 'ar' ? renderArabic(params) : renderEnglish(params)
}

function renderEnglish(params: RateChangeEmailParams): RenderedEmail {
  const residualLine =
    params.projectedResidualAmount !== undefined
      ? `Eltizamati estimates that approximately ${params.projectedResidualAmount} ${params.currency} may remain at the original maturity date.`
      : 'Eltizamati could not estimate a projected balance from the available information.'

  const text = [
    'Demo notification — Eltizamati Bank Simulator',
    '',
    `Regarding: ${params.obligationNickname}`,
    '',
    `Your simulated variable interest rate changed from ${params.oldRatePercent}% to ${params.newRatePercent}%, effective ${params.effectiveDate}. In this demonstration, your monthly installment remains unchanged. This means more of each installment may go toward interest and less toward principal.`,
    '',
    residualLine,
    '',
    'This is an estimate, based on the available information and stated assumptions — not a guaranteed or contractual figure.',
    '',
    'Open Eltizamati to review this scenario in full.',
    '',
    'Questions you may want to confirm with your institution:',
    '- Is this rate change reflected on my actual account?',
    '- Has my monthly installment or contract terms changed?',
    '- What is my current official outstanding balance?',
    '',
    'This is a hackathon simulation and not an official notification from your bank.',
  ].join('\n')

  return { subject: 'Demo rate-change notification — Eltizamati', text }
}

function renderArabic(params: RateChangeEmailParams): RenderedEmail {
  const residualLine =
    params.projectedResidualAmount !== undefined
      ? `تقدّر Eltizamati أنه قد يتبقى مبلغ يقارب ${params.projectedResidualAmount} ${params.currency} عند تاريخ الاستحقاق الأصلي.`
      : 'تعذّر على Eltizamati تقدير الرصيد المتوقع بناءً على المعلومات المتاحة.'

  const text = [
    'إشعار تجريبي — محاكي البنك من Eltizamati',
    '',
    `بخصوص: ${params.obligationNickname}`,
    '',
    `تغيّر معدل الفائدة المتغير التجريبي الخاص بك من ${params.oldRatePercent}% إلى ${params.newRatePercent}%، اعتبارًا من ${params.effectiveDate}. في هذا العرض التوضيحي، يبقى القسط الشهري دون تغيير. هذا يعني أن جزءًا أكبر من كل قسط قد يذهب لتغطية الفائدة وجزءًا أقل لتخفيض أصل المبلغ.`,
    '',
    residualLine,
    '',
    'هذا تقدير مبني على المعلومات المتاحة والافتراضات المذكورة — وليس رقمًا مضمونًا أو تعاقديًا.',
    '',
    'افتح تطبيق Eltizamati لمراجعة هذا السيناريو بالكامل.',
    '',
    'أسئلة قد ترغب في تأكيدها مع مؤسستك المالية:',
    '- هل ينعكس هذا التغيير في المعدل على حسابي الفعلي؟',
    '- هل تغيّر قسطي الشهري أو شروط عقدي؟',
    '- ما هو رصيدي المستحق الرسمي الحالي؟',
    '',
    'هذا محاكاة ضمن مسابقة هاكاثون وليس إشعارًا رسميًا من بنكك.',
  ].join('\n')

  return { subject: 'إشعار تجريبي بتغيير المعدل — Eltizamati', text }
}
