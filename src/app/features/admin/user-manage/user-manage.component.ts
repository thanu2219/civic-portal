import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthService } from '../../../core/services/auth.service';
import { Profile, Department, UserRole } from '../../../core/models/types';

interface UserWithDept extends Profile {
  departmentName?: string;
  departmentId?: string;
}

type TabKey = 'admin' | 'dept_admin' | 'citizen';

@Component({
  selector: 'app-user-manage',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive],
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

  activeTab: TabKey = 'admin';
  searchAdmin = '';
  searchDeptAdmin = '';
  searchCitizen = '';

  activeUser: UserWithDept | null = null;
  editFullName = '';
  selectedRole: UserRole = 'citizen';
  selectedDept = '';
  actionLoading = false;
  actionError = '';

  deleteTarget: UserWithDept | null = null;
  deleteLoading = false;

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

  setTab(tab: TabKey) {
    this.activeTab = tab;
  }

  private filter(list: UserWithDept[], term: string): UserWithDept[] {
    const t = term.trim().toLowerCase();
    if (!t) return list;
    return list.filter(u =>
      (u.full_name || '').toLowerCase().includes(t) ||
      (u.email || '').toLowerCase().includes(t) ||
      (u.departmentName || '').toLowerCase().includes(t)
    );
  }

  get filteredAdmins() {
    return this.filter(this.admins, this.searchAdmin);
  }
  get filteredDeptAdmins() {
    return this.filter(this.deptAdmins, this.searchDeptAdmin);
  }
  get filteredCitizens() {
    return this.filter(this.citizens, this.searchCitizen);
  }

  openEditModal(user: UserWithDept) {
    this.activeUser = user;
    this.editFullName = user.full_name || '';
    this.selectedRole = user.role;
    this.selectedDept = user.departmentId ?? '';
    this.actionError = '';
  }

  closeModal() {
    this.activeUser = null;
    this.actionError = '';
  }

  async saveUser() {
    if (!this.activeUser) return;
    this.actionError = '';

    if (this.selectedRole === 'dept_admin' && !this.selectedDept) {
      this.actionError = 'Please select a department for dept admin.';
      return;
    }

    this.actionLoading = true;

    try {
      const userId = this.activeUser.id;
      const trimmedName = this.editFullName.trim();

      if (trimmedName !== (this.activeUser.full_name || '')) {
        await this.userService.updateProfile(userId, { full_name: trimmedName });
      }

      if (this.selectedRole !== this.activeUser.role) {
        await this.userService.updateRole(userId, this.selectedRole);
      }

      if (this.selectedRole === 'dept_admin') {
        if (this.selectedDept && this.selectedDept !== this.activeUser.departmentId) {
          await this.departmentService.assignStaff(userId, this.selectedDept);
        }
      } else {
        if (this.activeUser.departmentId) {
          await this.departmentService.removeAllStaffForUser(userId);
        }
      }

      this.closeModal();
      await this.load();
    } catch (err: any) {
      console.error('Save user failed:', err);
      this.actionError = err.message || 'Failed to save user.';
    }

    this.actionLoading = false;
    this.cdr.detectChanges();
  }

  openDeleteConfirm(user: UserWithDept) {
    this.deleteTarget = user;
  }

  closeDeleteConfirm() {
    this.deleteTarget = null;
  }

  async confirmDelete() {
    if (!this.deleteTarget) return;
    this.deleteLoading = true;

    try {
      const userId = this.deleteTarget.id;
      if (this.deleteTarget.departmentId) {
        await this.departmentService.removeAllStaffForUser(userId);
      }
      await this.userService.deleteUser(userId);
      this.deleteTarget = null;
      await this.load();
    } catch (err: any) {
      console.error('Delete user failed:', err);
      alert(err.message || 'Failed to delete user.');
    }

    this.deleteLoading = false;
    this.cdr.detectChanges();
  }
}
