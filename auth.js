/**
 * Nexo AI — Auth Engine (Supabase Integration)
 * Responsável por gerenciar o login, sessão e redirecionamento.
 */

// 1. Configuração do Supabase (Substitua pelas suas chaves se já tiver)
const SUPABASE_URL = 'https://SUA_URL_AQUI.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_AQUI';

let supabase = null;

try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
    console.error('Erro ao inicializar Supabase. Verifique se as chaves estão corretas.', e);
}

// 2. Elementos da Interface
const btnLogin = document.getElementById('btn-login');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const feedback = document.getElementById('feedback');

// 3. Função de Login
if (btnLogin) {
    btnLogin.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            showFeedback('Preencha todos os campos.', 'error');
            return;
        }

        btnLogin.disabled = true;
        btnLogin.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ENTRANDO...';
        lucide.createIcons();

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            showFeedback('Acesso autorizado! Redirecionando...', 'success');
            
            // Redireciona após 1.5s
            setTimeout(() => {
                window.location.href = 'dashboard-operacao.html';
            }, 1500);

        } catch (error) {
            showFeedback('Erro: ' + error.message, 'error');
            btnLogin.disabled = false;
            btnLogin.innerHTML = '<i data-lucide="log-in" class="w-4 h-4"></i> ENTRAR NO DASHBOARD';
            lucide.createIcons();
        }
    });
}

// 4. Logout (Pode ser usado em qualquer página que importe este script)
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        window.location.href = 'login.html';
    }
}

// 5. Verificação de Sessão (Proteção de Rotas)
async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Se estiver no dashboard e não tiver sessão, manda pro login
    if (!session && window.location.pathname.includes('dashboard')) {
        window.location.href = 'login.html';
    }
    
    // Se estiver no login e já tiver sessão, manda pro dashboard
    if (session && window.location.pathname.includes('login.html')) {
        window.location.href = 'dashboard-operacao.html';
    }
}

// Executa verificação inicial
if (supabase) {
    checkUser();
}

// Auxiliar: Feedback visual
function showFeedback(message, type) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `mt-6 text-sm font-bold ${type === 'success' ? 'text-emerald-400' : 'text-red-400'}`;
    feedback.classList.remove('hidden');
}
