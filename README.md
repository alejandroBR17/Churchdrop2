# Churchdrop2 — Univer Mídia

Aplicação React/Vite para organizar e transferir mídias usadas na igreja. Repositório importado do Google AI Studio para preparação e revisão na Vercel.

Produção autorizada pelo responsável em 18/10/2026: https://churchdrop2.vercel.app/ . A biblioteca exige o código privado de operador; o projeto antigo churchdrop.vercel.app permanece separado. A configuração assinada do novo Drive está ativa em produção e Preview, sem migrar o acervo legado.

## Senha de acesso

A senha aceita de 6 a 64 caracteres, incluindo letras, números e símbolos, sem exigir uma combinação específica. Maiúsculas, acentos e espaços são preservados. O código numérico anterior continua aceito como senha enquanto o hash configurado não for trocado.

Para definir uma nova senha, gere localmente um hash scrypt com sal aleatório de 16 bytes e saída de 64 bytes, no formato `scrypt:<sal hexadecimal>:<hash hexadecimal>`. Atualize o valor sensível `UNIVER_ACCESS_CODE_HASH` nas configurações do projeto Vercel e faça uma nova implantação do ambiente desejado. O nome da variável e o campo interno `code` foram mantidos para compatibilidade; nunca coloque a senha no repositório ou em variáveis públicas `VITE_*`. A troca do hash encerra sessões e invalida links pessoais anteriores. Alterar apenas a interface não define uma nova senha.

## Manter o acesso neste aparelho

Use o endereço fixo de produção. Sessões são do navegador/endereço: links diferentes de Preview não compartilham o acesso. No login, marque Este aparelho é meu para manter a sessão por sete dias; se já estiver conectado temporariamente, Lembrar 7 dias salva a sessão atual sem reenviar o código. A barra mostra a data de validade. Atualizações com as mesmas chaves e domínio mantêm a sessão; expiração, limpeza dos dados do navegador, Sair e troca de código/chaves continuam encerrando o acesso.

Apenas a preferência de lembrar é guardada no localStorage, nunca o código ou o cookie de sessão. Campos possuem identificação estável para o gerenciador de senhas do navegador, cujo salvamento depende da escolha do usuário. Sair remove a sessão e limpa a preferência; em aparelho emprestado, não marque como seu. O limite continua em sete dias, sem renovação silenciosa indefinida.

## Executar

Use Node.js 24 e npm:

```sh
npm ci
npm run dev
```

