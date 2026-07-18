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

export interface LoanApprovedEmailParams {
  readonly institutionName: string
  readonly approvedAmount: string
  readonly approvedTermMonths: number
  readonly approvedRatePercent: string
  readonly currency: string
}

export interface LoanRejectedEmailParams {
  readonly institutionName: string
  readonly reason: string
}

export interface ScheduleProposalDecisionEmailParams {
  readonly obligationNickname: string
  readonly decision: 'approved' | 'rejected'
  readonly proposedInstallment: string
  readonly finalBalloon: string
  readonly currency: string
  readonly reason: string | undefined
}

export function renderScheduleProposalDecisionEmail(
  locale: 'en' | 'ar',
  params: ScheduleProposalDecisionEmailParams,
): RenderedEmail {
  const approved = params.decision === 'approved'
  if (locale === 'ar') {
    const lines = approved
      ? [
          `وافق البنك على جدول السداد المقترح الخاص بـ ${params.obligationNickname}.`,
          `أصبح القسط المقترح ${params.proposedInstallment} ${params.currency} والدفعة الأخيرة الموضحة ${params.finalBalloon} ${params.currency} هو جدول السداد المتفق عليه الجديد.`,
        ]
      : [
          `لم يوافق البنك على جدول السداد المقترح الخاص بـ ${params.obligationNickname}.`,
          'لم يتغير جدول السداد المتفق عليه الحالي.',
          ...(params.reason === undefined ? [] : [`السبب: ${params.reason}`]),
        ]
    return {
      subject: approved ? 'تمت الموافقة على جدول السداد المقترح' : 'تحديث حول جدول السداد المقترح',
      text: [
        'تحديث من محاكي البنك في Eltizamati (تجريبي)',
        '',
        ...lines,
        '',
        'افتح تطبيق Eltizamati لمراجعة التفاصيل.',
        '',
        'هذه محاكاة وليست إشعاراً رسمياً من بنكك.',
      ].join('\n'),
    }
  }

  const lines = approved
    ? [
        `The bank approved the proposed payment schedule for ${params.obligationNickname}.`,
        `The proposal with an installment of ${params.proposedInstallment} ${params.currency} and a clearly shown final payment of ${params.finalBalloon} ${params.currency} is now your new agreed schedule.`,
      ]
    : [
        `The bank did not approve the proposed payment schedule for ${params.obligationNickname}.`,
        'Your current agreed schedule has not changed.',
        ...(params.reason === undefined ? [] : [`Reason: ${params.reason}`]),
      ]
  return {
    subject: approved ? 'Your proposed schedule was approved' : 'Update on your proposed schedule',
    text: [
      'Eltizamati Bank Simulator update (demo)',
      '',
      ...lines,
      '',
      'Open Eltizamati to review the details.',
      '',
      'This is a simulation and not an official notification from your bank.',
    ].join('\n'),
  }
}

export function renderLoanApprovedEmail(
  locale: 'en' | 'ar',
  params: LoanApprovedEmailParams,
): RenderedEmail {
  if (locale === 'ar') {
    const text = [
      'تحديث بشأن طلب القرض — محاكي البنك من Eltizamati (تجريبي)',
      '',
      `تمت الموافقة على طلب قرضك مع ${params.institutionName}.`,
      `المبلغ المعتمد: ${params.approvedAmount} ${params.currency} على مدى ${params.approvedTermMonths} شهرًا بمعدل سنوي ${params.approvedRatePercent}%.`,
      '',
      'افتح تطبيق Eltizamati لرؤية القرض ضمن التزاماتك.',
      '',
      'هذا محاكاة ضمن مسابقة هاكاثون وليس إشعارًا رسميًا من بنكك.',
    ].join('\n')
    return { subject: 'تمت الموافقة على طلب قرضك — Eltizamati', text }
  }
  const text = [
    'Loan application update — Eltizamati Bank Simulator (demo)',
    '',
    `Your loan application with ${params.institutionName} has been approved.`,
    `Approved: ${params.approvedAmount} ${params.currency} over ${params.approvedTermMonths} months at ${params.approvedRatePercent}% per year.`,
    '',
    'Open Eltizamati to see the loan among your obligations.',
    '',
    'This is a hackathon simulation and not an official notification from your bank.',
  ].join('\n')
  return { subject: 'Your loan application was approved — Eltizamati', text }
}

export function renderLoanRejectedEmail(
  locale: 'en' | 'ar',
  params: LoanRejectedEmailParams,
): RenderedEmail {
  if (locale === 'ar') {
    const text = [
      'تحديث بشأن طلب القرض — محاكي البنك من Eltizamati (تجريبي)',
      '',
      `لم تتم الموافقة على طلب قرضك مع ${params.institutionName} في هذه المرة.`,
      `السبب: ${params.reason}`,
      '',
      'يمكنك مراجعة طلباتك داخل تطبيق Eltizamati.',
      '',
      'هذا محاكاة ضمن مسابقة هاكاثون وليس إشعارًا رسميًا من بنكك.',
    ].join('\n')
    return { subject: 'تحديث بشأن طلب قرضك — Eltizamati', text }
  }
  const text = [
    'Loan application update — Eltizamati Bank Simulator (demo)',
    '',
    `Your loan application with ${params.institutionName} was not approved this time.`,
    `Reason: ${params.reason}`,
    '',
    'You can review your applications in the Eltizamati app.',
    '',
    'This is a hackathon simulation and not an official notification from your bank.',
  ].join('\n')
  return { subject: 'An update on your loan application — Eltizamati', text }
}

export interface CustomEmailParams {
  readonly subject: string
  readonly body: string
}

/**
 * A free-text message an operator composes from the dashboard (Communications
 * → Compose), not tied to any rate campaign. The demo disclaimer is always
 * appended regardless of what the operator wrote — this can never read as
 * official bank correspondence, no matter the subject/body content.
 */
export function renderCustomEmail(locale: 'en' | 'ar', params: CustomEmailParams): RenderedEmail {
  return locale === 'ar' ? renderCustomArabic(params) : renderCustomEnglish(params)
}

function renderCustomEnglish(params: CustomEmailParams): RenderedEmail {
  const text = [
    'Message from Eltizamati Bank Simulator (demo)',
    '',
    params.body,
    '',
    'This is a hackathon simulation and not an official notification from your bank.',
  ].join('\n')
  return { subject: params.subject, text }
}

function renderCustomArabic(params: CustomEmailParams): RenderedEmail {
  const text = [
    'رسالة من محاكي البنك من Eltizamati (تجريبي)',
    '',
    params.body,
    '',
    'هذا محاكاة ضمن مسابقة هاكاثون وليس إشعارًا رسميًا من بنكك.',
  ].join('\n')
  return { subject: params.subject, text }
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
