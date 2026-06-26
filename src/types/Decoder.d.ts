/**
 * Interface for HyperFrameset decoders.
 * Decoders provide query-based access to a source data structure
 * (DOM document, JSON object, Microdata items, etc).
 */
export interface Decoder {
    /**
     * Initialize the decoder with a source data structure.
     * @param source - The source to decode (Node for CSS/Microdata, object for JSON).
     */
    init(source: any): void;

    /**
     * Evaluate a query against the source data.
     * @param query - Query string (CSS selector, JSON dot-path, microdata path).
     * @param context - Current context node/object for relative queries.
     * @param variables - Variable bindings from haz:var/haz:param declarations.
     * @param wantArray - If true, return all matches as an array; if false, return first match only.
     * @returns The matched value(s): a node, string, object, array of nodes, or null/undefined if not found.
     */
    evaluate(query: string, context: any, variables: DecoderVariables, wantArray: boolean): any;

    /**
     * Test if a context matches a query expression.
     * Used by HazardProcessor for <haz:template match="..."> selection.
     * @param context - The context to test (element for CSS, object for JSON, node for Microdata).
     * @param query - Query expression to match against.
     * @returns The matched result (truthy if matches), or undefined/null if no match.
     */
    matches(context: any, query: string): any;
}

/**
 * Variable bindings passed to decoder evaluate methods.
 * Managed by HazardProcessor during template transformation.
 */
export interface DecoderVariables {
    /** Check whether a variable is defined in any scope. */
    has(key: string): boolean;

    /** Get a variable value. Checks scopes in order: localVars, localParams, globalVars, globalParams. */
    get(key: string): any;

    /** Set a variable in the specified scope. Setting null/undefined removes the value. */
    set(key: string, value: any, inParams?: boolean, isGlobal?: boolean): void;

    /** Push a new local scope (for entering a child template block). */
    push(params?: object): void;

    /** Pop the current local scope (for leaving a child template block). */
    pop(): void;
}
