import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(
    private auth: AuthService,
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
}
