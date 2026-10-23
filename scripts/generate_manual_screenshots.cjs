const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outDir = path.join(__dirname, '..', 'public', 'manual-images');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('Iniciando captura de telas reais com Edge headless...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,900',
      '--hide-scrollbars'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

  // 1. CAPTURA: CATÁLOGO ONLINE PÚBLICO
  console.log('1. Capturando Catálogo Vitrine...');
  await page.goto('https://sheilasantos-agenda.vercel.app/#catalogo?salao=sheila', {
    waitUntil: 'networkidle2',
    timeout: 45000
  });
  await sleep(3500);
  await page.screenshot({ path: path.join(outDir, 'catalogo_vitrine_servicos.png') });
  console.log('✅ catalogo_vitrine_servicos.png gerado');

  // 2. CAPTURA: AGENDAMENTO ONLINE EXTERNO DA CLIENTE
  console.log('2. Capturando Agendamento Online Externo...');
  await page.goto('https://sheilasantos-agenda.vercel.app/#agendar?salao=sheila', {
    waitUntil: 'networkidle2',
    timeout: 45000
  });
  await sleep(3500);
  await page.screenshot({ path: path.join(outDir, 'agendamento_externo_publico.png') });
  console.log('✅ agendamento_externo_publico.png gerado');

  // 3. ENTRAR NO PAINEL ADMINISTRATIVO
  console.log('3. Acessando Painel Admin...');
  await page.goto('https://sheilasantos-agenda.vercel.app/#admin?salao=sheila', {
    waitUntil: 'networkidle2',
    timeout: 45000
  });
  await sleep(2500);

  // Verificar se precisa de licença
  const textInputs = await page.$$('input[type="text"]');
  if (textInputs.length > 0) {
    console.log('Ativando licença SHEILA-VIP-2026...');
    await textInputs[0].type('SHEILA-VIP-2026');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Ativar Licença'));
      if (btn) btn.click();
    });
    await sleep(4000);
  }

  // Verificar se tela de Login de Usuário (PIN / Seleção) está presente
  const hasUserSelect = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, div')).some(el => el.innerText && el.innerText.includes('Sheila Santos'));
  });

  if (hasUserSelect) {
    console.log('Selecionando usuária Sheila Santos...');
    await page.evaluate(() => {
      const userBtn = Array.from(document.querySelectorAll('button, div')).find(el => 
        el.innerText && el.innerText.includes('Sheila Santos') && el.tagName === 'BUTTON'
      );
      if (userBtn) userBtn.click();
    });
    await sleep(1500);

    // Se pedir PIN/Senha
    const pinInputs = await page.$$('input[type="password"]');
    if (pinInputs.length > 0) {
      console.log('Digitando senha padrão...');
      await pinInputs[0].type('1234');
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Entrar'));
        if (btn) btn.click();
      });
      await sleep(3500);
    }
  }

  // 4. CAPTURA: DASHBOARD TELA INICIAL
  console.log('4. Capturando Dashboard Inicial...');
  await sleep(3000);
  await page.screenshot({ path: path.join(outDir, 'dashboard_tela_inicial.png') });
  console.log('✅ dashboard_tela_inicial.png gerado');

  // 5. CAPTURA: AGENDA DIÁRIA E SEMANAL
  console.log('5. Capturando Agenda...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.includes('Agenda'));
    if (btn) btn.click();
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(outDir, 'agenda_visao_geral.png') });
  console.log('✅ agenda_visao_geral.png gerado');

  // 6. SIMULAÇÃO: MODAL DE NOVO AGENDAMENTO
  console.log('6. Simulando abertura de Novo Agendamento...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(el => el.innerText.includes('Novo Agendamento') || el.innerText.includes('Agendar'));
    if (btn) btn.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(outDir, 'modal_novo_agendamento.png') });
  console.log('✅ modal_novo_agendamento.png gerado');

  // Fechar modal
  await page.keyboard.press('Escape');
  await sleep(1000);

  // 7. CAPTURA: CLIENTES - LISTA COMPLETA
  console.log('7. Capturando Lista de Clientes...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.includes('Clientes'));
    if (btn) btn.click();
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(outDir, 'clientes_gestao_lista.png') });
  console.log('✅ clientes_gestao_lista.png gerado');

  // 8. SIMULAÇÃO: FICHA DE ANAMNESE E DETALHES DA CLIENTE
  console.log('8. Simulando abertura de Ficha e Anamnese da Cliente...');
  await page.evaluate(() => {
    // Clica no primeiro card de cliente
    const card = document.querySelector('div[class*="cursor-pointer"]');
    if (card) card.click();
  });
  await sleep(2000);
  await page.screenshot({ path: path.join(outDir, 'clientes_ficha_anamnese.png') });
  console.log('✅ clientes_ficha_anamnese.png gerado');

  // Fechar detalhes do cliente
  await page.keyboard.press('Escape');
  await sleep(1000);

  // 8.1 CAPTURA: CLIENTES SUMIDAS & RECUPERAÇÃO NO WHATSAPP
  console.log('8.1 Capturando Módulo de Clientes Sumidas...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(el => el.innerText.toLowerCase().includes('sumidas'));
    if (btn) btn.click();
  });
  await sleep(2000);
  await page.screenshot({ path: path.join(outDir, 'recuperacao_clientes_sumidas.png') });
  console.log('✅ recuperacao_clientes_sumidas.png gerado');

  // 9. CAPTURA: CONFIRMAÇÕES DE WHATSAPP
  console.log('9. Capturando Central de Confirmações de WhatsApp...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.includes('Confirmações'));
    if (btn) btn.click();
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(outDir, 'confirmacoes_whatsapp_painel.png') });
  console.log('✅ confirmacoes_whatsapp_painel.png gerado');

  // 10. CAPTURA: GESTÃO E CADASTRO DE SERVIÇOS
  console.log('10. Capturando Gestão de Serviços...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.includes('Serviços'));
    if (btn) btn.click();
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(outDir, 'cadastro_servicos_precos.png') });
  console.log('✅ cadastro_servicos_precos.png gerado');

  // 11. CAPTURA: MATERIAIS, CUSTOS E PRODUTOS PARA VENDA
  console.log('11. Capturando Materiais, Custos e Produtos...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.includes('Materiais'));
    if (btn) btn.click();
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(outDir, 'materiais_custos_estoque.png') });
  console.log('✅ materiais_custos_estoque.png gerado');

  // 12. CAPTURA: DASHBOARD FINANCEIRO & FATURAMENTO
  console.log('12. Capturando Dashboard Financeiro...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.includes('Financeiro'));
    if (btn) btn.click();
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(outDir, 'dashboard_financeiro_lucro.png') });
  console.log('✅ dashboard_financeiro_lucro.png gerado');

  console.log('Todas as capturas de tela foram concluídas com sucesso!');
  await browser.close();
}

run().catch(err => {
  console.error('Erro na geração de screenshots:', err);
  process.exit(1);
});
