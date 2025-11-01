import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { startWith } from 'rxjs/operators';

import { QuestionComponent } from './components/question/question.component';
import { QuestionResultsComponent } from './components/question-results/question-results.component';
import { LiveFormService } from './core/services/live-form.service';
import type { LiveState } from './core/models/live.model';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ReactiveFormsModule, QuestionComponent, QuestionResultsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnDestroy {

  private readonly liveFormService: LiveFormService = inject(LiveFormService);
  private readonly fb: FormBuilder = new FormBuilder();

  private static requireAccessCode(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const sessionCode = control.get('sessionCode')?.value?.toString().trim();
      const hostSessionCode = control.get('hostSessionCode')?.value?.toString().trim();

      if (sessionCode && hostSessionCode) {
        return { multipleCodes: true };
      }

      if (!sessionCode && !hostSessionCode) {
        return { missingCode: true };
      }

      return null;
    };
  }

  public readonly connectionForm = this.fb.group(
    {
      formId: ['', [Validators.required, Validators.minLength(1)]],
      sessionCode: [''],
      hostSessionCode: ['']
    },
    { validators: AppComponent.requireAccessCode() }
  );

  public readonly vm$ = combineLatest({
    state: this.liveFormService.state$,
    question: this.liveFormService.currentQuestion$,
    results: this.liveFormService.results$
  });

  public readonly error$ = this.liveFormService.error$.pipe(startWith(null));
  public readonly role$ = this.liveFormService.role$;

  public connectionError: string | null = null;
  public isConnecting = false;
  public hasSubmittedAnswer = false;

  private currentQuestionId: string | null = null;
  private readonly questionSubscription: Subscription;
  private pendingJoinMetadata: { participantId?: string; displayName?: string } | null = null;

  constructor() {
    const initializedFromUrl = this.initializeConnectionFromUrl();

    if (!initializedFromUrl) {
      const defaultFormId = environment.defaultFormId?.trim();
      if (defaultFormId) {
        this.connectionForm.patchValue({ formId: defaultFormId });
        void this.connectToForm();
      }
    }

    this.questionSubscription = this.liveFormService.currentQuestion$.subscribe((question) => {
      const newQuestionId = question?.id ?? null;

      if (this.currentQuestionId !== newQuestionId) {
        this.currentQuestionId = newQuestionId;
        this.hasSubmittedAnswer = false;
      }
    });
  }

  public async connectToForm(): Promise<void> {
    this.connectionError = null;

    if (this.connectionForm.invalid) {
      this.connectionForm.markAllAsTouched();

      if (this.connectionForm.get('formId')?.invalid) {
        this.connectionError = 'Veuillez renseigner un identifiant de formulaire.';
      } else if (this.connectionForm.hasError('missingCode')) {
        this.connectionError = 'Veuillez renseigner un code participant ou un code administrateur.';
      } else if (this.connectionForm.hasError('multipleCodes')) {
        this.connectionError = 'Veuillez ne renseigner qu\'un seul code d\'accès.';
      }

      return;
    }

    const { formId, sessionCode, hostSessionCode } = this.connectionForm.getRawValue();
    const trimmedFormId = formId?.trim();
    const trimmedSessionCode = sessionCode?.trim();
    const trimmedHostSessionCode = hostSessionCode?.trim();

    this.isConnecting = true;
    try {
      const joinOptions: {
        sessionCode?: string;
        hostSessionCode?: string;
        participantId?: string;
        displayName?: string;
      } = trimmedHostSessionCode
        ? { hostSessionCode: trimmedHostSessionCode }
        : { sessionCode: trimmedSessionCode };

      if (this.pendingJoinMetadata) {
        if (this.pendingJoinMetadata.participantId) {
          joinOptions.participantId = this.pendingJoinMetadata.participantId;
        }
        if (this.pendingJoinMetadata.displayName) {
          joinOptions.displayName = this.pendingJoinMetadata.displayName;
        }
      }

      await this.liveFormService.joinForm(trimmedFormId ?? '', joinOptions);
      this.pendingJoinMetadata = null;
    } catch (error) {
      this.connectionError = error instanceof Error ? error.message : 'Impossible de rejoindre le formulaire.';
    } finally {
      this.isConnecting = false;
    }
  }

  public onSubmitAnswer(choiceIds: string[]): void {
    if (this.hasSubmittedAnswer || this.liveFormService.roleSnapshot !== 'viewer') {
      return;
    }

    this.liveFormService.submitAnswer(choiceIds);
    this.hasSubmittedAnswer = true;
  }

  public onCloseQuestion(): void {
    this.liveFormService.closeCurrentQuestion();
  }

  public onNextQuestion(): void {
    this.liveFormService.moveToNextQuestion();
  }

  public canCloseQuestion(state: LiveState | null | undefined): boolean {
    if (this.liveFormService.roleSnapshot !== 'admin' || !state) {
      return false;
    }

    return !state.locked || !state.revealResults;
  }

  public canGoToNextQuestion(state: LiveState | null | undefined): boolean {
    if (this.liveFormService.roleSnapshot !== 'admin' || !state) {
      return false;
    }

    return !!state.locked;
  }

  public ngOnDestroy(): void {
    this.questionSubscription.unsubscribe();
    this.liveFormService.disconnect();
  }

  private initializeConnectionFromUrl(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    let url: URL | null = null;
    try {
      url = new URL(window.location.href);
    } catch {
      return false;
    }

    if (!url) {
      return false;
    }

    const searchParams = url.searchParams;
    const formId = searchParams.get('formId')?.trim() || undefined;
    const role = searchParams.get('role')?.trim()?.toLowerCase();
    let sessionCode = searchParams.get('sessionCode')?.trim() || undefined;
    let hostSessionCode = searchParams.get('hostSessionCode')?.trim() || undefined;
    const genericCode = searchParams.get('code')?.trim() || undefined;

    if (genericCode) {
      if (role === 'admin') {
        hostSessionCode = hostSessionCode || genericCode;
      } else {
        sessionCode = sessionCode || genericCode;
      }
    }

    const participantId = searchParams.get('participantId')?.trim() || undefined;
    const displayName = searchParams.get('displayName')?.trim() || undefined;

    const shouldAutoConnect = !!formId && (!!sessionCode || !!hostSessionCode);

    if (!formId && !sessionCode && !hostSessionCode && !participantId && !displayName) {
      return false;
    }

    this.connectionForm.patchValue({
      formId: formId ?? '',
      sessionCode: sessionCode ?? '',
      hostSessionCode: hostSessionCode ?? ''
    });

    if (participantId || displayName) {
      this.pendingJoinMetadata = {
        participantId: participantId || undefined,
        displayName: displayName || undefined
      };
    }

    if (shouldAutoConnect) {
      void this.connectToForm();
    }

    return true;
  }
}

