import * as XLSX from 'xlsx';
import { prisma } from './prisma';

/**
 * Converte um link de compartilhamento comum do SharePoint em um link de download direto
 */
export function convertSharePointUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Se já for uma URL de download direto, retorna ela mesma
    if (urlObj.pathname.includes('/download.aspx')) {
      return url;
    }
    
    // Extrai o ID do compartilhamento (último elemento do path)
    const pathParts = urlObj.pathname.split('/');
    const shareId = pathParts[pathParts.length - 1];
    
    // Procura a parte da pasta pessoal /personal/...
    const personalIdx = urlObj.pathname.indexOf('/personal/');
    if (personalIdx !== -1) {
      // Extrai o caminho pessoal, ex: /personal/supervisor_financeiro_nicopel_com_br
      // Encontra a próxima barra após '/personal/'
      const nextSlashIdx = urlObj.pathname.indexOf('/', personalIdx + 10);
      const personalPath = nextSlashIdx !== -1 
        ? urlObj.pathname.substring(personalIdx, nextSlashIdx)
        : urlObj.pathname.substring(personalIdx);
        
      return `${urlObj.origin}${personalPath}/_layouts/15/download.aspx?share=${shareId}`;
    }
    
    // Fallback simples adicionando download=1
    return url.includes('?') ? `${url}&download=1` : `${url}?download=1`;
  } catch (error) {
    console.error('Erro ao converter URL do SharePoint:', error);
    return url.includes('?') ? `${url}&download=1` : `${url}?download=1`;
  }
}

/**
 * Converte data numérica do Excel para Objeto Date do JavaScript
 */
function parseExcelDate(excelDate: any): Date | null {
  if (excelDate === undefined || excelDate === null || excelDate === '') return null;
  
  const num = Number(excelDate);
  if (!isNaN(num)) {
    // Excel armazena datas como dias desde 30/12/1899
    // Bug bissexto de 1900 é tratado automaticamente no offset de dias
    const date = new Date((num - 25569) * 86400 * 1000);
    // Ajusta o fuso horário para UTC/GMT para evitar desvios de dia
    const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return isNaN(utcDate.getTime()) ? null : utcDate;
  }
  
  // Se for uma string, tenta fazer parse padrão
  const parsedDate = new Date(excelDate);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
}

/**
 * Normaliza CNPJ removendo formatações (mantém apenas letras e números para busca)
 */
export function normalizeCNPJ(cnpj: any): string {
  if (cnpj === undefined || cnpj === null) return '';
  const str = String(cnpj).trim();
  // Remove pontos, barras e traços se for puramente numérico, mas mantém se for internacional/letras
  return str.replace(/[\.\-\/]/g, '');
}

/**
 * Realiza o download da planilha, faz o parse do Excel e atualiza o Neon PostgreSQL
 */
