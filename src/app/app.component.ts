import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { combineLatest } from 'rxjs';
import { startWith } from 'rxjs/operators';

import { QuestionComponent } from './components/question/question.component';
import { QuestionResultsComponent } from './components/question-results/question-results.component';
import { LiveFormService } from './core/services/live-form.service';
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

  public readonly connectionForm = this.fb.group({
    formId: ['', [Validators.required, Validators.minLength(1)]],
    sessionCode: [''],
    participantId: ['']
  });

  public readonly vm$ = combineLatest({
    state: this.liveFormService.state$,
    question: this.liveFormService.currentQuestion$,
    results: this.liveFormService.results$
  });

  public readonly error$ = this.liveFormService.error$.pipe(startWith(null));

  public connectionError: string | null = null;
  public isConnecting = false;

  constructor() {
    const defaultFormId = environment.defaultFormId?.trim();
    if (defaultFormId) {
      this.connectionForm.patchValue({ formId: defaultFormId });
      void this.connectToForm();
    }
  }

  public async connectToForm(): Promise<void> {
    this.connectionError = null;

    if (this.connectionForm.invalid) {
      this.connectionForm.markAllAsTouched();
      return;
    }

    const { formId, sessionCode, participantId } = this.connectionForm.getRawValue();

    if (!formId) {
      this.connectionError = 'Veuillez renseigner un identifiant de formulaire.';
      return;
    }

    this.isConnecting = true;
    try {
      await this.liveFormService.joinForm(formId, {
        sessionCode: sessionCode?.trim() || undefined,
        participantId: participantId?.trim() || undefined
      });
    } catch (error) {
      this.connectionError = error instanceof Error ? error.message : 'Impossible de rejoindre le formulaire.';
    } finally {
      this.isConnecting = false;
    }
  }

  public onSubmitAnswer(choiceIds: string[]): void {
    this.liveFormService.submitAnswer(choiceIds);
  }

  public ngOnDestroy(): void {
    this.liveFormService.disconnect();
  }
}
function inject<T>(token: new (...args: any[]) => T): T {
  return new token();
}

