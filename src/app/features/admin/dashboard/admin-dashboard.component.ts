import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  stats = { total: 0, pending: 0, inProgress: 0, completed: 0 };

  constructor(
    private requestService: RequestService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.load();
  }

  async load() {
    try {
      this.stats = await this.requestService.getStats();
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
    this.cdr.detectChanges();
  }
}
