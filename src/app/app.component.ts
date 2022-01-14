import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Bond, NordeaBond } from './bond';
import { DateTime } from "luxon";
import { saveAs } from 'file-saver';
import { LegendPosition } from '@swimlane/ngx-charts';
import { ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent {
  title = 'bond-price-watcher';
  data: any[] = [];
  legendPosition = LegendPosition.Right;
  refreshIntervalInMinutes: number = 15;
  bondAlertName: string = "";
  bondAlertPrice: number = 0;
  alertIsSet: boolean = false;

  // options
  xAxisLabel: string = 'Time';
  yAxisLabel: string = 'Price';
  updateInterval: NodeJS.Timer = setInterval(() => this.addData(), this.refreshIntervalInMinutes * 60000);

  colorScheme = {
    domain: ['#5AA454', '#E44D25', '#CFC0BB', '#7aa3e5', '#a8385d', '#aae3f5']
  };

  bondMap: Map<string, Bond[]> = new Map()
  bondNames: Set<string> = new Set()

  constructor(
    private httpClient: HttpClient
  ) {
    this.addData();
    this.setInterval();
  }

  setInterval() {
    console.log(this.refreshIntervalInMinutes);
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => this.addData(), this.refreshIntervalInMinutes * 60000);
  }

  addData() {
    let currentTime = DateTime.now().toFormat('yyyy:LL:dd HH:mm:ss');
    this.httpClient.get<NordeaBond[]>("https://ebolig.nordea.dk/wemapp/api/credit/fixedrate/bonds.json")
      .subscribe(data => {
        data.forEach(externalBond => {
          let bondName = `[${externalBond.loanPeriodMax}:${externalBond.repaymentFreedomMax}] ${externalBond.fundName}`;
          this.bondNames.add(bondName);
          if (!this.bondMap.has(bondName)) {
            this.bondMap.set(bondName, []);
          }
          this.bondMap.get(bondName)!.push({
            name: bondName,
            time: currentTime,
            price: externalBond.rate
          });
          if (this.alertIsSet) {
            console.log(this.bondAlertName)
            console.log(bondName)
            console.log(this.bondAlertName === bondName)
            console.log(this.bondAlertPrice);
            console.log(Number(externalBond.rate.replace(",", ".")))
            console.log(this.bondAlertPrice < Number(externalBond.rate))
            if (this.bondAlertName === bondName && this.bondAlertPrice < Number(externalBond.rate.replace(",", "."))) {
              this.playAudio();
            }
          }
        })

        let newData: {}[] = [];
        this.bondMap.forEach((value: Bond[], key: string) => {
          newData.push({
            "name": key,
            "series": value.map(bond => ({ "name": bond.time.slice(10), "value": bond.price.replace(",", ".") }))
          });
        });
        this.data = newData
      });
  }

  setAlert() {
    this.alertIsSet = true;
  }

  unsetAlert() {
    this.alertIsSet = false;
  }

  playAudio() {
    let audio = new Audio();
    audio.src = "assets/alarm.wav";
    audio.loop = true;
    audio.load();
    audio.play();
  }

  downloadBondData() {
    this.downloadFile([...this.bondMap.values()].flat());
  }

  downloadFile(data: any) {
    console.log(data);
    const replacer = (key: any, value: any) => value === null ? '' : value; // specify how you want to handle null values here
    const header = Object.keys(data[0]);
    let csv = data.map((row: any) => {
      return header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(',');
    });
    csv.unshift(header.join(','));
    let csvArray = csv.join('\r\n');

    var blob = new Blob([csvArray], { type: 'text/csv' })
    saveAs(blob, "BondsData.csv");
  }

  onSelect(data: any): void {
    //console.log('Item clicked', JSON.parse(JSON.stringify(data)));
  }

  onActivate(data: any): void {
    //console.log('Activate', JSON.parse(JSON.stringify(data)));
  }

  onDeactivate(data: any): void {
    //console.log('Deactivate', JSON.parse(JSON.stringify(data)));
  }
}
