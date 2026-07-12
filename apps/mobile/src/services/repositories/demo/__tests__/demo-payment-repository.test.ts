import { runPaymentRepositoryContractTests } from '../../payment.contract'
import { DemoPaymentRepository } from '../demo-payment-repository'
import { brandId } from '@eltizamati/domain'

const demoFactory = () => new DemoPaymentRepository()
const userId = brandId<'user'>('demo-user')
const obligationId = brandId<'obligation'>('demo-obligation')

runPaymentRepositoryContractTests(
  demoFactory,
  () => userId,
  () => obligationId,
)
