import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gdqnbejgqhdshpkmqxtk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkcW5iZWpncWhkc2hwa21xeHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjExMzgsImV4cCI6MjA4ODE5NzEzOH0.Ybq0rOMtkY3q-Osghr77Xmv100rlPkxj-ipYXSFaNyg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
