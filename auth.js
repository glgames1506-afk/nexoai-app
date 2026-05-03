/**
 * Nexo AI — Auth Engine (Supabase)
 */

const SUPABASE_URL      = 'https://tqqtjrunrimabitmersr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcXRqcnVucmltYWJpdG1lcnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NjYwMjgsImV4cCI6MjA5MjA0MjAyOH0.CEJRX8rYb_5S5pN_M2KemyBRxdSPd9jf8Y-Xm3vlTDc';

let supabase = null;
try {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch(e) { console.error('Supabase init error:', e); }

// ── Lógica do Login (executa só depois do DOM estar pronto) ──
window.addEventListener('DOMContentLoaded', () => {
  const btnLogin   = document.getElementById('btn-login');
  const emailInput = document.getElementById('email');
  const passInput  = document.getElementById('password');

  if (btnLogin) {
    btnLogin.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = emailInput ? emailInput.value.trim() : '';
      const pass  = passInput  ? passInput.value         : '';

      if (!email || !pass) { showFeedback('Preencha todos os campos.', 'error'); return; }

      btnLogin.disabled    = true;
      btnLogin.textContent = 'Entrando...';

      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        showFeedback('Acesso autorizado! Redirecionando...', 'success');
        setTimeout(() => { window.location.href = 'dashboard-operacao.html'; }, 1200);
      } catch(err) {
        showFeedback('Erro: ' + err.message, 'error');
        btnLogin.disabled    = false;
        btnLogin.textContent = 'ENTRAR NO DASHBOARD';
      }
    });
  }

  // Google OAuth
  const btnGoogle = document.getElementById('btn-google');
  if (btnGoogle) {
    btnGoogle.addEventListener('click', async () => {
      await supabase.auth.signInWithOAuth({ provider: 'google' });
    });
  }
});

// ── Verificação de Sessão e UI ──
async function checkUser() {
  if (!supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  const path = window.location.pathname;

  if (!session && (path.includes('dashboard') || path.includes('demo'))) {
    window.location.href = 'login.html'; return;
  }
  if (session && path.includes('login.html')) {
    window.location.href = 'dashboard-operacao.html'; return;
  }
  if (session) {
    updateDashboardUI(session.user);
    document.body.style.display = 'block';
  }
}

function updateDashboardUI(user) {
  const name     = user.user_metadata?.full_name || user.email.split('@')[0];
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const g = document.querySelector('[data-nexo-greeting]');
  const u = document.querySelector('[data-nexo-user-name]');
  const i = document.querySelector('[data-nexo-avatar-initials]');

  if (g) g.textContent = `${greeting}, ${name.split(' ')[0]}!`;
  if (u) u.textContent = name;
  if (i) i.textContent = initials;
}

async function logout() {
  if (supabase) await supabase.auth.signOut();
  window.location.href = 'login.html';
}
window.nexoLogout = logout;

function showFeedback(msg, type) {
  const el = document.getElementById('feedback');
  if (!el) return;
  el.textContent = msg;
  el.className   = `mt-6 text-sm font-bold ${type === 'success' ? 'text-emerald-400' : 'text-red-400'}`;
  el.classList.remove('hidden');
}

// O checkUser deve ser chamado explicitamente pelos arquivos que o utilizam
// para evitar redirecionamentos prematuros antes da inicialização completa dos motores.
// if (supabase) checkUser();
