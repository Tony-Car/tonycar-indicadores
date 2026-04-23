const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

async function setup() {
  // Ler .env.local manualmente
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
  
  if (!dbUrlLine) {
    console.error("Erro: DATABASE_URL não encontrada no .env.local");
    process.exit(1);
  }

  const url = dbUrlLine.split('=')[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  const sql = neon(url);
  const setupScript = fs.readFileSync('setup.sql', 'utf8');

  console.log("Executando setup.sql...");
  try {
    const commands = setupScript
      .split(';')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    for (const cmd of commands) {
      console.log(`Executando: ${cmd.substring(0, 50)}...`);
      await sql.query(cmd);
    }
    console.log("✅ Banco de dados configurado com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao configurar banco:", err.message);
  }
}

setup();
