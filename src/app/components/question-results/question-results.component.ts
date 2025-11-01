import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule
} from 'ng-apexcharts';

import type { Question } from '../../core/models/question.model';
import type { QuestionAggregates } from '../../core/models/live.model';

type ApexOptions = {
  chart?: ApexChart;
  plotOptions?: ApexPlotOptions;
  dataLabels?: ApexDataLabels;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis;
  fill?: ApexFill;
  tooltip?: ApexTooltip;
  labels?: string[];
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

  public chartSeries: ApexAxisChartSeries | ApexNonAxisChartSeries = [];
  public chartOptions: Partial<ApexOptions> = {};
  public hasData = false;
  public totalResponses = 0;
  public isTextQuestion = false;
  public textResponses: Array<{ text: string; count: number }> = [];

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
      this.isTextQuestion = false;
      this.textResponses = [];
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

    const categories: string[] = [];
    const data: number[] = [];

    for (const choice of question.choices) {
      categories.push(choice.text ?? choice.id);
      data.push(counts.get(choice.id) ?? 0);
    }

    const computedTotal = data.reduce((sum, value) => sum + value, 0);
    this.totalResponses = Number.isFinite(results.totalResponses)
      ? results.totalResponses
      : this.isTextQuestion
      ? responses.length
      : computedTotal;

    if (this.isTextQuestion) {
      this.chartSeries = [];
      this.chartOptions = {};
      this.hasData = this.textResponses.length > 0;
      return;
    }

    const statisticsType = question.reveal?.statistics?.statisticsType ?? 'bar_chart';

    switch (statisticsType) {
      case 'pie_chart': {
        this.chartSeries = data;
        this.chartOptions = {
          chart: {
            type: 'pie',
            height: 320,
            animations: { enabled: true }
          },
          labels: categories,
          dataLabels: {
            enabled: true,
            formatter: (
              _value: number,
              opts: { seriesIndex?: number; w?: { globals?: { series?: number[] } } }
            ) => {
              const seriesIndex = opts.seriesIndex;
              if (seriesIndex === undefined) {
                return '';
              }

              const count = opts.w?.globals?.series?.[seriesIndex] ?? data[seriesIndex] ?? 0;
              return `${Math.round(count)}`;
            }
          },
          tooltip: {
            enabled: true,
            y: {
              formatter: (value: number) => `${value} réponse${value > 1 ? 's' : ''}`
            }
          }
        };
        break;
      }

      case 'bar_chart':
      default: {
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
        break;
      }
    }

    this.hasData = data.some((value) => value > 0);
  }

  public trackTextResponse(_index: number, response: { text: string; count: number }): string {
    return `${response.text}-${response.count}`;
  }
}
