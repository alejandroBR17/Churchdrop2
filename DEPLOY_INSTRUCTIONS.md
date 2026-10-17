# ⚠️ COMO CORRIGIR O ERRO DE UPLOAD (CORS)

O erro "Falha na conexão (CORS)" ocorre porque o link que você está usando (`API_URL`) está apontando para uma versão antiga ou com permissões restritas do seu Script.

Para corrigir isso, você precisa atualizar o "Deploy" no Google Apps Script seguindo **exatamente** estes passos:

1. Acesse seu projeto no Google Apps Script: [script.google.com](https://script.google.com/)
2. Abra o projeto **ChurchDrop**.
3. Verifique se o código `Code.gs` está salvo (o ícone de disquete na barra superior deve estar cinza, não laranja).
4. No canto superior direito, clique no botão azul **Implantar (Deploy)**.
5. Selecione **Gerenciar implantações (Manage deployments)**.
6. Na janela que abrir:
   - Clique no ícone de lápis/editar no topo (na implantação "Ativa").
   - Em **Versão (Version)**, mude de "Versão existente" para **"Nova versão" (New version)**. 
     *(Isso é crucial! Se você não selecionar "Nova versão", o Google continua rodando o código antigo).*
   - Em **Descrição**, escreva algo como "Atualização Upload".
   - Verifique **Executar como (Execute as)**: Deve estar **Eu (Me)**.
   - Verifique **Quem tem acesso (Who has access)**: Deve estar **Qualquer pessoa (Anyone)**.
   - Clique em **Implantar (Deploy)**.

7. O Google vai te dar uma URL (Web app URL).
   - Verifique se essa URL termina com `/exec`.
   - Copie essa URL.

8. Vá no seu código do Frontend, arquivo `services/churchService.ts`.
9. Atualize a variável `API_URL` com esse link novo (mesmo que pareça igual, às vezes muda se você criar um novo deploy em vez de atualizar).

---
**Resumo:** O segredo é sempre selecionar **"Nova versão"** ao implantar. Apenas salvar o código (`Ctrl+S`) não atualiza o site que recebe os arquivos.

# 🚀 DEPLOY NA VERCEL

O projeto já está **100% otimizado e pronto** para ser publicado na Vercel. 

**Por que não usamos Next.js?**
O projeto atual é uma Single Page Application (SPA) construída com **Vite + React**. Migrar para o Next.js (que foca em Server-Side Rendering) seria arriscado e desnecessário para este caso de uso, pois:
1. O processamento de PDFs (`pdfjs-dist`) frequentemente quebra em ambientes SSR como o Next.js.
2. O App funciona como um PWA (Progressive Web App) offline-first, o que é muito mais fácil de gerenciar em uma SPA pura.
3. A Vercel suporta Vite nativamente com altíssima performance.

### Como fazer o Deploy na Vercel:

1. Crie um repositório no GitHub e faça o push do seu código.
2. Acesse [vercel.com](https://vercel.com) e faça login.
3. Clique em **"Add New..." > "Project"**.
4. Importe o seu repositório do GitHub.
5. A Vercel detectará automaticamente que é um projeto **Vite**.
6. As configurações padrão já estarão corretas:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
7. Clique em **Deploy**.

O arquivo `vercel.json` já foi configurado no projeto para garantir que o roteamento e o cache do PWA funcionem perfeitamente em produção.