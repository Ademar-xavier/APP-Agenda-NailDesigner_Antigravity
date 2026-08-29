# Como gerar o APK do app no celular (via GitHub Actions)

O projeto já está preparado com [Capacitor](https://capacitorjs.com/), que empacota o mesmo app React dentro de um projeto Android nativo (pasta `android/`). Um workflow do GitHub Actions (`.github/workflows/android-build.yml`) já está configurado para compilar esse projeto automaticamente na nuvem e gerar o arquivo `.apk`, sem precisar instalar Android Studio no seu computador.

## 1. Criar o repositório no GitHub

1. Acesse [github.com/new](https://github.com/new) e crie um repositório (pode ser privado).
2. Não marque a opção de criar README/gitignore — o projeto já tem os seus.

## 2. Enviar o projeto para o GitHub

Abra um terminal (PowerShell ou Prompt de Comando) **dentro da pasta do projeto** (`nail-agenda`, dentro da pasta "Claude" que você selecionou) e rode:

```bash
git init
git add .
git commit -m "Primeira versão do app"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

Troque `SEU_USUARIO/SEU_REPOSITORIO` pelo endereço real do repositório que você criou.

## 3. Acompanhar a geração do APK

1. No GitHub, abra a aba **Actions** do repositório.
2. Você verá o workflow **"Build Android APK"** rodando automaticamente após o push (leva de 3 a 6 minutos).
3. Quando terminar com o ícone verde ✅, clique no run finalizado.
4. Role até a seção **Artifacts** e baixe **sheila-santos-nails-designer-apk** (um `.zip` contendo o `app-debug.apk`).

Se quiser gerar o APK sem fazer um novo push, vá em **Actions → Build Android APK → Run workflow** para disparar manualmente.

## 4. Instalar o APK no celular Android

1. Extraia o `app-debug.apk` do `.zip` baixado e envie para o celular (WhatsApp, e-mail, Google Drive, cabo USB etc.).
2. No celular, abra o arquivo `.apk`. O Android vai pedir permissão para instalar de "fontes desconhecidas" — confirme (é normal para apps fora da Play Store).
3. Pronto — o app "Sheila Santos Nails Designer" aparecerá na tela inicial com o ícone da marca (monograma SS + borboleta).

## Sobre este APK

- É um **APK de debug**: perfeito para uso pessoal, testes e instalação direta no celular, mas assinado com uma chave de desenvolvimento (não a de produção).
- Para publicar na **Google Play Store**, seria necessário gerar um APK/AAB assinado com uma chave de release própria — um passo adicional que envolve criar e guardar um keystore. Posso preparar isso depois, se você decidir publicar oficialmente.
- iPhone (iOS) não é possível gerar dessa forma: a Apple exige compilação em um Mac com Xcode e uma conta de desenvolvedor paga. O caminho do Android via GitHub Actions funciona sem custo e sem hardware específico.

## Atualizando o app depois

Sempre que você (ou eu) alterar o código, basta repetir o passo 2 (`git add .`, `git commit`, `git push`) — o GitHub gera um novo APK automaticamente a cada push na branch `main`.
