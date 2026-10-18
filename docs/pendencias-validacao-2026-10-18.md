# Univer Mídia — entrega para avaliação, 18/10/2026

Prévia protegida vigente: https://univer-midia-cz3ozb4gr-alesobralcortes-9387s-projects.vercel.app/

Código implantado: 6702c0063d55d0d2dafb4d7cb3cd06e858c0581e. Projeto Vercel univer-midia, ambiente Preview, PR #1 draft. Produção, Churchdrop antigo e backend legado não foram substituídos. O código de operador permanece no guia privado; não deve entrar nesta documentação.

## Entregue nesta revisão

- Downloads separados sem abrir uma aba do Drive, fila pausável e ZIP opcional. O navegador/Google ainda pode pedir confirmação; o app conta solicitações, não finge comprovar salvamento.
- Formatador Holyrics local com revisão antes/depois e preservação de frases ambíguas. Não é IA semântica nem importação automática no Holyrics.
- Redesign claro/escuro, rolagem móvel, modais e progresso baseado em bytes confirmados.
- Recuperação limitada de falhas de leitura, sem repetir alterações automaticamente.
- Recuperação da publicação de arquivos já transferidos após recarga, com consentimento explícito.
- Revisão por 7/14 dias e preservação reversível por arquivo. Limpeza automática desligada.
- Vite atualizado e 87 testes aprovados, além de tipos/build e ensaios de navegador com respostas isoladas.

## Verificações que faltam no aparelho

1. Baixar um arquivo e depois dois separados no Chrome Android. Conferir se ambos aparecem nos Downloads; autorizar múltiplos downloads somente se o navegador solicitar e você desejar. A interface não consegue verificar esse salvamento.
2. Repetir o caminho básico no iPhone/iPad e no PC que serão usados. Os ensaios automatizados de largura não representam esses aparelhos físicos.
3. Enviar um vídeo representativo, anotando tamanho e duração. Conferir reprodução e download no destino. O envio pequeno já foi confirmado pelo responsável; vídeo grande/Range real ainda não.
4. Se uma transferência falhar, manter a página aberta para tentar retomar. Depois de recarga, a recuperação entregue resolve publicação de bytes completos, não transferência incompleta. Não há promessa de envio em segundo plano.
5. Experimentar preservar um material legítimo destinado à revisão e conferir a marca após recarregar. Isso não cria backup e a lixeira manual continua possível.

Essas ações serão realizadas pelo responsável ou em teste remoto especificamente autorizado. Os ensaios automáticos não criaram, compartilharam nem removeram novos arquivos reais nesta madrugada.

## Dependências: risco residual explícito

A auditoria anterior passou de nove para sete alertas após atualizar Vite/esbuild. Permanecem cinco altos e dois moderados na cadeia de desenvolvimento Tailwind 3.4.19. São dois problemas de origem propagados por dependências: processamento de padrões em braces e processamento de seletores em postcss-selector-parser. Auditoria omitindo dev teve zero alertas conhecidos, o que não equivale a uma auditoria completa ou garantia de segurança.

`npm ls` confirmou braces 3.0.3 e postcss-selector-parser 6.1.4 sob Tailwind. A linha Tailwind 3 disponível termina em 3.4.19 nesta conferência. Não foi usada uma substituição de versão incompatível para apenas esconder o alerta. Os arquivos/padrões processados no build vêm do repositório; uploads e metadados do Drive não são passados ao gerador CSS. Isso limita a exposição observada, sem corrigir a vulnerabilidade das ferramentas ou eliminar risco de fontes de build não confiáveis.

Fontes: [aviso braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [aviso de seletores PostCSS](https://github.com/advisories/GHSA-rj75-hqrm-r3gf).

## Próxima decisão técnica

Tratar a migração Tailwind 4 como etapa separada, com comparação visual e definição dos navegadores suportados. O [guia oficial de atualização](https://tailwindcss.com/docs/upgrade-guide) informa Safari 16.4+, Chrome 111+ e Firefox 128+, além de mudanças de integração, utilitários e estilos padrão. Isso requer conferir a configuração de cores, tema escuro, camadas CSS, sombras/bordas e todos os modais; não é uma correção automática de lockfile. Não foi executado audit fix --force nem migrador amplo.

Não houve aceite silencioso desses alertas como resolvidos. A prévia serve para avaliação; liberação em produção, atualização do Apps Script, transferência do repositório e licença definitiva permanecem decisões fora desta rodada. As retomadas horárias são encerradas após a consolidação para evitar alterações repetidas enquanto faltam validação no aparelho e definição da próxima migração.
