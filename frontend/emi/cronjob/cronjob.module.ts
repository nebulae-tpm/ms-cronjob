import { NgModule } from '@angular/core';
import { SharedModule } from '../../../core/modules/shared.module';
import { RouterModule } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CronjobsComponent } from './cronjobs/cronjobs.component';
import { CronjobDetailComponent } from './cronjob-detail/cronjob-detail.component';
import { CronjobsService } from './cronjobs/cronjobs.service';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

const routes = [
  {
    path: '',
    component: CronjobsComponent
  }
];

@NgModule({
  declarations: [CronjobsComponent, CronjobDetailComponent],
  imports: [SharedModule, RouterModule.forChild(routes), FuseWidgetModule],
  providers: [CronjobsService, DatePipe]
})
export class CronjobModule {}
