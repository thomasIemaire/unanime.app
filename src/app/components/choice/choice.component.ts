import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { QuestionChoice } from "../../core/models/question.model";

@Component({
    selector: "app-choice",
    imports: [CommonModule],
    template: `
    <div class="choice__container"
        [class.disabled]="disabled"
        [class.choice__container--input]="choice.input === 'text'"
        [style.animationDelay]="(index * 0.1) + 's'">
        <ng-container [ngSwitch]="choice.input">
            <div *ngSwitchCase="'text'" class="choice__input-wrapper">
                <input
                    class="choice__input"
                    type="text"
                    [value]="value"
                    [attr.placeholder]="choice.text"
                    [attr.minlength]="choice.constraints?.minLength ?? null"
                    [attr.maxlength]="choice.constraints?.maxLength ?? null"
                    (input)="onValueInput($event)"
                    [disabled]="disabled"
                />
            </div>

            <div *ngSwitchCase="'number'"
                class="choice__wrapper"
                [class.selected]="isSelected"
                (click)="onClick()">
                <label class="choice__text choice__text--with-input">
                    <span class="choice__label">{{ choice.text }}</span>
                    <input
                        *ngIf="isSelected"
                        class="choice__input"
                        type="number"
                        [value]="value"
                        [attr.min]="choice.constraints?.minValue ?? null"
                        [attr.max]="choice.constraints?.maxValue ?? null"
                        (click)="$event.stopPropagation()"
                        (input)="onValueInput($event)"
                        [disabled]="disabled"
                    />
                </label>
            </div>

            <div *ngSwitchDefault
                class="choice__wrapper"
                [class.selected]="isSelected"
                (click)="onClick()">
                <span class="choice__text">{{ choice.text }}</span>
            </div>
        </ng-container>
    </div>
    `,
    styleUrls: ["./choice.component.scss"]
})
export class ChoiceComponent {
    @Input({ required: true })
    public choice!: QuestionChoice;

    @Input({ required: true })
    public isSelected = false;

    @Input()
    public value = "";

    @Input()
    public index = 0;

    @Input()
    public disabled = false;

    @Output()
    public selected: EventEmitter<QuestionChoice> = new EventEmitter<QuestionChoice>();

    @Output()
    public valueChange: EventEmitter<string> = new EventEmitter<string>();

    public onClick(): void {
        if (this.disabled || this.choice.input === "text") {
            return;
        }

        this.selected.emit(this.choice);
    }

    public onValueInput(event: Event): void {
        const target = event.target as HTMLInputElement | null;
        this.valueChange.emit(target?.value ?? "");
    }
}
