# Preparação do Univer Mídia — 17/10/2026

Repositório: https://github.com/alejandroBR17/Churchdrop2 . O endereço fornecido já pertence à conta conectada e tem permissão administrativa; não houve duplicação nem transferência de propriedade.

Projeto Vercel: **univer-midia**, ID `prj_taDNCJGJZBwSfz1GBlaop1vWSqqV`, equipe `team_Ml0gRSvgy3o8VQUj3VlqAlXw`. Inicialmente criado como churchdrop2 e renomeado após orientação humana. O domínio churchdrop.vercel.app não foi localizado na conta conectada e não foi alterado. Não modificar outro projeto para tentar tomar esse domínio.

Ambiente: https://univer-midia-1xkrhvw3r-alesobralcortes-9387s-projects.vercel.app/ . Deploy `dpl_4T1hN6tGBoswoitDBBRkJLnEwFkw`, commit `5f1cd720ee804e40088a144903ce79da2cb65078`, READY. A Vercel classificou o primeiro deploy como production; trata-se de projeto separado, ainda protegido por Vercel Authentication. Não afirmar que o target é Preview. Link temporário de acesso foi aberto no navegador do chat; não versionar seu token. A PR #1 continua draft: https://github.com/alejandroBR17/Churchdrop2/pull/1 .

Mudanças mínimas: lockfile npm, Node 24, README, gitignore e prop show do Toast (antes ausente, escondia o aviso e falhava no TypeScript). npm install foi feito sem scripts de instalação. TypeScript e build aprovados. Navegador em 390/1440 confirmou renderização sem erros de página, interceptando o serviço remoto para não ler/escrever arquivos reais. Dados exibidos no ensaio são fallback já existente do app; não foram inseridos no Drive.

## Prioridades da revisão

1. Confirmar e proteger autorização do backend: operações de upload/renomeação/exclusão usam Google Apps Script diretamente. O código de documentação do backend não substitui inspeção do script efetivamente implantado. Nenhuma alteração foi feita no Drive ou no Apps Script.
2. Tratar dependências: auditoria inicial reportou 12 alertas, sendo 1 crítico, 8 altos e 3 moderados. Inclui pdfjs-dist antigo, tar transitivo e ferramentas de build. Não aplicar audit fix --force cegamente. Há dependências aparentemente sem uso e importmap com versões divergentes do package; verificar antes de remover/migrar.
3. Separar lista vazia real de falha/cache/dados de exemplo. Hoje lista vazia pode exibir MOCK_MEDIA e ocultar a realidade do servidor.
4. Rever JSON.stringify globalmente sobrescrito, cache do service worker, falhas/retentativas e experiência de arquivos grandes, preservando dados legítimos.
5. Depois, revisar interface responsiva, nomenclatura/identidade, ícones/imagens hospedadas e documentação. Não houve redesign nesta etapa.

Publicar a interface na Vercel não transfere propriedade do Apps Script nem arquivos do Google Drive. Não há licença definida no repositório de origem; não presumir Apache ou MIT dos outros projetos.
