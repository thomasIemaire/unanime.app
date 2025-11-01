import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { ChoiceComponent } from "../choice/choice.component";
import { Question, QuestionAnswerSelection, QuestionChoice } from "../../core/models/question.model";

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
                        [value]="getChoiceValue(choice)"
                        [disabled]="locked"
                        (selected)="onChoiceSelected($event)"
                        (valueChange)="onChoiceValueChange(choice, $event)"
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
    public submitAnswer: EventEmitter<QuestionAnswerSelection> = new EventEmitter<QuestionAnswerSelection>();

    private readonly selectedChoiceIds = new Set<string>();
    private readonly choiceValues = new Map<string, string>();

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes["question"]) {
            this.selectedChoiceIds.clear();
            this.choiceValues.clear();
        }
    }

    public onChoiceSelected(choice: QuestionChoice): void {
        if (this.locked) {
            return;
        }

        const isSelected = this.selectedChoiceIds.has(choice.id);

        if (this.question.allowMultiple) {
            if (isSelected) {
                this.selectedChoiceIds.delete(choice.id);
                this.choiceValues.delete(choice.id);
            } else {
                this.selectedChoiceIds.add(choice.id);
            }
        } else {
            if (isSelected) {
                this.selectedChoiceIds.clear();
                this.choiceValues.clear();
            } else {
                this.selectedChoiceIds.clear();
                this.choiceValues.clear();
                this.selectedChoiceIds.add(choice.id);
            }
        }
    }

    public onChoiceValueChange(choice: QuestionChoice, value: string): void {
        if (this.locked) {
            return;
        }

        if (!this.question.allowMultiple) {
            const alreadySelected = this.selectedChoiceIds.has(choice.id);
            if (!alreadySelected) {
                this.selectedChoiceIds.clear();
                this.choiceValues.clear();
            }
        }

        this.selectedChoiceIds.add(choice.id);

        if (value === "") {
            this.choiceValues.delete(choice.id);
        } else {
            this.choiceValues.set(choice.id, value);
        }
    }

    public onSubmit(): void {
        if (this.isSubmitDisabled) {
            return;
        }

        const payload: QuestionAnswerSelection = {
            choiceIds: this.buildSubmittedChoiceIds()
        };

        const textValue = this.getFirstValueByType("text");
        if (textValue !== undefined) {
            payload.text = textValue;
        }

        const numberValue = this.getFirstNumberValue();
        if (numberValue !== undefined) {
            payload.number = numberValue;
        }

        this.submitAnswer.emit(payload);
    }

    public isChoiceSelected(choice: QuestionChoice): boolean {
        return this.selectedChoiceIds.has(choice.id);
    }

    public getChoiceValue(choice: QuestionChoice): string {
        return this.choiceValues.get(choice.id) ?? "";
    }

    public get isSubmitDisabled(): boolean {
        if (this.locked) {
            return true;
        }

        if (this.selectedChoiceIds.size === 0) {
            return true;
        }

        for (const choiceId of this.selectedChoiceIds) {
            const choice = this.question.choices.find((item) => item.id === choiceId);
            if (!choice) {
                continue;
            }

            if (choice.input === "text") {
                const value = this.choiceValues.get(choiceId) ?? "";
                const length = value.trim().length;
                const constraints = choice.constraints;

                if (length === 0) {
                    return true;
                }

                if (constraints?.minLength !== undefined && length < constraints.minLength) {
                    return true;
                }

                if (constraints?.maxLength !== undefined && length > constraints.maxLength) {
                    return true;
                }
            }

            if (choice.input === "number") {
                const raw = this.choiceValues.get(choiceId);
                if (raw === undefined || raw.trim() === "") {
                    return true;
                }

                const parsed = Number(raw.trim());
                if (Number.isNaN(parsed)) {
                    return true;
                }

                const constraints = choice.constraints;
                if (constraints?.minValue !== undefined && parsed < constraints.minValue) {
                    return true;
                }

                if (constraints?.maxValue !== undefined && parsed > constraints.maxValue) {
                    return true;
                }
            }
        }

        return false;
    }

    public trackChoice(index: number, choice: QuestionChoice): string {
        return choice.id ?? String(index);
    }

    private getFirstValueByType(inputType: "text" | "number"): string | undefined {
        for (const choiceId of this.selectedChoiceIds) {
            const choice = this.question.choices.find((item) => item.id === choiceId);
            if (!choice) {
                continue;
            }

            if (choice.input === inputType) {
                const value = this.choiceValues.get(choiceId);
                if (value !== undefined) {
                    const trimmedValue = value.trim();
                    if (trimmedValue !== "") {
                        return trimmedValue;
                    }
                }
            }
        }

        return undefined;
    }

    private getFirstNumberValue(): number | undefined {
        const raw = this.getFirstValueByType("number");
        if (raw === undefined) {
            return undefined;
        }

        const parsed = Number(raw);
        return Number.isNaN(parsed) ? undefined : parsed;
    }

    private buildSubmittedChoiceIds(): string[] {
        const ids: string[] = [];

        for (const choiceId of this.selectedChoiceIds) {
            const choice = this.question.choices.find((item) => item.id === choiceId);
            if (!choice) {
                continue;
            }

            if (choice.input === "text") {
                const value = this.choiceValues.get(choiceId)?.trim();
                if (value) {
                    ids.push(value);
                    continue;
                }
            }

            ids.push(choiceId);
        }

        return ids;
    }
}
