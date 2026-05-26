import { NextRequest, NextResponse } from 'next/server';
import { syncSharePointData } from '@/lib/excelParser';

export async function POST(req: NextRequest) {
  try {
    // Validação do Token de Administração no cabeçalho Authorization
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1]; // Formato: Bearer TOKEN
    
    const adminToken = process.env.ADMIN_TOKEN || 'thebest_copa_secret_token_2026';
    
    if (!token || token !== adminToken) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado. Token inválido ou ausente.' },
        { status: 401 }
      );
    }
    
    console.log('API de Sincronização disparada de forma autorizada. Iniciando processamento...');
    const result = await syncSharePointData();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        count: result.count,
        message: 'Planilha do SharePoint sincronizada com sucesso no Neon PostgreSQL!'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Erro desconhecido na sincronização.' },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('Erro na Rota de Sincronização API:', error);
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
