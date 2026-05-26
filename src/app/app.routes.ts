import { Routes } from '@angular/router';
import { authGuard, adminGuard, staffGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: 'requests',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/requests/request-list/request-list.component').then(
        (m) => m.RequestListComponent
      ),
  },
  {
    path: 'requests/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/requests/create-request/create-request.component'
      ).then((m) => m.CreateRequestComponent),
  },
  {
    path: 'requests/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/requests/request-detail/request-detail.component'
      ).then((m) => m.RequestDetailComponent),
  },
  {
    path: 'news',
    loadComponent: () =>
      import('./features/news/news-list/news-list.component').then(
        (m) => m.NewsListComponent
      ),
  },
  {
    path: 'news/:id',
    loadComponent: () =>
      import('./features/news/news-detail/news-detail.component').then(
        (m) => m.NewsDetailComponent
      ),
  },
  {
    path: 'admin',
    canActivate: [staffGuard],
    loadComponent: () =>
      import(
        './features/admin/dashboard/admin-dashboard.component'
      ).then((m) => m.AdminDashboardComponent),
  },
  {
    path: 'admin/requests',
    canActivate: [staffGuard],
    loadComponent: () =>
      import(
        './features/admin/request-queue/request-queue.component'
      ).then((m) => m.RequestQueueComponent),
  },
  {
    path: 'admin/news',
    canActivate: [adminGuard],
    loadComponent: () =>
      import(
        './features/admin/news-manage/news-manage.component'
      ).then((m) => m.NewsManageComponent),
  },
  {
    path: 'admin/users',
    canActivate: [adminGuard],
    loadComponent: () =>
      import(
        './features/admin/user-manage/user-manage.component'
      ).then((m) => m.UserManageComponent),
  },
  { path: '**', redirectTo: '' },
];
