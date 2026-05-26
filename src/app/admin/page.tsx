'use client';

import React, { useState, useEffect } from 'react';

interface ConfigGlobal {
  ultimaSinc?: string;
  totalRegistros?: number;
}

export default function PainelAdmin() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ConfigGlobal | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' | null }>({ text: '', type: null });

  // Carrega o estado da última sincronização ao montar a página
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/notas');
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            setConfig(data.config);
          }
        }
      } catch (e) {
        console.error("Erro ao carregar estatísticas iniciais:", e);
      }
    }
    loadStats();
  }, []);

  // Dispara a sincronização manual de dados do SharePoint para o Neon PostgreSQL
  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Usa o token digitado ou o token padrão
    const token = tokenInput.trim() || 'thebest_copa_secret_token_2026';
    
    setLoading(true);
    setStatusMessage({ text: 'Iniciando sincronização com a nuvem...', type: 'info' });
    
    try {
      console.log('Disparando requisição de sincronização com o SharePoint...');
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setStatusMessage({ 
          text: `Sucesso! Planilha importada. ${data.count} Notas Fiscais foram sincronizadas com sucesso no Neon.`, 
          type: 'success' 
        });
        // Atualiza as estatísticas
        setConfig({
          ultimaSinc: new Date().toISOString(),
          totalRegistros: data.count
        });
      } else {
        setStatusMessage({ 
          text: `Erro na sincronização: ${data.error || 'Falha na requisição. Verifique suas credenciais.'}`, 
          type: 'error' 
        });
      }
    } catch (error: any) {
      console.error('Erro ao chamar API de sincronização:', error);
      setStatusMessage({ 
        text: `Erro de conexão com o servidor: ${error.message || String(error)}`, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-12 max-w-2xl mx-auto flex flex-col justify-between">
      {/* CABEÇALHO */}
      <div className="text-center mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src="https://i.ibb.co/cccWwwq4/X-1.png" 
          alt="Logo The Best Açaí" 
          className="h-20 mx-auto mb-4 object-contain rounded-lg filter drop-shadow-[0_0_10px_rgba(139,92,246,0.2)]"
        />
        <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-gradient-purple-gold">
          Painel Administrativo
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Gerenciador de Sincronização do SharePoint para Neon PostgreSQL
        </p>
      </div>

      {/* PAINEL DE ESTATÍSTICAS E AÇÕES */}
      <div className="w-full flex-1">
        <div className="glass-panel rounded-2xl p-6 md:p-8 neon-glow-purple border border-zinc-850/80 mb-6">
          <h2 className="text-sm uppercase font-bold text-zinc-400 tracking-wider mb-4 pb-2 border-b border-zinc-900">
            Status do Banco de Dados
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-zinc-950/85 border border-zinc-900 rounded-xl p-4 text-center">
              <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total de Notas</span>
              <strong className="text-2xl font-black text-brand-gold tracking-wide mt-1 block">
                {config?.totalRegistros !== undefined ? config.totalRegistros : "Carregando..."}
              </strong>
            </div>
            <div className="bg-zinc-950/85 border border-zinc-900 rounded-xl p-4 text-center">
              <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Última Sincronização</span>
              <strong className="text-xs font-bold text-brand-purple-light tracking-wide mt-2 block leading-snug">
                {config?.ultimaSinc ? new Date(config.ultimaSinc).toLocaleString('pt-BR') : "Nunca sincronizado"}
              </strong>
            </div>
          </div>

          {/* FORMULÁRIO DE DISPARO */}
          <form onSubmit={handleSync} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-2 block">
                Token de Segurança Admin (Opcional se usar padrão)
              </label>
              <input 
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Insira seu ADMIN_TOKEN (ou deixe em branco se for o padrão)"
                className="w-full bg-zinc-950/85 border border-zinc-900 rounded-xl px-4 py-3 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-purple/60 focus:ring-1 focus:ring-brand-purple/20 transition-all text-sm"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-purple-gold text-white font-bold py-4 rounded-xl hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50 transition-all duration-300 transform active:scale-99 text-sm uppercase tracking-wider cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando Planilha...
                </span>
              ) : "Sincronizar SharePoint com Neon"}
            </button>
          </form>

          {/* STATUS DA OPERAÇÃO */}
          {statusMessage.type && (
            <div className={`mt-6 rounded-xl p-4 border text-xs md:text-sm animate-fade-in ${
              statusMessage.type === 'info' ? 'bg-zinc-950/85 border-zinc-900 text-zinc-400' :
              statusMessage.type === 'success' ? 'bg-emerald-950/30 border-emerald-900/60 text-emerald-400' :
              'bg-red-950/30 border-red-900/60 text-red-400'
            }`}>
              <div className="flex items-start gap-2.5">
                {statusMessage.type === 'info' && (
                  <svg className="animate-spin h-4 w-4 text-brand-purple-light mt-0.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {statusMessage.type === 'success' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {statusMessage.type === 'error' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="leading-relaxed">{statusMessage.text}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* RETORNO AO RASTREIO */}
        <div className="text-center mt-4">
          <a 
            href="/"
            className="text-xs text-zinc-500 hover:text-brand-purple-light transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            ← Voltar para a tela de Rastreamento Pública
          </a>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="w-full text-center text-[10px] text-zinc-700 mt-12">
        <p>© 2026 The Best Açaí. Administração Interna.</p>
      </footer>
    </main>
  );
}
