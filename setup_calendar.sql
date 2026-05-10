-- NEXO AI | SETUP GOOGLE CALENDAR INTEGRATION
-- Execute este script no SQL Editor do seu Supabase

-- 1. Adicionar coluna calendar_email na tabela agent_configs (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_configs' AND column_name = 'calendar_email'
  ) THEN
    ALTER TABLE agent_configs ADD COLUMN calendar_email TEXT DEFAULT '';
  END IF;
END $$;

-- 2. Tabela de Agendamentos (Integração Google Calendar)
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  user_id UUID REFERENCES auth.users(id),
  
  -- Dados do agendamento
  titulo TEXT NOT NULL DEFAULT 'Avaliação',
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  duracao_minutos INTEGER DEFAULT 30,
  
  -- Controle de estado
  status TEXT DEFAULT 'confirmado',  -- confirmado, cancelado, realizado, no_show
  google_event_id TEXT,              -- ID do evento no Google Calendar
  
  -- Dados do cliente
  cliente_nome TEXT,
  cliente_telefone TEXT,
  
  -- Metadados
  lembrete_enviado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data_hora);
CREATE INDEX IF NOT EXISTS idx_agendamentos_lead ON agendamentos(lead_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);

-- 4. RLS (Row Level Security)
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

-- Policy para o service_role (n8n) ter acesso total
CREATE POLICY "Service role full access agendamentos" ON agendamentos
  FOR ALL USING (true)
  WITH CHECK (true);

-- Policy para usuários verem apenas seus próprios agendamentos
CREATE POLICY "Users see own appointments" ON agendamentos
  FOR SELECT USING (auth.uid() = user_id);
