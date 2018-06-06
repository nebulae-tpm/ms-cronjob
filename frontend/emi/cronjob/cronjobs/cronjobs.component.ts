import {
  Component,
  OnInit,
  ViewEncapsulation,
  ViewChild,
  ElementRef
} from '@angular/core';
import { DataSource } from '@angular/cdk/collections';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { fuseAnimations } from '../../../../core/animations';
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  Sort,
  MatDialog,
  MatSnackBar
} from '@angular/material';
import { Observable } from 'rxjs/Observable';
import { CronjobsService } from './cronjobs.service';
import { CronjobDetailService } from '../cronjob-detail/cronjob-detail.service';
import { FuseUtils } from '../../../../core/fuseUtils';
import { locale as english } from '../i18n/en';
import { locale as spanish } from '../i18n/es';
import { FuseTranslationLoaderService } from '../../../../core/services/translation-loader.service';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import { map, first, filter } from 'rxjs/operators';
import { Subscription } from 'rxjs/Subscription';
import { ExecuteCronjobDialogComponent } from './execute-cronjob-dialog/execute-cronjob-dialog.component';

@Component({
  selector: 'cronjob',
  templateUrl: './cronjobs.component.html',
  styleUrls: ['./cronjobs.component.scss'],
  animations: fuseAnimations
})
export class CronjobsComponent implements OnInit {
  dataSource = new MatTableDataSource();
  displayedColumns = [
    'name',
    'eventType',
    'cronjobFormat',
    'version',
    'active',
    'execute'
  ];

  tableSize: number;
  selectedCronjob: any;
  subscriptions = [];
  page = 0;
  count = 10;
  filterText = '';
  sortColumn = null;
  sortOrder = null;
  cronjobDetailAction = '';
  itemPerPage = "";

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild('filter') filter: ElementRef;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private translationLoader: FuseTranslationLoaderService,
    private cronjobsService: CronjobsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cronjobDetailService: CronjobDetailService
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }

  ngOnInit() {
    this.refreshDataTable(
      this.page,
      this.count,
      this.filterText,
      this.sortColumn,
      this.sortOrder
    );
    this.subscriptions.push(
      this.cronjobsService
        .subscribeToDeviceVolumesStateReportedEvent$()
        .subscribe(result => {
          this.refreshDataTable(
            this.page,
            this.count,
            this.filterText,
            this.sortColumn,
            this.sortOrder
          );
        })
    );
    this.cronjobDetailService.closeDetail$.forEach(evt => {
      this.selectedCronjob = undefined;
    });
    this.subscriptions.push(
      Observable.fromEvent(this.filter.nativeElement, 'keyup')
        .debounceTime(150)
        .distinctUntilChanged()
        .subscribe(() => {
          if (this.filter.nativeElement) {
            let filterValue = this.filter.nativeElement.value;
            filterValue = filterValue.trim();
            this.filterText = filterValue;
            this.refreshDataTable(
              this.page,
              this.count,
              filterValue,
              this.sortColumn,
              this.sortOrder
            );
          }
        })
    );

    this.subscriptions.push(
      this.paginator.page.subscribe(pageChanged => {
        this.page = pageChanged.pageIndex;
        this.count = pageChanged.pageSize;
        this.refreshDataTable(
          pageChanged.pageIndex,
          pageChanged.pageSize,
          this.filterText,
          this.sortColumn,
          this.sortOrder
        );
      })
    );

    this.subscriptions.push(
      this.cronjobsService.getCronjobTableSize$().subscribe(result => {
        this.tableSize = result;
      })
    );

  }


  executeCronjob(cronjobId) {
    this.dialog
      .open(ExecuteCronjobDialogComponent)
      .afterClosed()
      .pipe(filter(executeCronjob => executeCronjob))
      .mergeMap(executeCronjob => {
        if (executeCronjob) {
          return this.cronjobsService.executeCronjob$(cronjobId).pipe(first());
        } else {
          Observable.of(undefined);
        }
      })
      .subscribe(result => {
        if (result) {
          this.snackBar.open(
            'Tarea programada ha sido ejecutada manualmente',
            'Cerrar',
            {
              duration: 2000
            }
          );
        }
      });
  }

  ngDestroy() {
    if (this.subscriptions) {
      this.subscriptions.forEach(sub => {
        sub.unsubscribe();
      });
    }
  }

  selectRow(row) {
    this.cronjobDetailAction = 'EDIT';
    this.selectedCronjob = row;
  }
  addNewCronjob() {
    this.cronjobDetailAction = 'ADD';
    this.selectedCronjob = {};
  }

  refreshDataTable(page, count, filter, sortColumn, sortOrder) {
    this.cronjobsService
      .getCronjobs$(page, count, filter, sortColumn, sortOrder)
      .pipe(first())
      .subscribe(model => {
        this.dataSource.data = model;
      });
  }
}
