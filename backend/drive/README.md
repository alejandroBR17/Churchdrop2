# Drive privado do Univer Mídia — preparação

Esta integração está em preparação e **ainda não substitui o backend legado**.
Os testes usam adaptadores isolados, sem operar arquivos reais do Google.

Estado verificado em 17/10/2026: o responsável autorizou o consentimento Google e a implantação do web app assinado. `initializeStorage` concluiu com sucesso. Publicação v1 concluída; uma consulta assinada real retornou pasta vazia e um GET anônimo foi recusado. Nenhum arquivo foi enviado, renomeado ou removido nessa conferência. URL/chave foram guardadas como segredos somente no Preview do projeto `univer-midia`. `UNIVER_DRIVE_ENABLED=false` mantém a ligação pela aplicação desativada até revisar API/sessões e entrega dos arquivos privados. Não substituir a API legada apenas por ter passado esta consulta.

## Arquitetura

1. O navegador deverá autenticar-se na API do app (a implementar), com sessão temporária para aparelhos emprestados.
2. A API da Vercel valida sessão, origem e limites antes de assinar um pedido ao Apps Script.
3. O Apps Script verifica HMAC SHA-256, validade de cinco minutos e nonce, e limita operações à pasta e aos marcadores do app.
4. Para upload, cria uma sessão do Drive e devolve apenas a URL dessa sessão. O token OAuth do proprietário permanece no script.
5. `services/resumableUpload.ts` envia blocos binários diretamente ao Drive. Nunca transmitir o vídeo pela Function ou por base64 inteiro.

**Não chamar o script diretamente no navegador e nunca incluir o segredo no bundle/VITE_.**
A verificação de nonce usa Script Cache e um lock. Cache pode ser evicto; não constitui garantia durável de execução única. A API deve criar novo nonce por tentativa e não repetir cegamente operações de escrita com resultado incerto.

## Configuração Google e próximos passos

Os passos de criação, configuração privada, consentimento, inicialização e implantação já foram executados no projeto separado com autorização do responsável. A relação abaixo documenta as condições para manutenção/reprodução; não recriar pasta ou script para continuar esta revisão.

- O novo script separado foi criado na conta indicada pelo responsável; não usar o script legado como destino.
- Fonte: `Code.gs`; manifesto: `appsscript.json`. Usar projeto Cloud padrão gerenciado pelo Apps Script; nenhuma migração de projetos Cloud antigos.
- Configurar privadamente a propriedade `SERVER_SECRET` com pelo menos 32 caracteres aleatórios e a mesma chave somente no servidor da Vercel.
- Revisar consentimento Google: `drive.file` permite arquivos criados/abertos especificamente com o app; `script.external_request` permite a comunicação com a API do Drive. Não solicitar acesso a todo o Drive.
- Após aprovação, executar `initializeStorage` uma vez. Ela cria uma pasta nova e privada e guarda `ROOT_FOLDER_ID`; não importa nem apaga arquivos antigos. Reexecuções com raiz configurada não criam outra pasta.
- Publicação do web app, executando como proprietário, exige aprovação específica da exposição do endpoint protegido por HMAC. Sem segredo válido, todas as solicitações são recusadas. A interface só deverá ser ligada quando a API autenticada estiver pronta.
- O serviço avançado Drive v3 no manifesto habilita a API no projeto gerenciado. Verificar no ambiente real; o manifesto salvo não comprova autorização ou funcionamento ponta a ponta.

## Contrato do pedido assinado (somente servidor)

Envelope JSON com `issuedAt` (Unix em milissegundos), `nonce` (32–64 caracteres hexadecimais), `payload` (texto JSON) e `signature` (hexadecimal HMAC SHA-256).
Assinar os bytes UTF-8 exatos de `issuedAt + "\n" + nonce + "\n" + payload`.
Não reserializar `payload` após assinar. Não registrar o envelope, token OAuth ou URL de upload.

