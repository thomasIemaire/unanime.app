import { Component, EventEmitter, Input, Output } from "@angular/core";
import { QuestionChoice } from "../../core/models/question.model";

@Component({
    selector: "app-choice",
    imports: [],
    template: `
    <div class="choice__container" 
        (click)="this.selected.emit(this.choice);"
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
    public isSelected: boolean = false;

    @Input()
    public index: number = 0;

    @Output()
    public selected: EventEmitter<QuestionChoice> = new EventEmitter<QuestionChoice>();
}