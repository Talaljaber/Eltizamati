import { runCalculationRunContractTests } from '../../calculation-run.contract'
import { DemoCalculationRunRepository } from '../demo-calculation-run-repository'
import { brandId } from '@eltizamati/domain'

const demoFactory = () => new DemoCalculationRunRepository()
const testUserIdFactory = () => brandId<'user'>('demo-user')

runCalculationRunContractTests(demoFactory, testUserIdFactory)