As ações preparadas são `list`, `beginUpload`, `rename`, `trash`, `preserve` e `retentionPreview`.
Todas exigem assinatura. `list` e `retentionPreview` são paginados (100 registros); a futura API deve processar `nextPageToken`, sem fingir que a primeira página é a biblioteca inteira.
Os erros não expõem respostas internas do Google. Um erro na resposta JSON precisa ser tratado mesmo quando o HTTP do Apps Script é 200.

`beginUpload` aceita nome, MIME, tamanho e nome opcional do evento. O limite técnico inicial por arquivo é 2 GiB, alterável em `MAX_FILE_BYTES`; isso não é uma garantia de cota disponível, duração de vídeo nem envio em segundo plano. O tamanho declarado é enviado como X-Upload-Content-Length. O transporte tem blocos de 4 MiB, prazo de 90 segundos por pedido, recuperação limitada, cancelamento e progresso dos bytes confirmados. Fechar o navegador ainda interrompe o JavaScript; recuperação entre aberturas precisa de seleção/validação do mesmo arquivo e tratamento privado da sessão, a implementar.

## Retenção segura

Direção aprovada: padrão 14 dias, configurável 7/14, somente envios próprios. A idade vem de `uploadedAt` criado no servidor ao iniciar o envio; renomear não reinicia o prazo. Arquivos antigos de origem desconhecida não são elegíveis. A UI deverá apresentar prazo e permitir preservar arquivos.

Nesta etapa `retentionPreview` **somente calcula candidatos**. Não há gatilho, limpeza em lote ou exclusão automática ativa. `trash` é uma ação individual reversível e verifica pasta/marcadores. Não existe ação de exclusão permanente ou alteração de compartilhamento. O Google pode eliminar automaticamente itens após o prazo da lixeira; lixeira não é backup permanente e continua consumindo espaço enquanto contém os arquivos.

Antes da ativação: implementar API/sessões, interface de retenção/preservação, tratamento privado de leitura/download (URLs Drive não tornam um arquivo privado acessível a terceiros), validação real de CORS/Range da sessão e um ensaio autorizado com arquivo descartável. Nenhum desses pontos foi validado apenas pelos testes locais.

## Ponte do servidor

`server/driveBridge.mjs` assina o texto exato do envelope com `node:crypto`, aplica prazo/cancelamento e limita metadados de entrada/saída. Segue apenas o redirecionamento ContentService esperado para `script.googleusercontent.com/macros/echo`, como GET sem retransmitir o corpo assinado. Não repete mutações automaticamente quando perde a resposta. Erros não incluem URL, segredo ou resposta interna. A chamada falha antes de transmitir se a integração estiver desativada ou se a configuração não for válida.

Somente um handler autenticado deverá usar essa ponte: ela **não implementa login ou autorização do visitante** e ainda não é uma rota HTTP. As variáveis `UNIVER_DRIVE_SCRIPT_URL` e `UNIVER_DRIVE_SERVER_SECRET` são privadas do servidor. `UNIVER_DRIVE_ENABLED` só deve passar para `true` depois da revisão da sessão e dos handlers; nunca criar prefixos VITE_ para essas configurações.

A entrega de vídeos sem login Google continua em definição com o responsável, assim como a presença de arquivos privados. Não compartilhar arquivos publicamente, devolver token OAuth ao cliente ou trafegar vídeos inteiros pela Function por suposição. A existência de `downloadUri` em `files.download` não comprova, por si só, que um download privado dispensa autorização; validar o fluxo escolhido antes da migração. Referências: [downloads de longa duração](https://developers.google.com/workspace/drive/api/guides/long-running-operations) e [limites de Functions](https://vercel.com/docs/functions/limitations).

## Referências

- [Projetos Cloud do Apps Script](https://developers.google.com/apps-script/guides/cloud-platform-projects)
- [Upload retomável e confirmação por Range](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [Escopos do Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Cotas do Apps Script](https://developers.google.com/apps-script/guides/services/quotas)

## Verificar sem acessar o Drive

`npm test` testa o protocolo de upload e o backend num contexto VM com API, propriedades, cache e assinatura isolados. `npm run typecheck` e `npm run build` verificam a aplicação. Nenhum teste recebe credenciais reais.
