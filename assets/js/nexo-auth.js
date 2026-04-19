/* ============================================
   NEXO AI — Auth & Data Engine
   Sistema de Autenticação + Dados em Tempo Real
   
   Dependências: Supabase JS v2 (CDN)
   ============================================ */

// ============================================
// 1. CONFIGURAÇÃO SUPABASE
// ============================================
const SUPABASE_URL = 'https://tqqtjrunrimabitmersr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcXRqcnVucmltYWJpdG1lcnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NjYwMjgsImV4cCI6MjA5MjA0MjAyOH0.CEJRX8rYb_5S5pN_M2KemyBRxdSPd9jf8Y-Xm3vlTDc';

// Inicializar cliente — evita conflito com nome "supabase" do CDN
const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// 2. AUTH GUARD — Protege todas as páginas de dashboard
// ============================================
async function enforceAuth() {
  try {
    const { data: { session }, error } = await _sb.auth.getSession();
    
    if (error || !session) {
      console.warn('[NEXO AUTH] Sem sessão válida. Redirecionando para login...');
      window.location.replace('login.html');
      return null;
    }
    
    console.log('[NEXO AUTH] Sessão válida:', session.user.email);
    return session;
  } catch (e) {
    console.error('[NEXO AUTH] Erro crítico:', e);
    window.location.replace('login.html');
    return null;
  }
}

// ============================================
// 3. CARREGAR PERFIL DO USUÁRIO NO HEADER
// ============================================
async function loadUserProfile(session) {
  if (!session) return;

  const user = session.user;
  const meta = user.user_metadata || {};
  const displayName = meta.full_name || user.email.split('@')[0];
  const companyName = meta.company_name || 'Minha Empresa';

  // Atualizar header — nome do usuário
  const nameEls = document.querySelectorAll('[data-nexo-user-name]');
  nameEls.forEach(el => el.textContent = displayName);

  // Atualizar header — nome da empresa
  const companyEls = document.querySelectorAll('[data-nexo-company]');
  companyEls.forEach(el => el.textContent = companyName);

  // Atualizar saudação dinâmica
  const greetingEl = document.querySelector('[data-nexo-greeting]');
  if (greetingEl) {
    const hour = new Date().getHours();
    let greeting = 'Boa noite';
    if (hour >= 5 && hour < 12) greeting = 'Bom dia';
    else if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
    greetingEl.textContent = `${greeting}, ${displayName.split(' ')[0]} 👋`;
  }

  // Atualizar avatar com iniciais
  const avatarEls = document.querySelectorAll('[data-nexo-avatar-initials]');
  avatarEls.forEach(el => {
    const parts = displayName.split(' ');
    const initials = parts.length >= 2 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : displayName.substring(0, 2).toUpperCase();
    el.textContent = initials;
  });

  // Detectar plano do usuário (baseado em metadata ou fallback)
  const plan = meta.plan || 'operacao'; // 'operacao' ou 'comando'
  document.body.setAttribute('data-nexo-plan', plan);
  
  return { displayName, companyName, plan, email: user.email };
}

// ============================================
// 4. LOGOUT
// ============================================
async function handleLogout() {
  await _sb.auth.signOut();
  window.location.replace('login.html');
}

// ============================================
// 5. DADOS EM TEMPO REAL (Supabase Tables)
// ============================================

// Buscar KPIs do banco (tabela: nexo_kpis)
async function fetchKPIs(clientId) {
  const { data, error } = await _sb
    .from('nexo_kpis')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.warn('[NEXO DATA] KPIs não encontrados, usando mockados:', error.message);
    return null;
  }
  return data;
}

// Buscar leads recentes (tabela: nexo_leads)
async function fetchRecentLeads(clientId, limit = 10) {
  const { data, error } = await _sb
    .from('nexo_leads')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[NEXO DATA] Leads não encontrados:', error.message);
    return [];
  }
  return data;
}

// Buscar dados de gráficos (tabela: nexo_chart_data)
async function fetchChartData(clientId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await _sb
    .from('nexo_chart_data')
    .select('*')
    .eq('client_id', clientId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    console.warn('[NEXO DATA] Chart data não encontrado:', error.message);
    return [];
  }
  return data;
}

