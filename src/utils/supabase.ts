// Single Supabase client for the whole app.
// Replaces src/utils/firebase.ts and every fetch() to the Express server.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !key) {
  throw new Error(
    'Missing Supabase environment variables. Check that .env exists locally ' +
      'and that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in ' +
      'Cloudflare Pages for both Production and Preview.',
  );
}

export const supabase = createClient(url, key, {
  auth: {
    // No user accounts in PickOne — voters are identified by a localStorage
    // UUID, not a Supabase session. Turning this off avoids pointless token
    // refresh traffic and stray auth state.
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * The review this deployment points at.
 *
 * The schema already supports many reviews — everything foreign-keys to a
 * `reviews` row. The UI is single-review for now, so the id comes from an env
 * var. When multi-review routing lands, read it from the URL instead
 * (e.g. /r/:reviewId) and delete this constant. No migration required.
 */
export const REVIEW_ID = import.meta.env.VITE_REVIEW_ID as string;

if (!REVIEW_ID) {
  throw new Error('Missing VITE_REVIEW_ID. Copy the id of your row in the reviews table.');
}

/** Storage bucket holding uploaded design assets. */
export const ASSET_BUCKET = 'work-assets';
