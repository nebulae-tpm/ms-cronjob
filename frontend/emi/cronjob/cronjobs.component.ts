import {
  Component,
  OnInit,
  ViewEncapsulation,
  ViewChild,
  ElementRef
} from '@angular/core';
import { DataSource } from '@angular/cdk/collections';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { fuseAnimations } from '../../../core/animations';
import { MatPaginator, MatSort, MatTableDataSource, Sort } from '@angular/material';
import { Observable } from 'rxjs/Observable';
import { CronjobsService } from './cronjobs.service';
import { FuseUtils } from '../../../core/fuseUtils';
import { locale as english } from './i18n/en';
import { locale as spanish } from './i18n/es';
import { FuseTranslationLoaderService } from '../../../core/services/translation-loader.service';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import { map, first } from 'rxjs/operators';
import { Subscription } from 'rxjs/Subscription';

@Component({
  selector: 'cronjob',
  templateUrl: './cronjobs.component.html',
  styleUrls: ['./cronjobs.component.scss'],
  animations: fuseAnimations
})
export class CronjobsComponent implements OnInit {
  ngOnInit() {
  }
}
