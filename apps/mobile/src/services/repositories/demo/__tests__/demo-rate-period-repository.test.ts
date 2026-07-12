import { runRatePeriodRepositoryContractTests } from '../../rate-period.contract'
import { DemoRatePeriodRepository } from '../demo-rate-period-repository'
import { brandId } from '@eltizamati/domain'

const demoFactory = () => new DemoRatePeriodRepository()
const obligationId = brandId<'obligation'>('demo-obligation')

runRatePeriodRepositoryContractTests(demoFactory, obligationId)
