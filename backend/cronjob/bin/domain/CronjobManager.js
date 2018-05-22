'use strict';

const Rx = require('rxjs');
const CronjobDA = require('../data/CronjobDA');
const Event = require('@nebulae/event-store').Event;
const eventSourcing = require('../tools/EventSourcing')();
const schedule = require('node-schedule');
const uuidv4 = require('uuid/v4');
const ThrowCapturer = require('rxjs/observable/throw');

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
    return Rx.Observable.of(cronjob).map(jobValue => {
      if (jobValue.active) {
        const scheduleJob = schedule.scheduleJob(
          jobValue.cronjobFormat,
          function() {
            console.log('Se ejecuta: ', cronjob.name);
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
          }
        );
        return {
          scheduleJob: scheduleJob,
          cronjob: cronjob
        };
      } else {
        return {
          cronjob: cronjob
        };
      }
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
    return Rx.Observable.of(cronjob)
      .mergeMap(value => {
        const oldJobVsScheduleJob = this.jobVsScheduleJobList.filter(
          job => job.cronjob.id == cronjob.id
        )[0];
        let newCronjob = cronjob;
        if (oldJobVsScheduleJob) {
          newCronjob = Object.assign(oldJobVsScheduleJob.cronjob, cronjob);
          if (oldJobVsScheduleJob.scheduleJob) {
            oldJobVsScheduleJob.scheduleJob.cancel();
          }
          this.jobVsScheduleJobList.pop(oldJobVsScheduleJob);
        }
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
      });
  }

  createCronjob$(cronjob) {
    cronjob.id = uuidv4();
    cronjob.version = 1;
    cronjob.active = true;
    if (cronjob.body) {
      return Rx.Observable.of(cronjob)
        .mergeMap(value => this.buildJobVsScheduleJobElement$(value))
        .mergeMap(jobVsScheduleJobElement => {
          this.jobVsScheduleJobList.push(jobVsScheduleJobElement);
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
        });
    }
  }

  /*
  validateCronjobBody$(cronjob) {
    try {
      JSON.parse(cronjob.body);
    } catch (e) {
      return Rx.Observable.throw(
        new Error('Failed formating cronjob body to JsonObject')
      );
    }
    return Rx.Observable.of(cronjob);
  }
  */
}

module.exports = () => {
  if (!instance) {
    instance = new CronjobManager();
    console.log(`CronjobManager instance created`);
  }
  return instance;
};
