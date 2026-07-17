import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text, space, radius, useTheme } from '@/core/design-system'
import type { TextColor } from '@/core/design-system/primitives/Text'
import type { LoanApplicationStatus } from '@eltizamati/domain'

const STATUS_LABEL_KEY: Record<LoanApplicationStatus, string> = {
  pending: 'loanApplication.statusPending',
  approved: 'loanApplication.statusApproved',
  rejected: 'loanApplication.statusRejected',
}

const STATUS_TEXT_COLOR: Record<LoanApplicationStatus, TextColor> = {
  pending: 'caution',
  approved: 'positive',
  rejected: 'critical',
}

/** Small status pill for a loan application — colour maps to state, never reused for anything else. */
export function ApplicationStatusBadge({ status }: { status: LoanApplicationStatus }) {
  const { t } = useTranslation()
  const theme = useTheme()

  const background =
    status === 'approved'
      ? theme.positiveSoft
      : status === 'rejected'
        ? theme.criticalSoft
        : theme.cautionSoft

  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text variant="caption" color={STATUS_TEXT_COLOR[status]}>
        {t(STATUS_LABEL_KEY[status])}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: space[2],
    paddingVertical: space[1],
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
})
