# Checklist de Tarefas - ChurchDrop / Univer Mídia

## ✅ Tarefas Concluídas
- [x] **Conexão API:** Integração com Google Apps Script (GET/POST).
- [x] **Upload & Listagem:** Envio de fotos, vídeos e conversão de PDF para imagens.
- [x] **Correção de Imagens:** Substituição de links `drive.google.com/thumbnail` por `lh3.googleusercontent.com` para evitar erros de 403/Corrompido.
- [x] **UX Profissional:** Implementação de **Skeleton Loading** (carregamento pulsante) no lugar de spinners simples.
- [x] **Identidade Visual:** Tema "Univer Mídia" (Dark Mode, Vermelho Sangue, Dourado e Preto Profundo).
- [x] **Instalação PWA:** Configuradon `manifest.json` e Service Workers para funcionar como App nativo.
- [x] **Atalhos:** Implementação de `Ctrl+V` (Colar), `Ctrl+K` (Buscar) e `F` (Tela Cheia).
- [x] **Download:** Download silencioso via iframe e download em lote.

## 🚀 Melhorias Futuras / Backlog
- [ ] **Paginação:** Adicionar "Carregar mais" se a lista passar de 50 itens para poupar dados móveis.
- [ ] **Upload em Lote Resiliente:** Se um arquivo falhar no meio de 10, continuar os outros e relatar o erro apenas do específico.
- [ ] **Compressão de Vídeo:** Tentar comprimir vídeos pesados no cliente (via WebAssembly/FFmpeg) antes de enviar (Tarefa complexa).

---

# 🤖 GUIA PARA IAs E DESENVOLVEDORES

Se você é uma IA ou Dev editando este código, **leia atentamente** antes de fazer alterações:

### 1. Regras de Backend (Google Apps Script)
- **NUNCA** sugira mudar o backend para Node.js, Firebase ou AWS a menos que explicitamente solicitado. O usuário depende do **Google Apps Script** pela facilidade e custo zero.
- O Frontend usa `fetch` simples. O Google Apps Script não suporta preflight CORS complexo, então requisições `OPTIONS` falham. Mantenha o uso de `Content-Type: text/plain` ou deixe o navegador lidar com `application/x-www-form-urlencoded` se possível, mas o padrão atual JSON stringificado no corpo do POST funciona bem.

### 2. Tratamento de Imagens do Drive (CRÍTICO ⚠️)
- **NÃO USE** links diretos de thumbnail antigos (`drive.google.com/thumbnail?id=...`). Eles expiram e exigem cookies de terceiros, quebrando no Safari/iOS.
- **USE SEMPRE** o formato: `https://lh3.googleusercontent.com/d/{FILE_ID}=s1000`
  - Isso acessa a CDN pública do Google diretamente.
  - `=s1000` define o tamanho (1000px).
  - Isso resolveu o problema de "imagem quebrada" ou "corrompida".

### 3. Identidade Visual (Univer Mídia)
- **Cores:** Use a paleta definida no `tailwind.config.js`.
  - Fundo: `bg-neutral-950` (Preto quase absoluto).
  - Acentos: `text-univer-red` (#dc2626) e `text-univer-gold` (#fbbf24).
- **Estilo:** O app deve parecer "Premium" e "Eclesiástico". Evite cores neon ou designs muito infantis. Use sombras suaves (`shadow-2xl`) e bordas finas (`border-neutral-800`).

### 4. Funcionalidades Específicas
- **PDFs:** São convertidos para Imagens (JPG) no cliente usando `pdfjs-dist` antes do upload. Não envie o PDF cru se o objetivo for visualização rápida em projetores.
- **Tela Cheia:** Use a implementação robusta que suporta Safari (`webkitRequestFullscreen`) pois o app é muito usado em iPads/iPhones.

### 5. Manutenção de Código
- O projeto usa **Vite + React + TypeScript**.
- Mantenha os imports limpos.
- Ao atualizar o `App.tsx`, verifique se não está removendo funcionalidades críticas como o listener de `paste` (Ctrl+V).
