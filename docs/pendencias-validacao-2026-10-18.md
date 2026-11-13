# Univer Mídia — entrega para avaliação, 18/10/2026

Atualização: produção autorizada e publicada em https://churchdrop2.vercel.app/ , commit 7fdbc92d3e702505c28efc6529222fccde691ec3, com 94 testes e login/biblioteca autenticada conferidos. Os limites abaixo permanecem; referências à produção ainda pendente descrevem a etapa anterior e foram substituídas por esta autorização expressa.

Prévia protegida vigente: https://univer-midia-p8skwd5jn-alesobralcortes-9387s-projects.vercel.app/

Código implantado: 2069e891eebc1143b11bb297ebfbeb14c5cae4f9. Projeto Vercel univer-midia, ambiente Preview, PR #1 draft. Produção, Churchdrop antigo e backend legado não foram substituídos. O código de operador permanece no guia privado; não deve entrar nesta documentação.

## Entregue nesta revisão

- Downloads separados sem abrir uma aba do Drive, fila pausável e ZIP opcional. O navegador/Google ainda pode pedir confirmação; o app conta solicitações, não finge comprovar salvamento.
- Seleção por dia de envio, iniciando no mais recente e com biblioteca inteira somente por escolha explícita; troca de dia limpa seleção.
- Formatador Holyrics local com revisão antes/depois e preservação de frases ambíguas. Não é IA semântica nem importação automática no Holyrics.
- Redesign claro/escuro, rolagem móvel, modais e progresso baseado em bytes confirmados.
- Recuperação limitada de falhas de leitura, sem repetir alterações automaticamente.
- Recuperação da publicação de arquivos já transferidos após recarga, com consentimento explícito.
- Revisão por 7/14 dias e preservação reversível por arquivo. Limpeza automática desligada.
- Formatador simplificado por música, nome editável e cópia de nome/letra separados; opções e revisão recolhidas.
- Vite atualizado e 92 testes aprovados, além de tipos/build e ensaios de navegador com respostas isoladas.

## Verificações que faltam no aparelho

1. Baixar um arquivo e depois dois separados no Chrome Android. Conferir se ambos aparecem nos Downloads; autorizar múltiplos downloads somente se o navegador solicitar e você desejar. A interface não consegue verificar esse salvamento.
2. Repetir o caminho básico no iPhone/iPad e no PC que serão usados. Os ensaios automatizados de largura não representam esses aparelhos físicos.
3. Enviar um vídeo representativo, anotando tamanho e duração. Conferir reprodução e download no destino. O envio pequeno já foi confirmado pelo responsável; vídeo grande/Range real ainda não.
4. Se uma transferência falhar, manter a página aberta para tentar retomar. Depois de recarga, a recuperação entregue resolve publicação de bytes completos, não transferência incompleta. Não há promessa de envio em segundo plano.
5. Experimentar preservar um material legítimo destinado à revisão e conferir a marca após recarregar. Isso não cria backup e a lixeira manual continua possível.

Essas ações serão realizadas pelo responsável ou em teste remoto especificamente autorizado. Os ensaios automáticos não criaram, compartilharam nem removeram novos arquivos reais nesta madrugada.

## Dependências de desenvolvimento — atualização de 09/11/2026

A auditoria atual encontrou um alerta moderado em `postcss-selector-parser` 6.1.4, usado pelo Tailwind. O lockfile atualiza o parser para 6.1.6, na mesma série, e a auditoria do npm passou a retornar zero alertas conhecidos. Os números da auditoria de outubro são históricos.

Fonte: [aviso de seletores PostCSS](https://github.com/advisories/GHSA-rj75-hqrm-r3gf).

## Próxima decisão técnica

Tratar a migração Tailwind 4 como etapa separada, com comparação visual e definição dos navegadores suportados. O [guia oficial de atualização](https://tailwindcss.com/docs/upgrade-guide) informa Safari 16.4+, Chrome 111+ e Firefox 128+, além de mudanças de integração, utilitários e estilos padrão. Isso requer conferir a configuração de cores, tema escuro, camadas CSS, sombras/bordas e todos os modais; não é uma correção automática de lockfile. Não foi executado audit fix --force nem migrador amplo.

Não houve aceite silencioso desses alertas como resolvidos. A prévia serve para avaliação; liberação em produção, atualização do Apps Script, transferência do repositório e licença definitiva permanecem decisões fora desta rodada. As retomadas horárias são encerradas após a consolidação para evitar alterações repetidas enquanto faltam validação no aparelho e definição da próxima migração.
