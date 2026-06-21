'use strict';

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

// Configuração de conexão isolada para o Worker (Best practice para não travar a main thread)
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Configurações do Parser para lidar com atributos e namespaces da SEFAZ
const parserOption = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
};

const parser = new XMLParser(parserOption);

export const xmlWorker = new Worker(
  'xml-processing',
  async (job: Job) => {
    const { xmlContent, companyId } = job.data;

    try {
      // 1. Validação Estrutural do XML antes do Parse
      const validationResult = XMLValidator.validate(xmlContent);
      if (validationResult !== true) {
        throw new Error(`XML Inválido: ${validationResult.err.msg}`);
      }

      // 2. Parsing
      const jsonObj = parser.parse(xmlContent);

      // 3. Extração com verificação de encadeamento opcional (Optional Chaining)
      // Suporta tanto NF-e (Produtos) quanto NFS-e (Serviços - varia por cidade)
      const nfe = jsonObj?.nfeProc?.NFe?.infNFe || jsonObj?.NFe?.infNFe;

      if (!nfe) {
        throw new Error('Estrutura da Nota Fiscal não reconhecida (Layout SEFAZ incompatível).');
      }

      // 4. Mapeamento para o Schema do bCost
      const extraction = {
        nfeId: nfe['@_Id']?.replace('NFe', ''),
        emitente: {
          cnpj: nfe.emit?.CNPJ,
          nome: nfe.emit?.xNome,
        },
        valores: {
          baseCalculo: parseFloat(nfe.total?.ICMSTot?.vBC || '0'),
          valorTotal: parseFloat(nfe.total?.ICMSTot?.vNF || '0'),
          valorImposto: parseFloat(nfe.total?.ICMSTot?.vICMS || '0'),
        },
        dataEmissao: nfe.ide?.dhEmi || nfe.ide?.dEmi,
      };

      // LOG de Auditoria Técnica
      console.log(
        `[JOB-SUCCESS] Nota ${extraction.nfeId} processada para Empresa ID: ${companyId}`,
      );

      // Aqui o próximo passo será a integração com o Banco de Dados (Prisma/Drizzle)
      return extraction;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[JOB-FAILURE] ID: ${job.id} | Erro: ${err.message}`);
      // O BullMQ usará o backoff configurado no Producer para tentar novamente
      throw err;
    }
  },
  {
    connection,
    concurrency: 5, // Processa até 5 notas simultaneamente por worker
  },
);