Ferramentas de build fixadas em Vite 7.3.7 e plugin React 5.2.0. A atualização preserva a configuração e o alvo de navegador existentes. Migração conferida com os guias oficiais [Vite 5 → 6](https://v6.vite.dev/guide/migration.html) e [Vite 6 → 7](https://v7.vite.dev/guide/migration.html). Não use `npm audit fix --force`: os alertas restantes da cadeia Tailwind 3 exigem revisão própria antes de mudar o gerador de estilos.

Para compilar: `npm run build`. A saída é `dist`.

Verificações locais: `npm run typecheck` e `npm test`. Os testes de leitura usam respostas isoladas; não operam no Google Drive.

## Serviços e dados

A interface é hospedada na Vercel. `services/churchService.ts` usa somente a API autenticada do próprio app; o navegador não chama mais o Apps Script legado. A API conversa com o novo script assinado, e os blocos de upload seguem diretamente ao Drive. Publicar a interface não transfere arquivos antigos nem a propriedade dos scripts. As instruções históricas de backend não representam o serviço novo.

Nenhuma credencial de IA é necessária para iniciar a interface atual. Não coloque chaves privadas em código de navegador, no Git ou em variáveis com prefixo `VITE_`.

A nova integração com Drive está descrita em [backend/drive](backend/drive/README.md). A versão 3 do script e o código privado de operador estão configurados em Preview e, após autorização em 18/10/2026, em produção. Entrada, listagem e saída foram conferidas pela interface implantada. Um envio binário real isolado, autorizado pelo responsável, confirmou a resposta do Drive no navegador; o arquivo temporário foi enviado à lixeira sem compartilhamento. O responsável confirmou que o envio de seu material funcionou após a correção. Download em outro aparelho e vídeos grandes ainda precisam de ensaio completo. Se `UNIVER_DRIVE_ENABLED=false`, a interface mostra preparação e não usa o serviço antigo como fallback. O acervo legado permanece intocado.

O acervo novo é composto somente por materiais que podem ser compartilhados por link, conforme decisão do responsável. A pasta permanece privada. A tela de envio exige confirmação de que qualquer pessoa que receber o link poderá abrir e repassá-lo. Enviar, renomear e remover exigem sessão de operador; o uso cotidiano dispensa login Google. A ativação é exclusiva do Preview protegido, sem publicação em produção.

## Cache e uso offline

O service worker guarda apenas o HTML da interface, manifesto e JS/CSS locais. Não armazena vídeos, arquivos do Drive, APIs, URLs com parâmetros, respostas privadas ou pedidos com autorização/Range. Limites: 24 entradas, cada uma com até 2 MiB; o navegador pode remover o cache conforme sua cota. Fontes e imagens externas ainda dependem de rede.

Após um primeiro carregamento válido, a interface pode reabrir offline; isso não disponibiliza o acervo nem permite enviar arquivos sem conexão. A entrada exige confirmar sessão online. Metadados da biblioteca e sessões de upload ficam apenas na memória da página, sem persistir URLs de upload. Sair remove esses dados, e uma resposta de sessão expirada bloqueia novamente a interface. A chave conhecida do cache legado é removida ao iniciar/sair; não são apagados outros dados do navegador.

O progresso mostra o arquivo atual (N de total), seus bytes confirmados e o total desse arquivo, sem dar o mesmo peso a arquivos de tamanhos diferentes. O percentual da transferência avança a cada bloco confirmado de até 4 MiB. Preparar a imagem, abrir a sessão e disponibilizar o link são etapas separadas, sem percentuais inventados; concluir bytes não significa concluir a publicação. Não há previsão de tempo ou velocidade simulada. Uma falha mantém o arquivo e os seguintes na fila; tentar novamente na mesma página reaproveita a sessão e não reenvia bytes já concluídos se só faltou publicar. Pausar interrompe as próximas requisições. Não prometer envio com navegador fechado nem retomada após recarregar a página.

O envio tem uma seleção principal de arquivos; data, evento/pasta e redução de fotos ficam em opções recolhidas. A confirmação de compartilhamento é obrigatória. O servidor associa cada sessão de upload à origem HTTPS da interface, para que o navegador possa ler a confirmação do Google.

O botão Baixar solicita o arquivo ao navegador sem abrir outra aba do Drive. A API prefere o webContentLink oficial do próprio arquivo, com fallback para o link direto e preservando resourceKey. Ao selecionar vários arquivos e tocar em Baixar separados, o primeiro download é solicitado no próprio clique e a fila inicia os demais com intervalo. É possível pausar os próximos pedidos e solicitar o próximo arquivo individualmente. “Solicitado” não significa “salvo”: o navegador controla permissões para múltiplos downloads e não fornece confirmação ao app. Se o Google exigir confirmação, o link de verificação fica disponível por arquivo. Não há proxy de vídeo nem buffer integral em JS nesse caminho. A barra de seleção não oferece ZIP: cada arquivo é solicitado separadamente.

A criação de ZIP não participa do fluxo de downloads da interface. O utilitário isolado e seus testes permanecem no repositório, sem carregamento no app.

O QR de abertura é gerado localmente, sem serviço externo, código de operador, parâmetros ou fragmentos da URL. Em Preview protegido, o outro aparelho ainda precisa da autorização Vercel; o QR não remove essa proteção.

Atualizações do worker removem somente os caches legados conhecidos desta interface, preservando outros caches. Respostas de login/erros de servidor não são gravadas como se fossem a interface válida. Os testes do worker usam Cache/Fetch isolados, sem acessar o Drive.

## Interface e rolagem

A biblioteca usa navegação lateral no desktop e uma barra inferior no celular, com busca destacada, contagens derivadas dos arquivos carregados e agrupamento por evento. Cores, superfícies, campos, avisos e modais compartilham uma base visual clara/escura. O tema salvo é aplicado antes da primeira pintura, sem iniciar o tema oposto; a preferência do dispositivo é usada quando não há escolha salva. Zoom do navegador permanece permitido.

A página rola normalmente. Somente overlays abertos bloqueiam o fundo; um controle compartilhado mantém o bloqueio durante sobreposições e restaura a rolagem ao fechar, inclusive na saída da sessão. O envio tem uma única área rolável, cabeçalho/ações acessíveis e resumo de progresso em destaque durante a transferência. O menu Adicionar abre o mesmo fluxo em Android e iOS; não tenta acionar um input ainda inexistente. Conteúdo e configurações remotas não são alterados pelo redesign.

## Formatador para projeção

services/lyricsFormatter.ts analisa cada linha localmente, sem IA remota, credenciais ou custo por uso. Limpa grupos de emoji (incluindo sequências, bandeiras e teclas), decoração, caracteres invisíveis e formas tipográficas; reconhece seções, repetições, tempos, créditos explicitamente rotulados e cifras em linhas separadas ou entre colchetes na letra. A remoção de cifras não interrompe os blocos de duas linhas. Preserva palavras, acentos, pontuação comum e repetições cantadas. O agrupamento respeita estrofes, com opção de título ou letra sem título.

Uma frase entre parênteses não é tratada como crédito por suposição. Conteúdos ambíguos ficam mantidos em Revisar limpeza; o operador pode remover uma linha, manter o original ou reaplicar a limpeza. O texto original permanece disponível. Regras locais não compreendem semanticamente qualquer letra e não garantem formato perfeito de qualquer fonte: revise antes de copiar. Textos acima de 100 mil caracteres são recusados explicitamente, sem truncar a origem. O resultado são blocos de texto separados por linhas vazias para copiar; não é importação automática no Holyrics.

Na interface, o fluxo é nome + letra limpa em blocos de até duas linhas, separados por uma linha em branco. Estrofes e limites de seção são preservados; uma linha restante não é duplicada nem juntada à estrofe seguinte. Opções e alterações ficam recolhidas; Copiar nome e Copiar letra são ações separadas. `services/songbook.ts` separa músicas por títulos sinalizados com círculos coloridos, cabeçalhos Markdown ou Título/Música:, preservando estrofes. Nomes sem rótulo imediatamente abaixo do título ficam para revisão, sem remoção automática: uma frase com iniciais maiúsculas também pode ser parte da letra. Créditos explicitamente rotulados e nomes com indicação de pastor podem ser removidos; a remoção pode ser desfeita por linha. A regra não remove nomes no corpo da letra e mantém frases devocionais conhecidas. Sem cabeçalhos claros, cole uma música por vez. Não é reconhecimento semântico universal nem expande automaticamente instruções como Refrão 2x: remove a instrução e mantém as repetições já escritas.

## Seleção por dia

A biblioteca inicia no dia de envio mais recente. Seletor permite outra data ou Todos os dias → biblioteca inteira; datas usam America/Sao_Paulo sobre a data de publicação registrada, não extraem datas de nomes de eventos. Selecionar arquivos deste dia respeita busca/tipo ativos e inclui arquivos de eventos diferentes. Trocar de dia limpa a seleção, e filtros removem itens ocultos da seleção. Ctrl+A respeita o escopo atual; seleção em campos de texto não é capturada. Selecionar todos os dias continua disponível por escolha explícita. A seleção apenas prepara as ações; não solicita downloads nem exclui arquivos automaticamente.

## Estado da revisão

Em Servidor & Diagnóstico → Revisar arquivos antigos, consulte materiais publicados há 7 ou 14 dias. A consulta percorre todas as páginas, inclusive páginas sem candidatos; erros não aparecem como uma lista vazia. Arquivos marcados como preservados no servidor ficam fora dos candidatos. Esta tela apenas lista: não exclui, não altera compartilhamento nem ativa limpeza automática. Fechar o diagnóstico cancela as consultas pendentes.

Cada cartão permite Preservar este arquivo e desfazer a marcação. O estado muda somente após confirmação do servidor e é lido novamente ao abrir a biblioteca. Preservação retira o material da revisão por idade; não cria backup, não muda compartilhamento e não impede exclusão manual. Durante a gravação, outra marcação e a atualização da biblioteca aguardam para evitar operações concorrentes no mesmo estado. Sair da sessão cancela a solicitação local; se a resposta se perder, atualize a biblioteca para conferir o estado real antes de tentar novamente.

Em Enviar arquivos → Envios pendentes, arquivos que chegaram ao Drive mas ainda não foram disponibilizados podem ser recuperados após recarregar a página. A biblioteca consulta os metadados do servidor; não salva a sessão de upload nem credenciais no aparelho. O botão só é habilitado quando o tamanho recebido corresponde ao tamanho esperado e o operador confirma o compartilhamento por link. A publicação passa novamente pela verificação do backend. Falhas preservam o item para nova tentativa; nenhuma publicação ou exclusão é automática. Transferências incompletas ainda dependem da página original aberta: esta recuperação finaliza a publicação, não retoma bytes perdidos após recarga.

A leitura da biblioteca faz no máximo uma nova tentativa após falha de transporte ou HTTP 502/503/504, aguardando meio segundo e mantendo o orçamento total de 20 segundos por página. Sair da sessão ou cancelar interrompe a espera. Autenticação, limitação de acesso, respostas inválidas e operações que alteram dados não são repetidas automaticamente. Uma página parcial nunca substitui a última biblioteca completa validada. Essa proteção reduz falhas transitórias; não determina a causa de uma indisponibilidade do Google.

Esta importação prepara um ambiente para revisão; não representa auditoria completa. Testes automatizados devem interceptar APIs e sessões de upload ou usar origem isolada, preservando arquivos reais. Testes com respostas simuladas não confirmam CORS/Range, permissões ou download real do Google.

Os resultados, limites e próximos testes estão consolidados em [pendências para avaliação](docs/pendencias-validacao-2026-10-18.md). Permanecem sete alertas conhecidos de ferramentas na cadeia Tailwind 3, cuja migração exige revisão visual e de compatibilidade. Vídeos grandes, downloads no aparelho e transferência incompleta após recarga não foram validados ponta a ponta. Não há licença definida pelo titular neste repositório nesta etapa. Produção foi autorizada e publicada em 18/10; esses limites continuam explícitos.


## Link pessoal de acesso

Em Meu link, o operador confirma o código e cria um endereço pessoal válido por 90 dias. Uma chave criptograficamente aleatória de 256 bits fica no fragmento #access=; o bootstrap remove esse fragmento antes de carregar recursos e o troca por uma sessão via POST de mesma origem. Código de operador e chave do Google nunca entram no link. O segredo só aparece na resposta de criação e na memória do modal; copie e guarde antes de fechar. Não há recuperação do segredo: criar outro substitui o anterior.

Quem possuir o link terá os poderes de operador. Não o publique nem envie a grupos. A entrada por link é temporária por padrão (8 horas); Lembrar 7 dias é uma escolha explícita. Cada sessão continua limitada a sete dias e nunca ultrapassa o vencimento do link. Abrir o favorito pessoal novamente permite entrar sem código durante os 90 dias. Sair limpa a sessão deste navegador; não cancela o favorito.

Criação e cancelamento exigem sessão válida, origem idêntica e nova confirmação do código, sujeita ao orçamento de tentativas existente. Não é possível prolongar um link apenas por possuí-lo. Hash com HMAC e validade ficam em Script Properties sob lock; não há segredo bruto no registro. Origem e credenciais separam produção de Preview. Troca de código/chave invalida links. Cancelar ou substituir bloqueia novas entradas e as próximas chamadas autenticadas de sessões derivadas, inclusive em outras instâncias; chamadas já em andamento e arquivos previamente baixados/compartilhados não são desfeitos. Sessões abertas por código são preservadas.

A revogação durável exige uma consulta adicional ao Apps Script em cada requisição de sessão derivada de link, sem cache de autorização entre instâncias. Indisponibilidade do registro falha fechado, e não libera acesso por fallback. Não altera escopos, permissões, pasta ou materiais Google. A versão do backend com essas operações deve ser implantada antes da interface.


Se o link vencer, use Entrar com o código e depois Meu link para criar outro válido por 90 dias. Um link vencido/cancelado nunca se renova sozinho; criação de outro continua exigindo nova confirmação do código. A correção explícita de duração do link inicial de nove para noventa dias preserva sua chave, sem renovar repetidamente nem reativar links cancelados.


## Uso no celular e envio

Holyrics está disponível diretamente na barra inferior do celular e no cabeçalho do notebook. Enviar abre a seleção de arquivos sem um menu intermediário. A apresentação da biblioteca ocupa menos espaço no celular, e os controles de pesquisa usam fonte de 16px para evitar zoom automático no iPhone.

A fila envia até dois arquivos de no máximo 8 MiB em paralelo; arquivos maiores usam a conexão sozinhos. Se um envio falhar, a fila aguarda o outro envio ativo terminar e mantém somente os arquivos ainda não confirmados para nova tentativa. Pausar mantém as sessões em memória; a retomada consulta a posição no Drive. Recarregar a página ainda não recupera uma transferência incompleta.

A preparação de fotos JPEG/PNG/WebP é sequencial para limitar memória. O compactador carrega apenas quando necessário e seu worker é servido pelo próprio app. O original é mantido se o resultado não ficar menor; GIF e HEIC seguem no formato original. Isso reduz trabalho de preparação, mas não comprime vídeos nem garante uma velocidade de rede específica.


## Visualização de imagens

O visualizador enquadra a imagem em toda a área disponível, inclusive quando a miniatura é menor, sem distorcer a proporção. Para URLs de miniatura conhecidas do Google, solicita uma prévia de até 2048 pixels e retorna à URL da biblioteca se ela falhar; isso não garante a resolução do arquivo original. As miniaturas dos cartões continuam leves.

Zoom cria uma área rolável, com arraste pelo mouse e rolagem no celular. Ajustar imagem à tela restaura o enquadramento; a rotação considera os limites disponíveis. Arrastar uma imagem ampliada não muda o arquivo da galeria. As setas de navegação ficam fora da imagem e falhas de carregamento mostram alternativas de download/Drive.


## Contagem e filtros da biblioteca

O resumo mostra arquivos e eventos dos resultados filtrados, acompanhado de Mostrando X de Y arquivos. A abertura continua no dia de envio mais recente; Mostrar todos os arquivos limpa dia, tipo e busca, remove a seleção e expande os grupos. Contadores de tipo consideram o dia e a busca ativos. Nenhuma dessas ações altera arquivos no Drive.


## Atualização automática da biblioteca

Com a aba visível e conexão disponível, o app consulta novidades vinte segundos após cada atualização automática concluída. Voltar à aba ou recuperar a conexão também solicita uma consulta, com intervalo mínimo de cinco segundos e sem sobrepor leituras. Abas ocultas e telas de envio/edição interrompem novas consultas; falhas mantêm a última lista e aumentam o intervalo até dois minutos. Sair da conta remove os agendamentos e cancela a leitura em andamento.

A atualização preserva busca, tipo, grupos recolhidos e a seleção dos arquivos que ainda existem. Se surgir um dia mais recente enquanto há fotos selecionadas, mantém o dia atual explicitamente selecionado para não escondê-las. Leituras antigas são canceladas antes de renomear ou excluir para não sobrescrever uma alteração confirmada. Cartões usam identificadores estáveis, evitando remontagem quando novos arquivos mudam a ordem da lista. Não há avisos de sucesso repetidos nem download automático dos materiais.


## Marcação de download solicitado

Os cartões indicam Download solicitado depois que o app encaminha o pedido ao navegador. Pedidos individuais, pela fila ou pelo visualizador usam o mesmo registro. A marca não confirma que o arquivo foi salvo e não bloqueia uma nova tentativa. Arquivos que ainda estão aguardando na fila ou cujo pedido falhou antes de iniciar não são marcados.

As marcações ficam apenas na memória desta aba e sobrevivem a filtros e atualizações automáticas. Limpar marcações apaga somente esses indicadores, sem cancelar downloads nem alterar arquivos. Sair ou recarregar a página remove o registro. Nenhum nome de arquivo, link ou histórico de download é persistido no armazenamento do navegador ou no servidor.


## Seleção por intervalo no notebook

Marque o primeiro arquivo pelo círculo de seleção e use Shift + clique no último. Se o último estiver desmarcado, marca o intervalo; se já estiver marcado, desmarca o intervalo. Escolhas fora do intervalo são preservadas. O gesto segue a ordem dos cartões exibidos, nos dois sentidos, inclusive entre grupos. Grupos recolhidos e arquivos ainda não exibidos não são incluídos; Exibir todas permite ampliar o intervalo depois. Um clique comum continua alternando um arquivo. Limpar a seleção, selecionar todos ou mudar os filtros reinicia a referência do intervalo.


## Escolher fotos ampliadas

O visualizador mostra Selecionar esta foto / Desmarcar esta foto e o total de arquivos na seleção. Passar para a próxima foto mantém as escolhas anteriores. Ao fechar, a mesma seleção aparece na biblioteca para Baixar separados; selecionar não inicia transferência. O botão Visualizar dos cartões permite conferir outra imagem com uma seleção já ativa. Selecionar uma foto posterior à primeira página revela seu cartão ao voltar à biblioteca.

## Áudio, vídeo, PDF, atalhos e QR Code

Áudio e vídeo compartilham controles nativos do navegador, com avanço na faixa, duração e reprodução inline no iPhone. O estado Reproduzindo só aparece após o evento real de reprodução; bloqueios de início automático pedem um toque, sem rejeições de Promise não tratadas. Abrir outro áudio/vídeo pausa o anterior; fechar libera sua fonte. Alterar a seleção não reinicia um vídeo pausado. Falhas oferecem nova tentativa, Drive e download. A barra de áudio sobe quando há uma seleção para deixar as ações de download acessíveis. A lista reserva espaço de rolagem no fim enquanto o áudio ou a seleção estão ativos, permitindo acessar os últimos cartões acima das barras.

A prévia de PDF mantém Abrir PDF, Baixar PDF e Recarregar prévia disponíveis. Após doze segundos sem resposta, avisa sobre a demora sem interromper o carregamento. O iframe do Google é de outra origem: seu evento load não confirma que o documento foi renderizado, por isso a alternativa para abrir o PDF permanece visível mesmo após esse evento.

Espaço reproduz/pausa a mídia ativa quando o foco não está em um botão, campo ou controle nativo. Setas navegam no visualizador e respeitam os controles de áudio/vídeo em foco. Escape fecha o visualizador, QR ou ajuda de atalhos. A busca com / e a seleção com Ctrl/Cmd+A não agem por trás de janelas abertas nem durante digitação. A ajuda inclui Shift+clique, informa que Ctrl/Cmd+A seleciona todos os resultados do filtro e permite rolagem em telas pequenas.

O QR é gerado localmente e compartilha o endereço público fixo quando aberto em uma implantação Vercel, evitando enviar o celular a uma prévia protegida. Em domínios próprios e testes locais, preserva origem e caminho, removendo credenciais, parâmetros e fragmentos. O mesmo endereço aparece no QR, no campo e na cópia. As instruções usam a senha de acesso atual.

## Identidade visual Univer Mídia

A marca aprovada foi vetorizada em contornos, mantendo o U com play e o desenho do nome, sem depender de fontes. `public/brand` contém símbolo, nome e composição completa em SVG: original azul/escuro, azul, branco, escuro e azul claro/branco para fundo escuro. Arquivos `*-currentcolor.svg` permitem recolorir a marca por CSS quando inseridos inline. PNGs transparentes e o kit completo também estão disponíveis nesse diretório.

`components/Brand.tsx` reutiliza os mesmos contornos com `variant="symbol"`, `"wordmark"` ou `"combined"`. O texto herda `currentColor`; o símbolo aceita `symbolColor` ou a variável `--brand-symbol`. Cabeçalho, menu, lateral e tela de acesso usam esse componente. Favicon, ícones de instalação e Apple Touch Icon usam arquivos locais; o ícone maskable tem margem própria para os recortes do sistema. Não há mais dependência da antiga imagem do Imgur.


## Temas claro e escuro

Lateral, faixa de acesso, login, fundos das prévias dos cartões, visualizador e barras de áudio/seleção acompanham o tema. Superfícies usam cores claras por padrão; fundos escuros pertencem às variantes dark. A marca herda a cor do texto e usa o azul definido por `--brand-symbol` no tema. Vídeos e imagens mantêm as próprias cores.

A preferência salva prevalece sobre o sistema e continua após recarregar ou sair. A barra do navegador recebe a cor do tema, inclusive na tela de login antes de montar o App. O manifest usa uma superfície clara como padrão de abertura; o tema escolhido é aplicado pelo documento.

## Autorização entre aparelhos e lista de acessos

A tela de entrada permite solicitar acesso por QR ao celular conectado. O caminho inverso começa em Aparelhos conectados: o PC emite um convite QR, o novo celular solicita a entrada e o PC confirma. As duas direções dispensam senha/código digitado quando já existe um aparelho conectado. A lista identifica navegador, aparelho, último uso e validade, com encerramento remoto confirmado e revogação dos acessos derivados. A ativação requer atualizar a implantação Apps Script existente com `backend/drive/Code.gs`; consulte [as instruções](docs/autorizar-aparelhos.md). Até isso ocorrer, o app mantém a senha e oculta os recursos ainda indisponíveis.

## Revisão de envios e possíveis repetidos

A janela de envio conserva o resultado por arquivo: disponível na biblioteca, chegou ao Drive mas falta publicar, transferência interrompida ou ainda não iniciada. Retomar opera apenas sobre os pendentes; os arquivos concluídos permanecem no resumo. As mesmas sessões e arquivos preparados são reutilizados nesta página, inclusive em tentativas de publicação sem nova transferência. Perder a conexão pausa a fila; voltar à internet não inicia envios automaticamente. Fechar/reabrir a janela preserva a fila, mas recarregar a página perde a seleção de arquivos locais; envios completos pendentes de publicação continuam recuperáveis pela biblioteca.

Arquivos escolhidos são comparados por nome normalizado e tamanho com a biblioteca inteira e a seleção atual. Possíveis repetições recebem aviso e exigem revisão explícita antes do envio. Arquivos com o mesmo nome e tamanho podem ter conteúdos diferentes: não se promete comparação binária, não se calcula hash de vídeos inteiros e nada é apagado ou substituído automaticamente.
