# Churchdrop2 — Univer Mídia

Aplicação React/Vite para organizar e transferir mídias usadas na igreja. Repositório importado do Google AI Studio para preparação e revisão na Vercel.

## Executar

Use Node.js 24 e npm:

```sh
npm ci
npm run dev
```

Para compilar: `npm run build`. A saída é `dist`.

Verificações locais: `npm run typecheck` e `npm test`. Os testes de leitura usam respostas isoladas; não operam no Google Drive.

## Serviços e dados

A interface é hospedada na Vercel. `services/churchService.ts` usa somente a API autenticada do próprio app; o navegador não chama mais o Apps Script legado. A API conversa com o novo script assinado, e os blocos de upload seguem diretamente ao Drive. Publicar a interface não transfere arquivos antigos nem a propriedade dos scripts. As instruções históricas de backend não representam o serviço novo.

Nenhuma credencial de IA é necessária para iniciar a interface atual. Não coloque chaves privadas em código de navegador, no Git ou em variáveis com prefixo `VITE_`.

A nova integração com Drive está descrita em [backend/drive](backend/drive/README.md). A versão 3 do script e o código privado de operador foram configurados somente no Preview. Entrada, listagem e saída foram conferidas pela interface implantada. Um envio binário real isolado, autorizado pelo responsável, confirmou a resposta do Drive no navegador; o arquivo temporário foi enviado à lixeira sem compartilhamento. O responsável confirmou que o envio de seu material funcionou após a correção. Download em outro aparelho e vídeos grandes ainda precisam de ensaio completo. Se `UNIVER_DRIVE_ENABLED=false`, a interface mostra preparação e não usa o serviço antigo como fallback. O acervo legado permanece intocado.

O acervo novo é composto somente por materiais que podem ser compartilhados por link, conforme decisão do responsável. A pasta permanece privada. A tela de envio exige confirmação de que qualquer pessoa que receber o link poderá abrir e repassá-lo. Enviar, renomear e remover exigem sessão de operador; o uso cotidiano dispensa login Google. A ativação é exclusiva do Preview protegido, sem publicação em produção.

## Cache e uso offline

O service worker guarda apenas o HTML da interface, manifesto e JS/CSS locais. Não armazena vídeos, arquivos do Drive, APIs, URLs com parâmetros, respostas privadas ou pedidos com autorização/Range. Limites: 24 entradas, cada uma com até 2 MiB; o navegador pode remover o cache conforme sua cota. Fontes e imagens externas ainda dependem de rede.

Após um primeiro carregamento válido, a interface pode reabrir offline; isso não disponibiliza o acervo nem permite enviar arquivos sem conexão. A entrada exige confirmar sessão online. Metadados da biblioteca e sessões de upload ficam apenas na memória da página, sem persistir URLs de upload. Sair remove esses dados, e uma resposta de sessão expirada bloqueia novamente a interface. A chave conhecida do cache legado é removida ao iniciar/sair; não são apagados outros dados do navegador.

O progresso mostra o arquivo atual (N de total), seus bytes confirmados e o total desse arquivo, sem dar o mesmo peso a arquivos de tamanhos diferentes. O percentual da transferência avança a cada bloco confirmado de até 4 MiB. Preparar a imagem, abrir a sessão e disponibilizar o link são etapas separadas, sem percentuais inventados; concluir bytes não significa concluir a publicação. Não há previsão de tempo ou velocidade simulada. Uma falha mantém o arquivo e os seguintes na fila; tentar novamente na mesma página reaproveita a sessão e não reenvia bytes já concluídos se só faltou publicar. Pausar interrompe as próximas requisições. Não prometer envio com navegador fechado nem retomada após recarregar a página.

O envio tem uma seleção principal de arquivos; data, evento/pasta e redução de fotos ficam em opções recolhidas. A confirmação de compartilhamento é obrigatória. O servidor associa cada sessão de upload à origem HTTPS da interface, para que o navegador possa ler a confirmação do Google.

