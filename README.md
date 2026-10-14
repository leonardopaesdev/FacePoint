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
