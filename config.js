// config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://bbyzibuavlgtzuqfmgnj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-esTtGeLnk_6YD3Ih7Sg8Q_tBLmKPD4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);