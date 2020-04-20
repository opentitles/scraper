import { ExtendedOutput } from "./ExtendedOutput";

/**
 * A processor can intake a feed via the constructor and process it to, for example, remove duplicates and items without an ID.
 *
 * Prefered implementation is by extending BasicProcessor
 */
export interface Processor {
  toExtendedOutput(): Promise<ExtendedOutput>;
}