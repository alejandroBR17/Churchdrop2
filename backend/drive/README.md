# Integração Drive do Univer Mídia — preparação

Esta integração está em preparação e **ainda não substitui o backend legado**.
Os testes usam adaptadores isolados, sem operar arquivos reais do Google.

Estado verificado em 17/10/2026: o responsável autorizou o consentimento Google e a implantação do web app assinado. `initializeStorage` concluiu com sucesso. Publicação v1 concluída; uma consulta assinada real retornou pasta vazia e um GET anônimo foi recusado. Nenhum arquivo foi enviado, renomeado ou removido nessa conferência. URL/chave foram guardadas como segredos somente no Preview do projeto `univer-midia`. `UNIVER_DRIVE_ENABLED=false` mantém a ligação pela aplicação desativada até revisar API/sessões e entrega dos arquivos privados. Não substituir a API legada apenas por ter passado esta consulta.

## Arquitetura

1. O navegador deverá autenticar-se na API do app com código de operador, com sessão temporária para aparelhos emprestados. Os handlers estão preparados; a interface ainda será conectada.
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

As ações preparadas na fonte local são `list`, `beginUpload`, `publishUpload`, `claimLoginAttempt`, `getText`, `rename`, `trash`, `preserve` e `retentionPreview`. A implantação Google v1 ainda não contém as três novas ações; atualizar a versão antes de ativar a interface.
Todas exigem assinatura. `list` e `retentionPreview` são paginados (100 registros); a futura API deve processar `nextPageToken`, sem fingir que a primeira página é a biblioteca inteira.
Os erros não expõem respostas internas do Google. Um erro na resposta JSON precisa ser tratado mesmo quando o HTTP do Apps Script é 200.

`beginUpload` aceita nome, MIME, tamanho e nome opcional do evento. O limite técnico inicial por arquivo é 2 GiB, alterável em `MAX_FILE_BYTES`; isso não é uma garantia de cota disponível, duração de vídeo nem envio em segundo plano. O tamanho declarado é enviado como X-Upload-Content-Length. O transporte tem blocos de 4 MiB, prazo de 90 segundos por pedido, recuperação limitada, cancelamento e progresso dos bytes confirmados. Fechar o navegador ainda interrompe o JavaScript; recuperação entre aberturas precisa de seleção/validação do mesmo arquivo e tratamento privado da sessão, a implementar.

## Retenção segura

Direção aprovada: padrão 14 dias, configurável 7/14, somente envios próprios. A idade passa a contar de `uploadedAt` confirmado no servidor ao concluir a publicação do envio; renomear não reinicia o prazo. Uploads pendentes e arquivos antigos de origem desconhecida não são elegíveis. A UI deverá apresentar prazo e permitir preservar arquivos.

Nesta etapa `retentionPreview` **somente calcula candidatos**. Não há gatilho, limpeza em lote ou exclusão automática ativa. `trash` é uma ação individual reversível e verifica pasta/marcadores. Não existe ação de exclusão permanente. O Google pode eliminar automaticamente itens após o prazo da lixeira; lixeira não é backup permanente e continua consumindo espaço enquanto contém os arquivos.

Antes da ativação: conectar API/sessões à interface, configurar o código de acesso privadamente, atualizar a versão Google, implementar confirmação de compartilhamento e tratamento de falhas, validar CORS/Range da sessão num envio real autorizado. Retenção/preservação ainda precisam de interface; não ativar limpeza automática por ter concluído a migração de upload. Os testes locais não validam essas operações reais.

## Ponte do servidor

`server/driveBridge.mjs` assina o texto exato do envelope com `node:crypto`, aplica prazo/cancelamento e limita metadados de entrada/saída. Segue apenas o redirecionamento ContentService esperado para `script.googleusercontent.com/macros/echo`, como GET sem retransmitir o corpo assinado. Não repete mutações automaticamente quando perde a resposta. Erros não incluem URL, segredo ou resposta interna. A chamada falha antes de transmitir se a integração estiver desativada ou se a configuração não for válida.

Somente um handler autenticado deve usar essa ponte: ela **não implementa login ou autorização do visitante**. Os novos handlers `api/session.mjs` e `api/media.mjs` usam `server/access.mjs` e `server/mediaApi.mjs` para isso. As variáveis `UNIVER_DRIVE_SCRIPT_URL` e `UNIVER_DRIVE_SERVER_SECRET` são privadas do servidor. `UNIVER_DRIVE_ENABLED` só deve passar para `true` depois de completar a migração; nunca criar prefixos VITE_ para essas configurações.

## Acesso e compartilhamento aprovados

O responsável confirmou que usará **somente materiais compartilháveis por link**. Não será necessário login Google cotidiano nem um segundo cadastro. A abertura no Drive será opcional. A autorização Google do proprietário continua necessária no setup e já foi feita.

`beginUpload` exige `shareByLink=true` e cria arquivo pendente, privado. Após concluir os bytes, `publishUpload` exige nova indicação explícita `confirmShare=true`, verifica pasta, marcadores e tamanho efetivamente gravado e concede **somente leitura a qualquer pessoa com o link**, sem descoberta pública. A pasta nunca é compartilhada. A lista normal oculta envios pendentes; eles são identificados separadamente para futura recuperação. Não há publicação em lote de arquivos antigos. A interface ainda deve mostrar essa confirmação antes do envio e tratar falha na publicação sem duplicar o arquivo.

O link pode ser repassado por quem o receber: o código de operador protege gerenciamento, não torna privado um material já compartilhado. Não guardar documentos sigilosos nesse fluxo. Bytes de vídeo não devem passar pela Function; o navegador usa a sessão retomável do Drive, sem receber OAuth do proprietário. Referências: [compartilhamento Google](https://support.google.com/drive/answer/2494822?hl=pt-BR) e [limites de Functions](https://vercel.com/docs/functions/limitations).

### Sessão de operador preparada

Código aleatório de dez números, ainda não gerado nem distribuído. O servidor guarda somente `UNIVER_ACCESS_CODE_HASH`, formato `scrypt:<sal de 16 bytes em hex>:<derivação de 64 bytes em hex>`. Nunca guardar o código no repositório. `iron-session` 9 cifra/autentica o cookie `__Host-univer-session`: Secure, HttpOnly, SameSite Strict, sem domínio e caminho raiz. Sessão de aparelho emprestado: cookie de sessão e validade máxima de oito horas. “Lembrar neste aparelho”: sete dias. Logout remove o cookie; trocar o hash ou segredo invalida as sessões existentes.

O Apps Script reserva até dez tentativas por janela de dez minutos em Script Properties sob lock, compartilhadas entre instâncias da API, antes de verificar o código. O limite é global para este único operador; pode temporariamente bloquear também tentativas legítimas. Estado corrompido falha fechado. Escritas exigem origem idêntica, header do app e JSON com tamanho limitado. Respostas da API são private/no-store. O código/segredo não será incluído no QR de compartilhamento.

`UNIVER_DRIVE_ENABLED=false` permanece configurado somente no Preview. Nenhuma operação remota de compartilhamento, envio ou exclusão foi executada pelos testes desta etapa.

## Referências

- [Projetos Cloud do Apps Script](https://developers.google.com/apps-script/guides/cloud-platform-projects)
- [Upload retomável e confirmação por Range](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [Escopos do Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Cotas do Apps Script](https://developers.google.com/apps-script/guides/services/quotas)

## Verificar sem acessar o Drive

`npm test` testa o protocolo de upload e o backend num contexto VM com API, propriedades, cache e assinatura isolados. `npm run typecheck` e `npm run build` verificam a aplicação. Nenhum teste recebe credenciais reais.
