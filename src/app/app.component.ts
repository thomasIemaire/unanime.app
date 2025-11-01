import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { QuestionComponent } from "./components/question/question.component";
import { exampleQuestion, Question } from './core/models/question.model';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, QuestionComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  public question: Question = exampleQuestion;
}
