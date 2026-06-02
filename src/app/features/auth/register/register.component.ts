import { Component, ChangeDetectorRef, NgZone, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  loading = false;
  error = '';
  success = '';
  registered = false;

  private translate = inject(TranslateService);

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  private t(key: string): string {
    return this.translate.instant(key);
  }

  async onSubmit() {
    this.error = '';
    this.success = '';

    if (!this.fullName || !this.email || !this.password) {
      this.error = this.t('auth.register.errors.fillFields');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = this.t('auth.register.errors.mismatch');
      return;
    }

    if (this.password.length < 6) {
      this.error = this.t('auth.register.errors.shortPassword');
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    try {
      const result = await this.auth.signUp(this.email, this.password, this.fullName);

      this.zone.run(() => {
        if (result.user?.identities?.length === 0) {
          this.error = this.t('auth.register.errors.duplicate');
        } else if (result.session) {
          this.router.navigate(['/']);
        } else {
          this.registered = true;
          this.success = this.t('auth.register.successMessage');
        }
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (err: any) {
      this.zone.run(() => {
        this.error = err.message || this.t('auth.register.errors.failed');
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }
}
