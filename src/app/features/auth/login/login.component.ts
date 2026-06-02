import { Component, ChangeDetectorRef, NgZone, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  email = '';
  password = '';
  newPassword = '';
  confirmNewPassword = '';
  loading = false;
  error = '';
  resetMode = false;
  resetSuccess = '';

  private translate = inject(TranslateService);

  constructor(
    public auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  private t(key: string): string {
    return this.translate.instant(key);
  }

  async onSubmit() {
    if (!this.email || !this.password) {
      this.error = this.t('auth.login.errors.fillFields');
      return;
    }

    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      await this.auth.signIn(this.email, this.password);
      this.zone.run(() => {
        this.router.navigate(['/']);
      });
    } catch (err: any) {
      this.zone.run(() => {
        this.error = err.message || this.t('auth.login.errors.signInFailed');
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async onResetPassword() {
    if (!this.email) {
      this.error = this.t('auth.reset.errors.missingEmail');
      return;
    }

    this.loading = true;
    this.error = '';
    this.resetSuccess = '';
    this.cdr.detectChanges();

    try {
      await this.auth.resetPassword(this.email);
      this.zone.run(() => {
        this.resetSuccess = this.t('auth.reset.linkSent');
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (err: any) {
      this.zone.run(() => {
        this.error = err.message || this.t('auth.reset.errors.sendFailed');
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async onUpdatePassword() {
    if (!this.newPassword || !this.confirmNewPassword) {
      this.error = this.t('auth.reset.errors.missingPasswords');
      return;
    }
    if (this.newPassword.length < 6) {
      this.error = this.t('auth.reset.errors.shortPassword');
      return;
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.error = this.t('auth.reset.errors.mismatch');
      return;
    }

    this.loading = true;
    this.error = '';
    this.resetSuccess = '';
    this.cdr.detectChanges();

    try {
      await this.auth.updatePassword(this.newPassword);
      this.zone.run(() => {
        this.resetSuccess = this.t('auth.reset.updatedSuccess');
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (err: any) {
      this.zone.run(() => {
        this.error = err.message || this.t('auth.reset.errors.updateFailed');
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  toggleResetMode() {
    this.resetMode = !this.resetMode;
    this.error = '';
    this.resetSuccess = '';
  }
}
