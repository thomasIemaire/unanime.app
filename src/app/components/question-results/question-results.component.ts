import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexPlotOptions,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule
} from 'ng-apexcharts';

import type { Question } from '../../core/models/question.model';
import type { QuestionAggregates } from '../../core/models/live.model';

type ApexOptions = {
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  fill: ApexFill;
  tooltip: ApexTooltip;
};

@Component({
  selector: 'app-question-results',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './question-results.component.html',
  styleUrls: ['./question-results.component.scss']
})
export class QuestionResultsComponent implements OnChanges {
  @Input() public question: Question | null = null;
  @Input() public results: QuestionAggregates | null = null;
  @Input() public visible = false;
  @Input() public showPendingMessage = true;

  public chartSeries: ApexAxisChartSeries = [];
  public chartOptions: Partial<ApexOptions> = {};
  public hasData = false;
  public totalResponses = 0;

  public ngOnChanges(_: SimpleChanges): void {
    this.refreshChart();
  }

  private refreshChart(): void {
    const question = this.question;
    const results = this.results;

    if (!question || !results) {
      this.chartSeries = [];
      this.chartOptions = {};
      this.totalResponses = 0;
      this.hasData = false;
      return;
    }

    const counts = new Map<string, number>();
    for (const entry of results.totals) {
      counts.set(entry.choiceId, entry.count ?? 0);
    }

    const categories: string[] = [];
    const data: number[] = [];

    for (const choice of question.choices) {
      categories.push(choice.text ?? choice.id);
      data.push(counts.get(choice.id) ?? 0);
    }

    this.totalResponses = Number.isFinite(results.totalResponses)
      ? results.totalResponses
      : data.reduce((sum, value) => sum + value, 0);

    this.chartSeries = [
      {
        name: 'Réponses',
        data
      }
    ];

    this.chartOptions = {
      chart: {
        type: 'bar',
        height: 320,
        animations: { enabled: true }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          distributed: true,
          borderRadius: 6,
          dataLabels: {
            position: 'right'
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (value: number) => Math.round(value).toString(),
        offsetX: 8
      },
      xaxis: {
        categories,
        labels: {
          style: {
            fontSize: '12px'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '12px'
          }
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 0.35,
          inverseColors: false,
          opacityFrom: 0.9,
          opacityTo: 0.9
        }
      },
      tooltip: {
        enabled: true,
        y: {
          formatter: (value: number) => `${value} réponse${value > 1 ? 's' : ''}`
        }
      }
    };

    this.hasData = data.some((value) => value > 0);
  }
}
