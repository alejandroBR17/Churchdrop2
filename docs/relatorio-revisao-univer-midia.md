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

Fechamento da lista: código `2c67eeaea39682df686671b28f53299ed77a1d27`, Preview READY `dpl_Ak8pn6TEobdjhEwKujE7Yzy6dWPb` (target null) no projeto correto. Ensaio online repetiu os quatro cenários em 390/1440, sem erros de página e sem chamar o serviço real. PR #1 draft atualizada, sem merge. Link temporário aberto no chat; token não versionado.

## Nova direção de armazenamento e acesso

Usuário autoriza uma configuração nova, inclusive outro Apps Script ou banco, preferindo custo zero e conta ale.sobral.cortes@gmail.com. Isso não autoriza apagar acervo antigo sem necessidade. Uso esclarecido: apenas ele opera, mas pode usar celular do pastor/esposa; entrada deve ser rápida. Vídeos podem durar 30 minutos, tamanho em bytes não confirmado. Priorizar sessão temporária em aparelho emprestado, sem obrigar cada pessoa a cadastrar conta ou expor credenciais do Drive. Autorização administrativa Google somente no setup; acesso cotidiano separado.

Navegador Chrome confirmou a conta indicada autenticada. Resumo visível do Drive: 13,5 GB usados de 400 GB, com indicação de assinatura. Não presumir que 400 GB sejam gratuidade permanente nem que seja necessário contratar algo; não foi alterado plano, cobrança, arquivo ou permissão.

Fontes primárias consultadas: https://support.google.com/drive/answer/2375123?hl=pt-BR (até 15 GB gratuitos compartilhados); https://developers.google.com/workspace/drive/api/guides/manage-uploads (upload retomável e envio por blocos); https://developers.google.com/workspace/drive/api/guides/limits (cotas atuais e limiares de cobrança, não prometer uso ilimitado); https://developers.google.com/apps-script/guides/services/quotas .

Recomendação de trabalho: Drive como armazenamento de arquivos, sem colocar vídeos em Turso/SQLite. Preparar upload retomável com arquivo binário e progresso real, em vez de base64 inteiro/progresso simulado atual. Sessão de upload deve ser criada no servidor após autorização; URL de sessão é credencial limitada ao upload e não deve aparecer em logs/links públicos. Chaves/OAuth da conta não vão ao cliente. Nova integração ainda NÃO implementada/ativada; preservar backend legado até validar substituição. Configurar Google pode exigir ação humana ao consentir acesso ou aceitar termos; preparar resultado revisável primeiro.
