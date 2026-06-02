import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
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

  constructor(
    public auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  async onSubmit() {
    if (!this.email || !this.password) {
      this.error = 'Please fill in all fields.';
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
        this.error = err.message || 'Sign in failed. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async onResetPassword() {
    if (!this.email) {
      this.error = 'Please enter your email address above.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.resetSuccess = '';
    this.cdr.detectChanges();

    try {
      await this.auth.resetPassword(this.email);
      this.zone.run(() => {
        this.resetSuccess = 'Password reset link sent! Check your email.';
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (err: any) {
      this.zone.run(() => {
        this.error = err.message || 'Failed to send reset email. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async onUpdatePassword() {
    if (!this.newPassword || !this.confirmNewPassword) {
      this.error = 'Please fill in both password fields.';
      return;
    }
    if (this.newPassword.length < 6) {
      this.error = 'Password must be at least 6 characters.';
      return;
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.resetSuccess = '';
    this.cdr.detectChanges();

    try {
      await this.auth.updatePassword(this.newPassword);
      this.zone.run(() => {
        this.resetSuccess = 'Password updated successfully! You can now sign in.';
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (err: any) {
      this.zone.run(() => {
        this.error = err.message || 'Failed to update password. Please try again.';
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
