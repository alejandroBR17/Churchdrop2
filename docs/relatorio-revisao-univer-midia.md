# Revisão do Univer Mídia

## Escopo confirmado em 17/10/2026

O responsável esclareceu que **churchdrop.vercel.app usa o repositório antigo Churchdrop**, e não Churchdrop2. Preservar ambos os antigos. Trabalho autorizado aqui: `alejandroBR17/Churchdrop2`, checkout audit-churchdrop2, projeto Vercel **univer-midia** `prj_taDNCJGJZBwSfz1GBlaop1vWSqqV`. Retomadas de hora em hora autorizadas; não contornam limites de uso. Conta consultada nesta rodada: cota semanal marcada em 100%, mas ordinaryUsageAllowed ainda true. Não usar créditos/reset sem nova autorização explícita.

## Dependências de origem

Confirmada ausência de imports de `@google/genai` e `pdfjs-dist` em todo o código executável. geminiService é arquivo descontinuado; PDFs no visualizador não usam PDF.js, e o upload atual envia arquivo sem a conversão alegada em documentação antiga. Removidas essas duas dependências sem uso. Importmap de esm.sh removido: divergente do package e desnecessário para o build Vite empacotado. Mantidas React 18 e dependências realmente usadas (incluindo compressão de imagens). Removido bun.lock antigo para haver uma fonte de versões consistente com npm ci/package-lock na Vercel.

Não foi feita atualização major de Tailwind/Vite nem audit fix --force. Alertas das ferramentas restantes ainda precisam de análise. A remoção não implementa conversão de PDF; isso deve ser discutido se for necessário ao fluxo do responsável. Backend Google Drive/Apps Script não foi chamado nem alterado nesta etapa.

Resultado local: npm removeu 98 pacotes; auditoria passou de 12 para 9 alertas, com 0 críticos, 6 altos e 3 moderados. TypeScript e build aprovados. O asset de JavaScript permanece `index-D5BMd1FX.js`, assim como o CSS `index-Cpd3l8Ov.css`; HTML ficou menor pela remoção do importmap. Sem troca de versão de React ou de outra biblioteca usada. Publicação e commit no fechamento da rodada.

## Próximo passo

Registrar tipos/build/audit e deploy desta etapa antes de novo trabalho. Depois revisar autorização do backend sem operar nos arquivos reais; distinguir vazio/falha/cache/dados de exemplo e remover a sobrescrita global de JSON.stringify com testes dos pontos que dependem dela. Não repetir importação, não criar outro projeto e não alterar o antigo Churchdrop. Consultar IMPORTACAO.md e Git antes das próximas rodadas.

## Resposta vazia, cache e falhas

A limpeza de dependências `3f5ef92f7526dadde1da345c663a2e75949d6ada` foi confirmada READY em Preview (target null), deploy `dpl_BvDbZJN9zzZTP8K78EaDZ5tSExFW`, no projeto correto. O usuário informou ter redefinido as cotas e autorizou continuação; não foi resgatado crédito pelo agente.

Corrigida a leitura de arquivos: resposta vazia válida agora substitui a lista e limpa seleção ausente, sem recorrer a MOCK_MEDIA. Falha não vira sucesso vazio; preserva o cache válido e informa que a lista é salva no navegador, com botão Tentar novamente. Sem cache, mostra Biblioteca indisponível em vez de afirmar que o Drive está vazio. Leitura tem prazo de 12 segundos, cancelamento ao desmontar/substituir requisição e verificação de resposta vigente. Cache indisponível não invalida uma resposta real do servidor.

Leitura/mapeamento extraídos em services/fileList.ts com validação atômica de registros, datas e IDs duplicados; links não HTTP(S) são descartados em favor de URLs Drive derivadas do ID. Não há conversão de PDFs nova. Não foram alteradas operações de escrita/renomeação/exclusão, que ainda precisam da revisão de autorização do backend. Pergunta sobre a conta/projeto Apps Script enviada ao usuário, sem solicitar segredos.

Quatro testes nativos aprovados: vazio versus erros HTTP/HTML/status inválido, registros inválidos/duplicados, mapeamento de links e metadados, timeout/cancelamento. TypeScript e build aprovados; ensaio do compilado local em 390/1440 passou lista vazia sem exemplos, cache preservado na falha, resposta vazia limpando lista anterior e recuperação pelo botão. Todas as chamadas ao Apps Script interceptadas, nenhum arquivo remoto operado. Cache de app v10-file-list para distribuir alteração. Resultado de nova publicação e ensaio online no fechamento.
