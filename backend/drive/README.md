# Integração Drive do Univer Mídia — preparação

Esta integração está ativa **somente no Preview protegido**, sem migrar ou alterar o acervo legado.
Os testes automatizados usam adaptadores isolados. Um diagnóstico real, expressamente autorizado, também confirmou envio e leitura da resposta no navegador; somente o arquivo temporário foi enviado à lixeira, sem publicação por link.

Estado verificado em 17/10/2026: o responsável autorizou o consentimento Google e a implantação do web app assinado. `initializeStorage` concluiu com sucesso; não reexecutar para continuar. Publicação v3 concluída no endereço existente, com escopos e acesso preservados. Consulta assinada real retornou pasta vazia e GET anônimo foi recusado. Entrada por código, biblioteca vazia e saída foram conferidas na interface real. A conferência inicial não alterou arquivos. Na investigação posterior, foram usados apenas os arquivos temporários autorizados; os envios legítimos pendentes foram preservados. URL/chave/hash são Secrets somente Preview de `univer-midia`; UNIVER_DRIVE_ENABLED=true apenas nesse ambiente. A ativação e o diagnóstico não comprovam publicação/download completos de material legítimo nem migra o acervo antigo.

## Arquitetura

1. O navegador autentica-se na API do app com código de operador, com sessão temporária para aparelhos emprestados. Interface e handlers foram conectados; sessão e leitura reais foram verificadas no Preview protegido.
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

As ações da fonte e da versão 3 publicada são `list`, `beginUpload`, `publishUpload`, `claimLoginAttempt`, `getText`, `rename`, `trash`, `preserve` e `retentionPreview`.
Todas exigem assinatura. `list` e `retentionPreview` são paginados (100 registros); a futura API deve processar `nextPageToken`, sem fingir que a primeira página é a biblioteca inteira.
Os erros não expõem respostas internas do Google. Um erro na resposta JSON precisa ser tratado mesmo quando o HTTP do Apps Script é 200.

`beginUpload` aceita nome, MIME, tamanho, nome opcional do evento e a origem HTTPS calculada pela API autenticada. A API ignora qualquer origem no JSON do cliente. O Apps Script passa essa origem no cabeçalho `Origin` da abertura da sessão: sem isso, o Drive pode gravar os bytes e omitir CORS na resposta ao navegador, aparentando falha de rede. Sessões antigas não recebem a correção retroativamente. O limite técnico inicial por arquivo é 2 GiB, alterável em `MAX_FILE_BYTES`; isso não é uma garantia de cota disponível, duração de vídeo nem envio em segundo plano. O tamanho declarado é enviado como X-Upload-Content-Length. O transporte tem blocos de 4 MiB, prazo de 90 segundos por pedido, recuperação limitada, cancelamento e progresso dos bytes confirmados. Fechar o navegador ainda interrompe o JavaScript; recuperação entre aberturas precisa de seleção/validação do mesmo arquivo e tratamento privado da sessão, a implementar.

## Retenção segura

Direção aprovada: padrão 14 dias, configurável 7/14, somente envios próprios. A idade passa a contar de `uploadedAt` confirmado no servidor ao concluir a publicação do envio; renomear não reinicia o prazo. Uploads pendentes e arquivos antigos de origem desconhecida não são elegíveis. A UI deverá apresentar prazo e permitir preservar arquivos.

Nesta etapa `retentionPreview` **somente calcula candidatos**. Não há gatilho, limpeza em lote ou exclusão automática ativa. `trash` é uma ação individual reversível e verifica pasta/marcadores. Não existe ação de exclusão permanente. O Google pode eliminar automaticamente itens após o prazo da lixeira; lixeira não é backup permanente e continua consumindo espaço enquanto contém os arquivos.

Antes de liberar uso amplo: validar publicação e download de material real, além de retomada por blocos grandes. O diagnóstico privado confirmou CORS e conclusão de um envio pequeno no navegador após a correção de origem. Código privado e versão Google já configurados em Preview. Entrada/saída e leitura foram verificadas no serviço real; confirmação de compartilhamento e recuperação de publicação foram ensaiadas isoladamente. Retenção/preservação ainda precisam de interface; não ativar limpeza automática por ter concluído a migração de upload. Os testes locais não validam essas operações reais.

## Ponte do servidor

