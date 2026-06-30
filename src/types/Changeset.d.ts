/**
 * A navigation changeset — describes which frame to update with which URL.
 * Created by lookup functions and stored in history state for back/forward restoration.
 */
interface Changeset {
    /** The URL being navigated to. */
    url: string;
    /** The target frame name (e.g. 'hf_main'). */
    target: string;
}
