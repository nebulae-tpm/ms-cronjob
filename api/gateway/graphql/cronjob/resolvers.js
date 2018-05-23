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
    },
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
    }


  }
};