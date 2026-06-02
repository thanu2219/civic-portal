import { Component, ChangeDetectorRef, NgZone, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestService } from '../../../core/services/request.service';
import { CATEGORY_LABELS, RequestCategory } from '../../../core/models/types';

@Component({
  selector: 'app-create-request',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './create-request.component.html',
  styleUrl: './create-request.component.scss',
})
export class CreateRequestComponent {
  title = '';
  description = '';
  category: RequestCategory | '' = '';
  location = '';
  photos: File[] = [];
  previewUrls: string[] = [];
  loading = false;
  error = '';

  categories = Object.entries(CATEGORY_LABELS) as [RequestCategory, string][];
  private translate = inject(TranslateService);

  constructor(
    private requestService: RequestService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  private t(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const newFiles = Array.from(input.files);
    if (this.photos.length + newFiles.length > 5) {
      this.error = this.t('request.create.errors.tooManyPhotos');
      return;
    }

    for (const file of newFiles) {
      if (file.size > 5 * 1024 * 1024) {
        this.error = this.t('request.create.errors.photoTooLarge', { name: file.name });
        return;
      }
    }

    this.error = '';
    this.photos.push(...newFiles);

    for (const file of newFiles) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.zone.run(() => {
          this.previewUrls.push(e.target?.result as string);
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(index: number) {
    this.photos.splice(index, 1);
    this.previewUrls.splice(index, 1);
  }

  async onSubmit() {
    if (!this.title || !this.description || !this.category || !this.location.trim()) {
      this.error = this.t('request.create.errors.fillRequired');
      return;
    }

    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      await this.requestService.createRequest(
        this.title,
        this.description,
        this.category as RequestCategory,
        this.location.trim(),
        this.photos
      );
      this.zone.run(() => {
        this.router.navigate(['/requests']);
      });
    } catch (err: any) {
      console.error('Request submission failed:', err);
      this.zone.run(() => {
        this.error = err.message || err.error_description || this.t('request.create.errors.submitFailed');
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }
}