export async function syncSharePointData(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const sharepointUrl = process.env.SHAREPOINT_URL;
    if (!sharepointUrl) {
      throw new Error('A variável de ambiente SHAREPOINT_URL não está configurada.');
    }
    
    const downloadUrl = convertSharePointUrl(sharepointUrl);
    console.log(`Iniciando download da planilha do SharePoint: ${downloadUrl}`);
    
    const response = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Falha no download da planilha. HTTP Status: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`Download concluído! Tamanho: ${buffer.length} bytes. Inicializando parse do Excel...`);
    
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;
    
    if (!sheetNames.includes('ENVIOS')) {
      throw new Error('A planilha baixada não contém a aba obrigatória "ENVIOS".');
    }
    
    const worksheet = workbook.Sheets['ENVIOS'];
    // Converte para matriz de arrays (header: 1 garante array de arrays cru)
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    
    if (rows.length === 0) {
      throw new Error('A aba "ENVIOS" está vazia.');
    }
    
    // Mapeamento dinâmico dos índices de colunas baseado na linha de cabeçalho (Linha 0)
    const headerRow = rows[0] as string[];
    console.log('Cabeçalho encontrado na planilha:', headerRow);
    
    const colIndex = {
      prioridade: headerRow.findIndex(h => h && String(h).toLowerCase().includes('prioridade')),
      dtEnvio: headerRow.findIndex(h => h && String(h).toLowerCase().includes('dt envio')),
      statusEnvio: headerRow.findIndex(h => h && String(h).toLowerCase().includes('statsus de envio')),
      nf: headerRow.findIndex(h => h && String(h).toLowerCase() === 'nf'),
      diasUteis: headerRow.findIndex(h => h && String(h).toLowerCase().includes('dias úteis')),
      dtEntrega: headerRow.findIndex(h => h && String(h).toLowerCase().includes('dt entrega')),
      transportadora: headerRow.findIndex(h => h && String(h).toLowerCase().includes('transportadora')),
      idLoja: headerRow.findIndex(h => h && String(h).toLowerCase().includes('id loja')),
      cidade: headerRow.findIndex(h => h && String(h).toLowerCase().includes('cidade')),
      estado: headerRow.findIndex(h => h && String(h).toLowerCase().includes('estado')),
      cnpj: headerRow.findIndex(h => h && String(h).toLowerCase().includes('cnpj')),
      pais: headerRow.findIndex(h => h && String(h).toLowerCase().includes('país')),
      grupo: headerRow.findIndex(h => h && String(h).toLowerCase().includes('grupo')),
      pote240: headerRow.findIndex(h => h && String(h).toUpperCase().includes('POTE 240ML')),
      pote500: headerRow.findIndex(h => h && String(h).toUpperCase().includes('POTE 500ML')),
      baseWaffle: headerRow.findIndex(h => h && String(h).toUpperCase().includes('BASE WAFFLE')),
      tampa: headerRow.findIndex(h => h && String(h).toUpperCase().includes('TAMPA')),
    };
    
    console.log('Índices de colunas mapeados dinamicamente:', colIndex);
    
    // Validação de colunas mínimas
    if (colIndex.nf === -1 || colIndex.cnpj === -1 || colIndex.transportadora === -1) {
      throw new Error('Colunas obrigatórias não encontradas na planilha. Verifique se existem as colunas "NF", "CNPJ" e "Transportadora".');
    }
    
    const notasParaInserir: any[] = [];
    
    // Ignoramos a linha 0 (cabeçalho) e a linha 1 (que no SharePoint tem dados de conversão de moeda/lixo internacional "BRA", "MXC" etc. se presente, ou dados falsos)
    // Se a linha 1 contiver dados textuais na coluna CNPJ que não pareçam números de identificação válidos, pulamos.
    // Vamos varrer a partir da linha 2
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const rawNF = row[colIndex.nf];
      const rawCNPJ = row[colIndex.cnpj];
      const rawTransportadora = row[colIndex.transportadora];
      
      // Se não houver nota fiscal ou CNPJ, pulamos essa linha de dados
      if (rawNF === undefined || rawNF === null || rawNF === '' || rawCNPJ === undefined || rawCNPJ === null || rawCNPJ === '') {
        continue;
      }
      
      const nfStr = String(rawNF).trim().replace(/\.0$/, ''); // Remove sufixo decimal se o Excel converter para número
      const cnpjStr = normalizeCNPJ(rawCNPJ);
      
      // Valida se o CNPJ é um rótulo textual de moeda ("BRA_", "MXC_" etc.) presente na linha 1 da planilha real
      if (cnpjStr.length < 3 || isNaN(Number(cnpjStr)) && !cnpjStr.includes('RUC')) {
        // Linha com lixo de cabeçalho do Excel
        continue;
      }
      
      const transportadoraStr = String(rawTransportadora || 'NÃO INFORMADA').trim().toUpperCase();
      const prioridadeVal = colIndex.prioridade !== -1 ? Number(row[colIndex.prioridade]) : null;
      
      notasParaInserir.push({
        prioridade: isNaN(Number(prioridadeVal)) ? null : prioridadeVal,
        dtEnvio: colIndex.dtEnvio !== -1 ? parseExcelDate(row[colIndex.dtEnvio]) : null,
        statusEnvio: colIndex.statusEnvio !== -1 ? String(row[colIndex.statusEnvio] || '').trim() : null,
        nf: nfStr,
        diasUteis: colIndex.diasUteis !== -1 && row[colIndex.diasUteis] !== undefined ? Number(row[colIndex.diasUteis]) : null,
        dtEntrega: colIndex.dtEntrega !== -1 ? parseExcelDate(row[colIndex.dtEntrega]) : null,
        transportadora: transportadoraStr,
        idLoja: colIndex.idLoja !== -1 ? String(row[colIndex.idLoja] || '').trim() : null,
        cidade: colIndex.cidade !== -1 ? String(row[colIndex.cidade] || '').trim() : null,
        estado: colIndex.estado !== -1 ? String(row[colIndex.estado] || '').trim() : null,
        cnpj: cnpjStr,
        pais: colIndex.pais !== -1 ? String(row[colIndex.pais] || '').trim() : null,
        grupo: colIndex.grupo !== -1 ? String(row[colIndex.grupo] || '').trim() : null,
        
        // Itens da Campanha de Inverno
        pote240: colIndex.pote240 !== -1 && row[colIndex.pote240] !== undefined ? String(row[colIndex.pote240]).trim() : null,
        pote500: colIndex.pote500 !== -1 && row[colIndex.pote500] !== undefined ? String(row[colIndex.pote500]).trim() : null,
        baseWaffle: colIndex.baseWaffle !== -1 && row[colIndex.baseWaffle] !== undefined ? String(row[colIndex.baseWaffle]).trim() : null,
        tampa: colIndex.tampa !== -1 && row[colIndex.tampa] !== undefined ? String(row[colIndex.tampa]).trim() : null,
      });
    }
    
    console.log(`Parser concluído! Encontradas ${notasParaInserir.length} Notas Fiscais válidas prontas para gravação.`);
    
    if (notasParaInserir.length === 0) {
      throw new Error('Nenhuma nota fiscal válida encontrada na planilha.');
    }
    
    // Transação de Banco de Dados: Limpa a tabela anterior e insere os novos registros em lote (BULK WRITE)
    // Isso garante consistência total: se falhar no meio, a base antiga não é apagada
    const totalCount = await prisma.$transaction(async (tx) => {
      // 1. Limpa todas as notas antigas
      await tx.notaFiscal.deleteMany({});
      
      // 2. Insere todas as novas notas fiscais em lotes (Neon suporta createMany no PostgreSQL)
      const result = await tx.notaFiscal.createMany({
        data: notasParaInserir
      });
      
      // 3. Atualiza a configuração global da última sincronização
      await tx.configuracao.upsert({
        where: { id: 'config_global' },
        create: {
          id: 'config_global',
          ultimaSinc: new Date(),
          totalRegistros: result.count
        },
        update: {
          ultimaSinc: new Date(),
          totalRegistros: result.count
        }
      });
      
      return result.count;
    });
    
    console.log(`Sincronização Neon com sucesso! ${totalCount} notas fiscais gravadas no banco na nuvem.`);
    return { success: true, count: totalCount };
    
  } catch (error: any) {
    console.error('Erro na sincronização de dados:', error);
    return { success: false, count: 0, error: error.message || String(error) };
  }
}
