import { runInsightRepositoryContractTests } from '../../insight.contract'
import { DemoInsightRepository } from '../demo-insight-repository'
import { brandId } from '@eltizamati/domain'

const demoFactory = () => new DemoInsightRepository()
const testUserIdFactory = () => brandId<'user'>(`demo-user-${crypto.randomUUID()}`)
const obligationId = brandId<'obligation'>('demo-obligation')

runInsightRepositoryContractTests(demoFactory, testUserIdFactory, obligationId)
