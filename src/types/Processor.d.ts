import {Decoder} from "./Decoder";

/**
 * Interface for HyperFrameset processors.
 * Processors define how a data source is transformed into an HTML fragment
 * using a declarative template.
 */
export interface Processor {
    /**
     * Load and preprocess a template fragment for later transformation.
     * Called once during frameset initialization.
     * @param template - The template fragment (child nodes of the <hf-transform> element).
     */
    loadTemplate(template: DocumentFragment): void;

    /**
     * Transform data from a provider using the loaded template.
     * @param provider - A Decoder instance providing data access via evaluate()/matches().
     * @param details - Transform context (mainSelector, url, etc.) passed as global params.
     * @returns The transformed output as a DocumentFragment, or a Promise resolving to one.
     */
    transform(provider: Decoder, details: object): DocumentFragment | Promise<DocumentFragment>;
}
