# Código Completo do Backend (Google Apps Script)

Os erros que você está vendo (`getFolder is not defined` e o erro de `CORS`) acontecem porque o código anterior era apenas um trecho e faltavam as funções auxiliares, ou o script quebrou e retornou uma página de erro HTML (o que causa o erro de CORS no navegador).

Para resolver tudo de uma vez, **apague tudo** que está no seu Google Apps Script e **cole o código completo abaixo**:

```javascript
// ==============================================================================
// BACKEND DO UNIVER MÍDIA - GOOGLE APPS SCRIPT
// ==============================================================================

// Função auxiliar para pegar ou criar a pasta raiz "UniverMidia"
function getRootFolder() {
  const folders = DriveApp.getFoldersByName("UniverMidia");
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder("UniverMidia");
  }
}

// Função auxiliar para pegar ou criar subpastas (Eventos)
function getOrCreateFolder(folderName) {
  const root = getRootFolder();
  const folders = root.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return root.createFolder(folderName);
  }
}

// Lida com requisições GET (Buscar arquivos)
function doGet(e) {
  try {
    const root = getRootFolder();
    const filesList = [];
    
    // Percorre as subpastas (Eventos)
    const subFolders = root.getFolders();
    while (subFolders.hasNext()) {
      const folder = subFolders.next();
      const folderName = folder.getName();
      const files = folder.getFiles();
      
      while (files.hasNext()) {
        const file = files.next();
        if (!file.isTrashed()) {
          filesList.push({
            id: file.getId(),
            name: file.getName(),
            mimeType: file.getMimeType(),
            downloadUrl: file.getDownloadUrl(),
            date: file.getDateCreated().toISOString(),
            folderName: folderName
          });
        }
      }
    }
    
    // Arquivos na raiz da pasta UniverMidia
    const rootFiles = root.getFiles();
    while (rootFiles.hasNext()) {
      const file = rootFiles.next();
      if (!file.isTrashed()) {
        filesList.push({
          id: file.getId(),
          name: file.getName(),
          mimeType: file.getMimeType(),
          downloadUrl: file.getDownloadUrl(),
          date: file.getDateCreated().toISOString(),
          folderName: "Geral"
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      files: filesList
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Lida com requisições POST (Upload, Delete, Rename, GetText)
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'upload') {
      const folderName = data.eventName || "Geral";
      const folder = getOrCreateFolder(folderName);
      
      const contentType = data.mimeType || 'application/octet-stream';
      const blob = Utilities.newBlob(Utilities.base64Decode(data.bytes), contentType, data.filename);
      const file = folder.createFile(blob);
      
      // Permissões públicas para evitar CORS/Auth issues no download direto
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        fileId: file.getId(),
        url: file.getUrl(),
        downloadUrl: file.getDownloadUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    else if (action === 'delete') {
      const file = DriveApp.getFileById(data.id);
      file.setTrashed(true);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === 'rename') {
       const file = DriveApp.getFileById(data.id);
       file.setName(data.newName);
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === 'getText') {
      const file = DriveApp.getFileById(data.id);
      const mimeType = file.getMimeType();
      
      if (mimeType === 'text/plain' || mimeType === 'application/json' || mimeType === 'text/html' || mimeType === 'text/csv') {
        const content = file.getBlob().getDataAsString();
        return ContentService.createTextOutput(JSON.stringify({
          status: 'success',
          content: content
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          message: 'Arquivo não é de texto.'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Ação desconhecida' })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Lida com preflight requests (CORS)
function doOptions(e) {
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}
```

### Passos para atualizar:
1. Cole o código acima no seu projeto do Google Apps Script.
2. Clique em **Salvar** (ícone de disquete).
3. Clique em **Implantar** > **Nova implantação** (NÃO use "Gerenciar implantações" para editar, crie uma NOVA).
4. Selecione o tipo **App da Web**.
5. Em "Executar como", selecione **"Eu"**.
6. Em "Quem pode acessar", selecione **"Qualquer pessoa"**.
7. Clique em **Implantar**.
8. **Copie a nova URL gerada** e atualize a constante `API_URL` no arquivo `services/churchService.ts` se ela for diferente da atual.
