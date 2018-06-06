const withFilter = require('graphql-subscriptions').withFilter;
const PubSub = require('graphql-subscriptions').PubSub;
const Rx = require('rxjs');
const broker = require('../../broker/BrokerFactory')();

let pubsub = new PubSub();
module.exports = {
  Query: {
    getCronjobDetail(root, args, context) {
      return context.broker
        .forwardAndGetReply$(
          'Cronjob',
          'gateway.graphql.query.getCronjobDetail',
          { root, args, jwt: context.encodedToken },
          500
        )
        .toPromise();
    },
    getCronjobs(root, args, context) {
      return context.broker
        .forwardAndGetReply$(
          'Cronjob',
          'gateway.graphql.query.getCronjobs',
          { root, args, jwt: context.encodedToken },
          500
        )
        .toPromise();
    },
    getCronjobTableSize(root, args, context) {
      return context.broker
        .forwardAndGetReply$(
          'Cronjob',
          'gateway.graphql.query.getCronjobTableSize',
          { root, args, jwt: context.encodedToken },
          500
        )
        .toPromise();
    }
  },
  Mutation: {
    persistCronjob(root, args, context) {
      return context.broker
        .forwardAndGetReply$(
          'Cronjob',
          'gateway.graphql.mutation.persistCronjob',
          { root, args, jwt: context.encodedToken },
          500
        )
        .toPromise();
    },
    updateCronjob(root, args, context) {
      return context.broker
        .forwardAndGetReply$(
          'Cronjob',
          'gateway.graphql.mutation.updateCronjob',
          { root, args, jwt: context.encodedToken },
          500
        )
        .toPromise();
    },
    removeCronjob(root, args, context) {
      return context.broker
        .forwardAndGetReply$(
          'Cronjob',
          'gateway.graphql.mutation.removeCronjob',
          { root, args, jwt: context.encodedToken },
          500
        )
        .toPromise();
    },
    executeCronjob(root, args, context) {
      return context.broker
        .forwardAndGetReply$(
          'Cronjob',
          'gateway.graphql.mutation.executeCronjob',
          { root, args, jwt: context.encodedToken },
          500
        )
        .toPromise();
    }
  },
  Subscription: {
    CronjobRegistersUpdated: {
      subscribe: withFilter(
        (payload, variables, context, info) => {
          return pubsub.asyncIterator('CronjobRegistersUpdated');
        },
        (payload, variables, context, info) => {
          return true;
        }
      )
    }
  }
};

broker.getMaterializedViewsUpdates$(['CronjobRegistersUpdated']).subscribe(
  evt => {
    console.log('Se escucha evento: ', evt);
    pubsub.publish('CronjobRegistersUpdated', {
      CronjobRegistersUpdated: evt.data
    });
  },
  error => console.error('Error listening CronjobRegistersUpdated', error),
  () => console.log('CronjobRegistersUpdated listener STOPPED')
);
