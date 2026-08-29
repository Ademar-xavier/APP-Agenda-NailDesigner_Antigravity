# Guia: Como Pagar e Acompanhar o Build do APK (Android) e EXE (Windows) no GitHub

Configuramos o projeto para compilar as duas versões automaticamente usando o **GitHub Actions**. Isso significa que você não precisa instalar nenhuma ferramenta complexa (como Android Studio ou compiladores C++) no seu computador local. O GitHub fará todo o trabalho pesado na nuvem a cada alteração que você enviar!

---

## Passo 1: Enviar as Atualizações para o seu Repositório

Abra o terminal (PowerShell ou Prompt de Comando) na pasta raiz do seu projeto e execute os seguintes comandos para sincronizar e enviar os novos arquivos para o repositório `Ademar-xavier/APP-Agenda-NailDesigner_Antigravity`:

```bash
# Se o repositório git local já estiver configurado:
git add .
git commit -m "feat: login, equipe, financeiro e build configurados"
git push origin main
```

*(Se você receber algum erro de permissão ou remote não configurado, rode o comando abaixo para garantir o vínculo correto):*
```bash
git remote set-url origin https://github.com/Ademar-xavier/APP-Agenda-NailDesigner_Antigravity.git
```

---

## Passo 2: Acompanhar o Build das Aplicações

1. Acesse o seu repositório no navegador: [github.com/Ademar-xavier/APP-Agenda-NailDesigner_Antigravity](https://github.com/Ademar-xavier/APP-Agenda-NailDesigner_Antigravity).
2. Clique na aba **Actions** (no menu superior).
3. Você verá o workflow **"Build Mobile and Desktop Apps"** rodando.
4. O GitHub Actions iniciará dois trabalhos paralelos:
   * **Build Android APK:** Demora cerca de 4 a 6 minutos e gera o pacote `.apk` para celulares Android.
   * **Build Windows Desktop:** Demora cerca de 3 a 5 minutos e gera um executável portátil (`.exe`) para Windows.

---

## Passo 3: Baixar e Executar as Aplicações

1. Assim que os trabalhos terminarem (ficarão com um check verde ✅), clique no nome do commit correspondente.
2. Role a página até o fim na seção **Artifacts** (Artefatos).
3. Você verá dois links disponíveis para download:
   * `sheila-santos-nails-designer-apk`: Arquivo `.zip` contendo o `app-debug.apk` para instalar diretamente no seu celular Android.
   * `sheila-santos-nails-designer-windows`: Arquivo `.zip` contendo o executável **Sheila Santos Nails Designer 0.1.0.exe** para Windows.
4. **No Celular Android:** Transfira o arquivo `.apk`, abra-o e autorize a instalação de fontes desconhecidas para testar.
5. **No Computador Windows:** Extraia o arquivo `.exe` e clique duas vezes para executá-lo diretamente (não requer instalação, ele abre imediatamente!).
