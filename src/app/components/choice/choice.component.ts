import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { QuestionChoice } from "../../core/models/question.model";

@Component({
    selector: "app-choice",
    imports: [CommonModule],
    template: `
    <div class="choice__container"
        (click)="onClick()"
        [class.disabled]="disabled"
        [style.animationDelay]="(index * 0.1) + 's'">
        <div class="choice__wrapper" [class.selected]="isSelected">
            <span class="choice__text">{{ choice.text }}</span>

            <ng-container *ngIf="isSelected">
                <input
                    *ngIf="choice.input === 'text'"
                    class="choice__input"
                    type="text"
                    [value]="value"
                    [attr.minlength]="choice.constraints?.minLength ?? null"
                    [attr.maxlength]="choice.constraints?.maxLength ?? null"
                    (click)="$event.stopPropagation()"
                    (input)="onValueInput($event)"
                    [disabled]="disabled"
                />

                <input
                    *ngIf="choice.input === 'number'"
                    class="choice__input"
                    type="number"
                    [value]="value"
                    [attr.min]="choice.constraints?.minValue ?? null"
                    [attr.max]="choice.constraints?.maxValue ?? null"
                    (click)="$event.stopPropagation()"
                    (input)="onValueInput($event)"
                    [disabled]="disabled"
                />
            </ng-container>
        </div>
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
        if (this.disabled) {
            return;
        }

        this.selected.emit(this.choice);
    }

    public onValueInput(event: Event): void {
        const target = event.target as HTMLInputElement | null;
        this.valueChange.emit(target?.value ?? "");
    }
}
