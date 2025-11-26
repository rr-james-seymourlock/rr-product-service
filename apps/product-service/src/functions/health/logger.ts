/**
 * Logger instance for health check endpoint
 */
import { createLogger } from '@rr/shared/utils';

export { createLogger };

export const logger = createLogger('product-service.health');
