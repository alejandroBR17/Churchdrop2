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

A nova integração com Drive está descrita em [backend/drive](backend/drive/README.md). A versão 2 do script e o código privado de operador foram configurados somente no Preview. Entrada, listagem real vazia e saída foram conferidas pela interface implantada. Upload, publicação e download ainda precisam de ensaio real autorizado. Se `UNIVER_DRIVE_ENABLED=false`, a interface mostra preparação e não usa o serviço antigo como fallback. O acervo legado permanece intocado.

O acervo novo é composto somente por materiais que podem ser compartilhados por link, conforme decisão do responsável. A pasta permanece privada. A tela de envio exige confirmação de que qualquer pessoa que receber o link poderá abrir e repassá-lo. Enviar, renomear e remover exigem sessão de operador; o uso cotidiano dispensa login Google. A ativação é exclusiva do Preview protegido, sem publicação em produção.

## Cache e uso offline

O service worker guarda apenas o HTML da interface, manifesto e JS/CSS locais. Não armazena vídeos, arquivos do Drive, APIs, URLs com parâmetros, respostas privadas ou pedidos com autorização/Range. Limites: 24 entradas, cada uma com até 2 MiB; o navegador pode remover o cache conforme sua cota. Fontes e imagens externas ainda dependem de rede.

Após um primeiro carregamento válido, a interface pode reabrir offline; isso não disponibiliza o acervo nem permite enviar arquivos sem conexão. A entrada exige confirmar sessão online. Metadados da biblioteca e sessões de upload ficam apenas na memória da página, sem persistir URLs de upload. Sair remove esses dados, e uma resposta de sessão expirada bloqueia novamente a interface. A chave conhecida do cache legado é removida ao iniciar/sair; não são apagados outros dados do navegador.

O progresso corresponde aos bytes confirmados pelo Drive; 100% só aparece após confirmar a publicação. Uma falha mantém o arquivo e os seguintes na fila; tentar novamente na mesma página reaproveita a sessão e não reenvia bytes já concluídos se só faltou publicar. Pausar interrompe as próximas requisições. Não prometer envio com navegador fechado nem retomada após recarregar a página.

O QR de abertura é gerado localmente, sem serviço externo, código de operador, parâmetros ou fragmentos da URL. Em Preview protegido, o outro aparelho ainda precisa da autorização Vercel; o QR não remove essa proteção.

Atualizações do worker removem somente os caches legados conhecidos desta interface, preservando outros caches. Respostas de login/erros de servidor não são gravadas como se fossem a interface válida. Os testes do worker usam Cache/Fetch isolados, sem acessar o Drive.

## Estado inicial

Esta importação prepara um ambiente para revisão; não representa auditoria completa. Testes automatizados devem interceptar APIs e sessões de upload ou usar origem isolada, preservando arquivos reais. Testes com respostas simuladas não confirmam CORS/Range, permissões ou download real do Google.

Ainda serão revisados segurança das operações remotas, dependências, tratamento de falhas, dados offline, experiência em diferentes telas e documentação de operação. Não há licença definida pelo titular neste repositório nesta etapa.
