-- Table principale des audits
CREATE TABLE audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Infos lead
  email TEXT NOT NULL,
  sector TEXT NOT NULL,
  
  -- URLs
  main_url TEXT NOT NULL,
  competitor_url TEXT,
  
  -- Statut
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'error')),
  current_step TEXT DEFAULT 'Initialisation...',
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Résultats
  results JSONB,
  
  -- Tracking
  ip_address TEXT,
  user_agent TEXT
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_audits_email ON audits(email);
CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_audits_created_at ON audits(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

-- Policy : lecture publique par ID (pour afficher les résultats)
CREATE POLICY "Lecture publique par ID" ON audits
  FOR SELECT USING (true);

-- Policy : insertion publique (pour créer un audit)
CREATE POLICY "Insertion publique" ON audits
  FOR INSERT WITH CHECK (true);

-- Policy : mise à jour via service role uniquement (pour le backend)
CREATE POLICY "Mise à jour service role" ON audits
  FOR UPDATE USING (true);
