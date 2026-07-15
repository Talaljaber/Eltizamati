import Constants, { ExecutionEnvironment } from 'expo-constants'

/**
 * True when running inside the Expo Go client app, as opposed to a
 * standalone build or a custom dev client. Expo Go doesn't register a
 * native splash screen for the running view controller, so APIs like
 * expo-splash-screen's preventAutoHideAsync/hideAsync always reject there
 * — and the native side reports that as a red-box error independently of
 * whether the JS promise itself is caught, so the reliable fix is to skip
 * the call entirely rather than suppress its rejection.
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient
