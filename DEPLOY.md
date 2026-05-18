# Deploy to Netlify + Supabase

## 1. Supabase Setup
1. Create project at supabase.com
2. Go to SQL Editor → run `supabase/schema.sql`
3. Copy your Project URL and anon key

## 2. Netlify Setup  
1. Push this repo to GitHub
2. Connect to Netlify → New site from Git
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables:
   - VITE_SUPABASE_URL=https://xxx.supabase.co
   - VITE_SUPABASE_ANON_KEY=your-anon-key

## 3. Auth
- App uses Supabase Magic Link (no password)
- First visit: enter email → check inbox → tap link → you're in
- All data is private to your account via Row Level Security

## 4. PWA Install
- Open in Safari on iPhone
- Tap Share → Add to Home Screen
- App opens fullscreen, no browser UI
