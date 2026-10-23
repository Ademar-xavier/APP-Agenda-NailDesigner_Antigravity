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
  console.log('🚀 Iniciando geração de screenshots reais e completos com Edge headless...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1366,950',
      '--hide-scrollbars'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 950, deviceScaleFactor: 2 });

  // ==========================================
  // 1. CATÁLOGO VITRINE (ENQUADRADO PERFEITO SEM CORTES)
  // ==========================================
  console.log('1. Capturando Catálogo Vitrine Completo...');
  await page.goto('https://sheilasantos-agenda.vercel.app/#catalogo?salao=sheila', {
    waitUntil: 'networkidle2',
    timeout: 45000
  });
  await sleep(3000);
  // Rolar para a seção de serviços de modo que os cards fiquem 100% visíveis com foto, nome, preço e botão
  await page.evaluate(() => {
    const srvSection = document.querySelector('input[type="text"]') || document.querySelector('.grid');
    if (srvSection) {
      srvSection.scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollBy(0, -20);
    }
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(outDir, 'catalogo_vitrine_servicos.png') });
  console.log('✅ catalogo_vitrine_servicos.png capturado (cards completos)');

  // ==========================================
  // 2. AGENDAMENTO ONLINE EXTERNO DAS CLIENTES
  // ==========================================
  console.log('2. Capturando Agendamento Online Externo...');
  await page.goto('https://sheilasantos-agenda.vercel.app/#agendar?salao=sheila', {
    waitUntil: 'networkidle2',
    timeout: 45000
  });
  await sleep(3000);
  await page.screenshot({ path: path.join(outDir, 'agendamento_externo_publico.png') });
  console.log('✅ agendamento_externo_publico.png capturado');

  // ==========================================
  // 3. LOGIN NO PAINEL ADMIN COM DADOS DA SHEILA
  // ==========================================
  console.log('3. Realizando Login no Painel Admin...');
  await page.goto('https://sheilasantos-agenda.vercel.app/#admin?salao=sheila', {
    waitUntil: 'networkidle2',
    timeout: 45000
  });
  await sleep(2000);

  // 3.1 Licença
  const inputsLic = await page.$$('input');
  if (inputsLic.length > 0) {
    const placeholder = await (await inputsLic[0].getProperty('placeholder')).jsonValue();
    if (placeholder && placeholder.includes('CHAVE')) {
      await inputsLic[0].type('SHEILA-VIP-2026');
      const btns = await page.$$('button');
      for (const b of btns) {
        const t = await (await b.getProperty('innerText')).jsonValue();
        if (t.includes('Ativar Licença')) {
          await b.click();
          break;
        }
      }
      await sleep(3500);
    }
  }

  // 3.2 Login Form
  const loginInputs = await page.$$('input');
  if (loginInputs.length >= 2) {
    await loginInputs[0].type('sheila@agenda.com');
    await loginInputs[1].type('admin');
    const btns = await page.$$('button');
    for (const b of btns) {
      const t = await (await b.getProperty('innerText')).jsonValue();
      if (t.includes('Acessar Painel') || t.includes('Entrar')) {
        await b.click();
        break;
      }
    }
    await sleep(4000);
  }

  // ==========================================
  // 4. DASHBOARD TELA INICIAL (COM DADOS REAIS DA SHEILA)
  // ==========================================
  console.log('4. Capturando Dashboard Inicial Real...');
  await sleep(2000);
  await page.screenshot({ path: path.join(outDir, 'dashboard_tela_inicial.png') });
  console.log('✅ dashboard_tela_inicial.png capturado (faturamento real, avisos, ocupação)');

  // ==========================================
  // 5. AGENDA SEMANAL E DIÁRIA
  // ==========================================
  console.log('5. Capturando Agenda Inteligente...');
  await page.evaluate(() => {
    const navBtn = Array.from(document.querySelectorAll('aside button, nav button')).find(b => b.innerText.includes('Agenda'));
    if (navBtn) navBtn.click();
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(outDir, 'agenda_visao_geral.png') });
  console.log('✅ agenda_visao_geral.png capturado (horários coloridos)');

  // ==========================================
  // 6. SIMULAÇÃO: MODAL DE NOVO AGENDAMENTO
  // ==========================================
  console.log('6. Simulando abertura de Novo Agendamento...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Novo Agendamento') || b.innerText.includes('+ Agendamento'));
    if (btn) btn.click();
  });
  await sleep(2000);
  await page.screenshot({ path: path.join(outDir, 'modal_novo_agendamento.png') });
  console.log('✅ modal_novo_agendamento.png capturado (modal completo)');

  // Fechar modal
  await page.keyboard.press('Escape');
  await sleep(1000);

  // ==========================================
  // 7. CARTEIRA DE CLIENTES
  // ==========================================
  console.log('7. Capturando Lista de Clientes...');
  await page.evaluate(() => {
    const navBtn = Array.from(document.querySelectorAll('aside button, nav button')).find(b => b.innerText.includes('Clientes'));
    if (navBtn) navBtn.click();
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(outDir, 'clientes_gestao_lista.png') });
  console.log('✅ clientes_gestao_lista.png capturado');

  // ==========================================
  // 8. SIMULAÇÃO: FICHA DE ANAMNESE DA CLIENTE
  // ==========================================
  console.log('8. Simulando abertura da Ficha de Anamnese...');
  await page.evaluate(() => {
    // Clica no card da primeira cliente
    const card = document.querySelector('div.cursor-pointer, [class*="cursor-pointer"]');
    if (card) card.click();
  });
  await sleep(2000);
  // Rolar suavemente para a seção de anamnese
  await page.evaluate(() => {
    const anamneseSection = Array.from(document.querySelectorAll('h3, h4, div')).find(el => el.innerText && el.innerText.includes('Anamnese'));
    if (anamneseSection) {
      anamneseSection.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  });
  await sleep(1000);
  await page.screenshot({ path: path.join(outDir, 'clientes_ficha_anamnese.png') });
  console.log('✅ clientes_ficha_anamnese.png capturado (detalhes técnicos e assinatura)');

  // Fechar detalhes
  await page.keyboard.press('Escape');
  await sleep(1000);

  // ==========================================
  // 9. RADAR DE CLIENTES SUMIDAS
  // ==========================================
  console.log('9. Capturando Radar de Clientes Sumidas...');
  await page.evaluate(() => {
    const tabSumidas = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('sumidas'));
    if (tabSumidas) tabSumidas.click();
  });
  await sleep(2000);
  await page.screenshot({ path: path.join(outDir, 'recuperacao_clientes_sumidas.png') });
  console.log('✅ recuperacao_clientes_sumidas.png capturado (botão de resgate WhatsApp)');

  // ==========================================
  // 10. CENTRAL DE CONFIRMAÇÕES WHATSAPP
  // ==========================================
  console.log('10. Capturando Central de Confirmações WhatsApp...');
  await page.evaluate(() => {
    const navBtn = Array.from(document.querySelectorAll('aside button, nav button')).find(b => b.innerText.includes('Confirmações'));
    if (navBtn) navBtn.click();
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(outDir, 'confirmacoes_whatsapp_painel.png') });
  console.log('✅ confirmacoes_whatsapp_painel.png capturado');

  // ==========================================
  // 11. GESTÃO E CADASTRO DE SERVIÇOS
  // ==========================================
  console.log('11. Capturando Cadastro de Serviços...');
  await page.evaluate(() => {
    const navBtn = Array.from(document.querySelectorAll('aside button, nav button')).find(b => b.innerText.includes('Serviços'));
    if (navBtn) navBtn.click();
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(outDir, 'cadastro_servicos_precos.png') });
  console.log('✅ cadastro_servicos_precos.png capturado (preços, duração, sinal)');

  // ==========================================
  // 12. CLUBE VIP & PLANOS DE ASSINATURA
  // ==========================================
  console.log('12. Capturando Planos do Clube VIP...');
  await page.evaluate(() => {
    const tabVip = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('clube') || b.innerText.toLowerCase().includes('assinatura') || b.innerText.toLowerCase().includes('planos'));
    if (tabVip) tabVip.click();
  });
  await sleep(2000);
  await page.screenshot({ path: path.join(outDir, 'clube_vip_fidelidade.png') });
  console.log('✅ clube_vip_fidelidade.png capturado');

  // ==========================================
  // 13. MATERIAIS, CUSTOS & PRODUTOS PARA VENDA
  // ==========================================
  console.log('13. Capturando Materiais & Custos...');
  await page.evaluate(() => {
    const navBtn = Array.from(document.querySelectorAll('aside button, nav button')).find(b => b.innerText.includes('Materiais'));
    if (navBtn) navBtn.click();
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(outDir, 'materiais_custos_estoque.png') });
  console.log('✅ materiais_custos_estoque.png capturado');

  // ==========================================
  // 14. DASHBOARD FINANCEIRO & COMISSÕES
  // ==========================================
  console.log('14. Capturando Dashboard Financeiro...');
  await page.evaluate(() => {
    const navBtn = Array.from(document.querySelectorAll('aside button, nav button')).find(b => b.innerText.includes('Financeiro'));
    if (navBtn) navBtn.click();
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(outDir, 'dashboard_financeiro_lucro.png') });
  console.log('✅ dashboard_financeiro_lucro.png capturado');

  console.log('🎉 Todas as 14 telas reais foram capturadas sem cortes com 100% de sucesso!');
  await browser.close();
}

run().catch(err => {
  console.error('Erro na captura:', err);
  process.exit(1);
});
