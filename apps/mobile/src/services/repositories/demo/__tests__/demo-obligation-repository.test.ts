import { runObligationRepositoryContractTests } from '../../obligation.contract'
import { DemoObligationRepository } from '../demo-obligation-repository'
import { brandId } from '@eltizamati/domain'

const demoFactory = () => new DemoObligationRepository()
const testUserIdFactory = () => brandId<'user'>(`demo-user-${crypto.randomUUID()}`)

runObligationRepositoryContractTests(demoFactory, testUserIdFactory)
