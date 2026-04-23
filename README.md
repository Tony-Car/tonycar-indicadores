# TonyCar Indicadores

Aplicação de indicadores para acompanhamento e gestão da oficina TonyCar, integrada com o banco de dados PostgreSQL (marts do dbt).

## Funcionalidades

### 📈 Avaliação de Faturamento
- Faturamento YoY (Mensal, Semanal, Diário)
- Faturamento por Tipo de Item (Peças, Serviços, etc)
- Faturamento Mensal Acumulado YoY
- Faturamento por Mecânico (Top 15)

### 💰 Avaliação de Margem
- Margem Bruta YoY (Mensal, Semanal) - Custos disponíveis a partir de 2025/05
- Margem por Tipo de Item
- Produtividade e Margem por Mecânico

### 📋 Detalhamento
- Tabela detalhada com Faturamento, Custo, Lucro e Margem por Área, Grupo, Subgrupo e Item.
- Filtros globais por período, tipo de item, mecânico, área, grupo e subgrupo.

## Tecnologias
- Next.js 15 (App Router)
- Recharts (Gráficos)
- PostgreSQL (Neon Database)
- Auth: Magic Link (Custom implementation)

## Configuração

### Variáveis de Ambiente (.env)
```env
DATABASE_URL=sua_url_do_postgres
JWT_SECRET=seu_segredo_jwt
ALLOWED_EMAILS=email1@exemplo.com,email2@exemplo.com
RESEND_API_KEY=sua_chave_resend (opcional para envio de email)
BASE_URL=http://localhost:3000
```

### Banco de Dados
Execute o script `setup.sql` no seu banco de dados para criar as tabelas de autenticação.

## Desenvolvimento
```bash
npm install
npm run dev
```