O botão Baixar solicita o arquivo ao navegador sem abrir outra aba do Drive. A API prefere o webContentLink oficial do próprio arquivo, com fallback para o link direto e preservando resourceKey. A fila Baixar separados permite solicitar todos com intervalo, pausar novas solicitações ou baixar o próximo/per-file. “Solicitado” não significa “salvo”: o navegador controla permissões para múltiplos downloads e não fornece confirmação ao app. Se o Google exigir confirmação, o link de verificação fica disponível por arquivo. Não há proxy de vídeo nem buffer integral em JS nesse caminho. ZIP é uma opção separada.

O ZIP no navegador aceita até 20 arquivos, 20 MiB por arquivo e 50 MiB no conjunto, com tamanho conhecido. Seleções maiores continuam disponíveis por download individual. O app valida o tipo, o tamanho e o conteúdo recebido, recusa páginas HTML de erro e não entrega um ZIP parcial. O progresso pode ser cancelado; o empacotamento tem buffers adicionais e não representa um teto de memória RAM. A biblioteca ZIP só é carregada ao usar o recurso.

O QR de abertura é gerado localmente, sem serviço externo, código de operador, parâmetros ou fragmentos da URL. Em Preview protegido, o outro aparelho ainda precisa da autorização Vercel; o QR não remove essa proteção.

Atualizações do worker removem somente os caches legados conhecidos desta interface, preservando outros caches. Respostas de login/erros de servidor não são gravadas como se fossem a interface válida. Os testes do worker usam Cache/Fetch isolados, sem acessar o Drive.

## Interface e rolagem

A biblioteca usa navegação lateral no desktop e uma barra inferior no celular, com busca destacada, contagens derivadas dos arquivos carregados e agrupamento por evento. Cores, superfícies, campos, avisos e modais compartilham uma base visual clara/escura. O tema salvo é aplicado antes da primeira pintura, sem iniciar o tema oposto; a preferência do dispositivo é usada quando não há escolha salva. Zoom do navegador permanece permitido.

A página rola normalmente. Somente overlays abertos bloqueiam o fundo; um controle compartilhado mantém o bloqueio durante sobreposições e restaura a rolagem ao fechar, inclusive na saída da sessão. O envio tem uma única área rolável, cabeçalho/ações acessíveis e resumo de progresso em destaque durante a transferência. O menu Adicionar abre o mesmo fluxo em Android e iOS; não tenta acionar um input ainda inexistente. Conteúdo e configurações remotas não são alterados pelo redesign.

## Formatador para projeção

services/lyricsFormatter.ts analisa cada linha localmente, sem IA remota, credenciais ou custo por uso. Limpa grupos de emoji (incluindo sequências, bandeiras e teclas), decoração, caracteres invisíveis e formas tipográficas; reconhece seções, repetições, tempos, créditos explicitamente rotulados e linhas compostas por cifras. Preserva palavras, acentos, pontuação comum e repetições cantadas. O agrupamento respeita estrofes, com opção de título ou letra sem título.

Uma frase entre parênteses não é tratada como crédito por suposição. Conteúdos ambíguos ficam mantidos em Revisar limpeza; o operador pode remover uma linha, manter o original ou reaplicar a limpeza. O texto original permanece disponível. Regras locais não compreendem semanticamente qualquer letra e não garantem formato perfeito de qualquer fonte: revise antes de copiar. Textos acima de 100 mil caracteres são recusados explicitamente, sem truncar a origem. O resultado são blocos de texto separados por linhas vazias para copiar; não é importação automática no Holyrics.

## Estado da revisão

Esta importação prepara um ambiente para revisão; não representa auditoria completa. Testes automatizados devem interceptar APIs e sessões de upload ou usar origem isolada, preservando arquivos reais. Testes com respostas simuladas não confirmam CORS/Range, permissões ou download real do Google.

Ainda serão revisados segurança das operações remotas, dependências, tratamento de falhas, dados offline, experiência em diferentes telas e documentação de operação. Não há licença definida pelo titular neste repositório nesta etapa.
