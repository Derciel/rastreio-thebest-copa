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
    
    // Consulta robusta no Neon PostgreSQL
    // Busca por CNPJ (exato/parcial), Número da NF (exato/parcial), Nome da Franquia (parcial)
    const notas = await prisma.notaFiscal.findMany({
      where: {
        OR: [
          { cnpj: { contains: cnpjClean } },
          { cnpj: { contains: searchClean } }, // Caso o documento internacional tenha letras
          { nf: { contains: searchClean } },
          { idLoja: { equals: searchClean } },
          { cidade: { mode: 'insensitive', contains: searchClean } },
        ]
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
