'use strict';

const cronjobs = require('../../domain/Cronjobs')();
const broker = require('../../tools/broker/BrokerFactory')();
const Rx = require('rxjs');
const jsonwebtoken = require('jsonwebtoken');
const jwtPublicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');

let instance;

class GraphQlService {
  constructor() {
    this.functionMap = this.generateFunctionMap();
    this.subscriptions = [];
  }

  generateFunctionMap() {
    return {
      'gateway.graphql.query.getCronjobDetail': {
        fn: cronjobs.getCronjobDetail,
        obj: cronjobs
      },
      'gateway.graphql.query.getCronjobs':{
        fn: cronjobs.getCronjobs,
        obj: cronjobs
      },
      'gateway.graphql.query.getCronjobTableSize': {
        fn: cronjobs.getCronjobTableSize,
        obj: cronjobs
      },        
      'gateway.graphql.mutation.executeCronjob': {
        fn: cronjobs.executeCronjob,
        obj: cronjobs
      },
      'gateway.graphql.mutation.persistCronjob': {
        fn: cronjobs.persistCronjob,
        obj: cronjobs
      },
      'gateway.graphql.mutation.updateCronjob': {
        fn: cronjobs.updateCronjob,
        obj: cronjobs
      },
      'gateway.graphql.mutation.removeCronjob': {
        fn: cronjobs.removeCronjob,
        obj: cronjobs
      }
    };
  }

  start$() {
    const onErrorHandler = error => {
      console.error("Error handling  GraphQl incoming event", error);
      process.exit(1);
    };

    //default onComplete handler
    const onCompleteHandler = () => {
      () => console.log("GraphQlService incoming event subscription completed");
    };
    console.log("GraphQl Service starting ...");

    return Rx.Observable.from([
      {
        aggregateType: "Cronjob",
        messageType: "gateway.graphql.query.getCronjobDetail",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Cronjob",
        messageType:
          "gateway.graphql.query.getCronjobs",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Cronjob",
        messageType:
          "gateway.graphql.query.getCronjobTableSize",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Cronjob",
        messageType:
          "gateway.graphql.mutation.executeCronjob",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Cronjob",
        messageType:
          "gateway.graphql.mutation.persistCronjob",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Cronjob",
        messageType: "gateway.graphql.mutation.updateCronjob",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Cronjob",
        messageType: "gateway.graphql.mutation.removeCronjob",
        onErrorHandler,
        onCompleteHandler
      }
    ]).map(params => this.subscribeEventHandler(params));    
  }

  
  subscribeEventHandler({
    aggregateType,
    messageType,
    onErrorHandler,
    onCompleteHandler
  }) {
    const handler = this.functionMap[messageType];
    const subscription = broker
      .getMessageListener$([aggregateType], [messageType])
      //decode and verify the jwt token
      .map(message => {
        return {
          authToken: jsonwebtoken.verify(message.data.jwt, jwtPublicKey),
          message
        };
      })
      //ROUTE MESSAGE TO RESOLVER
      .mergeMap(({ authToken, message }) =>
        handler.fn
          .call(handler.obj, message.data, authToken)
          // .do(r => console.log("############################", r))
          .map(response => {
            return {
              response,
              correlationId: message.id,
              replyTo: message.attributes.replyTo
            };
          })
      )
      //send response back if neccesary
      .mergeMap(({ response, correlationId, replyTo }) => {
        if (replyTo) {
          return broker.send$(
            replyTo,
            "gateway.graphql.Query.response",
            response,
            { correlationId }
          );
        } else {
          return Rx.Observable.of(undefined);
        }
      })
      .subscribe(
        msg => {
          console.log(`GraphQlService process: ${msg}`);
        },
        onErrorHandler,
        onCompleteHandler
      );
    this.subscriptions.push({
      aggregateType,
      messageType,
      handlerName: handler.fn.name,
      subscription
    });
    return {
      aggregateType,
      messageType,
      handlerName: `${handler.obj.name}.${handler.fn.name}`
    };
  }

  stop() {
    Rx.Observable.from(this.subscriptions).map(subscription => {
      subscription.subscription.unsubscribe();
      return `Unsubscribed: aggregateType=${aggregateType}, eventType=${eventType}, handlerName=${handlerName}`;
    });
  }
}

module.exports = () => {
  if (!instance) {
    instance = new GraphQlService();
    console.log('NEW instance GraphQlService !!');
  }
  return instance;
};