`server/driveBridge.mjs` assina o texto exato do envelope com `node:crypto`, aplica prazo/cancelamento e limita metadados de entrada/saída. Segue apenas o redirecionamento ContentService esperado para `script.googleusercontent.com/macros/echo`, como GET sem retransmitir o corpo assinado. Não repete mutações automaticamente quando perde a resposta. Erros não incluem URL, segredo ou resposta interna. A chamada falha antes de transmitir se a integração estiver desativada ou se a configuração não for válida.

Somente um handler autenticado deve usar essa ponte: ela **não implementa login ou autorização do visitante**. Os novos handlers `api/session.mjs` e `api/media.mjs` usam `server/access.mjs` e `server/mediaApi.mjs` para isso. As variáveis `UNIVER_DRIVE_SCRIPT_URL` e `UNIVER_DRIVE_SERVER_SECRET` são privadas do servidor. `UNIVER_DRIVE_ENABLED` só deve passar para `true` depois de completar a migração; nunca criar prefixos VITE_ para essas configurações.

## Acesso e compartilhamento aprovados

O responsável confirmou que usará **somente materiais compartilháveis por link**. Não será necessário login Google cotidiano nem um segundo cadastro. A abertura no Drive será opcional. A autorização Google do proprietário continua necessária no setup e já foi feita.

`beginUpload` exige `shareByLink=true` e cria arquivo pendente, privado. Após concluir os bytes, `publishUpload` exige nova indicação explícita `confirmShare=true`, verifica pasta, marcadores e tamanho efetivamente gravado e concede **somente leitura a qualquer pessoa com o link**, sem descoberta pública. A pasta nunca é compartilhada. A lista normal oculta envios pendentes; eles são identificados separadamente para futura recuperação. Não há publicação em lote de arquivos antigos. A interface mostra essa confirmação antes do envio e retém a sessão na memória para recuperar uma publicação sem reenviar bytes concluídos.

O link pode ser repassado por quem o receber: o código de operador protege gerenciamento, não torna privado um material já compartilhado. Não guardar documentos sigilosos nesse fluxo. Bytes de vídeo não devem passar pela Function; o navegador usa a sessão retomável do Drive, sem receber OAuth do proprietário. Referências: [compartilhamento Google](https://support.google.com/drive/answer/2494822?hl=pt-BR) e [limites de Functions](https://vercel.com/docs/functions/limitations).

### Sessão de operador preparada

Código aleatório de dez números, gerado privadamente e disponibilizado ao responsável em arquivo externo ao repositório. O servidor guarda somente `UNIVER_ACCESS_CODE_HASH`, formato `scrypt:<sal de 16 bytes em hex>:<derivação de 64 bytes em hex>`. Nunca guardar o código no repositório. `iron-session` 9 cifra/autentica o cookie `__Host-univer-session`: Secure, HttpOnly, SameSite Strict, sem domínio e caminho raiz. Sessão de aparelho emprestado: cookie de sessão e validade máxima de oito horas. “Lembrar neste aparelho”: sete dias. Logout remove o cookie; trocar o hash ou segredo invalida as sessões existentes.

O Apps Script reserva até dez tentativas por janela de dez minutos em Script Properties sob lock, compartilhadas entre instâncias da API, antes de verificar o código. O limite é global para este único operador; pode temporariamente bloquear também tentativas legítimas. Estado corrompido falha fechado. Escritas exigem origem idêntica, header do app e JSON com tamanho limitado. Respostas da API são private/no-store. O código/segredo não será incluído no QR de compartilhamento.

`UNIVER_DRIVE_ENABLED=true` está configurado somente no Preview. Não houve publicação por link nos diagnósticos isolados; os arquivos temporários autorizados foram enviados à lixeira após a conferência. Arquivos legítimos permanecem intactos. O código público não contém o código de operador, hash real, chave HMAC ou endpoint privado do script.

## Referências

- [Projetos Cloud do Apps Script](https://developers.google.com/apps-script/guides/cloud-platform-projects)
- [Upload retomável e confirmação por Range](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [Escopos do Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Cotas do Apps Script](https://developers.google.com/apps-script/guides/services/quotas)

## Verificar sem acessar o Drive

`npm test` testa o protocolo de upload e o backend num contexto VM com API, propriedades, cache e assinatura isolados. `npm run typecheck` e `npm run build` verificam a aplicação. Nenhum teste recebe credenciais reais.
