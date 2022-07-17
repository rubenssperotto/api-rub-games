import AuthLogo from './extensions/logo-won.svg';
import MenuLogo from './extensions/logo-won-menu.svg';
import favicon from './extensions/favicon.png';

export default {
    config: {
      theme: {
        colors: {
          primary100: '#00B482',
          primary200: '#00B462',
          primary500: '#00B442',
          primary600: '#00B422',
          primary700: '#009422',
          danger700: '#999422'
        },
      },
      notifications: { release: false },
      auth: {
        logo: AuthLogo,
      },
      head: {
        favicon: favicon,
      },
      menu: {
        logo: MenuLogo,
      },
      tutorials: false,
      locales: ['fr', 'pt-BR'],
      translations: {
        en: {
          "app.components.LeftMenu.navbrand.title": " ",
          "app.components.LeftMenu.navbrand.workplace": " ",
          "app.components.HomePage.welcome.again": "Bem Vindo!",
          "app.components.HomePage.welcome": "Bem vindo a página inicial.",
          "app.components.HomePage.welcomeBlock.content.again": "Bem vindo a página inicial.",
          "app.components.HomePage.welcomeBlock.content": "Você está logado como administrador principal.",
          "app.components.HomePage.button.blog": " ",
        },
      },
    },
    bootstrap() {},
  };