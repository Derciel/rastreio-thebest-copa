import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeCNPJ } from '@/lib/excelParser';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    
    if (!query || query.trim() === '') {
      return NextResponse.json({
        success: true,
        notas: [],
        config: await prisma.configuracao.findFirst({ where: { id: 'config_global' } })
      });
    }
    
    const searchClean = query.trim().toUpperCase();
    const cnpjClean = normalizeCNPJ(searchClean);
    
    console.log(`Buscando Notas Fiscais no Neon. Termo original: "${query}", Termo higienizado: "${searchClean}", CNPJ limpo: "${cnpjClean}"`);
    
    // Montagem dinâmica de cláusulas OR inteligentes para abranger CNPJ completo, raízes de 8 ou 7 dígitos
    const orConditions: any[] = [
      { nf: { contains: searchClean } },
      { idLoja: { equals: searchClean } },
      { cidade: { mode: 'insensitive', contains: searchClean } }
    ];
    
    if (cnpjClean) {
      // Busca exata ou contendo o CNPJ higienizado
      orConditions.push({ cnpj: { contains: cnpjClean } });
      orConditions.push({ cnpj: { contains: searchClean } });
      
      // Se for um CNPJ completo (14 dígitos)
      if (cnpjClean.length === 14) {
        const raiz8 = cnpjClean.substring(0, 8);
        orConditions.push({ cnpj: { equals: raiz8 } });
        
        const raizSemZero = raiz8.replace(/^0+/, '');
        if (raizSemZero !== raiz8) {
          orConditions.push({ cnpj: { equals: raizSemZero } });
        }
      } 
      // Se for uma raiz de CNPJ digitada (8 dígitos)
      else if (cnpjClean.length === 8) {
        orConditions.push({ cnpj: { startsWith: cnpjClean } });
        
        const raizSemZero = cnpjClean.replace(/^0+/, '');
        if (raizSemZero !== cnpjClean) {
          orConditions.push({ cnpj: { startsWith: raizSemZero } });
          orConditions.push({ cnpj: { equals: raizSemZero } });
        }
      } 
      // Se for uma raiz curta de CNPJ (7 dígitos devido à perda de zero à esquerda no Excel)
      else if (cnpjClean.length === 7) {
        const raiz8ComZero = '0' + cnpjClean;
        orConditions.push({ cnpj: { startsWith: raiz8ComZero } });
        orConditions.push({ cnpj: { equals: cnpjClean } });
      }
    }
    
    // Consulta robusta no Neon PostgreSQL
    const notas = await prisma.notaFiscal.findMany({
      where: {
        OR: orConditions
      },
      orderBy: {
        dtEnvio: 'desc' // Notas mais recentes primeiro
      }
    });
    
    // Obtém metadados da última sincronização
    const config = await prisma.configuracao.findFirst({
      where: { id: 'config_global' }
    });
    
    console.log(`Busca concluída! Encontrados ${notas.length} registros para o termo "${query}".`);
    
    return NextResponse.json({
      success: true,
      notas,
      config: config || { ultimaSinc: new Date(0), totalRegistros: 0 }
    });
    
  } catch (error: any) {
    console.error('Erro na Rota de Consulta de Notas API:', error);
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
