import { Component, EventEmitter, Input, Output } from "@angular/core";
import { QuestionChoice } from "../../core/models/question.model";

@Component({
    selector: "app-choice",
    imports: [],
    template: `
    <div class="choice__container"
        (click)="onClick()"
        [class.disabled]="disabled"
        [style.animationDelay]="(index * 0.1) + 's'">
        <div class="choice__wrapper" [class.selected]="isSelected">
            <span class="choice__text">{{ choice.text }}</span>
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
    public index = 0;

    @Input()
    public disabled = false;

    @Output()
    public selected: EventEmitter<QuestionChoice> = new EventEmitter<QuestionChoice>();

    public onClick(): void {
        if (this.disabled) {
            return;
        }

        this.selected.emit(this.choice);
    }
}
