// utils/purchases.native.ts
// On native (iOS/Android), use the real react-native-purchases SDK.
// Metro resolves '@/utils/purchases' → this file via the .native.ts extension.
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

export default Purchases;
export { LOG_LEVEL };
export const isPurchasesAvailable = true;
