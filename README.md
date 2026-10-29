# FacePoint

MVP de registro de ponto com reconhecimento facial, baseado no protótipo do Figma e nos requisitos da atividade avaliativa.

## Tecnologias

- React + TypeScript + Vite
- FastAPI + SQLite
- DeepFace com o modelo `Facenet512`

## Como executar

### Backend

Requer Python 3.12.

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

Na primeira comparação facial, o DeepFace poderá baixar os pesos do modelo. A saúde da API pode ser consultada em `http://localhost:8000/api/health`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`. O navegador solicitará acesso à câmera.

### Acesso pelo celular (mesma rede)

O Vite já sobe exposto na rede (`host: true` no `vite.config.ts`) e as chamadas de API são relativas (`/api`), encaminhadas por um proxy embutido para o backend — o celular só precisa da porta 5173.

Como navegadores só liberam a câmera em contexto seguro, use o modo mobile, que sobe HTTPS com certificado autoassinado (`@vitejs/plugin-basic-ssl`):

```powershell
$env:BACKEND_ORIGIN = "http://localhost:8001"; npm run dev:mobile
```

```bash
BACKEND_ORIGIN=http://localhost:8001 npm run dev:mobile
```

No celular (conectado ao mesmo Wi-Fi), abra `https://SEU_IP:5173`, aceite o aviso de certificado (Avançados → Prosseguir) e permita o acesso à câmera. No desktop, o endereço passa a ser `https://localhost:5173`, também com aviso de certificado. Para o fluxo local em HTTP simples, use `npm run dev`. Se o backend não estiver na porta 8000, informe `BACKEND_ORIGIN` como acima.

Se o Wi-Fi bloquear a comunicação entre dispositivos (comum em redes institucionais com isolamento de clientes), exponha o app por um túnel público:

```bash
cloudflared tunnel --url http://localhost:5173
```

O comando imprime uma URL `https://*.trycloudflare.com` com certificado válido — acesse-a de qualquer celular, sem aviso de certificado. A URL muda a cada execução do túnel.

## Testes

```powershell
cd backend
python -m pytest
```

```powershell
cd frontend
npm run lint
npm run build
```

## Limites do MVP

O fluxo usa reconhecimento facial real, mas ainda não possui autenticação administrativa, criptografia específica dos arquivos biométricos nem prova de vida. Esses itens são obrigatórios antes de qualquer uso real com funcionários.
