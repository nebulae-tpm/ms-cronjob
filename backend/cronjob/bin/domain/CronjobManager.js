'use strict';

const Rx = require('rxjs');
const CronjobDA = require('../data/CronjobDA');
const Event = require('@nebulae/event-store').Event;
const eventSourcing = require('../tools/EventSourcing')();
const schedule = require('node-schedule');
const uuidv4 = require('uuid/v4');
const ThrowCapturer = require('rxjs/observable/throw');
const parser = require('cron-parser');

let instance = null;

class CronjobManager {
  constructor() {
    this.cronjobDA = new CronjobDA();
    this.jobVsScheduleJobList = [];
  }

  start$() {
    return this.getAndStartAllCronjobs$();
  }

  getAndStartAllCronjobs$() {
    return this.cronjobDA
      .getAllCronjobs$()
      .mergeMap(cronjob => {
        return this.buildJobVsScheduleJobElement$(cronjob);
      })
      .toArray()
      .map(jobVsScheduleJobList => {
        this.jobVsScheduleJobList = jobVsScheduleJobList;
        return 'jobs start has been completed!!';
      });
  }

  buildJobVsScheduleJobElement$(cronjob) {
    return Rx.Observable.of(cronjob)
      .map(jobValue => {
        if (jobValue.active) {
          return schedule.scheduleJob(jobValue.cronjobFormat, function() {
            const body = jobValue.body ? JSON.parse(jobValue.body) : undefined;
            eventSourcing.eventStore
              .emitEvent$(
                new Event({
                  eventType: jobValue.eventType,
                  eventTypeVersion: 1,
                  aggregateType: 'Cronjob',
                  aggregateId: cronjob.id,
                  data: body,
                  //TODO: aca se debe colocar el usuario que periste el evento, si el sistema de debe colocar como
                  // SYSTEM.Cronjob.cronjob
                  user: 'SYSTEM.Cronjob.cronjob'
                })
              )
              .subscribe(result => {});
          });
        }
      })
      .map(scheduleJob => {
        return {
          scheduleJob: scheduleJob,
          cronjob: cronjob
        };
      });
  }

  removeCronjob$(cronjobToRemove) {
    return Rx.Observable.of(cronjobToRemove).mergeMap(value => {
      const jobVsScheduleJob = this.jobVsScheduleJobList.filter(
        job => job.cronjob.name == cronjobToRemove.name
      )[0];
      if (jobVsScheduleJob && jobVsScheduleJob.scheduleJob) {
        jobVsScheduleJob.scheduleJob.cancel();
        this.jobVsScheduleJobList.pop(jobVsScheduleJob);
        const cronjob = jobVsScheduleJob.cronjob;
        //TODO: Se debe eliminar en la base de datos
        return Rx.Observable.of(undefined);
      } else {
        return Rx.Observable.of(undefined);
      }
    });
  }

  updateCronjob$(cronjob) {
    if (cronjob.body && !this.validateCronjobBody(cronjob.body)) {
      return Rx.Observable.of({ code: 20001, message: 'Invalid body format' });
    }
    if (!cronjob.cronjobFormat.trim() || !this.validateCronjobFormat(cronjob.cronjobFormat)) {
      return Rx.Observable.of({
        code: 20002,
        message: 'Invalid cronjob format'
      });
    } else {
      const oldJobVsScheduleJob = this.jobVsScheduleJobList.filter(
        job => job.cronjob.id == cronjob.id
      )[0];
      return Rx.Observable.of(cronjob)
        .map(job => {
          return oldJobVsScheduleJob
            ? Object.assign(oldJobVsScheduleJob.cronjob, job)
            : job;
        })
        .do(job => {
          if (oldJobVsScheduleJob.scheduleJob) {
            oldJobVsScheduleJob.scheduleJob.cancel();
          }
        })
        .do(job => {
          if (oldJobVsScheduleJob) {
            this.jobVsScheduleJobList.pop(oldJobVsScheduleJob);
          }
        })
        .mergeMap(newCronjob => {
          return this.buildJobVsScheduleJobElement$(newCronjob);
        })
        .mergeMap(newJobVsScheduleJob => {
          this.jobVsScheduleJobList.push(newJobVsScheduleJob);
          return eventSourcing.eventStore.emitEvent$(
            new Event({
              eventType: 'CronjobUpdated',
              eventTypeVersion: 1,
              aggregateType: 'Cronjob',
              aggregateId: newJobVsScheduleJob.cronjob.id,
              data: newJobVsScheduleJob.cronjob,
              //TODO: aca se debe colocar el usuario que periste el cronjob
              user: 'SYSTEM.Cronjob.cronjob'
            })
          );
        })
        .map(result => {
          return {
            code: 200,
            message: `Cronjob with id: ${cronjob.id} has been updated`
          };
        });
    }
  }

  createCronjob$(cronjob) {
    if (cronjob.body && !this.validateCronjobBody(cronjob.body)) {
      return Rx.Observable.of({ code: 20001, message: 'Invalid body format' });
    }
    if (!cronjob.cronjobFormat.trim() || !this.validateCronjobFormat(cronjob.cronjobFormat)) {
      return Rx.Observable.of({
        code: 20002,
        message: 'Invalid cronjob format'
      });
    }
    {
      cronjob.id = uuidv4();
      cronjob.version = 1;
      cronjob.active = true;
      return Rx.Observable.of(cronjob)
        .mergeMap(job => this.buildJobVsScheduleJobElement$(job))
        .do(jobVsScheduleJobElement =>
          this.jobVsScheduleJobList.push(jobVsScheduleJobElement)
        )
        .mergeMap(jobVsScheduleJobElement => {
          return eventSourcing.eventStore.emitEvent$(
            new Event({
              eventType: 'CronjobCreated',
              eventTypeVersion: 1,
              aggregateType: 'Cronjob',
              aggregateId: jobVsScheduleJobElement.cronjob.id,
              data: jobVsScheduleJobElement.cronjob,
              //TODO: aca se debe colocar el usuario que periste el cronjob
              user: 'SYSTEM.Cronjob.cronjob'
            })
          );
        })
        .map(result => {
          return {
            code: 200,
            message: `Cronjob with id: ${cronjob.id} has been created`
          };
        });
    }
  }

  validateCronjobBody(cronjob) {
    try {
      JSON.parse(cronjob.body);
    } catch (e) {
      return false;
    }
    return true;
  }

  validateCronjobFormat(cronjob) {
    try {
    
      var validation = parser.parseString(cronjob);
      if (!Object.keys(validation.errors).length) {
        return true;
      }
      throw 'Invalid CronjobFormat';
    } catch (ex) {
      console.log(ex);
      return false;
    }
  }
}

module.exports = () => {
  if (!instance) {
    instance = new CronjobManager();
    console.log(`CronjobManager instance created`);
  }
  return instance;
};