// ============================================
// 6. ATUALIZAR DOM COM DADOS REAIS
// ============================================
function updateDOMWithKPIs(kpis) {
  if (!kpis) return;

  // Mapear campos do banco para elementos na tela
  const mapping = {
    'kpi-leads-hoje': kpis.leads_today,
    'kpi-taxa-resposta': kpis.response_rate ? kpis.response_rate + '%' : null,
    'kpi-conversoes': kpis.conversions_month,
    'kpi-tempo-resposta': kpis.avg_response_time,
    'kpi-lucro': kpis.monthly_profit ? 'R$ ' + (kpis.monthly_profit / 1000).toFixed(0) + 'k' : null,
    'kpi-cac': kpis.cac ? 'R$ ' + kpis.cac : null,
    'kpi-ltv': kpis.ltv ? 'R$ ' + (kpis.ltv / 1000).toFixed(1) + 'k' : null,
    'kpi-margem': kpis.margin ? kpis.margin + '%' : null,
  };

  for (const [id, value] of Object.entries(mapping)) {
    if (value === null || value === undefined) continue;
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
}

function updateLeadsTable(leads) {
  const tbody = document.getElementById('leads-table-body');
  if (!tbody || !leads.length) return;

  const statusMap = {
    'novo': { class: 'badge-novo', text: 'Novo' },
    'atendimento': { class: 'badge-atendimento', text: 'Em Atendimento' },
    'convertido': { class: 'badge-convertido', text: 'Convertido' },
    'frio': { class: 'badge-frio', text: 'Sem Resposta' },
    'reativado': { class: 'badge-reativado', text: 'Reativado' },
  };

  tbody.innerHTML = leads.map(lead => {
    const st = statusMap[lead.status] || statusMap['novo'];
    const timeAgo = getTimeAgo(lead.last_message_at || lead.created_at);
    const phone = lead.phone ? maskPhone(lead.phone) : '---';
    
    return `
      <tr class="hover:bg-slate-800/30 transition-colors">
        <td class="py-4 font-semibold text-white">${escapeHtml(lead.name)}</td>
        <td class="py-4 text-slate-400">${phone}</td>
        <td class="py-4"><span class="${st.class} text-xs font-bold px-2.5 py-1 rounded-full">${st.text}</span></td>
        <td class="py-4 text-slate-400 text-xs max-w-[180px] truncate">"${escapeHtml(lead.last_message || '...')}"</td>
        <td class="py-4 text-right text-slate-500 text-xs">${timeAgo}</td>
      </tr>`;
  }).join('');
}

// ============================================
// 7. UTILITÁRIOS
// ============================================
function maskPhone(phone) {
  // (11) 9●●●●-4521
  const clean = phone.replace(/\D/g, '');
  if (clean.length >= 11) {
    return `(${clean.slice(0, 2)}) 9●●●●-${clean.slice(-4)}`;
  }
  return phone;
}

function getTimeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return diffMin + ' min';
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return diffH + 'h';
  const diffD = Math.floor(diffH / 24);
  return diffD + 'd';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// 8. REALTIME SUBSCRIPTION (Supabase Channels)
// ============================================
function subscribeToLeadUpdates(clientId, callback) {
  const channel = _sb
    .channel('nexo-leads-realtime')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'nexo_leads',
      filter: `client_id=eq.${clientId}`
    }, (payload) => {
      console.log('[NEXO REALTIME] Novo lead:', payload.new);
      if (callback) callback(payload.new);
    })
    .subscribe();

  return channel;
}

// ============================================
// 9. INICIALIZADOR MASTER (chamar nas páginas)
// ============================================
async function initNexoDashboard() {
  // 1. Validar autenticação
  const session = await enforceAuth();
  if (!session) return; // Vai redirecionar para login

  // 2. Carregar perfil do usuário no DOM
  const profile = await loadUserProfile(session);

  // 3. Configurar botão de logout
  document.querySelectorAll('[data-nexo-logout]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  });

  // 4. Tentar carregar dados reais do Supabase
  const clientId = session.user.id;
  
  try {
    const kpis = await fetchKPIs(clientId);
    if (kpis) updateDOMWithKPIs(kpis);
    
    const leads = await fetchRecentLeads(clientId);
    if (leads.length) updateLeadsTable(leads);
    
    // 5. Ativar realtime
    subscribeToLeadUpdates(clientId, (newLead) => {
      // Quando chegar lead novo, recarregar a tabela
      fetchRecentLeads(clientId).then(updateLeadsTable);
    });

  } catch (e) {
    console.warn('[NEXO] Dados do Supabase indisponíveis, mantendo dados de demonstração:', e.message);
    // Graceful degradation: mantém os dados mockados do HTML
  }

  // 6. Log de sucesso
  console.log(`[NEXO] Dashboard inicializado para: ${profile.email} | Plano: ${profile.plan}`);
  
  // 7. Atualizar indicador "Atualizado há X min"
  const updateIndicator = document.querySelector('[data-nexo-last-update]');
  if (updateIndicator) {
    updateIndicator.textContent = 'Atualizado agora';
    setInterval(() => {
      const mins = Math.floor((Date.now() - performance.timeOrigin) / 60000);
      updateIndicator.textContent = `Atualizado há ${mins || 1} min`;
    }, 60000);
  }

  return { session, profile };
}

// ============================================
// 10. EXPORTAR PARA USO GLOBAL
// ============================================
window.NexoAuth = {
  init: initNexoDashboard,
  logout: handleLogout,
  enforceAuth,
  loadUserProfile,
  fetchKPIs,
  fetchRecentLeads,
  fetchChartData,
  getSupabase: () => _sb,
};
