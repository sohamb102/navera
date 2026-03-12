import { supabase } from '../src/supabaseClient.js';

const ADMIN_EMAIL = 'admin@navera.in';
const ADMIN_PASSWORD = 'AdminNavera@2026';

async function ensureAdminUser() {
  console.log('Creating / ensuring admin user:', ADMIN_EMAIL);

  // 1) Create auth user (email + password)
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });

  if (signUpError) {
    // If user already exists, Supabase may return an error; log but continue
    console.warn('auth.signUp error (continuing anyway):', signUpError.message);
  } else {
    console.log('auth.signUp result:', signUpData?.user?.id || 'created / pending confirmation');
  }

  // 2) Ensure entry exists in admins table
  const { data: existingAdmin, error: checkError } = await supabase
    .from('admins')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking admins table:', checkError.message);
    process.exit(1);
  }

  if (existingAdmin) {
    console.log('Admin row already exists in admins table with this email.');
    return;
  }

  const { error: insertError } = await supabase
    .from('admins')
    .insert([{ email: ADMIN_EMAIL }]);

  if (insertError) {
    console.error('Error inserting admin row:', insertError.message);
    process.exit(1);
  }

  console.log('Admin row inserted into admins table.');
}

ensureAdminUser()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });

