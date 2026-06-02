import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService, SUPPORTED_LANGUAGES, AppLanguage } from '../../../core/services/language.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  menuOpen = false;
  languages = SUPPORTED_LANGUAGES;
  lang = inject(LanguageService);

  constructor(
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  selectLanguage(code: AppLanguage) {
    this.lang.use(code);
  }

  async logout() {
    await this.auth.signOut();
    this.menuOpen = false;
    this.cdr.detectChanges();
  }
}
