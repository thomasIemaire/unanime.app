import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { ChoiceComponent } from "../choice/choice.component";
import { Question, QuestionChoice } from "../../core/models/question.model";

@Component({
    selector: "app-question",
    imports: [CommonModule, ChoiceComponent],
    template: `
    <div class="question__container">
        <div class="question__wrapper">

            <div class="question-title__container">
                <div class="question-title__wrapper">
                    <span class="question-title__label">{{ question.question }}</span>
                    <span class="question-title__description" *ngIf="question.description">{{ question.description }}</span>
                </div>
            </div>

            <div class="question-choices__container" *ngIf="showChoices">
                <div class="question-choices__wrapper">
                    <app-choice
                        *ngFor="let choice of question.choices; let i = index; trackBy: trackChoice"
                        [choice]="choice"
                        [index]="i"
                        [isSelected]="isChoiceSelected(choice)"
                        [disabled]="locked"
                        (selected)="onChoiceSelected(choice)"
                    ></app-choice>
                </div>
            </div>

            <div class="question-send__container" *ngIf="showSubmitButton">
                <div class="question-send__wrapper">
                    <button
                        type="button"
                        class="question-send__button"
                        (click)="onSubmit()"
                        [disabled]="isSubmitDisabled">
                        Envoyer ma réponse
                    </button>
                </div>
            </div>
        </div>
    </div>
    `,
    styleUrls: ["./question.component.scss"]
})
export class QuestionComponent implements OnChanges {
    @Input({ required: true })
    public question!: Question;

    @Input()
    public locked = false;

    @Input()
    public showSubmitButton = true;

    @Input()
    public showChoices = true;

    @Output()
    public submitAnswer: EventEmitter<string[]> = new EventEmitter<string[]>();

    private readonly selectedChoiceIds = new Set<string>();

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes["question"]) {
            this.selectedChoiceIds.clear();
        }
    }

    public onChoiceSelected(choice: QuestionChoice): void {
        if (this.locked) {
            return;
        }

        if (this.question.allowMultiple) {
            this.toggleChoiceSelection(choice.id);
        } else {
            if (this.selectedChoiceIds.has(choice.id)) {
                this.selectedChoiceIds.clear();
            } else {
                this.selectedChoiceIds.clear();
                this.selectedChoiceIds.add(choice.id);
            }
        }
    }

    public onSubmit(): void {
        if (this.isSubmitDisabled) {
            return;
        }

        this.submitAnswer.emit(Array.from(this.selectedChoiceIds));
    }

    public isChoiceSelected(choice: QuestionChoice): boolean {
        return this.selectedChoiceIds.has(choice.id);
    }

    public get isSubmitDisabled(): boolean {
        return this.locked || this.selectedChoiceIds.size === 0;
    }

    public trackChoice(index: number, choice: QuestionChoice): string {
        return choice.id ?? String(index);
    }

    private toggleChoiceSelection(choiceId: string): void {
        if (this.selectedChoiceIds.has(choiceId)) {
            this.selectedChoiceIds.delete(choiceId);
        } else {
            this.selectedChoiceIds.add(choiceId);
        }
    }
}
