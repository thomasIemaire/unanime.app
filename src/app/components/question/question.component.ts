import { Component, Input } from "@angular/core";
import { Question, QuestionChoice } from "../../core/models/question.model";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ChoiceComponent } from "../choice/choice.component";

@Component({
    selector: "app-question",
    imports: [CommonModule, FormsModule, ChoiceComponent],
    template: `
    <div class="question__container">
        <div class="question__wrapper">

            <div class="question-title__container">
                <div class="question-title__wrapper">
                    <span class="question-title__label">{{ question.question }}</span>
                    <span class="question-title__description">{{ question.description }}</span>
                </div>
            </div>

            <div class="question-choices__container">
                <div class="question-choices__wrapper">
                    <app-choice 
                        *ngFor="let choice of question.choices; let i = index" 
                        [choice]="choice" 
                        [index]="i"
                        [isSelected]="answers.includes(choice)"
                        (selected)="onChoiceSelected(choice)"
                    ></app-choice>
                </div>
            </div>

            <div class="question-send__container">
                <div class="question-send__wrapper" *ngIf="answers.length > 0">
                    <div class="question-send__button">
                        Envoyer ma réponse
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    styleUrls: ['./question.component.scss']
})
export class QuestionComponent {
    @Input({ required: true })
    public question!: Question;

    public answers: QuestionChoice[] = [];

    public onChoiceSelected(choice: QuestionChoice): void {
        if (this.question.allowMultiple) this.toggleChoiceSelection(choice);
        else this.answers = this.answers[0] === choice ? [] : [choice];
    }

    private toggleChoiceSelection(choice: QuestionChoice): void {
        const index = this.answers.indexOf(choice);
        if (index > -1) this.answers.splice(index, 1);
        else this.answers.push(choice);
    }
}