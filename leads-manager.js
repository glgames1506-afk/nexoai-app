/**
 * Nexo AI — Leads Manager
 * Gerencia o CRUD de leads integrado ao Supabase.
 */

// 1. Carregar Leads do Banco
async function fetchLeads() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar leads:', error);
        return [];
    }

    return data;
}

// 2. Salvar Novo Lead
async function saveLeadToDB(leadData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showToast('Erro: Usuário não autenticado', 'error');
        return null;
    }

    const { data, error } = await supabase
        .from('leads')
        .insert([
            { 
                user_id: user.id,
                name: leadData.name,
                phone: leadData.phone,
                source: leadData.source || 'Manual',
                status: 'Novo'
            }
        ])
        .select();

    if (error) {
        showToast('Erro ao salvar: ' + error.message, 'error');
        return null;
    }

    showToast('Lead capturado com sucesso!', 'success');
    return data[0];
}

// 3. Atualizar Status do Lead
async function updateLeadStatus(leadId, newStatus) {
    const { error } = await supabase
        .from('leads')
        .update({ status: newStatus, last_interaction: new Date() })
        .eq('id', leadId);

    if (error) {
        showToast('Erro ao atualizar status', 'error');
        return false;
    }
    
    return true;
}

// 4. Calcular Métricas Reais
function calculateMetrics(leads) {
    const total = leads.length;
    const novos = leads.filter(l => l.status === 'Novo').length;
    const convertidos = leads.filter(l => l.status === 'Convertido').length;
    
    // Simulação de ROI baseada em ticket médio (Ex: R$ 1.000 por lead)
    const ticketMedio = 1000;
    const moneyAtRisk = novos * ticketMedio;
    const revenue = convertidos * ticketMedio;

    return { total, novos, convertidos, moneyAtRisk, revenue };
}

// Auxiliar: Toast (Aviso flutuante)
function showToast(message, type) {
    const container = document.getElementById('nexo-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `nexo-toast ${type}`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" class="w-5 h-5"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// Exportar para o escopo global
window.nexoLeads = {
    fetch: fetchLeads,
    save: saveLeadToDB,
    updateStatus: updateLeadStatus,
    metrics: calculateMetrics
};
