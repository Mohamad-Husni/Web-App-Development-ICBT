/**
 * GlobeTrek — public runtime configuration for the browser.
 *
 * The ANON key is a PUBLIC key (it is safe to ship in client-side code).
 * Your data is protected by Row Level Security (RLS) policies in Supabase.
 *
 * NEVER put the service_role / secret key in this file or anywhere in the
 * frontend — it bypasses RLS. Keep it only in the (git-ignored) .env file
 * for server-side use.
 */
window.GLOBETREK_CONFIG = {
    SUPABASE_URL: 'https://hxpgzfnxyuoftkztajpf.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cGd6Zm54eXVvZnRrenRhanBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTAyMzksImV4cCI6MjA5NzA4NjIzOX0.Xk-lWNp8FZQN8ka115ZQQyOJExtQSyQIzrMUF0fYljE',
    SITE_URL: 'https://wad-husni.vercel.app',
    REDIRECT_URL: (typeof window !== 'undefined' ? window.location.origin : 'https://wad-husni.vercel.app') + '/auth-callback.html'
};
