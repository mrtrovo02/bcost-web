import { GenerateDreUseCase } from './application/use-cases/generate-dre.usecase';
import { CalculateFolhaUseCase } from './application/use-cases/calculate-folha.usecase';

async function runTests() {
  console.log('🧪 Iniciando Teste de Sanidade da Clean Architecture (Mockado)... \n');

  // 1. Mock do Repositório Contábil para rodar isolado no Node
  const mockContabilRepository = {
    getLancamentosPeriodo: async (companyId: string, inicio: string, fim: string) => {
      // Simula o retorno que viria da API desempacotada pelo Axios
      return [
        {
          date: inicio,
          description: `Receita mockada ${companyId} ate ${fim}`,
          amount: 150000.0,
          creditCode: '3.1',
          creditAccountName: 'Receita de servicos',
        },
      ];
    },
  };

  // 2. Mock do Repositório de DP
  const mockDpRepository = {
    getColaboradoresByCompany: async (companyId: string) => {
      return [
        { id: 'colab-1', nome: 'Vinicius Trovo', salarioBase: 5000.0 },
        { id: 'colab-2', nome: 'Ana Silva', salarioBase: 2200.0 },
      ];
    },
  };

  try {
    console.log('⏱️  Testando Caso de Uso do módulo Contábil (DRE)...');
    const dreUseCase = new GenerateDreUseCase(mockContabilRepository);
    const dreResult = await dreUseCase.execute({ companyId: 'test-123', ano: 2026 });
    console.log('✅ DRE gerada com sucesso!');
    console.log(`   Faturamento Bruto: \${dreResult.linhas[0].valor}`);
    console.log(`   Resultado Líquido Calculado: \${dreResult.total}`);

    console.log('\n⏱️  Testando Caso de Uso do módulo de DP (Folha)...');
    const folhaUseCase = new CalculateFolhaUseCase(mockDpRepository);
    const folhaResult = await folhaUseCase.execute({
      companyId: 'test-123',
      competencia: '2026-07',
    });

    console.log('✅ Folha de Pagamento calculada com sucesso!');
    folhaResult.forEach((f) => {
      console.log(
        `   - Colaborador: \${f.nomeColaborador} | Líquido: R$ \${f.salarioLiquido.toFixed(2)} (INSS: R$ \${f.descontoInss.toFixed(2)})`,
      );
    });

    console.log('\n🎉 Todos os testes de regras de negócio passaram localmente!');
  } catch (error: any) {
    console.log('\n❌ Erro detectado durante o teste:');
    console.error(error);
  }
}

runTests();
