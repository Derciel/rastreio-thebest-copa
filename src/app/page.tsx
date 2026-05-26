'use client';

import React, { useState, useEffect } from 'react';

// Tipagem das Notas Fiscais obtidas do Neon
interface NotaFiscal {
  id: string;
  prioridade?: number;
  dtEnvio?: string;
  statusEnvio?: string;
  nf: string;
  diasUteis?: number;
  dtEntrega?: string;
  transportadora: string;
  idLoja?: string;
  cidade?: string;
  estado?: string;
  cnpj: string;
  pais?: string;
  grupo?: string;
  
  // Itens Campanha de Inverno
  pote240?: string;
  pote500?: string;
  baseWaffle?: string;
  tampa?: string;
}

interface ConfigGlobal {
  ultimaSinc?: string;
  totalRegistros?: number;
}

export default function RastreioPublico() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [config, setConfig] = useState<ConfigGlobal | null>(null);
  const [copiedNF, setCopiedNF] = useState<string | null>(null);
  const [copiedCNPJ, setCopiedCNPJ] = useState(false);
  const [searched, setSearched] = useState(false);

  // CNPJ da Nicopel (Remetente padrão da campanha)
  const CNPJ_NICOPEL = "10.815.855/0001-24";
  const CNPJ_NICOPEL_CLEAN = "10815855000124";

  // Carrega configurações iniciais (como última sincronização) ao montar a página
  useEffect(() => {
    async function loadInitialData() {
      try {
        const res = await fetch('/api/notas');
        if (res.ok) {
          const data = await res.json();
          if (data.config) setConfig(data.config);
        }
      } catch (e) {
        console.error("Erro ao carregar dados iniciais:", e);
      }
    }
    loadInitialData();
  }, []);

  // Formata a entrada do usuário para o padrão de CNPJ brasileiro enquanto ele digita
  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Se for puramente numérico e menor que 15 dígitos, aplica máscara de CNPJ
    // Se for outro termo de busca (como NF ou nome), permite digitação livre
    const onlyNums = value.replace(/\D/g, '');
    
    if (onlyNums.length > 0 && /^\d+$/.test(onlyNums) && value.length <= 18) {
      if (onlyNums.length <= 14) {
        value = onlyNums
          .replace(/^(\d{2})(\d)/, '$1.$2')
          .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
          .replace(/\.(\d{3})(\d)/, '.$1/$2')
          .replace(/(\d{4})(\d)/, '$1-$2');
      }
    }
    setQuery(value);
  };

  // Dispara a consulta de notas fiscais indexadas no PostgreSQL do Neon.tech
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/notas?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setNotas(data.notas || []);
        if (data.config) setConfig(data.config);
      } else {
        setNotas([]);
      }
    } catch (error) {
      console.error("Erro ao consultar notas:", error);
      setNotas([]);
    } finally {
      setLoading(false);
    }
  };

  // Copia o CNPJ da Nicopel (Remetente) em 1 clique
  const handleCopyNicopelCNPJ = () => {
    navigator.clipboard.writeText(CNPJ_NICOPEL_CLEAN);
    setCopiedCNPJ(true);
    setTimeout(() => setCopiedCNPJ(false), 2000);
  };

  // Copia o número da Nota Fiscal em 1 clique
  const handleCopyNF = (nf: string) => {
    navigator.clipboard.writeText(nf);
    setCopiedNF(nf);
    setTimeout(() => setCopiedNF(null), 2000);
  };

  // Formatação amigável de datas
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Não informada';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Mapeamento visual das transportadoras (Paleta de Cores e Link Rápido de Rastreio)
  const getTransportadoraData = (name: string, nf: string) => {
    const cleanName = name.trim().toUpperCase();
    
    // 5 Transportadoras sob o motor unificado do SSW
    const sswTransportadoras = ['PLAV TRANSPORTADORA', 'TEX', 'ENVIA RAPIDO', 'BIAGHI & LUCHINI', 'COOPEX'];
    
    if (sswTransportadoras.some(t => cleanName.includes(t)) || cleanName === 'PLAV' || cleanName === 'BIAGHI' || cleanName === 'LUCHINI') {
      return {
        brandName: cleanName.includes('PLAV') ? 'Plav Transportes' :
                   cleanName.includes('BIAGHI') ? 'Biaghi & Luchini' :
                   cleanName.includes('COOPEX') ? 'Coopex' :
                   cleanName.includes('ENVIA') ? 'Envia Rápido' : 'TEX',
        colorClass: cleanName.includes('PLAV') ? 'bg-red-950/40 text-red-400 border-red-900/50' :
                    cleanName.includes('ENVIA') ? 'bg-green-950/40 text-green-400 border-green-900/50' :
                    'bg-amber-950/40 text-amber-400 border-amber-900/50',
        colorGlow: cleanName.includes('PLAV') ? 'shadow-red-900/10' : 'shadow-amber-900/10',
        // Link inteligente estruturado do e-commerce da SSW (passa CNPJ Nicopel + Nota Fiscal)
        link: `https://ssw.inf.br/cgi-local/tracking/${CNPJ_NICOPEL_CLEAN}/${nf}`,
        isSSW: true,
        logoBg: cleanName.includes('PLAV') ? 'from-red-600 to-black' : 
                cleanName.includes('ENVIA') ? 'from-green-600 to-emerald-900' : 'from-purple-600 to-indigo-900',
        logoLetter: cleanName.substring(0, 2)
      };
    }
    
    // Rodonaves
    if (cleanName.includes('RODONAVES')) {
      return {
        brandName: 'Rodonaves',
        colorClass: 'bg-blue-950/40 text-blue-400 border-blue-900/50',
        colorGlow: 'shadow-blue-900/10',
        link: 'https://rodonaves.com.br/rastreio-de-mercadoria',
        isSSW: false,
        logoBg: 'from-blue-600 to-orange-500',
        logoLetter: 'RN'
      };
    }
    
    // Expresso São Miguel
    if (cleanName.includes('SAO MIGUEL') || cleanName.includes('SÃO MIGUEL')) {
      return {
        brandName: 'Expresso São Miguel',
        colorClass: 'bg-teal-950/40 text-teal-400 border-teal-900/50',
        colorGlow: 'shadow-teal-900/10',
        link: 'https://www.expressosaomiguel.com.br/',
        isSSW: false,
        logoBg: 'from-emerald-600 to-blue-700',
        logoLetter: 'SM'
      };
    }

    // Carvalima
    if (cleanName.includes('CARVALIMA')) {
      return {
        brandName: 'Carvalima Transportes',
        colorClass: 'bg-cyan-950/40 text-cyan-400 border-cyan-900/50',
        colorGlow: 'shadow-cyan-900/10',
        link: 'https://www.carvalima.com.br/',
        isSSW: false,
        logoBg: 'from-cyan-500 to-blue-900',
        logoLetter: 'CL'
      };
    }

    // Alfa Transportes
    if (cleanName.includes('ALFA')) {
      return {
        brandName: 'Alfa Transportes',
        colorClass: 'bg-indigo-950/40 text-indigo-400 border-indigo-900/50',
        colorGlow: 'shadow-indigo-900/10',
        link: 'https://www.alfatransportes.com.br/',
        isSSW: false,
        logoBg: 'from-indigo-600 to-sky-400',
        logoLetter: 'AT'
      };
    }

    // Fallback padrão para qualquer outra transportadora desconhecida ou geral
    return {
      brandName: name,
      colorClass: 'bg-zinc-950/40 text-zinc-400 border-zinc-900/50',
      colorGlow: 'shadow-zinc-900/10',
      link: 'https://ssw.inf.br/2/rastreamento', // SSW como fallback geral inteligente no Brasil
      isSSW: true,
      logoBg: 'from-zinc-700 to-zinc-900',
      logoLetter: 'TR'
    };
  };

  return (
    <main className="min-h-screen px-4 py-8 md:py-16 max-w-4xl mx-auto flex flex-col justify-between">
      {/* 1. CABEÇALHO COM LOGO OFICIAL DA CAMPANHA */}
      <div className="w-full flex flex-col items-center text-center mb-8 md:mb-12">
        <div className="relative mb-6 group cursor-pointer">
          <div className="absolute inset-0 bg-brand-purple/20 rounded-full blur-xl transition-all group-hover:bg-brand-purple/35 group-hover:scale-105 duration-300"></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="https://i.ibb.co/cccWwwq4/X-1.png" 
            alt="Logo Potes da Copa e Petit-gateau" 
            className="h-28 md:h-36 object-contain relative rounded-xl filter brightness-0 invert drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-transform duration-300 group-hover:scale-102"
          />
        </div>
        
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-3">
          <span className="text-gradient-purple-gold">CAMPANHA DE INVERNO</span>
        </h1>
        <p className="text-sm md:text-base text-zinc-400 max-w-xl">
          Consulte suas Notas Fiscais de <strong className="font-bold text-zinc-200">Potes da Copa</strong> e <strong className="font-bold text-zinc-200">Embalagens Petit-gateau (Waffle)</strong> da <strong className="font-bold text-zinc-200">The Best Açaí</strong> e rastreie suas entregas.
        </p>
      </div>

      {/* 2. BARRA DE CONSULTA PÚBLICA */}
      <div className="w-full glass-panel rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden neon-glow-purple">
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-brand-purple/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-brand-gold/5 rounded-full blur-2xl"></div>
        
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 relative">
          <div className="flex-1 relative">
            <input 
              type="text"
              value={query}
              onChange={handleCNPJChange}
              placeholder="Digite o CNPJ da sua Franquia..."
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-5 py-4 pl-12 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-purple/60 focus:ring-2 focus:ring-brand-purple/15 transition-all text-base md:text-lg"
            />
            {/* Ícone Lupa/Pesquisa */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-gradient-purple-gold text-white font-bold px-8 py-4 rounded-xl hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50 transition-all duration-300 transform active:scale-98 text-base md:text-lg cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Buscando...
              </span>
            ) : "Consultar Nota"}
          </button>
        </form>

        {/* Informações Auxiliares de Cópia e Dica */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6 pt-6 border-t border-zinc-900/60 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-brand-gold rounded-full animate-pulse"></span>
            <span>Remetente padrão: <strong className="font-bold text-zinc-300">Nicopel Embalagens</strong></span>
            <button 
              onClick={handleCopyNicopelCNPJ}
              className="ml-2 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {copiedCNPJ ? "Copiado!" : "Copiar CNPJ"}
            </button>
          </div>
          
          {config?.ultimaSinc && (
            <div className="text-zinc-500 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15H19" />
              </svg>
              Última atualização da planilha: <strong className="text-zinc-400">{new Date(config.ultimaSinc).toLocaleString('pt-BR')}</strong>
            </div>
          )}
        </div>
      </div>

      {/* 3. RESULTADOS E CARDS DE CONSULTA */}
      <div className="w-full flex-1">
        {loading ? (
          <div className="w-full text-center py-12 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-purple-light"></div>
            <p className="text-zinc-400 text-sm animate-pulse">Buscando dados. Aguarde...</p>
          </div>
        ) : searched ? (
          notas.length === 0 ? (
            <div className="w-full text-center py-12 glass-panel rounded-2xl border border-dashed border-zinc-800 p-8 flex flex-col items-center">
              <div className="text-brand-gold bg-brand-gold/10 p-3 rounded-full mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-300 mb-1">Nenhuma Nota Encontrada</h3>
              <p className="text-sm text-zinc-500 max-w-sm mb-4">
                Verifique se o CNPJ digitado está correto ou se a planilha do SharePoint já foi atualizada.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="flex justify-between items-center text-sm px-1 text-zinc-400">
                <span>Encontradas <strong className="text-brand-purple-light font-bold">{notas.length}</strong> notas para esta franquia</span>
                <span>Role para baixo para ver tudo</span>
              </div>
              
              {notas.map((nota) => {
                const tData = getTransportadoraData(nota.transportadora, nota.nf);
                return (
                  <div key={nota.id} className="glass-card rounded-2xl p-5 md:p-6 border border-zinc-800/80 flex flex-col gap-5 relative overflow-hidden shadow-lg shadow-black/20">
                    {/* Linha 1: Dados Principais da Nota */}
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 border-b border-zinc-900/60">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand-purple/20 text-brand-purple-light border border-brand-purple/40">
                          {nota.pais === 'Paraguai' ? 'Franquia Internacional' : 'Franquia Brasil'}
                        </span>
                        <h3 className="text-base md:text-lg font-bold text-zinc-100 mt-2">
                          {nota.idLoja ? `[Loja ${nota.idLoja}] ` : ""}{nota.cidade ? `${nota.cidade.toUpperCase()} - ${nota.estado}` : "LOJA THE BEST AÇAÍ"}
                        </h3>
                        <p className="text-xs text-zinc-500 font-mono mt-1">CNPJ: {nota.cnpj}</p>
                      </div>
                      
                      {/* Badge da NF com Copiador */}
                      <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-850 px-4 py-2 rounded-xl">
                        <div className="text-left">
                          <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Nota Fiscal</span>
                          <strong className="text-sm font-mono text-brand-gold tracking-wide">NF {nota.nf}</strong>
                        </div>
                        <button 
                          onClick={() => handleCopyNF(nota.nf)}
                          className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer ml-2 active:scale-95"
                          title="Copiar Nota Fiscal"
                        >
                          {copiedNF === nota.nf ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Linha 2: Itens Enviados (Campanha de Inverno) */}
                    <div className="bg-zinc-950/40 border border-zinc-900/60 p-4 rounded-xl">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-3">Itens da Campanha de Inverno</span>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-zinc-950/80 border border-zinc-900 px-3 py-2 rounded-lg text-center">
                          <span className="text-[10px] text-zinc-500 block">Pote 240ml</span>
                          <strong className="text-sm text-brand-purple-light font-extrabold">{nota.pote240 || "0"}</strong>
                        </div>
                        <div className="bg-zinc-950/80 border border-zinc-900 px-3 py-2 rounded-lg text-center">
                          <span className="text-[10px] text-zinc-500 block">Pote 500ml</span>
                          <strong className="text-sm text-brand-purple-light font-extrabold">{nota.pote500 || "0"}</strong>
                        </div>
                        <div className="bg-zinc-950/80 border border-zinc-900 px-3 py-2 rounded-lg text-center">
                          <span className="text-[10px] text-zinc-500 block">Base Waffle (Petit-g)</span>
                          <strong className="text-sm text-brand-gold font-extrabold">{nota.baseWaffle || "0"}</strong>
                        </div>
                        <div className="bg-zinc-950/80 border border-zinc-900 px-3 py-2 rounded-lg text-center">
                          <span className="text-[10px] text-zinc-500 block">Tampa do Pote</span>
                          <strong className="text-sm text-zinc-400 font-extrabold">{nota.tampa || "0"}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Linha 3: Dados de Entrega e Transportadora */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
                      <div className="text-left text-xs text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Data de Envio: <strong className="text-zinc-300 font-semibold">{formatDate(nota.dtEnvio)}</strong>
                        </div>
                        {nota.diasUteis !== null && (
                          <div className="mt-1 text-zinc-500">
                            Prazo estimado de trânsito: <strong className="font-bold text-zinc-300">{nota.diasUteis} dias úteis</strong>
                          </div>
                        )}
                      </div>
                      
                      {/* Transportadora e Ação de Rastreio */}
                      <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Identificador da Transportadora com Mini Logo em Estilo Visual */}
                        <div className={`border rounded-xl px-3 py-2 flex items-center gap-2 ${tData.colorClass} ${tData.colorGlow}`}>
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${tData.logoBg} flex items-center justify-center font-black text-white text-xs`}>
                            {tData.logoLetter}
                          </div>
                          <div className="text-left">
                            <span className="text-[9px] text-zinc-500 block font-semibold leading-tight">Transportador</span>
                            <span className="text-xs font-bold leading-normal">{tData.brandName}</span>
                          </div>
                        </div>
                        
                        {/* Botão de Ação Rápida Rastrear */}
                        <a 
                          href={tData.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-zinc-100 text-zinc-950 font-bold px-5 py-3 rounded-xl hover:bg-brand-gold hover:text-zinc-950 hover:shadow-[0_0_15px_rgba(251,191,36,0.35)] transition-all duration-300 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                        >
                          Rastrear Pedido
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>

                    {/* Dica amigável do SSW se aplicável */}
                    {tData.isSSW && (
                      <div className="bg-zinc-950/60 text-zinc-500 text-[10px] rounded-lg p-2 border border-zinc-900 text-center leading-relaxed">
                        🔍 Esta transportadora rastreia via <strong className="font-bold text-zinc-300">SSW</strong>. Ao abrir, o rastreamento é feito de forma <strong className="font-bold text-zinc-300">automática</strong> usando o CNPJ da Nicopel e a Nota Fiscal. Se necessário, use as opções "Destinatário" ou "Remetente".
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Estado Inicial: Mostra instruções bonitas antes da primeira busca */
          <div className="w-full glass-panel rounded-2xl p-6 md:p-8 text-center text-zinc-400">
            <h3 className="text-base font-bold text-zinc-300 mb-2">Instruções de Rastreamento:</h3>
            <ul className="text-xs md:text-sm text-zinc-500 space-y-2 text-left max-w-md mx-auto">
              <li className="flex items-start gap-2">
                <span className="text-brand-purple-light font-bold">1.</span>
                <span>Digite o <strong className="font-bold text-zinc-300">CNPJ</strong> da sua Franquia The Best Açaí na barra acima.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-purple-light font-bold">2.</span>
                <span>Veja a lista das Notas Fiscais dos seus potes de inverno e waffles.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-purple-light font-bold">3.</span>
                <span>Ao localizar a nota, clique em <strong className="font-bold text-zinc-300">"Rastrear Pedido"</strong> para ser direcionado ao site da transportadora.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-purple-light font-bold">4.</span>
                <span>O sistema fará o rastreamento automático na <strong className="font-bold text-zinc-300">SSW</strong> ou fornecerá botões de <strong className="font-bold text-zinc-300">Cópia Rápida</strong> dos dados para colar no site oficial da transportadora de forma ágil!</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="w-full text-center text-[10px] md:text-xs text-zinc-600 mt-12 pt-6 border-t border-zinc-900/60">
        <p>© 2026 The Best Açaí. Todos os direitos reservados. Nicopel Embalagens.</p>
      </footer>
    </main>
  );
}
