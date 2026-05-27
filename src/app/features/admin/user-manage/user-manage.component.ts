import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthService } from '../../../core/services/auth.service';
import { Profile, Department, UserRole, CATEGORY_LABELS, RequestCategory } from '../../../core/models/types';

interface UserWithDept extends Profile {
  departmentName?: string;
  departmentId?: string;
}

@Component({
  selector: 'app-user-manage',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, SlicePipe],
  templateUrl: './user-manage.component.html',
  styleUrl: './user-manage.component.scss',
})
export class UserManageComponent implements OnInit {
  admins: UserWithDept[] = [];
  deptAdmins: UserWithDept[] = [];
  citizens: UserWithDept[] = [];
  departments: Department[] = [];
  loading = true;
  roles: UserRole[] = ['citizen', 'dept_admin', 'admin'];
  roleLabels: Record<UserRole, string> = {
    citizen: 'Citizen',
    dept_admin: 'Department Admin',
    admin: 'Admin',
  };
  categoryList = Object.entries(CATEGORY_LABELS) as [RequestCategory, string][];

  activeUser: UserWithDept | null = null;
  selectedRole: UserRole = 'citizen';
  selectedDept = '';
  actionLoading = false;
  actionError = '';

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
      const users = await this.userService.getUsers();
      this.departments = await this.departmentService.getDepartments();

      const { data: staffData } = await this.departmentService.getAllStaff();
      const staffMap = new Map<string, string>();
      for (const s of staffData ?? []) {
        staffMap.set(s.user_id, s.department_id);
      }

      const deptMap = new Map<string, string>();
      for (const d of this.departments) {
        deptMap.set(d.id, d.name);
      }

      const enriched: UserWithDept[] = users.map(u => {
        const deptId = staffMap.get(u.id);
        return {
          ...u,
          departmentId: deptId,
          departmentName: deptId ? deptMap.get(deptId) : undefined,
        };
      });

      this.admins = enriched.filter(u => u.role === 'admin');
      this.deptAdmins = enriched.filter(u => u.role === 'dept_admin');
      this.citizens = enriched.filter(u => u.role === 'citizen');
    } catch (err) {
      console.error('Failed to load users:', err);
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  openRoleModal(user: UserWithDept) {
    this.activeUser = user;
    this.selectedRole = user.role;
    this.selectedDept = user.departmentId ?? '';
    this.actionError = '';
  }

  closeModal() {
    this.activeUser = null;
  }

  getDeptIdBySlug(slug: string): string {
    return this.departments.find(d => d.slug === slug)?.id ?? '';
  }

  async saveRole() {
    if (!this.activeUser) return;
    this.actionError = '';

    if (this.selectedRole === 'dept_admin' && !this.selectedDept) {
      this.actionError = 'Please select a department for dept admin.';
      return;
    }

    this.actionLoading = true;

    try {
      await this.userService.updateRole(this.activeUser.id, this.selectedRole);

      if (this.selectedRole === 'dept_admin' && this.selectedDept) {
        await this.departmentService.assignStaff(this.activeUser.id, this.selectedDept);
      }

      this.closeModal();
      await this.load();
    } catch (err: any) {
      console.error('Role update failed:', err);
      this.actionError = err.message || 'Failed to update role.';
    }

    this.actionLoading = false;
    this.cdr.detectChanges();
  }
}
