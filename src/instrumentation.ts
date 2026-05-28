import { syncSharePointData } from './lib/excelParser';

export async function register() {
  // O hook register do Next.js roda no boot do servidor
  // Executamos apenas no runtime nodejs (evitando rodar no edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('--------------------------------------------------');
    console.log('📢 AGENDADOR DE SINCRONIZAÇÃO AUTOMÁTICA ATIVADO!');
    console.log('O banco Neon será atualizado do SharePoint a cada 5 minutos.');
    console.log('--------------------------------------------------');
    
    // Executa uma sincronização inicial 10 segundos após o boot para garantir dados novos no startup
    setTimeout(async () => {
      console.log('🔄 [BOOT-SYNC] Iniciando sincronização automática inicial de boot...');
      try {
        const result = await syncSharePointData();
        if (result.success) {
          console.log(`✅ [BOOT-SYNC] Sincronização inicial concluída: ${result.count} notas fiscais importadas.`);
        } else {
          console.error('❌ [BOOT-SYNC] Falha na sincronização inicial:', result.error);
        }
      } catch (err) {
        console.error('❌ [BOOT-SYNC] Erro inesperado na sincronização inicial:', err);
      }
    }, 10000);

    // Configura o intervalo de execução periódica para a cada 5 minutos (300.000 ms)
    setInterval(async () => {
      console.log('🔄 [PERIÓDICO-SYNC] Iniciando sincronização automática periódica (Intervalo de 5 min)...');
      try {
        const result = await syncSharePointData();
        if (result.success) {
          console.log(`✅ [PERIÓDICO-SYNC] Sincronização periódica concluída com sucesso: ${result.count} notas atualizadas.`);
        } else {
          console.error('❌ [PERIÓDICO-SYNC] Falha na sincronização periódica:', result.error);
        }
      } catch (err) {
        console.error('❌ [PERIÓDICO-SYNC] Erro inesperado na sincronização periódica:', err);
      }
    }, 5 * 60 * 1000);
  }
}
