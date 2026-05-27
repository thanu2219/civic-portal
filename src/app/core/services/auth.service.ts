import { Injectable, signal, computed, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { Profile, UserRole } from '../models/types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private profileSignal = signal<Profile | null>(null);
  private loadingSignal = signal(true);
  private recoveryModeSignal = signal(false);

  readonly profile = this.profileSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly isRecoveryMode = this.recoveryModeSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.profileSignal());
  readonly role = computed(() => this.profileSignal()?.role ?? null);
  readonly isAdmin = computed(() => this.profileSignal()?.role === 'admin');
  readonly isDeptAdmin = computed(() => this.profileSignal()?.role === 'dept_admin');
  readonly isStaff = computed(
    () => this.isAdmin() || this.isDeptAdmin()
  );

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private zone: NgZone
  ) {
    this.init();
  }

  private async init() {
    if (!this.supabaseService.isConfigured) {
      console.warn('Supabase not configured — running in demo mode. Update src/environments/environment.ts.');
      this.loadingSignal.set(false);
      return;
    }

    this.loadingSignal.set(true);

    try {
      const { data: { session } } = await this.supabaseService.auth.getSession();
      if (session?.user) {
        await this.ensureProfile(session.user);
      }

      this.supabaseService.auth.onAuthStateChange(async (event, session) => {
        this.zone.run(async () => {
          if (event === 'PASSWORD_RECOVERY') {
            this.recoveryModeSignal.set(true);
            this.router.navigate(['/login']);
          } else if (event === 'SIGNED_IN' && session?.user) {
            await this.ensureProfile(session.user);
          } else if (event === 'SIGNED_OUT') {
            this.profileSignal.set(null);
          }
        });
      });
    } catch (err) {
      console.error('Auth init failed:', err);
    }

    this.loadingSignal.set(false);
  }

  private async ensureProfile(user: { id: string; email?: string; user_metadata?: any }) {
    const { data } = await this.supabaseService.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      this.profileSignal.set(data as Profile);
    } else {
      const { data: newProfile, error } = await this.supabaseService.supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email ?? '',
          full_name: user.user_metadata?.full_name ?? '',
          role: 'citizen',
        })
        .select()
        .single();

      if (!error && newProfile) {
        this.profileSignal.set(newProfile as Profile);
        console.log('Profile created for user:', user.id);
      } else {
        console.error('Failed to create profile:', error);
      }
    }
  }

  async signUp(email: string, password: string, fullName: string) {
    const redirectUrl = `${window.location.origin}/civic-portal/login`;
    const { data, error } = await this.supabaseService.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: redirectUrl,
      },
    });
    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabaseService.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async resetPassword(email: string) {
    const redirectUrl = `${window.location.origin}/civic-portal/login`;
    const { error } = await this.supabaseService.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    if (error) throw error;
  }

  async updatePassword(newPassword: string) {
    const { error } = await this.supabaseService.auth.updateUser({ password: newPassword });
    if (error) throw error;
    this.recoveryModeSignal.set(false);
  }

  async signOut() {
    await this.supabaseService.auth.signOut();
    this.profileSignal.set(null);
    this.router.navigate(['/login']);
  }

  async refreshProfile() {
    const { data: { user } } = await this.supabaseService.auth.getUser();
    if (user) {
      await this.ensureProfile(user);
    }
  }

  hasRole(...roles: UserRole[]): boolean {
    const currentRole = this.role();
    return currentRole !== null && roles.includes(currentRole);
  }
}
