// Supabase client initialization for browser
const supabaseUrl = 'https://veinovavtwnipoykvswf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaW5vdmF2dHduaXBveWt2c3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjY3MTksImV4cCI6MjA5MDA0MjcxOX0.JaBzZsbUG7zVCfLc-Qcu6MLDdSNp54hUjBPs1TN3rKk';

window.supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

// Global helper to invoke Supabase functions with auth token
window.invokeFunction = async function(functionName, body) {
  const { data: { session } } = await window.supabase.auth.getSession();
  return await window.supabase.functions.invoke(functionName, {
    body,
    headers: {
      Authorization: `Bearer ${session?.access_token}`
    }
  });
};
