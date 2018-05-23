import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot
} from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { range } from 'rxjs/observable/range';
import { map, toArray } from 'rxjs/operators';
import { GatewayService } from '../../../../api/gateway.service';
import { getCronjobs, getCronjobTableSize} from '../gql/Cronjobs';
import { Subscription } from 'rxjs';

@Injectable()
export class CronjobsService {
  constructor(
    private http: HttpClient,
    private gateway: GatewayService
  ) { }

  getCronjobs$(pageValue, countValue, filterText, sortColumn, sortOrder): Observable<any[]> {
    console.log('Page: ', pageValue);
    console.log('countValue: ', countValue);
    console.log('getCronjobs: ', getCronjobs);
    return this.gateway.apollo
      .query<any>({
        query: getCronjobs,
        variables: {
          page: pageValue,
          count: countValue,
          filterText: filterText,
          sortColumn: sortColumn,
          sortOrder: sortOrder
        },
      })
      .pipe(map(rawData => rawData.data.getCronjobs));
  }


  getCronjobTableSize$(): Observable<number> {
    return this.gateway.apollo
    .query<any>({
      query: getCronjobTableSize
    })
    .pipe(map(rawData => rawData.data.getCronjobTableSize));
  }

}


