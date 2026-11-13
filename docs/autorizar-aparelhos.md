# Autorizar aparelhos e administrar acessos

## Ativação no Apps Script existente

O app detecta o suporte no servidor. Enquanto o Apps Script antigo estiver ativo, a senha e os envios continuam funcionando; o QR de autorização e a lista de aparelhos só aparecem após esta atualização. Não é necessário alterar variáveis da Vercel, chaves, pasta, manifesto de permissões ou materiais.

1. Abra o projeto Apps Script que o app usa atualmente: o projeto assinado com as propriedades `SERVER_SECRET` e `ROOT_FOLDER_ID`. Não use o projeto legado com `SCRIPT_PIN`.
2. Guarde uma cópia do código atual. Substitua o conteúdo de `Code.gs` pelo arquivo completo `backend/drive/Code.gs` desta versão e salve.
3. Em **Implantar → Gerenciar implantações**, edite a implantação atual (lápis), escolha **Nova versão** e clique em **Implantar**. Preserve o endereço `/exec`, a execução como proprietário e as permissões atuais. Só salvar não atualiza o serviço publicado.
4. Não execute `initializeStorage`. Não altere as propriedades existentes nem crie outra pasta.
5. Reabra o app após até um minuto. A tela de entrada passa a oferecer **Entrar pelo celular · QR Code**; depois de entrar, a faixa superior mostra **Aparelhos conectados**.

## Uso

- PC sem acesso: gere o QR na entrada, escaneie com o celular conectado, confira o aparelho e confirme. O PC entra automaticamente.
- Celular sem acesso: no PC conectado, abra Aparelhos conectados → Autorizar outro aparelho por QR Code. Escaneie com o celular, solicite o acesso e confirme no PC. Não é necessário usar webcam, senha ou código digitado.
- Aparelhos conectados lista acessos autorizados, não presença online. Aparelhos anteriores aparecem ao abrir a versão atual. Encerrar exige confirmação e bloqueia também aparelhos autorizados a partir daquele acesso. O bloqueio passa a valer na próxima solicitação ao servidor; o app normalmente detecta isso na consulta automática.
- O celular precisa estar conectado para aprovar uma entrada. Se a sessão dele terminou, a senha continua disponível.

## Garantias e limites

QR expira em cinco minutos e solicita uma única entrada. Os tokens saem do fragmento da URL antes de carregar recursos externos; não vão para localStorage. Uma autorização não é consumida por quem apenas conhece o QR: o navegador solicitante precisa da prova em cookie HttpOnly, Secure, SameSite=Strict. O servidor exige autenticação e confirmação explícita para aprovar. A retomada de uma resposta perdida do mesmo solicitante é idempotente e não cria outro aparelho.

Os registros ficam em Script Properties com Script Lock, limite de 16 registros de dispositivos por período de validade, quatro solicitações simultâneas por escopo e 8.500 bytes por registro de estado. Não se usa memória de uma Function como banco. Nenhuma senha, token QR bruto, IP ou user-agent completo é armazenado. Registros encerrados permanecem como tombstones até a expiração do cookie, impedindo recriação por repetição de um cookie antigo. Credenciais/origem distintas têm escopos separados. Falhas do registro bloqueiam sessões já registradas, sem ignorar revogações. A detecção de compatibilidade é temporariamente armazenada por até um minuto.

Acesso derivado não dura além de quem o aprovou. Por segurança, encerrar um aparelho ou revogar o link de origem também bloqueia os descendentes. Sessões legadas são migradas para um identificador estável, sem exigir a senha novamente. Aparelhos emprestados conservam cookies de sessão, sem Max-Age; a validade máxima do acesso continua sendo oito horas.
