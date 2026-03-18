// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://eqgtyveijshkljffnrvf.supabase.co'   // 👈 แทนด้วย URL ของคุณ
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZ3R5dmVpanNoa2xqZmZucnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDUyMDMsImV4cCI6MjA4OTM4MTIwM30.WNRr_wwJTcSOo_tR8JFHeHcI5tzGgD1vROvaqPFajao'                          // 👈 แทนด้วย anon key ของคุณ

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
