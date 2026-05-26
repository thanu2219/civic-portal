import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
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

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  async onSubmit() {
    this.error = '';
    this.success = '';

    if (!this.fullName || !this.email || !this.password) {
      this.error = 'Please fill in all fields.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }

    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters.';
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    try {
      const result = await this.auth.signUp(this.email, this.password, this.fullName);

      this.zone.run(() => {
        if (result.user?.identities?.length === 0) {
          this.error = 'An account with this email already exists.';
        } else if (result.session) {
          this.router.navigate(['/']);
        } else {
          this.registered = true;
          this.success = 'Account created successfully! Please check your email for a confirmation link. After confirming, you can sign in.';
        }
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (err: any) {
      this.zone.run(() => {
        this.error = err.message || 'Registration failed. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }
}
