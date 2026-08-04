import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://zualrdvvlcoexqrbedhl.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1YWxyZHZ2bGNvZXhxcmJlZGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MTYwMjMsImV4cCI6MjEwMDA5MjAyM30.1JgXhpQccIOxgFgvx_G7cBlnCkSiWQhEihUAd8xCyV8';

const getUrl = () => import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('baanmai_supabase_url') || DEFAULT_URL;
const getKey = () => import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('baanmai_supabase_anon_key') || DEFAULT_KEY;

export const isSupabaseConfigured = (): boolean => {
  const url = getUrl();
  const key = getKey();
  return (
    typeof url === 'string' &&
    url.length > 0 &&
    url.startsWith('https://') &&
    typeof key === 'string' &&
    key.length > 0
  );
};

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) return null;
  return createClient(getUrl(), getKey());
};

export const saveSupabaseCredentials = (url: string, key: string) => {
  if (url) localStorage.setItem('baanmai_supabase_url', url.trim());
  else localStorage.removeItem('baanmai_supabase_url');

  if (key) localStorage.setItem('baanmai_supabase_anon_key', key.trim());
  else localStorage.removeItem('baanmai_supabase_anon_key');
};

export const getSupabaseCredentials = () => {
  return {
    url: getUrl(),
    key: getKey(),
  };
};
