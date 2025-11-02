import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

import type { Question } from '../../core/models/question.model';
import type { QuestionAggregates } from '../../core/models/live.model';

type ChoiceResult = {
  id: string;
  label: string;
  count: number;
  percentage: number;
};

@Component({
  selector: 'app-question-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './question-results.component.html',
  styleUrls: ['./question-results.component.scss']
})
export class QuestionResultsComponent implements OnChanges {
  @Input() public question: Question | null = null;
  @Input() public results: QuestionAggregates | null = null;
  @Input() public visible = false;
  @Input() public showPendingMessage = true;

  public hasData = false;
  public totalResponses = 0;
  public isTextQuestion = false;
  public textResponses: Array<{ text: string; count: number }> = [];
  public choiceResults: ChoiceResult[] = [];

  public ngOnChanges(_: SimpleChanges): void {
    this.refreshResults();
  }

  private refreshResults(): void {
    const question = this.question;
    const results = this.results;

    if (!question || !results) {
      this.totalResponses = 0;
      this.hasData = false;
      this.isTextQuestion = false;
      this.textResponses = [];
      this.choiceResults = [];
      return;
    }

    this.isTextQuestion = question.choices.some((choice) => choice.input === 'text');

    const responses = Array.isArray(results.texts) ? results.texts : [];
    if (this.isTextQuestion) {
      const textResponsesMap = new Map<string, number>();
      for (const response of responses) {
        const trimmed = response.trim();
        if (trimmed !== '') {
          textResponsesMap.set(trimmed, (textResponsesMap.get(trimmed) ?? 0) + 1);
        }
      }

      this.textResponses = Array.from(textResponsesMap.entries())
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.text.localeCompare(b.text);
        });
    } else {
      this.textResponses = [];
    }

    const counts = new Map<string, number>();
    for (const entry of results.totals) {
      counts.set(entry.choiceId, entry.count ?? 0);
    }

    const data: number[] = [];

    for (const choice of question.choices) {
      data.push(counts.get(choice.id) ?? 0);
    }

    const computedTotal = data.reduce((sum, value) => sum + value, 0);
    this.totalResponses = Number.isFinite(results.totalResponses)
      ? results.totalResponses
      : this.isTextQuestion
        ? responses.length
        : computedTotal;

    if (this.isTextQuestion) {
      this.hasData = this.textResponses.length > 0;
      this.choiceResults = [];
      return;
    }

    this.choiceResults = question.choices.map((choice) => {
      const count = counts.get(choice.id) ?? 0;
      const percentage = this.totalResponses > 0 ? (count / this.totalResponses) * 100 : 0;

      return {
        id: choice.id,
        label: choice.text ?? choice.id,
        count,
        percentage
      };
    });

    this.hasData = this.choiceResults.length > 0;
  }

  public trackTextResponse(_index: number, response: { text: string; count: number }): string {
    return `${response.text}-${response.count}`;
  }

  public trackChoiceResult(_index: number, result: ChoiceResult): string {
    return `${result.id}-${result.count}`;
  }
}
