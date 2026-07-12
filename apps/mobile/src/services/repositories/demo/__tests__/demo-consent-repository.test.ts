import { runConsentRepositoryContractTests } from '../../consent.contract'
import { DemoConsentRepository } from '../demo-consent-repository'
import { brandId } from '@eltizamati/domain'

const demoFactory = () => new DemoConsentRepository()
const testUserIdFactory = () => brandId<'user'>(`demo-user-${crypto.randomUUID()}`)

runConsentRepositoryContractTests(demoFactory, testUserIdFactory)
