// Export all tool registration functions
// Note: Task management is handled by Task Master MCP - use that instead
export { registerPRDTools } from './prd-manager';
export { registerStoreOnboardingTools, StoreOnboardingManager } from './store-onboarding';
export { registerCartEnricherTools, CartEnricherManager } from './cart-enricher';

// Store Onboarding types
export type {
  ConfidenceLevel,
  IdLocation,
  IdFormat,
  FilterReason,
  UrlAnalysisResult,
  FilteredUrl,
  IdentifiedPattern,
  GeneratedPattern,
  FixtureTestCase,
} from './store-onboarding';

// Cart Enricher types
export type {
  RawProductViewEvent,
  RawCartProduct,
  RawCartEvent,
  ExtractedStoreMetadata,
  UniqueProduct,
  CartSnapshot,
  SessionAnalysisReport,
  MatchingStrategy,
  PredictionConfidence,
  MatchPrediction,
} from './cart-enricher';
