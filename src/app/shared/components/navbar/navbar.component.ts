import { Component, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  menuOpen = false;

  constructor(
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  async logout() {
    await this.auth.signOut();
    this.menuOpen = false;
    this.cdr.detectChanges();
  }
}
