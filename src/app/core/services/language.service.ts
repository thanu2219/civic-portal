import { Injectable, signal, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'kn' | 'en';

export const SUPPORTED_LANGUAGES: { code: AppLanguage; label: string; nativeLabel: string }[] = [
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
];

const STORAGE_KEY = 'civic-portal.lang';
const DEFAULT_LANG: AppLanguage = 'kn';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);
  readonly current = signal<AppLanguage>(DEFAULT_LANG);

  init(): void {
    const stored = (typeof localStorage !== 'undefined'
      ? (localStorage.getItem(STORAGE_KEY) as AppLanguage | null)
      : null);
    const lang: AppLanguage =
      stored && SUPPORTED_LANGUAGES.some(l => l.code === stored) ? stored : DEFAULT_LANG;
    this.use(lang);
  }

  use(lang: AppLanguage): void {
    this.current.set(lang);
    this.translate.use(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }

  toggle(): void {
    this.use(this.current() === 'kn' ? 'en' : 'kn');
  }
}
