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

A interface é hospedada na Vercel. O serviço atual em `services/churchService.ts` continua usando Google Apps Script e Google Drive. Publicar a interface não transfere os arquivos do Drive nem a propriedade do script. As instruções históricas de backend precisam ser revisadas antes de alterar o serviço remoto.

Nenhuma credencial de IA é necessária para iniciar a interface atual. Não coloque chaves privadas em código de navegador, no Git ou em variáveis com prefixo `VITE_`.

## Estado inicial

Esta importação prepara um ambiente para revisão; não representa auditoria completa. A interface contém operações de upload, renomeação e exclusão ligadas ao serviço existente. Testes automatizados devem interceptar esse serviço ou usar uma origem de testes, preservando os arquivos reais.

Ainda serão revisados segurança das operações remotas, dependências, tratamento de falhas, dados offline, experiência em diferentes telas e documentação de operação. Não há licença definida pelo titular neste repositório nesta etapa.
