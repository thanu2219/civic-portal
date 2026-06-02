import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideTranslateService({
      // Default language is Kannada; the LanguageService applies a
      // localStorage-stored preference at bootstrap if present.
      lang: 'kn',
      fallbackLang: 'en',
    }),
    provideTranslateHttpLoader({
      prefix: 'i18n/',
      suffix: '.json',
    }),
  ],
};
