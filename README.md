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
- Auth: Senha de Acesso (JWT + Cookies)

## Configuração

### Variáveis de Ambiente (.env.local)
```env
# URL de conexão do seu banco (ex: Neon ou Postgres local)
DATABASE_URL=sua_url_do_postgres

# Segredo para o JWT (gere um aleatório)
JWT_SECRET=seu_segredo_jwt

# Senha de acesso ao painel
APP_PASSWORD=sua_senha_de_acesso_aqui

# URL base (usado para redirecionamentos se necessário)
BASE_URL=http://localhost:3000
```

### Banco de Dados
Execute o script `setup.sql` no seu banco de dados para criar as tabelas de autenticação.

## Desenvolvimento
```bash
npm install
npm run dev
```
