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
import { GatewayService } from '../../../api/gateway.service';
import { getDevices, getDeviceTableSize, getDeviceDetail } from './gql/Devices';
import { Subscription } from 'rxjs';

@Injectable()
export class CronjobsService {
}
