import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthService } from '../../../core/services/auth.service';
import { Profile, Department, UserRole } from '../../../core/models/types';

@Component({
  selector: 'app-user-manage',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, SlicePipe],
  templateUrl: './user-manage.component.html',
  styleUrl: './user-manage.component.scss',
})
export class UserManageComponent implements OnInit {
  users: Profile[] = [];
  departments: Department[] = [];
  loading = true;
  roles: UserRole[] = ['citizen', 'dept_admin', 'admin'];

  activeUser: Profile | null = null;
  selectedRole: UserRole = 'citizen';
  selectedDept = '';
  actionLoading = false;

  constructor(
    private userService: UserService,
    private departmentService: DepartmentService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      this.users = await this.userService.getUsers();
      this.departments = await this.departmentService.getDepartments();
    } catch (err) {
      console.error('Failed to load users:', err);
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  openRoleModal(user: Profile) {
    this.activeUser = user;
    this.selectedRole = user.role;
    this.selectedDept = '';
  }

  closeModal() {
    this.activeUser = null;
  }

  async saveRole() {
    if (!this.activeUser) return;
    this.actionLoading = true;

    try {
      await this.userService.updateRole(this.activeUser.id, this.selectedRole);

      if (this.selectedRole === 'dept_admin' && this.selectedDept) {
        await this.departmentService.assignStaff(this.activeUser.id, this.selectedDept);
      }

      this.closeModal();
      await this.load();
    } catch (err) {
      console.error('Role update failed:', err);
    }

    this.actionLoading = false;
    this.cdr.detectChanges();
  }
}
