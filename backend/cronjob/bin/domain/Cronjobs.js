'use strict';

const Rx = require('rxjs');
const CronjobDA = require('../data/CronjobDA');
const cronjobManager = require('../domain/CronjobManager')();

class Cronjobs {
  constructor() {
  }
  getCronjobDetail({ root, args, jwt }, authToken) {
    return CronjobDA.getCronjobDetail$(args.id);
  }

  getCronjobs({ root, args, jwt }, authToken) {
    return CronjobDA.getCronjobs$(args.page, args.count, args.filter, args.sortColumn, args.sortOrder);
  }

  getCronjobTableSize({ root, args, jwt }, authToken) {
    return CronjobDA.getCronjobTableSize$();
  }
  persistCronjob({ root, args, jwt }, authToken) {
    return cronjobManager.createCronjob$(args.input);
  }
  updateCronjob({ root, args, jwt }, authToken) {
    return cronjobManager.updateCronjob$(args.input);
  }
  removeCronjob({ root, args, jwt }, authToken) {
    return cronjobManager.removeCronjob$(args.cronjobId);
  }
  executeCronjob({ root, args, jwt }, authToken) {
    return cronjobManager.executeCronjob$(args.cronjobId);
  }
}

module.exports = Cronjobs;
